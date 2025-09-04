/**
 * Content Duplication Analysis Module
 * Handles enhanced AI-powered content duplication detection and analysis
 */

import OpenAI from "openai";
import { ContentDuplicationAnalysis, DuplicateItem } from '@shared/schema';
import { extractPageContent } from './content-preprocessor.js';
import { processContentHierarchically, DEFAULT_PROCESSING_OPTIONS } from './content-sampler.js';
import { analyzeContentQuality } from './content-quality-scorer.js';

/**
 * Analyze content repetition across website pages using enhanced AI analysis
 * @param pages Array of page analysis results
 * @returns Content duplication analysis with AI-powered insights
 */
export async function analyzeContentRepetition(pages: Array<any>): Promise<ContentDuplicationAnalysis> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, returning basic content repetition analysis");
      return generateBasicContentAnalysis(pages);
    }

    console.log(`Starting enhanced content duplication analysis across ${pages.length} pages...`);

    // Extract content using the enhanced preprocessor
    const extractedContent = extractPageContent(pages);
    
    // Initialize OpenAI client 
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Use enhanced processing options with template and intent detection
    const processingOptions = {
      ...DEFAULT_PROCESSING_OPTIONS,
      useEnhancedAnalysis: true,
      maxTotalTokens: 12000, // Increased for more thorough analysis
      enhancedOptions: {
        useAI: true,
        model: "gpt-4o-mini",
        temperature: 0.2,
        maxTokensPerRequest: 2500,
        batchSize: 15,
        enableTemplateDetection: true,
        enableIntentAnalysis: true,
        enableContentCategorization: true
      }
    };

    console.log(`Processing content hierarchically with enhanced AI analysis...`);
    
    // Run enhanced hierarchical processing
    const processingResult = await processContentHierarchically(
      extractedContent,
      openai,
      processingOptions
    );

    console.log(`Enhanced analysis complete. Processing time: ${processingResult.performance.totalProcessingTime}ms, AI calls: ${processingResult.performance.aiCallsMade}, tokens used: ${processingResult.performance.tokensUsed}`);

    // Enhance with quality analysis for additional insights
    if (extractedContent.titles.length > 0) {
      console.log(`Running quality analysis on titles for additional insights...`);
      try {
        const titleQuality = await analyzeContentQuality(
          extractedContent.titles.slice(0, 10), // Limit for cost control
          'titles',
          openai,
          { 
            model: "gpt-4o-mini",
            temperature: 0.2,
            maxTokensPerRequest: 2000,
            batchSize: 8,
            enableDetailedAnalysis: true 
          }
        );
        
        // Merge quality insights into recommendations
        if (titleQuality.strategicInsights.length > 0) {
          processingResult.analysis.overallRecommendations.push(
            ...titleQuality.strategicInsights.slice(0, 2)
          );
        }
        
        console.log(`Quality analysis complete: Average title score ${titleQuality.summary.averageScores.overall}/100`);
        
      } catch (qualityError) {
        console.warn('Quality analysis failed, continuing with main analysis:', qualityError);
      }
    }

    // Add enhanced strategic recommendations
    const enhancedRecommendations = generateEnhancedRecommendations(
      processingResult.analysis,
      pages.length
    );
    
    processingResult.analysis.overallRecommendations.push(...enhancedRecommendations);

    console.log(`Enhanced content analysis complete: Found ${
      processingResult.analysis.titleRepetition.duplicateGroups.length + 
      processingResult.analysis.descriptionRepetition.duplicateGroups.length +
      processingResult.analysis.headingRepetition.duplicateGroups.length +
      processingResult.analysis.paragraphRepetition.duplicateGroups.length
    } duplicate groups with ${processingResult.analysis.overallRecommendations.length} strategic recommendations`);

    return processingResult.analysis;

  } catch (error) {
    console.error('Error in enhanced content repetition analysis:', error);
    return generateBasicContentAnalysis(pages);
  }
}

/**
 * Generate enhanced strategic recommendations based on analysis results
 */
function generateEnhancedRecommendations(
  analysis: ContentDuplicationAnalysis,
  totalPages: number
): string[] {
  const recommendations: string[] = [];
  
  // Analyze duplicate group patterns for template detection insights
  const allGroups = [
    ...analysis.titleRepetition.duplicateGroups,
    ...analysis.descriptionRepetition.duplicateGroups,
    ...analysis.headingRepetition.duplicateGroups,
    ...analysis.paragraphRepetition.duplicateGroups
  ];
  
  // Template pattern insights
  const templateGroups = allGroups.filter(g => g.duplicationType === 'template');
  if (templateGroups.length > 0) {
    recommendations.push(`🔍 TEMPLATE PATTERNS: ${templateGroups.length} template patterns detected. Consider diversifying content structure to avoid over-templating.`);
  }
  
  // Intent conflict insights
  const intentGroups = allGroups.filter(g => g.duplicationType === 'intent');
  if (intentGroups.length > 0) {
    recommendations.push(`⚡ INTENT CONFLICTS: ${intentGroups.length} pages competing for same user intent. Consolidate or differentiate these pages.`);
  }
  
  // Boilerplate content insights
  const boilerplateGroups = allGroups.filter(g => g.duplicationType === 'boilerplate');
  if (boilerplateGroups.length > 0) {
    recommendations.push(`📋 BOILERPLATE: ${boilerplateGroups.length} instances of boilerplate content. Focus on unique value propositions.`);
  }
  
  // High-impact recommendations for business strategy
  const criticalGroups = allGroups.filter(g => g.impactLevel === 'Critical');
  if (criticalGroups.length > 0) {
    recommendations.push(`🚨 PRIORITY: ${criticalGroups.length} critical content issues require immediate attention for SEO performance.`);
  }
  
  return recommendations;
}

/**
 * Generate basic content analysis without AI
 */
function generateBasicContentAnalysis(pages: Array<any>): ContentDuplicationAnalysis {
  // Simple rule-based analysis
  const titles = pages.map(p => p.title).filter(Boolean);
  const descriptions = pages.map(p => p.metaDescription).filter(Boolean);
  
  const titleDuplicates = findSimpleDuplicates(titles);
  const descriptionDuplicates = findSimpleDuplicates(descriptions);

  return {
    titleRepetition: {
      repetitiveCount: titleDuplicates.length,
      totalCount: titles.length,
      examples: titleDuplicates.slice(0, 3),
      recommendations: titleDuplicates.length > 0 ? [
        "Create unique, descriptive titles for each page",
        "Include target keywords naturally in titles",
        "Keep titles under 60 characters for better display"
      ] : ["Titles appear to be unique across pages"],
      duplicateGroups: titleDuplicates.map(title => ({
        content: title,
        urls: pages.filter(p => p.title === title).map(p => p.url),
        similarityScore: 100,
        impactLevel: 'Critical',
        improvementStrategy: 'Create unique, descriptive titles that reflect each page\'s specific content and purpose'
      }))
    },
    descriptionRepetition: {
      repetitiveCount: descriptionDuplicates.length,
      totalCount: descriptions.length,
      examples: descriptionDuplicates.slice(0, 3),
      recommendations: descriptionDuplicates.length > 0 ? [
        "Write unique meta descriptions for each page",
        "Include relevant keywords and compelling calls-to-action",
        "Keep descriptions between 150-160 characters"
      ] : ["Meta descriptions appear to be unique across pages"],
      duplicateGroups: descriptionDuplicates.map(desc => ({
        content: desc,
        urls: pages.filter(p => p.metaDescription === desc).map(p => p.url),
        similarityScore: 100,
        impactLevel: 'High',
        improvementStrategy: 'Write unique meta descriptions with relevant keywords and compelling calls-to-action'
      }))
    },
    headingRepetition: {
      repetitiveCount: 0,
      totalCount: 0,
      examples: [],
      recommendations: ["Manual review recommended for heading duplication analysis"],
      duplicateGroups: [],
      byLevel: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] }
    },
    paragraphRepetition: {
      repetitiveCount: 0,
      totalCount: 0,
      examples: [],
      recommendations: ["Manual review recommended for paragraph duplication analysis"],
      duplicateGroups: []
    },
    overallRecommendations: [
      "Review content for uniqueness across all pages",
      "Develop distinct value propositions for each page",
      "Consider AI-powered analysis for more detailed insights"
    ]
  };
}

/**
 * Find simple duplicates in an array of strings
 */
function findSimpleDuplicates(items: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  
  for (const item of items) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }
  
  return Array.from(duplicates);
}