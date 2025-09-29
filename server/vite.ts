import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { type Server } from "http";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

type SSRModule = {
  generateHTML: (url: string, search?: string) => Promise<{ html: string; ssrContext: { redirectTo?: string } }>;
  generateMetaTags: (url: string) => string;
  shouldSSR: (url: string) => boolean;
};

interface RenderTemplateOptions {
  template: string;
  pathname: string;
  search?: string;
  ssrModule: SSRModule;
  styleHref?: string;
}

async function renderTemplateWithSSR({
  template,
  pathname,
  search,
  ssrModule,
  styleHref,
}: RenderTemplateOptions) {
  const { generateHTML, generateMetaTags } = ssrModule;
  const { html: appHtml, ssrContext } = await generateHTML(pathname, search);
  const meta = generateMetaTags(pathname);

  let html = template.replace(
    /<!-- SSR_META_START -->[\s\S]*?<!-- SSR_META_END -->/,
    () => {
      const indentedMeta = meta
        .split("\n")
        .map((line) => (line ? `    ${line}` : ""))
        .join("\n");
      return `<!-- SSR_META_START -->\n${indentedMeta}\n    <!-- SSR_META_END -->`;
    },
  );

  if (styleHref && !html.includes("data-ssr-styles")) {
    html = html.replace(
      "</head>",
      `    <link rel="stylesheet" href="${styleHref}" data-ssr-styles />\n  </head>`,
    );
  }

  html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  return { html, ssrContext };
}

export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteConfig = {
    plugins: [
      (await import("@vitejs/plugin-react")).default(),
      (await import("@replit/vite-plugin-runtime-error-modal")).default(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "..", "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "..", "shared"),
        "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "..", "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "..", "dist/public"),
      emptyOutDir: true,
    },
  };

  const viteLogger = createLogger();
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const templatePath = path.resolve(import.meta.dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(templatePath, "utf-8");

      const requestUrl = new URL(url, "http://localhost");
      const pathname = requestUrl.pathname;
      let pageTemplate = template;

      try {
        const ssrModule = (await vite.ssrLoadModule("/src/entry-server.tsx")) as SSRModule;

        if (ssrModule.shouldSSR(pathname)) {
          log(`SSR render (dev): ${pathname}`, "ssr");
          const { html, ssrContext } = await renderTemplateWithSSR({
            template: pageTemplate,
            pathname,
            search: requestUrl.search,
            ssrModule,
            styleHref: "/src/index.css",
          });

          if (ssrContext?.redirectTo) {
            return res.redirect(302, ssrContext.redirectTo);
          }

          pageTemplate = html;
        }
      } catch (error) {
        console.error("SSR error (dev), serving CSR fallback", error);
      }

      const rendered = await vite.transformIndexHtml(url, pageTemplate);
      res.status(200).set({ "Content-Type": "text/html" }).end(rendered);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  const indexTemplatePath = path.resolve(distPath, "index.html");

  if (!fs.existsSync(distPath) || !fs.existsSync(indexTemplatePath)) {
    throw new Error(`Could not find build output. Expected client assets in ${distPath}`);
  }

  const ssrEntryPath = path.resolve(import.meta.dirname, "server", "entry-server.js");
  let ssrModulePromise: Promise<SSRModule> | null = null;

  const loadSSRModule = async () => {
    if (!ssrModulePromise) {
      ssrModulePromise = import(pathToFileURL(ssrEntryPath).href) as Promise<SSRModule>;
    }
    return ssrModulePromise;
  };

  const baseTemplate = fs.readFileSync(indexTemplatePath, "utf-8");

  app.use(
    express.static(distPath, {
      index: false,
    }),
  );

  app.get("*", async (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    try {
      const originHost = req.get("host") ?? "localhost";
      const originProtocol = req.protocol ?? "http";
      const origin = `${originProtocol}://${originHost}`;
      const requestUrl = new URL(req.originalUrl, origin);
      const pathname = requestUrl.pathname;
      let pageTemplate = baseTemplate;

      try {
        const ssrModule = await loadSSRModule();

        if (ssrModule.shouldSSR(pathname)) {
          const { html, ssrContext } = await renderTemplateWithSSR({
            template: pageTemplate,
            pathname,
            search: requestUrl.search,
            ssrModule,
          });

          if (ssrContext?.redirectTo) {
            return res.redirect(302, ssrContext.redirectTo);
          }

          pageTemplate = html;
        }
      } catch (error) {
        console.error("SSR error (prod), serving CSR fallback", error);
      }

      res.status(200).set({ "Content-Type": "text/html" }).send(pageTemplate);
    } catch (error) {
      next(error);
    }
  });
}
