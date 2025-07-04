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

        // Emit progress update after sitemap is retrieved
        events.emit(domain, {
          status: 'in-progress',
          domain,
          pagesFound: pages.length,
          pagesAnalyzed: 0,
          currentPageUrl: '',
          analyzedPages: [],
          percentage: 0
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

          // Emit progress update during crawling with basic SEO data
          events.emit(domain, {
            status: 'in-progress',
            domain,
            pagesFound: crawledPages.length,
            pagesAnalyzed: 0,
            currentPageUrl: crawledPages[crawledPages.length - 1] || '',
            analyzedPages: [],
            basicSeoData: Array.from(basicSeoData.values()),
            percentage: 0
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

    // Analyze pages in parallel with a concurrency limit
    const analyzedPages = [];
    const totalPages = pages.length;
    const concurrencyLimit = 3; // Process 3 pages concurrently

    // Function to analyze a single page and update progress
    const analyzeSinglePage = async (pageUrl: string, pageIndex: number) => {
      if (controller.signal.aborted) {
        throw new Error('Analysis cancelled');
      }

      // Emit progress update for current page
      events.emit(domain, {
        status: 'in-progress',
        domain,
        pagesFound: totalPages,
        pagesAnalyzed: analyzedPages.length,
        currentPageUrl: pageUrl,
        analyzedPages: analyzedPages.map(p => p.url),
        percentage: Math.floor((analyzedPages.length / totalPages) * 100)
      });

      try {
        // Analyze the page
        const pageAnalysis = await analyzePage(pageUrl, settings, controller.signal, isCompetitor, analyzedPages, additionalInfo);
        analyzedPages.push(pageAnalysis);

        // Re-emit progress to update the count
        events.emit(domain, {
          status: 'in-progress',
          domain,
          pagesFound: totalPages,
          pagesAnalyzed: analyzedPages.length,
          currentPageUrl: pageUrl,
          analyzedPages: analyzedPages.map(p => p.url),
          percentage: Math.floor((analyzedPages.length / totalPages) * 100)
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
    if (settings.useAI && analyzedPages.length > 1 && !isCompetitor) {
      try {
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

        // Generate suggestions for each page with full site structure and business context
        for (const page of analyzedPages) {
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
            const suggestions = await generateSeoSuggestions(page.url, pageData, siteStructure, siteOverview, additionalInfo);
            page.suggestions = suggestions || [];
          } catch (error) {
            console.error(`Error generating suggestions for ${page.url}:`, error);
            page.suggestions = [];
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
    if (settings.useAI && analyzedPages.length > 1 && !isCompetitor) {
      try {
        console.log(`Analyzing content repetition for ${domain}...`);
        contentRepetitionAnalysis = await analyzeContentRepetition(analyzedPages);
        console.log(`Content repetition analysis completed for ${domain}`);
      } catch (error) {
        console.error(`Error analyzing content repetition for ${domain}:`, error);
        // Continue without content repetition analysis if it fails
      }
    }

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

    // Extract paragraph content for context analysis
    const paragraphs: string[] = [];
    let totalContentLength = 0;
    const maxTotalLength = 10000;
    const maxParagraphLength = 1000;

    $('p').each((_, el) => {
      if (totalContentLength >= maxTotalLength) {
        return false; // Stop processing if we've reached the limit
      }

      let paragraphText = $(el).text().trim();
      if (paragraphText.length > 0) {
        // Truncate paragraph if it's too long
        if (paragraphText.length > maxParagraphLength) {
          paragraphText = paragraphText.substring(0, maxParagraphLength) + '...';
        }

        // Check if adding this paragraph would exceed total limit
        if (totalContentLength + paragraphText.length <= maxTotalLength) {
          paragraphs.push(paragraphText);
          totalContentLength += paragraphText.length;
        } else {
          // Add partial paragraph to reach the limit
          const remainingLength = maxTotalLength - totalContentLength;
          if (remainingLength > 0) {
            paragraphs.push(paragraphText.substring(0, remainingLength) + '...');
          }
          return false; // Stop processing
        }
      }
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

      // Check for generic anchor text
      const genericTexts = ['click here', 'read more', 'learn more', 'here', 'this', 'link'];
      const genericLinks = internalLinks.filter(link => 
        genericTexts.some(generic => link.text.toLowerCase().includes(generic))
      );

      if (genericLinks.length > 0) {
        issues.push({
          category: 'links',
          severity: 'warning',
          title: 'Generic Anchor Text Found',
          description: `${genericLinks.length} link${genericLinks.length === 1 ? '' : 's'} use${genericLinks.length === 1 ? 's' : ''} generic anchor text. Use descriptive, keyword-rich anchor text instead.`
        });
      }

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
      canonical,
      robotsMeta,
      paragraphs,
      issues,
      suggestions
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

  let titleOptimization = 0;
  let descriptionOptimization = 0;
  let headingsOptimization = 0;
  let imagesOptimization = 0;
  let linksOptimization = 0;

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

      // Optimize category-specific metrics
      switch (issue.category) {
        case 'title':
          titleOptimization -= (issue.severity === 'critical' ? 25 : 10);
          break;
        case 'meta-description':
          descriptionOptimization -= (issue.severity === 'critical' ? 25 : 10);
          break;
        case 'headings':
          headingsOptimization -= (issue.severity === 'critical' ? 25 : 10);
          break;
        case 'images':
          imagesOptimization -= (issue.severity === 'critical' ? 25 : 10);
          break;
        case 'links':
          linksOptimization -= (issue.severity === 'critical' ? 25 : 10);
          break;
      }
    });

    // Award points for good practices
    if (page.title && page.title.length >= 10 && page.title.length <= 60) {
      titleOptimization += 20;
      goodPractices++;
    }

    if (page.metaDescription && page.metaDescription.length >= 50 && page.metaDescription.length <= 160) {
      descriptionOptimization += 20;
      goodPractices++;
    }

    if (page.headings.length > 0 && page.headings.some(h => h.level === 1)) {
      headingsOptimization += 20;
      goodPractices++;
    }

    if (page.images.length > 0 && page.images.every(img => img.alt)) {
      imagesOptimization += 20;
      goodPractices++;
    }

    if (page.internalLinks && page.internalLinks.length >= 3) {
      linksOptimization += 15;
      goodPractices++;
    }

    if (page.internalLinks && page.internalLinks.length > 0) {
      const genericTexts = ['click here', 'read more', 'learn more', 'here', 'this', 'link'];
      const hasGoodAnchorText = page.internalLinks.every(link => 
        !genericTexts.some(generic => link.text.toLowerCase().includes(generic))
      );
      if (hasGoodAnchorText) {
        linksOptimization += 10;
        goodPractices++;
      }
    }
  });

  // Normalize metrics to 0-100 scale
  const pageCount = Math.max(1, pages.length);
  titleOptimization = Math.max(0, Math.min(100, 50 + (titleOptimization / pageCount)));
  descriptionOptimization = Math.max(0, Math.min(100, 50 + (descriptionOptimization / pageCount)));
  headingsOptimization = Math.max(0, Math.min(100, 50 + (headingsOptimization / pageCount)));
  imagesOptimization = Math.max(0, Math.min(100, 50 + (imagesOptimization / pageCount)));
  linksOptimization = Math.max(0, Math.min(100, 50 + (linksOptimization / pageCount)));

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