/**
 * Unified Content Quality Analyzer
 * Combines content duplication detection, keyword analysis, and quality scoring
 * into a single streamlined analysis within the main pipeline
 */

import OpenAI from 'openai';
import { extractPageContent } from '../content-analysis/content-preprocessor.js';
import { ContentQualityScore, analyzeContentQuality } from '../content-analysis/content-quality-scorer.js';

export interface ContentQualityAnalysis {
  // Content uniqueness analysis
  contentUniqueness: {
    duplicateContent: {
      titles: ContentDuplicateGroup[];
      descriptions: ContentDuplicateGroup[];
      headings: ContentDuplicateGroup[];
      paragraphs: ContentDuplicateGroup[];
    };
    uniquenessScore: number; // 0-100
    totalDuplicates: number;
    pagesAnalyzed: number;
  };
  
  // Keyword quality analysis  
  keywordQuality: {
    overOptimization: KeywordIssue[];
    underOptimization: KeywordOpportunity[];
    healthScore: number; // 0-100
    readabilityImpact: 'Critical' | 'High' | 'Medium' | 'Low';
    affectedPages: number;
  };
  
  // Content quality scores
  qualityScores: {
    averageScores: {
      uniqueness: number;
      userValue: number;
      seoEffectiveness: number;
      readability: number;
      overall: number;
    };
    topPerformers: ContentQualityScore[];
    needsImprovement: ContentQualityScore[];
  };
  
  // Strategic recommendations
  strategicRecommendations: {
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    category: 'content' | 'keywords' | 'structure' | 'quality';
    title: string;
    description: string;
    implementation: string;
    expectedImpact: string;
  }[];
  
  // Overall health metrics
  overallHealth: {
    contentScore: number; // 0-100
    keywordScore: number; // 0-100
    qualityScore: number; // 0-100
    combinedScore: number; // 0-100
  };
}

export interface ContentDuplicateGroup {
  content: string;
  urls: string[];
  similarityScore: number;
  impactLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  improvementStrategy: string;
  duplicationType: 'exact' | 'template' | 'boilerplate' | 'pattern';
}

export interface KeywordIssue {
  keyword: string;
  density: number;
  occurrences: number;
  impactLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  affectedPages: string[];
  improvementStrategy: string;
  alternatives: string[];
}

export interface KeywordOpportunity {
  suggestion: string;
  currentUsage: string;
  opportunity: string;
  expectedBenefit: string;
  implementation: string;
}

/**
 * Main unified content quality analysis function
 * Integrates into the analysis pipeline's generateInsights step
 */
export async function analyzeUnifiedContentQuality(
  pages: Array<any>,
  useAI: boolean = true
): Promise<ContentQualityAnalysis> {
  
  console.log(`Starting unified content quality analysis for ${pages.length} pages...`);
  
  try {
    if (!useAI || !process.env.OPENAI_API_KEY) {
      console.warn("AI not available, returning basic content quality analysis");
      return generateBasicContentQualityAnalysis(pages);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Step 1: Analyze content uniqueness (streamlined duplication detection)
    const uniquenessAnalysis = await analyzeContentUniqueness(pages, openai);
    
    // Step 2: Analyze keyword quality (streamlined keyword analysis)
    const keywordAnalysis = await analyzeKeywordQuality(pages, openai);
    
    // Step 3: Quality scoring (using existing quality scorer)
    const qualityScoring = await analyzeContentQualityScores(pages, openai);
    
    // Step 4: Generate strategic recommendations
    const recommendations = generateStrategicRecommendations(
      uniquenessAnalysis,
      keywordAnalysis,
      qualityScoring
    );
    
    // Step 5: Calculate overall health metrics
    const overallHealth = calculateOverallHealth(
      uniquenessAnalysis,
      keywordAnalysis,
      qualityScoring
    );

    console.log(`Content quality analysis complete: ${overallHealth.combinedScore}/100 overall score`);

    return {
      contentUniqueness: uniquenessAnalysis,
      keywordQuality: keywordAnalysis,
      qualityScores: qualityScoring,
      strategicRecommendations: recommendations,
      overallHealth
    };

  } catch (error) {
    console.error('Error in unified content quality analysis:', error);
    return generateBasicContentQualityAnalysis(pages);
  }
}

/**
 * Analyze content uniqueness using AI-powered detection
 */
async function analyzeContentUniqueness(pages: Array<any>, openai: OpenAI) {
  console.log('Analyzing content uniqueness...');
  
  // Extract content using existing preprocessor
  const extractedContent = extractPageContent(pages);
  
  // Use AI to detect duplicates and patterns across all content types
  const prompt = `Analyze this website content for duplication patterns, template overuse, and boilerplate content across ${pages.length} pages.

CONTENT ANALYSIS:
Titles (${extractedContent.titles.length}): ${extractedContent.titles.slice(0, 10).map(t => `"${t.content}"`).join(', ')}
Descriptions (${extractedContent.descriptions.length}): ${extractedContent.descriptions.slice(0, 5).map(d => `"${d.content.substring(0, 100)}"`).join(', ')}
H1 Headings (${extractedContent.headings.h1.length}): ${extractedContent.headings.h1.slice(0, 10).map(h => `"${h.content}"`).join(', ')}

Identify:
1. Exact duplicates that hurt SEO
2. Template patterns that are overused
3. Boilerplate content that adds no value
4. Content that should be unique but isn't

For each duplicate group, provide:
- Impact level (Critical/High/Medium/Low)
- Specific improvement strategy
- Type classification

IMPORTANT: Write your analysis and recommendations in the EXACT same language as the website content above. Look at the titles, headings, and descriptions to determine the language, then write your response in that same language.

Respond in JSON format:
{
  "titleDuplicates": [{"content": "...", "urls": [...], "similarityScore": 95, "impactLevel": "Critical", "improvementStrategy": "...", "duplicationType": "exact"}],
  "descriptionDuplicates": [...],
  "headingDuplicates": [...],
  "paragraphDuplicates": [...],
  "uniquenessScore": 75,
  "totalDuplicates": 12,
  "insights": ["insight1", "insight2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        {
          role: "system",
          content: "You are an SEO content expert analyzing website content for uniqueness issues. Focus on actionable insights for content improvement."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_completion_tokens: 3000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      duplicateContent: {
        titles: result.titleDuplicates || [],
        descriptions: result.descriptionDuplicates || [],
        headings: result.headingDuplicates || [],
        paragraphs: result.paragraphDuplicates || []
      },
      uniquenessScore: Math.max(0, Math.min(100, result.uniquenessScore || 70)),
      totalDuplicates: result.totalDuplicates || 0,
      pagesAnalyzed: pages.length
    };

  } catch (error) {
    console.error('Error in AI uniqueness analysis:', error);
    return generateBasicUniquenessAnalysis(pages);
  }
}

/**
 * Analyze keyword quality and optimization issues
 */
async function analyzeKeywordQuality(pages: Array<any>, openai: OpenAI) {
  console.log('Analyzing keyword quality...');
  
  const contentSamples = pages.slice(0, 6).map(page => ({
    url: page.url,
    title: page.title || '',
    metaDescription: page.metaDescription || '',
    headings: page.headings?.map((h: any) => h.text).join(' ') || '',
    content: page.paragraphs?.join(' ').substring(0, 800) || '',
    wordCount: page.wordCount || 0
  }));

  const prompt = `Analyze keyword usage quality across this website for SEO effectiveness and readability.

CONTENT SAMPLES:
${contentSamples.map((page, i) => `
Page ${i + 1}: ${page.url}
Title: "${page.title}"
Meta: "${page.metaDescription.substring(0, 100)}"
Content preview: "${page.content.substring(0, 200)}"
`).join('\n')}

Analyze:
1. Over-optimization: Keywords used unnaturally or excessively
2. Under-optimization: Missed keyword opportunities  
3. Readability impact: How keyword usage affects user experience
4. Natural language flow vs forced keyword insertion

Provide actionable recommendations for improvement.

IMPORTANT: Write your analysis and recommendations in the EXACT same language as the website content above. Look at the titles, content previews, and meta descriptions to determine the language, then write your response in that same language.

Respond in JSON format:
{
  "overOptimization": [
    {
      "keyword": "example keyword", 
      "density": 5.2, 
      "impactLevel": "High",
      "affectedPages": ["url1", "url2"],
      "improvementStrategy": "reduce usage, use synonyms",
      "alternatives": ["synonym1", "synonym2"]
    }
  ],
  "underOptimization": [
    {
      "suggestion": "Use more long-tail keywords",
      "currentUsage": "Generic terms only", 
      "opportunity": "Target specific phrases",
      "expectedBenefit": "Better search targeting",
      "implementation": "Research and integrate specific phrases"
    }
  ],
  "healthScore": 75,
  "readabilityImpact": "Medium",
  "affectedPages": 3,
  "insights": ["insight1", "insight2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1", 
      messages: [
        {
          role: "system",
          content: "You are an SEO and readability expert. Analyze keyword usage for both search optimization and user experience. Focus on natural, effective keyword integration."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_completion_tokens: 2500
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      overOptimization: result.overOptimization || [],
      underOptimization: result.underOptimization || [],
      healthScore: Math.max(0, Math.min(100, result.healthScore || 70)),
      readabilityImpact: result.readabilityImpact || 'Medium',
      affectedPages: result.affectedPages || 0
    };

  } catch (error) {
    console.error('Error in AI keyword analysis:', error);
    return generateBasicKeywordAnalysis(pages);
  }
}

/**
 * Analyze content quality scores using existing quality scorer
 */
async function analyzeContentQualityScores(pages: Array<any>, openai: OpenAI) {
  console.log('Analyzing content quality scores...');
  
  try {
    // Extract titles for quality scoring (limit for cost control)
    const extractedContent = extractPageContent(pages);
    const titleSample = extractedContent.titles.slice(0, 8); // Limit sample size
    
    const qualityResult = await analyzeContentQuality(
      titleSample,
      'titles',
      openai,
      {
        model: "gpt-5.1",
        temperature: 0.2,
        maxTokensPerRequest: 2000,
        batchSize: 6,
        enableDetailedAnalysis: true
      }
    );

    // Separate top performers from those needing improvement
    const topPerformers = qualityResult.scores.filter(score => score.scores.overall >= 75);
    const needsImprovement = qualityResult.scores.filter(score => score.scores.overall < 60);

    return {
      averageScores: qualityResult.summary.averageScores,
      topPerformers: topPerformers.slice(0, 3),
      needsImprovement: needsImprovement.slice(0, 5)
    };

  } catch (error) {
    console.error('Error in content quality scoring:', error);
    return {
      averageScores: {
        uniqueness: 70,
        userValue: 70,
        seoEffectiveness: 70,
        readability: 70,
        overall: 70
      },
      topPerformers: [],
      needsImprovement: []
    };
  }
}

/**
 * Generate strategic recommendations based on all analysis results
 */
function generateStrategicRecommendations(
  uniqueness: any,
  keywords: any,
  quality: any
): ContentQualityAnalysis['strategicRecommendations'] {
  
  const recommendations: ContentQualityAnalysis['strategicRecommendations'] = [];
  
  // Critical content issues first
  if (uniqueness.totalDuplicates > 0) {
    recommendations.push({
      priority: uniqueness.totalDuplicates > 5 ? 'Critical' : 'High',
      category: 'content',
      title: 'Fix Duplicate Content Issues',
      description: `${uniqueness.totalDuplicates} instances of duplicate content detected`,
      implementation: 'Review and rewrite duplicate titles, descriptions, and content to be unique',
      expectedImpact: 'Improved search rankings and user experience'
    });
  }
  
  // Keyword optimization issues
  if (keywords.overOptimization.length > 0) {
    recommendations.push({
      priority: 'High',
      category: 'keywords',
      title: 'Reduce Keyword Over-Optimization',
      description: `${keywords.overOptimization.length} keywords are over-optimized`,
      implementation: 'Use natural language and keyword variations instead of repetition',
      expectedImpact: 'Better readability and reduced risk of search penalties'
    });
  }
  
  // Quality improvement opportunities  
  if (quality.needsImprovement.length > 0) {
    recommendations.push({
      priority: 'Medium',
      category: 'quality',
      title: 'Improve Low-Quality Content',
      description: `${quality.needsImprovement.length} pages need content quality improvements`,
      implementation: 'Focus on user value, clarity, and comprehensive information',
      expectedImpact: 'Higher engagement and better search performance'
    });
  }
  
  // Keyword opportunities
  if (keywords.underOptimization.length > 0) {
    recommendations.push({
      priority: 'Medium',
      category: 'keywords',
      title: 'Capitalize on Keyword Opportunities',
      description: `${keywords.underOptimization.length} keyword opportunities identified`,
      implementation: 'Research and integrate relevant keywords naturally into content',
      expectedImpact: 'Expanded search visibility and traffic growth'
    });
  }

  return recommendations.slice(0, 6); // Limit to top 6 recommendations
}

/**
 * Calculate overall health metrics
 */
function calculateOverallHealth(uniqueness: any, keywords: any, quality: any) {
  const contentScore = uniqueness.uniquenessScore;
  const keywordScore = keywords.healthScore;
  const qualityScore = quality.averageScores.overall;
  
  // Weighted average with content uniqueness being most important
  const combinedScore = Math.round(
    (contentScore * 0.4) + (keywordScore * 0.3) + (qualityScore * 0.3)
  );
  
  return {
    contentScore,
    keywordScore,
    qualityScore,
    combinedScore
  };
}

/**
 * Generate basic analysis when AI is not available
 */
function generateBasicContentQualityAnalysis(pages: Array<any>): ContentQualityAnalysis {
  // Simple rule-based analysis
  const titles = pages.map(p => p.title).filter(Boolean);
  const titleDuplicates = findBasicDuplicates(titles);
  
  return {
    contentUniqueness: {
      duplicateContent: {
        titles: titleDuplicates.map(title => ({
          content: title,
          urls: pages.filter(p => p.title === title).map(p => p.url),
          similarityScore: 100,
          impactLevel: 'High' as const,
          improvementStrategy: 'Create unique titles for each page',
          duplicationType: 'exact' as const
        })),
        descriptions: [],
        headings: [],
        paragraphs: []
      },
      uniquenessScore: Math.max(30, 100 - (titleDuplicates.length * 10)),
      totalDuplicates: titleDuplicates.length,
      pagesAnalyzed: pages.length
    },
    keywordQuality: {
      overOptimization: [],
      underOptimization: [{
        suggestion: "Review keyword usage patterns",
        currentUsage: "Manual review needed",
        opportunity: "Optimize keyword strategy",
        expectedBenefit: "Better search performance",
        implementation: "Enable AI analysis for detailed insights"
      }],
      healthScore: 70,
      readabilityImpact: 'Medium' as const,
      affectedPages: 0
    },
    qualityScores: {
      averageScores: {
        uniqueness: 70,
        userValue: 70,
        seoEffectiveness: 70,
        readability: 70,
        overall: 70
      },
      topPerformers: [],
      needsImprovement: []
    },
    strategicRecommendations: [{
      priority: 'Medium' as const,
      category: 'content' as const,
      title: 'Enable AI Analysis',
      description: 'Enable AI analysis for comprehensive content quality insights',
      implementation: 'Configure OpenAI API key for detailed content analysis',
      expectedImpact: 'Detailed content optimization recommendations'
    }],
    overallHealth: {
      contentScore: 70,
      keywordScore: 70, 
      qualityScore: 70,
      combinedScore: 70
    }
  };
}

/**
 * Helper functions
 */
function generateBasicUniquenessAnalysis(pages: Array<any>) {
  const titles = pages.map(p => p.title).filter(Boolean);
  const titleDuplicates = findBasicDuplicates(titles);
  
  return {
    duplicateContent: {
      titles: titleDuplicates.map(title => ({
        content: title,
        urls: pages.filter(p => p.title === title).map(p => p.url),
        similarityScore: 100,
        impactLevel: 'High' as const,
        improvementStrategy: 'Create unique titles',
        duplicationType: 'exact' as const
      })),
      descriptions: [],
      headings: [],
      paragraphs: []
    },
    uniquenessScore: Math.max(30, 100 - (titleDuplicates.length * 10)),
    totalDuplicates: titleDuplicates.length,
    pagesAnalyzed: pages.length
  };
}

function generateBasicKeywordAnalysis(pages: Array<any>) {
  return {
    overOptimization: [],
    underOptimization: [{
      suggestion: "Manual keyword review needed",
      currentUsage: "Unknown",
      opportunity: "Enable AI for analysis", 
      expectedBenefit: "Better keyword strategy",
      implementation: "Configure AI analysis"
    }],
    healthScore: 70,
    readabilityImpact: 'Medium' as const,
    affectedPages: 0
  };
}

function findBasicDuplicates(items: string[]): string[] {
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