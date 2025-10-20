/**
 * Main orchestrator for website SEO analysis pipeline
 * Similar to competitive-analysis/competitive-analyzer.ts but focused on comprehensive site analysis
 */

import { EventEmitter } from 'events';
import type { OpenAI } from 'openai';

// Types for analysis pipeline
export interface AnalysisOptions {
  useSitemap: boolean;
  skipAltTextGeneration: boolean;
  useAI: boolean;
  maxPages: number;
  crawlDelay: number;
  followExternalLinks: boolean;
  additionalInfo?: string;
  isCompetitorAnalysis: boolean;
}

export interface AnalysisContext {
  domain: string;
  userId?: string;
  settings: any;
  userUsage?: any;
  isTrialUser: boolean;
  aiSuggestionsRemaining: number;
  remainingQuota: number;
  controller: AbortController;
  events: EventEmitter;
}

export interface AnalysisResult {
  analysisId: number;
  domain: string;
  pages: any[];
  metrics: any;
  siteOverview?: any;
  enhancedInsights?: {
    technicalAnalysis: any;
    contentQualityAnalysis: any;
    linkArchitectureAnalysis: any;
    performanceAnalysis: any;
  };
  processingStats: ProcessingStats;
}

interface ProcessingStats {
  totalProcessingTime: number;
  pagesDiscovered: number;
  pagesAnalyzed: number;
  aiCallsMade: number;
  creditsUsed: number;
}

/**
 * Main analysis orchestrator function
 * Coordinates the entire analysis pipeline through modular steps
 */
export async function orchestrateAnalysis(
  domain: string,
  settings: any,
  userId?: string,
  additionalInfo?: string,
  isCompetitorAnalysis: boolean = false,
  events?: EventEmitter
): Promise<AnalysisResult> {
  
  const startTime = Date.now();
  const controller = new AbortController();
  
  console.log(`Starting modular analysis pipeline for ${domain}`);
  
  // Create default EventEmitter if not provided
  const analysisEvents = events || new EventEmitter();
  
  // Register this analysis for cancellation
  const { registerAnalysis } = await import('./progress-tracker.js');
  registerAnalysis(domain, controller);
  
  // Create analysis options from settings
  const options: AnalysisOptions = {
    useSitemap: settings.useSitemap || true,
    useAI: settings.useAI || !settings.skipAltTextGeneration,
    skipAltTextGeneration: settings.skipAltTextGeneration || false,
    isCompetitorAnalysis,
    additionalInfo,
    maxPages: settings.maxPages || 25,
    crawlDelay: settings.crawlDelay || 1000,
    followExternalLinks: settings.followExternalLinks || true
  };
  
  try {
    // Step 1: Initialize analysis context
    console.log('Step 1: Initializing analysis context...');
    const context = await initializeAnalysisContext(
      domain, 
      userId, 
      controller, 
      analysisEvents, 
      settings
    );
    
    // Check for cancellation
    if (controller.signal.aborted) {
      throw new Error('Analysis cancelled by user');
    }
    
    // Step 2: Discover pages to analyze
    console.log('Step 2: Discovering pages...');
    const pages = await discoverPages(context, options);
    
    // Check for cancellation
    if (controller.signal.aborted) {
      throw new Error('Analysis cancelled by user');
    }
    
    // Step 3: Analyze individual pages
    console.log('Step 3: Analyzing pages...');
    const analyzedPages = await analyzePages(context, pages, options);
    
    // Check for cancellation
    if (controller.signal.aborted) {
      throw new Error('Analysis cancelled by user');
    }
    
    // Step 4: Generate insights and suggestions  
    console.log('Step 4: Generating insights...');
    const insights = await generateInsights(context, analyzedPages, options);
    
    // Check for cancellation
    if (controller.signal.aborted) {
      throw new Error('Analysis cancelled by user');
    }
    
    // Step 5: Aggregate results and save
    console.log('Step 5: Aggregating results...');
    const result = await aggregateResults(context, analyzedPages, insights, options);
    
    // Set final processing stats
    result.processingStats.totalProcessingTime = Date.now() - startTime;
    
    // Step 6: Final progress update
    await reportCompletion(context, result);
    
    const totalTime = Date.now() - startTime;
    console.log(`Analysis pipeline completed for ${domain} in ${totalTime}ms`);
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('cancelled') || controller.signal.aborted) {
      console.log(`Analysis cancelled for ${domain}`);
      
      // Emit cancelled status
      const cancelledUpdate = {
        status: 'cancelled' as const,
        domain,
        pagesFound: 0,
        pagesAnalyzed: 0,
        currentPageUrl: 'Analysis cancelled by user',
        analyzedPages: [],
        percentage: 0
      };
      
      analysisEvents.emit(domain, cancelledUpdate);
    } else {
      console.error(`Analysis pipeline failed for ${domain}:`, error);
      await handlePipelineError(controller, domain, analysisEvents, error);
    }
    
    throw error;
  } finally {
    // Clean up ongoing analysis tracking
    const { cleanupAnalysis } = await import('./progress-tracker.js');
    cleanupAnalysis(domain);
  }
}

/**
 * Initialize analysis context with user settings and quotas
 */
async function initializeAnalysisContext(
  domain: string,
  userId: string | undefined,
  controller: AbortController,
  events: EventEmitter,
  settings: any
): Promise<AnalysisContext> {
  
  const { initializeQuotas } = await import('./quota-manager.js');
  const quotaContext = await initializeQuotas(userId, settings);
  
  return {
    domain,
    userId,
    settings: quotaContext.settings,
    remainingQuota: quotaContext.remainingQuota,
    isTrialUser: quotaContext.isTrialUser,
    aiSuggestionsRemaining: quotaContext.aiSuggestionsRemaining,
    controller,
    events
  };
}

/**
 * Discover pages using sitemap or crawling
 */
async function discoverPages(
  context: AnalysisContext,
  options: AnalysisOptions
): Promise<string[]> {
  
  const { discoverSitePages } = await import('./page-discovery.js');
  return discoverSitePages(context, options);
}

/**
 * Analyze individual pages with enhanced insights
 */
async function analyzePages(
  context: AnalysisContext,
  pages: string[],
  options: AnalysisOptions
): Promise<any[]> {
  
  const { analyzePagesBatch } = await import('./page-analyzer.js');
  return analyzePagesBatch(context, pages, options);
}

/**
 * Capture screenshots and analyze design for key pages
 */
async function captureAndAnalyzeDesign(
  context: AnalysisContext,
  analyzedPages: any[],
  options: AnalysisOptions
): Promise<any> {
  
  // Only capture screenshots if AI is enabled and not competitor analysis
  if (!options.useAI || options.isCompetitorAnalysis || !context.settings.useAI) {
    console.log('Skipping design analysis - AI disabled or competitor analysis');
    return null;
  }

  try {
    console.log('Starting screenshot capture and design analysis...');
    
    // Emit design analysis progress
    const { emitDesignProgress } = await import('./progress-tracker.js');
    emitDesignProgress(context, analyzedPages.length, analyzedPages, 'Capturing screenshots...');
    
    // Select up to 5 most important pages for design analysis
    // Prioritize first pages which include homepage and important pages from discovery
    const pagesToAnalyze = analyzedPages.slice(0, 5);
    
    if (pagesToAnalyze.length === 0) {
      console.log('No pages selected for design analysis');
      return null;
    }
    
    // Capture screenshots
    const { captureMultipleScreenshots } = await import('./screenshot-service.js');
    const screenshots = await captureMultipleScreenshots(
      pagesToAnalyze.map(p => p.url)
    );
    
    // Update progress after screenshot capture
    emitDesignProgress(context, analyzedPages.length, analyzedPages, 'Analyzing page designs...');
    
    // Analyze design from screenshots
    const { analyzeMultiplePageDesigns } = await import('./design-analyzer.js');
    const pageData = pagesToAnalyze.map(page => ({
      title: page.title,
      description: page.metaDescription
    }));
    
    const designAnalyses = await analyzeMultiplePageDesigns(screenshots, pageData);
    
    console.log(`Design analysis completed for ${designAnalyses.length} pages`);
    
    // Calculate overall design score
    const validAnalyses = designAnalyses.filter(a => a.overallScore > 0);
    const overallDesignScore = validAnalyses.length > 0 
      ? Math.round(validAnalyses.reduce((sum, a) => sum + a.overallScore, 0) / validAnalyses.length)
      : 0;
    
    return {
      overallScore: overallDesignScore,
      pageAnalyses: designAnalyses,
      totalPagesAnalyzed: designAnalyses.length,
      summary: generateDesignSummary(designAnalyses)
    };
    
  } catch (error) {
    console.error('Error in design analysis:', error);
    return {
      overallScore: 0,
      pageAnalyses: [],
      totalPagesAnalyzed: 0,
      error: error instanceof Error ? error.message : String(error),
      summary: 'Design analysis could not be completed due to an error.'
    };
  }
}

/**
 * Select the most important pages for design analysis
 */
function selectPagesForDesignAnalysis(analyzedPages: any[]): any[] {
  // Prioritize home page, high word count pages, and pages with fewer issues
  return analyzedPages
    .filter(page => page && page.url)
    .sort((a, b) => {
      // Home page gets highest priority
      const aIsHome = a.url.split('/').length <= 4; // Domain + maybe one path segment
      const bIsHome = b.url.split('/').length <= 4;
      
      if (aIsHome && !bIsHome) return -1;
      if (bIsHome && !aIsHome) return 1;
      
      // Then prioritize by content quality (more words, fewer issues)
      const aScore = (a.wordCount || 0) - (a.issues?.length || 0) * 10;
      const bScore = (b.wordCount || 0) - (b.issues?.length || 0) * 10;
      
      return bScore - aScore;
    });
}

/**
 * Generate a summary of design analysis results
 */
function generateDesignSummary(designAnalyses: any[]): string {
  if (!designAnalyses || designAnalyses.length === 0) {
    return 'No design analysis completed.';
  }
  
  const validAnalyses = designAnalyses.filter(a => a.overallScore > 0);
  if (validAnalyses.length === 0) {
    return 'Design analysis completed but no scores could be calculated.';
  }
  
  const avgScore = validAnalyses.reduce((sum, a) => sum + a.overallScore, 0) / validAnalyses.length;
  const totalRecommendations = validAnalyses.reduce((sum, a) => sum + (a.recommendations?.length || 0), 0);
  
  const scoreCategory = avgScore >= 80 ? 'excellent' : 
                       avgScore >= 60 ? 'good' : 
                       avgScore >= 40 ? 'fair' : 'needs improvement';
  
  return `Design analysis completed for ${validAnalyses.length} pages with an average score of ${Math.round(avgScore)}/100 (${scoreCategory}). Found ${totalRecommendations} actionable design recommendations to improve user experience and conversion rates.`;
}

/**
 * Generate comprehensive insights and suggestions
 */
async function generateInsights(
  context: AnalysisContext,
  analyzedPages: any[],
  options: AnalysisOptions
): Promise<any> {
  
  const insights: any = {
    aiInsights: null,
    designAnalysis: null,
    technicalAnalysis: null,
    contentQualityAnalysis: null,
    linkArchitectureAnalysis: null,
    performanceAnalysis: null
  };

  // Generate AI insights if enabled
  if (options.useAI && !options.isCompetitorAnalysis) {
    const { generateComprehensiveInsights } = await import('./insights-generator.js');
    insights.aiInsights = await generateComprehensiveInsights(context, analyzedPages, options);
  }

  // Capture screenshots and analyze design as part of AI insights
  if (options.useAI && !options.isCompetitorAnalysis && context.settings.useAI) {
    console.log('Analyzing Design...');
    insights.designAnalysis = await captureAndAnalyzeDesign(context, analyzedPages, options);
  }

  // Generate enhanced analysis insights with progress updates
  const { emitTechnicalProgress, emitContentQualityProgress, emitLinkArchitectureProgress, emitPerformanceProgress, emitAIExplanationsProgress } = await import('./progress-tracker.js');
  
  // Technical SEO Analysis
  emitTechnicalProgress(context, analyzedPages.length, analyzedPages, 'Running technical SEO analysis...');
  const technicalAnalysis = await import('./technical-seo.js').then(m => m.analyzeTechnicalSeo(analyzedPages, context.domain));
  
  // Content Quality Analysis  
  emitContentQualityProgress(context, analyzedPages.length, analyzedPages, 'Analyzing content quality...');
  const contentQualityAnalysisResult = await import('./content-quality-analyzer.js').then(m => m.analyzeUnifiedContentQuality(analyzedPages, context.settings.useAI));
  
  // Link Architecture Analysis
  emitLinkArchitectureProgress(context, analyzedPages.length, analyzedPages, 'Analyzing link architecture...');
  const linkArchitectureAnalysis = await import('./link-architecture.js').then(m => m.analyzeLinkArchitecture(analyzedPages));
  
  // Performance Analysis
  emitPerformanceProgress(context, analyzedPages.length, analyzedPages, 'Analyzing performance metrics...');
  const performanceAnalysis = await import('./performance-analyzer.js').then(m => m.analyzePerformance(analyzedPages));

  console.log(`Generated comprehensive insights:`);
  console.log(`- Technical SEO Score: ${technicalAnalysis.overallScore}/100`);
  console.log(`- Content Quality Score: ${contentQualityAnalysisResult.overallHealth.combinedScore}/100`);
  console.log(`- Link Architecture Score: ${linkArchitectureAnalysis.overallScore}/100`);
  console.log(`- Performance Score: ${performanceAnalysis.overallScore}/100`);

  // Calculate overall SEO effectiveness score (weighted average of all components)
  const overallSeoEffectivenessScore = calculateOverallSeoEffectivenessScore(
    technicalAnalysis.overallScore,
    contentQualityAnalysisResult.overallHealth.combinedScore,
    linkArchitectureAnalysis.overallScore,
    performanceAnalysis.overallScore
  );
  
  console.log(`- Overall SEO Effectiveness Score: ${overallSeoEffectivenessScore}/100`);
  
  // Add the overall effectiveness score to content quality analysis for frontend access
  (contentQualityAnalysisResult.overallHealth as any).seoEffectivenessScore = overallSeoEffectivenessScore;
  (contentQualityAnalysisResult as any).overallScore = overallSeoEffectivenessScore;

  // Generate AI explanations for each analysis area (only if AI is enabled)
  if (options.useAI && !options.isCompetitorAnalysis && context.settings.useAI) {
    try {
      console.log(`Generating AI explanations for enhanced insights...`);
      emitAIExplanationsProgress(context, analyzedPages.length, analyzedPages, 'Generating AI explanations...');
      
      const { generateInsightsExplanations } = await import('./insights-explanations.js');
      const explanations = await generateInsightsExplanations(
        context.domain,
        technicalAnalysis,
        contentQualityAnalysisResult, 
        linkArchitectureAnalysis,
        performanceAnalysis,
        analyzedPages
      );
      
      // Add explanations to each analysis area
      technicalAnalysis.explanation = explanations.technicalExplanation;
      (contentQualityAnalysisResult as any).explanation = explanations.contentQualityExplanation;
      linkArchitectureAnalysis.explanation = explanations.linkArchitectureExplanation;
      performanceAnalysis.explanation = explanations.performanceExplanation;
      
      console.log(`AI explanations added to enhanced insights`);
      
    } catch (error) {
      console.error('Error generating AI explanations, proceeding without them:', error);
    }
  }

  insights.technicalAnalysis = technicalAnalysis;
  insights.contentQualityAnalysis = contentQualityAnalysisResult;
  insights.linkArchitectureAnalysis = linkArchitectureAnalysis;
  insights.performanceAnalysis = performanceAnalysis;

  return insights;
}

/**
 * Aggregate results and save analysis
 */
async function aggregateResults(
  context: AnalysisContext,
  analyzedPages: any[],
  insights: any,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  
  const { aggregateAnalysisResults } = await import('./results-aggregator.js');
  return aggregateAnalysisResults(context, analyzedPages, insights, options);
}

/**
 * Report successful completion
 */
async function reportCompletion(
  context: AnalysisContext,
  result: AnalysisResult
): Promise<void> {
  
  const { reportAnalysisCompletion } = await import('./progress-tracker.js');
  await reportAnalysisCompletion(context, result);
}

/**
 * Calculate overall SEO effectiveness score from component scores
 */
function calculateOverallSeoEffectivenessScore(
  technicalScore: number,
  contentQualityScore: number,
  linkArchitectureScore: number,
  performanceScore: number
): number {
  
  // Weighted average of all component scores
  // Technical SEO: 30% (most important for search engines)
  // Content Quality: 30% (critical for user engagement and rankings)
  // Performance: 25% (important for user experience and Core Web Vitals)
  // Link Architecture: 15% (important but less critical for modern SEO)
  
  const weightedScore = (
    technicalScore * 0.30 +
    contentQualityScore * 0.30 +
    performanceScore * 0.25 +
    linkArchitectureScore * 0.15
  );
  
  return Math.round(weightedScore);
}

/**
 * Handle pipeline errors with proper cleanup
 */
async function handlePipelineError(
  controller: AbortController,
  domain: string,
  events: EventEmitter,
  error: any
): Promise<void> {
  
  const { handleAnalysisError } = await import('./progress-tracker.js');
  await handleAnalysisError(domain, events, error);
}