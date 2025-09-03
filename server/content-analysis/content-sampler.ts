/**
 * Hierarchical Processing Pipeline  
 * Orchestrates content analysis in priority order: titles → descriptions → headings → content
 */

import OpenAI from 'openai';
import { ExtractedContent, ContentStats, calculateContentStats } from './content-preprocessor.js';
import { detectDuplicates, SimilarityOptions, DuplicateAnalysisResult } from './similarity-detector.js';
import { 
  createTokenBudget, 
  createAnalysisBatches, 
  analyzeContentBatch, 
  AIAnalysisOptions 
} from './token-manager.js';
import { 
  sampleContent, 
  determineSamplingStrategy, 
  SamplingResult 
} from './sampling-strategy.js';
import { ContentDuplicationAnalysis, DuplicateItem } from '../../shared/schema.js';

export interface ProcessingOptions {
  maxTotalTokens: number;
  useAIAnalysis: boolean;
  prioritizeByImpact: boolean;
  similarityOptions: SimilarityOptions;
  aiOptions: AIAnalysisOptions;
}

export interface ProcessingResult {
  analysis: ContentDuplicationAnalysis;
  performance: {
    totalProcessingTime: number;
    tokensUsed: number;
    samplingStats: Record<string, SamplingResult>;
    aiCallsMade: number;
  };
}

export const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  maxTotalTokens: 15000,
  useAIAnalysis: true,
  prioritizeByImpact: true,
  similarityOptions: {
    exactMatchThreshold: 100,
    fuzzyMatchThreshold: 85,
    semanticThreshold: 75,
    minContentLength: 10
  },
  aiOptions: {
    model: "gpt-4.1",
    temperature: 0.3,
    maxTokensPerRequest: 4000,
    batchSize: 15,
    prioritizeByImpact: true
  }
};

/**
 * Main hierarchical processing pipeline
 */
export async function processContentHierarchically(
  extractedContent: ExtractedContent,
  openai: OpenAI,
  options: ProcessingOptions = DEFAULT_PROCESSING_OPTIONS
): Promise<ProcessingResult> {
  
  const startTime = Date.now();
  let tokensUsed = 0;
  let aiCallsMade = 0;
  const samplingStats: Record<string, SamplingResult> = {};

  // Initialize analysis structure
  const analysis: ContentDuplicationAnalysis = {
    titleRepetition: createEmptyRepetitionAnalysis(),
    descriptionRepetition: createEmptyRepetitionAnalysis(),
    headingRepetition: createEmptyHeadingAnalysis(),
    paragraphRepetition: createEmptyRepetitionAnalysis(),
    overallRecommendations: []
  };

  // Processing order by SEO impact priority
  const processingSteps = [
    { type: 'titles' as const, content: extractedContent.titles, priority: 1 },
    { type: 'descriptions' as const, content: extractedContent.descriptions, priority: 2 },
    { type: 'headings' as const, content: extractedContent.headings.h1, priority: 3 },
    { type: 'paragraphs' as const, content: extractedContent.paragraphs, priority: 4 }
  ];

  // Calculate remaining token budget
  let remainingTokens = options.maxTotalTokens;

  for (const step of processingSteps) {
    if (remainingTokens <= 0) {
      console.log(`Token budget exhausted, skipping ${step.type} analysis`);
      break;
    }

    console.log(`Processing ${step.type} (${step.content.length} items)...`);
    
    try {
      const stepResult = await processContentType(
        step.type,
        step.content,
        remainingTokens,
        openai,
        options
      );

      // Update analysis with results
      updateAnalysisWithResults(analysis, step.type, stepResult.duplicateAnalysis);
      
      // Update performance tracking
      tokensUsed += stepResult.tokensUsed;
      aiCallsMade += stepResult.aiCallsMade;
      remainingTokens = Math.max(0, remainingTokens - stepResult.tokensUsed);
      
      if (stepResult.samplingResult) {
        samplingStats[step.type] = stepResult.samplingResult;
      }

      console.log(`Completed ${step.type}: ${stepResult.duplicateAnalysis.duplicateGroups.length} duplicate groups found`);
      
    } catch (error) {
      console.error(`Error processing ${step.type}:`, error);
      // Continue with next content type
    }
  }

  // Process H2-H6 headings if we have remaining tokens and content
  if (remainingTokens > 1000) {
    console.log(`Processing remaining heading levels with ${analysis.headingRepetition.examples?.length || 0} existing examples`);
    await processRemainingHeadings(
      extractedContent.headings,
      analysis.headingRepetition,
      remainingTokens,
      openai,
      options
    );
    console.log(`After processing remaining headings: ${analysis.headingRepetition.examples?.length || 0} total examples`);
  }

  // Generate overall recommendations
  analysis.overallRecommendations = generateOverallRecommendations(analysis, extractedContent.totalPages);

  const totalProcessingTime = Date.now() - startTime;

  return {
    analysis,
    performance: {
      totalProcessingTime,
      tokensUsed,
      samplingStats,
      aiCallsMade
    }
  };
}

/**
 * Process a specific content type with sampling and AI analysis
 */
async function processContentType(
  type: 'titles' | 'descriptions' | 'headings' | 'paragraphs',
  content: any[],
  tokenBudget: number,
  openai: OpenAI,
  options: ProcessingOptions
): Promise<{
  duplicateAnalysis: DuplicateAnalysisResult;
  tokensUsed: number;
  aiCallsMade: number;
  samplingResult?: SamplingResult;
}> {
  
  if (content.length === 0) {
    return {
      duplicateAnalysis: {
        duplicateGroups: [],
        duplicateCount: 0,
        totalAnalyzed: 0,
        examples: [],
        stats: { exactMatches: 0, fuzzyMatches: 0, semanticMatches: 0 }
      },
      tokensUsed: 0,
      aiCallsMade: 0
    };
  }

  // Step 1: Calculate content statistics
  const contentStats = calculateContentStats(content);
  
  // Step 2: Determine if sampling is needed
  const samplingStrategy = determineSamplingStrategy(contentStats, content.length);
  const samplingResult = sampleContent(content, samplingStrategy, type);
  
  console.log(`${type}: sampled ${samplingResult.sampled.length}/${content.length} items (${samplingResult.representativeness}% representative)`);

  // Step 3: Rule-based duplicate detection (fast, no tokens)
  const duplicateAnalysis = detectDuplicates(samplingResult.sampled, options.similarityOptions);
  
  let tokensUsed = 0;
  let aiCallsMade = 0;

  // Step 4: AI enhancement if enabled and we have budget
  if (options.useAIAnalysis && tokenBudget > 500 && duplicateAnalysis.duplicateGroups.length > 0) {
    try {
      const budget = createTokenBudget(contentStats);
      budget.availableTokens = Math.min(budget.availableTokens, tokenBudget);
      
      const batches = createAnalysisBatches(samplingResult.sampled, type, budget, options.aiOptions);
      
      for (const batch of batches) {
        if (tokensUsed >= tokenBudget) break;
        
        const aiResults = await analyzeContentBatch(batch, openai, options.aiOptions);
        
        // Merge AI insights with rule-based results
        mergeAIInsights(duplicateAnalysis.duplicateGroups, aiResults);
        
        tokensUsed += batch.estimatedTokens;
        aiCallsMade++;
        
        // Add small delay between AI calls
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (aiError) {
      console.warn(`AI analysis failed for ${type}, using rule-based results only:`, aiError);
    }
  }

  return {
    duplicateAnalysis,
    tokensUsed,
    aiCallsMade,
    samplingResult
  };
}

/**
 * Process remaining heading levels (H2-H6) with simplified analysis
 */
async function processRemainingHeadings(
  headings: any,
  headingAnalysis: any,
  tokenBudget: number,
  openai: OpenAI,
  options: ProcessingOptions
): Promise<void> {
  
  const headingLevels = ['h2', 'h3', 'h4', 'h5', 'h6'];
  let tokensUsed = 0;

  for (const level of headingLevels) {
    if (tokensUsed >= tokenBudget) break;
    if (!headings[level] || headings[level].length === 0) continue;

    try {
      const levelDuplicates = detectDuplicates(headings[level], options.similarityOptions);
      headingAnalysis.byLevel[level] = levelDuplicates.duplicateGroups;
      headingAnalysis.repetitiveCount += levelDuplicates.duplicateCount;
      headingAnalysis.totalCount += levelDuplicates.totalAnalyzed;
      
      // FIX: Aggregate examples from each heading level
      if (levelDuplicates.examples && levelDuplicates.examples.length > 0) {
        headingAnalysis.examples = headingAnalysis.examples || [];
        console.log(`Found ${levelDuplicates.examples.length} examples for ${level}:`, levelDuplicates.examples.slice(0, 3));
        headingAnalysis.examples.push(...levelDuplicates.examples);
        // Keep only unique examples and limit to top 10
        headingAnalysis.examples = Array.from(new Set(headingAnalysis.examples)).slice(0, 10);
        console.log(`Total heading examples now: ${headingAnalysis.examples.length}`);
      }
      
      console.log(`Processed ${level}: ${levelDuplicates.duplicateGroups.length} duplicate groups`);
      
    } catch (error) {
      console.error(`Error processing ${level} headings:`, error);
    }
  }
}

/**
 * Update main analysis structure with processing results
 */
function updateAnalysisWithResults(
  analysis: ContentDuplicationAnalysis,
  type: 'titles' | 'descriptions' | 'headings' | 'paragraphs',
  results: DuplicateAnalysisResult
): void {
  
  let section: any;
  
  switch (type) {
    case 'titles':
      section = analysis.titleRepetition;
      break;
    case 'descriptions':
      section = analysis.descriptionRepetition;
      break;
    case 'headings':
      section = analysis.headingRepetition;
      break;
    case 'paragraphs':
      section = analysis.paragraphRepetition;
      break;
    default:
      console.error(`Unknown content type: ${type}`);
      return;
  }
  
  if (!section) {
    console.error(`Section not found for type: ${type}`);
    return;
  }
  
  section.repetitiveCount = results.duplicateCount;
  section.totalCount = results.totalAnalyzed;
  section.examples = results.examples;
  section.duplicateGroups = results.duplicateGroups;
  section.recommendations = generateRecommendationsForType(type, results);
}

/**
 * Merge AI insights with rule-based duplicate detection results
 */
function mergeAIInsights(ruleBasedGroups: DuplicateItem[], aiResults: DuplicateItem[]): void {
  // Create a map of existing groups by content similarity
  const groupMap = new Map<string, DuplicateItem>();
  
  ruleBasedGroups.forEach(group => {
    if (group.content && typeof group.content === 'string') {
      const key = group.content.toLowerCase().trim();
      groupMap.set(key, group);
    }
  });

  // Merge AI insights into existing groups or add new ones
  aiResults.forEach(aiGroup => {
    if (!aiGroup.content || typeof aiGroup.content !== 'string') {
      console.warn('AI group missing content property, skipping:', aiGroup);
      return;
    }
    
    const key = aiGroup.content.toLowerCase().trim();
    const existingGroup = groupMap.get(key);

    if (existingGroup) {
      // Enhance existing group with AI insights
      existingGroup.rootCause = aiGroup.rootCause || existingGroup.rootCause;
      existingGroup.improvementStrategy = aiGroup.improvementStrategy || existingGroup.improvementStrategy;
      existingGroup.impactLevel = aiGroup.impactLevel || existingGroup.impactLevel;
      existingGroup.priority = aiGroup.priority || existingGroup.priority;
    } else {
      // Add new group found by AI
      ruleBasedGroups.push(aiGroup);
    }
  });
}

/**
 * Generate content-type specific recommendations
 */
function generateRecommendationsForType(
  type: 'titles' | 'descriptions' | 'headings' | 'paragraphs',
  results: DuplicateAnalysisResult
): string[] {
  
  const recommendations: string[] = [];

  if (results.duplicateCount === 0) {
    recommendations.push(`Excellent! No duplicate ${type} detected.`);
    return recommendations;
  }

  // General recommendation
  recommendations.push(`Found ${results.duplicateCount} duplicate ${type} across ${results.duplicateGroups.length} groups`);

  // Type-specific recommendations
  switch (type) {
    case 'titles':
      recommendations.push('Create unique, descriptive titles for each page');
      recommendations.push('Include target keywords relevant to page content');
      if (results.stats.exactMatches > 0) {
        recommendations.push('Fix exact title duplicates immediately - these hurt SEO significantly');
      }
      break;

    case 'descriptions':
      recommendations.push('Write unique meta descriptions (150-160 characters) for each page');
      recommendations.push('Focus on compelling copy that encourages clicks');
      break;

    case 'headings':
      recommendations.push('Use descriptive headings that clearly indicate section content');
      recommendations.push('Maintain proper heading hierarchy (H1 → H2 → H3)');
      break;

    case 'paragraphs':
      recommendations.push('Ensure each page provides unique value to users');
      recommendations.push('Remove or differentiate boilerplate content');
      break;
  }

  return recommendations;
}

/**
 * Generate overall strategic recommendations
 */
function generateOverallRecommendations(
  analysis: ContentDuplicationAnalysis,
  totalPages: number
): string[] {
  
  const recommendations: string[] = [];
  
  const totalDuplicates = 
    analysis.titleRepetition.repetitiveCount +
    analysis.descriptionRepetition.repetitiveCount +
    analysis.headingRepetition.repetitiveCount +
    analysis.paragraphRepetition.repetitiveCount;

  if (totalDuplicates === 0) {
    recommendations.push(`Excellent content uniqueness across all ${totalPages} pages!`);
    return recommendations;
  }

  // Priority-based recommendations
  if (analysis.titleRepetition.repetitiveCount > 0) {
    recommendations.push(`🔥 CRITICAL: Fix ${analysis.titleRepetition.repetitiveCount} duplicate titles first - highest SEO impact`);
  }

  if (analysis.descriptionRepetition.repetitiveCount > 0) {
    recommendations.push(`⚡ HIGH: Address ${analysis.descriptionRepetition.repetitiveCount} duplicate meta descriptions - affects click-through rates`);
  }

  if (analysis.headingRepetition.repetitiveCount > 0) {
    recommendations.push(`📋 MEDIUM: Review ${analysis.headingRepetition.repetitiveCount} duplicate headings - improve content structure`);
  }

  // Strategic insights
  const duplicateRatio = (totalDuplicates / totalPages) * 100;
  if (duplicateRatio > 30) {
    recommendations.push('Consider implementing template-based content generation with unique variables');
  } else if (duplicateRatio > 15) {
    recommendations.push('Focus on making landing pages and product pages more distinctive');
  }

  recommendations.push(`Overall: ${totalDuplicates} content issues found across ${totalPages} pages (${Math.round(duplicateRatio)}% duplication rate)`);

  return recommendations;
}

/**
 * Helper functions for creating empty analysis structures
 */
function createEmptyRepetitionAnalysis() {
  return {
    repetitiveCount: 0,
    totalCount: 0,
    examples: [],
    recommendations: [],
    duplicateGroups: []
  };
}

function createEmptyHeadingAnalysis() {
  return {
    repetitiveCount: 0,
    totalCount: 0,
    examples: [],
    recommendations: [],
    duplicateGroups: [],
    byLevel: {
      h1: [], h2: [], h3: [], h4: [], h5: [], h6: []
    }
  };
}