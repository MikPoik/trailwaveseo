/**
 * Page Analyzer Module
 * Handles individual page analysis with enhanced insights and modular processing
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AnalysisContext, AnalysisOptions } from './analysis-orchestrator.js';
import { checkQuotaLimits } from './quota-manager.js';
import { emitPageProgress as emitProgress } from './progress-tracker.js';
import { Heading, Image, SeoIssue, SeoCategory } from '../../client/src/lib/types.js';
import { generateBatchImageAltText } from './image-alt-text.js';

// Modular imports
import { extractBasicSeoElements } from './extractors/basic-seo-extractor.js';
import { extractContentElements, AnalysisImage } from './extractors/content-extractor.js';
import { extractLinkElements } from './extractors/link-extractor.js';
import { extractCtaElements } from './extractors/cta-extractor.js';
import { extractCardElements } from './extractors/card-extractor.js';
import { detectSeoIssues } from './analyzers/seo-issues-detector.js';
import { analyzeContentQuality } from './analyzers/content-quality-analyzer.js';

export interface PageAnalysisResult {
  url: string;
  title: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  metaKeywordsArray: string[] | null;
  canonical: string | null;
  robotsMeta: string | null;
  headings: Heading[];
  images: AnalysisImage[];
  internalLinks: Array<{ href: string; text: string; title?: string }>;
  externalLinks: Array<{ href: string; text: string; title?: string }>;
  ctaElements: Array<{
    type: string;
    text: string;
    element: string;
    attributes: Record<string, string>;
  }>;
  paragraphs: string[];
  sentences: string[];
  allTextContent: string;
  issues: SeoIssue[];
  wordCount: number;
  readabilityScore: number;
  keywordDensity: Array<{keyword: string, count: number, density: number}>;
  contentDepth: number;
  semanticKeywords: string[];
  suggestions?: string[];
  suggestionsTeaser?: string;
  hasJsonLd: boolean;
  structuredData: any[];
  cardElements?: Array<{
    type: string;
    title: string;
    content: string;
    classes: string;
    hasImage: boolean;
    hasCTA: boolean;
  }>;
}

/**
 * Analyze pages in batches with enhanced progress tracking
 */
export async function analyzePagesBatch(
  context: AnalysisContext,
  pages: string[],
  options: AnalysisOptions
): Promise<PageAnalysisResult[]> {

  const startTime = Date.now();
  const analyzedPages: PageAnalysisResult[] = [];

  console.log(`Analyzing ${pages.length} pages for ${context.domain}`);

  // Check for cancellation before starting
  if (context.controller.signal.aborted) {
    throw new Error('Analysis cancelled by user');
  }

  // Process pages in batches with the concurrency limit
  for (let i = 0; i < pages.length; i += 3) { // Process 3 pages concurrently
    // Check if analysis was cancelled
    if (context.controller.signal.aborted) {
      throw new Error('Analysis cancelled');
    }

    // Check if we've reached the user's quota limit
    const canContinue = await checkQuotaLimits(
      context.userId,
      analyzedPages.length,
      context.remainingQuota,
      context.settings
    );

    if (!canContinue) {
      console.log(`Stopping analysis - reached page quota limit`);
      break;
    }

    const batch = pages.slice(i, i + 3);
    const batchPromises = batch.map((pageUrl, index) => 
      analyzeSinglePage(context, pageUrl, analyzedPages, options)
    );

    // Wait for all pages in this batch to complete
    const batchResults = await Promise.all(batchPromises);

    // Add successful results to analyzed pages
    batchResults.forEach(result => {
      if (result) {
        analyzedPages.push(result);
      }
    });

    // Emit progress update
    emitProgress(context, pages.length, analyzedPages);

    // Add delay between batches if more batches remain and we haven't hit the quota
    const hasMorePages = i + 3 < pages.length;
    const withinQuota = !context.userId || analyzedPages.length < context.remainingQuota;

    if (hasMorePages && withinQuota) {
      await new Promise(resolve => setTimeout(resolve, context.settings.crawlDelay));
    }
  }

  console.log(`Completed page analysis: ${analyzedPages.length}/${pages.length} pages analyzed`);
  return analyzedPages;
}

/**
 * Analyze a single page and update progress
 */
async function analyzeSinglePage(
  context: AnalysisContext,
  pageUrl: string,
  analyzedPages: PageAnalysisResult[],
  options: AnalysisOptions
): Promise<PageAnalysisResult | null> {

  if (context.controller.signal.aborted) {
    throw new Error('Analysis cancelled');
  }

  // Check quota limits during processing
  const canAnalyze = await checkQuotaLimits(
    context.userId,
    analyzedPages.length,
    context.remainingQuota,
    context.settings
  );

  if (!canAnalyze) {
    return null;
  }

  try {
    console.log(`Analyzing page: ${pageUrl}`);

    // Perform enhanced page analysis
    const pageAnalysis = await performEnhancedPageAnalysis(
      pageUrl, 
      context.settings, 
      context.controller.signal, 
      options.isCompetitorAnalysis,
      options.additionalInfo,
      { useAI: options.useAI, skipAltTextGeneration: options.skipAltTextGeneration }
    );

    if (pageAnalysis) {
      console.log(`Successfully analyzed: ${pageUrl} (${pageAnalysis.wordCount} words, ${pageAnalysis.issues.length} issues)`);
    }

    return pageAnalysis;
  } catch (error) {
    console.error(`Error analyzing page ${pageUrl}:`, error);
    return null;
  }
}

/**
 * Perform enhanced page analysis with modular processing
 */
async function performEnhancedPageAnalysis(
  url: string,
  settings: any,
  signal: AbortSignal,
  isCompetitor: boolean = false,
  additionalInfo?: string,
  options?: { useAI?: boolean; skipAltTextGeneration?: boolean }
): Promise<PageAnalysisResult | null> {

  try {
    // Fetch page content
    const response = await axios.get(url, {
      signal,
      headers: {
        'User-Agent': 'SEO-Optimizer-Bot/1.0 (+https://seooptimizer.com/bot)',
      },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Check for noindex directive
    const metaRobots = $('meta[name="robots"], meta[name="googlebot"]').attr('content');
    const hasNoindex = metaRobots && metaRobots.toLowerCase().includes('noindex');

    if (hasNoindex) {
      console.log(`Skipping page with noindex directive: ${url}`);
      return null;
    }

    // Extract basic SEO elements using modular extractor
    const basicElements = extractBasicSeoElements($, url);

    // Extract content elements using modular extractor
    const contentElements = extractContentElements($, url, settings);

    // Extract link structure using modular extractor
    const linkElements = extractLinkElements($, url, settings);

    // Extract CTA elements using modular extractor
    const ctaElements = extractCtaElements($, url);

    // Extract card elements using modular extractor
    const cardElements = extractCardElements($, url);

    // Analyze content quality using modular analyzer
    const contentQuality = analyzeContentQuality(contentElements);

    // Detect SEO issues using modular detector
    const issues = await detectSeoIssues(basicElements, contentElements, contentQuality);

    // Generate alt text for images if AI is enabled
    let processedImages = contentElements.images;

    if (options?.useAI && !options?.skipAltTextGeneration && !isCompetitor) {
      // Filter out images without alt text AND filter out invalid image sources
      const imagesWithoutAlt = contentElements.images.filter(img => {
        // Check if image has meaningful alt text
        const hasAlt = img.alt && img.alt.trim().length > 0;
        if (hasAlt) return false;

        // Skip data URIs, SVG placeholders, and invalid URLs
        if (img.src.startsWith('data:') || 
            img.src.includes('placeholder') || 
            img.src.includes('%3Csvg') ||
            !img.src.startsWith('http')) {
          return false;
        }

        return true;
      });

      if (imagesWithoutAlt.length > 0) {
        console.log(`Generating alt text for ${imagesWithoutAlt.length} images on ${url}`);

        // Prepare context data for alt text generation
        const imagesForAltText = imagesWithoutAlt.map(img => ({
          src: img.src,
          context: {
            url,
            title: basicElements.title || undefined,
            headings: contentElements.headings || [],
            businessType: undefined, // Will be populated from site overview when available
            industry: undefined // Will be populated from site overview when available
          }
        }));

        try {
          // Generate alt text in batch
          const altTextResults = await generateBatchImageAltText(imagesForAltText);

          // Update images with generated alt text
          processedImages = contentElements.images.map(img => {
            const altTextResult = altTextResults.find(result => result.src === img.src);
            if (altTextResult && altTextResult.altText) {
              return {
                ...img,
                suggestedAlt: altTextResult.altText
              };
            }
            return img;
          });

          console.log(`Generated alt text for ${altTextResults.filter(r => r.altText).length} images`);
        } catch (error) {
          console.error(`Error generating alt text for ${url}:`, error);
          // Continue with original images if alt text generation fails
        }
      } else {
        console.log(`No images without alt text found on ${url}`);
      }
    } else {
      console.log(`Alt text generation skipped for ${url} due to condition checks`);
    }

    // Combine all analysis results
    return {
      url,
      ...basicElements,
      ...contentElements,
      images: processedImages, // Use processed images with alt text
      ...linkElements,
      ctaElements,
      cardElements, // Add detected card elements
      issues,
      ...contentQuality
    };

  } catch (error) {
    console.error(`Error fetching page ${url}:`, error);
    return null;
  }
}