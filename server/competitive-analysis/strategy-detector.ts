/**
 * Strategy detection and comparison for competitive analysis
 * Identifies and compares strategic approaches between sites
 */

export interface StrategyComparison {
  contentStrategy: StrategyAnalysis;
  keywordStrategy: StrategyAnalysis;
  technicalStrategy: StrategyAnalysis;
  userExperience: StrategyAnalysis;
}

export interface StrategyAnalysis {
  mainApproach: string;
  competitorApproach: string;
  effectiveness: 'superior' | 'comparable' | 'inferior';
  recommendations: string[];
}

/**
 * Detect and compare strategies between main site and competitor
 */
export function detectStrategies(
  mainAnalysis: any,
  competitorAnalysis: any
): StrategyComparison {
  
  console.log('Analyzing competitive strategies...');
  
  return {
    contentStrategy: analyzeContentStrategy(mainAnalysis, competitorAnalysis),
    keywordStrategy: analyzeKeywordStrategy(mainAnalysis, competitorAnalysis),
    technicalStrategy: analyzeTechnicalStrategy(mainAnalysis, competitorAnalysis),
    userExperience: analyzeUserExperienceStrategy(mainAnalysis, competitorAnalysis)
  };
}

/**
 * Analyze content strategy differences
 */
function analyzeContentStrategy(mainAnalysis: any, competitorAnalysis: any): StrategyAnalysis {
  const mainPages = mainAnalysis.pages || [];
  const competitorPages = competitorAnalysis.pages || [];
  
  // Analyze content characteristics
  const mainContentProfile = analyzeContentProfile(mainPages);
  const competitorContentProfile = analyzeContentProfile(competitorPages);
  
  // Determine approaches
  const mainApproach = describeContentApproach(mainContentProfile);
  const competitorApproach = describeContentApproach(competitorContentProfile);
  
  // Compare effectiveness
  const effectiveness = compareContentEffectiveness(mainContentProfile, competitorContentProfile);
  
  // Generate recommendations
  const recommendations = generateContentStrategyRecommendations(
    mainContentProfile, 
    competitorContentProfile, 
    effectiveness
  );
  
  return {
    mainApproach,
    competitorApproach,
    effectiveness,
    recommendations
  };
}

/**
 * Analyze content profile for strategy detection
 */
function analyzeContentProfile(pages: any[]): ContentProfile {
  const profile: ContentProfile = {
    avgWordCount: 0,
    contentTypes: {},
    publishingFrequency: 'unknown',
    contentDepth: 'shallow',
    topicalDiversity: 0,
    mediaRichness: 0,
    updateFrequency: 'static'
  };
  
  if (pages.length === 0) return profile;
  
  // Calculate average word count
  const totalWords = pages.reduce((sum, page) => sum + (page.wordCount || 0), 0);
  profile.avgWordCount = Math.round(totalWords / pages.length);
  
  // Determine content depth
  if (profile.avgWordCount >= 1000) profile.contentDepth = 'comprehensive';
  else if (profile.avgWordCount >= 500) profile.contentDepth = 'substantial';
  else if (profile.avgWordCount >= 200) profile.contentDepth = 'moderate';
  else profile.contentDepth = 'shallow';
  
  // Analyze content types
  profile.contentTypes = categorizeContentTypes(pages);
  
  // Calculate topical diversity
  const topics = extractUniqueTopics(pages);
  profile.topicalDiversity = topics.length;
  
  // Calculate media richness
  const totalMedia = pages.reduce((sum, page) => 
    sum + (page.images?.length || 0) + (page.videos?.length || 0), 0
  );
  profile.mediaRichness = pages.length > 0 ? totalMedia / pages.length : 0;
  
  return profile;
}

interface ContentProfile {
  avgWordCount: number;
  contentTypes: Record<string, number>;
  publishingFrequency: string;
  contentDepth: 'shallow' | 'moderate' | 'substantial' | 'comprehensive';
  topicalDiversity: number;
  mediaRichness: number;
  updateFrequency: string;
}

/**
 * Categorize content types based on URL patterns and characteristics
 */
function categorizeContentTypes(pages: any[]): Record<string, number> {
  const types: Record<string, number> = {
    homepage: 0,
    productPages: 0,
    servicePages: 0,
    blogPosts: 0,
    resourcePages: 0,
    supportPages: 0,
    aboutPages: 0,
    landingPages: 0
  };
  
  pages.forEach(page => {
    const url = (page.url || '').toLowerCase();
    const title = (page.title || '').toLowerCase();
    
    if (url === '/' || url.endsWith('/') && url.split('/').length <= 3) {
      types.homepage++;
    } else if (url.includes('product') || url.includes('item') || title.includes('product')) {
      types.productPages++;
    } else if (url.includes('service') || title.includes('service')) {
      types.servicePages++;
    } else if (url.includes('blog') || url.includes('article') || url.includes('post')) {
      types.blogPosts++;
    } else if (url.includes('resource') || url.includes('download') || url.includes('guide')) {
      types.resourcePages++;
    } else if (url.includes('support') || url.includes('help') || url.includes('faq')) {
      types.supportPages++;
    } else if (url.includes('about') || url.includes('team') || url.includes('company')) {
      types.aboutPages++;
    } else {
      types.landingPages++;
    }
  });
  
  return types;
}

/**
 * Extract unique topics from pages
 */
function extractUniqueTopics(pages: any[]): string[] {
  const topics = new Set<string>();
  
  pages.forEach(page => {
    // Extract from headings
    if (page.headings) {
      page.headings.forEach((heading: any) => {
        if (heading.text && heading.level <= 2) {
          const cleanTopic = heading.text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
          if (cleanTopic.length >= 5) {
            topics.add(cleanTopic);
          }
        }
      });
    }
    
    // Extract from URL path
    if (page.url) {
      const pathParts = page.url.split('/').filter((part: string) => part.length > 2);
      pathParts.forEach((part: string) => {
        const cleanPart = part.replace(/[-_]/g, ' ').toLowerCase();
        if (cleanPart.length >= 3) {
          topics.add(cleanPart);
        }
      });
    }
  });
  
  return Array.from(topics).slice(0, 50); // Limit for performance
}

/**
 * Describe content approach based on profile
 */
function describeContentApproach(profile: ContentProfile): string {
  const approaches: string[] = [];
  
  // Content depth approach
  approaches.push(`${profile.contentDepth} content`);
  
  // Content type focus
  const dominantType = Object.entries(profile.contentTypes)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (dominantType && dominantType[1] > 0) {
    const typeLabel = dominantType[0].replace(/([A-Z])/g, ' $1').toLowerCase().replace('pages', '').trim();
    approaches.push(`${typeLabel}-focused`);
  }
  
  // Media strategy
  if (profile.mediaRichness >= 2) {
    approaches.push('media-rich');
  } else if (profile.mediaRichness < 0.5) {
    approaches.push('text-only');
  }
  
  // Topical diversity
  if (profile.topicalDiversity >= 20) {
    approaches.push('broad topics');
  } else if (profile.topicalDiversity < 10) {
    approaches.push('narrow focus');
  }
  
  return approaches.join(', ');
}

/**
 * Compare content effectiveness
 */
function compareContentEffectiveness(
  mainProfile: ContentProfile,
  competitorProfile: ContentProfile
): 'superior' | 'comparable' | 'inferior' {
  
  let score = 0;
  
  // Compare content depth
  const depthScore = { comprehensive: 4, substantial: 3, moderate: 2, shallow: 1 };
  const mainDepthScore = depthScore[mainProfile.contentDepth];
  const compDepthScore = depthScore[competitorProfile.contentDepth];
  score += (mainDepthScore - compDepthScore) * 2;
  
  // Compare topical diversity
  if (mainProfile.topicalDiversity > competitorProfile.topicalDiversity * 1.2) score += 2;
  else if (competitorProfile.topicalDiversity > mainProfile.topicalDiversity * 1.2) score -= 2;
  
  // Compare media richness
  if (mainProfile.mediaRichness > competitorProfile.mediaRichness * 1.3) score += 1;
  else if (competitorProfile.mediaRichness > mainProfile.mediaRichness * 1.3) score -= 1;
  
  // Compare content volume
  const totalMainContent = Object.values(mainProfile.contentTypes).reduce((a, b) => a + b, 0);
  const totalCompContent = Object.values(competitorProfile.contentTypes).reduce((a, b) => a + b, 0);
  
  if (totalMainContent > totalCompContent * 1.3) score += 1;
  else if (totalCompContent > totalMainContent * 1.3) score -= 1;
  
  if (score >= 3) return 'superior';
  if (score <= -3) return 'inferior';
  return 'comparable';
}

/**
 * Generate content strategy recommendations
 */
function generateContentStrategyRecommendations(
  mainProfile: ContentProfile,
  competitorProfile: ContentProfile,
  effectiveness: string
): string[] {
  const recommendations: string[] = [];
  
  if (effectiveness === 'inferior' || effectiveness === 'comparable') {
    // Content depth recommendations
    if (competitorProfile.avgWordCount > mainProfile.avgWordCount * 1.3) {
      recommendations.push(`Increase average content length from ${mainProfile.avgWordCount} to match competitor's ${competitorProfile.avgWordCount} words per page`);
    }
    
    // Topical diversity recommendations
    if (competitorProfile.topicalDiversity > mainProfile.topicalDiversity * 1.2) {
      recommendations.push(`Expand topical coverage - competitor covers ${competitorProfile.topicalDiversity} topics vs your ${mainProfile.topicalDiversity}`);
    }
    
    // Content type recommendations
    Object.entries(competitorProfile.contentTypes).forEach(([type, count]) => {
      const mainCount = mainProfile.contentTypes[type] || 0;
      if (count > mainCount * 2) {
        recommendations.push(`Develop more ${type.replace(/([A-Z])/g, ' $1').toLowerCase()} - competitor has ${count} vs your ${mainCount}`);
      }
    });
    
    // Media richness recommendations
    if (competitorProfile.mediaRichness > mainProfile.mediaRichness * 1.5) {
      recommendations.push(`Increase media usage - competitor averages ${competitorProfile.mediaRichness.toFixed(1)} media elements per page vs your ${mainProfile.mediaRichness.toFixed(1)}`);
    }
  }
  
  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}

/**
 * Analyze keyword strategy differences
 */
function analyzeKeywordStrategy(mainAnalysis: any, competitorAnalysis: any): StrategyAnalysis {
  const mainKeywords = extractKeywordStrategy(mainAnalysis.pages || []);
  const competitorKeywords = extractKeywordStrategy(competitorAnalysis.pages || []);
  
  const mainApproach = describeKeywordApproach(mainKeywords);
  const competitorApproach = describeKeywordApproach(competitorKeywords);
  
  const effectiveness = compareKeywordEffectiveness(mainKeywords, competitorKeywords);
  const recommendations = generateKeywordRecommendations(mainKeywords, competitorKeywords, effectiveness);
  
  return {
    mainApproach,
    competitorApproach, 
    effectiveness,
    recommendations
  };
}

/**
 * Extract keyword strategy from pages
 */
function extractKeywordStrategy(pages: any[]): KeywordStrategyProfile {
  let totalKeywords = 0;
  let longTailKeywords = 0;
  let brandKeywords = 0;
  const keywordDensities: number[] = [];
  const targetingConsistency = new Map<string, number>();
  
  pages.forEach(page => {
    if (page.keywords) {
      page.keywords.forEach((kw: any) => {
        if (kw.keyword && kw.density) {
          totalKeywords++;
          keywordDensities.push(kw.density);
          
          // Count long-tail (3+ words)
          if (kw.keyword.split(' ').length >= 3) longTailKeywords++;
          
          // Track keyword consistency across pages
          const keyword = kw.keyword.toLowerCase();
          targetingConsistency.set(keyword, (targetingConsistency.get(keyword) || 0) + 1);
        }
      });
    }
  });
  
  const avgDensity = keywordDensities.length > 0 ? 
    keywordDensities.reduce((a, b) => a + b, 0) / keywordDensities.length : 0;
  
  const consistentKeywords = Array.from(targetingConsistency.values())
    .filter(count => count >= 2).length;
  
  return {
    totalKeywords,
    longTailPercentage: totalKeywords > 0 ? (longTailKeywords / totalKeywords) * 100 : 0,
    brandKeywordPercentage: totalKeywords > 0 ? (brandKeywords / totalKeywords) * 100 : 0,
    averageDensity: avgDensity,
    consistencyScore: pages.length > 0 ? (consistentKeywords / pages.length) * 100 : 0,
    keywordDiversity: targetingConsistency.size
  };
}

interface KeywordStrategyProfile {
  totalKeywords: number;
  longTailPercentage: number;
  brandKeywordPercentage: number;
  averageDensity: number;
  consistencyScore: number;
  keywordDiversity: number;
}

/**
 * Describe keyword approach based on strategy profile
 */
function describeKeywordApproach(strategy: KeywordStrategyProfile): string {
  const approaches: string[] = [];
  
  // Long-tail strategy
  if (strategy.longTailPercentage >= 60) {
    approaches.push('long-tail focus');
  } else if (strategy.longTailPercentage < 30) {
    approaches.push('short-tail focus');
  } else {
    approaches.push('balanced keywords');
  }
  
  // Keyword density approach
  if (strategy.averageDensity >= 2.5) {
    approaches.push('high density');
  } else if (strategy.averageDensity < 1) {
    approaches.push('light usage');
  }
  
  // Consistency approach
  if (strategy.consistencyScore >= 70) {
    approaches.push('consistent targeting');
  } else if (strategy.consistencyScore < 40) {
    approaches.push('diverse targeting');
  }
  
  return approaches.join(', ');
}

/**
 * Compare keyword effectiveness
 */
function compareKeywordEffectiveness(
  mainStrategy: KeywordStrategyProfile,
  competitorStrategy: KeywordStrategyProfile
): 'superior' | 'comparable' | 'inferior' {
  
  let score = 0;
  
  // Compare keyword diversity (more is generally better)
  if (mainStrategy.keywordDiversity > competitorStrategy.keywordDiversity * 1.2) score += 2;
  else if (competitorStrategy.keywordDiversity > mainStrategy.keywordDiversity * 1.2) score -= 2;
  
  // Compare long-tail usage (30-70% is optimal)
  const mainLongTailOptimal = Math.abs(mainStrategy.longTailPercentage - 50) <= 20;
  const compLongTailOptimal = Math.abs(competitorStrategy.longTailPercentage - 50) <= 20;
  
  if (mainLongTailOptimal && !compLongTailOptimal) score += 2;
  else if (compLongTailOptimal && !mainLongTailOptimal) score -= 2;
  
  // Compare keyword density (1-2% is optimal)
  const mainDensityOptimal = mainStrategy.averageDensity >= 1 && mainStrategy.averageDensity <= 2;
  const compDensityOptimal = competitorStrategy.averageDensity >= 1 && competitorStrategy.averageDensity <= 2;
  
  if (mainDensityOptimal && !compDensityOptimal) score += 1;
  else if (compDensityOptimal && !mainDensityOptimal) score -= 1;
  
  // Compare consistency
  if (mainStrategy.consistencyScore > competitorStrategy.consistencyScore * 1.3) score += 1;
  else if (competitorStrategy.consistencyScore > mainStrategy.consistencyScore * 1.3) score -= 1;
  
  if (score >= 3) return 'superior';
  if (score <= -3) return 'inferior';
  return 'comparable';
}

/**
 * Generate keyword strategy recommendations
 */
function generateKeywordRecommendations(
  mainStrategy: KeywordStrategyProfile,
  competitorStrategy: KeywordStrategyProfile,
  effectiveness: string
): string[] {
  const recommendations: string[] = [];
  
  if (effectiveness === 'inferior' || effectiveness === 'comparable') {
    // Long-tail recommendations
    const longTailGap = competitorStrategy.longTailPercentage - mainStrategy.longTailPercentage;
    if (longTailGap > 20) {
      recommendations.push(`Increase long-tail keyword targeting by ${Math.round(longTailGap)}% to match competitor strategy`);
    }
    
    // Keyword density recommendations
    const densityGap = competitorStrategy.averageDensity - mainStrategy.averageDensity;
    if (densityGap > 0.5) {
      recommendations.push(`Increase keyword density from ${mainStrategy.averageDensity.toFixed(1)}% to target ${competitorStrategy.averageDensity.toFixed(1)}%`);
    }
    
    // Diversity recommendations
    const diversityGap = competitorStrategy.keywordDiversity - mainStrategy.keywordDiversity;
    if (diversityGap > 10) {
      recommendations.push(`Expand keyword diversity - target ${diversityGap} additional unique keywords`);
    }
    
    // Consistency recommendations
    const consistencyGap = competitorStrategy.consistencyScore - mainStrategy.consistencyScore;
    if (consistencyGap > 15) {
      recommendations.push(`Improve keyword consistency across pages - competitor is ${Math.round(consistencyGap)}% more consistent`);
    }
  }
  
  return recommendations;
}

/**
 * Analyze technical strategy differences
 */
function analyzeTechnicalStrategy(mainAnalysis: any, competitorAnalysis: any): StrategyAnalysis {
  const mainTech = analyzeTechnicalProfile(mainAnalysis.pages || []);
  const competitorTech = analyzeTechnicalProfile(competitorAnalysis.pages || []);
  
  const mainApproach = describeTechnicalApproach(mainTech);
  const competitorApproach = describeTechnicalApproach(competitorTech);
  
  const effectiveness = compareTechnicalEffectiveness(mainTech, competitorTech);
  const recommendations = generateTechnicalRecommendations(mainTech, competitorTech, effectiveness);
  
  return {
    mainApproach,
    competitorApproach,
    effectiveness,
    recommendations
  };
}

/**
 * Analyze technical profile
 */
function analyzeTechnicalProfile(pages: any[]): TechnicalProfile {
  let httpsUsage = 0;
  let mobileOptimized = 0;
  let avgLoadTime = 0;
  let structuredDataUsage = 0;
  let cleanUrls = 0;
  let avgImageOptimization = 0;
  
  const validPages = pages.length || 1;
  
  pages.forEach(page => {
    if (page.url?.startsWith('https://')) httpsUsage++;
    if (page.mobileOptimized === true) mobileOptimized++;
    if (page.loadTime) avgLoadTime += page.loadTime;
    if (page.schemaMarkup?.length > 0) structuredDataUsage++;
    if (page.url && isCleanUrl(page.url)) cleanUrls++;
    
    // Image optimization rate
    if (page.images) {
      const optimizedImages = page.images.filter((img: any) => img.alt && img.alt.trim()).length;
      avgImageOptimization += page.images.length > 0 ? (optimizedImages / page.images.length) * 100 : 0;
    }
  });
  
  return {
    httpsPercentage: (httpsUsage / validPages) * 100,
    mobileOptimizationRate: (mobileOptimized / validPages) * 100,
    averageLoadTime: avgLoadTime / validPages,
    structuredDataUsage: (structuredDataUsage / validPages) * 100,
    cleanUrlPercentage: (cleanUrls / validPages) * 100,
    imageOptimizationRate: avgImageOptimization / validPages
  };
}

interface TechnicalProfile {
  httpsPercentage: number;
  mobileOptimizationRate: number;
  averageLoadTime: number;
  structuredDataUsage: number;
  cleanUrlPercentage: number;
  imageOptimizationRate: number;
}

/**
 * Check if URL is clean (no parameters, readable structure)
 */
function isCleanUrl(url: string): boolean {
  return !url.includes('?') && 
         !url.includes('&') && 
         !url.includes('=') &&
         url.split('/').every(part => 
           !part.includes('%') && 
           part.length <= 50
         );
}

/**
 * Describe technical approach
 */
function describeTechnicalApproach(profile: TechnicalProfile): string {
  const approaches: string[] = [];
  
  if (profile.httpsPercentage >= 95) approaches.push('HTTPS');
  if (profile.mobileOptimizationRate >= 80) approaches.push('mobile-first');
  if (profile.averageLoadTime <= 3) approaches.push('fast');
  if (profile.structuredDataUsage >= 50) approaches.push('structured data');
  if (profile.cleanUrlPercentage >= 80) approaches.push('clean URLs');
  if (profile.imageOptimizationRate >= 70) approaches.push('optimized media');
  
  return approaches.length > 0 ? approaches.join(', ') : 'basic setup';
}

/**
 * Compare technical effectiveness
 */
function compareTechnicalEffectiveness(
  mainProfile: TechnicalProfile,
  competitorProfile: TechnicalProfile
): 'superior' | 'comparable' | 'inferior' {
  
  let score = 0;
  
  if (mainProfile.httpsPercentage > competitorProfile.httpsPercentage + 10) score += 1;
  else if (competitorProfile.httpsPercentage > mainProfile.httpsPercentage + 10) score -= 1;
  
  if (mainProfile.mobileOptimizationRate > competitorProfile.mobileOptimizationRate + 15) score += 2;
  else if (competitorProfile.mobileOptimizationRate > mainProfile.mobileOptimizationRate + 15) score -= 2;
  
  if (mainProfile.averageLoadTime < competitorProfile.averageLoadTime - 1) score += 2;
  else if (competitorProfile.averageLoadTime < mainProfile.averageLoadTime - 1) score -= 2;
  
  if (mainProfile.structuredDataUsage > competitorProfile.structuredDataUsage + 20) score += 1;
  else if (competitorProfile.structuredDataUsage > mainProfile.structuredDataUsage + 20) score -= 1;
  
  if (score >= 3) return 'superior';
  if (score <= -3) return 'inferior';
  return 'comparable';
}

/**
 * Generate technical strategy recommendations
 */
function generateTechnicalRecommendations(
  mainProfile: TechnicalProfile,
  competitorProfile: TechnicalProfile,
  effectiveness: string
): string[] {
  const recommendations: string[] = [];
  
  if (effectiveness === 'inferior' || effectiveness === 'comparable') {
    if (competitorProfile.mobileOptimizationRate > mainProfile.mobileOptimizationRate + 15) {
      recommendations.push(`Improve mobile optimization - competitor has ${competitorProfile.mobileOptimizationRate.toFixed(0)}% vs your ${mainProfile.mobileOptimizationRate.toFixed(0)}%`);
    }
    
    if (competitorProfile.averageLoadTime < mainProfile.averageLoadTime - 0.5) {
      recommendations.push(`Optimize page load times - competitor averages ${competitorProfile.averageLoadTime.toFixed(1)}s vs your ${mainProfile.averageLoadTime.toFixed(1)}s`);
    }
    
    if (competitorProfile.structuredDataUsage > mainProfile.structuredDataUsage + 20) {
      recommendations.push(`Implement structured data markup - competitor uses it on ${competitorProfile.structuredDataUsage.toFixed(0)}% of pages`);
    }
    
    if (competitorProfile.imageOptimizationRate > mainProfile.imageOptimizationRate + 20) {
      recommendations.push(`Improve image optimization - competitor has ${competitorProfile.imageOptimizationRate.toFixed(0)}% optimized vs your ${mainProfile.imageOptimizationRate.toFixed(0)}%`);
    }
  }
  
  return recommendations;
}

/**
 * Analyze user experience strategy
 */
function analyzeUserExperienceStrategy(mainAnalysis: any, competitorAnalysis: any): StrategyAnalysis {
  const mainUX = analyzeUXProfile(mainAnalysis.pages || []);
  const competitorUX = analyzeUXProfile(competitorAnalysis.pages || []);
  
  const mainApproach = describeUXApproach(mainUX);
  const competitorApproach = describeUXApproach(competitorUX);
  
  const effectiveness = compareUXEffectiveness(mainUX, competitorUX);
  const recommendations = generateUXRecommendations(mainUX, competitorUX, effectiveness);
  
  return {
    mainApproach,
    competitorApproach,
    effectiveness,
    recommendations
  };
}

/**
 * Analyze UX profile from pages
 */
function analyzeUXProfile(pages: any[]): UXProfile {
  let totalReadability = 0;
  let avgInternalLinks = 0;
  let contentStructuring = 0;
  
  const validPages = pages.length || 1;
  
  pages.forEach(page => {
    // Readability (simple heuristic)
    const wordCount = page.wordCount || 0;
    const sentences = page.sentences || wordCount / 15; // Rough estimate
    const avgSentenceLength = sentences > 0 ? wordCount / sentences : 0;
    
    if (avgSentenceLength >= 10 && avgSentenceLength <= 20) {
      totalReadability += 100;
    } else if (avgSentenceLength >= 8 && avgSentenceLength <= 25) {
      totalReadability += 70;
    } else {
      totalReadability += 30;
    }
    
    // Internal linking
    avgInternalLinks += page.internalLinks?.length || 0;
    
    // Content structuring
    let structureScore = 0;
    if (page.headings?.length >= 2) structureScore += 40;
    if (page.paragraphs?.length >= 3) structureScore += 30;
    if (page.lists?.length > 0) structureScore += 20;
    if (page.images?.length > 0) structureScore += 10;
    
    contentStructuring += structureScore;
  });
  
  return {
    readabilityScore: totalReadability / validPages,
    averageInternalLinks: avgInternalLinks / validPages,
    contentStructureScore: contentStructuring / validPages,
    engagementIndicators: calculateEngagementIndicators(pages)
  };
}

interface UXProfile {
  readabilityScore: number;
  averageInternalLinks: number;
  contentStructureScore: number;
  engagementIndicators: number;
}

/**
 * Calculate engagement indicators
 */
function calculateEngagementIndicators(pages: any[]): number {
  let totalScore = 0;
  const validPages = pages.length || 1;
  
  pages.forEach(page => {
    let score = 0;
    
    // Call-to-action presence
    const hasCallToAction = page.content && (
      page.content.includes('contact') ||
      page.content.includes('learn more') ||
      page.content.includes('get started') ||
      page.content.includes('sign up') ||
      page.content.includes('download')
    );
    if (hasCallToAction) score += 30;
    
    // Interactive elements
    if (page.forms?.length > 0) score += 20;
    if (page.videos?.length > 0) score += 25;
    if (page.images?.length > 0) score += 15;
    
    // Content freshness (if available)
    if (page.lastModified) {
      const daysSinceUpdate = (Date.now() - new Date(page.lastModified).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate <= 30) score += 10;
    }
    
    totalScore += score;
  });
  
  return totalScore / validPages;
}

/**
 * Describe UX approach
 */
function describeUXApproach(profile: UXProfile): string {
  const approaches: string[] = [];
  
  if (profile.readabilityScore >= 80) {
    approaches.push('high readability');
  } else if (profile.readabilityScore < 60) {
    approaches.push('basic presentation');
  }
  
  if (profile.averageInternalLinks >= 5) {
    approaches.push('strong linking');
  } else if (profile.averageInternalLinks < 2) {
    approaches.push('minimal links');
  }
  
  if (profile.contentStructureScore >= 80) {
    approaches.push('well-structured');
  } else if (profile.contentStructureScore < 50) {
    approaches.push('basic structure');
  }
  
  return approaches.length > 0 ? approaches.join(', ') : 'standard UX';
}

/**
 * Compare UX effectiveness
 */
function compareUXEffectiveness(mainProfile: UXProfile, competitorProfile: UXProfile): 'superior' | 'comparable' | 'inferior' {
  let score = 0;
  
  if (mainProfile.readabilityScore > competitorProfile.readabilityScore + 15) score += 2;
  else if (competitorProfile.readabilityScore > mainProfile.readabilityScore + 15) score -= 2;
  
  if (mainProfile.averageInternalLinks > competitorProfile.averageInternalLinks + 2) score += 1;
  else if (competitorProfile.averageInternalLinks > mainProfile.averageInternalLinks + 2) score -= 1;
  
  if (mainProfile.contentStructureScore > competitorProfile.contentStructureScore + 20) score += 2;
  else if (competitorProfile.contentStructureScore > mainProfile.contentStructureScore + 20) score -= 2;
  
  if (mainProfile.engagementIndicators > competitorProfile.engagementIndicators + 15) score += 1;
  else if (competitorProfile.engagementIndicators > mainProfile.engagementIndicators + 15) score -= 1;
  
  if (score >= 3) return 'superior';
  if (score <= -3) return 'inferior';
  return 'comparable';
}

/**
 * Generate UX strategy recommendations
 */
function generateUXRecommendations(
  mainProfile: UXProfile,
  competitorProfile: UXProfile,
  effectiveness: string
): string[] {
  const recommendations: string[] = [];
  
  if (effectiveness === 'inferior' || effectiveness === 'comparable') {
    if (competitorProfile.readabilityScore > mainProfile.readabilityScore + 15) {
      recommendations.push(`Improve content readability - competitor scores ${competitorProfile.readabilityScore.toFixed(0)} vs your ${mainProfile.readabilityScore.toFixed(0)}`);
    }
    
    if (competitorProfile.averageInternalLinks > mainProfile.averageInternalLinks + 2) {
      recommendations.push(`Increase internal linking - competitor averages ${competitorProfile.averageInternalLinks.toFixed(1)} links vs your ${mainProfile.averageInternalLinks.toFixed(1)}`);
    }
    
    if (competitorProfile.contentStructureScore > mainProfile.contentStructureScore + 20) {
      recommendations.push(`Improve content structure - competitor scores ${competitorProfile.contentStructureScore.toFixed(0)} vs your ${mainProfile.contentStructureScore.toFixed(0)}`);
    }
  }
  
  return recommendations;
}