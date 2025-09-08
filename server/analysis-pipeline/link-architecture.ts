/**
 * Link Architecture Analysis Module
 * Analyzes internal linking structure, anchor text optimization, and link equity distribution
 */

import type { PageAnalysisResult } from './page-analyzer.js';

export interface LinkArchitectureAnalysis {
  overallScore: number;
  explanation?: string;
  linkDistribution: LinkDistributionAnalysis;
  anchorTextAnalysis: AnchorTextAnalysis;
  navigationStructure: NavigationStructureAnalysis;
  linkEquityFlow: LinkEquityAnalysis;
  recommendations: LinkArchitectureRecommendation[];
}

interface LinkDistributionAnalysis {
  totalInternalLinks: number;
  averageLinksPerPage: number;
  linkDensity: number; // Links per 100 words
  orphanPages: string[]; // Pages with no incoming links
  distributionScore: number;
}

interface AnchorTextAnalysis {
  descriptiveAnchors: number; // % of anchors that are descriptive
  exactMatchAnchors: number; // % of exact match keyword anchors
  genericAnchors: number; // % of generic anchors ("click here", "read more")
  anchorVariety: number; // Diversity of anchor text
  anchorTextScore: number;
}

interface NavigationStructureAnalysis {
  maxDepthFromHome: number; // Maximum clicks from homepage
  averageDepthFromHome: number;
  breadcrumbImplementation: boolean;
  menuStructure: number; // Quality of navigation structure
  navigationScore: number;
}

interface LinkEquityAnalysis {
  hubPages: Array<{ url: string; incomingLinks: number; outgoingLinks: number; authority: number }>;
  linkEquityDistribution: number; // How well link equity is distributed
  internalPageRank: Array<{ url: string; score: number }>;
  equityScore: number;
}

interface LinkArchitectureRecommendation {
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  impact: number;
  affectedPages: string[];
}

/**
 * Analyze link architecture across all pages
 */
export async function analyzeLinkArchitecture(
  pages: PageAnalysisResult[]
): Promise<LinkArchitectureAnalysis> {
  
  console.log(`Analyzing link architecture for ${pages.length} pages`);

  // Build link graph
  const linkGraph = buildLinkGraph(pages);
  
  // Analyze link distribution
  const linkDistribution = analyzeLinkDistribution(pages, linkGraph);
  
  // Analyze anchor text quality
  const anchorTextAnalysis = analyzeAnchorText(pages);
  
  // Analyze navigation structure
  const navigationStructure = analyzeNavigationStructure(pages, linkGraph);
  
  // Analyze link equity flow
  const linkEquityFlow = analyzeLinkEquity(pages, linkGraph);
  
  // Calculate overall score
  const overallScore = calculateLinkArchitectureScore(
    linkDistribution,
    anchorTextAnalysis,
    navigationStructure,
    linkEquityFlow
  );
  
  // Generate recommendations
  const recommendations = generateLinkArchitectureRecommendations(
    pages,
    linkDistribution,
    anchorTextAnalysis,
    navigationStructure,
    linkEquityFlow
  );

  return {
    overallScore,
    linkDistribution,
    anchorTextAnalysis,
    navigationStructure,
    linkEquityFlow,
    recommendations
  };
}

/**
 * Build internal link graph from pages
 */
function buildLinkGraph(pages: PageAnalysisResult[]): Map<string, { incoming: string[]; outgoing: string[] }> {
  
  const linkGraph = new Map<string, { incoming: string[]; outgoing: string[] }>();
  
  // Initialize graph nodes
  pages.forEach(page => {
    linkGraph.set(page.url, { incoming: [], outgoing: [] });
  });
  
  // Build connections
  pages.forEach(page => {
    const pageNode = linkGraph.get(page.url);
    if (!pageNode) return;
    
    page.internalLinks?.forEach(link => {
      const targetNode = linkGraph.get(link.href);
      if (targetNode) {
        pageNode.outgoing.push(link.href);
        targetNode.incoming.push(page.url);
      }
    });
  });
  
  return linkGraph;
}

/**
 * Analyze link distribution patterns
 */
function analyzeLinkDistribution(
  pages: PageAnalysisResult[],
  linkGraph: Map<string, { incoming: string[]; outgoing: string[] }>
): LinkDistributionAnalysis {
  
  const totalInternalLinks = pages.reduce((sum, page) => sum + (page.internalLinks?.length || 0), 0);
  const averageLinksPerPage = totalInternalLinks / pages.length;
  
  // Calculate link density (links per 100 words)
  const totalWords = pages.reduce((sum, page) => sum + page.wordCount, 0);
  const linkDensity = (totalInternalLinks / totalWords) * 100;
  
  // Find orphan pages (pages with no incoming internal links)
  const orphanPages = pages
    .filter(page => {
      const node = linkGraph.get(page.url);
      return !node || node.incoming.length === 0;
    })
    .map(page => page.url);
  
  // Calculate distribution quality
  const distributionScore = Math.round(
    (averageLinksPerPage >= 3 && averageLinksPerPage <= 10 ? 40 : 20) +
    (linkDensity >= 1 && linkDensity <= 3 ? 30 : 15) +
    (orphanPages.length === 0 ? 30 : Math.max(0, 30 - orphanPages.length * 5))
  );

  return {
    totalInternalLinks,
    averageLinksPerPage: Math.round(averageLinksPerPage * 10) / 10,
    linkDensity: Math.round(linkDensity * 100) / 100,
    orphanPages,
    distributionScore: Math.min(100, distributionScore)
  };
}

/**
 * Analyze anchor text quality and variety
 */
function analyzeAnchorText(pages: PageAnalysisResult[]): AnchorTextAnalysis {
  
  const allAnchors: string[] = [];
  let descriptiveCount = 0;
  let exactMatchCount = 0;
  let genericCount = 0;
  
  const genericTerms = ['click here', 'read more', 'learn more', 'here', 'this', 'more'];

  pages.forEach(page => {
    page.internalLinks?.forEach(link => {
      const anchorText = link.text.toLowerCase().trim();
      allAnchors.push(anchorText);
      
      if (genericTerms.includes(anchorText)) {
        genericCount++;
      } else if (anchorText.length >= 3 && anchorText.length <= 60) {
        descriptiveCount++;
      }
      
      // Check for exact match (would need keyword data)
      // For now, consider anchors with 1-3 words as potentially exact match
      const wordCount = anchorText.split(/\s+/).length;
      if (wordCount <= 3 && wordCount > 0 && !genericTerms.includes(anchorText)) {
        exactMatchCount++;
      }
    });
  });

  const total = allAnchors.length;
  const descriptiveAnchors = total > 0 ? (descriptiveCount / total) * 100 : 0;
  const exactMatchAnchors = total > 0 ? (exactMatchCount / total) * 100 : 0;
  const genericAnchors = total > 0 ? (genericCount / total) * 100 : 0;
  
  // Calculate anchor variety using unique anchors
  const uniqueAnchors = new Set(allAnchors);
  const anchorVariety = total > 0 ? (uniqueAnchors.size / total) * 100 : 0;
  
  const anchorTextScore = Math.round(
    (descriptiveAnchors >= 70 ? 40 : descriptiveAnchors * 0.57) +
    (exactMatchAnchors >= 20 && exactMatchAnchors <= 40 ? 30 : 15) +
    (anchorVariety >= 60 ? 30 : anchorVariety * 0.5)
  );

  return {
    descriptiveAnchors: Math.round(descriptiveAnchors),
    exactMatchAnchors: Math.round(exactMatchAnchors),
    genericAnchors: Math.round(genericAnchors),
    anchorVariety: Math.round(anchorVariety),
    anchorTextScore: Math.min(100, anchorTextScore)
  };
}

/**
 * Analyze navigation structure and depth
 */
function analyzeNavigationStructure(
  pages: PageAnalysisResult[],
  linkGraph: Map<string, { incoming: string[]; outgoing: string[] }>
): NavigationStructureAnalysis {
  
  // Handle empty pages array - return default values when no pages analyzed
  if (pages.length === 0) {
    return {
      maxDepthFromHome: 0,
      averageDepthFromHome: 0,
      breadcrumbImplementation: false,
      menuStructure: 0,
      navigationScore: 0
    };
  }
  
  // Find homepage (first page or one with most incoming links)
  const homepage = pages[0]; // Assuming first page is homepage
  
  // Calculate depth from homepage using BFS
  const depths = calculatePageDepths(homepage.url, linkGraph);
  const depthValues = Object.values(depths).filter(d => d !== Infinity);
  
  const maxDepthFromHome = depthValues.length > 0 ? Math.max(...depthValues) : 0;
  const averageDepthFromHome = depthValues.length > 0 
    ? depthValues.reduce((a, b) => a + b, 0) / depthValues.length 
    : 0;
  
  // Check for breadcrumb implementation (placeholder)
  const breadcrumbImplementation = false; // Would check for breadcrumb markup
  
  // Estimate menu structure quality based on homepage outgoing links
  const homepageNode = linkGraph.get(homepage.url);
  const menuQuality = homepageNode ? Math.min(100, homepageNode.outgoing.length * 15) : 0;
  
  const navigationScore = Math.round(
    (maxDepthFromHome <= 3 ? 40 : Math.max(0, 40 - (maxDepthFromHome - 3) * 10)) +
    (averageDepthFromHome <= 2 ? 30 : 15) +
    (breadcrumbImplementation ? 15 : 0) +
    Math.min(15, menuQuality)
  );

  return {
    maxDepthFromHome,
    averageDepthFromHome: Math.round(averageDepthFromHome * 10) / 10,
    breadcrumbImplementation,
    menuStructure: Math.round(menuQuality),
    navigationScore: Math.min(100, navigationScore)
  };
}

/**
 * Calculate page depths from homepage using BFS
 */
function calculatePageDepths(
  homepageUrl: string, 
  linkGraph: Map<string, { incoming: string[]; outgoing: string[] }>
): Record<string, number> {
  
  const depths: Record<string, number> = {};
  const visited = new Set<string>();
  const queue = [{ url: homepageUrl, depth: 0 }];
  
  while (queue.length > 0) {
    const { url, depth } = queue.shift()!;
    
    if (visited.has(url)) continue;
    visited.add(url);
    depths[url] = depth;
    
    const node = linkGraph.get(url);
    if (node) {
      node.outgoing.forEach(outgoingUrl => {
        if (!visited.has(outgoingUrl)) {
          queue.push({ url: outgoingUrl, depth: depth + 1 });
        }
      });
    }
  }
  
  return depths;
}

/**
 * Analyze link equity distribution
 */
function analyzeLinkEquity(
  pages: PageAnalysisResult[],
  linkGraph: Map<string, { incoming: string[]; outgoing: string[] }>
): LinkEquityAnalysis {
  
  // Calculate simple PageRank-like scores
  const pageAuthority = new Map<string, number>();
  
  // Initialize with base authority
  pages.forEach(page => {
    pageAuthority.set(page.url, 1.0);
  });
  
  // Simple authority calculation based on incoming links
  pages.forEach(page => {
    const node = linkGraph.get(page.url);
    if (node) {
      const incomingLinks = node.incoming.length;
      const authority = Math.log(incomingLinks + 1) * 2;
      pageAuthority.set(page.url, authority);
    }
  });
  
  // Identify hub pages (pages with high authority or many links)
  const hubPages = pages
    .map(page => {
      const node = linkGraph.get(page.url);
      const authority = pageAuthority.get(page.url) || 0;
      return {
        url: page.url,
        incomingLinks: node ? node.incoming.length : 0,
        outgoingLinks: node ? node.outgoing.length : 0,
        authority
      };
    })
    .filter(page => page.authority >= 2 || page.outgoingLinks >= 5)
    .sort((a, b) => b.authority - a.authority)
    .slice(0, 10);
  
  // Calculate link equity distribution score
  const authorityValues = Array.from(pageAuthority.values());
  const maxAuthority = Math.max(...authorityValues);
  const minAuthority = Math.min(...authorityValues);
  const equityDistribution = maxAuthority > 0 ? (1 - (maxAuthority - minAuthority) / maxAuthority) * 100 : 100;
  
  // Create internal PageRank results
  const internalPageRank = pages
    .map(page => ({
      url: page.url,
      score: Math.round((pageAuthority.get(page.url) || 0) * 10) / 10
    }))
    .sort((a, b) => b.score - a.score);

  const equityScore = Math.round(
    (equityDistribution * 0.4) +
    (hubPages.length >= 3 ? 30 : hubPages.length * 10) +
    (internalPageRank.filter(p => p.score >= 1).length / pages.length * 30)
  );

  return {
    hubPages,
    linkEquityDistribution: Math.round(equityDistribution),
    internalPageRank,
    equityScore: Math.min(100, equityScore)
  };
}

/**
 * Calculate overall link architecture score
 */
function calculateLinkArchitectureScore(
  distribution: LinkDistributionAnalysis,
  anchorText: AnchorTextAnalysis,
  navigation: NavigationStructureAnalysis,
  equity: LinkEquityAnalysis
): number {
  
  return Math.round(
    distribution.distributionScore * 0.3 +
    anchorText.anchorTextScore * 0.25 +
    navigation.navigationScore * 0.25 +
    equity.equityScore * 0.2
  );
}

/**
 * Generate link architecture recommendations
 */
function generateLinkArchitectureRecommendations(
  pages: PageAnalysisResult[],
  distribution: LinkDistributionAnalysis,
  anchorText: AnchorTextAnalysis,
  navigation: NavigationStructureAnalysis,
  equity: LinkEquityAnalysis
): LinkArchitectureRecommendation[] {
  
  const recommendations: LinkArchitectureRecommendation[] = [];

  // Distribution recommendations
  if (distribution.averageLinksPerPage < 3) {
    recommendations.push({
      category: 'link-distribution',
      priority: 'high',
      title: 'Increase Internal Linking',
      description: `Pages average only ${distribution.averageLinksPerPage} internal links. More linking improves SEO and user experience.`,
      actionItems: [
        'Add 3-5 relevant internal links per page',
        'Link to related content and deeper pages',
        'Create content clusters around key topics',
        'Use contextual linking within content'
      ],
      impact: 7,
      affectedPages: pages.filter(p => (p.internalLinks?.length || 0) < 3).map(p => p.url)
    });
  }

  if (distribution.orphanPages.length > 0) {
    recommendations.push({
      category: 'orphan-pages',
      priority: 'high',
      title: 'Fix Orphan Pages',
      description: `${distribution.orphanPages.length} pages have no incoming internal links and may not be discoverable.`,
      actionItems: [
        'Link to orphan pages from relevant content',
        'Add orphan pages to main navigation if appropriate',
        'Create hub pages that link to related orphan content',
        'Consider if orphan pages should be merged or removed'
      ],
      impact: 8,
      affectedPages: distribution.orphanPages
    });
  }

  // Anchor text recommendations
  if (anchorText.genericAnchors > 30) {
    recommendations.push({
      category: 'anchor-text',
      priority: 'medium',
      title: 'Improve Anchor Text Quality',
      description: `${Math.round(anchorText.genericAnchors)}% of anchor text is generic ("click here", "read more").`,
      actionItems: [
        'Replace generic anchor text with descriptive terms',
        'Use keywords naturally in anchor text',
        'Describe the linked page content in anchor text',
        'Make anchor text actionable and specific'
      ],
      impact: 5,
      affectedPages: pages.filter(p => {
        const genericLinks = p.internalLinks?.filter(link => 
          ['click here', 'read more', 'here', 'this'].includes(link.text.toLowerCase())
        ).length || 0;
        return genericLinks > 0;
      }).map(p => p.url)
    });
  }

  // Navigation structure recommendations
  if (navigation.maxDepthFromHome > 3) {
    recommendations.push({
      category: 'navigation-depth',
      priority: 'medium',
      title: 'Reduce Navigation Depth',
      description: `Some pages are ${navigation.maxDepthFromHome} clicks from the homepage, making them hard to discover.`,
      actionItems: [
        'Add direct links from homepage to important deep pages',
        'Create category pages that group related content',
        'Implement breadcrumb navigation',
        'Add "Related Content" sections to reduce depth'
      ],
      impact: 6,
      affectedPages: [] // Would need to identify deep pages
    });
  }

  // Link equity recommendations
  if (equity.hubPages.length < 3) {
    recommendations.push({
      category: 'link-equity',
      priority: 'medium',
      title: 'Create Content Hub Pages',
      description: 'Your site lacks strong hub pages that distribute link equity effectively.',
      actionItems: [
        'Create topic cluster hub pages',
        'Link hub pages to related subtopic pages',
        'Ensure hub pages have substantial content',
        'Link to hub pages from the main navigation'
      ],
      impact: 6,
      affectedPages: pages.slice(0, 5).map(p => p.url) // Suggest top pages as potential hubs
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority] || b.impact - a.impact;
  });
}