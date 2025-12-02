/**
 * Content Quality Scoring Module
 * Evaluates content uniqueness, user value, and SEO effectiveness using AI
 */

import OpenAI from 'openai';
import { ContentItem } from './content-preprocessor.js';

export interface ContentQualityScore {
  url: string;
  content: string;
  scores: {
    uniqueness: number; // 0-100
    userValue: number; // 0-100
    seoEffectiveness: number; // 0-100
    readability: number; // 0-100
    overall: number; // 0-100
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  contentType: 'exceptional' | 'good' | 'average' | 'poor' | 'critical';
  priority: number; // 1-5 where 1 is highest priority for improvement
}

export interface QualityAnalysisOptions {
  model: string;
  temperature: number;
  maxTokensPerRequest: number;
  batchSize: number;
  enableDetailedAnalysis: boolean;
}

export const DEFAULT_QUALITY_OPTIONS: QualityAnalysisOptions = {
  model: "gpt-5.1",
  temperature: 0.2,
  maxTokensPerRequest: 2500,
  batchSize: 10,
  enableDetailedAnalysis: true
};

export interface QualityAnalysisResult {
  scores: ContentQualityScore[];
  summary: {
    averageScores: {
      uniqueness: number;
      userValue: number;
      seoEffectiveness: number;
      readability: number;
      overall: number;
    };
    distribution: {
      exceptional: number;
      good: number;
      average: number;
      poor: number;
      critical: number;
    };
    topIssues: string[];
    improvementPriorities: Array<{
      issue: string;
      affectedCount: number;
      impact: 'high' | 'medium' | 'low';
      recommendation: string;
    }>;
  };
  strategicInsights: string[];
}

/**
 * Analyze content quality using AI-powered scoring
 */
export async function analyzeContentQuality(
  content: ContentItem[],
  contentType: 'titles' | 'descriptions' | 'headings' | 'paragraphs',
  openai: OpenAI,
  options: QualityAnalysisOptions = DEFAULT_QUALITY_OPTIONS
): Promise<QualityAnalysisResult> {

  if (content.length === 0) {
    return createEmptyQualityResult();
  }

  console.log(`Quality Analysis: Evaluating ${content.length} ${contentType} items`);

  const scores: ContentQualityScore[] = [];
  const batches = createQualityBatches(content, options.batchSize);

  for (const batch of batches.slice(0, 3)) { // Limit for cost control
    try {
      const batchScores = await analyzeBatchQuality(batch, contentType, openai, options);
      scores.push(...batchScores);

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error) {
      console.error(`Error analyzing quality batch:`, error);
    }
  }

  const summary = calculateQualitySummary(scores);
  const strategicInsights = generateQualityInsights(scores, summary, contentType);

  console.log(`Quality Analysis Complete: Analyzed ${scores.length} items, average overall score: ${Math.round(summary.averageScores.overall)}`);

  return {
    scores,
    summary,
    strategicInsights
  };
}

/**
 * Analyze a batch of content for quality metrics
 */
async function analyzeBatchQuality(
  batch: ContentItem[],
  contentType: string,
  openai: OpenAI,
  options: QualityAnalysisOptions
): Promise<ContentQualityScore[]> {

  const prompt = createQualityAnalysisPrompt(batch, contentType);

  const response = await openai.chat.completions.create({
    model: options.model,
    messages: [
      {
        role: "system",
        content: `You are an expert SEO content analyst. Evaluate ${contentType} for uniqueness (how original/distinctive), user value (how helpful to users), SEO effectiveness (optimization quality), and readability (clarity/structure). Score each 0-100 and provide actionable insights. Respond only with valid JSON. IMPORTANT: Write all analysis text (strengths, weaknesses, recommendations) in the same language as the content being analyzed. Match the language of the analyzed content exactly.`
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
  if (!content_response) return [];

  try {
    const analysis = JSON.parse(content_response);
    if (analysis.scores && Array.isArray(analysis.scores)) {
      return analysis.scores
        .filter(validateQualityScore)
        .map(enrichQualityScore);
    }
  } catch (parseError) {
    console.error('Error parsing quality analysis response:', parseError);
  }

  return [];
}

/**
 * Create quality analysis prompt
 */
function createQualityAnalysisPrompt(content: ContentItem[], contentType: string): string {
  const contentList = content.slice(0, 10).map((item, i) => 
    `${i + 1}. "${item.content}" (URL: ${item.url})`
  ).join('\n');

  return `Analyze the quality of these ${contentType}:

${contentList}

For each item, evaluate:
1. **Uniqueness** (0-100): How original and distinctive is this content?
2. **User Value** (0-100): How helpful and valuable is this for users?
3. **SEO Effectiveness** (0-100): How well optimized is this for search engines?
4. **Readability** (0-100): How clear, well-structured, and easy to understand?

IMPORTANT: Write your analysis, strengths, weaknesses, and recommendations in the EXACT same language as the content above. Look at the content items to determine the language, then write your response in that same language.

Respond with JSON format:
{
  "scores": [
    {
      "content": "Professional Web Design Services",
      "url": "example.com/web-design",
      "uniqueness": 45,
      "userValue": 65,
      "seoEffectiveness": 70,
      "readability": 80,
      "strengths": ["Clear service description", "Good keyword usage"],
      "weaknesses": ["Generic phrasing", "Lacks differentiation"],
      "recommendations": ["Add specific unique value proposition", "Include target location or specialization"]
    }
  ]
}

Focus on actionable insights that can improve content performance.`;
}

/**
 * Helper functions
 */
function createQualityBatches(content: ContentItem[], batchSize: number): ContentItem[][] {
  const batches: ContentItem[][] = [];
  for (let i = 0; i < content.length; i += batchSize) {
    batches.push(content.slice(i, i + batchSize));
  }
  return batches;
}

function validateQualityScore(score: any): boolean {
  return score && 
         typeof score.content === 'string' &&
         typeof score.url === 'string' &&
         typeof score.uniqueness === 'number' &&
         typeof score.userValue === 'number' &&
         typeof score.seoEffectiveness === 'number' &&
         typeof score.readability === 'number' &&
         Array.isArray(score.strengths) &&
         Array.isArray(score.weaknesses) &&
         Array.isArray(score.recommendations);
}

function enrichQualityScore(score: any): ContentQualityScore {
  const overall = Math.round(
    (score.uniqueness + score.userValue + score.seoEffectiveness + score.readability) / 4
  );

  let contentType: ContentQualityScore['contentType'];
  let priority: number;

  if (overall >= 85) {
    contentType = 'exceptional';
    priority = 5;
  } else if (overall >= 70) {
    contentType = 'good';
    priority = 4;
  } else if (overall >= 55) {
    contentType = 'average';
    priority = 3;
  } else if (overall >= 40) {
    contentType = 'poor';
    priority = 2;
  } else {
    contentType = 'critical';
    priority = 1;
  }

  return {
    url: score.url,
    content: score.content,
    scores: {
      uniqueness: score.uniqueness,
      userValue: score.userValue,
      seoEffectiveness: score.seoEffectiveness,
      readability: score.readability,
      overall
    },
    insights: {
      strengths: score.strengths || [],
      weaknesses: score.weaknesses || [],
      recommendations: score.recommendations || []
    },
    contentType,
    priority
  };
}

function calculateQualitySummary(scores: ContentQualityScore[]): QualityAnalysisResult['summary'] {
  if (scores.length === 0) {
    return {
      averageScores: { uniqueness: 0, userValue: 0, seoEffectiveness: 0, readability: 0, overall: 0 },
      distribution: { exceptional: 0, good: 0, average: 0, poor: 0, critical: 0 },
      topIssues: [],
      improvementPriorities: []
    };
  }

  const averageScores = {
    uniqueness: Math.round(scores.reduce((sum, s) => sum + s.scores.uniqueness, 0) / scores.length),
    userValue: Math.round(scores.reduce((sum, s) => sum + s.scores.userValue, 0) / scores.length),
    seoEffectiveness: Math.round(scores.reduce((sum, s) => sum + s.scores.seoEffectiveness, 0) / scores.length),
    readability: Math.round(scores.reduce((sum, s) => sum + s.scores.readability, 0) / scores.length),
    overall: Math.round(scores.reduce((sum, s) => sum + s.scores.overall, 0) / scores.length)
  };

  const distribution = {
    exceptional: scores.filter(s => s.contentType === 'exceptional').length,
    good: scores.filter(s => s.contentType === 'good').length,
    average: scores.filter(s => s.contentType === 'average').length,
    poor: scores.filter(s => s.contentType === 'poor').length,
    critical: scores.filter(s => s.contentType === 'critical').length
  };

  // Collect and prioritize common issues
  const allWeaknesses = scores.flatMap(s => s.insights.weaknesses);
  const weaknessFreq = allWeaknesses.reduce((acc, weakness) => {
    acc[weakness] = (acc[weakness] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topIssues = Object.entries(weaknessFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([issue]) => issue);

  const improvementPriorities = Object.entries(weaknessFreq)
    .map(([issue, count]) => ({
      issue,
      affectedCount: count,
      impact: count > scores.length * 0.5 ? 'high' as const :
              count > scores.length * 0.25 ? 'medium' as const : 'low' as const,
      recommendation: generateRecommendationForIssue(issue)
    }))
    .sort((a, b) => b.affectedCount - a.affectedCount)
    .slice(0, 3);

  return {
    averageScores,
    distribution,
    topIssues,
    improvementPriorities
  };
}

function generateRecommendationForIssue(issue: string): string {
  // Simple mapping of common issues to recommendations
  const recommendationMap: Record<string, string> = {
    'Generic phrasing': 'Use specific, descriptive language that highlights unique value',
    'Lacks differentiation': 'Emphasize what makes your offering unique from competitors',
    'Poor keyword optimization': 'Research and incorporate relevant target keywords naturally',
    'Too short': 'Expand content to provide more comprehensive information',
    'Unclear purpose': 'Clearly define the page purpose and intended user action'
  };

  return recommendationMap[issue] || 'Review and improve content quality based on best practices';
}

function generateQualityInsights(
  scores: ContentQualityScore[],
  summary: QualityAnalysisResult['summary'],
  contentType: string
): string[] {
  const insights: string[] = [];

  // Overall performance insight
  if (summary.averageScores.overall < 60) {
    insights.push(`🚨 CRITICAL: Your ${contentType} quality is below standard (${summary.averageScores.overall}/100). Immediate improvement needed for SEO performance.`);
  } else if (summary.averageScores.overall < 75) {
    insights.push(`⚠️ OPPORTUNITY: Your ${contentType} quality is moderate (${summary.averageScores.overall}/100). Strategic improvements can boost rankings.`);
  } else {
    insights.push(`✅ STRONG: Your ${contentType} quality is good (${summary.averageScores.overall}/100). Focus on optimizing the lowest-performing items.`);
  }

  // Specific metric insights
  if (summary.averageScores.uniqueness < 50) {
    insights.push(`🔄 DIFFERENTIATION: ${contentType} lack uniqueness (${summary.averageScores.uniqueness}/100). Stand out from competitors with distinctive content.`);
  }

  if (summary.averageScores.userValue < 55) {
    insights.push(`👥 USER FOCUS: ${contentType} provide limited user value (${summary.averageScores.userValue}/100). Prioritize addressing user needs and questions.`);
  }

  // Distribution insights
  const criticalCount = summary.distribution.critical + summary.distribution.poor;
  if (criticalCount > 0) {
    insights.push(`🎯 PRIORITY: ${criticalCount} ${contentType} need immediate attention. Start with critical/poor quality items for maximum impact.`);
  }

  return insights;
}

function createEmptyQualityResult(): QualityAnalysisResult {
  return {
    scores: [],
    summary: {
      averageScores: { uniqueness: 0, userValue: 0, seoEffectiveness: 0, readability: 0, overall: 0 },
      distribution: { exceptional: 0, good: 0, average: 0, poor: 0, critical: 0 },
      topIssues: [],
      improvementPriorities: []
    },
    strategicInsights: []
  };
}