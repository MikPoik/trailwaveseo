/**
 * Standardized metrics calculation for competitive analysis
 * Provides consistent and statistically sound metric comparisons
 */

export interface MetricComparison {
  main: number;
  competitor: number;
  difference: number;
  percentageDiff: number;
  advantage: 'main' | 'competitor' | 'neutral';
  significance: 'critical' | 'important' | 'minor';
}

/**
 * Calculate standardized metric comparison
 */
export function calculateMetricComparison(
  mainValue: number,
  competitorValue: number,
  metricType: 'optimization' | 'issues' | 'count' = 'optimization'
): MetricComparison {
  
  // Ensure we have valid numbers
  const main = Number(mainValue) || 0;
  const competitor = Number(competitorValue) || 0;
  
  // Calculate raw difference (always main - competitor for consistency)
  const difference = main - competitor;
  
  // Calculate percentage difference
  const baseline = Math.max(competitor, 1); // Avoid division by zero
  const percentageDiff = Math.round((Math.abs(difference) / baseline) * 100);
  
  // Determine advantage based on metric type
  let advantage: 'main' | 'competitor' | 'neutral';
  
  if (metricType === 'issues') {
    // For issues/problems: lower is better
    if (difference < -2) advantage = 'competitor'; // Main has more issues
    else if (difference > 2) advantage = 'main';   // Main has fewer issues  
    else advantage = 'neutral';
  } else {
    // For optimization metrics: higher is better
    if (difference > 2) advantage = 'main';        // Main is better
    else if (difference < -2) advantage = 'competitor'; // Competitor is better
    else advantage = 'neutral';
  }
  
  // Determine significance based on percentage difference
  const significance = getSignificanceLevel(percentageDiff, Math.abs(difference));
  
  return {
    main,
    competitor,
    difference,
    percentageDiff,
    advantage,
    significance
  };
}

/**
 * Determine the significance level of a difference
 */
function getSignificanceLevel(percentageDiff: number, absoluteDiff: number): 'critical' | 'important' | 'minor' {
  // Critical: Large percentage difference OR large absolute difference
  if (percentageDiff >= 30 || absoluteDiff >= 10) {
    return 'critical';
  }
  
  // Important: Moderate differences
  if (percentageDiff >= 15 || absoluteDiff >= 5) {
    return 'important';
  }
  
  // Minor: Small differences
  return 'minor';
}

/**
 * Calculate advanced SEO metrics from analysis data
 */
export function calculateAdvancedSEOMetrics(analysis: any): AdvancedMetrics {
  const pages = analysis.pages || [];
  
  return {
    titleOptimization: calculateTitleOptimization(pages),
    descriptionOptimization: calculateDescriptionOptimization(pages),
    headingStructure: calculateHeadingStructure(pages),
    contentDepth: calculateContentDepth(pages),
    technicalSEO: calculateTechnicalSEO(pages),
    userExperience: calculateUserExperience(pages),
    keywordOptimization: calculateKeywordOptimization(pages),
    internalLinking: calculateInternalLinking(pages, analysis.domain)
  };
}

interface AdvancedMetrics {
  titleOptimization: number;
  descriptionOptimization: number;
  headingStructure: number;
  contentDepth: number;
  technicalSEO: number;
  userExperience: number;
  keywordOptimization: number;
  internalLinking: number;
}

/**
 * Calculate title optimization score
 */
function calculateTitleOptimization(pages: any[]): number {
  if (pages.length === 0) return 0;
  
  let totalScore = 0;
  let validPages = 0;
  
  pages.forEach(page => {
    if (!page.title) return;
    
    let score = 0;
    const title = page.title;
    
    // Length optimization (30-60 characters optimal)
    if (title.length >= 30 && title.length <= 60) {
      score += 40;
    } else if (title.length >= 20 && title.length <= 70) {
      score += 25;
    } else {
      score += 10;
    }
    
    // Keyword placement (if we have keyword data)
    if (page.keywords?.length > 0) {
      const hasKeywordInTitle = page.keywords.some((kw: any) => 
        title.toLowerCase().includes(kw.keyword?.toLowerCase())
      );
      if (hasKeywordInTitle) score += 30;
    } else {
      score += 15; // Neutral score if no keyword data
    }
    
    // Uniqueness (check against other pages)
    const isDuplicate = pages.some(otherPage => 
      otherPage !== page && otherPage.title === title
    );
    if (!isDuplicate) score += 20;
    
    // Brand/company name inclusion (basic heuristic)
    if (title.includes('|') || title.includes('-')) score += 10;
    
    totalScore += score;
    validPages++;
  });
  
  return validPages > 0 ? Math.round(totalScore / validPages) : 0;
}

/**
 * Calculate meta description optimization score
 */
function calculateDescriptionOptimization(pages: any[]): number {
  if (pages.length === 0) return 0;
  
  let totalScore = 0;
  let validPages = 0;
  
  pages.forEach(page => {
    if (!page.metaDescription) {
      // Missing description is a significant issue
      totalScore += 0;
      validPages++;
      return;
    }
    
    let score = 0;
    const desc = page.metaDescription;
    
    // Length optimization (120-160 characters optimal)
    if (desc.length >= 120 && desc.length <= 160) {
      score += 50;
    } else if (desc.length >= 100 && desc.length <= 180) {
      score += 35;
    } else if (desc.length >= 80) {
      score += 20;
    } else {
      score += 10;
    }
    
    // Call-to-action presence
    const ctaWords = ['learn', 'discover', 'find', 'get', 'try', 'start', 'buy', 'shop', 'contact'];
    const hasCallToAction = ctaWords.some(word => 
      desc.toLowerCase().includes(word)
    );
    if (hasCallToAction) score += 20;
    
    // Uniqueness
    const isDuplicate = pages.some(otherPage => 
      otherPage !== page && otherPage.metaDescription === desc
    );
    if (!isDuplicate) score += 20;
    
    // Readability (sentence structure)
    if (desc.includes('.') || desc.includes('!') || desc.includes('?')) {
      score += 10;
    }
    
    totalScore += score;
    validPages++;
  });
  
  return validPages > 0 ? Math.round(totalScore / validPages) : 0;
}

/**
 * Calculate heading structure optimization
 */
function calculateHeadingStructure(pages: any[]): number {
  if (pages.length === 0) return 0;
  
  let totalScore = 0;
  let validPages = 0;
  
  pages.forEach(page => {
    if (!page.headings || page.headings.length === 0) {
      totalScore += 10; // Some points for having content
      validPages++;
      return;
    }
    
    let score = 0;
    const headings = page.headings;
    
    // H1 presence and uniqueness
    const h1Headings = headings.filter((h: any) => h.level === 1);
    if (h1Headings.length === 1) {
      score += 30;
    } else if (h1Headings.length === 0) {
      score += 0; // No H1 is bad
    } else {
      score += 10; // Multiple H1s is not ideal
    }
    
    // Hierarchical structure
    const levels = headings.map((h: any) => h.level).sort((a: number, b: number) => a - b);
    const hasProperHierarchy = levels.every((level: number, index: number) => {
      if (index === 0) return true;
      return level <= levels[index - 1] + 1; // No skipping levels
    });
    if (hasProperHierarchy) score += 25;
    
    // Heading density (not too many, not too few)
    const headingCount = headings.length;
    const estimatedWordCount = page.wordCount || page.content?.split(' ').length || 0;
    const headingRatio = estimatedWordCount > 0 ? headingCount / (estimatedWordCount / 100) : 0;
    
    if (headingRatio >= 1 && headingRatio <= 5) {
      score += 25;
    } else if (headingRatio > 0.5 && headingRatio < 8) {
      score += 15;
    } else {
      score += 5;
    }
    
    // Content in headings (not empty)
    const hasContentfulHeadings = headings.every((h: any) => 
      h.text && h.text.trim().length > 3
    );
    if (hasContentfulHeadings) score += 20;
    
    totalScore += score;
    validPages++;
  });
  
  return validPages > 0 ? Math.round(totalScore / validPages) : 0;
}

/**
 * Calculate content depth score
 */
function calculateContentDepth(pages: any[]): number {
  if (pages.length === 0) return 0;
  
  let totalScore = 0;
  let validPages = 0;
  
  pages.forEach(page => {
    let score = 0;
    
    // Word count analysis
    const wordCount = page.wordCount || (page.content?.split(' ').length || 0);
    if (wordCount >= 1000) {
      score += 40;
    } else if (wordCount >= 500) {
      score += 30;
    } else if (wordCount >= 300) {
      score += 20;
    } else if (wordCount >= 100) {
      score += 10;
    }
    
    // Content structure indicators
    if (page.paragraphs?.length >= 3) score += 15;
    if (page.lists?.length > 0) score += 10;
    if (page.images?.length > 0) score += 15;
    
    // Reading complexity (basic heuristic)
    if (page.sentences) {
      const avgSentenceLength = wordCount / page.sentences;
      if (avgSentenceLength >= 10 && avgSentenceLength <= 25) {
        score += 10;
      }
    }
    
    // Content freshness (if date available)
    if (page.lastModified) {
      const daysSinceModified = (Date.now() - new Date(page.lastModified).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceModified <= 30) score += 10;
      else if (daysSinceModified <= 90) score += 5;
    }
    
    totalScore += score;
    validPages++;
  });
  
  return validPages > 0 ? Math.round(totalScore / validPages) : 0;
}

/**
 * Calculate technical SEO score
 */
function calculateTechnicalSEO(pages: any[]): number {
  if (pages.length === 0) return 0;
  
  let totalScore = 0;
  let validPages = 0;
  
  pages.forEach(page => {
    let score = 0;
    
    // URL structure
    if (page.url) {
      const url = page.url.toLowerCase();
      if (url.includes('https://')) score += 15;
      if (url.length <= 100) score += 10;
      if (!/[^a-z0-9\-\/\.]/.test(url)) score += 10; // Clean URL
      if (!url.includes('?') && !url.includes('&')) score += 10; // No parameters
    }
    
    // Page load metrics (if available)
    if (page.loadTime !== undefined) {
      if (page.loadTime <= 2) score += 20;
      else if (page.loadTime <= 4) score += 10;
      else score += 0;
    } else {
      score += 5; // Neutral if no data
    }
    
    // Mobile optimization
    if (page.mobileOptimized === true) score += 15;
    else if (page.mobileOptimized === false) score += 0;
    else score += 8; // Neutral if unknown
    
    // SSL/HTTPS
    if (page.url?.startsWith('https://')) score += 10;
    
    // Schema markup (if detected)
    if (page.schemaMarkup?.length > 0) score += 10;
    
    // Image optimization
    if (page.images) {
      const totalImages = page.images.length;
      const optimizedImages = page.images.filter((img: any) => img.alt && img.alt.trim()).length;
      if (totalImages > 0) {
        score += Math.round((optimizedImages / totalImages) * 20);
      }
    }
    
    totalScore += score;
    validPages++;
  });
  
  return validPages > 0 ? Math.round(totalScore / validPages) : 0;
}

/**
 * Calculate user experience score
 */
function calculateUserExperience(pages: any[]): number {
  if (pages.length === 0) return 0;
  
  let totalScore = 0;
  let validPages = 0;
  
  pages.forEach(page => {
    let score = 50; // Start with neutral score
    
    // Readability factors
    const wordCount = page.wordCount || 0;
    const sentences = page.sentences || 0;
    
    if (sentences > 0) {
      const avgSentenceLength = wordCount / sentences;
      if (avgSentenceLength <= 20) score += 10;
      if (avgSentenceLength >= 8) score += 5;
    }
    
    // Content formatting
    if (page.headings?.length >= 2) score += 10; // Good structure
    if (page.paragraphs?.length >= 3) score += 5; // Not wall of text
    if (page.lists?.length > 0) score += 5; // Scannable content
    
    // Media richness
    if (page.images?.length > 0) score += 10;
    if (page.videos?.length > 0) score += 10;
    
    // Navigation elements
    if (page.internalLinks?.length >= 3) score += 5; // Good internal linking
    
    // Load performance impact
    if (page.loadTime <= 3) score += 10;
    else if (page.loadTime > 5) score -= 10;
    
    totalScore += Math.max(0, Math.min(100, score)); // Clamp between 0-100
    validPages++;
  });
  
  return validPages > 0 ? Math.round(totalScore / validPages) : 0;
}

/**
 * Calculate keyword optimization score
 */
function calculateKeywordOptimization(pages: any[]): number {
  if (pages.length === 0) return 0;
  
  let totalScore = 0;
  let validPages = 0;
  
  pages.forEach(page => {
    let score = 0;
    
    // Keyword density analysis (if keyword data available)
    if (page.keywords && page.keywords.length > 0) {
      const primaryKeywords = page.keywords.slice(0, 3); // Focus on top 3
      
      primaryKeywords.forEach((kw: any) => {
        if (!kw.keyword || !kw.density) return;
        
        const keyword = kw.keyword.toLowerCase();
        const density = kw.density;
        
        // Check keyword placement
        let placementScore = 0;
        if (page.title?.toLowerCase().includes(keyword)) placementScore += 15;
        if (page.metaDescription?.toLowerCase().includes(keyword)) placementScore += 10;
        if (page.headings?.some((h: any) => h.text?.toLowerCase().includes(keyword))) placementScore += 10;
        
        // Optimal keyword density (1-3%)
        if (density >= 1 && density <= 3) placementScore += 10;
        else if (density >= 0.5 && density <= 5) placementScore += 5;
        
        score += placementScore;
      });
      
      score = Math.round(score / primaryKeywords.length); // Average score
    } else {
      score = 30; // Neutral score if no keyword data
    }
    
    // Long-tail keyword diversity
    if (page.wordCount >= 300) score += 10; // More content = more keyword opportunities
    
    // Semantic richness (related terms)
    if (page.content) {
      const hasSemanticVariation = page.content.includes('how') || 
                                  page.content.includes('why') || 
                                  page.content.includes('what') ||
                                  page.content.includes('where');
      if (hasSemanticVariation) score += 10;
    }
    
    totalScore += score;
    validPages++;
  });
  
  return validPages > 0 ? Math.round(totalScore / validPages) : 0;
}

/**
 * Calculate internal linking effectiveness
 */
function calculateInternalLinking(pages: any[], domain: string): number {
  if (pages.length === 0) return 0;
  
  let totalScore = 0;
  let validPages = 0;
  
  pages.forEach(page => {
    let score = 0;
    
    // Internal link count
    const internalLinks = page.internalLinks || [];
    const linkCount = internalLinks.length;
    
    if (linkCount >= 3 && linkCount <= 10) {
      score += 30;
    } else if (linkCount >= 1 && linkCount <= 15) {
      score += 20;
    } else if (linkCount >= 1) {
      score += 10;
    }
    
    // Link diversity (linking to different pages)
    const uniqueLinks = new Set(internalLinks.map((link: any) => link.url || link)).size;
    if (uniqueLinks === linkCount && uniqueLinks > 1) {
      score += 20;
    } else if (uniqueLinks >= linkCount * 0.8) {
      score += 15;
    }
    
    // Anchor text diversity
    const anchorTexts = internalLinks
      .map((link: any) => link.anchorText || link.text)
      .filter((text: string) => text && text.trim() !== '');
    
    const genericAnchors = ['click here', 'read more', 'learn more', 'here'];
    const hasGoodAnchors = anchorTexts.some((anchor: string) => 
      !genericAnchors.some(generic => anchor.toLowerCase().includes(generic))
    );
    
    if (hasGoodAnchors) score += 25;
    
    // Contextual linking (links within content vs navigation)
    if (page.content && internalLinks.length > 0) {
      const contextualLinks = internalLinks.filter((link: any) => {
        const linkText = link.anchorText || link.text || '';
        return page.content.includes(linkText) && linkText.length > 5;
      });
      
      if (contextualLinks.length > 0) score += 25;
    }
    
    totalScore += score;
    validPages++;
  });
  
  return validPages > 0 ? Math.round(totalScore / validPages) : 0;
}