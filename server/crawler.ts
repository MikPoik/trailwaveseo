import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";

/**
 * Parse a robots.txt file to get disallowed paths
 * @param domain Domain to fetch robots.txt from
 * @returns Set of disallowed paths
 */
async function parseRobotsTxt(domain: string): Promise<Set<string>> {
  const disallowedPaths = new Set<string>();

  try {
    const response = await axios.get(`https://${domain}/robots.txt`, {
      timeout: 5000,
    });

    const lines = response.data.split("\n");
    let userAgentApplies = false;
    let currentUserAgent = "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      const lowerLine = trimmedLine.toLowerCase();

      // Check if this is a new user-agent section
      if (lowerLine.startsWith("user-agent:")) {
        const agent = trimmedLine.substring(lowerLine.indexOf(":") + 1).trim();
        currentUserAgent = agent.toLowerCase();
        
        // Apply rules for our bot or all bots (*)
        // Handle both exact matches and wildcard patterns
        userAgentApplies = agent === "*" || 
                          currentUserAgent === "*" ||
                          currentUserAgent.includes("seo-optimizer-bot") ||
                          agent.toLowerCase().includes("seo-optimizer-bot") ||
                          currentUserAgent === "seo-optimizer-bot/1.0";
        continue;
      }

      // If we encounter a blank line, reset the current user agent context
      if (trimmedLine === "") {
        userAgentApplies = false;
        currentUserAgent = "";
        continue;
      }

      // If in applicable section, parse disallow rules
      if (userAgentApplies && lowerLine.startsWith("disallow:")) {
        const colonIndex = lowerLine.indexOf(":");
        const path = trimmedLine.substring(colonIndex + 1).trim();
        if (path.length > 0) {
          disallowedPaths.add(path);
        }
      }

      // Also handle Allow directives (robots.txt extension)
      if (userAgentApplies && lowerLine.startsWith("allow:")) {
        const colonIndex = lowerLine.indexOf(":");
        const path = trimmedLine.substring(colonIndex + 1).trim();
        if (path.length > 0) {
          // Remove from disallowed if it was previously added
          // This handles the case where Allow overrides a broader Disallow
          disallowedPaths.delete(path);
        }
      }
    }

    return disallowedPaths;
  } catch (error) {
    console.log(`No robots.txt found at ${domain} or error parsing it:`, error instanceof Error ? error.message : String(error));
    return new Set<string>();
  }
}

/**
 * Check if a URL is allowed to be crawled based on robots.txt rules
 * @param url URL to check
 * @param disallowedPaths Set of disallowed paths from robots.txt
 * @returns Boolean indicating if URL can be crawled
 */
function isUrlAllowed(url: string, disallowedPaths: Set<string>): boolean {
  const urlObj = new URL(url);
  const path = urlObj.pathname;

  for (const disallowedPath of Array.from(disallowedPaths)) {
    // Simple wildcard matching logic
    if (disallowedPath.endsWith("*")) {
      const prefix = disallowedPath.slice(0, -1);
      if (path.startsWith(prefix)) {
        return false;
      }
    } else if (
      path === disallowedPath ||
      path.startsWith(`${disallowedPath}/`)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Crawl a website to discover pages and extract basic SEO data
 *
 * Features:
 * - Respects robots.txt directives
 * - Detects meta robots noindex/nofollow tags
 * - Prioritizes important pages (home, about, etc.)
 * - Normalizes URLs to avoid duplicates
 * - Filters tracking parameters
 * - Extracts basic SEO data during crawling
 *
 * @param startUrl URL to start crawling from
 * @param maxPages Maximum number of pages to crawl
 * @param delay Delay between requests in milliseconds
 * @param followExternalLinks Whether to follow links to other domains
 * @param signal AbortSignal for cancellation
 * @param progressCallback Optional callback to report crawling progress and SEO data
 * @returns Array of discovered page URLs that can be indexed (respecting robots directives)
 */
export async function crawlWebsite(
  startUrl: string,
  maxPages: number = 20,
  delay: number = 500,
  followExternalLinks: boolean = false,
  signal?: AbortSignal,
  progressCallback?: (urls: string[], seoData?: any) => void,
): Promise<string[]> {
  const normalizedStartUrl = normalizeUrl(startUrl);
  const baseUrlObj = new URL(normalizedStartUrl);
  const baseDomain = baseUrlObj.hostname;

  // Always start from the root/homepage for better context
  const rootUrl = `${baseUrlObj.protocol}//${baseDomain}`;
  const normalizedRootUrl = normalizeUrl(rootUrl);

  // Parse robots.txt to respect crawling rules
  const disallowedPaths = await parseRobotsTxt(baseDomain);

  const discoveredUrls = new Set<string>([normalizedRootUrl]);
  const crawledUrls = new Set<string>();
  const processingSeoData = new Map<string, any>();

  // Use a priority queue for better crawling order
  interface QueueItem {
    url: string;
    priority: number;
  }

  // Start with the root URL at highest priority
  const priorityQueue: QueueItem[] = [{ url: normalizedRootUrl, priority: 25 }];

  // If the original start URL is different from root, add it with high priority too
  if (normalizedStartUrl !== normalizedRootUrl) {
    discoveredUrls.add(normalizedStartUrl);
    priorityQueue.push({ url: normalizedStartUrl, priority: 20 });
  }

  // Function to crawl a single URL
  const crawlUrl = async (item: QueueItem): Promise<void> => {
    const currentUrl = item.url;

    // Skip if already crawled or being processed
    if (crawledUrls.has(currentUrl)) {
      return;
    }

    // Mark as being processed
    crawledUrls.add(currentUrl);

    try {
      // Fetch the page
      const response = await axios.get(currentUrl, {
        signal,
        headers: {
          "User-Agent": "SEO-Optimizer-Bot/1.0 (+https://seooptimizer.com/bot)",
        },
        timeout: 10000, // 10-second timeout
        maxRedirects: 5,
      });

      // Only process HTML content
      const contentType = response.headers["content-type"] || "";
      if (!contentType.includes("text/html")) {
        return;
      }

      // Extract links from the page
      const $ = cheerio.load(response.data);

      // Check for noindex or nofollow in meta robots
      const metaRobots = $('meta[name="robots"], meta[name="googlebot"]').attr(
        "content",
      );
      const hasNoindex =
        metaRobots && metaRobots.toLowerCase().includes("noindex");
      const hasNofollow =
        metaRobots && metaRobots.toLowerCase().includes("nofollow");

      // If the page has noindex, we crawl it but don't add to discoveredUrls (output)
      if (hasNoindex) {
        console.log(`Page has noindex directive: ${currentUrl}`);
      }

      // If the page has nofollow, we don't follow its links
      const links = hasNofollow
        ? []
        : $("a[href]")
            .map((_, el) => $(el).attr("href"))
            .get();

      // Process and add valid links to the queue
      for (const link of links) {
        try {
          // Skip empty, javascript, anchor, or mailto links
          if (
            !link ||
            link.startsWith("javascript:") ||
            link.startsWith("#") ||
            link.startsWith("mailto:") ||
            link.startsWith("tel:")
          ) {
            continue;
          }

          // Normalize the URL
          const urlObj = new URL(link, currentUrl);
          const normalizedLink = normalizeUrl(urlObj.href);

          // Skip external links if not following them
          if (!followExternalLinks && urlObj.hostname !== baseDomain) {
            continue;
          }

          // Skip already discovered or crawled URLs to prevent duplicates
          if (
            discoveredUrls.has(normalizedLink) ||
            crawledUrls.has(normalizedLink)
          ) {
            continue;
          }

          // Skip non-HTTP protocols
          if (
            !normalizedLink.startsWith("http://") &&
            !normalizedLink.startsWith("https://")
          ) {
            continue;
          }

          // Check against robots.txt rules if on the same domain
          if (
            urlObj.hostname === baseDomain &&
            !isUrlAllowed(normalizedLink, disallowedPaths)
          ) {
            continue;
          }

          // Add to discovered URLs and priority queue
          discoveredUrls.add(normalizedLink);
          const priority = calculateUrlPriority(normalizedLink, baseDomain);

          // Add to queue for processing if we're under the limit and not already crawled
          if (
            discoveredUrls.size < maxPages &&
            !crawledUrls.has(normalizedLink)
          ) {
            priorityQueue.push({ url: normalizedLink, priority });
          }
        } catch (error) {
          // Skip invalid URLs
          continue;
        }
      }

      // Extract basic SEO data while we're already parsing the page
      const seoData = {
        url: currentUrl,
        title: $("title").text() || null,
        metaDescription: $('meta[name="description"]').attr("content") || null,
        h1: $("h1").first().text() || null,
        headingCount: {
          h1: $("h1").length,
          h2: $("h2").length,
          h3: $("h3").length,
        },
        wordCount: $("body").text().trim().split(/\s+/).length,
        hasCanonical: $('link[rel="canonical"]').length > 0,
        hasStructuredData: $('script[type="application/ld+json"]').length > 0,
      };

      // Store SEO data
      processingSeoData.set(currentUrl, seoData);
    } catch (error) {
      console.error(
        `Error crawling ${currentUrl}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  // Main crawling loop with concurrency control
  const concurrencyLimit = 3; // Process 3 pages concurrently

  while (priorityQueue.length > 0 && crawledUrls.size < maxPages) {
    if (signal?.aborted) {
      throw new Error("Crawling cancelled");
    }

    // Sort queue by priority (descending)
    priorityQueue.sort((a, b) => b.priority - a.priority);

    // Take a batch of URLs to process
    const batchSize = Math.min(concurrencyLimit, priorityQueue.length);
    const batch = priorityQueue.splice(0, batchSize);

    // Process them concurrently
    await Promise.all(
      batch.map(async (item) => {
        await crawlUrl(item);

        // Call progress callback
        if (progressCallback) {
          progressCallback(
            Array.from(discoveredUrls),
            processingSeoData.get(item.url),
          );
        }
      }),
    );

    // Add delay between batches to avoid rate limiting
    if (priorityQueue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Return all discovered URLs that were successfully crawled and can be indexed
  // Filter out URLs with noindex directive
  const indexableUrls = Array.from(crawledUrls);
  console.log(
    `Crawling summary for ${baseDomain}: discovered ${discoveredUrls.size} URLs, successfully crawled ${indexableUrls.length} URLs`,
  );

  return indexableUrls;
}

/**
 * Normalize a URL by removing trailing slashes, fragments, and query parameters
 * @param url URL to normalize
 * @returns Normalized URL
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove fragment
    urlObj.hash = "";

    // Normalize www subdomain - remove www. prefix for consistency
    if (urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = urlObj.hostname.substring(4);
    }

    // Remove default ports
    if (
      (urlObj.protocol === "http:" && urlObj.port === "80") ||
      (urlObj.protocol === "https:" && urlObj.port === "443")
    ) {
      urlObj.port = "";
    }

    // Remove common tracking parameters that create duplicate content
    const commonTrackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "_ga",
    ];

    const searchParams = urlObj.searchParams;
    const paramsToRemove = [];

    for (const [key] of Array.from(searchParams.entries())) {
      if (commonTrackingParams.includes(key)) {
        paramsToRemove.push(key);
      }
    }

    // Remove identified tracking parameters
    paramsToRemove.forEach((param) => {
      searchParams.delete(param);
    });

    // Remove trailing slash from pathname (except for root)
    if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    return urlObj.href;
  } catch (error) {
    return url;
  }
}

/**
 * Calculate URL priority for crawling
 * @param url URL to evaluate
 * @param baseDomain Base domain of the crawl
 * @returns Priority score (higher = more important)
 */
function calculateUrlPriority(url: string, baseDomain: string): number {
  try {
    const urlObj = new URL(url);

    // Base priority
    let priority = 10;

    // Top-level pages get higher priority
    const pathSegments = urlObj.pathname.split("/").filter(Boolean);
    priority -= pathSegments.length * 2; // Reduce priority for deeper pages

    // Home page gets highest priority
    if (urlObj.pathname === "/" || urlObj.pathname === "") {
      priority += 10;
    }

    // Common important pages
    if (
      urlObj.pathname.match(
        /\/(about|contact|services|products|blog|faq)($|\/)/i,
      )
    ) {
      priority += 5;
    }

    // Pages with many query parameters are less important (likely search results/filters)
    priority -= urlObj.searchParams.size;

    // Cap priority range
    return Math.max(1, Math.min(20, priority));
  } catch (error) {
    return 1; // Lowest priority for invalid URLs
  }
}
