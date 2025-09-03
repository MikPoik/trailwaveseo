/**
 * Page Discovery Module
 * Handles sitemap parsing and website crawling to discover pages for analysis
 */

import { parseSitemap } from '../sitemap.js';
import { crawlWebsite } from '../crawler.js';
import type { AnalysisContext, AnalysisOptions } from './analysis-orchestrator.js';

export interface PageDiscoveryResult {
  pages: string[];
  discoveryMethod: 'sitemap' | 'crawl' | 'hybrid';
  sitemapSuccess: boolean;
  crawlData?: Map<string, any>;
}

/**
 * Discover pages for analysis using sitemap or crawling
 */
export async function discoverSitePages(
  context: AnalysisContext,
  options: AnalysisOptions
): Promise<string[]> {
  
  const { domain, controller, events } = context;
  let effectiveMaxPages = Math.min(context.settings.maxPages, context.remainingQuota);
  
  // For trial users, ensure we don't analyze more pages than we can provide AI suggestions for
  if (context.isTrialUser && context.settings.useAI && context.aiSuggestionsRemaining > 0) {
    effectiveMaxPages = Math.min(effectiveMaxPages, 3); // Trial users: max 3 pages
    console.log(`Trial user: limiting analysis to 3 pages maximum`);
  }

  console.log(`Discovering pages for ${domain} (max pages: ${effectiveMaxPages})`);
  
  const result = await discoverPages(domain, options.useSitemap, effectiveMaxPages, controller.signal, events);
  
  // Normalize and prepare final page list
  return preparePagesList(result.pages, domain, effectiveMaxPages);
}

/**
 * Attempt page discovery via sitemap first, fallback to crawling
 */
async function discoverPages(
  domain: string,
  useSitemap: boolean,
  maxPages: number,
  signal: AbortSignal,
  events: EventEmitter
): Promise<PageDiscoveryResult> {
  
  let pages: string[] = [];
  let discoveryMethod: 'sitemap' | 'crawl' | 'hybrid' = 'sitemap';
  let sitemapSuccess = false;
  let crawlData: Map<string, any> | undefined;

  if (useSitemap) {
    try {
      console.log(`Attempting to parse sitemap for ${domain} (max pages: ${maxPages})`);
      
      // Try primary sitemap
      pages = await parseSitemap(`https://${domain}/sitemap.xml`, signal, maxPages);

      // If no pages found, try common sitemap patterns
      if (pages.length === 0) {
        console.log(`No pages found in primary sitemap, trying common patterns`);
        pages = await tryCommonSitemapPatterns(domain, signal, maxPages);
      }

      if (pages.length > 0) {
        sitemapSuccess = true;
        console.log(`Found ${pages.length} content pages in sitemaps for ${domain}`);
        
        // Emit progress update after sitemap discovery (5% of total progress)
        events.emit(domain, {
          status: 'in-progress',
          domain,
          pagesFound: pages.length,
          pagesAnalyzed: 0,
          currentPageUrl: '',
          analyzedPages: [],
          percentage: 5
        });
      }
    } catch (error) {
      console.log(`Sitemap parsing failed for ${domain}, will fallback to crawling: ${error instanceof Error ? error.message : String(error)}`);
      pages = [];
      sitemapSuccess = false;
      discoveryMethod = 'crawl';
    }
  }

  // Fallback to crawling if sitemap failed or wasn't used
  if (!sitemapSuccess) {
    const crawlResult = await performCrawling(domain, maxPages, signal, events);
    pages = crawlResult.pages;
    crawlData = crawlResult.crawlData;
    
    if (sitemapSuccess && pages.length > 0) {
      discoveryMethod = 'hybrid';
    } else {
      discoveryMethod = 'crawl';
    }
  }

  return {
    pages,
    discoveryMethod,
    sitemapSuccess,
    crawlData
  };
}

/**
 * Try common sitemap patterns when primary sitemap fails
 */
async function tryCommonSitemapPatterns(
  domain: string,
  signal: AbortSignal,
  maxPages: number
): Promise<string[]> {
  
  const commonPatterns = [
    'sitemap_index.xml', 
    'sitemap1.xml', 
    'sitemap-1.xml', 
    'post-sitemap.xml', 
    'page-sitemap.xml'
  ];

  for (const pattern of commonPatterns) {
    if (signal.aborted) {
      throw new Error('Sitemap parsing cancelled');
    }

    console.log(`Trying ${pattern}...`);
    try {
      const pages = await parseSitemap(`https://${domain}/${pattern}`, signal, maxPages);
      
      if (pages.length > 0) {
        console.log(`Found ${pages.length} pages in ${pattern}`);
        return pages;
      }
    } catch (error) {
      // Continue to next pattern
      console.log(`Pattern ${pattern} failed, trying next...`);
    }
  }

  return [];
}

/**
 * Perform website crawling with progress updates
 */
async function performCrawling(
  domain: string,
  maxPages: number,
  signal: AbortSignal,
  events: EventEmitter
): Promise<{ pages: string[]; crawlData: Map<string, any> }> {
  
  console.log(`Falling back to crawling for ${domain}`);

  // Emit progress update indicating fallback to crawling
  events.emit(domain, {
    status: 'in-progress',
    domain,
    pagesFound: 0,
    pagesAnalyzed: 0,
    currentPageUrl: 'Falling back to website crawling...',
    analyzedPages: [],
    percentage: 3
  });

  // Get settings for crawling (this will be refactored when quota-manager is implemented)
  const { storage } = await import('../storage.js');
  const settings = await storage.getSettings();

  // Collect basic SEO data during crawling
  const basicSeoData = new Map();

  const pages = await crawlWebsite(
    `https://${domain}`, 
    maxPages, 
    settings.crawlDelay, 
    settings.followExternalLinks,
    signal,
    (crawledPages, seoData) => {
      // Store SEO data for each page
      if (seoData) {
        basicSeoData.set(seoData.url, seoData);
      }

      // Emit progress update during crawling (up to 15% of total progress)
      const crawlingProgress = 3 + Math.min(12, Math.floor((crawledPages.length / maxPages) * 12));
      events.emit(domain, {
        status: 'in-progress',
        domain,
        pagesFound: crawledPages.length,
        pagesAnalyzed: 0,
        currentPageUrl: crawledPages[crawledPages.length - 1] || '',
        analyzedPages: [],
        basicSeoData: Array.from(basicSeoData.values()),
        percentage: crawlingProgress
      });
    }
  );

  console.log(`Crawling completed for ${domain}, found ${pages.length} pages`);
  
  return {
    pages,
    crawlData: basicSeoData
  };
}

/**
 * Prepare and normalize the final pages list
 */
function preparePagesList(
  discoveredPages: string[],
  domain: string,
  maxPages: number
): string[] {
  
  // Limit the number of pages to analyze
  let pages = discoveredPages.length > maxPages 
    ? discoveredPages.slice(0, maxPages) 
    : discoveredPages;

  console.log(`Preparing ${pages.length} pages for analysis (max setting: ${maxPages})`);

  // Ensure we don't have duplicate URLs in the pages array
  pages = [...new Set(pages)];

  // Always ensure homepage/root is analyzed first for better context
  pages = ensureHomepageFirst(pages, domain);
  
  return pages;
}

/**
 * Ensure homepage is first in the analysis list for better context
 */
function ensureHomepageFirst(pages: string[], domain: string): string[] {
  
  // Normalize domain by removing www prefix for consistency
  const normalizedDomain = domain.toLowerCase().startsWith('www.') 
    ? domain.toLowerCase().substring(4) 
    : domain.toLowerCase();
  const rootUrl = `https://${normalizedDomain}`;
  const normalizedRootUrl = rootUrl.endsWith('/') ? rootUrl.slice(0, -1) : rootUrl;

  // Remove any existing homepage variants from the array (case-insensitive)
  const filteredPages = pages.filter(page => {
    const normalizedPage = (page.endsWith('/') ? page.slice(0, -1) : page).toLowerCase();
    const rootUrlLower = normalizedRootUrl.toLowerCase();
    return normalizedPage !== rootUrlLower && 
           normalizedPage !== `${rootUrlLower}/index.html` &&
           normalizedPage !== `${rootUrlLower}/index.php` &&
           normalizedPage !== `${rootUrlLower}/home`;
  });

  // Add homepage at the beginning (using lowercase domain)
  return [normalizedRootUrl, ...filteredPages];
}