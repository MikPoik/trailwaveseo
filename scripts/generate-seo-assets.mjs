import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import path from "node:path";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const PAGES_DIR = path.join(ROOT_DIR, "client", "src", "pages");
const PUBLIC_DIR = path.join(ROOT_DIR, "client", "public");

const BASE_URL = (process.env.SITE_URL || "https://trailwaveseo.com").replace(/\/$/, "");
const DISALLOW_PATHS = ["/api/", "/dashboard/admin/", "/admin/", "/dashboard"];
const ALLOW_PATHS = [""];

function normalizeRoutePath(input) {
  const pathStr = typeof input === "string" ? input : "/";
  if (!pathStr || pathStr === "/") {
    return "/";
  }
  const pathname = pathStr.split("?")[0].split("#")[0];
  if (!pathname || pathname === "/") {
    return "/";
  }
  const trimmed = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return trimmed || "/";
}

async function ensureDirectory(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function listPageFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listPageFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(entryPath);
    }
  }

  return files;
}

function evaluateExpression(node) {
  if (!node) return undefined;

  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map(evaluateExpression);
  }
  if (ts.isObjectLiteralExpression(node)) {
    const result = {};
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const key = getPropertyName(prop.name);
        result[key] = evaluateExpression(prop.initializer);
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        const key = prop.name.getText();
        result[key] = undefined;
      }
    }
    return result;
  }
  if (ts.isParenthesizedExpression(node)) {
    return evaluateExpression(node.expression);
  }
  if (ts.isAsExpression(node) || ts.isTypeAssertion(node)) {
    return evaluateExpression(node.expression);
  }

  return undefined;
}

function getPropertyName(nameNode) {
  if (ts.isIdentifier(nameNode) || ts.isStringLiteralLike(nameNode)) {
    return nameNode.text;
  }
  if (ts.isComputedPropertyName(nameNode)) {
    return evaluateExpression(nameNode.expression);
  }
  return String(nameNode.getText());
}

async function extractRouteDefinition(filePath) {
  const sourceText = await fs.readFile(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX,
  );

  let routeObject = null;

  function visit(node) {
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === "route" && declaration.initializer) {
          routeObject = evaluateExpression(declaration.initializer);
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routeObject;
}

async function collectRoutes() {
  const files = await listPageFiles(PAGES_DIR);
  const routeMap = new Map();

  for (const file of files) {
    try {
      const route = await extractRouteDefinition(file);
      if (!route || typeof route.path !== "string") {
        continue;
      }

      const normalizedPath = normalizeRoutePath(route.path);
      const canonical = deriveCanonical(route, normalizedPath);
      const ssr = Boolean(route.ssr);

      routeMap.set(normalizedPath, { path: normalizedPath, canonical, ssr });
    } catch (error) {
      console.warn(`[seo] Failed to parse ${file}:`, error.message || error);
    }
  }

  return Array.from(routeMap.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function deriveCanonical(route, normalizedPath) {
  if (route?.metadata?.canonical) {
    return route.metadata.canonical;
  }
  return `${BASE_URL}${normalizedPath === "/" ? "" : normalizedPath}`;
}

function buildSitemapXml(entries) {
  const ssrEntries = entries.filter((entry) => entry.ssr);
  const source = ssrEntries.length > 0 ? ssrEntries : entries;
  const urls = source.map((entry) => {
    const lastmod = new Date().toISOString().split("T")[0];
    const priority = entry.path === "/" ? "1.0" : "0.8";
    const changefreq = entry.path === "/" ? "weekly" : "monthly";

    return `  <url>\n    <loc>${entry.canonical}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join("\n");
}

function buildRobotsTxt(entries) {
  const lines = [];
  lines.push("User-agent: *");
  lines.push("Allow: /");

  const ssrPaths = entries.filter((entry) => entry.ssr).map((entry) => entry.path);
  for (const allowPath of ssrPaths) {
    if (allowPath !== "/") {
      lines.push(`Allow: ${allowPath}`);
    }
  }

  for (const allowPath of ALLOW_PATHS) {
    if (allowPath) {
      lines.push(`Allow: ${allowPath}`);
    }
  }

  for (const disallowPath of DISALLOW_PATHS) {
    lines.push(`Disallow: ${disallowPath}`);
  }

  lines.push("");
  lines.push(`# Generated on ${new Date().toISOString()}`);
  lines.push(`Sitemap: ${BASE_URL}/sitemap.xml`);
  lines.push("");

  return lines.join("\n");
}

async function main() {
  await ensureDirectory(PUBLIC_DIR);
  const entries = await collectRoutes();

  const sitemapXml = buildSitemapXml(entries);
  const robotsTxt = buildRobotsTxt(entries);

  await fs.writeFile(path.join(PUBLIC_DIR, "sitemap.xml"), sitemapXml, "utf8");
  await fs.writeFile(path.join(PUBLIC_DIR, "robots.txt"), robotsTxt, "utf8");

  console.log(`[seo] Generated sitemap.xml with ${entries.length} routes`);
  console.log(`[seo] Generated robots.txt`);
}

main().catch((error) => {
  console.error("[seo] Failed to generate SEO assets", error);
  process.exitCode = 1;
});
