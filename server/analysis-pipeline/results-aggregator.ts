/**
 * Results Aggregator Module
 * Handles aggregation and storage of analysis results
 */

import { storage } from '../storage.js';
import type { AnalysisContext, AnalysisOptions, AnalysisResult } from './analysis-orchestrator.js';
import type { PageAnalysisResult } from './page-analyzer.js';
import type { InsightsResult } from './insights-generator.js';
import { incrementUserUsage } from './quota-manager.js';
import { emitFinalProgress, reportAnalysisCompletion } from './progress-tracker.js';

/**
 * Aggregate analysis results and save to storage
 */
export async function aggregateAnalysisResults(
  context: AnalysisContext,
  analyzedPages: PageAnalysisResult[],
  insights: any,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  
  console.log(`Aggregating results for ${context.domain} - ${analyzedPages.length} pages`);
  
  // Emit final progress update
  emitFinalProgress(context, analyzedPages.length, analyzedPages, 'Finalizing analysis results...');

  try {
    // Calculate aggregate metrics
    const metrics = calculateAggregateMetrics(analyzedPages);
    
    // Prepare analysis data for storage
    const analysisData = {
      userId: context.userId,
      domain: context.domain,
      date: new Date(),
      pagesCount: analyzedPages.length,
      metrics,
      pages: analyzedPages,
      contentRepetitionAnalysis: null, // Will be added in future enhancement
      competitorAnalysis: null, // Will be added in future enhancement
      siteOverview: insights?.aiInsights?.siteOverview || insights?.siteOverview || null,
      isCompetitorAnalysis: options.isCompetitorAnalysis || false,
      enhancedInsights: {
        technicalAnalysis: insights?.technicalAnalysis,
        contentQualityAnalysis: insights?.contentQualityAnalysis,
        linkArchitectureAnalysis: insights?.linkArchitectureAnalysis,
        performanceAnalysis: insights?.performanceAnalysis
      }
    };

    // Save analysis to database
    console.log(`Saving analysis for ${context.domain}...`);
    const savedAnalysis = await storage.saveAnalysis(analysisData);
    
    console.log(`Analysis saved with ID: ${savedAnalysis.id}`);

    // Update user usage statistics
    await incrementUserUsage(context.userId, analyzedPages.length);

    console.log(`Updated user usage: +${analyzedPages.length} pages for user ${context.userId}`);

    // Prepare final result with complete data including enhanced insights
    const finalResult = {
      analysisId: savedAnalysis.id,
      domain: context.domain,
      pages: analyzedPages,
      metrics,
      siteOverview: insights?.aiInsights?.siteOverview || insights?.siteOverview,
      enhancedInsights: {
        technicalAnalysis: insights?.technicalAnalysis,
        contentQualityAnalysis: insights?.contentQualityAnalysis,
        linkArchitectureAnalysis: insights?.linkArchitectureAnalysis,
        performanceAnalysis: insights?.performanceAnalysis
      },
      processingStats: {
        totalProcessingTime: 0, // Will be set by orchestrator
        pagesDiscovered: analyzedPages.length,
        pagesAnalyzed: analyzedPages.length,
        aiCallsMade: insights?.aiInsights?.aiCallsMade || 0,
        creditsUsed: insights?.aiInsights?.creditsUsed || 0
      }
    };

    // Only report completion after everything is saved and ready
    await reportAnalysisCompletion(context, finalResult);

    return finalResult;

  } catch (error) {
    console.error(`Error aggregating results for ${context.domain}:`, error);
    throw error;
  }
}

/**
 * Calculate aggregate metrics from analyzed pages
 */
function calculateAggregateMetrics(analyzedPages: PageAnalysisResult[]) {
  
  if (analyzedPages.length === 0) {
    return {
      goodPractices: 0,
      warnings: 0,
      criticalIssues: 0,
      titleOptimization: 0,
      descriptionOptimization: 0,
      headingsOptimization: 0,
      imagesOptimization: 0,
      linksOptimization: 0
    };
  }

  let titleOptimization = 0;
  let descriptionOptimization = 0;
  let headingsOptimization = 0;
  let imagesOptimization = 0;
  let linksOptimization = 0;

  let totalGoodPractices = 0;
  let totalWarnings = 0;
  let totalCriticalIssues = 0;

  analyzedPages.forEach(page => {
    // Title optimization
    if (page.title && page.title.length >= 30 && page.title.length <= 60) {
      titleOptimization++;
    }

    // Description optimization
    if (page.metaDescription && page.metaDescription.length >= 120 && page.metaDescription.length <= 160) {
      descriptionOptimization++;
    }

    // Headings optimization
    const h1Count = page.headings.filter(h => h.level === 1).length;
    if (h1Count === 1 && page.headings.length >= 3) {
      headingsOptimization++;
    }

    // Images optimization
    const imagesWithAlt = page.images.filter(img => img.alt && img.alt.trim().length > 0).length;
    if (page.images.length === 0 || imagesWithAlt / page.images.length >= 0.8) {
      imagesOptimization++;
    }

    // Links optimization (basic internal linking)
    if (page.internalLinks && page.internalLinks.length >= 2) {
      linksOptimization++;
    }

    // Count issues by severity
    page.issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          totalCriticalIssues++;
          break;
        case 'warning':
          totalWarnings++;
          break;
        case 'info':
          totalGoodPractices++;
          break;
      }
    });
  });

  return {
    goodPractices: totalGoodPractices,
    warnings: totalWarnings,
    criticalIssues: totalCriticalIssues,
    titleOptimization,
    descriptionOptimization,
    headingsOptimization,
    imagesOptimization,
    linksOptimization
  };
}