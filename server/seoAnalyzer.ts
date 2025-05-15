import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseSitemap } from './sitemap';
import { crawlWebsite } from './crawler';
import { generateSeoSuggestions, generateBatchImageAltText } from './openai';
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

/**
 * Measure page load time and basic performance metrics
 * @param url Page URL to analyze
 * @param signal AbortSignal for cancellation
 */
async function measurePageSpeed(url: string, signal: AbortSignal): Promise<any> {
  try {
    const startTime = Date.now();
    
    // Make HTTP request to the page
    const response = await axios.get(url, { 
      signal,
      headers: {
        'User-Agent': 'SEO-Optimizer-Bot/1.0 (+https://seooptimizer.com/bot)',
      },
      timeout: 15000  // 15-second timeout
    });
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    const html = response.data;
    
    // Calculate basic performance metrics
    const htmlSize = Buffer.from(html).length;
    const contentLength = parseInt(response.headers['content-length'] || '0') || htmlSize;
    
    // Count resources
    const $ = cheerio.load(html);
    const scripts = $('script').length;
    const styles = $('link[rel="stylesheet"]').length;
    const images = $('img').length;
    
    return {
      loadTime,
      contentSize: contentLength,
      resources: {
        scripts,
        styles,
        images,
        total: scripts + styles + images
      }
    };
  } catch (error) {
    console.error(`Error measuring page speed for ${url}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

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
    // Measure page speed if enabled
    let speedMetrics = null;
    if (settings.analyzePageSpeed) {
      speedMetrics = await measurePageSpeed(url, signal);
    }
    
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

    // Mobile compatibility issues
    const viewportMeta = $('meta[name="viewport"]').attr('content');
    if (!viewportMeta) {
      issues.push({
        category: 'mobile',

    // Structured data analysis
    const structuredData = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonContent = $(el).html();
        if (jsonContent) {
          const parsedData = JSON.parse(jsonContent);
          structuredData.push(parsedData);
        }
      } catch (error) {
        console.error('Error parsing structured data:', error);
        issues.push({
          category: 'structured-data',
          severity: 'warning',
          title: 'Invalid Structured Data',
          description: 'Page contains invalid JSON-LD structured data that could not be parsed.'
        });
      }
    });
    
    if (structuredData.length === 0) {
      issues.push({
        category: 'structured-data',
        severity: 'warning',
        title: 'Missing Structured Data',
        description: 'Page does not contain any JSON-LD structured data. Structured data helps search engines understand your content.'
      });
    } else {
      // Check for common schema types
      const hasCommonTypes = structuredData.some(data => {
        const type = data['@type'] || '';
        return ['Product', 'Article', 'LocalBusiness', 'FAQPage', 'Event', 'Recipe', 'Review'].includes(type);
      });
      
      if (!hasCommonTypes) {
        issues.push({
          category: 'structured-data',
          severity: 'info',
          title: 'Consider Adding Common Schema Types',
          description: 'Consider adding relevant schema types like Product, Article, LocalBusiness, FAQPage, etc. to improve search results.'
        });
      }
    }

        severity: 'critical',
        title: 'Missing Viewport Meta Tag',
        description: 'Page is missing the viewport meta tag. This is required for responsive design and mobile optimization.'
      });
    } else if (!viewportMeta.includes('width=device-width')) {
      issues.push({
        category: 'mobile',
        severity: 'warning',
        title: 'Improper Viewport Configuration',
        description: 'Viewport meta tag should include width=device-width for proper mobile rendering.'
      });
    }
    
    // Check for tap targets that are too small (simplified check)
    const smallLinks = $('a').filter((_, el) => {
      const styles = $(el).css(['width', 'height', 'padding']);
      // Very simplified check - in reality would need computed styles
      return ($(el).attr('style') && 
             (styles.width && parseInt(styles.width) < 40 || 
              styles.height && parseInt(styles.height) < 40));
    }).length;
    
    if (smallLinks > 0) {
      issues.push({
        category: 'mobile',
        severity: 'warning',
        title: 'Small Tap Targets',
        description: `Detected ${smallLinks} potentially small tap targets. Mobile touch elements should be at least 48px in height and width with adequate spacing.`
      });
    }

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
        
        // Generate alt text for images with missing alt text if AI is enabled
        if (settings.useAI && process.env.OPENAI_API_KEY) {
          try {
            // Find nearby text for each image to provide context
            const imagesToProcess = images
              .filter(img => !img.alt)
              .map(img => {
                // Find the image element
                const imgElement = $(`img[src="${img.src}"]`);
                // Try to get nearby text (parent element text, sibling text, etc.)
                const parentText = imgElement.parent().text().trim();
                const nearbyHeading = imgElement.closest('div,section').find('h1,h2,h3,h4,h5,h6').first().text().trim();
                const siblingText = imgElement.prev().text().trim() || imgElement.next().text().trim();
                const nearbyText = nearbyHeading || parentText || siblingText || '';
                
                return {
                  src: img.src,
                  context: {
                    url,
                    title,
                    nearbyText: nearbyText.substring(0, 200) // Limit context length
                  }
                };
              });
              
            if (imagesToProcess.length > 0) {
              // Process in batches to avoid API rate limits
              const altTextSuggestions = await generateBatchImageAltText(imagesToProcess);
              
              // Map the suggested alt text back to the images
              if (altTextSuggestions.length > 0) {
                for (const image of images) {
                  if (!image.alt) {
                    // Find corresponding suggestion
                    const suggestion = altTextSuggestions.find(s => s.src === image.src);
                    if (suggestion && suggestion.suggestedAlt) {
                      image.suggestedAlt = suggestion.suggestedAlt;
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error generating alt text with OpenAI:', error instanceof Error ? error.message : String(error));
            // Continue with analysis even if alt text generation fails
          }
        }
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
          images,
          issues
        });
        
        // Add specific alt text suggestions for images with missing alt text
        const imagesWithSuggestedAlt = images.filter(img => !img.alt && img.suggestedAlt);
        if (imagesWithSuggestedAlt.length > 0) {
          // Add general alt text suggestion if not already included
          const hasAltTextSuggestion = suggestions.some(suggestion => 
            suggestion.toLowerCase().includes('alt text') || 
            suggestion.toLowerCase().includes('alternative text')
          );
          
          if (!hasAltTextSuggestion) {
            suggestions.push(
              'Add descriptive alt text to all images to improve accessibility and SEO.'
            );
          }
          
          // Add specific suggestions for up to 3 images to avoid overwhelming the user
          const imagesToSuggest = imagesWithSuggestedAlt.slice(0, 3);
          for (const image of imagesToSuggest) {
            // Create a simplified version of the image source for display
            const imgSrc = image.src.split('/').pop() || image.src;
            suggestions.push(
              `For image "${imgSrc}", consider using this alt text: "${image.suggestedAlt}"`
            );
          }
          
          // Add a note if there are more images with suggestions
          if (imagesWithSuggestedAlt.length > 3) {
            suggestions.push(
              `${imagesWithSuggestedAlt.length - 3} more images have AI-generated alt text suggestions available in the detailed analysis.`
            );
          }
        }
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
              // Include alt text suggestions if available
              const imagesWithSuggestedAlt = images.filter(img => !img.alt && img.suggestedAlt);
              if (imagesWithSuggestedAlt.length > 0) {
                return `Add descriptive alt text to all images. ${imagesWithSuggestedAlt.length} AI-generated alt text suggestions are available in the detailed analysis.`;
              } else {
                return 'Add descriptive alt text to all images to improve accessibility and SEO.';
              }
              
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
      suggestions,
      speedMetrics
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
