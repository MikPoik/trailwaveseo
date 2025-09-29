/**
 * Page Analysis Utilities
 * Helper functions for content analysis
 */

import { Heading } from '../../../client/src/lib/types.js';

export function calculateReadabilityScore(sentences: string[]): number {
  if (sentences.length === 0) return 0;

  const totalWords = sentences.reduce((count, sentence) => {
    return count + sentence.split(/\s+/).filter(word => word.length > 0).length;
  }, 0);

  const totalSyllables = sentences.reduce((count, sentence) => {
    const words = sentence.split(/\s+/).filter(word => word.length > 0);
    return count + words.reduce((syllableCount, word: string) => {
      return syllableCount + countSyllables(word);
    }, 0);
  }, 0);

  const avgWordsPerSentence = totalWords / sentences.length;
  const avgSyllablesPerWord = totalSyllables / totalWords;
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

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
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);

  const totalWords = words.length;
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
    .filter(item => item.count >= 3)
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
  const words = text.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(word => word.length > 2);
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