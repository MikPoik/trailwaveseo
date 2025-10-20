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

  // Skip pages without explicit route export
  if (!routeExport) {
    if (import.meta.env.DEV) {
      console.log(`[routes] No route export found in ${filePath}. Skipping registration.`);
    }
    continue;
  }

  if (!routeExport.path) {
    if (import.meta.env.DEV) {
      console.warn(
        `[routes] Missing path in route export from ${filePath}. Ignoring this entry.`,
      );
    }
    continue;
  }

  const normalizedPath = normalizeRoutePath(routeExport.path);

  if (routeRegistry.has(normalizedPath) && import.meta.env.DEV) {
    console.warn(
      `[routes] Duplicate route registration for path ${normalizedPath} from ${filePath}.`,
    );
  }

  // Merge with default metadata if metadata is not provided
  const routeDefinition: RouteDefinition = {
    ...routeExport,
    path: normalizedPath,
    metadata: routeExport.metadata ? mergeRouteMetadata(routeExport.metadata) : getDefaultMetadata(),
  };

  routeRegistry.set(normalizedPath, routeDefinition);
}

// Placeholder for mergeRouteMetadata if it's used elsewhere or needs definition.
// If mergeRouteMetadata is intended to be part of this file and was removed,
// it would need to be re-added or its usage removed.
// For now, assuming it's imported or defined elsewhere.
function mergeRouteMetadata(metadata: RouteMetadata): RouteMetadata {
  // Example implementation if needed:
  // return { ...DEFAULT_ROUTE_METADATA, ...metadata };
  // For now, just return the provided metadata as the logic is to merge with defaults if not provided
  return metadata;
}

function getDefaultMetadata(): RouteMetadata {
  return DEFAULT_ROUTE_METADATA;
}

export function getRouteDefinition(path: string): RouteDefinition | undefined {
  return routeRegistry.get(normalizeRoutePath(path));
}

export function getRouteMetadata(path: string): RouteMetadata {
  const definition = getRouteDefinition(path);
  return definition?.metadata || getDefaultMetadata();
}

export function shouldSSR(path: string): boolean {
  // SSR is only enabled if explicitly true in the route definition
  return Boolean(getRouteDefinition(path)?.ssr === true);
}

export function listRegisteredRoutes(): RouteDefinition[] {
  return Array.from(routeRegistry.values());
}