import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.AUTH0_DOMAIN) {
  throw new Error("Environment variable AUTH0_DOMAIN not provided");
}

if (!process.env.AUTH0_CLIENT_ID) {
  throw new Error("Environment variable AUTH0_CLIENT_ID not provided");
}

if (!process.env.AUTH0_CLIENT_SECRET) {
  throw new Error("Environment variable AUTH0_CLIENT_SECRET not provided");
}

if (!process.env.SESSION_SECRET) {
  throw new Error("Environment variable SESSION_SECRET not provided");
}

const getOidcConfig = memoize(
  async () => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AUTH] Attempting OIDC discovery (attempt ${attempt}/${maxRetries})`);
        
        // Use Promise.race to implement timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('OIDC discovery timeout (15s)')), 15000);
        });
        
        const discoveryPromise = client.discovery(
          new URL(`https://${process.env.AUTH0_DOMAIN}`),
          process.env.AUTH0_CLIENT_ID!,
          process.env.AUTH0_CLIENT_SECRET!
        );
        
        const config = await Promise.race([discoveryPromise, timeoutPromise]) as any;
        console.log(`[AUTH] OIDC discovery successful on attempt ${attempt}`);
        return config;
        
      } catch (error: any) {
        console.error(`[AUTH] OIDC discovery failed on attempt ${attempt}:`, error.message);
        
        if (attempt === maxRetries) {
          console.error(`[AUTH] All OIDC discovery attempts failed. Error details:`, {
            name: error.name,
            message: error.message,
            cause: error.cause?.message || 'Unknown cause'
          });
          throw new Error(`OIDC discovery failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retrying
        console.log(`[AUTH] Retrying OIDC discovery in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    first_name: claims["first_name"],
    last_name: claims["last_name"],
    profile_image_url: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  let config;
  try {
    config = await getOidcConfig();
  } catch (error: any) {
    console.error('[AUTH] Failed to initialize OIDC configuration:', error.message);
    console.error('[AUTH] Authentication will not be available. Please check:');
    console.error('[AUTH] 1. AUTH0_DOMAIN is correct and reachable');
    console.error('[AUTH] 2. Network connectivity to Auth0 from deployment environment');
    console.error('[AUTH] 3. Auth0 service status');
    
    // Setup minimal auth routes that return errors
    app.get("/api/login", (req, res) => {
      res.status(503).json({ 
        error: "Authentication service temporarily unavailable", 
        message: "Please try again later or contact support if the issue persists" 
      });
    });
    
    app.get("/api/callback", (req, res) => {
      res.status(503).json({ 
        error: "Authentication service temporarily unavailable", 
        message: "Please try again later or contact support if the issue persists" 
      });
    });
    
    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });
    
    console.error('[AUTH] Authentication routes configured with error responses');
    return; // Exit early, don't setup normal auth
  }

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (error) {
      console.error("Auth verification error:", error);
      verified(error, null);
    }
  };

  const callbackURL = process.env.APP_URL ? `${process.env.APP_URL}/api/callback` : `http://localhost:5000/api/callback`;
  console.log(`[AUTH] Using callback URL: ${callbackURL}`);
  console.log(`[AUTH] APP_URL environment variable: ${process.env.APP_URL || 'not set'}`);
  
  const strategy = new Strategy(
    {
      name: "auth0",
      config: config!,
      scope: "openid email profile offline_access",
      callbackURL,
    },
    verify,
  );
  passport.use(strategy);

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate("auth0", {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate("auth0", {
      successReturnToOrRedirect: "/dashboard",
      failureRedirect: "/api/login",
    }, (err: any, user: any, info: any) => {
      if (err) {
        console.error("Auth0 callback error:", err);
        console.error("Error details:", JSON.stringify(err, null, 2));
        return res.status(500).json({ error: "Authentication failed", details: err.message });
      }
      if (!user) {
        console.error("Auth0 callback failed - no user:", info);
        return res.redirect("/api/login");
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res.status(500).json({ error: "Session creation failed" });
        }
        res.redirect("/dashboard");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config!, {
          client_id: process.env.AUTH0_CLIENT_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.get('host')}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config!, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error: any) {
    console.error('[AUTH] Token refresh failed:', error.message);
    return res.redirect("/api/login");
  }
};