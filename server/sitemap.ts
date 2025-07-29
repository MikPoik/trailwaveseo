import axios from 'axios';
import { parseStringPromise } from 'xml2js';

/**
 * Fetch and parse a sitemap XML file to extract URLs
 * @param sitemapUrl URL to the sitemap.xml file
 * @param signal AbortSignal for cancellation
 * @param maxPages Maximum number of pages to return (optional)
 * @returns Array of page URLs found in the sitemap
 */
export async function parseSitemap(sitemapUrl: string, signal?: AbortSignal, maxPages?: number): Promise<string[]> {
  try {
    // Skip image and video sitemaps - they're not useful for page analysis
    // Check the entire URL path for any mention of image or video
    if (sitemapUrl.toLowerCase().includes('image') || 
        sitemapUrl.toLowerCase().includes('video') || 
        sitemapUrl.toLowerCase().includes('media') ||
        sitemapUrl.toLowerCase().includes('img')) {
      console.log(`Skipping media sitemap: ${sitemapUrl}`);
      return [];
    }
    
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
        
        // Skip image and video sitemaps with a more comprehensive check
        if (sitemap.loc.toLowerCase().includes('image') || sitemap.loc.toLowerCase().includes('video')) {
          console.log(`Skipping media sitemap: ${sitemap.loc}`);
          continue;
        }
        
        try {
          // Calculate remaining quota for this sub-sitemap
          const remainingQuota = maxPages ? Math.max(0, maxPages - allUrls.length) : undefined;
          const urls = await parseSitemap(sitemap.loc, signal, remainingQuota);
          allUrls.push(...urls);
          
          // Stop if we've reached the maximum
          if (maxPages && allUrls.length >= maxPages) {
            console.log(`Reached maximum pages limit (${maxPages}) during sitemap parsing`);
            break;
          }
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
      
      // Filter out URLs that might point to image or video resources
      const filteredUrls = urls
        .map((url: { loc: string }) => url.loc)
        .filter(url => {
          const isMediaUrl = url.toLowerCase().includes('image') || 
                            url.toLowerCase().includes('video') || 
                            url.toLowerCase().includes('media') || 
                            url.toLowerCase().includes('img');
          
          if (isMediaUrl) {
            console.log(`Skipping media URL: ${url}`);
            return false;
          }
          return true;
        });

      // Limit the number of URLs if maxPages is specified
      return maxPages ? filteredUrls.slice(0, maxPages) : filteredUrls;
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
