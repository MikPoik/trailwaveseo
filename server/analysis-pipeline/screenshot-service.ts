
/**
 * Screenshot capture service using screenshotapi.com
 * Captures page screenshots for design analysis
 */

import type { ScreenshotData } from '../../shared/schema';

interface ScreenshotApiOptions {
  url: string;
  width?: number;
  height?: number;
  format?: 'png' | 'jpg' | 'webp';
  full_page?: boolean;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
  retina?: boolean;
  delay?: number;
}

/**
 * Capture screenshot using screenshotapi.com
 */
export async function captureScreenshot(
  url: string,
  options: Partial<ScreenshotApiOptions> = {}
): Promise<ScreenshotData> {
  
  const apiKey = process.env.SCREENSHOTAPI_ACCESS_KEY;
  if (!apiKey) {
    throw new Error('SCREENSHOTAPI_ACCESS_KEY environment variable is required');
  }

  try {
    console.log(`Capturing screenshot for: ${url}`);
    
    // Build query parameters for the GET request
    const params = new URLSearchParams({
      url: url,
      apiKey: apiKey,
      width: String(options.width || 1920),
      height: String(options.height || 1080),
      format: options.format || 'png',
      full_page: options.full_page !== false ? 'true' : 'false',
      delay: String(options.delay || 2000)
    });

    // Add device type parameters
    if (options.mobile) params.append('mobile', 'true');
    if (options.tablet) params.append('tablet', 'true');
    if (options.desktop !== false) params.append('desktop', 'true');
    if (options.retina !== false) params.append('retina', 'true');

    // Make GET request to screenshotapi.com
    const apiUrl = `https://api.screenshotapi.com/take?${params.toString()}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'SEO-Analyzer/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Screenshot API error (${response.status}):`, errorText);
      throw new Error(`Screenshot API error: ${response.status} - ${errorText}`);
    }

    // The API returns the image directly, so we need to convert to base64 data URL
    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    
    console.log(`Screenshot captured successfully for: ${url}`);
    
    return {
      url: url,
      screenshotUrl: dataUrl,
      captureTimestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Failed to capture screenshot for ${url}:`, error);
    
    return {
      url: url,
      screenshotUrl: '',
      captureTimestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Capture screenshots for multiple URLs in parallel
 */
export async function captureMultipleScreenshots(
  urls: string[],
  options: Partial<ScreenshotApiOptions> = {}
): Promise<ScreenshotData[]> {
  
  console.log(`Capturing screenshots for ${urls.length} URLs...`);
  
  // Limit concurrent requests to avoid rate limiting
  const batchSize = 3;
  const results: ScreenshotData[] = [];
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => captureScreenshot(url, options));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to be respectful to API limits
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`Completed capturing ${results.length} screenshots`);
  return results;
}

/**
 * Capture screenshot optimized for design analysis
 * Uses specific settings that work well for AI analysis
 */
export async function captureDesignScreenshot(url: string): Promise<ScreenshotData> {
  return captureScreenshot(url, {
    width: 1920,
    height: 1080,
    format: 'png',
    full_page: true,
    desktop: true,
    retina: true,
    delay: 3000 // Extra time for complex pages to load
  });
}

/**
 * Capture mobile screenshot for mobile design analysis
 */
export async function captureMobileScreenshot(url: string): Promise<ScreenshotData> {
  return captureScreenshot(url, {
    width: 375,
    height: 667,
    format: 'png',
    full_page: true,
    mobile: true,
    retina: true,
    delay: 3000
  });
}
