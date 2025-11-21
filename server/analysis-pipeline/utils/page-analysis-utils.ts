/**
 * Page Analysis Utilities
 * Helper functions for content analysis
 */

import { Heading } from '../../../client/src/lib/types.js';

export function calculateReadabilityScore(sentences: string[]): number {
  if (sentences.length === 0) {
    console.log('[Readability] No sentences provided, returning 0');
    return 0;
  }

  const totalWords = sentences.reduce((count, sentence) => {
    return count + sentence.split(/\s+/).filter(word => word.length > 0).length;
  }, 0);

  if (totalWords === 0) {
    console.log('[Readability] No words found in sentences, returning 0');
    return 0;
  }

  const totalSyllables = sentences.reduce((count, sentence) => {
    const words = sentence.split(/\s+/).filter(word => word.length > 0);
    return count + words.reduce((syllableCount, word: string) => {
      return syllableCount + countSyllables(word);
    }, 0);
  }, 0);

  const avgWordsPerSentence = totalWords / sentences.length;
  const avgSyllablesPerWord = totalSyllables / totalWords;
  
  // Language-aware readability scoring
  // The standard Flesch Reading Ease formula is designed for English and can produce
  // negative scores for languages with longer words (Finnish, German, etc.)
  // We use a normalized approach that works across languages
  
  let score: number;
  
  if (avgSyllablesPerWord > 2.2 || avgWordsPerSentence < 8) {
    // Likely non-English or complex language - use alternative formula
    // This creates a 0-100 scale based on relative complexity
    const sentenceComplexity = Math.min(100, (avgWordsPerSentence / 25) * 50); // Max 50 points for sentence length
    const wordComplexity = Math.max(0, 50 - ((avgSyllablesPerWord - 1) * 20)); // Subtract complexity points
    score = sentenceComplexity + wordComplexity;
    console.log(`[Readability] Using language-aware formula: ${sentences.length} sentences, ${totalWords} words, ${totalSyllables} syllables -> score ${score.toFixed(2)}`);
  } else {
    // Standard Flesch Reading Ease for English-like languages
    score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    console.log(`[Readability] Using Flesch formula: ${sentences.length} sentences, ${totalWords} words, ${totalSyllables} syllables -> score ${score.toFixed(2)}`);
  }

  return Math.max(0, Math.min(100, score));
}

export function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;

  const vowels = 'aeiouy';
  let syllableCount = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      syllableCount++;
    }
    previousWasVowel = isVowel;
  }

  if (word.endsWith('e') && syllableCount > 1) {
    syllableCount--;
  }

  return Math.max(1, syllableCount);
}

export function extractKeywordDensity(content: string): Array<{keyword: string, count: number, density: number}> {
  // Use Unicode-aware matching to preserve non-ASCII letters (e.g. ö, ä)
  // Match sequences that start with a letter and may contain letters, marks, numbers,
  // apostrophes or hyphens. The `u` flag enables Unicode property escapes \p{L}.
  const matches = content.toLowerCase().match(/\p{L}[\p{L}\p{M}\p{N}'-]*/gu) || [];

  // Keep reasonably short words (>= 3 chars) but allow 3-char words which can be
  // meaningful in many languages. This prevents over-filtering of short but valid
  // keywords in Finnish and other languages.
  const words = matches.filter(w => w.length >= 3);

  const totalWords = words.length || 1; // avoid division by zero
  const wordCount = new Map<string, number>();

  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });

  return Array.from(wordCount.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: (count / totalWords) * 100
    }))
    // Reduce required frequency to 2 to surface more potential keywords while
    // still filtering single-occurrence noise.
    .filter(item => item.count >= 2)
    .sort((a, b) => b.density - a.density)
    .slice(0, 20);
}

export function calculateContentDepth(paragraphs: string[], headings: Heading[]): number {
  let score = 0;

  const totalWords = paragraphs.join(' ').split(/\s+/).length;
  score += Math.min(50, totalWords / 20);

  const h1Count = headings.filter(h => h.level === 1).length;
  const h2Count = headings.filter(h => h.level === 2).length;
  const h3Count = headings.filter(h => h.level === 3).length;

  score += Math.min(20, h2Count * 3);
  score += Math.min(15, h3Count * 2);
  score += h1Count === 1 ? 10 : 0;

  const avgParagraphLength = paragraphs.length > 0 ? 
    totalWords / paragraphs.length : 0;

  if (avgParagraphLength > 20 && avgParagraphLength < 80) {
    score += 15;
  }

  return Math.min(100, score);
}

export function extractSemanticKeywords(content: string): string[] {
  const text = content.toLowerCase();
  const matches = text.match(/\p{L}[\p{L}\p{M}\p{N}'-]*/gu) || [];
  const words = matches.filter(w => w.length >= 3);
  const phrases = new Map<string, number>();

  // Extract 2-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
  }

  // Extract 3-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
  }

  return Array.from(phrases.entries())
    .filter(([phrase, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([phrase]) => phrase);
}