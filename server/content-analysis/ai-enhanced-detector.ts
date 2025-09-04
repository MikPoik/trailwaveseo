/**
 * AI-Enhanced Similarity Detector
 * Uses GPT-4.1-mini for intelligent template pattern detection and content categorization
 */

import OpenAI from 'openai';
import { ContentItem, ContentGroup } from './content-preprocessor.js';
import { 
  DuplicateItem, 
  TemplatePattern, 
  IntentAnalysis, 
  ContentCategory 
} from '../../shared/schema.js';

export interface EnhancedAnalysisOptions {
  useAI: boolean;
  model: string;
  temperature: number;
  maxTokensPerRequest: number;
  batchSize: number;
  enableTemplateDetection: boolean;
  enableIntentAnalysis: boolean;
  enableContentCategorization: boolean;
}

export const DEFAULT_ENHANCED_OPTIONS: EnhancedAnalysisOptions = {
  useAI: true,
  model: "gpt-4o-mini",
  temperature: 0.2,
  maxTokensPerRequest: 3000,
  batchSize: 20,
  enableTemplateDetection: true,
  enableIntentAnalysis: true,
  enableContentCategorization: true
};

export interface EnhancedAnalysisResult {
  duplicateGroups: DuplicateItem[];
  templatePatterns: TemplatePattern[];
  intentConflicts: IntentAnalysis[];
  contentCategories: Map<string, ContentCategory>;
  strategicInsights: string[];
  duplicateCount: number;
  totalAnalyzed: number;
  stats: {
    exactMatches: number;
    templateMatches: number;
    intentConflicts: number;
    boilerplateContent: number;
  };
}

/**
 * Enhanced duplicate detection using AI for pattern recognition
 */
export async function detectDuplicatesWithAI(
  content: ContentItem[],
  contentType: 'titles' | 'descriptions' | 'headings' | 'paragraphs',
  openai: OpenAI,
  options: EnhancedAnalysisOptions = DEFAULT_ENHANCED_OPTIONS
): Promise<EnhancedAnalysisResult> {
  
  if (content.length === 0 || !options.useAI) {
    return createEmptyEnhancedResult();
  }

  console.log(`AI-Enhanced Analysis: Processing ${content.length} ${contentType} items`);

  const result: EnhancedAnalysisResult = {
    duplicateGroups: [],
    templatePatterns: [],
    intentConflicts: [],
    contentCategories: new Map(),
    strategicInsights: [],
    duplicateCount: 0,
    totalAnalyzed: content.length,
    stats: {
      exactMatches: 0,
      templateMatches: 0,
      intentConflicts: 0,
      boilerplateContent: 0
    }
  };

  try {
    // Step 1: Find exact matches quickly (no AI needed)
    const exactMatches = findExactMatchesBasic(content);
    result.duplicateGroups.push(...exactMatches);
    result.stats.exactMatches = exactMatches.length;

    // Step 2: AI-powered template pattern detection
    if (options.enableTemplateDetection && content.length > 2) {
      console.log(`Analyzing template patterns for ${contentType}...`);
      const templatePatterns = await detectTemplatePatterns(content, contentType, openai, options);
      result.templatePatterns = templatePatterns;
      
      // Convert template patterns to duplicate groups
      const templateGroups = convertTemplatesToDuplicates(templatePatterns);
      result.duplicateGroups.push(...templateGroups);
      result.stats.templateMatches = templateGroups.length;
    }

    // Step 3: AI-powered content categorization
    if (options.enableContentCategorization) {
      console.log(`Categorizing ${contentType} content...`);
      const categories = await categorizeContent(content, contentType, openai, options);
      result.contentCategories = categories;
      result.stats.boilerplateContent = Array.from(categories.values())
        .filter(cat => cat.type === 'boilerplate').length;
    }

    // Step 4: Intent-based conflict detection (mainly for titles/descriptions)
    if (options.enableIntentAnalysis && (contentType === 'titles' || contentType === 'descriptions')) {
      console.log(`Analyzing intent conflicts for ${contentType}...`);
      const intentConflicts = await detectIntentConflicts(content, contentType, openai, options);
      result.intentConflicts = intentConflicts;
      result.stats.intentConflicts = intentConflicts.length;
    }

    // Step 5: Generate strategic insights
    result.strategicInsights = generateStrategicInsights(result, contentType);
    result.duplicateCount = result.duplicateGroups.reduce((sum, group) => 
      sum + (group.urls?.length || 0) - 1, 0);

    console.log(`AI-Enhanced Analysis Complete: Found ${result.duplicateGroups.length} duplicate groups, ${result.templatePatterns.length} template patterns, ${result.intentConflicts.length} intent conflicts`);

  } catch (error) {
    console.error(`AI-Enhanced analysis failed for ${contentType}:`, error);
    // Fallback to exact matches only
  }

  return result;
}

/**
 * Detect template patterns using AI
 */
async function detectTemplatePatterns(
  content: ContentItem[],
  contentType: string,
  openai: OpenAI,
  options: EnhancedAnalysisOptions
): Promise<TemplatePattern[]> {
  
  if (content.length < 3) return [];

  const batchSize = Math.min(options.batchSize, content.length);
  const batches = createContentBatches(content, batchSize);
  const patterns: TemplatePattern[] = [];

  for (const batch of batches.slice(0, 2)) { // Limit to 2 batches for cost control
    try {
      const prompt = createTemplateDetectionPrompt(batch, contentType);
      
      const response = await openai.chat.completions.create({
        model: options.model,
        messages: [
          {
            role: "system",
            content: `You are an SEO expert analyzing ${contentType} for template patterns. Identify content that follows similar patterns with only variable parts changing (like location names, product names, etc.). Respond only with valid JSON.`
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: options.temperature,
        max_completion_tokens: options.maxTokensPerRequest
      });

      const content_response = response.choices[0].message.content;
      if (!content_response) continue;

      const analysis = JSON.parse(content_response);
      if (analysis.patterns && Array.isArray(analysis.patterns)) {
        patterns.push(...analysis.patterns.filter(validateTemplatePattern));
      }
      
    } catch (error) {
      console.error(`Error detecting template patterns for batch:`, error);
    }
    
    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return patterns;
}

/**
 * Categorize content using AI
 */
async function categorizeContent(
  content: ContentItem[],
  contentType: string,
  openai: OpenAI,
  options: EnhancedAnalysisOptions
): Promise<Map<string, ContentCategory>> {
  
  const categories = new Map<string, ContentCategory>();
  const batchSize = Math.min(options.batchSize, content.length);
  const batches = createContentBatches(content, batchSize);

  for (const batch of batches.slice(0, 2)) { // Limit for cost control
    try {
      const prompt = createCategorizationPrompt(batch, contentType);
      
      const response = await openai.chat.completions.create({
        model: options.model,
        messages: [
          {
            role: "system",
            content: `You are an SEO expert categorizing ${contentType} by their purpose: boilerplate (repeated elements like headers/footers), navigation (menus/links), value (unique content for users), cta (call-to-action), template (pattern-based). Respond only with valid JSON.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: options.temperature,
        max_completion_tokens: options.maxTokensPerRequest
      });

      const content_response = response.choices[0].message.content;
      if (!content_response) continue;

      const analysis = JSON.parse(content_response);
      if (analysis.categories && Array.isArray(analysis.categories)) {
        analysis.categories.forEach((cat: any) => {
          if (cat.content && validateContentCategory(cat)) {
            categories.set(cat.content, {
              type: cat.type,
              confidence: cat.confidence,
              reason: cat.reason
            });
          }
        });
      }
      
    } catch (error) {
      console.error(`Error categorizing content for batch:`, error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return categories;
}

/**
 * Detect intent conflicts using AI
 */
async function detectIntentConflicts(
  content: ContentItem[],
  contentType: string,
  openai: OpenAI,
  options: EnhancedAnalysisOptions
): Promise<IntentAnalysis[]> {
  
  if (content.length < 3) return [];

  const conflicts: IntentAnalysis[] = [];
  const batchSize = Math.min(options.batchSize, content.length);
  const batches = createContentBatches(content, batchSize);

  for (const batch of batches.slice(0, 1)) { // Limit to 1 batch for cost control
    try {
      const prompt = createIntentAnalysisPrompt(batch, contentType);
      
      const response = await openai.chat.completions.create({
        model: options.model,
        messages: [
          {
            role: "system",
            content: `You are an SEO expert identifying pages that compete for the same user intent. Find ${contentType} that target the same search intent or user goal, even if worded differently. Respond only with valid JSON.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: options.temperature,
        max_completion_tokens: options.maxTokensPerRequest
      });

      const content_response = response.choices[0].message.content;
      if (!content_response) continue;

      const analysis = JSON.parse(content_response);
      if (analysis.conflicts && Array.isArray(analysis.conflicts)) {
        conflicts.push(...analysis.conflicts.filter(validateIntentAnalysis));
      }
      
    } catch (error) {
      console.error(`Error detecting intent conflicts for batch:`, error);
    }
  }

  return conflicts;
}

/**
 * Create prompts for different analysis types
 */
function createTemplateDetectionPrompt(content: ContentItem[], contentType: string): string {
  const contentList = content.slice(0, 15).map((item, i) => 
    `${i + 1}. "${item.content}" (URL: ${item.url})`
  ).join('\n');

  return `Analyze these ${contentType} for template patterns where only variable parts change:

${contentList}

Identify patterns like:
- "Services in [CITY]" where only city names change
- "[PRODUCT] - Free Shipping" where only product names change
- "About [COMPANY]" where only company names change

Respond with JSON format:
{
  "patterns": [
    {
      "pattern": "Services in [LOCATION]",
      "variables": ["LOCATION"],
      "instances": [
        {
          "content": "Services in Boston",
          "url": "example.com/boston",
          "extractedVariables": {"LOCATION": "Boston"}
        }
      ],
      "businessImpact": "high|medium|low",
      "recommendation": "Specific advice for this pattern"
    }
  ]
}`;
}

function createCategorizationPrompt(content: ContentItem[], contentType: string): string {
  const contentList = content.slice(0, 15).map((item, i) => 
    `${i + 1}. "${item.content}" (URL: ${item.url})`
  ).join('\n');

  return `Categorize these ${contentType} by their purpose and SEO value:

${contentList}

Categories:
- boilerplate: Repeated elements (headers, footers, legal text)
- navigation: Menus, breadcrumbs, site navigation
- value: Unique content providing user value
- cta: Call-to-action elements
- template: Pattern-based content

Respond with JSON format:
{
  "categories": [
    {
      "content": "About Our Company",
      "type": "boilerplate",
      "confidence": 85,
      "reason": "Generic about content repeated across similar sites"
    }
  ]
}`;
}

function createIntentAnalysisPrompt(content: ContentItem[], contentType: string): string {
  const contentList = content.slice(0, 15).map((item, i) => 
    `${i + 1}. "${item.content}" (URL: ${item.url})`
  ).join('\n');

  return `Find ${contentType} that compete for the same user search intent:

${contentList}

Look for:
- Different wordings for same service/product
- Multiple pages targeting same keywords
- Similar user goals despite different phrasing

Respond with JSON format:
{
  "conflicts": [
    {
      "intent": "Learn about web design services",
      "confidence": 90,
      "competingPages": [
        {
          "url": "example.com/web-design",
          "content": "Professional Web Design",
          "intentMatch": 95
        },
        {
          "url": "example.com/website-development", 
          "content": "Custom Website Development",
          "intentMatch": 85
        }
      ],
      "consolidationSuggestion": "Consider merging these pages or making them target different aspects of web design"
    }
  ]
}`;
}

/**
 * Helper functions
 */
function findExactMatchesBasic(content: ContentItem[]): DuplicateItem[] {
  const contentMap = new Map<string, ContentItem[]>();
  
  content.forEach(item => {
    const normalized = item.content.toLowerCase().trim();
    if (!contentMap.has(normalized)) {
      contentMap.set(normalized, []);
    }
    contentMap.get(normalized)!.push(item);
  });

  return Array.from(contentMap.entries())
    .filter(([_, items]) => items.length > 1)
    .map(([_, items]) => ({
      content: items[0].content,
      urls: items.map(item => item.url),
      similarityScore: 100,
      impactLevel: 'High' as const,
      duplicationType: 'exact' as const,
      rootCause: 'Identical content found on multiple pages',
      improvementStrategy: 'Create unique content for each page targeting different aspects or keywords'
    }));
}

function convertTemplatesToDuplicates(patterns: TemplatePattern[]): DuplicateItem[] {
  return patterns.map(pattern => ({
    content: pattern.pattern,
    urls: pattern.instances.map(inst => inst.url),
    similarityScore: 85,
    impactLevel: pattern.businessImpact === 'high' ? 'High' as const : 
                 pattern.businessImpact === 'medium' ? 'Medium' as const : 'Low' as const,
    duplicationType: 'template' as const,
    templatePattern: pattern.pattern,
    rootCause: `Template pattern detected: ${pattern.pattern}`,
    improvementStrategy: pattern.recommendation,
    businessImpact: `Template overuse may hurt SEO rankings and user experience`
  }));
}

function createContentBatches(content: ContentItem[], batchSize: number): ContentItem[][] {
  const batches: ContentItem[][] = [];
  for (let i = 0; i < content.length; i += batchSize) {
    batches.push(content.slice(i, i + batchSize));
  }
  return batches;
}

function validateTemplatePattern(pattern: any): boolean {
  return pattern && 
         typeof pattern.pattern === 'string' &&
         Array.isArray(pattern.variables) &&
         Array.isArray(pattern.instances) &&
         typeof pattern.recommendation === 'string';
}

function validateContentCategory(cat: any): boolean {
  return cat && 
         typeof cat.content === 'string' &&
         ['boilerplate', 'navigation', 'value', 'cta', 'template'].includes(cat.type) &&
         typeof cat.confidence === 'number' &&
         typeof cat.reason === 'string';
}

function validateIntentAnalysis(conflict: any): boolean {
  return conflict &&
         typeof conflict.intent === 'string' &&
         typeof conflict.confidence === 'number' &&
         Array.isArray(conflict.competingPages);
}

function generateStrategicInsights(result: EnhancedAnalysisResult, contentType: string): string[] {
  const insights: string[] = [];

  // Template pattern insights
  if (result.templatePatterns.length > 0) {
    const highImpactTemplates = result.templatePatterns.filter(p => p.businessImpact === 'high').length;
    if (highImpactTemplates > 0) {
      insights.push(`🔥 STRATEGIC: ${highImpactTemplates} high-impact template patterns detected in ${contentType}. Over-templated content can hurt SEO rankings.`);
    }
    
    const totalTemplateInstances = result.templatePatterns.reduce((sum, p) => sum + p.instances.length, 0);
    insights.push(`📊 INSIGHT: ${totalTemplateInstances} pages use template patterns. Consider differentiating content to improve unique value proposition.`);
  }

  // Intent conflict insights
  if (result.intentConflicts.length > 0) {
    insights.push(`⚡ COMPETITION: ${result.intentConflicts.length} intent conflicts found. Multiple pages competing for same user searches can split rankings.`);
  }

  // Content categorization insights
  const boilerplateCount = result.stats.boilerplateContent;
  if (boilerplateCount > 0) {
    const boilerplateRatio = (boilerplateCount / result.totalAnalyzed) * 100;
    if (boilerplateRatio > 30) {
      insights.push(`📋 WARNING: ${Math.round(boilerplateRatio)}% of ${contentType} is boilerplate content. Focus on creating more unique value-driven content.`);
    }
  }

  return insights;
}

function createEmptyEnhancedResult(): EnhancedAnalysisResult {
  return {
    duplicateGroups: [],
    templatePatterns: [],
    intentConflicts: [],
    contentCategories: new Map(),
    strategicInsights: [],
    duplicateCount: 0,
    totalAnalyzed: 0,
    stats: {
      exactMatches: 0,
      templateMatches: 0,
      intentConflicts: 0,
      boilerplateContent: 0
    }
  };
}