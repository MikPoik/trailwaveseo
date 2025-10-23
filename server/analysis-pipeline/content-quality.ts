/**
 * Content Quality Analysis Module
 * Provides advanced content quality analysis including readability, 
 * keyword optimization, content depth, and engagement metrics
 */

import type { PageAnalysisResult } from './page-analyzer.js';

export interface ContentQualityAnalysis {
  overallScore: number;
  explanation?: string;
  readabilityAnalysis: ReadabilityAnalysis;
  keywordOptimization: KeywordOptimizationAnalysis;
  contentDepthAnalysis: ContentDepthAnalysis;
  engagementFactors: EngagementFactorsAnalysis;
  recommendations: ContentQualityRecommendation[];
}

interface ReadabilityAnalysis {
  fleschScore: number;
  gradeLevel: string;
  avgWordsPerSentence: number;
  avgSentencesPerParagraph: number;
  readabilityScore: number;
}

interface KeywordOptimizationAnalysis {
  keywordDensity: Array<{keyword: string, count: number, density: number}>;
  semanticKeywords: string[];
  keywordDistribution: number; // How well keywords are distributed
  optimizationScore: number;
}

interface ContentDepthAnalysis {
  averageWordCount: number;
  contentVariety: number; // Variety in content types and lengths
  headingStructure: number; // Quality of heading hierarchy
  informationDensity: number; // Value per word ratio
  depthScore: number;
}

interface EngagementFactorsAnalysis {
  ctaPresence: number; // Quality and presence of CTAs
  internalLinkingQuality: number; // Quality of internal linking
  contentFreshness: number; // Based on content indicators
  userJourneyOptimization: number; // How well content serves user intent
  engagementScore: number;
}

interface ContentQualityRecommendation {
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  impact: number;
  pages: string[]; // Which pages this applies to
}

/**
 * Analyze content quality across all pages
 */
export async function analyzeContentQuality(
  pages: PageAnalysisResult[]
): Promise<ContentQualityAnalysis> {
  
  console.log(`Analyzing content quality for ${pages.length} pages`);

  // Analyze readability across pages
  const readabilityAnalysis = analyzeReadability(pages);
  
  // Analyze keyword optimization
  const keywordOptimization = analyzeKeywordOptimization(pages);
  
  // Analyze content depth and value
  const contentDepthAnalysis = analyzeContentDepth(pages);
  
  // Analyze engagement factors
  const engagementFactors = analyzeEngagementFactors(pages);
  
  // Calculate overall content quality score
  const overallScore = calculateContentQualityScore(
    readabilityAnalysis,
    keywordOptimization,
    contentDepthAnalysis,
    engagementFactors
  );
  
  // Generate recommendations
  const recommendations = generateContentQualityRecommendations(
    pages,
    readabilityAnalysis,
    keywordOptimization,
    contentDepthAnalysis,
    engagementFactors
  );

  return {
    overallScore,
    readabilityAnalysis,
    keywordOptimization,
    contentDepthAnalysis,
    engagementFactors,
    recommendations
  };
}

/**
 * Analyze readability metrics
 */
function analyzeReadability(pages: PageAnalysisResult[]): ReadabilityAnalysis {
  const readabilityScores = pages.map(page => page.readabilityScore || 0);
  const avgFleschScore = readabilityScores.reduce((a, b) => a + b, 0) / pages.length;
  
  // Calculate average sentence and paragraph metrics
  let totalWordsPerSentence = 0;
  let totalSentencesPerParagraph = 0;
  let validPages = 0;

  pages.forEach(page => {
    if (page.sentences && page.sentences.length > 0) {
      const wordsPerSentence = page.wordCount / page.sentences.length;
      totalWordsPerSentence += wordsPerSentence;
      
      if (page.paragraphs && page.paragraphs.length > 0) {
        const sentencesPerParagraph = page.sentences.length / page.paragraphs.length;
        totalSentencesPerParagraph += sentencesPerParagraph;
      }
      validPages++;
    }
  });

  const avgWordsPerSentence = validPages > 0 ? totalWordsPerSentence / validPages : 0;
  const avgSentencesPerParagraph = validPages > 0 ? totalSentencesPerParagraph / validPages : 0;

  // Determine grade level
  let gradeLevel = 'Graduate';
  if (avgFleschScore >= 90) gradeLevel = '5th grade';
  else if (avgFleschScore >= 80) gradeLevel = '6th grade';
  else if (avgFleschScore >= 70) gradeLevel = '7th grade';
  else if (avgFleschScore >= 60) gradeLevel = '8th-9th grade';
  else if (avgFleschScore >= 50) gradeLevel = '10th-12th grade';
  else if (avgFleschScore >= 30) gradeLevel = 'College';

  return {
    fleschScore: Math.round(avgFleschScore),
    gradeLevel,
    avgWordsPerSentence: Math.round(avgWordsPerSentence),
    avgSentencesPerParagraph: Math.round(avgSentencesPerParagraph * 10) / 10,
    readabilityScore: Math.round(avgFleschScore)
  };
}

/**
 * Analyze keyword optimization
 */
function analyzeKeywordOptimization(pages: PageAnalysisResult[]): KeywordOptimizationAnalysis {
  // Aggregate keyword data
  const allKeywords = new Map<string, { count: number, density: number, pages: string[] }>();
  
  pages.forEach(page => {
    page.keywordDensity?.forEach(kw => {
      const existing = allKeywords.get(kw.keyword);
      if (existing) {
        existing.count += kw.count;
        existing.density += kw.density;
        existing.pages.push(page.url);
      } else {
        allKeywords.set(kw.keyword, {
          count: kw.count,
          density: kw.density,
          pages: [page.url]
        });
      }
    });
  });

  const keywordDensity = Array.from(allKeywords.entries())
    .map(([keyword, data]) => ({
      keyword,
      count: data.count,
      density: Math.round((data.density / data.pages.length) * 100) / 100
    }))
    .sort((a, b) => b.density - a.density)
    .slice(0, 20);

  // Aggregate semantic keywords
  const allSemanticKeywords = new Set<string>();
  pages.forEach(page => {
    page.semanticKeywords?.forEach(kw => allSemanticKeywords.add(kw));
  });

  const semanticKeywords = Array.from(allSemanticKeywords).slice(0, 15);

  // Calculate keyword distribution quality
  const keywordDistribution = calculateKeywordDistribution(pages);
  
  // Calculate optimization score
  const optimizationScore = Math.round(
    (keywordDensity.length >= 5 ? 30 : keywordDensity.length * 6) +
    (semanticKeywords.length >= 10 ? 30 : semanticKeywords.length * 3) +
    keywordDistribution
  );

  return {
    keywordDensity,
    semanticKeywords,
    keywordDistribution,
    optimizationScore: Math.min(100, optimizationScore)
  };
}

/**
 * Analyze content depth and value
 */
function analyzeContentDepth(pages: PageAnalysisResult[]): ContentDepthAnalysis {
  const wordCounts = pages.map(page => page.wordCount);
  const averageWordCount = wordCounts.reduce((a, b) => a + b, 0) / pages.length;
  
  // Calculate content variety (coefficient of variation in word counts)
  const standardDev = Math.sqrt(
    wordCounts.reduce((sum, count) => sum + Math.pow(count - averageWordCount, 2), 0) / pages.length
  );
  const contentVariety = Math.round((standardDev / averageWordCount) * 100);
  
  // Analyze heading structure quality
  const headingQualityScores = pages.map(page => {
    const h1Count = page.headings.filter(h => h.level === 1).length;
    const h2Count = page.headings.filter(h => h.level === 2).length;
    const hasGoodStructure = h1Count === 1 && h2Count >= 2;
    return hasGoodStructure ? 100 : Math.min(50, page.headings.length * 10);
  });
  
  const headingStructure = headingQualityScores.reduce((a, b) => a + b, 0) / pages.length;
  
  // Calculate information density (value per word)
  const informationDensity = Math.round(
    pages.reduce((sum, page) => {
      const uniqueKeywords = new Set(page.keywordDensity?.map(kw => kw.keyword) || []);
      return sum + (uniqueKeywords.size / Math.max(page.wordCount, 1)) * 1000;
    }, 0) / pages.length
  );
  
  const depthScore = Math.round(
    (averageWordCount >= 500 ? 30 : averageWordCount / 500 * 30) +
    (contentVariety >= 20 && contentVariety <= 80 ? 25 : 15) +
    (headingStructure / 100 * 25) +
    Math.min(20, informationDensity)
  );

  return {
    averageWordCount: Math.round(averageWordCount),
    contentVariety,
    headingStructure: Math.round(headingStructure),
    informationDensity,
    depthScore: Math.min(100, depthScore)
  };
}

/**
 * Analyze engagement factors
 */
function analyzeEngagementFactors(pages: PageAnalysisResult[]): EngagementFactorsAnalysis {
  // CTA presence analysis
  const ctaQuality = pages.reduce((sum, page) => {
    const ctaCount = page.ctaElements?.length || 0;
    return sum + (ctaCount >= 1 && ctaCount <= 3 ? 100 : ctaCount > 0 ? 70 : 20);
  }, 0) / pages.length;

  // Internal linking quality
  const linkingQuality = pages.reduce((sum, page) => {
    const linkCount = page.internalLinks?.length || 0;
    return sum + (linkCount >= 3 && linkCount <= 10 ? 100 : linkCount > 0 ? 70 : 30);
  }, 0) / pages.length;

  // Content freshness indicators (based on content style and structure)
  const freshnessScore = pages.reduce((sum, page) => {
    const hasTimestamps = page.allTextContent?.includes('2024') || page.allTextContent?.includes('2025');
    const hasModernStructure = page.headings.length >= 3 && page.wordCount >= 300;
    return sum + (hasTimestamps && hasModernStructure ? 90 : hasModernStructure ? 70 : 50);
  }, 0) / pages.length;

  // User journey optimization
  const journeyOptimization = pages.reduce((sum, page) => {
    const hasGoodStructure = page.headings.length >= 2;
    const hasReasonableLength = page.wordCount >= 200 && page.wordCount <= 3000;
    const hasCTAs = (page.ctaElements?.length || 0) > 0;
    return sum + (hasGoodStructure && hasReasonableLength && hasCTAs ? 90 : 60);
  }, 0) / pages.length;

  const engagementScore = Math.round(
    ctaQuality * 0.3 +
    linkingQuality * 0.25 +
    freshnessScore * 0.25 +
    journeyOptimization * 0.2
  );

  return {
    ctaPresence: Math.round(ctaQuality),
    internalLinkingQuality: Math.round(linkingQuality),
    contentFreshness: Math.round(freshnessScore),
    userJourneyOptimization: Math.round(journeyOptimization),
    engagementScore: Math.min(100, engagementScore)
  };
}

/**
 * Calculate keyword distribution quality
 */
function calculateKeywordDistribution(pages: PageAnalysisResult[]): number {
  // Analyze how well keywords are distributed across pages
  const keywordPages = new Map<string, Set<string>>();
  
  pages.forEach(page => {
    page.keywordDensity?.forEach(kw => {
      if (!keywordPages.has(kw.keyword)) {
        keywordPages.set(kw.keyword, new Set());
      }
      keywordPages.get(kw.keyword)?.add(page.url);
    });
  });

  // Calculate distribution score based on keyword spread
  const distributionScores = Array.from(keywordPages.values()).map(pageSet => {
    const distribution = pageSet.size / pages.length;
    return distribution > 0.3 && distribution < 0.8 ? 100 : distribution > 0 ? 60 : 0;
  });

  if (distributionScores.length === 0) return 0;

  const numericScores = distributionScores.map(s => Number(s));
  const sum = numericScores.reduce((a, b) => a + b, 0);
  return sum / numericScores.length;
}

/**
 * Generate content quality recommendations
 */
function generateContentQualityRecommendations(
  pages: PageAnalysisResult[],
  readability: ReadabilityAnalysis,
  keywords: KeywordOptimizationAnalysis,
  depth: ContentDepthAnalysis,
  engagement: EngagementFactorsAnalysis
): ContentQualityRecommendation[] {
  
  const recommendations: ContentQualityRecommendation[] = [];

  // Readability recommendations
  if (readability.readabilityScore < 60) {
    recommendations.push({
      category: 'readability',
      priority: 'medium',
      title: 'Improve Content Readability',
      description: `Content is reading at ${readability.gradeLevel} level, which may be too complex for general audiences.`,
      actionItems: [
        'Use shorter sentences (aim for 15-20 words per sentence)',
        'Break up long paragraphs into smaller chunks',
        'Use simpler vocabulary where possible',
        'Add more subheadings to break up content'
      ],
      impact: 6,
      pages: pages.filter(p => (p.readabilityScore || 0) < 60).map(p => p.url)
    });
  }

  // Content depth recommendations
  if (depth.averageWordCount < 500) {
    const shortPages = pages.filter(p => p.wordCount < 500);
    recommendations.push({
      category: 'content-depth',
      priority: 'high',
      title: 'Increase Content Depth',
      description: `${shortPages.length} pages have less than 500 words, which may hurt SEO performance.`,
      actionItems: [
        'Add more detailed explanations and examples',
        'Include relevant statistics and data',
        'Expand on key topics with supporting information',
        'Add FAQ sections or additional value'
      ],
      impact: 7,
      pages: shortPages.map(p => p.url)
    });
  }

  // Keyword optimization recommendations
  if (keywords.optimizationScore < 70) {
    recommendations.push({
      category: 'keyword-optimization',
      priority: 'medium',
      title: 'Improve Keyword Strategy',
      description: 'Keyword optimization could be improved for better search visibility.',
      actionItems: [
        'Research and include more relevant keywords naturally',
        'Improve keyword distribution across pages',
        'Focus on long-tail keyword opportunities',
        'Optimize for semantic search with related terms'
      ],
      impact: 6,
      pages: pages.filter(p => (p.keywordDensity?.length || 0) < 5).map(p => p.url)
    });
  }

  // Engagement recommendations
  if (engagement.ctaPresence < 70) {
    const pagesWithoutCTAs = pages.filter(p => (p.ctaElements?.length || 0) === 0);
    recommendations.push({
      category: 'engagement',
      priority: 'medium',
      title: 'Add Clear Calls-to-Action',
      description: `${pagesWithoutCTAs.length} pages are missing clear calls-to-action.`,
      actionItems: [
        'Add relevant CTAs to guide user actions',
        'Make CTAs prominent and action-oriented',
        'Ensure CTAs match user intent for each page',
        'Test different CTA placements and wording'
      ],
      impact: 5,
      pages: pagesWithoutCTAs.map(p => p.url)
    });
  }

  if (engagement.internalLinkingQuality < 60) {
    const poorlyLinkedPages = pages.filter(p => (p.internalLinks?.length || 0) < 3);
    recommendations.push({
      category: 'internal-linking',
      priority: 'medium',
      title: 'Improve Internal Linking',
      description: `${poorlyLinkedPages.length} pages have insufficient internal links.`,
      actionItems: [
        'Add 3-5 relevant internal links per page',
        'Use descriptive anchor text',
        'Link to related content and deeper pages',
        'Create content clusters with hub pages'
      ],
      impact: 5,
      pages: poorlyLinkedPages.map(p => p.url)
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority] || b.impact - a.impact;
  });
}

/**
 * Calculate overall content quality score
 */
function calculateContentQualityScore(
  readability: ReadabilityAnalysis,
  keywords: KeywordOptimizationAnalysis,
  depth: ContentDepthAnalysis,
  engagement: EngagementFactorsAnalysis
): number {
  
  return Math.round(
    readability.readabilityScore * 0.25 +
    keywords.optimizationScore * 0.25 +
    depth.depthScore * 0.3 +
    engagement.engagementScore * 0.2
  );
}