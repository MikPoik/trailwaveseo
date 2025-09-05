/**
 * Technical SEO Analysis Module
 * Provides comprehensive technical SEO analysis including Core Web Vitals, 
 * mobile optimization, security, and technical elements
 */

import type { PageAnalysisResult } from './page-analyzer.js';
import axios from 'axios';

export interface TechnicalSeoAnalysis {
  overallScore: number;
  explanation?: string;
  coreWebVitals: CoreWebVitalsAnalysis;
  mobileOptimization: MobileOptimizationAnalysis;
  securityAnalysis: SecurityAnalysis;
  technicalElements: TechnicalElementsAnalysis;
  recommendations: TechnicalRecommendation[];
}

interface CoreWebVitalsAnalysis {
  loadingSpeed: number; // Estimated based on page size and resources
  interactivity: number; // Based on JS/CSS complexity
  visualStability: number; // Based on layout analysis
  score: number;
}

interface MobileOptimizationAnalysis {
  hasViewportMeta: boolean;
  responsiveDesign: number; // Score based on responsive elements
  touchOptimization: number; // Based on button sizes, spacing
  mobileScore: number;
}

interface SecurityAnalysis {
  httpsEnabled: boolean;
  mixedContent: boolean;
  securityHeaders: string[];
  securityScore: number;
}

interface TechnicalElementsAnalysis {
  schemaMarkup: any[];
  structuredData: number; // Score based on schema presence
  canonicalUrl: string | null;
  robotsMeta: string | null;
  xmlSitemap: boolean;
  hasJsonLd: boolean;
  robotsTxt: boolean;
  hreflangImplementation: any[];
  openGraphData: any;
  twitterCardData: any;
  technicalScore: number;
}

interface TechnicalRecommendation {
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  impact: number; // 1-10 scale
}

/**
 * Analyze technical SEO aspects of analyzed pages
 */
export async function analyzeTechnicalSeo(
  pages: PageAnalysisResult[],
  domain: string
): Promise<TechnicalSeoAnalysis> {
  
  console.log(`Analyzing technical SEO for ${pages.length} pages of ${domain}`);

  // Analyze Core Web Vitals indicators
  const coreWebVitals = analyzeCoreWebVitals(pages);
  
  // Analyze mobile optimization
  const mobileOptimization = analyzeMobileOptimization(pages);
  
  // Analyze security aspects
  const securityAnalysis = analyzeSecurityAspects(pages, domain);
  
  // Analyze technical elements
  const technicalElements = await analyzeTechnicalElements(pages, domain);
  
  // Calculate overall technical SEO score
  const overallScore = calculateTechnicalScore(
    coreWebVitals, 
    mobileOptimization, 
    securityAnalysis, 
    technicalElements
  );
  
  // Generate actionable recommendations
  const recommendations = generateTechnicalRecommendations(
    coreWebVitals,
    mobileOptimization,
    securityAnalysis,
    technicalElements
  );

  return {
    overallScore,
    coreWebVitals,
    mobileOptimization,
    securityAnalysis,
    technicalElements,
    recommendations
  };
}

/**
 * Analyze Core Web Vitals indicators
 */
function analyzeCoreWebVitals(pages: PageAnalysisResult[]): CoreWebVitalsAnalysis {
  let totalLoadingScore = 0;
  let totalInteractivityScore = 0;
  let totalStabilityScore = 0;

  pages.forEach(page => {
    // Estimate loading performance based on content size and resource count
    const contentSize = (page.allTextContent?.length || 0) + (page.images?.length || 0) * 100;
    const loadingScore = contentSize < 50000 ? 90 : contentSize < 100000 ? 70 : 50;
    totalLoadingScore += loadingScore;

    // Estimate interactivity based on script complexity indicators
    const hasComplexJs = page.allTextContent?.includes('javascript') || false;
    const interactivityScore = hasComplexJs ? 70 : 85;
    totalInteractivityScore += interactivityScore;

    // Estimate visual stability based on image loading and layout
    const hasImages = (page.images?.length || 0) > 0;
    const imagesWithDimensions = page.images?.filter(img => img.width && img.height).length || 0;
    const stabilityScore = hasImages && imagesWithDimensions === page.images?.length ? 90 : 75;
    totalStabilityScore += stabilityScore;
  });

  const avgLoading = totalLoadingScore / pages.length;
  const avgInteractivity = totalInteractivityScore / pages.length;
  const avgStability = totalStabilityScore / pages.length;

  return {
    loadingSpeed: Math.round(avgLoading),
    interactivity: Math.round(avgInteractivity),
    visualStability: Math.round(avgStability),
    score: Math.round((avgLoading + avgInteractivity + avgStability) / 3)
  };
}

/**
 * Analyze mobile optimization aspects
 */
function analyzeMobileOptimization(pages: PageAnalysisResult[]): MobileOptimizationAnalysis {
  let hasViewportCount = 0;
  let responsiveScore = 0;
  let touchScore = 0;

  pages.forEach(page => {
    // Check for viewport meta tag (this would need to be added to page analysis)
    // For now, assume most modern sites have it
    hasViewportCount += 1; // Placeholder - would check page.viewport

    // Estimate responsive design based on content structure
    const hasGoodHeadingStructure = page.headings.length >= 3;
    const hasReasonableContentLength = page.wordCount >= 300 && page.wordCount <= 2000;
    responsiveScore += hasGoodHeadingStructure && hasReasonableContentLength ? 80 : 60;

    // Estimate touch optimization based on CTA elements
    const ctaCount = page.ctaElements?.length || 0;
    touchScore += ctaCount >= 1 && ctaCount <= 5 ? 85 : 70;
  });

  const hasViewportMeta = hasViewportCount === pages.length;
  const avgResponsiveScore = responsiveScore / pages.length;
  const avgTouchScore = touchScore / pages.length;

  return {
    hasViewportMeta,
    responsiveDesign: Math.round(avgResponsiveScore),
    touchOptimization: Math.round(avgTouchScore),
    mobileScore: Math.round((avgResponsiveScore + avgTouchScore + (hasViewportMeta ? 90 : 50)) / 3)
  };
}

/**
 * Analyze security aspects
 */
function analyzeSecurityAspects(pages: PageAnalysisResult[], domain: string): SecurityAnalysis {
  // Check if domain uses HTTPS (basic check from URL)
  const httpsEnabled = pages.every(page => page.url.startsWith('https://'));
  
  // Check for mixed content (would need deeper analysis)
  const mixedContent = false; // Placeholder
  
  // Security headers (would need response header analysis)
  const securityHeaders: string[] = []; // Placeholder
  
  let securityScore = 0;
  if (httpsEnabled) securityScore += 40;
  if (!mixedContent) securityScore += 30;
  securityScore += securityHeaders.length * 10;

  return {
    httpsEnabled,
    mixedContent,
    securityHeaders,
    securityScore: Math.min(100, securityScore)
  };
}

/**
 * Check if sitemap.xml exists for the domain
 */
async function checkSitemapExists(domain: string): Promise<boolean> {
  try {
    const sitemapUrl = `https://${domain}/sitemap.xml`;
    const response = await axios.head(sitemapUrl, { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Analyze technical elements
 */
async function analyzeTechnicalElements(pages: PageAnalysisResult[], domain: string): Promise<TechnicalElementsAnalysis> {
  let structuredDataScore = 0;
  let canonicalImplementation = 0;
  let robotsImplementation = 0;
  
  // Aggregate schema markup across pages
  const allSchemaMarkup: any[] = [];
  const hreflangImplementation: any[] = [];
  let openGraphData: any = {};
  let twitterCardData: any = {};

  // Check if any page has JSON-LD structured data
  const hasJsonLd = pages.some(page => (page as any).hasJsonLd);
  
  pages.forEach(page => {
    // JSON-LD structured data detection
    if ((page as any).hasJsonLd) structuredDataScore += 1;

    // Canonical URL implementation
    if (page.canonical) canonicalImplementation += 1;

    // Robots meta implementation
    if (page.robotsMeta) robotsImplementation += 1;

    // Extract Open Graph and Twitter Card data (placeholder)
    if (page.url === pages[0].url) { // Homepage
      openGraphData = {
        hasTitle: !!page.title,
        hasDescription: !!page.metaDescription,
        hasImage: page.images.length > 0
      };
      
      twitterCardData = {
        hasCard: false, // Would check twitter:card meta
        hasTitle: !!page.title,
        hasDescription: !!page.metaDescription
      };
    }
  });
  
  // Check if sitemap.xml exists
  const xmlSitemap = await checkSitemapExists(domain);

  const technicalScore = Math.round(
    (structuredDataScore / pages.length) * 25 +
    (canonicalImplementation / pages.length) * 25 +
    (robotsImplementation / pages.length) * 25 +
    25 // Base score for other elements
  );

  return {
    schemaMarkup: allSchemaMarkup,
    structuredData: Math.round((structuredDataScore / pages.length) * 100),
    canonicalUrl: canonicalImplementation > 0 ? pages.find(p => p.canonical)?.canonical || null : null,
    robotsMeta: robotsImplementation > 0 ? pages.find(p => p.robotsMeta)?.robotsMeta || null : null,
    xmlSitemap,
    hasJsonLd,
    robotsTxt: true, // Placeholder - would check robots.txt
    hreflangImplementation,
    openGraphData,
    twitterCardData,
    technicalScore
  };
}

/**
 * Calculate overall technical SEO score
 */
function calculateTechnicalScore(
  coreWebVitals: CoreWebVitalsAnalysis,
  mobile: MobileOptimizationAnalysis,
  security: SecurityAnalysis,
  technical: TechnicalElementsAnalysis
): number {
  
  return Math.round(
    coreWebVitals.score * 0.3 +
    mobile.mobileScore * 0.25 +
    security.securityScore * 0.25 +
    technical.technicalScore * 0.2
  );
}

/**
 * Generate technical SEO recommendations
 */
function generateTechnicalRecommendations(
  coreWebVitals: CoreWebVitalsAnalysis,
  mobile: MobileOptimizationAnalysis,
  security: SecurityAnalysis,
  technical: TechnicalElementsAnalysis
): TechnicalRecommendation[] {
  
  const recommendations: TechnicalRecommendation[] = [];

  // Core Web Vitals recommendations
  if (coreWebVitals.loadingSpeed < 70) {
    recommendations.push({
      category: 'performance',
      priority: 'high',
      title: 'Improve Page Loading Speed',
      description: 'Your pages are loading slower than optimal, affecting user experience and SEO rankings.',
      actionItems: [
        'Optimize and compress images',
        'Minimize CSS and JavaScript files',
        'Enable browser caching',
        'Consider using a CDN'
      ],
      impact: 8
    });
  }

  // Mobile optimization recommendations
  if (!mobile.hasViewportMeta) {
    recommendations.push({
      category: 'mobile',
      priority: 'critical',
      title: 'Add Viewport Meta Tag',
      description: 'Missing viewport meta tag prevents proper mobile display.',
      actionItems: [
        'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to all pages'
      ],
      impact: 9
    });
  }

  // Security recommendations
  if (!security.httpsEnabled) {
    recommendations.push({
      category: 'security',
      priority: 'critical',
      title: 'Enable HTTPS',
      description: 'Your website is not using HTTPS, which is a ranking factor and security concern.',
      actionItems: [
        'Install SSL certificate',
        'Configure HTTPS redirects',
        'Update internal links to HTTPS'
      ],
      impact: 9
    });
  }

  // Technical elements recommendations
  if (technical.structuredData < 50) {
    recommendations.push({
      category: 'structured-data',
      priority: 'medium',
      title: 'Implement Structured Data',
      description: 'Adding structured data markup can enhance search result appearance.',
      actionItems: [
        'Add Organization or Business schema',
        'Implement Article schema for content pages',
        'Consider Product schema if applicable'
      ],
      impact: 6
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority] || b.impact - a.impact;
  });
}