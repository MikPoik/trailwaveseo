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

// Extend the Image interface to include suggestedAlt
interface AnalysisImage extends Image {
  suggestedAlt?: string;
}

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

    // Extract basic SEO elements
    const basicElements = extractBasicSeoElements($, url);

    // Extract content elements
    const contentElements = extractContentElements($, url, settings);

    // Extract link structure
    const linkElements = extractLinkElements($, url, settings);

    // Extract CTA elements
    const ctaElements = extractCtaElements($, url);

    // Extract card elements
    const cardElements = extractCardElements($, url);

    // Analyze content quality
    const contentQuality = analyzeContentQuality(contentElements);

    // Detect SEO issues
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

/**
 * Extract basic SEO elements from page
 */
function extractBasicSeoElements($: cheerio.CheerioAPI, url: string) {
  // Extract meta tags for SEO analysis
  const metaTags = $('meta').map((_, el) => ({
    name: $(el).attr('name') || $(el).attr('property') || $(el).attr('http-equiv'),
    content: $(el).attr('content')
  })).get().filter(tag => tag.name && tag.content);

  // Extract meta description
  const metaDescription = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';

  // Extract robots meta
  const robotsMeta = $('meta[name="robots"]').attr('content') || null;

  // Extract canonical URL
  const canonical = $('link[rel="canonical"]').attr('href') || null;

  // Check for JSON-LD structured data
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const hasJsonLd = jsonLdScripts.length > 0;

  // Extract JSON-LD data for analysis
  const structuredData: any[] = [];
  jsonLdScripts.each((_, script) => {
    try {
      const jsonContent = $(script).html();
      if (jsonContent) {
        const parsedData = JSON.parse(jsonContent);
        structuredData.push(parsedData);
      }
    } catch (error) {
      // Invalid JSON-LD, skip
      console.warn(`Invalid JSON-LD found on ${url}:`, error);
    }
  });

  return {
    title: $('title').text().trim(),
    metaDescription,
    metaKeywords: $('meta[name="keywords"]').attr('content') || null,
    metaKeywordsArray: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || null,
    canonical,
    robotsMeta,
    metaTags,
    hasJsonLd,
    structuredData
  };
}

/**
 * Extract content elements and analyze quality
 */
function extractContentElements($: cheerio.CheerioAPI, url: string, settings: any) {
  // Enhanced heading extraction for SSR React components
  const headings: Heading[] = [];
  
  // Traditional heading tags
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      headings.push({
        level: parseInt($(el).get(0).tagName.substring(1)),
        text: text
      });
    }
  });

  // Look for heading-like elements in SSR React components
  // These often use div/span with heading-like classes instead of semantic heading tags
  const headingSelectors = [
    '[class*="text-4xl"], [class*="text-5xl"], [class*="text-6xl"], [class*="text-7xl"]', // Very large text (likely H1)
    '[class*="text-3xl"]', // Large text (likely H2)
    '[class*="text-2xl"]', // Medium-large text (likely H3)
    '[class*="text-xl"]', // Medium text (likely H4/H5/H6)
    '[class*="font-bold"][class*="text-lg"]', // Bold large text
    '[class*="heading"]', // Explicit heading classes
    '[class*="title"]' // Title classes
  ];

  headingSelectors.forEach((selector, index) => {
    $(selector).each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      // Skip if already processed as a semantic heading
      if ($el.is('h1, h2, h3, h4, h5, h6')) return;
      
      // Skip if this element contains other heading elements
      if ($el.find('h1, h2, h3, h4, h5, h6').length > 0) return;
      
      // Skip if text is too long (likely not a heading)
      if (text.length > 200) return;
      
      // Skip if text is too short or looks like UI text
      if (text.length < 3 || text.match(/^(menu|login|signup|cart|search|home|about|contact)$/i)) return;

      if (text) {
        // Determine heading level based on text size classes
        let level = 6; // Default to H6
        if (selector.includes('text-4xl') || selector.includes('text-5xl') || selector.includes('text-6xl') || selector.includes('text-7xl')) {
          level = 1;
        } else if (selector.includes('text-3xl')) {
          level = 2;
        } else if (selector.includes('text-2xl')) {
          level = 3;
        } else if (selector.includes('text-xl')) {
          level = 4;
        } else if (selector.includes('text-lg')) {
          level = 5;
        }

        // Avoid duplicates by checking if we already have this exact text
        const isDuplicate = headings.some(h => h.text === text && Math.abs(h.level - level) <= 1);
        if (!isDuplicate) {
          headings.push({
            level: level,
            text: text
          });
        }
      }
    });
  });

  // Extract images
  const images: AnalysisImage[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      images.push({
        src: src.startsWith('http') ? src : new URL(src, url).toString(),
        alt: $(el).attr('alt') || null,
        width: parseInt($(el).attr('width') || '0') || undefined,
        height: parseInt($(el).attr('height') || '0') || undefined,
        suggestedAlt: undefined
      });
    }
  });

  // Extract content with quality metrics
  const paragraphs: string[] = [];
  const sentences: string[] = [];
  let totalContentLength = 0;
  const maxTotalLength = 15000;
  const maxParagraphLength = 1000;

  // Enhanced content extraction for SSR React pages
  // Remove non-content elements more aggressively
  const allTextContent = $('body').clone()
    .find('script, style, nav, header, footer, aside, .menu, .navigation, .sidebar, .comments, noscript, [aria-hidden="true"]')
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  // Enhanced paragraph extraction for modern SSR pages
  // More comprehensive approach - extract text from meaningful containers
  const textExtractionStrategy = [
    // Strategy 1: Traditional semantic elements
    { selector: 'p', priority: 1, name: 'traditional_paragraphs' },
    
    // Strategy 2: Main content areas
    { selector: 'main p, article p, section p', priority: 1, name: 'semantic_paragraphs' },
    
    // Strategy 3: Text utility classes (Tailwind/modern CSS frameworks)
    { selector: '[class*="text-lg"]:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6)', priority: 2, name: 'large_text' },
    { selector: '[class*="text-base"]:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6)', priority: 2, name: 'base_text' },
    { selector: '[class*="text-muted"]:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6)', priority: 2, name: 'muted_text' },
    
    // Strategy 4: Content containers
    { selector: '[class*="prose"] div, [class*="content"] div', priority: 3, name: 'content_containers' },
    { selector: '[class*="description"]:not(meta)', priority: 3, name: 'descriptions' },
    { selector: '[class*="lead"]:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6)', priority: 3, name: 'lead_text' },
    
    // Strategy 5: Generic text containers (last resort)
    { selector: 'div:not(:has(div)):not(:has(section)):not(:has(article))', priority: 4, name: 'leaf_divs' }
  ];

  const extractedTexts = new Set(); // Track extracted text to avoid duplicates
  
  textExtractionStrategy.forEach(strategy => {
    if (totalContentLength >= maxTotalLength) return;
    
    $(strategy.selector).each((_, el) => {
      if (totalContentLength >= maxTotalLength) return false;
      
      const $el = $(el);
      
      // Get direct text content (not including nested elements for some strategies)
      let elementText = '';
      
      if (strategy.priority <= 2) {
        // For high-priority strategies, get all text content
        elementText = $el.text().trim();
      } else {
        // For lower-priority strategies, be more selective
        // Get direct text content and immediate children text
        elementText = $el.contents()
          .filter(function() {
            return this.nodeType === 3 || // Text nodes
                   (this.nodeType === 1 && $(this).is('span, strong, em, b, i, a:not(:has(div)):not(:has(p))')); // Simple inline elements
          })
          .text()
          .trim();
      }
      
      // Skip if no meaningful text
      if (!elementText || elementText.length < 15) return;
      
      // Skip navigation, menu, and UI elements
      if (elementText.match(/^(menu|nav|navigation|header|footer|sidebar|cookie|privacy|terms|login|signup|register|cart|search|home|about|contact|back to top|skip to|toggle|close|open)$/i)) return;
      
      // Skip if text is very short phrases that are likely UI elements
      if (elementText.length < 30 && elementText.split(' ').length < 5) return;
      
      // Skip if we've already extracted this exact text
      if (extractedTexts.has(elementText)) return;
      
      // Skip if this text is contained within already extracted text
      let isDuplicate = false;
      for (const existing of extractedTexts) {
        if (existing.includes(elementText) || elementText.includes(existing)) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) return;
      
      // Additional filtering for lower priority extractions
      if (strategy.priority >= 3) {
        // Skip if element has many child elements (likely a container)
        const childElementCount = $el.children().length;
        if (childElementCount > 3) return;
        
        // Skip if text seems to be a title or heading based on length and caps
        if (elementText.length < 100 && elementText.toUpperCase() === elementText) return;
        
        // Skip if it looks like a button or link text
        if (elementText.match(/^(click|read more|learn more|get started|sign up|download|buy now|order now|contact us|call now)$/i)) return;
      }
      
      // Extract sentences for readability analysis
      const elementSentences = elementText.match(/[^\.!?]+[\.!?]+/g) || [];
      if (elementSentences.length > 0) {
        sentences.push(...elementSentences.map(s => s.trim()));
      } else if (elementText.length > 50) {
        // If no proper sentences, treat the whole text as one sentence for analysis
        sentences.push(elementText);
      }
      
      // Truncate if too long
      let finalText = elementText;
      if (finalText.length > maxParagraphLength) {
        finalText = finalText.substring(0, maxParagraphLength) + '...';
      }
      
      // Add to paragraphs if within limits
      if (totalContentLength + finalText.length <= maxTotalLength) {
        paragraphs.push(finalText);
        extractedTexts.add(elementText);
        totalContentLength += finalText.length;
        
        console.log(`[Content Extraction] Found ${finalText.length} chars via ${strategy.name}: "${finalText.substring(0, 50)}..."`);
      } else {
        const remainingLength = maxTotalLength - totalContentLength;
        if (remainingLength > 50) { // Only add if we have meaningful space left
          const truncated = finalText.substring(0, remainingLength) + '...';
          paragraphs.push(truncated);
          extractedTexts.add(elementText);
          totalContentLength += truncated.length;
          console.log(`[Content Extraction] Added truncated ${truncated.length} chars via ${strategy.name}`);
        }
        return false;
      }
    });
  });
  
  // Fallback: If still no meaningful content, try a more aggressive approach
  if (paragraphs.length === 0 || totalContentLength < 100) {
    console.log(`[Content Extraction] Fallback mode - trying aggressive extraction`);
    
    // Remove common non-content elements and extract all remaining text
    const cleanedBody = $('body').clone();
    cleanedBody.find('script, style, nav, header, footer, aside, noscript, [aria-hidden="true"], .menu, .navigation, .sidebar, .comments, .cookie, .popup, .modal').remove();
    
    const fallbackText = cleanedBody.text().replace(/\s+/g, ' ').trim();
    
    if (fallbackText.length > 100) {
      // Split into sentences and take meaningful chunks
      const fallbackSentences = fallbackText.match(/[^\.!?]+[\.!?]+/g) || [];
      
      if (fallbackSentences.length > 0) {
        let fallbackContent = '';
        for (const sentence of fallbackSentences) {
          const cleanSentence = sentence.trim();
          if (cleanSentence.length > 20 && fallbackContent.length + cleanSentence.length < maxTotalLength) {
            fallbackContent += cleanSentence + ' ';
            sentences.push(cleanSentence);
          }
        }
        
        if (fallbackContent.trim().length > 100) {
          paragraphs.push(fallbackContent.trim());
          totalContentLength = fallbackContent.length;
          console.log(`[Content Extraction] Fallback extracted ${fallbackContent.length} chars`);
        }
      }
    }
  }
  
  console.log(`[Content Extraction] Final stats: ${paragraphs.length} paragraphs, ${totalContentLength} total chars, ${sentences.length} sentences`);

  return {
    headings,
    images,
    paragraphs,
    sentences,
    allTextContent
  };
}

/**
 * Extract link structure for analysis
 */
function extractLinkElements($: cheerio.CheerioAPI, url: string, settings: any) {
  const internalLinks: Array<{ href: string; text: string; title?: string }> = [];
  const externalLinks: Array<{ href: string; text: string; title?: string }> = [];

  if (settings.analyzeLinkStructure) {
    const urlObj = new URL(url);
    const baseDomain = urlObj.hostname;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const linkText = $(el).text().trim();
      const title = $(el).attr('title');

      if (href && linkText) {
        try {
          let fullUrl: string;
          let isInternal = false;

          if (href.startsWith('http')) {
            const linkUrlObj = new URL(href);
            isInternal = linkUrlObj.hostname === baseDomain;
            fullUrl = href;
          } else if (href.startsWith('/') || !href.includes('://')) {
            // Relative URL - make it absolute and mark as internal
            fullUrl = new URL(href, url).toString();
            isInternal = true;
          } else {
            return; // Skip other protocols
          }

          // Skip anchor links to the same page
          if (isInternal) {
            const linkUrl = new URL(fullUrl);
            if (linkUrl.pathname === urlObj.pathname && linkUrl.search === urlObj.search) {
              return;
            }

            internalLinks.push({
              href: fullUrl,
              text: linkText,
              title: title || undefined
            });
          } else if (settings.followExternalLinks) {
            externalLinks.push({
              href: fullUrl,
              text: linkText,
              title: title || undefined
            });
          }
        } catch (error) {
          console.warn(`Skipping malformed URL: ${href} on page ${url}`);
        }
      }
    });
  }

  return {
    internalLinks,
    externalLinks
  };
}

/**
 * Extract CTA elements from page
 */
function extractCtaElements($: cheerio.CheerioAPI, url: string) {
  const ctaElements: Array<{
    type: string;
    text: string;
    element: string;
    attributes: Record<string, string>;
  }> = [];

  console.log(`Analyzing CTAs for ${url}`);

  // Extract button links
  $('a').each((_, el) => {
    const classes = $(el).attr('class') || '';
    const href = $(el).attr('href') || '';
    const linkText = $(el).text().trim();
    const role = $(el).attr('role') || '';

    const hasButtonClass = classes.includes('button') || role === 'button';

    if (hasButtonClass && linkText) {
      ctaElements.push({
        type: 'link_button',
        text: linkText,
        element: 'a',
        attributes: {
          href: href,
          class: classes,
          role: role
        }
      });
    }
  });

  // Extract regular buttons
  $('button').each((_, el) => {
    const buttonText = $(el).text().trim();
    const type = $(el).attr('type') || 'button';
    const classes = $(el).attr('class') || '';

    ctaElements.push({
      type: 'button',
      text: buttonText,
      element: 'button',
      attributes: {
        type: type,
        class: classes
      }
    });
  });

  // Extract input buttons
  $('input').each((_, el) => {
    const type = $(el).attr('type') || '';
    if (type === 'submit' || type === 'button' || type === 'image') {
      const buttonText = $(el).val()?.toString().trim() || $(el).attr('value') || $(el).attr('alt') || '';
      const classes = $(el).attr('class') || '';

      ctaElements.push({
        type: 'input_button',
        text: buttonText,
        element: 'input',
        attributes: {
          type: type,
          class: classes
        }
      });
    }
  });

  console.log(`Found ${ctaElements.length} CTA elements on ${url}`);
  return ctaElements;
}

/**
 * Extract card elements from modern component-based layouts
 */
function extractCardElements($: cheerio.CheerioAPI, url: string) {
  const cardElements: Array<{
    type: string;
    title: string;
    content: string;
    classes: string;
    hasImage: boolean;
    hasCTA: boolean;
  }> = [];

  console.log(`Analyzing card elements for ${url}`);

  // Enhanced card selectors for modern UI frameworks and SSR React components
  const cardSelectors = [
    '.card', // Traditional card class
    '[class*="card"]', // Any class containing "card"
    '[class*="rounded-lg"][class*="bg-card"]', // Tailwind card pattern
    '[class*="rounded-lg"][class*="shadow"]', // Rounded with shadow
    '[class*="border"][class*="rounded"]', // Bordered rounded containers
    '[class*="bg-card"][class*="text-card-foreground"]', // Tailwind card with foreground
    '[class*="rounded"][class*="border-0"][class*="shadow"]', // Borderless rounded with shadow
    '[data-card]', // Data attribute cards
    '[role="article"]', // Semantic article cards
    '.grid > div[class*="rounded"]', // Grid items with rounded borders
    '.flex > div[class*="shadow"]', // Flex items with shadows
    'article', // Semantic articles
    'section[class*="rounded"]', // Rounded sections
    'div[class*="hover:shadow"]' // Elements with hover shadow effects
  ];

  cardSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const $el = $(el);
      const classes = $el.attr('class') || '';

      // Skip if this element is nested inside another card
      if ($el.closest('.card, [class*="card"]').length > 1) return;

      // Look for card-like styling patterns
      const hasCardStyling = 
        classes.includes('card') ||
        classes.includes('shadow') ||
        (classes.includes('border') && classes.includes('rounded')) ||
        classes.includes('bg-card') ||
        $el.attr('data-card') !== undefined;

      if (!hasCardStyling && selector !== '[role="article"]') return;

      // Extract card content
      const title = $el.find('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]').first().text().trim();
      const contentText = $el.text().trim();

      // Skip if content is too short (likely not a meaningful card)
      if (contentText.length < 20) return;

      // Skip if content is too long (likely a page section, not a card)
      if (contentText.length > 500) return;

      const hasImage = $el.find('img, [role="img"], picture').length > 0;
      const hasCTA = $el.find('a, button, [role="button"], [class*="btn"], [class*="button"]').length > 0;

      cardElements.push({
        type: 'component_card',
        title: title || 'Untitled Card',
        content: contentText.substring(0, 200) + (contentText.length > 200 ? '...' : ''),
        classes: classes,
        hasImage: hasImage,
        hasCTA: hasCTA
      });
    });
  });

  console.log(`Found ${cardElements.length} card elements on ${url}`);
  return cardElements;
}


/**
 * Analyze content quality metrics
 */
function analyzeContentQuality(contentElements: any) {
  const { paragraphs, sentences, headings, allTextContent } = contentElements;

  // Calculate word count
  const wordCount = allTextContent.split(/\s+/).filter((word: string) => word.length > 0).length;

  // Calculate readability score
  const readabilityScore = calculateReadabilityScore(sentences);

  // Extract keyword density
  const keywordDensity = extractKeywordDensity(allTextContent);

  // Calculate content depth
  const contentDepth = calculateContentDepth(paragraphs, headings);

  // Extract semantic keywords
  const semanticKeywords = extractSemanticKeywords(allTextContent);

  return {
    wordCount,
    readabilityScore,
    keywordDensity,
    contentDepth,
    semanticKeywords
  };
}

/**
 * Detect SEO issues on the page
 */
async function detectSeoIssues(
  basicElements: any,
  contentElements: any,
  contentQuality: any
): Promise<SeoIssue[]> {

  const issues: SeoIssue[] = [];
  const { title, metaDescription, headings, images, metaTags, robotsMeta, canonical, hasJsonLd, structuredData } = { ...basicElements, ...contentElements };

  // Title analysis
  if (!title || title.length === 0) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'critical',
      title: 'Missing Title Tag',
      description: 'This page is missing a title tag, which is crucial for SEO.'
    });
  } else if (title.length < 30) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Short Title Tag',
      description: `Title tag is only ${title.length} characters long.`
    });
  } else if (title.length > 60) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Long Title Tag',
      description: `Title tag is ${title.length} characters long and may be truncated.`
    });
  }

  // Meta description analysis
  if (!metaDescription) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Missing Meta Description',
      description: 'This page is missing a meta description.'
    });
  } else if (metaDescription.length < 120) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'info',
      title: 'Short Meta Description',
      description: `Meta description is only ${metaDescription.length} characters long.`
    });
  } else if (metaDescription.length > 160) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Long Meta Description',
      description: `Meta description is ${metaDescription.length} characters long.`
    });
  }

  // Heading analysis
  const h1Count = headings.filter((h: any) => h.level === 1).length;
  if (h1Count === 0) {
    issues.push({
      category: 'headings' as SeoCategory,
      severity: 'critical',
      title: 'Missing H1 Tag',
      description: 'This page is missing an H1 heading tag.'
    });
  } else if (h1Count > 1) {
    issues.push({
      category: 'headings' as SeoCategory,
      severity: 'warning',
      title: 'Multiple H1 Tags',
      description: `Found ${h1Count} H1 tags on this page.`
    });
  }

  // Image analysis
  const imagesWithoutAlt = images.filter((img: any) => !img.alt);
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      category: 'images' as SeoCategory,
      severity: 'warning',
      title: 'Images Without Alt Text',
      description: `${imagesWithoutAlt.length} images are missing alt text.`
    });
  }

  // Content quality issues
  if (contentQuality.wordCount < 300) {
    issues.push({
      category: 'content' as SeoCategory,
      severity: 'warning',
      title: 'Low Content Volume',
      description: `Page has only ${contentQuality.wordCount} words.`
    });
  }

  // JSON-LD analysis
  if (!hasJsonLd) {
    issues.push({
      category: 'structured-data' as SeoCategory,
      severity: 'warning',
      title: 'Missing JSON-LD',
      description: 'This page does not have JSON-LD structured data, which can improve search engine understanding.'
    });
  } else if (structuredData && structuredData.length > 0) {
    const hasOrganizationSchema = structuredData.some(data => data['@type'] === 'Organization');
    const hasLocalBusinessSchema = structuredData.some(data => Array.isArray(data['@type']) ? data['@type'].includes('LocalBusiness') : data['@type'] === 'LocalBusiness');
    const hasProductSchema = structuredData.some(data => data['@type'] === 'Product');

    if (!hasOrganizationSchema && !hasLocalBusinessSchema && !hasProductSchema) {
      issues.push({
        category: 'structured-data' as SeoCategory,
        severity: 'info',
        title: 'JSON-LD Schema Type Not Recognized',
        description: 'The detected JSON-LD schema type is not one of the commonly recognized types (Organization, LocalBusiness, Product).'
      });
    }
  }

  return issues;
}

// Helper functions for content analysis
function calculateReadabilityScore(sentences: string[]): number {
  if (sentences.length === 0) return 0;

  const totalWords = sentences.reduce((count, sentence) => {
    return count + sentence.split(/\s+/).filter(word => word.length > 0).length;
  }, 0);

  const totalSyllables = sentences.reduce((count, sentence) => {
    const words = sentence.split(/\s+/).filter(word => word.length > 0);
    return count + words.reduce((syllableCount, word: string) => {
      return syllableCount + countSyllables(word);
    }, 0);
  }, 0);

  const avgWordsPerSentence = totalWords / sentences.length;
  const avgSyllablesPerWord = totalSyllables / totalWords;
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

  return Math.max(0, Math.min(100, score));
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;

  const vowels = 'aeiouy';
  let syllableCount = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      syllableCount++;
    }
    previousWasVowel = isVowel;
  }

  if (word.endsWith('e') && syllableCount > 1) {
    syllableCount--;
  }

  return Math.max(1, syllableCount);
}

function extractKeywordDensity(content: string): Array<{keyword: string, count: number, density: number}> {
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);

  const totalWords = words.length;
  const wordCount = new Map<string, number>();

  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });

  return Array.from(wordCount.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: (count / totalWords) * 100
    }))
    .filter(item => item.count >= 3)
    .sort((a, b) => b.density - a.density)
    .slice(0, 20);
}

function calculateContentDepth(paragraphs: string[], headings: Heading[]): number {
  let score = 0;

  const totalWords = paragraphs.join(' ').split(/\s+/).length;
  score += Math.min(50, totalWords / 20);

  const h1Count = headings.filter(h => h.level === 1).length;
  const h2Count = headings.filter(h => h.level === 2).length;
  const h3Count = headings.filter(h => h.level === 3).length;

  score += Math.min(20, h2Count * 3);
  score += Math.min(15, h3Count * 2);
  score += h1Count === 1 ? 10 : 0;

  const avgParagraphLength = paragraphs.length > 0 ? 
    totalWords / paragraphs.length : 0;

  if (avgParagraphLength > 20 && avgParagraphLength < 80) {
    score += 15;
  }

  return Math.min(100, score);
}

function extractSemanticKeywords(content: string): string[] {
  const text = content.toLowerCase();
  const words = text.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(word => word.length > 2);
  const phrases = new Map<string, number>();

  // Extract 2-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
  }

  // Extract 3-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
  }

  return Array.from(phrases.entries())
    .filter(([phrase, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([phrase]) => phrase);
}