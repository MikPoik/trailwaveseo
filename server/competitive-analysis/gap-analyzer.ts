/**
 * Content and keyword gap analysis for competitive intelligence
 * Identifies opportunities and weaknesses compared to competitors
 */

export interface ContentGapAnalysis {
  missingTopics: string[];
  underOptimizedAreas: string[];
  opportunityKeywords: string[];
  contentVolumeGaps: ContentVolumeGap[];
  topicalCoverage: TopicalCoverageAnalysis;
  keywordGaps: KeywordGapAnalysis;
}

interface ContentVolumeGap {
  area: string;
  mainCount: number;
  competitorCount: number;
  gap: number;
  opportunity: 'high' | 'medium' | 'low';
}

interface TopicalCoverageAnalysis {
  mainTopics: TopicCluster[];
  competitorTopics: TopicCluster[];
  sharedTopics: string[];
  uniqueToMain: string[];
  uniqueToCompetitor: string[];
  coverageScore: number;
}

interface TopicCluster {
  topic: string;
  pageCount: number;
  avgWordCount: number;
  keywords: string[];
  strength: number;
}

interface KeywordGapAnalysis {
  competitorKeywords: KeywordOpportunity[];
  missingKeywords: string[];
  weakKeywords: string[];
  opportunityScore: number;
}

interface KeywordOpportunity {
  keyword: string;
  competitorPages: number;
  mainPages: number;
  difficulty: 'low' | 'medium' | 'high';
  opportunity: number; // 1-10 scale
}

/**
 * Analyze gaps between main site and competitor
 */
export function analyzeGaps(
  mainAnalysis: any,
  competitorAnalysis: any
): ContentGapAnalysis {
  
  console.log('Starting gap analysis...');
  
  const mainPages = mainAnalysis.pages || [];
  const competitorPages = competitorAnalysis.pages || [];
  
  // Analyze topical coverage
  const topicalCoverage = analyzeTopicalCoverage(mainPages, competitorPages);
  
  // Analyze keyword gaps
  const keywordGaps = analyzeKeywordGaps(mainPages, competitorPages);
  
  // Identify content volume gaps
  const contentVolumeGaps = analyzeContentVolumeGaps(mainPages, competitorPages);
  
  // Identify missing topics
  const missingTopics = identifyMissingTopics(topicalCoverage);
  
  // Identify under-optimized areas
  const underOptimizedAreas = identifyUnderOptimizedAreas(mainPages, competitorPages);
  
  // Extract opportunity keywords
  const opportunityKeywords = keywordGaps.competitorKeywords
    .filter(kw => kw.opportunity >= 6 && kw.difficulty !== 'high')
    .map(kw => kw.keyword)
    .slice(0, 10);
  
  return {
    missingTopics,
    underOptimizedAreas,
    opportunityKeywords,
    contentVolumeGaps,
    topicalCoverage,
    keywordGaps
  };
}

/**
 * Analyze topical coverage comparison
 */
function analyzeTopicalCoverage(
  mainPages: any[],
  competitorPages: any[]
): TopicalCoverageAnalysis {
  
  // Extract topics from both sites
  const mainTopics = extractTopicClusters(mainPages);
  const competitorTopics = extractTopicClusters(competitorPages);
  
  // Find shared and unique topics
  const mainTopicNames = mainTopics.map(t => t.topic);
  const competitorTopicNames = competitorTopics.map(t => t.topic);
  
  const sharedTopics = mainTopicNames.filter(topic => 
    competitorTopicNames.includes(topic)
  );
  
  const uniqueToMain = mainTopicNames.filter(topic => 
    !competitorTopicNames.includes(topic)
  );
  
  const uniqueToCompetitor = competitorTopicNames.filter(topic => 
    !mainTopicNames.includes(topic)
  );
  
  // Calculate coverage score
  const totalTopics = new Set([...mainTopicNames, ...competitorTopicNames]).size;
  const coverageScore = totalTopics > 0 ? 
    Math.round((mainTopicNames.length / totalTopics) * 100) : 0;
  
  return {
    mainTopics,
    competitorTopics,
    sharedTopics,
    uniqueToMain,
    uniqueToCompetitor,
    coverageScore
  };
}

/**
 * Extract topic clusters from pages
 */
function extractTopicClusters(pages: any[]): TopicCluster[] {
  const topicMap = new Map<string, {
    pages: any[];
    keywords: Set<string>;
    totalWords: number;
  }>();
  
  pages.forEach(page => {
    // Extract topics from titles, headings, and content
    const topics = extractTopicsFromPage(page);
    
    topics.forEach(topic => {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, {
          pages: [],
          keywords: new Set(),
          totalWords: 0
        });
      }
      
      const cluster = topicMap.get(topic)!;
      cluster.pages.push(page);
      cluster.totalWords += page.wordCount || 0;
      
      // Add keywords from this page
      if (page.keywords) {
        page.keywords.forEach((kw: any) => {
          if (kw.keyword) cluster.keywords.add(kw.keyword);
        });
      }
    });
  });
  
  // Convert to TopicCluster format
  return Array.from(topicMap.entries()).map(([topic, data]) => ({
    topic,
    pageCount: data.pages.length,
    avgWordCount: data.pages.length > 0 ? Math.round(data.totalWords / data.pages.length) : 0,
    keywords: Array.from(data.keywords).slice(0, 10), // Top 10 keywords
    strength: calculateTopicStrength(data.pages, data.totalWords)
  })).sort((a, b) => b.strength - a.strength);
}

/**
 * Extract topics from a single page
 */
function extractTopicsFromPage(page: any): string[] {
  const topics = new Set<string>();
  
  // Extract from title
  if (page.title) {
    const titleTopics = extractKeyPhrases(page.title);
    titleTopics.forEach(topic => topics.add(topic));
  }
  
  // Extract from H1 and H2 headings
  if (page.headings) {
    page.headings
      .filter((h: any) => h.level <= 2)
      .forEach((heading: any) => {
        if (heading.text) {
          const headingTopics = extractKeyPhrases(heading.text);
          headingTopics.forEach(topic => topics.add(topic));
        }
      });
  }
  
  // Extract from URL path
  if (page.url) {
    const pathTopics = extractTopicsFromUrl(page.url);
    pathTopics.forEach(topic => topics.add(topic));
  }
  
  return Array.from(topics)
    .filter(topic => topic.length >= 3 && topic.length <= 30)
    .slice(0, 5); // Limit to top 5 topics per page
}

/**
 * Extract key phrases from text
 */
function extractKeyPhrases(text: string): string[] {
  if (!text) return [];
  
  const phrases: string[] = [];
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  // Extract 2-3 word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const twoWordPhrase = `${words[i]} ${words[i + 1]}`;
    phrases.push(twoWordPhrase);
    
    if (i < words.length - 2) {
      const threeWordPhrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      phrases.push(threeWordPhrase);
    }
  }
  
  // Filter out common stop word combinations
  const stopPatterns = [
    /^(the|and|or|but|in|on|at|to|for|of|with|by)\s/,
    /\s(the|and|or|but|in|on|at|to|for|of|with|by)$/,
    /^(how|what|where|when|why|who)\s/
  ];
  
  return phrases.filter(phrase => 
    !stopPatterns.some(pattern => pattern.test(phrase))
  );
}

/**
 * Extract topics from URL path
 */
function extractTopicsFromUrl(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname
      .split('/')
      .filter(part => part.length > 0)
      .map(part => part.replace(/[-_]/g, ' '))
      .filter(part => part.length >= 3);
    
    return pathParts;
  } catch {
    return [];
  }
}

/**
 * Calculate topic strength score
 */
function calculateTopicStrength(pages: any[], totalWords: number): number {
  let strength = 0;
  
  // Page count factor (more pages = stronger topic)
  strength += Math.min(pages.length * 10, 50);
  
  // Content depth factor
  const avgWordCount = pages.length > 0 ? totalWords / pages.length : 0;
  if (avgWordCount >= 500) strength += 30;
  else if (avgWordCount >= 300) strength += 20;
  else if (avgWordCount >= 100) strength += 10;
  
  // SEO optimization factor
  const optimizedPages = pages.filter(page => 
    page.title && page.metaDescription && (page.headings?.length > 0)
  ).length;
  
  if (pages.length > 0) {
    strength += (optimizedPages / pages.length) * 20;
  }
  
  return Math.round(strength);
}

/**
 * Analyze keyword gaps
 */
function analyzeKeywordGaps(
  mainPages: any[],
  competitorPages: any[]
): KeywordGapAnalysis {
  
  // Extract all keywords from both sites
  const mainKeywords = extractAllKeywords(mainPages);
  const competitorKeywords = extractAllKeywords(competitorPages);
  
  // Find keywords competitor has but main site doesn't
  const competitorOnlyKeywords = competitorKeywords.filter(compKw => 
    !mainKeywords.some(mainKw => mainKw.keyword === compKw.keyword)
  );
  
  // Find keywords where competitor is stronger
  const weakKeywords = mainKeywords.filter(mainKw => {
    const compKw = competitorKeywords.find(ck => ck.keyword === mainKw.keyword);
    return compKw && compKw.pageCount > mainKw.pageCount;
  }).map(kw => kw.keyword);
  
  // Calculate opportunity keywords
  const opportunityKeywords = competitorOnlyKeywords
    .map(kw => ({
      keyword: kw.keyword,
      competitorPages: kw.pageCount,
      mainPages: 0,
      difficulty: estimateKeywordDifficulty(kw.keyword, kw.avgDensity),
      opportunity: calculateKeywordOpportunity(kw.pageCount, kw.avgDensity)
    }))
    .sort((a, b) => b.opportunity - a.opportunity);
  
  return {
    competitorKeywords: opportunityKeywords,
    missingKeywords: competitorOnlyKeywords.slice(0, 20).map(kw => kw.keyword),
    weakKeywords: weakKeywords.slice(0, 15),
    opportunityScore: calculateOverallOpportunityScore(opportunityKeywords)
  };
}

/**
 * Extract all keywords from pages
 */
function extractAllKeywords(pages: any[]): Array<{
  keyword: string;
  pageCount: number;
  totalDensity: number;
  avgDensity: number;
}> {
  const keywordMap = new Map<string, {
    pageCount: number;
    totalDensity: number;
  }>();
  
  pages.forEach(page => {
    if (page.keywords) {
      page.keywords.forEach((kw: any) => {
        if (kw.keyword && kw.density) {
          const keyword = kw.keyword.toLowerCase().trim();
          
          if (!keywordMap.has(keyword)) {
            keywordMap.set(keyword, { pageCount: 0, totalDensity: 0 });
          }
          
          const data = keywordMap.get(keyword)!;
          data.pageCount++;
          data.totalDensity += kw.density;
        }
      });
    }
  });
  
  return Array.from(keywordMap.entries()).map(([keyword, data]) => ({
    keyword,
    pageCount: data.pageCount,
    totalDensity: data.totalDensity,
    avgDensity: data.pageCount > 0 ? data.totalDensity / data.pageCount : 0
  }));
}

/**
 * Estimate keyword difficulty
 */
function estimateKeywordDifficulty(
  keyword: string,
  avgDensity: number
): 'low' | 'medium' | 'high' {
  
  // Simple heuristic based on keyword characteristics
  const wordCount = keyword.split(' ').length;
  
  // Long-tail keywords are generally easier
  if (wordCount >= 4) return 'low';
  if (wordCount === 3) return 'medium';
  
  // Short keywords with high density suggest competition
  if (wordCount <= 2 && avgDensity > 2) return 'high';
  if (wordCount <= 2 && avgDensity > 1) return 'medium';
  
  return 'low';
}

/**
 * Calculate keyword opportunity score
 */
function calculateKeywordOpportunity(pageCount: number, avgDensity: number): number {
  let score = 0;
  
  // More pages using the keyword = higher opportunity
  score += Math.min(pageCount * 2, 6);
  
  // Moderate density suggests good targeting without over-optimization
  if (avgDensity >= 0.5 && avgDensity <= 2) score += 3;
  else if (avgDensity > 0) score += 1;
  
  // Bonus for keywords that appear to be actively targeted
  if (pageCount >= 2 && avgDensity >= 1) score += 1;
  
  return Math.min(score, 10);
}

/**
 * Calculate overall opportunity score
 */
function calculateOverallOpportunityScore(opportunities: KeywordOpportunity[]): number {
  if (opportunities.length === 0) return 0;
  
  const highOpportunities = opportunities.filter(op => op.opportunity >= 7).length;
  const mediumOpportunities = opportunities.filter(op => op.opportunity >= 4 && op.opportunity < 7).length;
  
  return Math.round((highOpportunities * 10 + mediumOpportunities * 5) / Math.max(opportunities.length * 0.1, 1));
}

/**
 * Analyze content volume gaps
 */
function analyzeContentVolumeGaps(
  mainPages: any[],
  competitorPages: any[]
): ContentVolumeGap[] {
  
  const gaps: ContentVolumeGap[] = [];
  
  // Analyze by content type/area
  const areas = [
    'blog',
    'product',
    'service',
    'support',
    'about',
    'resource',
    'guide',
    'case-study'
  ];
  
  areas.forEach(area => {
    const mainCount = countPagesByArea(mainPages, area);
    const competitorCount = countPagesByArea(competitorPages, area);
    const gap = competitorCount - mainCount;
    
    if (gap > 0) {
      gaps.push({
        area,
        mainCount,
        competitorCount,
        gap,
        opportunity: gap >= 5 ? 'high' : gap >= 2 ? 'medium' : 'low'
      });
    }
  });
  
  return gaps.sort((a, b) => b.gap - a.gap);
}

/**
 * Count pages by content area
 */
function countPagesByArea(pages: any[], area: string): number {
  const areaKeywords = {
    blog: ['blog', 'article', 'post', 'news'],
    product: ['product', 'item', 'buy', 'shop'],
    service: ['service', 'offering', 'solution'],
    support: ['support', 'help', 'faq', 'contact'],
    about: ['about', 'team', 'company', 'history'],
    resource: ['resource', 'download', 'tool', 'template'],
    guide: ['guide', 'tutorial', 'how-to', 'step'],
    'case-study': ['case', 'study', 'example', 'success']
  };
  
  const keywords = areaKeywords[area as keyof typeof areaKeywords] || [];
  
  return pages.filter(page => {
    const url = (page.url || '').toLowerCase();
    const title = (page.title || '').toLowerCase();
    
    return keywords.some(keyword => 
      url.includes(keyword) || title.includes(keyword)
    );
  }).length;
}

/**
 * Identify missing topics from topical coverage
 */
function identifyMissingTopics(topicalCoverage: TopicalCoverageAnalysis): string[] {
  // Focus on competitor topics that are well-developed
  const candidateTopics = topicalCoverage.uniqueToCompetitor
    .map(topic => {
      const competitorTopic = topicalCoverage.competitorTopics.find(ct => ct.topic === topic);
      return { topic, strength: competitorTopic?.strength || 0 };
    })
    .filter(item => item.strength >= 30) // Only well-developed topics
    .sort((a, b) => b.strength - a.strength);
  
  // Deduplicate similar topics using fuzzy matching
  const deduplicatedTopics = deduplicateTopics(candidateTopics.map(item => item.topic));
  
  return deduplicatedTopics.slice(0, 10);
}

/**
 * Deduplicate topics using similarity scoring
 */
function deduplicateTopics(topics: string[]): string[] {
  if (topics.length === 0) return [];
  
  const deduplicated: string[] = [];
  const seen = new Set<string>();
  
  for (const topic of topics) {
    const normalized = topic.toLowerCase().trim();
    
    // Check if this topic is too similar to any already added
    let isDuplicate = false;
    for (const existing of deduplicated) {
      const existingNormalized = existing.toLowerCase().trim();
      
      // Check for exact match or substring containment
      if (normalized === existingNormalized || 
          normalized.includes(existingNormalized) || 
          existingNormalized.includes(normalized)) {
        isDuplicate = true;
        break;
      }
      
      // Check for high similarity (simple word overlap)
      const similarity = calculateTopicSimilarity(normalized, existingNormalized);
      if (similarity > 0.7) { // 70% similarity threshold
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate && !seen.has(normalized)) {
      deduplicated.push(topic);
      seen.add(normalized);
    }
  }
  
  return deduplicated;
}

/**
 * Calculate similarity between two topics based on word overlap
 */
function calculateTopicSimilarity(topic1: string, topic2: string): number {
  const words1 = new Set(topic1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(topic2.split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Identify under-optimized areas
 */
function identifyUnderOptimizedAreas(mainPages: any[], competitorPages: any[]): string[] {
  const areas: string[] = [];
  
  // Compare content depth
  const mainAvgWords = calculateAverageWordCount(mainPages);
  const competitorAvgWords = calculateAverageWordCount(competitorPages);
  
  if (competitorAvgWords > mainAvgWords * 1.5) {
    areas.push('content depth and comprehensive coverage');
  }
  
  // Compare image optimization
  const mainImageOptimization = calculateImageOptimizationRate(mainPages);
  const competitorImageOptimization = calculateImageOptimizationRate(competitorPages);
  
  if (competitorImageOptimization > mainImageOptimization + 20) {
    areas.push('image optimization and alt text usage');
  }
  
  // Compare internal linking
  const mainAvgInternalLinks = calculateAverageInternalLinks(mainPages);
  const competitorAvgInternalLinks = calculateAverageInternalLinks(competitorPages);
  
  if (competitorAvgInternalLinks > mainAvgInternalLinks * 1.5) {
    areas.push('internal linking strategy');
  }
  
  // Compare heading usage
  const mainHeadingUsage = calculateHeadingUsageRate(mainPages);
  const competitorHeadingUsage = calculateHeadingUsageRate(competitorPages);
  
  if (competitorHeadingUsage > mainHeadingUsage + 15) {
    areas.push('heading structure and hierarchy');
  }
  
  return areas;
}

// Helper functions for area analysis
function calculateAverageWordCount(pages: any[]): number {
  const totalWords = pages.reduce((sum, page) => sum + (page.wordCount || 0), 0);
  return pages.length > 0 ? totalWords / pages.length : 0;
}

function calculateImageOptimizationRate(pages: any[]): number {
  const totalImages = pages.reduce((sum, page) => sum + (page.images?.length || 0), 0);
  const optimizedImages = pages.reduce((sum, page) => 
    sum + (page.images?.filter((img: any) => img.alt && img.alt.trim()).length || 0), 0
  );
  
  return totalImages > 0 ? (optimizedImages / totalImages) * 100 : 0;
}

function calculateAverageInternalLinks(pages: any[]): number {
  const totalLinks = pages.reduce((sum, page) => sum + (page.internalLinks?.length || 0), 0);
  return pages.length > 0 ? totalLinks / pages.length : 0;
}

function calculateHeadingUsageRate(pages: any[]): number {
  const pagesWithHeadings = pages.filter(page => page.headings && page.headings.length > 0).length;
  return pages.length > 0 ? (pagesWithHeadings / pages.length) * 100 : 0;
}