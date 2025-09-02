/**
 * Token Management and AI Analysis Module
 * Handles token counting, batching, and AI analysis with intelligent limits
 */

import OpenAI from 'openai';
import { ContentItem, ContentStats } from './content-preprocessor.js';
import { DuplicateItem } from '../../shared/schema.js';

export interface TokenBudget {
  maxInputTokens: number;
  maxOutputTokens: number;
  reservedTokens: number; // For system messages and formatting
  availableTokens: number;
}

export interface AnalysisBatch {
  content: ContentItem[];
  estimatedTokens: number;
  priority: number; // 1 = highest priority
  contentType: 'titles' | 'descriptions' | 'headings' | 'paragraphs';
}

export interface AIAnalysisOptions {
  model: string;
  temperature: number;
  maxTokensPerRequest: number;
  batchSize: number;
  prioritizeByImpact: boolean;
}

export const DEFAULT_AI_OPTIONS: AIAnalysisOptions = {
  model: "gpt-4.1",
  temperature: 0.3,
  maxTokensPerRequest: 4000,
  batchSize: 15,
  prioritizeByImpact: true
};

/**
 * Calculate token usage for content analysis
 */
export function estimateTokenUsage(content: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  // Add buffer for JSON formatting and AI response
  const baseTokens = Math.ceil(content.length / 4);
  const formatBuffer = Math.ceil(baseTokens * 0.2); // 20% buffer for formatting
  return baseTokens + formatBuffer;
}

/**
 * Create token budget based on content complexity
 */
export function createTokenBudget(contentStats: ContentStats): TokenBudget {
  // Base budget - conservative to avoid truncation
  const maxInputTokens = contentStats.complexity === 'high' ? 6000 : 
                        contentStats.complexity === 'medium' ? 4000 : 2000;
  
  const maxOutputTokens = 2000; // Sufficient for detailed analysis
  const reservedTokens = 500; // System messages, formatting, etc.
  
  return {
    maxInputTokens,
    maxOutputTokens,
    reservedTokens,
    availableTokens: maxInputTokens - reservedTokens
  };
}

/**
 * Split content into token-aware batches
 */
export function createAnalysisBatches(
  content: ContentItem[], 
  contentType: 'titles' | 'descriptions' | 'headings' | 'paragraphs',
  budget: TokenBudget,
  options: AIAnalysisOptions = DEFAULT_AI_OPTIONS
): AnalysisBatch[] {
  
  if (content.length === 0) return [];

  const batches: AnalysisBatch[] = [];
  let currentBatch: ContentItem[] = [];
  let currentTokens = 0;

  // Sort by priority if enabled
  const sortedContent = options.prioritizeByImpact 
    ? prioritizeContent(content, contentType)
    : content;

  for (const item of sortedContent) {
    const itemTokens = estimateTokenUsage(item.content);
    
    // Check if adding this item would exceed token budget
    if (currentTokens + itemTokens > budget.availableTokens && currentBatch.length > 0) {
      // Create batch with current items
      batches.push({
        content: [...currentBatch],
        estimatedTokens: currentTokens,
        priority: batches.length + 1,
        contentType
      });
      
      // Start new batch
      currentBatch = [item];
      currentTokens = itemTokens;
    } else {
      currentBatch.push(item);
      currentTokens += itemTokens;
    }

    // Safety check - don't create batches that are too large
    if (currentBatch.length >= options.batchSize) {
      batches.push({
        content: [...currentBatch],
        estimatedTokens: currentTokens,
        priority: batches.length + 1,
        contentType
      });
      
      currentBatch = [];
      currentTokens = 0;
    }
  }

  // Add remaining items as final batch
  if (currentBatch.length > 0) {
    batches.push({
      content: currentBatch,
      estimatedTokens: currentTokens,
      priority: batches.length + 1,
      contentType
    });
  }

  return batches;
}

/**
 * Prioritize content by SEO impact
 */
function prioritizeContent(
  content: ContentItem[], 
  contentType: 'titles' | 'descriptions' | 'headings' | 'paragraphs'
): ContentItem[] {
  
  // Create priority scoring
  const contentWithPriority = content.map(item => {
    let priority = 0;
    
    // Base priority by content type
    switch (contentType) {
      case 'titles': priority = 100; break;
      case 'descriptions': priority = 80; break;
      case 'headings': priority = 60; break;
      case 'paragraphs': priority = 40; break;
    }
    
    // Boost priority for homepage and important pages
    if (item.url.endsWith('/') || item.url.includes('home')) priority += 20;
    if (item.url.includes('about') || item.url.includes('contact')) priority += 10;
    
    // Boost priority for content that appears multiple times
    const duplicateBoost = content.filter(other => 
      other.content.toLowerCase() === item.content.toLowerCase()
    ).length > 1 ? 15 : 0;
    
    return { ...item, priority: priority + duplicateBoost };
  });

  // Sort by priority (highest first)
  return contentWithPriority
    .sort((a, b) => b.priority - a.priority)
    .map(({ priority, ...item }) => item);
}

/**
 * Generate focused AI analysis for a batch of content
 */
export async function analyzeContentBatch(
  batch: AnalysisBatch,
  openai: OpenAI,
  options: AIAnalysisOptions = DEFAULT_AI_OPTIONS
): Promise<DuplicateItem[]> {
  
  if (batch.content.length === 0) return [];

  try {
    const prompt = createFocusedPrompt(batch);
    
    const response = await openai.chat.completions.create({
      model: options.model,
      messages: [
        {
          role: "system",
          content: createSystemMessage(batch.contentType)
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: options.temperature,
      max_tokens: options.maxTokensPerRequest
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.warn(`No content in AI response for ${batch.contentType} batch`);
      return [];
    }

    return parseAIResponse(content, batch.contentType);
    
  } catch (error) {
    console.error(`Error analyzing ${batch.contentType} batch:`, error);
    return [];
  }
}

/**
 * Create focused prompt for specific content type
 */
function createFocusedPrompt(batch: AnalysisBatch): string {
  const contentItems = batch.content.map((item, index) => 
    `${index + 1}. "${sanitizeForPrompt(item.content)}" → ${item.url}`
  ).join('\n');

  const typeSpecificInstructions = getTypeSpecificInstructions(batch.contentType);

  return `Analyze these ${batch.contentType} for duplication patterns:

CONTENT (${batch.content.length} items):
${contentItems}

${typeSpecificInstructions}

ANALYSIS REQUIREMENTS:
1. Identify exact matches and high similarity content (80%+ similar)
2. Group duplicates with their URLs
3. Assess SEO impact level (Critical/High/Medium/Low)
4. Provide specific improvement strategies
5. Include similarity scores

RESPONSE FORMAT:
{
  "duplicate_groups": [
    {
      "content": "duplicate content text",
      "affected_urls": ["url1", "url2"],
      "similarity_score": 95,
      "impact_level": "Critical",
      "improvement_strategy": "specific recommendation",
      "root_cause": "likely cause of duplication"
    }
  ],
  "summary": "brief analysis summary"
}

Focus on providing actionable insights for the most critical duplicates.`;
}

/**
 * Get content-type specific analysis instructions
 */
function getTypeSpecificInstructions(contentType: string): string {
  switch (contentType) {
    case 'titles':
      return `TITLE ANALYSIS FOCUS:
- Page titles are CRITICAL for SEO rankings
- Each title should be unique and descriptive
- Identify template-based duplicates vs intentional similarities
- Prioritize homepage and landing page title issues`;

    case 'descriptions':
      return `META DESCRIPTION ANALYSIS FOCUS:
- Meta descriptions affect click-through rates
- 150-160 character optimal length
- Each page needs unique, compelling descriptions
- Identify missing vs duplicate descriptions`;

    case 'headings':
      return `HEADING ANALYSIS FOCUS:
- H1 tags are most important for SEO
- Heading hierarchy should be logical
- Avoid generic headings like "Welcome" or "About"
- Focus on content structure and keyword relevance`;

    case 'paragraphs':
      return `CONTENT ANALYSIS FOCUS:
- Look for substantial content duplication
- Identify boilerplate text vs unique content
- Focus on content that appears across multiple pages
- Consider user experience impact`;

    default:
      return 'Analyze for duplication patterns and SEO impact.';
  }
}

/**
 * Create system message for AI analysis
 */
function createSystemMessage(contentType: string): string {
  return `You are an expert SEO content analyst specializing in ${contentType} optimization. 
Your role is to identify content duplication issues that impact search engine rankings and user experience.
Provide strategic, actionable recommendations that prioritize the most critical SEO improvements.
Always respond in valid JSON format with detailed analysis.`;
}

/**
 * Parse AI response into structured duplicate items
 */
function parseAIResponse(content: string, contentType: string): DuplicateItem[] {
  try {
    const result = JSON.parse(content);
    const duplicateGroups = result.duplicate_groups || result.duplicates || [];

    return duplicateGroups.map((group: any) => ({
      content: group.content || '',
      urls: group.affected_urls || group.urls || [],
      similarityScore: typeof group.similarity_score === 'string' 
        ? parseInt(group.similarity_score.replace('%', ''))
        : group.similarity_score || 0,
      impactLevel: group.impact_level as 'Critical' | 'High' | 'Medium' | 'Low' || 'Medium',
      priority: mapImpactToPriority(group.impact_level),
      rootCause: group.root_cause || 'Unknown',
      improvementStrategy: group.improvement_strategy || 'No specific strategy provided'
    }));

  } catch (parseError) {
    console.error(`Failed to parse AI response for ${contentType}:`, parseError);
    console.error('Response content:', content.substring(0, 500));
    return [];
  }
}

/**
 * Map impact level to numeric priority
 */
function mapImpactToPriority(impactLevel: string): number {
  switch (impactLevel?.toLowerCase()) {
    case 'critical': return 1;
    case 'high': return 2;
    case 'medium': return 3;
    case 'low': return 4;
    default: return 3;
  }
}

/**
 * Sanitize content for inclusion in prompts
 */
function sanitizeForPrompt(content: string): string {
  return content
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .substring(0, 200); // Truncate very long content
}