import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseSitemap } from './sitemap';
import { crawlWebsite } from './crawler';
import { generateSeoSuggestions } from './openai';
import { storage } from './storage';
import { EventEmitter } from 'events';
import { Heading, Image, SeoIssue } from '../client/src/lib/types';

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
      pages = await crawlWebsite(
        `https://${domain}`, 
        settings.maxPages, 
        settings.crawlDelay, 
        settings.followExternalLinks,
        controller.signal,
        (crawledPages) => {
          // Emit progress update during crawling
          events.emit(domain, {
            status: 'in-progress',
            domain,
            pagesFound: crawledPages.length,
            pagesAnalyzed: 0,
            currentPageUrl: crawledPages[crawledPages.length - 1] || '',
            analyzedPages: [],
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
        
        // Add a delay between requests to avoid rate limiting
        if (i < totalPages - 1) {
          await new Promise(resolve => setTimeout(resolve, settings.crawlDelay));
        }
      } catch (error) {
        console.error(`Error analyzing page ${pageUrl}:`, error);
        // Continue with next page on error
        continue;
      }
    }
    
    // Calculate analysis metrics
    const metrics = calculateMetrics(analyzedPages);
    
    // Create full analysis object
    const analysis = {
      domain,
      date: new Date().toISOString(),
      pagesCount: analyzedPages.length,
      metrics,
      pages: analyzedPages
    };
    
    // Save the analysis to the database
    const savedAnalysis = await storage.saveAnalysis(analysis);
    
    // Emit completed event with the analysis
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
    
    return savedAnalysis;
  } catch (error) {
    // Clean up
    ongoingAnalyses.delete(domain);
    
    // Propagate the error
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

/**
 * Analyze a single page for SEO elements
 * @param url Page URL to analyze
 * @param settings Analysis settings
 * @param signal AbortSignal for cancellation
 */
async function analyzePage(url: string, settings: any, signal: AbortSignal) {
  try {
    // Make HTTP request to the page
    const response = await axios.get(url, { 
      signal,
      headers: {
        'User-Agent': 'SEO-Optimizer-Bot/1.0 (+https://seooptimizer.com/bot)',
      },
      timeout: 10000  // 10-second timeout
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract basic page information
    const title = $('title').text() || null;
    const metaDescription = $('meta[name="description"]').attr('content') || null;
    const metaKeywords = $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || null;
    const canonical = $('link[rel="canonical"]').attr('href') || null;
    const robotsMeta = $('meta[name="robots"]').attr('content') || null;
    
    // Extract headings
    const headings: Heading[] = [];
    for (let i = 1; i <= 6; i++) {
      $(`h${i}`).each((idx, element) => {
        headings.push({
          level: i,
          text: $(element).text().trim()
        });
      });
    }
    
    // Extract images if enabled in settings
    const images: Image[] = [];
    if (settings.analyzeImages) {
      $('img').each((idx, element) => {
        images.push({
          src: $(element).attr('src') || '',
          alt: $(element).attr('alt') || null,
          width: parseInt($(element).attr('width') || '0') || undefined,
          height: parseInt($(element).attr('height') || '0') || undefined
        });
      });
    }
    
    // Identify the page name from URL or title
    const urlObj = new URL(url);
    let pageName = urlObj.pathname === '/' ? 'Homepage' : 
                   urlObj.pathname.split('/').filter(Boolean).pop() || 
                   urlObj.hostname;
    
    // Capitalize and clean up page name
    pageName = pageName
                .replace(/-/g, ' ')
                .replace(/\.(html|php|asp|jsp)$/, '')
                .replace(/^\w/, c => c.toUpperCase());
    
    // Analyze for common SEO issues
    const issues: SeoIssue[] = [];
    
    // Title issues
    if (!title) {
      issues.push({
        category: 'title',
        severity: 'critical',
        title: 'Missing Title',
        description: 'Page has no title tag. Title tags are crucial for SEO.'
      });
    } else if (title.length < 20) {
      issues.push({
        category: 'title',
        severity: 'warning',
        title: 'Title Too Short',
        description: `Title is only ${title.length} characters. Recommended length is 50-60 characters.`
      });
    } else if (title.length > 60) {
      issues.push({
        category: 'title',
        severity: 'warning',
        title: 'Title Too Long',
        description: `Title is ${title.length} characters. Recommended length is 50-60 characters.`
      });
    }
    
    // Meta description issues
    if (!metaDescription) {
      issues.push({
        category: 'meta-description',
        severity: 'critical',
        title: 'Missing Meta Description',
        description: 'Page has no meta description. Meta descriptions are important for SEO and click-through rates.'
      });
    } else if (metaDescription.length < 70) {
      issues.push({
        category: 'meta-description',
        severity: 'warning',
        title: 'Meta Description Too Short',
        description: `Meta description is only ${metaDescription.length} characters. Recommended length is 120-160 characters.`
      });
    } else if (metaDescription.length > 160) {
      issues.push({
        category: 'meta-description',
        severity: 'warning',
        title: 'Meta Description Too Long',
        description: `Meta description is ${metaDescription.length} characters. Recommended length is 120-160 characters.`
      });
    }
    
    // Heading issues
    if (headings.length === 0) {
      issues.push({
        category: 'headings',
        severity: 'critical',
        title: 'No Headings',
        description: 'Page has no heading tags (h1-h6). Headings are important for page structure and SEO.'
      });
    } else {
      const h1Count = headings.filter(h => h.level === 1).length;
      
      if (h1Count === 0) {
        issues.push({
          category: 'headings',
          severity: 'critical',
          title: 'Missing H1 Heading',
          description: 'Page has no H1 heading. Each page should have exactly one H1 heading.'
        });
      } else if (h1Count > 1) {
        issues.push({
          category: 'headings',
          severity: 'warning',
          title: 'Multiple H1 Headings',
          description: `Page has ${h1Count} H1 headings. Each page should have exactly one H1 heading.`
        });
      }
    }
    
    // Image issues
    if (settings.analyzeImages && images.length > 0) {
      const missingAlt = images.filter(img => !img.alt).length;
      
      if (missingAlt > 0) {
        issues.push({
          category: 'images',
          severity: missingAlt === images.length ? 'critical' : 'warning',
          title: 'Missing Alt Text',
          description: `${missingAlt} out of ${images.length} images are missing alt text. Alt text is important for accessibility and SEO.`
        });
      }
    }
    
    // Generate AI-powered suggestions if enabled
    let suggestions: string[] = [];
    
    if (settings.useAI && issues.length > 0) {
      try {
        suggestions = await generateSeoSuggestions(url, {
          title,
          metaDescription,
          headings,
          issues
        });
      } catch (error) {
        console.error('Error generating AI suggestions:', error instanceof Error ? error.message : String(error));
        // Fallback to basic suggestions if AI fails
        suggestions = issues.map(issue => {
          switch (issue.category) {
            case 'title':
              return issue.severity === 'critical'
                ? 'Add a descriptive title tag between 50-60 characters.'
                : 'Optimize your title length to be between 50-60 characters for better visibility in search results.';
              
            case 'meta-description':
              return issue.severity === 'critical'
                ? 'Add a compelling meta description between 120-160 characters.'
                : 'Adjust your meta description length to be between 120-160 characters for optimal display in search results.';
              
            case 'headings':
              return issue.severity === 'critical' && issue.title === 'Missing H1 Heading'
                ? 'Add an H1 heading that clearly describes the page content.'
                : 'Ensure your page has exactly one H1 heading and uses other headings (H2-H6) in a logical hierarchical structure.';
              
            case 'images':
              return 'Add descriptive alt text to all images to improve accessibility and SEO.';
              
            default:
              return issue.description;
          }
        });
      }
    }
    
    return {
      url,
      pageName,
      title,
      metaDescription,
      metaKeywords,
      headings,
      images,
      canonical,
      robotsMeta,
      issues,
      suggestions
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Failed to fetch page (HTTP ${error.response.status})`);
    } else if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analysis cancelled');
    } else {
      throw new Error(`Failed to analyze page: ${error instanceof Error ? error.message : String(error)}`);
    }
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
  
  // Count issues by severity
  pages.forEach(page => {
    page.issues.forEach((issue: any) => {
      if (issue.severity === 'critical') {
        criticalIssues++;
      } else if (issue.severity === 'warning') {
        warnings++;
      }
    });
    
    // If the page has no issues, count it as a good practice
    if (page.issues.length === 0) {
      goodPractices++;
    }
  });
  
  // Calculate optimizations by category
  const totalPages = pages.length;
  
  const titleOptimization = Math.round(
    ((totalPages - pages.filter(p => p.issues.some((i: any) => i.category === 'title')).length) / totalPages) * 100
  );
  
  const descriptionOptimization = Math.round(
    ((totalPages - pages.filter(p => p.issues.some((i: any) => i.category === 'meta-description')).length) / totalPages) * 100
  );
  
  const headingsOptimization = Math.round(
    ((totalPages - pages.filter(p => p.issues.some((i: any) => i.category === 'headings')).length) / totalPages) * 100
  );
  
  const imagesOptimization = Math.round(
    ((totalPages - pages.filter(p => p.issues.some((i: any) => i.category === 'images')).length) / totalPages) * 100
  );
  
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
