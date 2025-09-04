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
}

/**
 * Analyze pages in batches with enhanced progress tracking
 */
export async function analyzePagesBatch(
  context: AnalysisContext,
  pages: string[],
  options: AnalysisOptions
): Promise<PageAnalysisResult[]> {
  
  const analyzedPages: PageAnalysisResult[] = [];
  const totalPages = pages.length;
  const concurrencyLimit = 3; // Process 3 pages concurrently

  console.log(`Analyzing ${pages.length} pages for ${context.domain}`);

  // Process pages in batches with the concurrency limit
  for (let i = 0; i < totalPages; i += concurrencyLimit) {
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

    const batch = pages.slice(i, i + concurrencyLimit);
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
    emitProgress(context, totalPages, analyzedPages);

    // Add delay between batches if more batches remain and we haven't hit the quota
    const hasMorePages = i + concurrencyLimit < totalPages;
    const withinQuota = !context.userId || analyzedPages.length < context.remainingQuota;
    
    if (hasMorePages && withinQuota) {
      await new Promise(resolve => setTimeout(resolve, context.settings.crawlDelay));
    }
  }

  console.log(`Completed page analysis: ${analyzedPages.length}/${totalPages} pages analyzed`);
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
    
    // Analyze content quality
    const contentQuality = analyzeContentQuality(contentElements);
    
    // Detect SEO issues
    const issues = await detectSeoIssues(basicElements, contentElements, contentQuality);
    
    // Generate alt text for images if AI is enabled
    let processedImages = contentElements.images;
    
    // Debug logs to verify options
    console.log(`Alt text generation conditions for ${url}:`);
    console.log(`- useAI: ${options?.useAI}`);
    console.log(`- skipAltTextGeneration: ${options?.skipAltTextGeneration}`);
    console.log(`- isCompetitor: ${isCompetitor}`);
    console.log(`- Total images: ${contentElements.images.length}`);
    console.log(`- Images without alt: ${contentElements.images.filter(img => !img.alt).length}`);
    
    // Enhanced logging for each image
    console.log('Detailed image analysis:');
    contentElements.images.forEach((img, index) => {
      const altStatus = img.alt ? 'HAS_ALT' : (img.alt === '' ? 'EMPTY_ALT' : 'NO_ALT');
      const urlType = img.src.startsWith('data:') ? 'DATA_URI' : 
                      img.src.startsWith('http') ? 'HTTP_URL' : 'RELATIVE_URL';
      console.log(`  Image ${index + 1}: ${altStatus} | ${urlType} | ${img.src.substring(0, 80)}...`);
    });
    
    if (options?.useAI && !options?.skipAltTextGeneration && !isCompetitor) {
      // Filter out images without alt text AND filter out invalid image sources
      const imagesWithoutAlt = contentElements.images.filter(img => {
        // Check if image has meaningful alt text
        const hasAlt = img.alt && img.alt.trim().length > 0;
        if (hasAlt) {
          console.log(`Skipping image with alt text: "${img.alt}" | ${img.src.substring(0, 80)}...`);
          return false;
        }
        
        // Skip data URIs, SVG placeholders, and invalid URLs
        if (img.src.startsWith('data:') || 
            img.src.includes('placeholder') || 
            img.src.includes('%3Csvg') ||
            !img.src.startsWith('http')) {
          console.log(`Skipping invalid image URL for alt text: ${img.src.substring(0, 100)}...`);
          return false;
        }
        
        console.log(`Valid image for alt text generation: ${img.src.substring(0, 100)}...`);
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
            businessType: undefined, // Could be enhanced with business context
            industry: undefined       // Could be enhanced with industry context
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
  const title = $('title').text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || null;
  const metaKeywords = $('meta[name="keywords"]').attr('content') || null;
  const metaKeywordsArray = metaKeywords ? metaKeywords.split(',').map(k => k.trim()) : null;
  const canonical = $('link[rel="canonical"]').attr('href') || null;
  const robotsMeta = $('meta[name="robots"]').attr('content') || null;

  return {
    title,
    metaDescription,
    metaKeywords,
    metaKeywordsArray,
    canonical,
    robotsMeta
  };
}

/**
 * Extract content elements and analyze quality
 */
function extractContentElements($: cheerio.CheerioAPI, url: string, settings: any) {
  // Extract headings
  const headings: Heading[] = [];
  for (let i = 1; i <= 6; i++) {
    $(`h${i}`).each((_, el) => {
      headings.push({
        level: i,
        text: $(el).text().trim()
      });
    });
  }

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

  // Extract all text content for comprehensive analysis
  const allTextContent = $('body').clone()
    .find('script, style, nav, header, footer, aside, .menu, .navigation')
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  // Extract paragraphs with enhanced metadata
  $('p').each((_, el) => {
    if (totalContentLength >= maxTotalLength) {
      return false;
    }

    let paragraphText = $(el).text().trim();
    if (paragraphText.length > 0) {
      // Extract sentences from paragraph
      const paragraphSentences = paragraphText.match(/[^\.!?]+[\.!?]+/g) || [];
      sentences.push(...paragraphSentences.map(s => s.trim()));

      if (paragraphText.length > maxParagraphLength) {
        paragraphText = paragraphText.substring(0, maxParagraphLength) + '...';
      }

      if (totalContentLength + paragraphText.length <= maxTotalLength) {
        paragraphs.push(paragraphText);
        totalContentLength += paragraphText.length;
      } else {
        const remainingLength = maxTotalLength - totalContentLength;
        if (remainingLength > 0) {
          paragraphs.push(paragraphText.substring(0, remainingLength) + '...');
        }
        return false;
      }
    }
  });

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
 * Analyze content quality metrics
 */
function analyzeContentQuality(contentElements: any) {
  const { paragraphs, sentences, headings, allTextContent } = contentElements;
  
  // Calculate word count
  const wordCount = allTextContent.split(/\s+/).filter(word => word.length > 0).length;
  
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
  const { title, metaDescription, headings, images } = { ...basicElements, ...contentElements };

  // Title analysis
  if (!title || title.length === 0) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'critical',
      title: 'Missing Title Tag',
      description: 'This page is missing a title tag, which is crucial for SEO.',
      element: 'title',
      recommendation: 'Add a descriptive title tag (50-60 characters) that includes your target keyword.'
    });
  } else if (title.length < 30) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Short Title Tag',
      description: `Title tag is only ${title.length} characters long.`,
      element: 'title',
      recommendation: 'Expand title to 30-60 characters for better SEO impact.'
    });
  } else if (title.length > 60) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Long Title Tag',
      description: `Title tag is ${title.length} characters long and may be truncated.`,
      element: 'title',
      recommendation: 'Shorten title to 50-60 characters to avoid truncation in search results.'
    });
  }

  // Meta description analysis
  if (!metaDescription) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Missing Meta Description',
      description: 'This page is missing a meta description.',
      element: 'meta[name="description"]',
      recommendation: 'Add a compelling meta description (150-160 characters) to improve click-through rates.'
    });
  } else if (metaDescription.length < 120) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'info',
      title: 'Short Meta Description',
      description: `Meta description is only ${metaDescription.length} characters long.`,
      element: 'meta[name="description"]',
      recommendation: 'Expand to 150-160 characters to utilize more space in search results.'
    });
  } else if (metaDescription.length > 160) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Long Meta Description',
      description: `Meta description is ${metaDescription.length} characters long.`,
      element: 'meta[name="description"]',
      recommendation: 'Shorten to 150-160 characters to avoid truncation in search results.'
    });
  }

  // Heading analysis
  const h1Count = headings.filter((h: any) => h.level === 1).length;
  if (h1Count === 0) {
    issues.push({
      category: 'headings' as SeoCategory,
      severity: 'critical',
      title: 'Missing H1 Tag',
      description: 'This page is missing an H1 heading tag.',
      element: 'h1',
      recommendation: 'Add a descriptive H1 tag that summarizes the page content.'
    });
  } else if (h1Count > 1) {
    issues.push({
      category: 'headings' as SeoCategory,
      severity: 'warning',
      title: 'Multiple H1 Tags',
      description: `Found ${h1Count} H1 tags on this page.`,
      element: 'h1',
      recommendation: 'Use only one H1 tag per page and use H2-H6 for subheadings.'
    });
  }

  // Image analysis
  const imagesWithoutAlt = images.filter((img: any) => !img.alt);
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      category: 'images' as SeoCategory,
      severity: 'warning',
      title: 'Images Without Alt Text',
      description: `${imagesWithoutAlt.length} images are missing alt text.`,
      element: 'img',
      recommendation: 'Add descriptive alt text to all images for better accessibility and SEO.'
    });
  }

  // Content quality issues
  if (contentQuality.wordCount < 300) {
    issues.push({
      category: 'content' as SeoCategory,
      severity: 'warning',
      title: 'Low Content Volume',
      description: `Page has only ${contentQuality.wordCount} words.`,
      element: 'content',
      recommendation: 'Add more valuable content (aim for 300+ words) to improve SEO performance.'
    });
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
    return count + words.reduce((syllableCount, word) => {
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