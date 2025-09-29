
import {
  DEFAULT_ROUTE_METADATA,
  normalizeRoutePath,
  type RouteDefinition,
  type RouteMetadata,
} from "@shared/route-metadata";

const routeModules = import.meta.glob<{ route?: RouteDefinition }>(
  "../pages/**/*.tsx",
  { eager: true },
);

const routeRegistry = new Map<string, RouteDefinition>();

for (const [filePath, module] of Object.entries(routeModules)) {
  let routeDefinition: RouteDefinition;

  // Handle potential import errors gracefully
  let routeExport: RouteDefinition | undefined;
  try {
    routeExport = module?.route;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[routes] Failed to access route export from ${filePath}:`, error);
    }
    routeExport = undefined;
  }

  if (!routeExport) {
    // Create default route definition for pages without route export
    const pathFromFile = filePath
      .replace("../pages/", "/")
      .replace(/\.tsx$/, "")
      .replace(/\/index$/, "")
      .replace(/\[([^\]]+)\]/g, ":$1"); // Convert [param] to :param

    // Enable SSR for static pages by default
    const staticPages = ["/", "/pricing", "/how-it-works"];
    const isStaticPage = staticPages.includes(pathFromFile === "" ? "/" : pathFromFile);

    routeDefinition = {
      path: pathFromFile === "" ? "/" : pathFromFile,
      ssr: isStaticPage, // Enable SSR for static pages
      metadata: getDefaultMetadataForPath(pathFromFile === "" ? "/" : pathFromFile),
    };

    if (import.meta.env.DEV) {
      console.warn(
        `[routes] No route export found in ${filePath}. Using default route definition with ssr: ${isStaticPage}.`,
      );
    }
  } else {
    if (!routeExport.path) {
      if (import.meta.env.DEV) {
        console.warn(
          `[routes] Missing path in route export from ${filePath}. Ignoring this entry.`,
        );
      }
      continue;
    }
    routeDefinition = routeExport;
  }

  const normalizedPath = normalizeRoutePath(routeDefinition.path);

  if (routeRegistry.has(normalizedPath) && import.meta.env.DEV) {
    console.warn(
      `[routes] Duplicate route registration for path ${normalizedPath} from ${filePath}.`,
    );
  }

  routeRegistry.set(normalizedPath, { ...routeDefinition, path: normalizedPath });
}

function getDefaultMetadataForPath(path: string): RouteMetadata {
  const routeMetadata: Record<string, RouteMetadata> = {
    "/": DEFAULT_ROUTE_METADATA,
    "/pricing": {
      title: "Pricing – TrailWave SEO Plans",
      description: "Choose flexible TrailWave SEO plans to automate SEO analysis, competitor benchmarking, and content recommendations at scale.",
      ogTitle: "TrailWave SEO Pricing",
      ogDescription: "Compare TrailWave SEO plans and unlock AI-powered SEO audits that grow with your marketing team.",
      canonical: "https://bottailor.com/pricing",
    },
    "/how-it-works": {
      title: "How It Works – TrailWave SEO Analysis",
      description: "Learn how TrailWave SEO's AI-powered SEO analysis works to improve your website's search engine optimization.",
      canonical: "https://bottailor.com/how-it-works",
    },
    "/dashboard": {
      title: "Dashboard – TrailWave SEO",
      description: "Access your SEO analysis dashboard and manage your website optimization projects.",
      canonical: "https://bottailor.com/dashboard",
    },
  };

  return routeMetadata[path] || DEFAULT_ROUTE_METADATA;
}

function getDefaultMetadata(): RouteMetadata {
  return routeRegistry.get("/")?.metadata || DEFAULT_ROUTE_METADATA;
}

export function getRouteDefinition(path: string): RouteDefinition | undefined {
  return routeRegistry.get(normalizeRoutePath(path));
}

export function getRouteMetadata(path: string): RouteMetadata {
  const definition = getRouteDefinition(path);
  return definition?.metadata || getDefaultMetadata();
}

export function shouldSSR(path: string): boolean {
  return Boolean(getRouteDefinition(path)?.ssr);
}

export function listRegisteredRoutes(): RouteDefinition[] {
  return Array.from(routeRegistry.values());
}
