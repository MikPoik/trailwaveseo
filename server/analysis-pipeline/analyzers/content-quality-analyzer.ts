/**
 * Content Quality Analyzer
 * Analyze content quality metrics
 */

import { Heading } from '../../../client/src/lib/types.js';
import { calculateReadabilityScore, extractKeywordDensity, calculateContentDepth, extractSemanticKeywords } from '../utils/page-analysis-utils.js';

export function analyzeContentQuality(contentElements: any) {
  const { paragraphs, sentences, headings, allTextContent } = contentElements;

  // Calculate word count
  const wordCount = allTextContent.split(/\s+/).filter((word: string) => word.length > 0).length;

  console.log(`[Content Quality] Analyzing: ${wordCount} words, ${sentences.length} sentences, ${paragraphs.length} paragraphs`);

  // Calculate readability score
  const readabilityScore = calculateReadabilityScore(sentences);

  console.log(`[Content Quality] Readability score: ${readabilityScore.toFixed(2)}`);

  // Extract keyword density
  const keywordDensity = extractKeywordDensity(allTextContent);

  // Calculate content depth
  const contentDepth = calculateContentDepth(paragraphs, headings);

  // Extract semantic keywords
  const semanticKeywords = extractSemanticKeywords(allTextContent);

  return {
    wordCount,
    readabilityScore,
    keywordDensity,
    contentDepth,
    semanticKeywords
  };
}