/**
 * Main orchestrator for competitive analysis
 * Similar to content-sampler.ts but focused on competitor comparisons
 */

import type { OpenAI } from 'openai';

// Types for competitive analysis
export interface CompetitorAnalysisOptions {
  includeAI: boolean;
  maxTokens: number;
  analysisDepth: 'basic' | 'standard' | 'comprehensive';
  focusAreas: string[];
}

export interface CompetitorInsight {
  category: string;
  priority: 'high' | 'medium' | 'low';
  impact: number; // 1-10 scale
  recommendation: string;
  evidence: string[];
  actionItems: string[];
}

export interface CompetitiveAnalysisResult {
  metrics: CompetitorMetricsComparison;
  gaps: ContentGapAnalysis;
  strategies: StrategyComparison;
  insights: CompetitorInsight[];
  summary: CompetitiveSummary;
  processingStats: ProcessingStats;
}

interface CompetitorMetricsComparison {
  titleOptimization: MetricComparison;
  descriptionOptimization: MetricComparison;
  headingsOptimization: MetricComparison;
  imagesOptimization: MetricComparison;
  criticalIssues: MetricComparison;
  technicalSEO: MetricComparison;
  contentQuality: MetricComparison;
}

interface MetricComparison {
  main: number;
  competitor: number;
  difference: number;
  percentageDiff: number;
  advantage: 'main' | 'competitor' | 'neutral';
  significance: 'critical' | 'important' | 'minor';
}

interface ContentGapAnalysis {
  missingTopics: string[];
  underOptimizedAreas: string[];
  opportunityKeywords: string[];
  contentVolumeGaps: {
    area: string;
    mainCount: number;
    competitorCount: number;
    gap: number;
  }[];
}

interface StrategyComparison {
  contentStrategy: StrategyAnalysis;
  keywordStrategy: StrategyAnalysis;
  technicalStrategy: StrategyAnalysis;
  userExperience: StrategyAnalysis;
}

interface StrategyAnalysis {
  mainApproach: string;
  competitorApproach: string;
  effectiveness: 'superior' | 'comparable' | 'inferior';
  recommendations: string[];
}

interface CompetitiveSummary {
  overallAdvantage: 'main' | 'competitor' | 'neutral';
  strengthAreas: string[];
  weaknessAreas: string[];
  quickWins: string[];
  longTermOpportunities: string[];
}

interface ProcessingStats {
  analysisTime: number;
  tokensUsed: number;
  aiCallsMade: number;
  confidence: number;
}

const DEFAULT_OPTIONS: CompetitorAnalysisOptions = {
  includeAI: true,
  maxTokens: 4000,
  analysisDepth: 'standard',
  focusAreas: ['content', 'technical', 'keywords', 'user-experience']
};

/**
 * Main function to analyze competitor vs main site
 */
export async function analyzeCompetitor(
  mainAnalysis: any,
  competitorAnalysis: any,
  openai?: OpenAI,
  options: Partial<CompetitorAnalysisOptions> = {}
): Promise<CompetitiveAnalysisResult> {
  
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log(`Starting competitive analysis: ${mainAnalysis.domain} vs ${competitorAnalysis.domain}`);
  
  // Initialize result structure
  const result: CompetitiveAnalysisResult = {
    metrics: {} as CompetitorMetricsComparison,
    gaps: {} as ContentGapAnalysis,
    strategies: {} as StrategyComparison,
    insights: [],
    summary: {} as CompetitiveSummary,
    processingStats: {
      analysisTime: 0,
      tokensUsed: 0,
      aiCallsMade: 0,
      confidence: 0
    }
  };

  try {
    // Step 1: Calculate comprehensive metrics comparison
    console.log('Step 1: Calculating metrics comparison...');
    result.metrics = await calculateAdvancedMetrics(mainAnalysis, competitorAnalysis);
    
    // Step 2: Analyze content gaps and opportunities
    console.log('Step 2: Analyzing content gaps...');
    result.gaps = await analyzeContentGaps(mainAnalysis, competitorAnalysis);
    
    // Step 3: Compare strategies and approaches
    console.log('Step 3: Comparing strategies...');
    result.strategies = await compareStrategies(mainAnalysis, competitorAnalysis);
    
    // Step 4: Generate insights (AI-powered if available)
    console.log('Step 4: Generating insights...');
    if (opts.includeAI && openai) {
      result.insights = await generateAIInsights(
        result.metrics,
        result.gaps,
        result.strategies,
        openai,
        opts.maxTokens
      );
      result.processingStats.aiCallsMade = 1;
      result.processingStats.tokensUsed = estimateTokenUsage(result);
    } else {
      result.insights = generateBasicInsights(result.metrics, result.gaps, result.strategies);
    }
    
    // Step 5: Create executive summary
    console.log('Step 5: Creating competitive summary...');
    result.summary = createCompetitiveSummary(result.metrics, result.gaps, result.insights);
    
    // Calculate processing stats
    result.processingStats.analysisTime = Date.now() - startTime;
    result.processingStats.confidence = calculateConfidenceScore(
      mainAnalysis.pages?.length || 0,
      competitorAnalysis.pages?.length || 0,
      result.insights.length
    );
    
    console.log(`Competitive analysis completed in ${result.processingStats.analysisTime}ms`);
    console.log(`Generated ${result.insights.length} insights with ${result.processingStats.confidence}% confidence`);
    
    return result;
    
  } catch (error) {
    console.error('Error in competitive analysis:', error);
    throw error;
  }
}

/**
 * Calculate advanced metrics with proper statistical analysis
 */
async function calculateAdvancedMetrics(
  mainAnalysis: any,
  competitorAnalysis: any
): Promise<CompetitorMetricsComparison> {
  
  // Import metrics calculator module
  const { calculateMetricComparison } = await import('./metrics-calculator.js');
  
  return {
    titleOptimization: calculateMetricComparison(
      mainAnalysis.metrics?.titleOptimization || 0,
      competitorAnalysis.metrics?.titleOptimization || 0,
      'optimization'
    ),
    descriptionOptimization: calculateMetricComparison(
      mainAnalysis.metrics?.descriptionOptimization || 0,
      competitorAnalysis.metrics?.descriptionOptimization || 0,
      'optimization'
    ),
    headingsOptimization: calculateMetricComparison(
      mainAnalysis.metrics?.headingsOptimization || 0,
      competitorAnalysis.metrics?.headingsOptimization || 0,
      'optimization'
    ),
    imagesOptimization: calculateMetricComparison(
      mainAnalysis.metrics?.imagesOptimization || 0,
      competitorAnalysis.metrics?.imagesOptimization || 0,
      'optimization'
    ),
    criticalIssues: calculateMetricComparison(
      mainAnalysis.metrics?.criticalIssues || 0,
      competitorAnalysis.metrics?.criticalIssues || 0,
      'issues' // Lower is better for issues
    ),
    technicalSEO: calculateMetricComparison(
      calculateTechnicalScore(mainAnalysis),
      calculateTechnicalScore(competitorAnalysis),
      'optimization'
    ),
    contentQuality: calculateMetricComparison(
      calculateContentQuality(mainAnalysis),
      calculateContentQuality(competitorAnalysis),
      'optimization'
    )
  };
}

/**
 * Analyze content gaps between sites
 */
async function analyzeContentGaps(
  mainAnalysis: any,
  competitorAnalysis: any
): Promise<ContentGapAnalysis> {
  
  const { analyzeGaps } = await import('./gap-analyzer.js');
  return analyzeGaps(mainAnalysis, competitorAnalysis);
}

/**
 * Compare strategic approaches
 */
async function compareStrategies(
  mainAnalysis: any,
  competitorAnalysis: any
): Promise<StrategyComparison> {
  
  const { detectStrategies } = await import('./strategy-detector.js');
  return detectStrategies(mainAnalysis, competitorAnalysis);
}

/**
 * Generate AI-powered insights
 */
async function generateAIInsights(
  metrics: CompetitorMetricsComparison,
  gaps: ContentGapAnalysis,
  strategies: StrategyComparison,
  openai: OpenAI,
  maxTokens: number
): Promise<CompetitorInsight[]> {
  
  const { generateContextualInsights } = await import('./insight-generator.js');
  return generateContextualInsights(metrics, gaps, strategies, openai, maxTokens);
}

/**
 * Generate basic rule-based insights
 */
function generateBasicInsights(
  metrics: CompetitorMetricsComparison,
  gaps: ContentGapAnalysis,
  strategies: StrategyComparison
): CompetitorInsight[] {
  
  const insights: CompetitorInsight[] = [];
  
  // Analyze each metric for insights
  Object.entries(metrics).forEach(([key, metric]) => {
    if (metric.significance === 'critical' && metric.advantage === 'competitor') {
      insights.push({
        category: key,
        priority: 'high',
        impact: 8,
        recommendation: `Improve ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} - competitor is ${Math.abs(metric.percentageDiff)}% ahead`,
        evidence: [`Competitor scores ${metric.competitor} vs your ${metric.main}`],
        actionItems: [getActionItemFor(key)]
      });
    }
  });
  
  // Add content gap insights
  if (gaps.missingTopics?.length > 0) {
    insights.push({
      category: 'content-gaps',
      priority: 'high',
      impact: 7,
      recommendation: `Create content for missing topics to capture additional search traffic`,
      evidence: [`Competitor covers ${gaps.missingTopics.length} topics you don't address`],
      actionItems: [`Create content for: ${gaps.missingTopics.slice(0, 3).join(', ')}`]
    });
  }
  
  return insights;
}

/**
 * Create executive summary
 */
function createCompetitiveSummary(
  metrics: CompetitorMetricsComparison,
  gaps: ContentGapAnalysis,
  insights: CompetitorInsight[]
): CompetitiveSummary {
  
  const advantages = Object.entries(metrics).filter(([_, m]) => m.advantage === 'main').map(([k, _]) => k);
  const weaknesses = Object.entries(metrics).filter(([_, m]) => m.advantage === 'competitor').map(([k, _]) => k);
  
  const highPriorityInsights = insights.filter(i => i.priority === 'high');
  const quickWins = insights.filter(i => i.impact >= 7 && (
    i.priority === 'high' || 
    i.category === 'content-gaps' ||
    i.category.includes('Optimization') ||
    i.category.includes('titleOptimization') ||
    i.category.includes('descriptionOptimization') ||
    i.category.includes('imagesOptimization')
  ));
  
  return {
    overallAdvantage: advantages.length > weaknesses.length ? 'main' : 
                     weaknesses.length > advantages.length ? 'competitor' : 'neutral',
    strengthAreas: advantages.map(formatAreaName),
    weaknessAreas: weaknesses.map(formatAreaName),
    quickWins: quickWins.slice(0, 3).map(i => i.recommendation),
    longTermOpportunities: gaps.missingTopics?.slice(0, 5) || []
  };
}

// Helper functions
function calculateTechnicalScore(analysis: any): number {
  const pages = analysis.pages || [];
  if (pages.length === 0) return 0;
  
  let score = 0;
  let total = 0;
  
  pages.forEach((page: any) => {
    if (page.loadTime) {
      score += page.loadTime < 3 ? 1 : 0; // Fast loading
      total++;
    }
    if (page.mobileOptimized !== undefined) {
      score += page.mobileOptimized ? 1 : 0;
      total++;
    }
    if (page.hasSSL !== undefined) {
      score += page.hasSSL ? 1 : 0;
      total++;
    }
  });
  
  return total > 0 ? (score / total) * 100 : 0;
}

function calculateContentQuality(analysis: any): number {
  const pages = analysis.pages || [];
  if (pages.length === 0) return 0;
  
  let qualityScore = 0;
  let total = pages.length;
  
  pages.forEach((page: any) => {
    let pageScore = 0;
    let factors = 0;
    
    // Title quality
    if (page.title) {
      pageScore += page.title.length >= 30 && page.title.length <= 60 ? 1 : 0.5;
      factors++;
    }
    
    // Description quality
    if (page.metaDescription) {
      pageScore += page.metaDescription.length >= 120 && page.metaDescription.length <= 160 ? 1 : 0.5;
      factors++;
    }
    
    // Content length
    if (page.wordCount) {
      pageScore += page.wordCount >= 300 ? 1 : 0.3;
      factors++;
    }
    
    // Heading structure
    if (page.headings?.length > 0) {
      pageScore += page.headings.filter((h: any) => h.level === 1).length === 1 ? 1 : 0.5;
      factors++;
    }
    
    qualityScore += factors > 0 ? pageScore / factors : 0;
  });
  
  return (qualityScore / total) * 100;
}

function getActionItemFor(metricKey: string): string {
  const actionMap: Record<string, string> = {
    titleOptimization: 'Review and optimize page titles for length and keyword inclusion',
    descriptionOptimization: 'Rewrite meta descriptions to be more compelling and keyword-rich',
    headingsOptimization: 'Improve heading structure and hierarchy',
    imagesOptimization: 'Add descriptive alt text to all images',
    criticalIssues: 'Fix critical SEO issues identified in the analysis',
    technicalSEO: 'Improve site speed, mobile optimization, and technical elements',
    contentQuality: 'Enhance content depth, readability, and value proposition'
  };
  
  return actionMap[metricKey] || 'Review and improve this area based on competitor analysis';
}

function formatAreaName(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function estimateTokenUsage(result: CompetitiveAnalysisResult): number {
  // Rough estimation based on content volume
  return result.insights.length * 50 + 
         Object.keys(result.metrics).length * 20 +
         (result.gaps.missingTopics?.length || 0) * 10;
}

function calculateConfidenceScore(
  mainPageCount: number,
  competitorPageCount: number,
  insightCount: number
): number {
  // Confidence based on data volume and insight quality
  const dataScore = Math.min((mainPageCount + competitorPageCount) / 20, 1) * 60;
  const insightScore = Math.min(insightCount / 10, 1) * 40;
  
  return Math.round(dataScore + insightScore);
}