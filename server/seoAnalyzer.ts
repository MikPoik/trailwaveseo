import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseSitemap } from './sitemap';
import { crawlWebsite } from './crawler';
import { generateBatchImageAltText } from './analysis-pipeline/image-alt-text';
import { storage } from './storage';
import { EventEmitter } from 'events';
import { Heading, Image, SeoIssue, SeoCategory, ContentRepetitionAnalysis } from '../client/src/lib/types';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Content quality analysis helper functions
async function calculateReadabilityScore(text: string, language?: string): Promise<number> {
  if (!text || text.trim().length === 0) return 0;

  // For very short text, return a reasonable score
  if (text.length < 50) return 75;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a readability expert analyzing text for general audience comprehension. Evaluate the text considering:

1. Sentence length and complexity
2. Word choice and vocabulary difficulty
3. Structure and flow
4. Technical jargon or specialized terms
5. Language-specific reading patterns

Provide a readability score from 0-100 where:
- 90-100: Very easy (5th grade level)
- 80-89: Easy (6th-8th grade level)
- 70-79: Fairly easy (9th-10th grade level)
- 60-69: Standard (11th-12th grade level)
- 50-59: Fairly difficult (College level)
- 30-49: Difficult (Graduate level)
- 0-29: Very difficult (Professional/Academic level)

Respond only with valid JSON containing the score and a brief explanation.`
        },
        {
          role: "user",
          content: `Analyze the readability of this text${language ? ` (language: ${language})` : ''}:\n\n"${text.substring(0, 2000)}"\n\nProvide your analysis in this JSON format:\n{\n  "readabilityScore": <number 0-100>,\n  "explanation": "<brief explanation of why this score was given>"\n}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_completion_tokens: 200
    });

    const content = response.choices[0].message.content;
    if (!content) return 50; // Default score if no response

    const analysis = JSON.parse(content);
    const score = Math.max(0, Math.min(100, Math.round(analysis.readabilityScore || 50)));
    
    console.log(`AI Readability analysis: Score ${score}/100 - ${analysis.explanation}`);
    return score;

  } catch (error) {
    console.error('Error calculating AI readability score:', error);
    // Fallback to simple heuristic
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
    
    // Simple fallback calculation
    if (avgWordsPerSentence <= 15) return 75;
    if (avgWordsPerSentence <= 20) return 65;
    if (avgWordsPerSentence <= 25) return 55;
    return 45;
  }
}

function countSyllables(word: string): number {
  // Remove punctuation and convert to lowercase
  word = word.toLowerCase().replace(/[^a-zäöüßáéíóúàèìòùâêîôûãñç]/gi, '');
  
  if (word.length <= 2) return 1;
  if (word.length <= 4) return Math.max(1, Math.ceil(word.length / 2));
  
  // Language-agnostic approach: count vowel groups
  // Extended vowels for multiple languages (including Nordic, Germanic, Romance)
  const vowels = /[aeiouyäöüáéíóúàèìòùâêîôûãñæø]/gi;
  const vowelMatches = word.match(vowels);
  
  if (!vowelMatches) return 1;
  
  // Count vowel clusters as single syllables
  let syllableCount = 0;
  let prevWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.test(word[i]);
    if (isVowel && !prevWasVowel) {
      syllableCount++;
    }
    prevWasVowel = isVowel;
  }
  
  // Handle silent 'e' in various languages (less aggressive than English-only)
  if (word.endsWith('e') && syllableCount > 1 && !word.match(/[aeiou]e$/i)) {
    syllableCount--;
  }
  
  // Ensure minimum of 1 syllable
  return Math.max(1, syllableCount);
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

function splitIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [];
  
  // Language-agnostic sentence splitting
  // More sophisticated than simple .!? splitting
  
  // First, protect common abbreviations and patterns
  let processedText = text
    .replace(/([A-Z][a-z]{1,3})\./g, '$1DOTPLACEHOLDER') // Dr. Mrs. etc.
    .replace(/(\d+)\./g, '$1DOTPLACEHOLDER') // Numbers like 3.14
    .replace(/([a-zA-Z])\.([a-zA-Z])/g, '$1DOTPLACEHOLDER$2') // a.b patterns
    .replace(/(www\.|http[s]?:\/\/[^\s]+)/g, (match) => match.replace(/\./g, 'DOTPLACEHOLDER')) // URLs
    .replace(/([A-Z]{2,})\./g, '$1DOTPLACEHOLDER') // USA. UK. etc.
    .replace(/\b(vs|etc|e\.g|i\.e|cf|ca|approx)\./gi, '$1DOTPLACEHOLDER'); // Common abbreviations
  
  // Split on sentence endings followed by whitespace and capital letter, or end of string
  const sentences = processedText
    .split(/[.!?]+(?=\s+[A-Z]|\s*$)/)
    .map(sentence => sentence.replace(/DOTPLACEHOLDER/g, '.').trim())
    .filter(sentence => {
      // Filter out very short fragments that aren't real sentences
      const words = sentence.split(/\s+/).filter(w => w.length > 0);
      return words.length >= 3 && sentence.length > 10;
    });
  
  return sentences;
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
    
    // Check for JSON-LD structured data
    const hasJsonLd = $('script[type="application/ld+json"]').length > 0;

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

    // Analyze page structure for CTA elements using enhanced extractor
    const { extractCtaElements } = await import('./analysis-pipeline/extractors/cta-extractor.js');
    const ctaElementsFull = extractCtaElements($, url);
    
    // Convert to simpler format for backward compatibility
    const ctaElements = ctaElementsFull.map(cta => ({
      type: cta.type,
      text: cta.text
    }));

    // Check if page is canonical
    const isCanonical = !canonical || canonical === url;

    // Word count calculation
    const textContent = paragraphs.join(' ');
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

    // Detect page language from HTML lang attribute or other indicators
    const htmlLang = $('html').attr('lang') || $('html').attr('xml:lang');
    const detectedLanguage = htmlLang ? htmlLang.split('-')[0] : undefined; // Get language code only (e.g., 'fi' from 'fi-FI')

    // AI-powered readability analysis
    const sentences = splitIntoSentences(textContent);
    const readabilityScore = await calculateReadabilityScore(textContent, detectedLanguage);

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
        category: 'meta-description'
      });
    } else if (metaDescription.length < 120) {
      issues.push({ 
        title: 'Meta description too short', 
        description: `Meta description is only ${metaDescription.length} characters. Aim for 120-160 characters.`, 
        severity: 'info',
        category: 'meta-description'
      });
    } else if (metaDescription.length > 160) {
      issues.push({ 
        title: 'Meta description too long', 
        description: `Meta description is ${metaDescription.length} characters. Keep it under 160 characters.`, 
        severity: 'warning',
        category: 'meta-description'
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

    // Content issues - using 'links' category as closest match
    if (wordCount < 300) {
      issues.push({ 
        title: 'Thin content', 
        description: `Page has only ${wordCount} words. Aim for at least 300 words for better SEO.`, 
        severity: 'warning',
        category: 'links'
      });
    }

    if (readabilityScore < 60) {
      issues.push({ 
        title: 'Poor readability', 
        description: `Readability score is ${Math.round(readabilityScore)}/100. Consider using shorter sentences and simpler words.`, 
        severity: 'info',
        category: 'links'
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
      hasJsonLd,
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