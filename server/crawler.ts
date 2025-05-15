import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

/**
 * Crawl a website to discover pages
 * @param startUrl URL to start crawling from
 * @param maxPages Maximum number of pages to crawl
 * @param delay Delay between requests in milliseconds
 * @param followExternalLinks Whether to follow links to other domains
 * @param signal AbortSignal for cancellation
 * @param progressCallback Optional callback to report crawling progress
 * @returns Array of discovered page URLs
 */
export async function crawlWebsite(
  startUrl: string, 
  maxPages: number = 20, 
  delay: number = 500,
  followExternalLinks: boolean = false,
  signal?: AbortSignal,
  progressCallback?: (urls: string[]) => void
): Promise<string[]> {
  const normalizedStartUrl = normalizeUrl(startUrl);
  const baseUrlObj = new URL(normalizedStartUrl);
  const baseDomain = baseUrlObj.hostname;
  
  const discoveredUrls = new Set<string>([normalizedStartUrl]);
  const crawledUrls = new Set<string>();
  const queue = [normalizedStartUrl];

  while (queue.length > 0 && crawledUrls.size < maxPages) {
    if (signal?.aborted) {
      throw new Error('Crawling cancelled');
    }
    
    const currentUrl = queue.shift()!;
    
    // Skip if already crawled
    if (crawledUrls.has(currentUrl)) {
      continue;
    }
    
    try {
      // Fetch the page
      const response = await axios.get(currentUrl, {
        signal,
        headers: {
          'User-Agent': 'SEO-Optimizer-Bot/1.0 (+https://seooptimizer.com/bot)',
        },
        timeout: 10000,  // 10-second timeout
        maxRedirects: 5
      });
      
      // Only process HTML content
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        crawledUrls.add(currentUrl);
        continue;
      }
      
      // Extract links from the page
      const $ = cheerio.load(response.data);
      const links = $('a[href]')
        .map((_, el) => $(el).attr('href'))
        .get();
      
      // Process and add valid links to the queue
      for (const link of links) {
        try {
          // Skip empty, javascript, anchor, or mailto links
          if (!link || 
              link.startsWith('javascript:') || 
              link.startsWith('#') || 
              link.startsWith('mailto:') ||
              link.startsWith('tel:')) {
            continue;
          }
          
          // Normalize the URL
          const urlObj = new URL(link, currentUrl);
          const normalizedLink = normalizeUrl(urlObj.href);
          
          // Skip external links if not following them
          if (!followExternalLinks && urlObj.hostname !== baseDomain) {
            continue;
          }
          
          // Skip already discovered URLs
          if (discoveredUrls.has(normalizedLink)) {
            continue;
          }
          
          // Skip non-HTTP protocols
          if (!normalizedLink.startsWith('http://') && !normalizedLink.startsWith('https://')) {
            continue;
          }
          
          // Add to discovered URLs and queue
          discoveredUrls.add(normalizedLink);
          queue.push(normalizedLink);
        } catch (error) {
          // Skip invalid URLs
          continue;
        }
      }
      
      // Mark as crawled
      crawledUrls.add(currentUrl);
      
      // Call progress callback if provided
      if (progressCallback) {
        progressCallback(Array.from(discoveredUrls));
      }
      
      // Delay before next request
      if (queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      // Mark as crawled even on error to avoid retrying
      crawledUrls.add(currentUrl);
      console.error(`Error crawling ${currentUrl}:`, error instanceof Error ? error.message : String(error));
      
      // Continue with next URL
      continue;
    }
  }
  
  return Array.from(crawledUrls);
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
    urlObj.hash = '';
    
    // Remove default ports
    if ((urlObj.protocol === 'http:' && urlObj.port === '80') ||
        (urlObj.protocol === 'https:' && urlObj.port === '443')) {
      urlObj.port = '';
    }
    
    return urlObj.href;
  } catch (error) {
    return url;
  }
}
