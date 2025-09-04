import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseSitemap } from './sitemap';
import { crawlWebsite } from './crawler';
import { generateBatchImageAltText } from './analysis-pipeline/image-alt-text';
import { storage } from './storage';
import { EventEmitter } from 'events';
import { Heading, Image, SeoIssue, SeoCategory, ContentRepetitionAnalysis } from '../client/src/lib/types';

// Content quality analysis helper functions
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

  // Simplified Flesch Reading Ease Score
  const avgWordsPerSentence = totalWords / sentences.length;
  const avgSyllablesPerWord = totalSyllables / totalWords;

  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, score));
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function extractSemanticKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 4);

  // Use simple bigrams as semantic phrases
  const phrases = new Map();
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
  }

  return Array.from(phrases.entries())
    .filter(([phrase, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([phrase]) => phrase);
}

// Extend the Image interface to include suggestedAlt
interface AnalysisImage extends Image {
  suggestedAlt?: string;
}

// Store ongoing analyses to allow cancellation
const ongoingAnalyses = new Map();

/**
 * Analyze a single page for SEO elements
 * @param url Page URL to analyze
 * @param settings Analysis settings
 * @param signal AbortSignal for cancellation
 * @param isCompetitor Whether this is a competitor analysis (to skip alt text generation)
 */
export async function analyzePage(url: string, settings: any, signal: AbortSignal, isCompetitor: boolean = false, analyzedPages: any[], additionalInfo?: string, savedSiteOverview?: any) {
  try {
    // Fetch page content
    const response = await axios.get(url, {
      signal,
      headers: {
        'User-Agent': 'SEO-Optimizer-Bot/1.0 (+https://seooptimizer.com/bot)',
      },
      timeout: 15000 // 15-second timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Check for noindex or nofollow in meta robots
    const metaRobots = $('meta[name="robots"], meta[name="googlebot"]').attr('content');
    const hasNoindex = metaRobots && metaRobots.toLowerCase().includes('noindex');
    const hasNofollow = metaRobots && metaRobots.toLowerCase().includes('nofollow');

    // If the page has noindex, skip it entirely from crawling output
    if (hasNoindex) {
      console.log(`Skipping page with noindex directive: ${url}`);
      return;
    }

    // Extract basic SEO elements
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || null;
    const metaKeywords = $('meta[name="keywords"]').attr('content') || null;
    const metaKeywordsArray = metaKeywords ? metaKeywords.split(',').map(k => k.trim()) : null;
    const canonical = $('link[rel="canonical"]').attr('href') || null;
    const robotsMeta = $('meta[name="robots"]').attr('content') || null;

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

    // Extract internal links (if link structure analysis is enabled)
    const internalLinks: { href: string; text: string; title?: string }[] = [];
    if (settings.analyzeLinkStructure) {
      const urlObj = new URL(url);
      const baseDomain = urlObj.hostname;

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const linkText = $(el).text().trim();
        const title = $(el).attr('title');

        if (href && linkText) {
          try {
            // Handle relative URLs and internal links
            let fullUrl: string;
            if (href.startsWith('http')) {
              const linkUrlObj = new URL(href);
              // Only include links to the same domain
              if (linkUrlObj.hostname === baseDomain) {
                fullUrl = href;
              } else {
                return; // Skip external links
              }
            } else if (href.startsWith('/') || !href.includes('://')) {
              // Relative URL - make it absolute
              fullUrl = new URL(href, url).toString();
            } else {
              return; // Skip other protocols (mailto:, tel:, etc.)
            }

            // Skip anchor links to the same page
            const linkUrl = new URL(fullUrl);
            if (linkUrl.pathname === urlObj.pathname && linkUrl.search === urlObj.search) {
              return;
            }

            internalLinks.push({
              href: fullUrl,
              text: linkText,
              title: title || undefined
            });
          } catch (error) {
            // Skip malformed URLs
            console.warn(`Skipping malformed URL: ${href} on page ${url}`);
          }
        }
      });
    }

    // Extract external links
    const externalLinks: { href: string; text: string; title?: string }[] = [];
    if (settings.followExternalLinks) {
      const urlObj = new URL(url);
      const baseDomain = urlObj.hostname;

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const linkText = $(el).text().trim();
        const title = $(el).attr('title');

        if (href && linkText && href.startsWith('http')) {
          try {
            const linkUrlObj = new URL(href);
            // Only include external links (different domain)
            if (linkUrlObj.hostname !== baseDomain) {
              externalLinks.push({
                href: href,
                text: linkText,
                title: title || undefined
              });
            }
          } catch (error) {
            // Skip malformed URLs
            console.warn(`Skipping malformed external URL: ${href} on page ${url}`);
          }
        }
      });
    }

    // Extract paragraphs for content analysis
    const paragraphs: string[] = [];
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) { // Only include substantial paragraphs
        paragraphs.push(text);
      }
    });

    // Analyze page structure for CTA elements
    const ctaElements: Array<{ type: string; text: string; }> = [];
    
    // Find button elements
    $('button').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        ctaElements.push({ type: 'button', text });
      }
    });

    // Find input buttons (submit, button types)
    $('input[type="submit"], input[type="button"]').each((_, el) => {
      const value = $(el).attr('value') || $(el).text().trim();
      if (value) {
        ctaElements.push({ type: 'input_button', text: value });
      }
    });

    // Find button-like links (common CTA patterns)
    $('a').each((_, el) => {
      const $link = $(el);
      const text = $link.text().trim();
      const className = $link.attr('class') || '';
      const href = $link.attr('href') || '';

      // Check for button-like styling or common CTA text patterns
      if (text && (
        className.toLowerCase().includes('btn') ||
        className.toLowerCase().includes('button') ||
        className.toLowerCase().includes('cta') ||
        text.toLowerCase().includes('contact') ||
        text.toLowerCase().includes('get started') ||
        text.toLowerCase().includes('sign up') ||
        text.toLowerCase().includes('buy now') ||
        text.toLowerCase().includes('learn more') ||
        href.includes('contact') ||
        href.includes('#contact')
      )) {
        ctaElements.push({ type: 'link_button', text });
      }
    });

    // Find forms (general CTA elements)
    $('form').each((_, el) => {
      const $form = $(el);
      const action = $form.attr('action') || '';
      const method = $form.attr('method') || 'GET';
      const inputs = $form.find('input').length;
      
      if (inputs > 0) {
        ctaElements.push({ 
          type: 'form', 
          text: `${method.toUpperCase()} form with ${inputs} input${inputs !== 1 ? 's' : ''} (${action || 'no action'})` 
        });
      }
    });

    // Check if page is canonical
    const isCanonical = !canonical || canonical === url;

    // Word count calculation
    const textContent = paragraphs.join(' ');
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

    // Sentence analysis for readability  
    const sentences = textContent.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    const readabilityScore = calculateReadabilityScore(sentences);

    // Enhanced content metrics
    const contentMetrics = {
      wordCount,
      readabilityScore,
      averageWordsPerSentence: sentences.length > 0 ? Math.round(wordCount / sentences.length) : 0,
      contentDepthScore: Math.min(100, Math.round((wordCount / 500) * 100)), // 500 words = 100% depth score
      keywordDensity: [], // Will be populated with keyword analysis
      semanticKeywords: extractSemanticKeywords(textContent)
    };

    // Analyze SEO issues
    const issues: SeoIssue[] = [];

    // Title issues
    if (!title) {
      issues.push({ 
        title: 'Missing page title', 
        description: 'Every page should have a unique, descriptive title tag.', 
        severity: 'critical',
        category: 'title'
      });
    } else if (title.length < 30) {
      issues.push({ 
        title: 'Title too short', 
        description: `Title is only ${title.length} characters. Aim for 30-60 characters.`, 
        severity: 'warning',
        category: 'title'
      });
    } else if (title.length > 60) {
      issues.push({ 
        title: 'Title too long', 
        description: `Title is ${title.length} characters. Keep it under 60 characters to avoid truncation.`, 
        severity: 'warning',
        category: 'title'
      });
    }

    // Meta description issues
    if (!metaDescription) {
      issues.push({ 
        title: 'Missing meta description', 
        description: 'Meta descriptions help users understand your page content in search results.', 
        severity: 'warning',
        category: 'meta'
      });
    } else if (metaDescription.length < 120) {
      issues.push({ 
        title: 'Meta description too short', 
        description: `Meta description is only ${metaDescription.length} characters. Aim for 120-160 characters.`, 
        severity: 'info',
        category: 'meta'
      });
    } else if (metaDescription.length > 160) {
      issues.push({ 
        title: 'Meta description too long', 
        description: `Meta description is ${metaDescription.length} characters. Keep it under 160 characters.`, 
        severity: 'warning',
        category: 'meta'
      });
    }

    // Heading structure issues
    const h1s = headings.filter(h => h.level === 1);
    if (h1s.length === 0) {
      issues.push({ 
        title: 'Missing H1 heading', 
        description: 'Every page should have exactly one H1 heading.', 
        severity: 'critical',
        category: 'headings'
      });
    } else if (h1s.length > 1) {
      issues.push({ 
        title: 'Multiple H1 headings', 
        description: `Found ${h1s.length} H1 headings. Use only one H1 per page.`, 
        severity: 'warning',
        category: 'headings'
      });
    }

    // Image optimization issues
    const imagesWithoutAlt = images.filter(img => !img.alt);
    if (imagesWithoutAlt.length > 0) {
      issues.push({ 
        title: 'Images missing alt text', 
        description: `${imagesWithoutAlt.length} of ${images.length} images are missing alt text for accessibility.`, 
        severity: 'warning',
        category: 'images'
      });
    }

    // Content issues
    if (wordCount < 300) {
      issues.push({ 
        title: 'Thin content', 
        description: `Page has only ${wordCount} words. Aim for at least 300 words for better SEO.`, 
        severity: 'warning',
        category: 'content'
      });
    }

    if (readabilityScore < 60) {
      issues.push({ 
        title: 'Poor readability', 
        description: `Readability score is ${Math.round(readabilityScore)}/100. Consider using shorter sentences and simpler words.`, 
        severity: 'info',
        category: 'content'
      });
    }

    return {
      url,
      title,
      metaDescription,
      metaKeywords: metaKeywordsArray,
      canonical,
      robotsMeta,
      headings,
      images,
      internalLinks,
      externalLinks,
      paragraphs,
      ctaElements,
      wordCount,
      isCanonical,
      issues,
      contentMetrics,
      hasNofollow,
      suggestions: [] // Will be populated later if AI is enabled
    };

  } catch (error) {
    console.error(`Error analyzing page ${url}:`, error);
    throw error;
  }
}

/**
 * Cancel an ongoing analysis
 * @param domain Domain name of the analysis to cancel
 */
export function cancelAnalysis(domain: string): boolean {
  const controller = ongoingAnalyses.get(domain);
  if (controller) {
    controller.abort();
    ongoingAnalyses.delete(domain);
    return true;
  }
  return false;
}