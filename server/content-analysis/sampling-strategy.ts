/**
 * Content Sampling Strategy Module
 * Smart sampling for large sites to stay within token limits while maintaining analysis quality
 */

import { ContentItem, ContentStats } from './content-preprocessor.js';

export interface SamplingStrategy {
  method: 'none' | 'random' | 'representative' | 'priority' | 'cluster';
  sampleSize: number;
  reason: string;
  preserveExactDuplicates: boolean;
}

export interface SamplingResult {
  sampled: ContentItem[];
  excluded: ContentItem[];
  representativeness: number; // 0-100%
  strategy: SamplingStrategy;
  insights: string[];
}

export interface ClusterInfo {
  centroid: ContentItem;
  members: ContentItem[];
  avgSimilarity: number;
}

/**
 * Determine the best sampling strategy based on content characteristics
 */
export function determineSamplingStrategy(
  stats: ContentStats,
  contentLength: number
): SamplingStrategy {
  
  // No sampling needed for small datasets
  if (contentLength <= 15 && stats.estimatedTokens <= 2000) {
    return {
      method: 'none',
      sampleSize: contentLength,
      reason: 'Small dataset - analyze all content',
      preserveExactDuplicates: true
    };
  }

  // Representative sampling for medium datasets
  if (contentLength <= 50 && stats.estimatedTokens <= 5000) {
    return {
      method: 'representative',
      sampleSize: Math.min(25, contentLength),
      reason: 'Medium dataset - representative sampling',
      preserveExactDuplicates: true
    };
  }

  // Priority-based sampling for large datasets
  if (contentLength <= 100) {
    return {
      method: 'priority',
      sampleSize: Math.min(30, contentLength),
      reason: 'Large dataset - priority-based sampling',
      preserveExactDuplicates: true
    };
  }

  // Cluster-based sampling for very large datasets
  return {
    method: 'cluster',
    sampleSize: Math.min(40, contentLength),
    reason: 'Very large dataset - cluster-based sampling',
    preserveExactDuplicates: true
  };
}

/**
 * Apply sampling strategy to content
 */
export function sampleContent(
  content: ContentItem[],
  strategy: SamplingStrategy,
  contentType: string
): SamplingResult {
  
  if (strategy.method === 'none' || content.length <= strategy.sampleSize) {
    return {
      sampled: content,
      excluded: [],
      representativeness: 100,
      strategy,
      insights: [`All ${content.length} ${contentType} analyzed`]
    };
  }

  switch (strategy.method) {
    case 'random':
      return applyRandomSampling(content, strategy, contentType);
    
    case 'representative':
      return applyRepresentativeSampling(content, strategy, contentType);
    
    case 'priority':
      return applyPrioritySampling(content, strategy, contentType);
    
    case 'cluster':
      return applyClusterSampling(content, strategy, contentType);
    
    default:
      return applyRepresentativeSampling(content, strategy, contentType);
  }
}

/**
 * Random sampling - simple but may miss patterns
 */
function applyRandomSampling(
  content: ContentItem[],
  strategy: SamplingStrategy,
  contentType: string
): SamplingResult {
  
  const shuffled = [...content].sort(() => Math.random() - 0.5);
  const sampled = shuffled.slice(0, strategy.sampleSize);
  const excluded = shuffled.slice(strategy.sampleSize);

  return {
    sampled,
    excluded,
    representativeness: Math.round((strategy.sampleSize / content.length) * 100),
    strategy,
    insights: [
      `Randomly sampled ${sampled.length}/${content.length} ${contentType}`,
      'May miss some duplicate patterns'
    ]
  };
}

/**
 * Representative sampling - ensures diverse content selection
 */
function applyRepresentativeSampling(
  content: ContentItem[],
  strategy: SamplingStrategy,
  contentType: string
): SamplingResult {
  
  // Step 1: Include exact duplicates if requested
  const duplicateGroups = findExactDuplicateGroups(content);
  const exactDuplicates = strategy.preserveExactDuplicates 
    ? duplicateGroups.flatMap(group => group.slice(0, 2)) // Take 2 from each duplicate group
    : [];

  // Step 2: Take remaining sample from unique content
  const uniqueContent = content.filter(item => 
    !exactDuplicates.some(dup => dup.url === item.url)
  );

  const remainingSampleSize = Math.max(0, strategy.sampleSize - exactDuplicates.length);
  const step = Math.max(1, Math.floor(uniqueContent.length / remainingSampleSize));
  
  const representativeSample = uniqueContent.filter((_, index) => index % step === 0)
    .slice(0, remainingSampleSize);

  const sampled = [...exactDuplicates, ...representativeSample];
  const excluded = content.filter(item => 
    !sampled.some(sample => sample.url === item.url)
  );

  const insights = [
    `Representative sample: ${sampled.length}/${content.length} ${contentType}`,
    `Preserved ${exactDuplicates.length} exact duplicates`,
    `${duplicateGroups.length} duplicate groups detected`
  ];

  return {
    sampled,
    excluded,
    representativeness: Math.round((sampled.length / content.length) * 100),
    strategy,
    insights
  };
}

/**
 * Priority sampling - focuses on high-impact content
 */
function applyPrioritySampling(
  content: ContentItem[],
  strategy: SamplingStrategy,
  contentType: string
): SamplingResult {
  
  // Step 1: Calculate priority scores
  const contentWithPriority = content.map(item => ({
    ...item,
    priority: calculateContentPriority(item, contentType)
  }));

  // Step 2: Sort by priority (highest first)
  contentWithPriority.sort((a, b) => b.priority - a.priority);

  // Step 3: Take top priority items
  const sampled = contentWithPriority.slice(0, strategy.sampleSize)
    .map(({ priority, ...item }) => item);
  
  const excluded = contentWithPriority.slice(strategy.sampleSize)
    .map(({ priority, ...item }) => item);

  const avgPriority = sampled.reduce((sum, item) => 
    sum + calculateContentPriority(item, contentType), 0) / sampled.length;

  const insights = [
    `Priority-based sample: ${sampled.length}/${content.length} ${contentType}`,
    `Average priority score: ${Math.round(avgPriority)}`,
    'Focused on homepage, landing pages, and duplicate content'
  ];

  return {
    sampled,
    excluded,
    representativeness: Math.round((sampled.length / content.length) * 85), // Slightly lower since it's biased
    strategy,
    insights
  };
}

/**
 * Cluster sampling - groups similar content and samples from each cluster
 */
function applyClusterSampling(
  content: ContentItem[],
  strategy: SamplingStrategy,
  contentType: string
): SamplingResult {
  
  // Step 1: Create content clusters
  const clusters = createContentClusters(content, 0.7); // 70% similarity threshold
  
  // Step 2: Sample from each cluster proportionally
  const sampled: ContentItem[] = [];
  const samplesPerCluster = Math.max(1, Math.floor(strategy.sampleSize / clusters.length));
  const remainingSamples = strategy.sampleSize - (samplesPerCluster * clusters.length);

  clusters.forEach((cluster, index) => {
    const clusterSampleSize = samplesPerCluster + (index < remainingSamples ? 1 : 0);
    
    // Always include the centroid (most representative)
    sampled.push(cluster.centroid);
    
    // Add other members if we have space
    const additionalSamples = Math.min(clusterSampleSize - 1, cluster.members.length);
    sampled.push(...cluster.members.slice(0, additionalSamples));
  });

  const excluded = content.filter(item => 
    !sampled.some(sample => sample.url === item.url)
  );

  const insights = [
    `Cluster-based sample: ${sampled.length}/${content.length} ${contentType}`,
    `${clusters.length} content clusters identified`,
    `Average ${Math.round(clusters.reduce((sum, c) => sum + c.avgSimilarity, 0) / clusters.length)}% intra-cluster similarity`
  ];

  return {
    sampled,
    excluded,
    representativeness: Math.round((clusters.length / content.length) * 100),
    strategy,
    insights
  };
}

/**
 * Calculate priority score for content item
 */
function calculateContentPriority(item: ContentItem, contentType: string): number {
  let priority = 0;

  // Base priority by content type
  const typePriority = {
    'titles': 100,
    'descriptions': 80,
    'headings': 60,
    'paragraphs': 40
  };
  priority += typePriority[contentType as keyof typeof typePriority] || 50;

  // URL-based priority boosts
  const url = item.url.toLowerCase();
  
  // Homepage gets highest priority
  if (url.endsWith('/') || url.includes('index') || url.includes('home')) {
    priority += 30;
  }

  // Important pages
  if (url.includes('about') || url.includes('contact') || url.includes('service')) {
    priority += 20;
  }

  // Product/category pages
  if (url.includes('product') || url.includes('category') || url.includes('shop')) {
    priority += 15;
  }

  // Landing pages
  if (url.includes('landing') || url.includes('lp') || url.includes('promo')) {
    priority += 25;
  }

  // Content length consideration
  if (item.content.length > 100) {
    priority += 10; // Substantial content gets boost
  }

  // Penalize very short content
  if (item.content.length < 20) {
    priority -= 20;
  }

  return Math.max(0, priority);
}

/**
 * Find exact duplicate groups for preservation
 */
function findExactDuplicateGroups(content: ContentItem[]): ContentItem[][] {
  const contentMap = new Map<string, ContentItem[]>();

  // Group by normalized content
  content.forEach(item => {
    const normalized = item.content.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!contentMap.has(normalized)) {
      contentMap.set(normalized, []);
    }
    contentMap.get(normalized)!.push(item);
  });

  // Return groups with duplicates
  return Array.from(contentMap.values()).filter(group => group.length > 1);
}

/**
 * Create content clusters using similarity
 */
function createContentClusters(content: ContentItem[], threshold: number): ClusterInfo[] {
  const clusters: ClusterInfo[] = [];
  const processed = new Set<number>();

  content.forEach((item, index) => {
    if (processed.has(index)) return;

    const clusterMembers: ContentItem[] = [];
    
    // Find similar items
    for (let i = index + 1; i < content.length; i++) {
      if (processed.has(i)) continue;

      const similarity = calculateSimpleSimilarity(item.content, content[i].content);
      if (similarity >= threshold) {
        clusterMembers.push(content[i]);
        processed.add(i);
      }
    }

    // Create cluster (even if no similar items found)
    const avgSimilarity = clusterMembers.length > 0 
      ? clusterMembers.reduce((sum, member) => 
          sum + calculateSimpleSimilarity(item.content, member.content), 0) / clusterMembers.length
      : 100;

    clusters.push({
      centroid: item,
      members: clusterMembers,
      avgSimilarity: Math.round(avgSimilarity)
    });

    processed.add(index);
  });

  // Sort clusters by size (largest first)
  return clusters.sort((a, b) => (b.members.length + 1) - (a.members.length + 1));
}

/**
 * Simple similarity calculation for clustering
 */
function calculateSimpleSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return union.size === 0 ? 0 : Math.round((intersection.size / union.size) * 100);
}