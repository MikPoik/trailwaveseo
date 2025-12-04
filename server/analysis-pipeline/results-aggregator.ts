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
    const siteKeywordCloud = buildSiteKeywordCloud(analyzedPages);

    const analysisData = {
      userId: context.userId,
      domain: context.domain,
      date: new Date(),
      pagesCount: analyzedPages.length,
      metrics,
      siteKeywordCloud,
      pages: analyzedPages,
      contentRepetitionAnalysis: null, // Legacy field - keeping for compatibility
      keywordRepetitionAnalysis: null, // Legacy field - keeping for compatibility
      contentQualityAnalysis: insights?.contentQualityAnalysis || null, // New unified analysis
      competitorAnalysis: null, // Will be added in future enhancement
      siteOverview: insights?.aiInsights?.siteOverview || insights?.siteOverview || null,
      designAnalysis: insights?.designAnalysis || null, // Design analysis from screenshots
      isCompetitorAnalysis: options.isCompetitorAnalysis || false,
      enhancedInsights: {
        technicalAnalysis: insights?.technicalAnalysis,
        contentQualityAnalysis: insights?.contentQualityAnalysis,
        linkArchitectureAnalysis: insights?.linkArchitectureAnalysis,
        performanceAnalysis: insights?.performanceAnalysis,
        designAnalysis: insights?.designAnalysis
      }
    };

    // Save analysis to database with timeout protection
    console.log(`Saving analysis for ${context.domain}...`);
    
    let savedAnalysis;
    try {
      // Add 30 second timeout for database save
      savedAnalysis = await Promise.race([
        storage.saveAnalysis(analysisData as any),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database save timeout after 30 seconds')), 30000)
        )
      ]);
      
      console.log(`Analysis saved with ID: ${savedAnalysis.id}`);
    } catch (error) {
      console.error(`Error saving analysis for ${context.domain}:`, error);
      throw new Error(`Failed to save analysis: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!savedAnalysis || !savedAnalysis.id) {
      throw new Error('Failed to save analysis - no ID returned from database');
    }

    // Update user usage statistics
    await incrementUserUsage(context.userId, analyzedPages.length);

    console.log(`Updated user usage: +${analyzedPages.length} pages for user ${context.userId}`);

    // Prepare final result with complete data including enhanced insights
    const finalResult = {
      analysisId: savedAnalysis.id,
      id: savedAnalysis.id, // Also include id for frontend components
      domain: context.domain,
      siteKeywordCloud,
      pages: analyzedPages,
      metrics,
      siteOverview: insights?.aiInsights?.siteOverview || insights?.siteOverview,
      enhancedInsights: {
        technicalAnalysis: insights?.technicalAnalysis,
        contentQualityAnalysis: insights?.contentQualityAnalysis,
        linkArchitectureAnalysis: insights?.linkArchitectureAnalysis,
        performanceAnalysis: insights?.performanceAnalysis,
        designAnalysis: insights?.designAnalysis
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
 * Build a site-level keyword cloud by aggregating page keywordDensity arrays.
 * Returns top keywords with counts, average density and list of pages where they appear.
 */
function buildSiteKeywordCloud(analyzedPages: any[]) {
  const aggregate = new Map<string, { count: number; totalDensity: number; pages: Set<string> }>();
  let totalWordsAcrossPages = 0;

  analyzedPages.forEach(page => {
    const pageTotalWords = page.wordCount || 0;
    totalWordsAcrossPages += pageTotalWords;

    (page.keywordDensity || []).forEach((kw: any) => {
      const key = kw.keyword.toLowerCase();
      const existing = aggregate.get(key) || { count: 0, totalDensity: 0, pages: new Set<string>() };
      existing.count += kw.count || 0;
      existing.totalDensity += kw.density || 0;
      existing.pages.add(page.url);
      aggregate.set(key, existing);
    });
  });

  const keywords = Array.from(aggregate.entries()).map(([keyword, data]) => ({
    keyword,
    count: data.count,
    avgDensity: data.pages.size > 0 ? Math.round((data.totalDensity / data.pages.size) * 100) / 100 : 0,
    pages: Array.from(data.pages).slice(0, 10)
  }));

  // Sort by count descending, limit to top 30
  keywords.sort((a, b) => b.count - a.count);
  return keywords.slice(0, 30);
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