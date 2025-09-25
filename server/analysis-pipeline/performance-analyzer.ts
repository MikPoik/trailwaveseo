/**
 * Performance Analysis Module
 * Analyzes website performance indicators including resource optimization,
 * loading patterns, and user experience metrics
 */

import type { PageAnalysisResult } from './page-analyzer.js';

export interface PerformanceAnalysis {
  overallScore: number;
  explanation?: string;
  resourceOptimization: ResourceOptimizationAnalysis;
  loadingPatterns: LoadingPatternsAnalysis;
  userExperienceMetrics: UserExperienceMetrics;
  recommendations: PerformanceRecommendation[];
}

interface ResourceOptimizationAnalysis {
  imageOptimization: number; // Score based on image analysis
  resourceCount: {
    images: number;
    scripts: number;
    stylesheets: number;
    total: number;
  };
  estimatedPageSize: number; // Estimated total page weight
  optimizationScore: number;
}

interface LoadingPatternsAnalysis {
  criticalResourceLoading: number; // Above-fold content optimization
  renderBlockingResources: number; // Estimated render-blocking elements
  asynchronousLoading: number; // Use of async/defer patterns
  loadingScore: number;
}

interface UserExperienceMetrics {
  contentAccessibility: number; // Based on headings, alt text, etc.
  navigationClarity: number; // Clear navigation and CTAs
  contentReadability: number; // Readability and structure
  mobileExperience: number; // Mobile-specific UX factors
  uxScore: number;
}

interface PerformanceRecommendation {
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  impact: number;
  estimatedImprovement: string; // Expected performance gain
  affectedPages: string[];
}

/**
 * Analyze performance across all pages
 */
export async function analyzePerformance(
  pages: PageAnalysisResult[]
): Promise<PerformanceAnalysis> {

  console.log(`Analyzing performance for ${pages.length} pages`);

  // Analyze resource optimization
  const resourceOptimization = analyzeResourceOptimization(pages);

  // Analyze loading patterns
  const loadingPatterns = analyzeLoadingPatterns(pages);

  // Analyze user experience metrics
  const userExperienceMetrics = analyzeUserExperience(pages);

  // Calculate overall performance score
  const overallScore = calculatePerformanceScore(
    resourceOptimization,
    loadingPatterns,
    userExperienceMetrics
  );

  // Generate performance recommendations
  const recommendations = generatePerformanceRecommendations(
    resourceOptimization, // Placeholder: loadingMetrics, cacheAnalysis would be derived from page analysis
    loadingPatterns, // Placeholder
    userExperienceMetrics, // Placeholder
    pages // Pass pages for language detection
  );

  return {
    overallScore,
    resourceOptimization,
    loadingPatterns,
    userExperienceMetrics,
    recommendations
  };
}

/**
 * Analyze resource optimization
 */
function analyzeResourceOptimization(pages: PageAnalysisResult[]): ResourceOptimizationAnalysis {

  let totalImages = 0;
  let imagesWithAlt = 0;
  let imagesWithDimensions = 0;
  let estimatedTotalSize = 0;

  pages.forEach(page => {
    const pageImages = page.images?.length || 0;
    totalImages += pageImages;

    page.images?.forEach(image => {
      if (image.alt) imagesWithAlt++;
      if (image.width && image.height) imagesWithDimensions++;

      // Rough estimation of image size based on dimensions
      const estimatedImageSize = (image.width || 500) * (image.height || 300) * 0.001; // Rough estimate
      estimatedTotalSize += estimatedImageSize;
    });

    // Estimate page content size
    estimatedTotalSize += (page.wordCount * 6) + (page.headings.length * 20); // Rough HTML estimation
  });

  const imageOptimization = totalImages > 0 
    ? ((imagesWithAlt + imagesWithDimensions) / (totalImages * 2)) * 100 
    : 100;

  const resourceCount = {
    images: totalImages,
    scripts: 0, // Placeholder - would analyze script tags
    stylesheets: 0, // Placeholder - would analyze link tags
    total: totalImages
  };

  const avgPageSize = estimatedTotalSize / pages.length;
  const optimizationScore = Math.round(
    imageOptimization * 0.5 +
    (avgPageSize < 2000 ? 30 : avgPageSize < 5000 ? 20 : 10) +
    (resourceCount.total < 50 ? 20 : resourceCount.total < 100 ? 10 : 0)
  );

  return {
    imageOptimization: Math.round(imageOptimization),
    resourceCount,
    estimatedPageSize: Math.round(avgPageSize),
    optimizationScore: Math.min(100, optimizationScore)
  };
}

/**
 * Analyze loading patterns
 */
function analyzeLoadingPatterns(pages: PageAnalysisResult[]): LoadingPatternsAnalysis {

  // Estimate critical resource loading based on content structure
  let avgCriticalScore = 0;
  let avgRenderBlockingScore = 0;
  let avgAsyncScore = 0;

  pages.forEach(page => {
    // Critical resource loading: based on above-fold content analysis
    const hasGoodHeadingStructure = page.headings.filter(h => h.level === 1).length === 1;
    const hasReasonableImageCount = (page.images?.length || 0) <= 5;
    const criticalScore = hasGoodHeadingStructure && hasReasonableImageCount ? 85 : 65;
    avgCriticalScore += criticalScore;

    // Render-blocking resources: estimate based on complexity
    const hasComplexContent = page.wordCount > 2000 || (page.images?.length || 0) > 10;
    const renderBlockingScore = hasComplexContent ? 60 : 80;
    avgRenderBlockingScore += renderBlockingScore;

    // Asynchronous loading: assume modern sites use some async patterns
    const asyncScore = 75; // Placeholder
    avgAsyncScore += asyncScore;
  });

  const criticalResourceLoading = Math.round(avgCriticalScore / pages.length);
  const renderBlockingResources = Math.round(avgRenderBlockingScore / pages.length);
  const asynchronousLoading = Math.round(avgAsyncScore / pages.length);

  const loadingScore = Math.round(
    criticalResourceLoading * 0.4 +
    renderBlockingResources * 0.35 +
    asynchronousLoading * 0.25
  );

  return {
    criticalResourceLoading,
    renderBlockingResources,
    asynchronousLoading,
    loadingScore: Math.min(100, loadingScore)
  };
}

/**
 * Analyze user experience metrics
 */
function analyzeUserExperience(pages: PageAnalysisResult[]): UserExperienceMetrics {

  let totalAccessibility = 0;
  let totalNavigationClarity = 0;
  let totalReadability = 0;
  let totalMobileExperience = 0;

  pages.forEach(page => {
    // Content accessibility
    const imagesWithAlt = page.images?.filter(img => img.alt && img.alt.trim().length > 0).length || 0;
    const totalImages = page.images?.length || 0;
    const altTextScore = totalImages > 0 ? (imagesWithAlt / totalImages) * 100 : 100;

    const hasGoodHeadingStructure = page.headings.filter(h => h.level === 1).length === 1;
    const accessibilityScore = (altTextScore + (hasGoodHeadingStructure ? 100 : 50)) / 2;
    totalAccessibility += accessibilityScore;

    // Navigation clarity
    const hasInternalLinks = (page.internalLinks?.length || 0) >= 2;
    const hasCTAs = (page.ctaElements?.length || 0) >= 1;
    const navigationScore = (hasInternalLinks ? 50 : 25) + (hasCTAs ? 50 : 25);
    totalNavigationClarity += navigationScore;

    // Content readability
    const readabilityScore = page.readabilityScore || 0;
    totalReadability += readabilityScore;

    // Mobile experience (based on content structure)
    const hasReasonableLength = page.wordCount >= 200 && page.wordCount <= 2000;
    const hasGoodStructure = page.headings.length >= 2;
    const mobileScore = (hasReasonableLength ? 50 : 30) + (hasGoodStructure ? 50 : 30);
    totalMobileExperience += mobileScore;
  });

  const contentAccessibility = Math.round(totalAccessibility / pages.length);
  const navigationClarity = Math.round(totalNavigationClarity / pages.length);
  const contentReadability = Math.round(totalReadability / pages.length);
  const mobileExperience = Math.round(totalMobileExperience / pages.length);

  const uxScore = Math.round(
    contentAccessibility * 0.3 +
    navigationClarity * 0.3 +
    contentReadability * 0.2 +
    mobileExperience * 0.2
  );

  return {
    contentAccessibility,
    navigationClarity,
    contentReadability,
    mobileExperience,
    uxScore: Math.min(100, uxScore)
  };
}

/**
 * Calculate overall performance score
 */
function calculatePerformanceScore(
  resources: ResourceOptimizationAnalysis,
  loading: LoadingPatternsAnalysis,
  ux: UserExperienceMetrics
): number {

  return Math.round(
    resources.optimizationScore * 0.35 +
    loading.loadingScore * 0.35 +
    ux.uxScore * 0.3
  );
}

/**
 * Generate performance recommendations
 */
function generatePerformanceRecommendations(
  resourceOptimization: ResourceOptimizationAnalysis, // Renamed from resources
  loadingPatterns: LoadingPatternsAnalysis, // Renamed from loading
  userExperienceMetrics: UserExperienceMetrics, // Renamed from ux
  pages?: PageAnalysisResult[] // Added pages parameter for language detection
): PerformanceRecommendation[] {

  const recommendations: PerformanceRecommendation[] = [];

  // Detect language from page content for localized recommendations
  const isNonEnglish = pages && pages.length > 0 && pages.some(page => 
    page.title && (
      // Check for non-English characters or common non-English words
      /[àáâãäåæçèéêëìíîïñòóôõöøùúûüý]/i.test(page.title) ||
      /\b(ja|und|och|og|et|ou|y|i|en|de|la|le|der|die|das|se|si|är|är|on|är|för|att|med|av|på|till|från|som|det|är|har|kan|ska|kommer|går|får|ger|tar|ser|hör|känner|tror|vet|vill|skulle|måste|bör|behöver|finns|ligger|står|sitter|kommer|går|åker|reser|arbetar|studerar|läser|skriver|talar|pratar|lyssnar|tittar|äter|dricker|sover|vaknar|träffar|möter|hjälper|hjälper|älskar|gillar|tycker|känner|tänker|förstår|minns|glömmer|lär|undervisar|leker|spelar|sjunger|dansar|springer|går|cyklar|kör|flyger|simmar|klättrar|hoppar|kastar|fångar|skjuter|träffar|missar|vinner|förlorar|börjar|slutar|fortsätter|stannar|väntar|skyndar|kommer|går|stannar|åker|reser|bor|lever|dör|föds|växer|blir|förändras|utvecklas|förbättras|försämras|ökar|minskar|höjer|sänker|öppnar|stänger|startar|stoppar|pausar|avbryter|återupptar|återvänder|lämnar|anländer|avgår|ankomst|avresa)/i.test(page.title)
    )
  );

  // Page loading recommendations
  if (loadingPatterns.loadingScore < 80) { // Using loadingScore as a proxy for general loading issues
    recommendations.push({
      category: 'loading',
      priority: loadingPatterns.loadingScore < 60 ? 'critical' : 'high', // Adjusted priority based on score
      title: isNonEnglish ? 'Optimera sidladdningshastighet' : 'Optimize Page Loading Speed',
      description: isNonEnglish ? 
        `Sidans laddningsmönster kan förbättras för snabbare upplevelse.` :
        `Page loading patterns can be improved for a faster experience.`,
      actionItems: [
        isNonEnglish ? 'Optimera kritiska resurser' : 'Optimize critical resources',
        isNonEnglish ? 'Implementera lazy loading' : 'Implement lazy loading',
        isNonEnglish ? 'Minska render-blocking resurser' : 'Reduce render-blocking resources',
        isNonEnglish ? 'Använd asynkron laddning för skript' : 'Use asynchronous loading for scripts'
      ],
      impact: 7,
      estimatedImprovement: isNonEnglish ? 'Snabbare laddningstider' : 'Faster loading times',
      affectedPages: pages ? pages.filter(p => (p.loadingScore || 0) < 70).map(p => p.url) : [] // Placeholder for affected pages
    });
  }

  // Image optimization recommendations
  if (resourceOptimization.imageOptimization < 80) {
    const pagesWithImageIssues = pages ? pages.filter(p => {
      const images = p.images || [];
      const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.trim().length === 0);
      return imagesWithoutAlt.length > 0;
    }) : [];

    recommendations.push({
      category: 'image-optimization',
      priority: resourceOptimization.imageOptimization < 60 ? 'critical' : 'high',
      title: isNonEnglish ? 'Optimera bildresurser' : 'Optimize Image Resources',
      description: isNonEnglish ? 
        `Bildoptimering kan förbättras för bättre prestanda och tillgänglighet.` :
        `Image optimization can be improved for better performance and accessibility.`,
      actionItems: [
        isNonEnglish ? 'Lägg till alt-text till alla bilder' : 'Add alt text to all images',
        isNonEnglish ? 'Specificera bredd- och höjdattribut' : 'Specify width and height attributes',
        isNonEnglish ? 'Komprimera bilder utan kvalitetsförlust' : 'Compress images without quality loss',
        isNonEnglish ? 'Använd moderna bildformat (WebP, AVIF)' : 'Use modern image formats (WebP, AVIF)',
        isNonEnglish ? 'Implementera lazy loading för bilder' : 'Implement lazy loading for images'
      ],
      impact: 6,
      estimatedImprovement: isNonEnglish ? '15-30% snabbare laddning' : '15-30% faster loading',
      affectedPages: pagesWithImageIssues.map(p => p.url)
    });
  }

  // Resource count recommendation
  if (resourceOptimization.resourceCount.total > 100) {
    recommendations.push({
      category: 'resource-count',
      priority: resourceOptimization.resourceCount.total > 150 ? 'critical' : 'high',
      title: isNonEnglish ? 'Minska antalet resurser' : 'Reduce Resource Count',
      description: isNonEnglish ? 
        `Webbplatsen laddar många resurser, vilket kan sakta ner sidladdningen.` :
        `The website loads a high number of resources, which can slow down page loading.`,
      actionItems: [
        isNonEnglish ? 'Kombinera CSS- och JavaScript-filer' : 'Combine CSS and JavaScript files',
        isNonEnglish ? 'Ta bort oanvända resurser' : 'Remove unused resources',
        isNonEnglish ? 'Använd CSS Sprites för bilder' : 'Use CSS Sprites for images'
      ],
      impact: 5,
      estimatedImprovement: isNonEnglish ? 'Förbättrad laddningstid' : 'Improved loading time',
      affectedPages: pages ? pages.filter(p => (p.resourceCount?.total || 0) > 100).map(p => p.url) : [] // Placeholder
    });
  }

  // Content accessibility recommendations
  if (userExperienceMetrics.contentAccessibility < 80) {
    recommendations.push({
      category: 'accessibility',
      priority: userExperienceMetrics.contentAccessibility < 60 ? 'critical' : 'high',
      title: isNonEnglish ? 'Förbättra innehållstillgänglighet' : 'Improve Content Accessibility',
      description: isNonEnglish ? 
        'Förbättra tillgängligheten för en bättre användarupplevelse och SEO-ranking.' :
        'Better accessibility improves user experience and SEO rankings.',
      actionItems: [
        isNonEnglish ? 'Lägg till beskrivande alt-text till alla bilder' : 'Add descriptive alt text to all images',
        isNonEnglish ? 'Säkerställ korrekt rubrikhierarki (singel H1, logiska H2-H6)' : 'Ensure proper heading hierarchy (single H1, logical H2-H6)',
        isNonEnglish ? 'Använd beskrivande länkar' : 'Use descriptive link text',
        isNonEnglish ? 'Bibehåll god färgkontrast' : 'Maintain good color contrast',
        isNonEnglish ? 'Säkerställ att tangentbordsnavigering fungerar' : 'Ensure keyboard navigation works'
      ],
      impact: 7,
      estimatedImprovement: isNonEnglish ? 'Bättre användarupplevelse och SEO' : 'Better user experience and SEO',
      affectedPages: pages ? pages.filter(p => {
        const h1Count = p.headings.filter(h => h.level === 1).length;
        const imagesWithoutAlt = p.images?.filter(img => !img.alt).length || 0;
        return h1Count !== 1 || imagesWithoutAlt > 0;
      }).map(p => p.url) : []
    });
  }

  // Content readability recommendations
  if (userExperienceMetrics.contentReadability < 60) {
    const hardToReadPages = pages ? pages.filter(p => (p.readabilityScore || 0) < 60) : [];
    recommendations.push({
      category: 'readability',
      priority: userExperienceMetrics.contentReadability < 40 ? 'critical' : 'high',
      title: isNonEnglish ? 'Förbättra innehållsläsbarhet' : 'Improve Content Readability',
      description: isNonEnglish ? 
        `${hardToReadPages.length} sidor har låga läsbarhetspoäng, vilket gör innehållet svårt att förstå.` :
        `${hardToReadPages.length} pages have low readability scores, making content hard to understand.`,
      actionItems: [
        isNonEnglish ? 'Använd kortare meningar och stycken' : 'Use shorter sentences and paragraphs',
        isNonEnglish ? 'Ersätt komplexa ord med enklare alternativ' : 'Replace complex words with simpler alternatives',
        isNonEnglish ? 'Lägg till punktlistor och listor för att bryta upp text' : 'Add bullet points and lists to break up text',
        isNonEnglish ? 'Använd fler underrubriker för att organisera innehåll' : 'Use more subheadings to organize content',
        isNonEnglish ? 'Skriv i aktiv form' : 'Write in active voice'
      ],
      impact: 5,
      estimatedImprovement: isNonEnglish ? 'Bättre användarengagemang och tid på sidan' : 'Better user engagement and time on page',
      affectedPages: hardToReadPages.map(p => p.url)
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority] || b.impact - a.impact;
  });
}