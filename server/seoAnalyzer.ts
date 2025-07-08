import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseSitemap } from './sitemap';
import { crawlWebsite } from './crawler';
import { generateSeoSuggestions, generateBatchImageAltText, analyzeContentRepetition, analyzeSiteOverview } from './openai';
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

  // Adjust for silent 'e'
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
    .filter(item => item.count >= 3) // Only keywords that appear at least 3 times
    .sort((a, b) => b.density - a.density)
    .slice(0, 20); // Top 20 keywords
}

function calculateContentDepth(paragraphs: string[], headings: Heading[]): number {
  let score = 0;

  // Base score from content length
  const totalWords = paragraphs.join(' ').split(/\s+/).length;
  score += Math.min(50, totalWords / 20); // Max 50 points for word count

  // Points for heading structure
  const h1Count = headings.filter(h => h.level === 1).length;
  const h2Count = headings.filter(h => h.level === 2).length;
  const h3Count = headings.filter(h => h.level === 3).length;

  score += Math.min(20, h2Count * 3); // Max 20 points for H2s
  score += Math.min(15, h3Count * 2); // Max 15 points for H3s
  score += h1Count === 1 ? 10 : 0; // Bonus for single H1

  // Points for paragraph variety
  const avgParagraphLength = paragraphs.length > 0 ? 
    totalWords / paragraphs.length : 0;

  if (avgParagraphLength > 20 && avgParagraphLength < 80) {
    score += 15; // Good paragraph length variety
  }

  return Math.min(100, score);
}

function extractSemanticKeywords(content: string): string[] {
  const text = content.toLowerCase();

  // Extract multi-word phrases (2-3 words)
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


import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseSitemap } from './sitemap';
import { crawlWebsite } from './crawler';
import { generateSeoSuggestions, generateBatchImageAltText, analyzeContentRepetition, analyzeSiteOverview } from './openai';
import { storage } from './storage';
import { EventEmitter } from 'events';
import { Heading, Image, SeoIssue, SeoCategory, ContentRepetitionAnalysis } from '../client/src/lib/types';

// Extend the Image interface to include suggestedAlt
interface AnalysisImage extends Image {
  suggestedAlt?: string;
}

// Store ongoing analyses to allow cancellation
const ongoingAnalyses = new Map();

/**
 * Analyze a website's SEO performance
 * @param domain Domain name without protocol (e.g., example.com)
 * @param useSitemap Whether to attempt to use sitemap.xml first
 * @param events EventEmitter for sending progress updates
 * @param isCompetitor Whether this is a competitor analysis (skips alt text generation)
 * @param userId Optional user ID to associate with the analysis
 */
export async function analyzeSite(domain: string, useSitemap: boolean, events: EventEmitter, isCompetitor: boolean = false, userId?: string, additionalInfo?: string) {
  // Set up cancellation token
  const controller = new AbortController();
  ongoingAnalyses.set(domain, controller);

  try {
    // Get settings for this user
    const settings = await storage.getSettings(userId);

    // Get pages to analyze (either from sitemap or by crawling)
    let pages: string[] = [];

    if (useSitemap) {
      try {
        console.log(`Attempting to parse sitemap for ${domain}`);
        // First try the sitemap index, which is the standard pattern
        pages = await parseSitemap(`https://${domain}/sitemap.xml`, controller.signal);

        // If no pages found, try some common sitemap naming patterns
        if (pages.length === 0) {
          console.log(`No pages found in sitemap index, trying common sitemap patterns`);
          // Try common sitemap patterns - sitemap.xml failed already, so try others
          const commonPatterns = ['sitemap_index.xml', 'sitemap1.xml', 'sitemap-1.xml', 'post-sitemap.xml', 'page-sitemap.xml'];

          for (const pattern of commonPatterns) {
            if (controller.signal.aborted) {
              throw new Error('Sitemap parsing cancelled');
            }

            console.log(`Trying ${pattern}...`);
            const sitemapPages = await parseSitemap(`https://${domain}/${pattern}`, controller.signal);

            if (sitemapPages.length > 0) {
              console.log(`Found ${sitemapPages.length} pages in ${pattern}`);
              pages = sitemapPages;
              break;
            }
          }
        }

        console.log(`Found ${pages.length} content pages in sitemaps for ${domain} (after filtering media sitemaps)`);

        // Emit progress update after sitemap is retrieved (5% of total progress)
        events.emit(domain, {
          status: 'in-progress',
          domain,
          pagesFound: pages.length,
          pagesAnalyzed: 0,
          currentPageUrl: '',
          analyzedPages: [],
          percentage: 5
        });
      } catch (error) {
        console.log(`No sitemap found or error parsing sitemap for ${domain}, falling back to crawling: ${error instanceof Error ? error.message : String(error)}`);
        // Fallback to crawling
        useSitemap = false;
      }
    }

    if (!useSitemap || pages.length === 0) {
      // Crawl the website to find pages
      // Collect basic SEO data during crawling to improve user experience
      const basicSeoData = new Map();

      pages = await crawlWebsite(
        `https://${domain}`, 
        settings.maxPages, 
        settings.crawlDelay, 
        settings.followExternalLinks,
        controller.signal,
        (crawledPages, seoData) => {
          // Store SEO data for each page
          if (seoData) {
            basicSeoData.set(seoData.url, seoData);
          }

          // Emit progress update during crawling with basic SEO data (up to 10% of total progress)
          const crawlingProgress = Math.min(10, Math.floor((crawledPages.length / settings.maxPages) * 10));
          events.emit(domain, {
            status: 'in-progress',
            domain,
            pagesFound: crawledPages.length,
            pagesAnalyzed: 0,
            currentPageUrl: crawledPages[crawledPages.length - 1] || '',
            analyzedPages: [],
            basicSeoData: Array.from(basicSeoData.values()),
            percentage: crawlingProgress
          });
        }
      );
    }

    // Limit the number of pages to analyze
    // Note: We don't need to force reaching the maximum page count
    // Just respect the smaller of: actual pages found or max setting
    if (pages.length > settings.maxPages) {
      pages = pages.slice(0, settings.maxPages);
    }

    console.log(`Analyzing ${pages.length} pages for ${domain} (max setting: ${settings.maxPages})`);

    // Ensure we don't have duplicate URLs in the pages array
    pages = [...new Set(pages)];

    // Always ensure homepage/root is analyzed first for better context
    const rootUrl = `https://${domain.toLowerCase()}`;
    const normalizedRootUrl = rootUrl.endsWith('/') ? rootUrl.slice(0, -1) : rootUrl;

    // Remove any existing homepage variants from the array (case-insensitive)
    pages = pages.filter(page => {
      const normalizedPage = (page.endsWith('/') ? page.slice(0, -1) : page).toLowerCase();
      const rootUrlLower = normalizedRootUrl.toLowerCase();
      return normalizedPage !== rootUrlLower && 
             normalizedPage !== `${rootUrlLower}/index.html` &&
             normalizedPage !== `${rootUrlLower}/index.php` &&
             normalizedPage !== `${rootUrlLower}/home`;
    });

    // Add homepage at the beginning (using lowercase domain)
    pages.unshift(normalizedRootUrl);

    // Analyze pages in parallel with a concurrency limit
    const analyzedPages = [];
    const totalPages = pages.length;
    const concurrencyLimit = 3; // Process 3 pages concurrently

    // Function to analyze a single page and update progress
    const analyzeSinglePage = async (pageUrl: string, pageIndex: number) => {
      if (controller.signal.aborted) {
        throw new Error('Analysis cancelled');
      }

      // Emit progress update for current page (10-40% of total progress for basic analysis)
      const analysisProgress = 10 + Math.floor((analyzedPages.length / totalPages) * 30);
      events.emit(domain, {
        status: 'in-progress',
        domain,
        pagesFound: totalPages,
        pagesAnalyzed: analyzedPages.length,
        currentPageUrl: pageUrl,
        analyzedPages: analyzedPages.map(p => p.url),
        percentage: analysisProgress
      });

      try {
        // Analyze the page
        const pageAnalysis = await analyzePage(pageUrl, settings, controller.signal, isCompetitor, analyzedPages, additionalInfo);
        analyzedPages.push(pageAnalysis);

        // Re-emit progress to update the count (10-40% of total progress for basic analysis)
        const analysisProgress = 10 + Math.floor((analyzedPages.length / totalPages) * 30);
        events.emit(domain, {
          status: 'in-progress',
          domain,
          pagesFound: totalPages,
          pagesAnalyzed: analyzedPages.length,
          currentPageUrl: pageUrl,
          analyzedPages: analyzedPages.map(p => p.url),
          percentage: analysisProgress
        });

        return pageAnalysis;
      } catch (error) {
        console.error(`Error analyzing page ${pageUrl}:`, error);
        return null;
      }
    };

    // Process pages in batches with the concurrency limit
    for (let i = 0; i < totalPages; i += concurrencyLimit) {
      // Check if analysis was cancelled
      if (controller.signal.aborted) {
        throw new Error('Analysis cancelled');
      }

      const batch = pages.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map((pageUrl, index) => 
        analyzeSinglePage(pageUrl, i + index)
      );

      // Wait for all pages in this batch to complete
      await Promise.all(batchPromises);
    }

    // Enhance suggestions with site structure for internal linking (if AI is enabled)
    if (settings.useAI && analyzedPages.length > 0 && !isCompetitor) {
      try {
        // Emit progress update for AI analysis start (40% progress)
        events.emit(domain, {
          status: 'in-progress',
          domain,
          pagesFound: totalPages,
          pagesAnalyzed: analyzedPages.length,
          currentPageUrl: 'Generating AI-powered SEO suggestions...',
          analyzedPages: analyzedPages.map(p => p.url),
          percentage: 40
        });

        console.log(`Analyzing site overview and generating SEO suggestions for ${domain}...`);

        // Build site structure for analysis
        const siteStructure = {
          allPages: analyzedPages.map(page => ({
            url: page.url,
            title: page.title,
            headings: page.headings,
            metaDescription: page.metaDescription,
            paragraphs: page.paragraphs
          }))
        };

        // First, analyze the overall site to get business context
        console.log(`Generating business context analysis for ${domain}...`);
        const siteOverview = await analyzeSiteOverview(siteStructure, additionalInfo);
        console.log(`Business context detected - Industry: ${siteOverview.industry}, Type: ${siteOverview.businessType}, Target: ${siteOverview.targetAudience}`);

        // Generate suggestions in batches to reduce API calls and improve efficiency
        const batchSize = 3;
        for (let i = 0; i < analyzedPages.length; i += batchSize) {
          const batch = analyzedPages.slice(i, i + batchSize);

          // Emit progress update for suggestion generation (40-80% progress)
          const suggestionProgress = 40 + Math.floor(((i / analyzedPages.length) * 40));
          events.emit(domain, {
            status: 'in-progress',
            domain,
            pagesFound: totalPages,
            pagesAnalyzed: analyzedPages.length,
            currentPageUrl: `Generating suggestions for ${batch.map(p => p.url).join(', ')}...`,
            analyzedPages: analyzedPages.map(p => p.url),
            percentage: suggestionProgress
          });

          // Process batch in parallel with delay between batches
          const batchPromises = batch.map(async (page) => {
            const pageData = {
              url: page.url,
              title: page.title,
              metaDescription: page.metaDescription,
              metaKeywords: page.metaKeywords,
              headings: page.headings,
              images: page.images.map(img => ({
                src: img.src,
                alt: img.alt
              })),
              issues: page.issues.map(issue => ({
                category: issue.category,
                severity: issue.severity,
                title: issue.title,
                description: issue.description
              })),
              paragraphs: page.paragraphs ? page.paragraphs.slice(0, 15) : [],
              internalLinks: page.internalLinks
            };

            try {
              console.log(`Generating suggestions for page: ${page.url}`);
              const suggestions = await generateSeoSuggestions(page.url, pageData, siteStructure, siteOverview, additionalInfo);

              if (Array.isArray(suggestions) && suggestions.length > 0) {
                page.suggestions = suggestions;
                console.log(`Successfully generated ${suggestions.length} suggestions for ${page.url}`);
              } else {
                console.warn(`No suggestions generated for ${page.url}, using empty array`);
                page.suggestions = [];
              }
            } catch (error) {
              console.error(`Error generating suggestions for ${page.url}:`, error);
              page.suggestions = [];
            }
          });

          await Promise.all(batchPromises);

          // Add delay between batches to avoid rate limits (except for last batch)
          if (i + batchSize < analyzedPages.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        console.log(`AI-powered SEO suggestions with business context completed for ${domain}`);
      } catch (error) {
        console.error(`Error enhancing suggestions with site structure for ${domain}:`, error);
        // Continue without enhancement if it fails
      }
    }

    // Calculate overall metrics
    const metrics = calculateMetrics(analyzedPages);

    // Perform content repetition analysis
    let contentRepetitionAnalysis: ContentRepetitionAnalysis | undefined;
    if (settings.useAI && analyzedPages.length > 0 && !isCompetitor) {
      try {
        // Emit progress update for content repetition analysis (85% progress)
        events.emit(domain, {
          status: 'in-progress',
          domain,
          pagesFound: totalPages,
          pagesAnalyzed: analyzedPages.length,
          currentPageUrl: 'Analyzing content duplication...',
          analyzedPages: analyzedPages.map(p => p.url),
          percentage: 85
        });

        console.log(`Analyzing content repetition for ${domain}...`);
        contentRepetitionAnalysis = await analyzeContentRepetition(analyzedPages);
        console.log(`Content repetition analysis completed for ${domain}`);
      } catch (error) {
        console.error(`Error analyzing content repetition for ${domain}:`, error);
        // Continue without content repetition analysis if it fails
      }
    }

    // Emit progress update for saving analysis (95% progress)
    events.emit(domain, {
      status: 'in-progress',
      domain,
      pagesFound: totalPages,
      pagesAnalyzed: analyzedPages.length,
      currentPageUrl: 'Saving analysis...',
      analyzedPages: analyzedPages.map(p => p.url),
      percentage: 95
    });

    // Save analysis to storage
    const analysis = {
      domain,
      date: new Date().toISOString(),
      pagesCount: analyzedPages.length,
      metrics,
      pages: analyzedPages,
      contentRepetitionAnalysis
    };

    const savedAnalysis = await storage.saveAnalysis(analysis, userId);

    // Emit completed event with analysis results
    events.emit(domain, {
      status: 'completed',
      domain,
      pagesFound: totalPages,
      pagesAnalyzed: analyzedPages.length,
      currentPageUrl: '',
      analyzedPages: analyzedPages.map(p => p.url),
      percentage: 100,
      analysis: savedAnalysis
    });

    // Clean up
    ongoingAnalyses.delete(domain);

    return savedAnalysis.id;
  } catch (error) {
    console.error(`Analysis error for ${domain}:`, error);

    // Clean up
    ongoingAnalyses.delete(domain);

    // Emit error event
    events.emit(domain, {
      status: 'error',
      domain,
      error: error.message,
      pagesFound: 0,
      pagesAnalyzed: 0,
      currentPageUrl: '',
      analyzedPages: [],
      percentage: 0
    });

    throw error;
  }
}

/**
 * Analyze a single page for SEO elements
 * @param url Page URL to analyze
 * @param settings Analysis settings
 * @param signal AbortSignal for cancellation
 * @param isCompetitor Whether this is a competitor analysis (to skip alt text generation)
 */
async function analyzePage(url: string, settings: any, signal: AbortSignal, isCompetitor: boolean = false, analyzedPages: any[], additionalInfo?: string) {
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
        if (settings.followExternalLinks) { // Use the same setting as crawler
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
                            // Only include links to different domains (external)
                            if (linkUrlObj.hostname !== baseDomain) {
                                fullUrl = href;
                                externalLinks.push({
                                    href: fullUrl,
                                    text: linkText,
                                    title: title || undefined
                                });
                            }
                        }
                    } catch (error) {
                        // Skip malformed URLs
                        console.warn(`Skipping malformed URL: ${href} on page ${url}`);
                    }
                }
            });
        }

    // Enhanced content extraction with quality metrics
    const paragraphs: string[] = [];
    const sentences: string[] = [];
    let totalContentLength = 0;
    const maxTotalLength = 15000; // Increased for better analysis
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

     // Extract CTA elements (buttons, forms, etc.)
     const ctaElements: Array<{
         type: string;
         text: string;
         element: string;
         attributes: Record<string, string>;
     }> = [];

     // Debug: Log HTML snippet to see what we're working with
     console.log(`Analyzing CTAs for ${url}`);
     console.log(`HTML contains ${$('a').length} total links, ${$('button').length} buttons, ${$('input').length} inputs, ${$('form').length} forms`);

     // Extract ALL links first and filter by class content
     $('a').each((_, el) => {
         const classes = $(el).attr('class') || '';
         const href = $(el).attr('href') || '';
         const linkText = $(el).text().trim();
         const role = $(el).attr('role') || '';
         
         // Check if class contains button-related keywords
         const hasButtonClass = classes.includes('button') || 
                               classes.includes('btn') || 
                               classes.includes('sqs-block-button') ||
                               classes.includes('wp-block-button') ||
                               classes.includes('wp-element-button') ||
                               role === 'button';
         
         if (hasButtonClass && linkText) {
             console.log(`Found button-like link: "${linkText}" with classes: "${classes}"`);
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
         
         console.log(`Found button: "${buttonText}" with classes: "${classes}"`);
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

     // Extract input buttons (submit, button, image)
     $('input').each((_, el) => {
         const type = $(el).attr('type') || '';
         if (type === 'submit' || type === 'button' || type === 'image') {
             const buttonText = $(el).val()?.toString().trim() || $(el).attr('value') || $(el).attr('alt') || '';
             const classes = $(el).attr('class') || '';
             
             console.log(`Found input button: "${buttonText}" type: "${type}" with classes: "${classes}"`);
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

     // Extract elements with data attributes that indicate buttons
     $('*').each((_, el) => {
         const attrs = $(el)[0]?.attribs || {};
         const hasDataButton = Object.keys(attrs).some(attr => 
             attr.startsWith('data-') && 
             (attr.includes('button') || attr.includes('btn') || attr.includes('sqsp-button'))
         );
         
         if (hasDataButton) {
             const tagName = $(el).prop('tagName')?.toLowerCase() || '';
             const buttonText = $(el).text().trim();
             const classes = $(el).attr('class') || '';
             
             // Skip if already captured as a link or button
             if (tagName !== 'a' && tagName !== 'button' && tagName !== 'input' && buttonText) {
                 console.log(`Found data-button element: "${buttonText}" tagName: "${tagName}" with classes: "${classes}"`);
                 ctaElements.push({
                     type: 'data_button',
                     text: buttonText,
                     element: tagName,
                     attributes: {
                         class: classes,
                         'data-attributes': Object.keys(attrs)
                             .filter(attr => attr.startsWith('data-'))
                             .map(attr => `${attr}="${$(el).attr(attr)}"`)
                             .join(', ')
                     }
                 });
             }
         }
     });

     // Extract form elements
     $('form').each((_, el) => {
         const formId = $(el).attr('id') || '';
         const action = $(el).attr('action') || '';
         const method = $(el).attr('method') || 'GET';
         const classes = $(el).attr('class') || '';
         
         console.log(`Found form: ID="${formId}" action="${action}" method="${method}" classes="${classes}"`);
         ctaElements.push({
             type: 'form',
             text: formId ? `Form with ID: ${formId}` : 'Form without ID',
             element: 'form',
             attributes: {
                 id: formId,
                 action: action,
                 method: method,
                 class: classes
             }
         });
     });

     console.log(`Total CTA elements found for ${url}: ${ctaElements.length}`);

    // Calculate content quality metrics
    const contentMetrics = {
      wordCount: allTextContent.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: allTextContent.length,
      paragraphCount: paragraphs.length,
      sentenceCount: sentences.length,
      averageWordsPerSentence: sentences.length > 0 ? 
        Math.round(allTextContent.split(/\s+/).length / sentences.length) : 0,
      averageWordsPerParagraph: paragraphs.length > 0 ? 
        Math.round(allTextContent.split(/\s+/).length / paragraphs.length) : 0,
      readabilityScore: calculateReadabilityScore(sentences),
      keywordDensity: extractKeywordDensity(allTextContent),
      contentDepthScore: calculateContentDepth(paragraphs, headings),
      semanticKeywords: extractSemanticKeywords(allTextContent)
    };

    // Extract schema markup and technical SEO elements
    const schemaMarkup = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const schema = JSON.parse($(el).html() || '{}');
        schemaMarkup.push(schema);
      } catch (error) {
        // Skip invalid JSON-LD
      }
    });

    // Extract Open Graph and Twitter Card data
    const openGraph = {
      title: $('meta[property="og:title"]').attr('content') || null,
      description: $('meta[property="og:description"]').attr('content') || null,
      image: $('meta[property="og:image"]').attr('content') || null,
      type: $('meta[property="og:type"]').attr('content') || null,
      url: $('meta[property="og:url"]').attr('content') || null
    };

    const twitterCard = {
      card: $('meta[name="twitter:card"]').attr('content') || null,
      title: $('meta[name="twitter:title"]').attr('content') || null,
      description: $('meta[name="twitter:description"]').attr('content') || null,
      image: $('meta[name="twitter:image"]').attr('content') || null
    };

    // Extract viewport and mobile optimization
    const viewport = $('meta[name="viewport"]').attr('content') || null;
    const mobileOptimized = viewport && viewport.includes('width=device-width');

    // Extract language and hreflang
    const htmlLang = $('html').attr('lang') || null;
    const hreflangLinks = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      hreflangLinks.push({
        hreflang: $(el).attr('hreflang'),
        href: $(el).attr('href')
      });
    });

    // Collect SEO issues
    const issues: SeoIssue[] = [];

    // Check for SEO issues
    // Title issues
    if (!title) {
      issues.push({
        category: 'title',
        severity: 'critical',
        title: 'Missing Page Title',
        description: 'The page does not have a title tag, which is essential for SEO.'
      });
    } else if (title.length < 10) {
      issues.push({
        category: 'title',
        severity: 'warning',
        title: 'Title Too Short',
        description: `The page title is only ${title.length} characters. Consider using a longer, more descriptive title.`
      });
    } else if (title.length > 60) {
      issues.push({
        category: 'title',
        severity: 'warning',
        title: 'Title Too Long',
        description: `The page title is ${title.length} characters, which exceeds the recommended 60 characters.`
      });
    }

    // Meta description issues
    if (!metaDescription) {
      issues.push({
        category: 'meta-description',
        severity: 'critical',
        title: 'Missing Meta Description',
        description: 'The page does not have a meta description, which is important for search engines.'
      });
    } else if (metaDescription.length < 50) {
      issues.push({
        category: 'meta-description',
        severity: 'warning',
        title: 'Meta Description Too Short',
        description: `The meta description is only ${metaDescription.length} characters. Consider using a longer description.`
      });
    } else if (metaDescription.length > 160) {
      issues.push({
        category: 'meta-description',
        severity: 'warning',
        title: 'Meta Description Too Long',
        description: `The meta description is ${metaDescription.length} characters, which exceeds the recommended 160 characters.`
      });
    }

    // Headings issues
    if (headings.length === 0) {
      issues.push({
        category: 'headings',
        severity: 'warning',
        title: 'No Headings Found',
        description: 'The page does not have any heading tags (h1-h6), which are important for SEO and content structure.'
      });
    } else if (!headings.some(h => h.level === 1)) {
      issues.push({
        category: 'headings',
        severity: 'warning',
        title: 'Missing H1 Heading',
        description: 'The page does not have an H1 heading, which is important for SEO and accessibility.'
      });
    }

    // Image issues
    if (images.length > 0) {
      const imagesWithoutAlt = images.filter(img => !img.alt);
      if (imagesWithoutAlt.length > 0) {
        issues.push({
          category: 'images',
          severity: imagesWithoutAlt.length === images.length ? 'critical' : 'warning',
          title: 'Images Missing Alt Text',
          description: `${imagesWithoutAlt.length} of ${images.length} images are missing alt text, which is important for SEO and accessibility.`
        });
      }
    }

    // Canonical issues
    if (!canonical) {
      issues.push({
        category: 'canonical',
        severity: 'warning',
        title: 'Missing Canonical Tag',
        description: 'The page does not have a canonical tag, which helps prevent duplicate content issues.'
      });
    }

    // Additional comprehensive SEO checks to ensure we find improvement opportunities

    // Enhanced content quality analysis
    if (contentMetrics.wordCount < 150) {
      issues.push({
        category: 'content',
        severity: 'warning',
        title: 'Content Too Short',
        description: `Page content is only ${contentMetrics.wordCount} words. Consider adding more valuable content to improve SEO performance.`
      });
    } else if (contentMetrics.wordCount > 3000) {
      issues.push({
        category: 'content',
        severity: 'info',
        title: 'Very Long Content',
        description: `Page has ${contentMetrics.wordCount} words. Consider breaking into multiple pages or adding a table of contents.`
      });
    }

    // Readability analysis
    if (contentMetrics.readabilityScore < 30) {
      issues.push({
        category: 'content',
        severity: 'warning',
        title: 'Content May Be Too Complex',
        description: 'Content appears difficult to read. Consider shorter sentences and simpler language.'
      });
    }

    // Paragraph structure analysis
    if (contentMetrics.averageWordsPerParagraph > 100) {
      issues.push({
        category: 'content',
        severity: 'info',
        title: 'Long Paragraphs Detected',
        description: 'Some paragraphs are very long. Consider breaking them into shorter, more digestible chunks.'
      });
    }



    // Mobile optimization check
    if (!mobileOptimized) {
      issues.push({
        category: 'mobile',
        severity: 'critical',
        title: 'Mobile Optimization Missing',
        description: 'Page is missing proper viewport meta tag for mobile optimization.'
      });
    }

    // Language declaration
    if (!htmlLang) {
      issues.push({
        category: 'accessibility',
        severity: 'warning',
        title: 'Missing Language Declaration',
        description: 'Page is missing lang attribute on HTML element. This is important for accessibility and SEO.'
      });
    }


    // Title and meta description optimization opportunities
    if (title && !title.includes('|') && !title.includes('-')) {
      issues.push({
        category: 'title',
        severity: 'info',
        title: 'Title Structure Enhancement',
        description: 'Consider adding brand name or location to the title with separators (| or -) for better brand recognition.'
      });
    }

    // Keyword density and relevance
    if (title && metaDescription) {
      const titleWords = title.toLowerCase().split(/\s+/);
      const descWords = metaDescription.toLowerCase().split(/\s+/);
      const commonWords = titleWords.filter(word => descWords.includes(word) && word.length > 3);

      if (commonWords.length < 2) {
        issues.push({
          category: 'keywords',
          severity: 'info',
          title: 'Keyword Consistency Opportunity',
          description: 'Title and meta description should share important keywords for better topical relevance.'
        });
      }
    }

    // Content structure analysis
    if (headings.length > 0) {
      const h1Count = headings.filter(h => h.level === 1).length;
      if (h1Count > 1) {
        issues.push({
          category: 'headings',
          severity: 'warning',
          title: 'Multiple H1 Tags',
          description: `Found ${h1Count} H1 tags. Consider using only one H1 tag per page.`
        });
      }

      if (headings.length < 3) {
        issues.push({
          category: 'headings',
          severity: 'info',
          title: 'Limited Heading Structure',
          description: 'Consider adding more headings (H2, H3) to improve content structure and readability.'
        });
      }
    }

    // Internal link issues (if link structure analysis is enabled)
    if (settings.analyzeLinkStructure && internalLinks.length >= 0) {
      if (internalLinks.length === 0) {
        issues.push({
          category: 'links',
          severity: 'warning',
          title: 'No Internal Links Found',
          description: 'This page has no internal links, which can hurt SEO and user navigation.'
        });
      } else if (internalLinks.length < 3) {
        issues.push({
          category: 'links',
          severity: 'info',
          title: 'Few Internal Links',
          description: `This page only has ${internalLinks.length} internal link${internalLinks.length === 1 ? '' : 's'}. Consider adding more relevant internal links.`
        });
      }

      // Note: Generic anchor text detection now handled by AI analysis

      // Check for overly long anchor text
      const longLinks = internalLinks.filter(link => link.text.length > 100);
      if (longLinks.length > 0) {
        issues.push({
          category: 'links',
          severity: 'info',
          title: 'Long Anchor Text Found',
          description: `${longLinks.length} link${longLinks.length === 1 ? '' : 's'} ha${longLinks.length === 1 ? 's' : 've'} very long anchor text. Consider using shorter, more focused anchor text.`
        });
      }
    }

    // CTA analysis issues removed as requested

    // Get page name from URL for display
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const pageName = pathSegments.length === 0 ? 'Home Page' : 
                     pathSegments[pathSegments.length - 1].replace(/-/g, ' ')
                                                          .replace(/\.(html|php|asp|jsp)$/, '')
                                                          .split(' ')
                                                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                          .join(' ');

    // Generate suggestions if AI is enabled (will be enhanced later with site structure)
    let suggestions: string[] = [];
    if (settings.useAI) {
      // For now, just prepare the page data - suggestions will be generated later with full context
      // This avoids duplicate API calls to OpenAI

      try {
        // Generate alt text for images without alt text (skip for competitor analysis)
        if (!signal.aborted && settings.analyzeImages !== false && images.length > 0 && !isCompetitor) {
          const imagesWithoutAlt = images.filter(img => !img.alt);

          if (imagesWithoutAlt.length > 0) {
            console.log(`Generating alt text for ${imagesWithoutAlt.length} images on ${url}`);

            // Extract first heading (H1 if available, otherwise first heading)
            const firstHeading = headings.find(h => h.level === 1)?.text || 
                                (headings.length > 0 ? headings[0].text : undefined);

            // Extract site title from domain name
            const siteTitle = url.split('/')[2]?.split('.')[0] || '';

            // Build more comprehensive context for alt text generation
            const imagesToProcess = imagesWithoutAlt.map(img => ({
              src: img.src,
              context: {
                url,
                title,
                // Try to find text near the image by checking headings
                nearbyText: headings.length > 0 ? headings[0].text : undefined,
                // Add additional context
                siteTitle: siteTitle.charAt(0).toUpperCase() + siteTitle.slice(1), // Capitalize first letter
                firstHeading: firstHeading,
                // Include meta keywords if available
                keywords: metaKeywordsArray ? metaKeywordsArray.join(', ') : undefined,
                // Include first few paragraphs for better context
                paragraphContent: paragraphs.slice(0, 3).join(' ').substring(0, 500)
              }
            }));

            const altTextResults = await generateBatchImageAltText(imagesToProcess);

            // Add suggestedAlt to the images array
            for (const result of altTextResults) {
              const imageIndex = images.findIndex(img => img.src === result.src);
              if (imageIndex !== -1) {
                images[imageIndex].suggestedAlt = result.suggestedAlt;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error generating suggestions for ${url}:`, error);
        suggestions = [];
      }
    }

    return {
      url,
      pageName,
      title,
      metaDescription,
      metaKeywords: metaKeywordsArray,
      headings,
      images,
      internalLinks: settings.analyzeLinkStructure ? internalLinks : undefined,
      externalLinks,
      canonical,
      robotsMeta,
      paragraphs,
      issues,
      suggestions,
      // Enhanced content analysis data
      contentMetrics,
      schemaMarkup,
      openGraph,
      twitterCard,
      viewport,
      htmlLang,
      hreflangLinks,
      mobileOptimized,
      ctaElements
    };
  } catch (error) {
    console.error(`Error analyzing page ${url}:`, error);
    throw error;
  }
}

/**
 * Calculate overall metrics for the analysis
 * @param pages Analyzed pages
 */
function calculateMetrics(pages: any[]) {
  let goodPractices = 0;
  let warnings = 0;
  let criticalIssues = 0;

  // Track optimization scores per page for accurate percentage calculation
  let titleOptimizedPages = 0;
  let descriptionOptimizedPages = 0;
  let headingsOptimizedPages = 0;
  let imagesOptimizedPages = 0;
  let linksOptimizedPages = 0;

  // Analyze all pages
  pages.forEach(page => {
    // Count issues by severity
    page.issues.forEach((issue: SeoIssue) => {
      if (issue.severity === 'critical') {
        criticalIssues++;
      } else if (issue.severity === 'warning') {
        warnings++;
      } else if (issue.severity === 'info') {
        goodPractices++;
      }
    });

    // Check if page meets optimization criteria for each category

    // Title optimization check
    let titleOptimized = false;
    if (page.title && page.title.length >= 10 && page.title.length <= 60) {
      titleOptimized = true;
      goodPractices++;
    }
    // Check for title-related critical issues
    const titleIssues = page.issues.filter((issue: SeoIssue) => 
      issue.category === 'title' && issue.severity === 'critical'
    );
    if (titleIssues.length > 0) {
      titleOptimized = false;
    }
    if (titleOptimized) titleOptimizedPages++;

    // Meta description optimization check
    let descriptionOptimized = false;
    if (page.metaDescription && page.metaDescription.length >= 50 && page.metaDescription.length <= 160) {
      descriptionOptimized = true;
      goodPractices++;
    }
    // Check for meta description critical issues
    const descriptionIssues = page.issues.filter((issue: SeoIssue) => 
      issue.category === 'meta-description' && issue.severity === 'critical'
    );
    if (descriptionIssues.length > 0) {
      descriptionOptimized = false;
    }
    if (descriptionOptimized) descriptionOptimizedPages++;

    // Headings optimization check
    let headingsOptimized = false;
    if (page.headings.length > 0 && page.headings.some(h => h.level === 1)) {
      headingsOptimized = true;
      goodPractices++;
    }
    // Check for headings critical issues
    const headingsIssues = page.issues.filter((issue: SeoIssue) => 
      issue.category === 'headings' && issue.severity === 'critical'
    );
    if (headingsIssues.length > 0) {
      headingsOptimized = false;
    }
    if (headingsOptimized) headingsOptimizedPages++;

    // Images optimization check
    let imagesOptimized = false;
    if (page.images.length > 0 && page.images.every(img => img.alt)) {
      imagesOptimized = true;
      goodPractices++;
    } else if (page.images.length === 0) {
      // If no images, consider it optimized (no alt text issues)
      imagesOptimized = true;
    }
    // Check for images critical issues
    const imagesIssues = page.issues.filter((issue: SeoIssue) => 
      issue.category === 'images' && issue.severity === 'critical'
    );
    if (imagesIssues.length > 0) {
      imagesOptimized = false;
    }
    if (imagesOptimized) imagesOptimizedPages++;

    // Links optimization check
    let linksOptimized = false;
    if (page.internalLinks && page.internalLinks.length >= 3) {
      const genericTexts = ['click here', 'read more', 'learn more', 'here', 'this', 'link'];
      const hasGoodAnchorText = page.internalLinks.every(link => 
        !genericTexts.some(generic => link.text.toLowerCase().includes(generic))
      );
      if (hasGoodAnchorText) {
        linksOptimized = true;
        goodPractices++;
      }
    } else if (!page.internalLinks || page.internalLinks.length === 0) {
      // If no internal links are found, don't penalize (especially for single-page sites)
      // But also don't consider it optimized
      linksOptimized = false;
    }
    // Check for links critical issues
    const linksIssues = page.issues.filter((issue: SeoIssue) => 
      issue.category === 'links' && issue.severity === 'critical'
    );
    if (linksIssues.length > 0) {
      linksOptimized = false;
    }
    if (linksOptimized) linksOptimizedPages++;
  });

  // Calculate optimization percentages based on how many pages meet the criteria
  const pageCount = Math.max(1, pages.length);
  const titleOptimization = Math.round((titleOptimizedPages / pageCount) * 100);
  const descriptionOptimization = Math.round((descriptionOptimizedPages / pageCount) * 100);
  const headingsOptimization = Math.round((headingsOptimizedPages / pageCount) * 100);
  const imagesOptimization = Math.round((imagesOptimizedPages / pageCount) * 100);
  const linksOptimization = Math.round((linksOptimizedPages / pageCount) * 100);

  return {
    goodPractices,
    warnings,
    criticalIssues,
    titleOptimization,
    descriptionOptimization,
    headingsOptimization,
    imagesOptimization,
    linksOptimization
  };
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