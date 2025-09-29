
import { renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import type { QueryClient } from "@tanstack/react-query";
import AppRoot from "./AppRoot";
import { createQueryClient } from "./lib/queryClient";
import { getRouteMetadata, shouldSSR } from "./routes/registry";
import { normalizeRoutePath } from "@shared/route-metadata";

export interface SSRContext {
  redirectTo?: string;
}

function createApp(queryClient: QueryClient, url: string, search?: string) {
  return (
    <AppRoot
      queryClient={queryClient}
      routerProps={{
        ssrPath: url,
        ssrSearch: search,
      }}
    />
  );
}

function cleanHtml(html: string): string {
  // Remove null characters and other problematic control characters
  return html
    .replace(/\0/g, "") // Remove null characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove other control characters except \t, \n, \r
    .replace(/\uFEFF/g, ""); // Remove BOM characters
}

export function generateHTML(url: string, search?: string): Promise<{ html: string; ssrContext: SSRContext }> {
  return new Promise((resolve, reject) => {
    const queryClient = createQueryClient();
    const ssrContext: SSRContext = {};

    const stream = renderToPipeableStream(createApp(queryClient, url, search), {
      onShellReady() {
        const chunks: Buffer[] = [];
        const writableStream = new Writable({
          write(chunk, _encoding, callback) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            callback();
          },
          final(callback) {
            try {
              const rawHtml = Buffer.concat(chunks).toString("utf8");
              const cleanedHtml = cleanHtml(rawHtml);
              resolve({ html: cleanedHtml, ssrContext });
              callback();
            } catch (error) {
              reject(error);
              callback();
            }
          },
        });

        writableStream.on("error", (error) => {
          reject(error);
        });

        try {
          stream.pipe(writableStream);
        } catch (error) {
          reject(error);
        }
      },
      onShellError(error) {
        reject(error);
      },
      onError(error) {
        console.error("SSR rendering error:", error);
        reject(error);
      },
    });
  });
}

const HTML_ESCAPE_LOOKUP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value?: string): string {
  if (!value) {
    return "";
  }

  // Remove null characters and other problematic characters first
  const cleanValue = value
    .replace(/\0/g, "") // Remove null characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove other control characters except \t, \n, \r
    .replace(/\uFEFF/g, ""); // Remove BOM characters

  return cleanValue.replace(/[&<>"']/g, (char) => HTML_ESCAPE_LOOKUP[char] ?? char);
}

export function generateMetaTags(url: string): string {
  const normalizedPath = normalizeRoutePath(url);
  const metadata = getRouteMetadata(normalizedPath);
  const canonicalUrl = metadata.canonical ?? `https://trailwaveseo.com${normalizedPath === "/" ? "" : normalizedPath}`;

  const lines = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    metadata.keywords ? `<meta name="keywords" content="${escapeHtml(metadata.keywords)}" />` : "",
    `<meta name="author" content="TrailWave SEO" />`,
    `<meta name="robots" content="index, follow" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.ogTitle ?? metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.ogDescription ?? metadata.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(metadata.ogImage ?? "https://trailwaveseo.com/og-image.jpg")}" />`,
    `<meta property="twitter:card" content="summary_large_image" />`,
    `<meta property="twitter:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="twitter:title" content="${escapeHtml(metadata.ogTitle ?? metadata.title)}" />`,
    `<meta property="twitter:description" content="${escapeHtml(metadata.ogDescription ?? metadata.description)}" />`,
    `<meta property="twitter:image" content="${escapeHtml(metadata.ogImage ?? "https://trailwaveseo.com/og-image.jpg")}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
  ].filter(Boolean);

  if (metadata.structuredData) {
    lines.push(
      `<!-- Structured Data -->`,
      `<script type="application/ld+json">${JSON.stringify(metadata.structuredData)}</script>`
    );
  }

  return lines.join("\n");
}

export { shouldSSR } from "./routes/registry";
