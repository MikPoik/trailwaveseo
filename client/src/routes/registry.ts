import { DEFAULT_ROUTE_METADATA, RouteDefinition, RouteMetadata, mergeRouteMetadata, normalizeRoutePath } from "@shared/route-metadata";

type RouteModule = {
  route?: RouteDefinition;
};

const routeModules = import.meta.glob<RouteModule>("../pages/**/*.tsx", { eager: true });

function inferPathFromFile(filePath: string): string {
  const withoutPrefix = filePath.replace("../pages", "");
  const withoutExtension = withoutPrefix.replace(/index\.tsx$/i, "/").replace(/\.tsx$/i, "");
  if (!withoutExtension) {
    return "/";
  }

  return withoutExtension.startsWith("/") ? withoutExtension : `/${withoutExtension}`;
}

const registry = new Map<string, RouteDefinition>();

for (const [filePath, module] of Object.entries(routeModules)) {
  const explicit = module?.route;
  const fallbackPath = inferPathFromFile(filePath);
  const definition: RouteDefinition = {
    path: explicit?.path ?? fallbackPath,
    ssr: explicit?.ssr ?? false,
    metadata: mergeRouteMetadata(explicit?.metadata),
  };

  const normalizedPath = normalizeRoutePath(definition.path);
  registry.set(normalizedPath, {
    ...definition,
    path: normalizedPath,
  });
}

export function getRouteDefinition(pathname: string): RouteDefinition | undefined {
  const normalizedPath = normalizeRoutePath(pathname);
  return registry.get(normalizedPath);
}

export function getRouteMetadata(pathname: string): RouteMetadata {
  return getRouteDefinition(pathname)?.metadata ?? DEFAULT_ROUTE_METADATA;
}

export function shouldSSR(pathname: string): boolean {
  const definition = getRouteDefinition(pathname);
  return Boolean(definition?.ssr);
}

export function listRegisteredRoutes(): RouteDefinition[] {
  return Array.from(registry.values());
}
