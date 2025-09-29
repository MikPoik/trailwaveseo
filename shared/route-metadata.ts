export interface RouteMetadata {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  structuredData?: Record<string, unknown>;
}

export interface RouteDefinition {
  path: string;
  ssr?: boolean;
  metadata?: RouteMetadata;
}

const ROOT_PATH = "/";

export const DEFAULT_ROUTE_METADATA: RouteMetadata = {
  title: "BotTailor – AI-Powered SEO Analysis",
  description:
    "Audit your website, uncover technical SEO issues, and ship better content with AI-assisted insights.",
  ogImage: "https://bottailor.com/og-image.jpg",
  canonical: "https://bottailor.com/",
};

export function normalizeRoutePath(path: string): string {
  if (!path) {
    return ROOT_PATH;
  }

  try {
    const normalized = path.trim().replace(/\s+/g, "");
    if (!normalized) {
      return ROOT_PATH;
    }

    const startsWithSlash = normalized.startsWith("/");
    const withoutTrailingSlash = normalized.endsWith("/") && normalized !== ROOT_PATH
      ? normalized.slice(0, -1)
      : normalized;

    return startsWithSlash ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
  } catch {
    return ROOT_PATH;
  }
}

export function mergeRouteMetadata(metadata?: RouteMetadata): RouteMetadata {
  if (!metadata) {
    return { ...DEFAULT_ROUTE_METADATA };
  }

  return {
    ...DEFAULT_ROUTE_METADATA,
    ...metadata,
  };
}
