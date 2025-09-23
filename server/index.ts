import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { serveStatic, log } from "./vite";

const app = express();
// Raw body parsing for Stripe webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.set('trust proxy', 1); // Trust the first proxy in a chain to fix rate limiting when using X-Forwarded-For

// Production domain redirect middleware
// Redirect fly.dev development domains to the actual APP_URL domain
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && process.env.APP_URL) {
    const host = req.get('host');
    if (host && host.includes('.fly.dev')) {
      const appUrl = new URL(process.env.APP_URL);
      const redirectUrl = `${appUrl.protocol}//${appUrl.host}${req.originalUrl}`;
      
      log(`[REDIRECT] fly.dev domain detected: ${host} -> ${appUrl.host}`);
      return res.redirect(301, redirectUrl);
    }
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();