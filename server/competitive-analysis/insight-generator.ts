/**
 * Context-aware insight generation for competitive analysis
 * Generates actionable recommendations based on competitive intelligence
 */

import type { OpenAI } from 'openai';

export interface CompetitorInsight {
  category: string;
  priority: 'high' | 'medium' | 'low';
  impact: number; // 1-10 scale
  recommendation: string;
  evidence: string[];
  actionItems: string[];
}

/**
 * Generate contextual insights using AI analysis
 */
export async function generateContextualInsights(
  metrics: any,
  gaps: any,
  strategies: any,
  openai: OpenAI,
  maxTokens: number
): Promise<CompetitorInsight[]> {
  
  console.log('Generating AI-powered competitive insights...');
  
  try {
    // Prepare comprehensive competitive intelligence summary
    const competitiveIntelligence = buildCompetitiveIntelligence(metrics, gaps, strategies);
    
    const prompt = createInsightGenerationPrompt(competitiveIntelligence);
    
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        {
          role: "system",
          content: `You are an expert competitive SEO strategist. Analyze competitive data and provide specific, actionable insights that will drive real business results. Focus on:
          
          1. High-impact opportunities with clear ROI
          2. Specific tactics the competitor is using successfully
          3. Concrete action steps with realistic timelines
          4. Strategic advantages that can be captured
          5. Risk mitigation for competitive threats
          
          Always be specific with numbers, examples, and measurable outcomes.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_completion_tokens: Math.min(maxTokens, 2000)
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.warn('No content returned from OpenAI for competitive insights');
      return generateFallbackInsights(metrics, gaps, strategies);
    }

    const result = JSON.parse(content);
    const insights = parseAIInsights(result.insights || []);
    
    console.log(`Generated ${insights.length} AI-powered competitive insights`);
    return insights;

  } catch (error) {
    console.error('Error generating AI insights:', error);
    return generateFallbackInsights(metrics, gaps, strategies);
  }
}

/**
 * Build competitive intelligence summary for AI analysis
 */
function buildCompetitiveIntelligence(metrics: any, gaps: any, strategies: any): CompetitiveIntelligenceSummary {
  return {
    performanceGaps: analyzePerformanceGaps(metrics),
    contentOpportunities: analyzeContentOpportunities(gaps),
    strategicInsights: analyzeStrategicInsights(strategies),
    competitiveThreats: identifyCompetitiveThreats(metrics, strategies),
    quickWinOpportunities: identifyQuickWins(metrics, gaps),
    longTermStrategies: identifyLongTermStrategies(gaps, strategies)
  };
}

interface CompetitiveIntelligenceSummary {
  performanceGaps: PerformanceGap[];
  contentOpportunities: ContentOpportunity[];
  strategicInsights: StrategicInsight[];
  competitiveThreats: CompetitiveThreat[];
  quickWinOpportunities: QuickWin[];
  longTermStrategies: LongTermStrategy[];
}

interface PerformanceGap {
  metric: string;
  gap: number;
  impact: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ContentOpportunity {
  type: string;
  volumeGap: number;
  keywords: string[];
  estimatedTraffic: number;
}

interface StrategicInsight {
  area: string;
  competitorAdvantage: string;
  implicationForMain: string;
  recommendations: string[];
}

interface CompetitiveThreat {
  threat: string;
  severity: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'short-term' | 'long-term';
  mitigation: string[];
}

interface QuickWin {
  action: string;
  estimatedImpact: number;
  timeToImplement: string;
  resources: string[];
}

interface LongTermStrategy {
  strategy: string;
  expectedOutcome: string;
  timeline: string;
  investmentLevel: 'low' | 'medium' | 'high';
}

/**
 * Create comprehensive prompt for AI insight generation
 */
function createInsightGenerationPrompt(intelligence: CompetitiveIntelligenceSummary): string {
  return `Analyze this competitive intelligence data and provide 8-12 specific, actionable insights for improving SEO performance against the competitor:

PERFORMANCE GAPS:
${intelligence.performanceGaps.map(gap => 
  `- ${gap.metric}: ${gap.gap} point gap (${gap.impact} impact, ${gap.difficulty} difficulty)`
).join('\n') || 'No significant performance gaps identified'}

CONTENT OPPORTUNITIES:
${intelligence.contentOpportunities.map(opp => 
  `- ${opp.type}: ${opp.volumeGap} gap, ${opp.estimatedTraffic} potential monthly visitors`
).join('\n') || 'No major content opportunities identified'}

STRATEGIC INSIGHTS:
${intelligence.strategicInsights.map(insight => 
  `- ${insight.area}: Competitor uses ${insight.competitorAdvantage}`
).join('\n') || 'No major strategic differences identified'}

QUICK WINS IDENTIFIED:
${intelligence.quickWinOpportunities.map(win => 
  `- ${win.action}: ${win.estimatedImpact}% impact, ${win.timeToImplement}`
).join('\n') || 'No quick wins identified'}

COMPETITIVE THREATS:
${intelligence.competitiveThreats.map(threat => 
  `- ${threat.threat} (${threat.severity} severity, ${threat.timeframe})`
).join('\n') || 'No immediate competitive threats'}

Provide insights in this JSON format:
{
  "insights": [
    {
      "category": "content-gaps|technical-seo|keyword-strategy|user-experience",
      "priority": "high|medium|low", 
      "impact": 1-10,
      "recommendation": "Specific action to take",
      "evidence": ["Supporting data points"],
      "actionItems": ["Concrete steps to implement"]
    }
  ]
}

Focus on:
1. Highest ROI opportunities first
2. Specific tactics competitor is using successfully  
3. Measurable outcomes and timelines
4. Resource requirements and implementation complexity
5. Risk mitigation for competitive threats`;
}

/**
 * Parse AI insights into proper format
 */
function parseAIInsights(aiInsights: any[]): CompetitorInsight[] {
  return aiInsights.map((insight: any) => ({
    category: insight.category || 'general',
    priority: insight.priority || 'medium',
    impact: Math.min(Math.max(insight.impact || 5, 1), 10),
    recommendation: insight.recommendation || '',
    evidence: Array.isArray(insight.evidence) ? insight.evidence : [],
    actionItems: Array.isArray(insight.actionItems) ? insight.actionItems : []
  })).filter(insight => insight.recommendation.length > 0);
}

/**
 * Generate fallback insights when AI is unavailable
 */
function generateFallbackInsights(metrics: any, gaps: any, strategies: any): CompetitorInsight[] {
  const insights: CompetitorInsight[] = [];
  
  // Critical metric gaps
  Object.entries(metrics).forEach(([key, metric]: [string, any]) => {
    if (metric.advantage === 'competitor' && metric.significance === 'critical') {
      insights.push({
        category: mapMetricToCategory(key),
        priority: 'high',
        impact: 8,
        recommendation: `Improve ${formatMetricName(key)} - competitor is ${Math.abs(metric.percentageDiff)}% ahead`,
        evidence: [
          `Your score: ${metric.main}`,
          `Competitor score: ${metric.competitor}`,
          `Performance gap: ${Math.abs(metric.difference)} points`
        ],
        actionItems: getActionItemsForMetric(key)
      });
    }
  });
  
  // Content opportunities
  if (gaps.missingTopics && gaps.missingTopics.length >= 3) {
    insights.push({
      category: 'content-gaps',
      priority: 'high',
      impact: 7,
      recommendation: `Create content for ${gaps.missingTopics.length} topics where competitor has coverage but you don't`,
      evidence: [
        `Missing topics: ${gaps.missingTopics.slice(0, 5).join(', ')}`,
        `Estimated traffic opportunity: ${estimateTrafficPotential(gaps.missingTopics.length, 'topics')} monthly visitors`
      ],
      actionItems: [
        'Conduct detailed topic research for missing areas',
        'Create content calendar for new topic coverage',
        'Develop comprehensive content for top 3 missing topics first'
      ]
    });
  }
  
  return insights.sort((a, b) => {
    const priorityScore = { high: 3, medium: 2, low: 1 };
    return (priorityScore[b.priority] * 10 + b.impact) - (priorityScore[a.priority] * 10 + a.impact);
  });
}

// Helper functions for analysis
function analyzePerformanceGaps(metrics: any): PerformanceGap[] {
  const gaps: PerformanceGap[] = [];
  
  Object.entries(metrics).forEach(([key, metric]: [string, any]) => {
    if (metric.advantage === 'competitor' && metric.significance !== 'minor') {
      gaps.push({
        metric: key,
        gap: Math.abs(metric.difference),
        impact: metric.significance === 'critical' ? 'high' : 'medium',
        difficulty: estimateDifficulty(key, Math.abs(metric.difference))
      });
    }
  });
  
  return gaps.sort((a, b) => {
    const impactScore = { high: 3, medium: 2, low: 1 };
    const difficultyScore = { easy: 3, medium: 2, hard: 1 };
    
    const scoreA = impactScore[a.impact] + difficultyScore[a.difficulty];
    const scoreB = impactScore[b.impact] + difficultyScore[b.difficulty];
    
    return scoreB - scoreA;
  });
}

function analyzeContentOpportunities(gaps: any): ContentOpportunity[] {
  const opportunities: ContentOpportunity[] = [];
  
  if (gaps.missingTopics && gaps.missingTopics.length > 0) {
    opportunities.push({
      type: 'missing-topics',
      volumeGap: gaps.missingTopics.length,
      keywords: gaps.opportunityKeywords?.slice(0, 10) || [],
      estimatedTraffic: estimateTrafficPotential(gaps.missingTopics.length, 'topics')
    });
  }
  
  return opportunities;
}

function analyzeStrategicInsights(strategies: any): StrategicInsight[] {
  const insights: StrategicInsight[] = [];
  
  Object.entries(strategies).forEach(([area, strategy]: [string, any]) => {
    if (strategy.effectiveness === 'inferior') {
      insights.push({
        area,
        competitorAdvantage: strategy.competitorApproach,
        implicationForMain: `Currently underperforming in ${area.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
        recommendations: strategy.recommendations || []
      });
    }
  });
  
  return insights;
}

function identifyCompetitiveThreats(metrics: any, strategies: any): CompetitiveThreat[] {
  const threats: CompetitiveThreat[] = [];
  
  Object.entries(metrics).forEach(([key, metric]: [string, any]) => {
    if (metric.advantage === 'competitor' && metric.significance === 'critical') {
      threats.push({
        threat: `Competitor significantly outperforms in ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
        severity: 'high',
        timeframe: 'immediate',
        mitigation: [`Focus on improving ${key} through targeted optimization efforts`]
      });
    }
  });
  
  return threats;
}

function identifyQuickWins(metrics: any, gaps: any): QuickWin[] {
  const quickWins: QuickWin[] = [];
  
  Object.entries(metrics).forEach(([key, metric]: [string, any]) => {
    if (metric.advantage === 'competitor' && 
        ['imagesOptimization', 'descriptionOptimization'].includes(key)) {
      quickWins.push({
        action: `Optimize ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
        estimatedImpact: Math.min(Math.abs(metric.difference) * 10, 100),
        timeToImplement: '2-4 weeks',
        resources: ['Content team', 'SEO specialist']
      });
    }
  });
  
  return quickWins;
}

function identifyLongTermStrategies(gaps: any, strategies: any): LongTermStrategy[] {
  const longTermStrategies: LongTermStrategy[] = [];
  
  if (gaps.missingTopics && gaps.missingTopics.length >= 5) {
    longTermStrategies.push({
      strategy: 'Market expansion into competitor topic areas',
      expectedOutcome: `Enter ${gaps.missingTopics.length} new content verticals`,
      timeline: '6-18 months',
      investmentLevel: 'high'
    });
  }
  
  return longTermStrategies;
}

// Helper functions
function estimateDifficulty(metric: string, gap: number): 'easy' | 'medium' | 'hard' {
  const easyMetrics = ['imagesOptimization', 'descriptionOptimization'];
  const hardMetrics = ['technicalSEO', 'contentQuality'];
  
  if (easyMetrics.includes(metric)) return gap < 10 ? 'easy' : 'medium';
  if (hardMetrics.includes(metric)) return gap < 5 ? 'medium' : 'hard';
  
  if (gap < 5) return 'easy';
  if (gap < 15) return 'medium';
  return 'hard';
}

function mapMetricToCategory(metric: string): string {
  const categoryMap: Record<string, string> = {
    titleOptimization: 'content-optimization',
    descriptionOptimization: 'content-optimization', 
    headingsOptimization: 'content-optimization',
    imagesOptimization: 'technical-seo',
    criticalIssues: 'technical-seo',
    technicalSEO: 'technical-seo',
    contentQuality: 'content-gaps'
  };
  
  return categoryMap[metric] || 'general';
}

function formatMetricName(metric: string): string {
  return metric.replace(/([A-Z])/g, ' $1').toLowerCase();
}

function getActionItemsForMetric(metric: string): string[] {
  const actionMap: Record<string, string[]> = {
    titleOptimization: [
      'Audit all page titles for length and keyword optimization',
      'Rewrite titles to include primary keywords in first 60 characters',
      'Ensure each page has unique, descriptive titles'
    ],
    descriptionOptimization: [
      'Write compelling meta descriptions for all pages',
      'Include relevant keywords naturally in descriptions', 
      'Keep descriptions between 120-160 characters'
    ],
    headingsOptimization: [
      'Establish clear heading hierarchy on all pages',
      'Include target keywords in H1 and H2 tags',
      'Ensure only one H1 per page'
    ],
    imagesOptimization: [
      'Add descriptive alt text to all images',
      'Optimize image file names with relevant keywords',
      'Compress images for faster loading'
    ],
    criticalIssues: [
      'Conduct comprehensive technical SEO audit',
      'Fix broken links, 404 errors, and redirect chains',
      'Resolve duplicate content and indexing issues'
    ]
  };
  
  return actionMap[metric] || ['Analyze competitor approach and implement best practices'];
}

function estimateTrafficPotential(volume: number, type: 'topics' | 'pages'): number {
  const baseTrafficPerTopic = 150;
  const baseTrafficPerPage = 50;
  
  if (type === 'topics') {
    return Math.round(volume * baseTrafficPerTopic * 0.7);
  } else {
    return Math.round(volume * baseTrafficPerPage * 0.8);
  }
}