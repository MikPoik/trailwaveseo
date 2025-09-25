
/**
 * Screenshot capture service using screenshotapi.com
 * Captures page screenshots for design analysis and stores them in GCS
 */

import type { ScreenshotData } from '../../shared/schema';
import { uploadScreenshotToGCS } from '../storage/gcs-storage';

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
    
    // Build request body for POST request
    const requestBody = {
      url: url,
      apiKey: apiKey,
      doScroll:true,
      format: options.format || 'png',
      fullPage: true,

    };

    // Make POST request to screenshotapi.com
    const response = await fetch('https://api.screenshotapi.com/take', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'User-Agent': 'SEO-Analyzer/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Screenshot API error (${response.status}):`, errorText);
      throw new Error(`Screenshot API error: ${response.status} - ${errorText}`);
    }

    // The API returns JSON with outputUrl containing the screenshot URL
    const jsonResponse = await response.json();
    console.log(`Screenshot API response for ${url}:`, jsonResponse);
    
    const screenshotUrl = jsonResponse.outputUrl;
    
    if (!screenshotUrl) {
      throw new Error('Screenshot URL (outputUrl) not found in API response');
    }
    
    console.log(`Screenshot captured successfully for: ${url}. Uploading to GCS...`);
    
    // Upload screenshot to GCS for permanent storage
    const gcsUploadResult = await uploadScreenshotToGCS(screenshotUrl, url);
    
    console.log(`Screenshot uploaded to GCS: ${gcsUploadResult.publicUrl}`);
    
    return {
      url: url,
      screenshotUrl: gcsUploadResult.publicUrl, // Use GCS URL instead of temporary URL
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
