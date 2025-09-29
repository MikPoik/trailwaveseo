/**
 * Progress Tracker Module
 * Handles progress reporting and event management for analysis pipeline
 */

import type { EventEmitter } from 'events';
import type { AnalysisContext, AnalysisResult } from './analysis-orchestrator.js';

// Store ongoing analyses to allow cancellation
const ongoingAnalyses = new Map<string, AbortController>();

export interface ProgressUpdate {
  status: 'in-progress' | 'completed' | 'error' | 'cancelled';
  domain: string;
  pagesFound: number;
  pagesAnalyzed: number;
  currentPageUrl: string;
  analyzedPages: string[];
  percentage: number;
  basicSeoData?: any[];
  error?: string;
}

/**
 * Register an ongoing analysis for cancellation tracking
 */
export function registerAnalysis(domain: string, controller: AbortController): void {
  ongoingAnalyses.set(domain, controller);
}

/**
 * Clean up analysis tracking
 */
export function cleanupAnalysis(domain: string): void {
  ongoingAnalyses.delete(domain);
}

/**
 * Cancel an ongoing analysis
 */
export function cancelAnalysis(domain: string): boolean {
  const controller = ongoingAnalyses.get(domain);
  if (controller) {
    console.log(`Cancelling analysis for domain: ${domain}`);
    controller.abort();
    
    // Emit cancellation event
    const update: ProgressUpdate = {
      status: 'cancelled',
      domain,
      pagesFound: 0,
      pagesAnalyzed: 0,
      currentPageUrl: 'Analysis cancelled by user',
      analyzedPages: [],
      percentage: 0
    };
    
    // We need to emit to all possible event emitters
    // The specific emitter will be handled in the orchestrator
    cleanupAnalysis(domain);
    return true;
  }
  return false;
}

/**
 * Emit page analysis progress update
 */
export function emitPageProgress(
  context: AnalysisContext,
  totalPages: number,
  analyzedPages: any[],
  currentPageUrl: string = ''
): void {
  
  // Calculate progress (10-40% for page analysis)
  const analysisProgress = 10 + Math.floor((analyzedPages.length / totalPages) * 30);
  
  const update: ProgressUpdate = {
    status: 'in-progress',
    domain: context.domain,
    pagesFound: totalPages,
    pagesAnalyzed: analyzedPages.length,
    currentPageUrl,
    analyzedPages: analyzedPages.map(p => p.url),
    percentage: analysisProgress
  };
  
  context.events.emit(context.domain, update);
}

/**
 * Emit AI insights generation progress update
 */
export function emitAIProgress(
  context: AnalysisContext,
  totalPages: number,
  analyzedPages: any[],
  currentOperation: string,
  progressWithinAI: number = 0
): void {
  
  // AI processing is 40-80% of total progress
  const baseProgress = 40;
  const aiProgress = Math.floor(progressWithinAI * 40);
  const totalProgress = baseProgress + aiProgress;
  
  const update: ProgressUpdate = {
    status: 'in-progress',
    domain: context.domain,
    pagesFound: totalPages,
    pagesAnalyzed: analyzedPages.length,
    currentPageUrl: currentOperation,
    analyzedPages: analyzedPages.map(p => p.url),
    percentage: Math.min(80, totalProgress)
  };
  
  context.events.emit(context.domain, update);
}

/**
 * Emit content quality analysis progress update
 */
export function emitContentQualityProgress(
  context: AnalysisContext,
  totalPages: number,
  analyzedPages: any[],
  currentOperation: string = 'Analyzing content quality...'
): void {
  
  const update: ProgressUpdate = {
    status: 'in-progress',
    domain: context.domain,
    pagesFound: totalPages,
    pagesAnalyzed: analyzedPages.length,
    currentPageUrl: currentOperation,
    analyzedPages: analyzedPages.map(p => p.url),
    percentage: 70 // Content quality analysis happens after design
  };
  
  context.events.emit(context.domain, update);
}

/**
 * Emit technical analysis progress update
 */
export function emitTechnicalProgress(
  context: AnalysisContext,
  totalPages: number,
  analyzedPages: any[],
  currentOperation: string = 'Running technical SEO analysis...'
): void {
  
  const update: ProgressUpdate = {
    status: 'in-progress',
    domain: context.domain,
    pagesFound: totalPages,
    pagesAnalyzed: analyzedPages.length,
    currentPageUrl: currentOperation,
    analyzedPages: analyzedPages.map(p => p.url),
    percentage: 75 // Technical analysis
  };
  
  context.events.emit(context.domain, update);
}

/**
 * Emit link architecture analysis progress update
 */
export function emitLinkArchitectureProgress(
  context: AnalysisContext,
  totalPages: number,
  analyzedPages: any[],
  currentOperation: string = 'Analyzing link architecture...'
): void {
  
  const update: ProgressUpdate = {
    status: 'in-progress',
    domain: context.domain,
    pagesFound: totalPages,
    pagesAnalyzed: analyzedPages.length,
    currentPageUrl: currentOperation,
    analyzedPages: analyzedPages.map(p => p.url),
    percentage: 80 // Link architecture analysis
  };
  
  context.events.emit(context.domain, update);
}

/**
 * Emit performance analysis progress update
 */
export function emitPerformanceProgress(
  context: AnalysisContext,
  totalPages: number,
  analyzedPages: any[],
  currentOperation: string = 'Analyzing performance metrics...'
): void {
  
  const update: ProgressUpdate = {
    status: 'in-progress',
    domain: context.domain,
    pagesFound: totalPages,
    pagesAnalyzed: analyzedPages.length,
    currentPageUrl: currentOperation,
    analyzedPages: analyzedPages.map(p => p.url),
    percentage: 85 // Performance analysis
  };
  
  context.events.emit(context.domain, update);
}

/**
 * Emit AI explanations generation progress update
 */
export function emitAIExplanationsProgress(
  context: AnalysisContext,
  totalPages: number,
  analyzedPages: any[],
  currentOperation: string = 'Generating AI explanations...'
): void {
  
  const update: ProgressUpdate = {
    status: 'in-progress',
    domain: context.domain,
    pagesFound: totalPages,
    pagesAnalyzed: analyzedPages.length,
    currentPageUrl: currentOperation,
    analyzedPages: analyzedPages.map(p => p.url),
    percentage: 90 // AI explanations generation
  };
  
  context.events.emit(context.domain, update);
}

/**
 * Emit design analysis progress update
 */
export function emitDesignProgress(
  context: AnalysisContext,
  totalPages: number,
  analyzedPages: any[],
  currentOperation: string = 'Analyzing Design...'
): void {
  
  const update: ProgressUpdate = {
    status: 'in-progress',
    domain: context.domain,
    pagesFound: totalPages,
    pagesAnalyzed: analyzedPages.length,
    currentPageUrl: currentOperation,
    analyzedPages: analyzedPages.map(p => p.url),
    percentage: 60 // Design analysis happens within insights generation
  };
  
  context.events.emit(context.domain, update);
}

/**
 * Emit final processing progress update
 */
export function emitFinalProgress(
  context: AnalysisContext,
  totalPages: number,
  analyzedPages: any[],
  operation: string = 'Saving analysis results...'
): void {
  
  const update: ProgressUpdate = {
    status: 'in-progress',
    domain: context.domain,
    pagesFound: totalPages,
    pagesAnalyzed: analyzedPages.length,
    currentPageUrl: operation,
    analyzedPages: analyzedPages.map(p => p.url),
    percentage: 98 // Higher percentage to show we're almost done but not complete
  };
  
  context.events.emit(context.domain, update);
}

/**
 * Report successful analysis completion
 */
export async function reportAnalysisCompletion(
  context: AnalysisContext,
  result: AnalysisResult
): Promise<void> {
  
  const completionUpdate: ProgressUpdate & { analysis?: AnalysisResult } = {
    status: 'completed',
    domain: context.domain,
    pagesFound: result.pages.length,
    pagesAnalyzed: result.pages.length,
    currentPageUrl: 'Analysis completed successfully',
    analyzedPages: result.pages.map(p => p.url),
    percentage: 100,
    analysis: result // Include the full analysis data that frontend expects
  };
  
  console.log(`[PROGRESS] Emitting completion event for domain: ${context.domain}`);
  console.log(`[PROGRESS] Completion data keys:`, Object.keys(completionUpdate));
  console.log(`[PROGRESS] Analysis result keys:`, Object.keys(result));
  console.log(`[PROGRESS] Completion with analysis data - pages: ${result.pages.length}, enhancedInsights:`, !!result.enhancedInsights);
  
  // Emit the completion event
  context.events.emit(context.domain, completionUpdate);
  console.log(`[PROGRESS] Completion event emitted for ${context.domain} - ${result.pages.length} pages analyzed`);
  
  // Add a longer delay to ensure SSE processes the event
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Handle analysis errors with proper event emission
 */
export async function handleAnalysisError(
  domain: string,
  events: EventEmitter,
  error: any
): Promise<void> {
  
  const errorUpdate: ProgressUpdate = {
    status: 'error',
    domain,
    pagesFound: 0,
    pagesAnalyzed: 0,
    currentPageUrl: '',
    analyzedPages: [],
    percentage: 0,
    error: error instanceof Error ? error.message : String(error)
  };
  
  events.emit(domain, errorUpdate);
  console.error(`Analysis failed for ${domain}:`, error);
}