/**
 * Similarity Detection Module
 * Advanced duplicate detection with fuzzy matching and clustering
 */

import { ContentItem, ContentGroup } from './content-preprocessor.js';
import { DuplicateItem } from '../../shared/schema.js';

export interface SimilarityOptions {
  exactMatchThreshold: number; // 100 for exact matches
  fuzzyMatchThreshold: number; // 80-95 for near duplicates
  semanticThreshold: number; // 70-85 for semantic similarity
  minContentLength: number; // Minimum length to consider for analysis
}

export const DEFAULT_SIMILARITY_OPTIONS: SimilarityOptions = {
  exactMatchThreshold: 100,
  fuzzyMatchThreshold: 85,
  semanticThreshold: 75,
  minContentLength: 10
};

export interface DuplicateAnalysisResult {
  duplicateGroups: DuplicateItem[];
  duplicateCount: number;
  totalAnalyzed: number;
  examples: string[];
  stats: {
    exactMatches: number;
    fuzzyMatches: number;
    semanticMatches: number;
  };
}

/**
 * Detect duplicates using multiple algorithms for comprehensive analysis
 */
export function detectDuplicates(
  content: ContentItem[], 
  options: SimilarityOptions = DEFAULT_SIMILARITY_OPTIONS
): DuplicateAnalysisResult {
  
  // Filter out very short content
  const validContent = content.filter(item => 
    item.content.length >= options.minContentLength
  );

  if (validContent.length === 0) {
    return createEmptyResult();
  }

  // Step 1: Find exact matches (fastest)
  const exactMatches = findExactMatches(validContent);
  
  // Step 2: Find fuzzy matches among remaining content
  const remainingAfterExact = filterProcessedContent(validContent, exactMatches);
  const fuzzyMatches = findFuzzyMatches(remainingAfterExact, options.fuzzyMatchThreshold);
  
  // Step 3: Find semantic matches among remaining content (if needed)
  const remainingAfterFuzzy = filterProcessedContent(remainingAfterExact, fuzzyMatches);
  const semanticMatches = findSemanticMatches(remainingAfterFuzzy, options.semanticThreshold);

  // Combine all results and convert to proper DuplicateItem format
  const allDuplicateGroups: DuplicateItem[] = [
    ...exactMatches.map(group => ({
      content: group.representativeContent,
      urls: group.items.map(item => item.url),
      similarityScore: 100,
      impactLevel: determinImpactLevel(group)
    })),
    ...fuzzyMatches.map(group => ({
      content: group.representativeContent,
      urls: group.items.map(item => item.url),
      similarityScore: group.similarity,
      impactLevel: determinImpactLevel(group)
    })),
    ...semanticMatches.map(group => ({
      content: group.representativeContent,
      urls: group.items.map(item => item.url),
      similarityScore: group.similarity,
      impactLevel: determinImpactLevel(group)
    }))
  ];

  // Calculate statistics
  const duplicateCount = allDuplicateGroups.reduce((sum, group) => sum + (group.urls?.length || 0) - 1, 0);
  const examples = allDuplicateGroups
    .slice(0, 5)
    .map(group => group.content)
    .filter(content => content.trim().length > 0);

  return {
    duplicateGroups: allDuplicateGroups,
    duplicateCount,
    totalAnalyzed: validContent.length,
    examples,
    stats: {
      exactMatches: exactMatches.length,
      fuzzyMatches: fuzzyMatches.length,
      semanticMatches: semanticMatches.length
    }
  };
}

/**
 * Find exact content matches (case-insensitive, normalized whitespace)
 */
function findExactMatches(content: ContentItem[]): ContentGroup[] {
  const contentMap = new Map<string, ContentItem[]>();

  // Group by normalized content
  content.forEach(item => {
    const normalized = normalizeContent(item.content);
    if (!contentMap.has(normalized)) {
      contentMap.set(normalized, []);
    }
    contentMap.get(normalized)!.push(item);
  });

  // Return groups with duplicates
  return Array.from(contentMap.entries())
    .filter(([_, items]) => items.length > 1)
    .map(([normalizedContent, items]) => ({
      representativeContent: items[0].content, // Use original content
      items,
      similarity: 100
    }));
}

/**
 * Find fuzzy matches using advanced string similarity
 */
function findFuzzyMatches(content: ContentItem[], threshold: number): ContentGroup[] {
  const groups: ContentGroup[] = [];
  const processed = new Set<number>();

  content.forEach((item, index) => {
    if (processed.has(index)) return;

    const similarItems = [item];
    processed.add(index);

    // Find similar items
    for (let i = index + 1; i < content.length; i++) {
      if (processed.has(i)) continue;

      const similarity = calculateAdvancedSimilarity(item.content, content[i].content);
      if (similarity >= threshold) {
        similarItems.push(content[i]);
        processed.add(i);
      }
    }

    // Only create group if we found duplicates
    if (similarItems.length > 1) {
      groups.push({
        representativeContent: item.content,
        items: similarItems,
        similarity: threshold
      });
    }
  });

  return groups;
}

/**
 * Find semantic matches using word overlap and structure analysis
 */
function findSemanticMatches(content: ContentItem[], threshold: number): ContentGroup[] {
  const groups: ContentGroup[] = [];
  const processed = new Set<number>();

  content.forEach((item, index) => {
    if (processed.has(index)) return;

    const similarItems = [item];
    processed.add(index);

    // Find semantically similar items
    for (let i = index + 1; i < content.length; i++) {
      if (processed.has(i)) continue;

      const similarity = calculateSemanticSimilarity(item.content, content[i].content);
      if (similarity >= threshold) {
        similarItems.push(content[i]);
        processed.add(i);
      }
    }

    // Only create group if we found duplicates
    if (similarItems.length > 1) {
      groups.push({
        representativeContent: item.content,
        items: similarItems,
        similarity: threshold
      });
    }
  });

  return groups;
}

/**
 * Advanced similarity calculation combining multiple metrics
 */
function calculateAdvancedSimilarity(text1: string, text2: string): number {
  // Levenshtein-based similarity
  const levenshteinSim = calculateLevenshteinSimilarity(text1, text2);
  
  // Word-based Jaccard similarity
  const jaccardSim = calculateJaccardSimilarity(text1, text2);
  
  // Length-based similarity
  const lengthSim = calculateLengthSimilarity(text1, text2);
  
  // Weighted combination (Levenshtein gets more weight for fuzzy matching)
  return Math.round((levenshteinSim * 0.5) + (jaccardSim * 0.3) + (lengthSim * 0.2));
}

/**
 * Semantic similarity focusing on meaning and structure
 */
function calculateSemanticSimilarity(text1: string, text2: string): number {
  // Word overlap similarity
  const wordSim = calculateJaccardSimilarity(text1, text2);
  
  // Structural similarity (punctuation patterns, capitalization)
  const structSim = calculateStructuralSimilarity(text1, text2);
  
  // Key phrase similarity
  const phraseSim = calculateKeyphraseSimilarity(text1, text2);
  
  // Weighted combination for semantic analysis
  return Math.round((wordSim * 0.4) + (structSim * 0.2) + (phraseSim * 0.4));
}

/**
 * Levenshtein distance-based similarity
 */
function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 100 : Math.round((1 - matrix[str2.length][str1.length] / maxLength) * 100);
}

/**
 * Jaccard similarity on word sets
 */
function calculateJaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 && words2.size === 0) return 100;
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set(Array.from(words1).filter(word => words2.has(word)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);
  
  return Math.round((intersection.size / union.size) * 100);
}

/**
 * Length-based similarity
 */
function calculateLengthSimilarity(text1: string, text2: string): number {
  const len1 = text1.length;
  const len2 = text2.length;
  
  if (len1 === 0 && len2 === 0) return 100;
  
  const maxLen = Math.max(len1, len2);
  const minLen = Math.min(len1, len2);
  
  return Math.round((minLen / maxLen) * 100);
}

/**
 * Structural similarity (punctuation, capitalization patterns)
 */
function calculateStructuralSimilarity(text1: string, text2: string): number {
  // Extract structural patterns
  const pattern1 = extractStructuralPattern(text1);
  const pattern2 = extractStructuralPattern(text2);
  
  return calculateJaccardSimilarity(pattern1, pattern2);
}

/**
 * Key phrase similarity
 */
function calculateKeyphraseSimilarity(text1: string, text2: string): number {
  // Extract key phrases (sequences of 2-3 words)
  const phrases1 = extractKeyphrases(text1);
  const phrases2 = extractKeyphrases(text2);
  
  return calculateJaccardSimilarity(phrases1.join(' '), phrases2.join(' '));
}

/**
 * Helper functions
 */
function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

function extractStructuralPattern(text: string): string {
  return text
    .replace(/[a-zA-Z0-9]/g, 'X') // Replace alphanumeric with X
    .replace(/\s+/g, ' '); // Normalize spaces
}

function extractKeyphrases(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const phrases: string[] = [];
  
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }
  
  return phrases;
}

function filterProcessedContent(content: ContentItem[], processedGroups: ContentGroup[]): ContentItem[] {
  const processedUrls = new Set(
    processedGroups.flatMap(group => group.items.map(item => item.url))
  );
  
  return content.filter(item => !processedUrls.has(item.url));
}

function determinImpactLevel(group: ContentGroup): 'Critical' | 'High' | 'Medium' | 'Low' {
  const affectedPages = group.items.length;
  
  if (affectedPages >= 10) return 'Critical';
  if (affectedPages >= 5) return 'High';
  if (affectedPages >= 3) return 'Medium';
  return 'Low';
}

function createEmptyResult(): DuplicateAnalysisResult {
  return {
    duplicateGroups: [],
    duplicateCount: 0,
    totalAnalyzed: 0,
    examples: [],
    stats: {
      exactMatches: 0,
      fuzzyMatches: 0,
      semanticMatches: 0
    }
  };
}