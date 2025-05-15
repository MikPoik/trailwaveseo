import axios from 'axios';
import { parseStringPromise } from 'xml2js';

/**
 * Fetch and parse a sitemap XML file to extract URLs
 * @param sitemapUrl URL to the sitemap.xml file
 * @param signal AbortSignal for cancellation
 * @returns Array of page URLs found in the sitemap
 */
export async function parseSitemap(sitemapUrl: string, signal?: AbortSignal): Promise<string[]> {
  try {
    // Fetch the sitemap XML
    const response = await axios.get(sitemapUrl, {
      signal,
      headers: {
        'User-Agent': 'SEO-Optimizer-Bot/1.0 (+https://seooptimizer.com/bot)',
      },
      timeout: 10000  // 10-second timeout
    });
    
    // Parse the XML
    const result = await parseStringPromise(response.data, {
      explicitArray: false,
      normalizeTags: true
    });
    
    // Check if it's a sitemap index
    if (result.sitemapindex && result.sitemapindex.sitemap) {
      // Handle sitemap index (collection of sitemaps)
      const sitemaps = Array.isArray(result.sitemapindex.sitemap) 
        ? result.sitemapindex.sitemap 
        : [result.sitemapindex.sitemap];
      
      // Recursively fetch and parse each sitemap
      const allUrls: string[] = [];
      
      for (const sitemap of sitemaps) {
        if (signal?.aborted) {
          throw new Error('Sitemap parsing cancelled');
        }
        
        try {
          const urls = await parseSitemap(sitemap.loc, signal);
          allUrls.push(...urls);
        } catch (error) {
          console.error(`Error parsing sub-sitemap ${sitemap.loc}:`, error);
          // Continue with next sitemap on error
        }
      }
      
      return allUrls;
    } else if (result.urlset && result.urlset.url) {
      // Handle regular sitemap
      const urls = Array.isArray(result.urlset.url) 
        ? result.urlset.url 
        : [result.urlset.url];
      
      return urls.map((url: { loc: string }) => url.loc);
    }
    
    // Fallback for unexpected format
    return [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Failed to fetch sitemap (HTTP ${error.response.status})`);
    } else if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Sitemap parsing cancelled');
    } else {
      throw new Error(`Failed to parse sitemap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
