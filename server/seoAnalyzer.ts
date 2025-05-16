import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseSitemap } from './sitemap';
import { crawlWebsite } from './crawler';
import { generateSeoSuggestions, generateBatchImageAltText } from './openai';
import { storage } from './storage';
import { EventEmitter } from 'events';
import { Heading, Image, SeoIssue, SeoCategory } from '../client/src/lib/types';

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
 */
export async function analyzeSite(domain: string, useSitemap: boolean, events: EventEmitter) {
  // Set up cancellation token
  const controller = new AbortController();
  ongoingAnalyses.set(domain, controller);

  try {
    // Get settings
    const settings = await storage.getSettings();

    // Get pages to analyze (either from sitemap or by crawling)
    let pages: string[] = [];
    
    if (useSitemap) {
      try {
        pages = await parseSitemap(`https://${domain}/sitemap.xml`, controller.signal);
        
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
        console.log(`No sitemap found or error parsing sitemap for ${domain}, falling back to crawling`);
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
    if (pages.length > settings.maxPages) {
      pages = pages.slice(0, settings.maxPages);
    }
    
    // Analyze each page
    const analyzedPages = [];
    const totalPages = pages.length;
    
    for (let i = 0; i < totalPages; i++) {
      // Check if analysis was cancelled
      if (controller.signal.aborted) {
        throw new Error('Analysis cancelled');
      }
      
      const pageUrl = pages[i];
      
      // Emit progress update for current page
      events.emit(domain, {
        status: 'in-progress',
        domain,
        pagesFound: totalPages,
        pagesAnalyzed: i,
        currentPageUrl: pageUrl,
        analyzedPages: analyzedPages.map(p => p.url),
        percentage: Math.floor((i / totalPages) * 100)
      });
      
      try {
        // Analyze the page
        const pageAnalysis = await analyzePage(pageUrl, settings, controller.signal);
        analyzedPages.push(pageAnalysis);
      } catch (error) {
        console.error(`Error analyzing page ${pageUrl}:`, error);
      }
    }
    
    // Calculate overall metrics
    const metrics = calculateMetrics(analyzedPages);
    
    // Save analysis to storage
    const analysis = {
      domain,
      date: new Date().toISOString(),
      pagesCount: analyzedPages.length,
      metrics,
      pages: analyzedPages
    };
    
    const savedAnalysis = await storage.saveAnalysis(analysis);
    
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
 */
async function analyzePage(url: string, settings: any, signal: AbortSignal) {
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

    // Get page name from URL for display
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const pageName = pathSegments.length === 0 ? 'Home Page' : 
                     pathSegments[pathSegments.length - 1].replace(/-/g, ' ')
                                                          .replace(/\.(html|php|asp|jsp)$/, '')
                                                          .split(' ')
                                                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                          .join(' ');

    // Generate suggestions if AI is enabled
    let suggestions: string[] = [];
    if (settings.useAI) {
      try {
        // Prepare page data for the AI
        const pageData = {
          url,
          title,
          metaDescription,
          headings,
          images: images.map(img => ({
            src: img.src,
            alt: img.alt
          })),
          issues: issues.map(issue => ({
            category: issue.category,
            severity: issue.severity,
            title: issue.title
          }))
        };

        suggestions = await generateSeoSuggestions(url, pageData);
        
        // Generate alt text for images without alt text
        if (settings.analyzeImages !== false && images.length > 0) {
          const imagesWithoutAlt = images.filter(img => !img.alt);
          
          if (imagesWithoutAlt.length > 0) {
            console.log(`Generating alt text for ${imagesWithoutAlt.length} images on ${url}`);
            
            const imagesToProcess = imagesWithoutAlt.map(img => ({
              src: img.src,
              context: {
                url,
                title,
                // Try to find text near the image by checking headings
                nearbyText: headings.length > 0 ? headings[0].text : undefined
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
      canonical,
      robotsMeta,
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
  });
  
  // Normalize metrics to 0-100 scale
  const pageCount = Math.max(1, pages.length);
  titleOptimization = Math.max(0, Math.min(100, 50 + (titleOptimization / pageCount)));
  descriptionOptimization = Math.max(0, Math.min(100, 50 + (descriptionOptimization / pageCount)));
  headingsOptimization = Math.max(0, Math.min(100, 50 + (headingsOptimization / pageCount)));
  imagesOptimization = Math.max(0, Math.min(100, 50 + (imagesOptimization / pageCount)));
  
  return {
    goodPractices,
    warnings,
    criticalIssues,
    titleOptimization,
    descriptionOptimization,
    headingsOptimization,
    imagesOptimization
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