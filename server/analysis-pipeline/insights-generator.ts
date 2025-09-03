/**
 * Insights Generator Module
 * Handles AI-powered suggestion generation and business context analysis
 */

import { generateSeoSuggestions, analyzeSiteOverview } from '../openai.js';
import { deductAICredits } from './quota-manager.js';
import { emitAIProgress } from './progress-tracker.js';
import type { AnalysisContext, AnalysisOptions } from './analysis-orchestrator.js';
import type { PageAnalysisResult } from './page-analyzer.js';

export interface InsightsResult {
  siteOverview?: any;
  enhancedPages: PageAnalysisResult[];
  totalAISuggestionsGenerated: number;
  aiCallsMade: number;
  creditsUsed: number;
}

/**
 * Generate comprehensive insights for analyzed pages
 */
export async function generateComprehensiveInsights(
  context: AnalysisContext,
  analyzedPages: PageAnalysisResult[],
  options: AnalysisOptions
): Promise<InsightsResult> {
  
  const { settings } = context;
  let siteOverview: any = undefined;
  let totalAISuggestionsGenerated = 0;
  let aiCallsMade = 0;
  let creditsUsed = 0;

  if (!settings.useAI || analyzedPages.length === 0) {
    return {
      siteOverview,
      enhancedPages: analyzedPages,
      totalAISuggestionsGenerated: 0,
      aiCallsMade: 0,
      creditsUsed: 0
    };
  }

  try {
    // Emit progress update for AI analysis start (40% progress)
    emitAIProgress(context, analyzedPages.length, analyzedPages, 'Generating AI-powered SEO suggestions...', 0);

    console.log(`Analyzing site overview and generating SEO suggestions for ${context.domain}...`);

    // Step 1: Generate business context analysis
    const businessContext = await generateBusinessContext(analyzedPages, options.additionalInfo);
    siteOverview = businessContext.siteOverview;
    aiCallsMade += businessContext.aiCallsMade;

    console.log(`Business context detected - Industry: ${siteOverview.industry}, Type: ${siteOverview.businessType}, Target: ${siteOverview.targetAudience}`);

    // Step 2: Generate page-specific suggestions
    const suggestionResults = await generatePageSuggestions(
      context,
      analyzedPages,
      siteOverview,
      options.additionalInfo
    );

    totalAISuggestionsGenerated = suggestionResults.totalSuggestions;
    aiCallsMade += suggestionResults.aiCallsMade;
    creditsUsed = suggestionResults.creditsUsed;

    console.log(`Generated ${totalAISuggestionsGenerated} AI suggestions across ${analyzedPages.length} pages`);

    return {
      siteOverview,
      enhancedPages: suggestionResults.enhancedPages,
      totalAISuggestionsGenerated,
      aiCallsMade,
      creditsUsed
    };

  } catch (error) {
    console.error('Error generating insights:', error);
    
    return {
      siteOverview,
      enhancedPages: analyzedPages,
      totalAISuggestionsGenerated,
      aiCallsMade,
      creditsUsed
    };
  }
}

/**
 * Generate business context and site overview
 */
async function generateBusinessContext(
  analyzedPages: PageAnalysisResult[],
  additionalInfo?: string
): Promise<{ siteOverview: any; aiCallsMade: number }> {
  
  try {
    // Build site structure for analysis
    const siteStructure = {
      allPages: analyzedPages.map(page => ({
        url: page.url,
        title: page.title,
        headings: page.headings,
        metaDescription: page.metaDescription,
        paragraphs: page.paragraphs
      }))
    };

    console.log(`Generating business context analysis...`);
    const siteOverview = await analyzeSiteOverview(siteStructure, additionalInfo);
    
    return {
      siteOverview,
      aiCallsMade: 1
    };
    
  } catch (error) {
    console.error('Error generating business context:', error);
    
    return {
      siteOverview: {
        businessType: 'Unknown',
        industry: 'Unknown',
        targetAudience: 'Unknown',
        mainServices: []
      },
      aiCallsMade: 0
    };
  }
}

/**
 * Generate AI suggestions for pages in batches
 */
async function generatePageSuggestions(
  context: AnalysisContext,
  analyzedPages: PageAnalysisResult[],
  siteOverview: any,
  additionalInfo?: string
): Promise<{
  enhancedPages: PageAnalysisResult[];
  totalSuggestions: number;
  aiCallsMade: number;
  creditsUsed: number;
}> {
  
  let totalSuggestions = 0;
  let aiCallsMade = 0;
  let creditsUsed = 0;
  
  // Pre-calculate which pages will get AI suggestions to avoid race conditions
  const pagesWithAI = context.isTrialUser 
    ? analyzedPages.slice(0, context.aiSuggestionsRemaining)
    : analyzedPages; // For paid users, we'll check credits in real-time

  console.log(`Will generate AI suggestions for ${pagesWithAI.length} out of ${analyzedPages.length} pages`);

  // Build site structure for context
  const siteStructure = {
    allPages: analyzedPages.map(page => ({
      url: page.url,
      title: page.title,
      headings: page.headings,
      metaDescription: page.metaDescription,
      paragraphs: page.paragraphs
    }))
  };

  // Generate suggestions in batches
  const batchSize = 3;
  const enhancedPages = [...analyzedPages]; // Copy array to modify

  for (let i = 0; i < analyzedPages.length; i += batchSize) {
    const batch = analyzedPages.slice(i, i + batchSize);

    // Emit progress update for suggestion generation (40-80% progress)
    const progressWithinAI = i / analyzedPages.length;
    emitAIProgress(
      context, 
      analyzedPages.length, 
      analyzedPages, 
      `Generating suggestions for ${batch.map(p => p.url).join(', ')}...`,
      progressWithinAI
    );

    // Process batch in parallel
    const batchPromises = batch.map(async (page, batchIndex) => {
      const pageIndex = i + batchIndex;
      return generatePageSpecificSuggestions(
        context,
        enhancedPages[pageIndex],
        siteStructure,
        siteOverview,
        additionalInfo,
        pagesWithAI
      );
    });

    const batchResults = await Promise.all(batchPromises);
    
    // Update statistics
    batchResults.forEach(result => {
      if (result) {
        totalSuggestions += result.suggestionsCount;
        aiCallsMade += result.aiCallsMade;
        creditsUsed += result.creditsUsed;
      }
    });

    // Add delay between batches
    if (i + batchSize < analyzedPages.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return {
    enhancedPages,
    totalSuggestions,
    aiCallsMade,
    creditsUsed
  };
}

/**
 * Generate suggestions for a specific page
 */
async function generatePageSpecificSuggestions(
  context: AnalysisContext,
  page: PageAnalysisResult,
  siteStructure: any,
  siteOverview: any,
  additionalInfo?: string,
  pagesWithAI?: PageAnalysisResult[]
): Promise<{ suggestionsCount: number; aiCallsMade: number; creditsUsed: number } | null> {
  
  try {
    // Check if this page should get AI suggestions
    let shouldGetAI = false;
    let creditResult = null;

    if (context.isTrialUser) {
      shouldGetAI = pagesWithAI?.includes(page) || false;
    } else if (context.userId) {
      creditResult = await deductAICredits(context.userId, context.isTrialUser, 1);
      shouldGetAI = creditResult.success;
      if (!creditResult.success) {
        console.log(`Insufficient credits for AI suggestions on page ${page.url}, skipping`);
      }
    }

    if (!shouldGetAI) {
      return { suggestionsCount: 0, aiCallsMade: 0, creditsUsed: 0 };
    }

    // Prepare page data for AI analysis
    const pageData = {
      url: page.url,
      title: page.title,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      headings: page.headings,
      images: page.images.map(img => ({
        src: img.src,
        alt: img.alt
      })),
      issues: page.issues.map(issue => ({
        category: issue.category,
        severity: issue.severity,
        title: issue.title,
        description: issue.description
      })),
      paragraphs: page.paragraphs ? page.paragraphs.slice(0, 15) : [],
      internalLinks: page.internalLinks,
      ctaElements: page.ctaElements
    };

    console.log(`Generating suggestions for page: ${page.url}`);
    const suggestions = await generateSeoSuggestions(
      page.url, 
      pageData, 
      siteStructure, 
      siteOverview, 
      additionalInfo
    );

    if (Array.isArray(suggestions) && suggestions.length > 0) {
      // Handle suggestions based on user type
      if (context.isTrialUser) {
        const limitedSuggestions = suggestions.slice(0, 5);
        page.suggestions = limitedSuggestions;

        if (suggestions.length > 5) {
          const remainingSuggestions = suggestions.length - 5;
          page.suggestionsTeaser = `${remainingSuggestions} additional insights available with paid credits`;
          console.log(`Generated ${limitedSuggestions.length} suggestions for trial user (${remainingSuggestions} more available)`);
        } else {
          console.log(`Generated ${limitedSuggestions.length} suggestions for trial user`);
        }

        return {
          suggestionsCount: limitedSuggestions.length,
          aiCallsMade: 1,
          creditsUsed: 0 // Trial users don't deduct per page
        };
      } else {
        // Paid users get all suggestions
        page.suggestions = suggestions;
        console.log(`Generated ${suggestions.length} suggestions for paid user`);

        return {
          suggestionsCount: suggestions.length,
          aiCallsMade: 1,
          creditsUsed: 1
        };
      }
    } else {
      console.warn(`No suggestions generated for ${page.url}, refunding credit if needed`);
      
      // Refund credit for failed AI generation (paid users only)
      if (!context.isTrialUser && creditResult?.success && context.userId) {
        const { storage } = await import('../storage.js');
        await storage.refundCredits(context.userId, 1, `No suggestions generated for ${page.url}`);
      }

      return { suggestionsCount: 0, aiCallsMade: 1, creditsUsed: 0 };
    }

  } catch (error) {
    console.error(`Error generating suggestions for ${page.url}:`, error);
    
    // Refund credit for failed AI generation (paid users only)
    if (!context.isTrialUser && context.userId) {
      const { storage } = await import('../storage.js');
      await storage.refundCredits(context.userId, 1, `Failed to generate suggestions for ${page.url}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { suggestionsCount: 0, aiCallsMade: 1, creditsUsed: 0 };
  }
}