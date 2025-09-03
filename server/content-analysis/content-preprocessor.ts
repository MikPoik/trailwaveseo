/**
 * Content Preprocessing Module
 * Handles extraction, cleaning, and structuring of content from analyzed pages
 */

export interface ExtractedContent {
  titles: ContentItem[];
  descriptions: ContentItem[];
  headings: HeadingsByLevel;
  paragraphs: ContentItem[];
  totalPages: number;
}

export interface ContentItem {
  content: string;
  url: string;
  pageIndex: number; // For tracking which page this content came from
}

export interface HeadingsByLevel {
  h1: ContentItem[];
  h2: ContentItem[];
  h3: ContentItem[];
  h4: ContentItem[];
  h5: ContentItem[];
  h6: ContentItem[];
}

/**
 * Extract and structure content from analyzed pages
 */
export function extractPageContent(pages: Array<any>): ExtractedContent {
  const titles: ContentItem[] = [];
  const descriptions: ContentItem[] = [];
  const headings: HeadingsByLevel = {
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: []
  };
  const paragraphs: ContentItem[] = [];

  pages.forEach((page, pageIndex) => {
    // Extract titles
    if (page.title?.trim()) {
      titles.push({
        content: sanitizeContent(page.title),
        url: page.url,
        pageIndex
      });
    }

    // Extract meta descriptions
    if (page.metaDescription?.trim()) {
      descriptions.push({
        content: sanitizeContent(page.metaDescription),
        url: page.url,
        pageIndex
      });
    }

    // Extract headings by level
    if (page.headings) {
      page.headings.forEach((heading: any) => {
        if (heading.text?.trim() && heading.level >= 1 && heading.level <= 6) {
          const levelKey = `h${heading.level}` as keyof HeadingsByLevel;
          headings[levelKey].push({
            content: sanitizeContent(heading.text),
            url: page.url,
            pageIndex
          });
        }
      });
    }

    // Extract paragraph content (limit to prevent overwhelming analysis)
    if (page.paragraphs) {
      page.paragraphs
        .slice(0, 10) // Limit to first 10 paragraphs per page
        .filter((p: string) => p.trim().length > 30) // Only substantial paragraphs
        .forEach((paragraph: string) => {
          paragraphs.push({
            content: sanitizeContent(paragraph.length > 300 ? paragraph.substring(0, 300) + '...' : paragraph),
            url: page.url,
            pageIndex
          });
        });
    }
  });

  return {
    titles,
    descriptions,
    headings,
    paragraphs,
    totalPages: pages.length
  };
}

/**
 * Clean and sanitize content for safe processing
 */
export function sanitizeContent(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\r\n\t]/g, ' ') // Remove line breaks and tabs
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove non-printable characters
    .substring(0, 500); // Reasonable length limit
}

/**
 * Calculate content statistics for processing decisions
 */
export interface ContentStats {
  totalItems: number;
  averageLength: number;
  estimatedTokens: number;
  complexity: 'low' | 'medium' | 'high';
}

export function calculateContentStats(content: ContentItem[]): ContentStats {
  if (content.length === 0) {
    return { totalItems: 0, averageLength: 0, estimatedTokens: 0, complexity: 'low' };
  }

  const totalLength = content.reduce((sum, item) => sum + item.content.length, 0);
  const averageLength = totalLength / content.length;
  
  // Rough token estimation (1 token ≈ 4 characters for English text)
  const estimatedTokens = Math.ceil(totalLength / 4);

  // Determine complexity based on volume and variety
  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (content.length > 50 || estimatedTokens > 5000) {
    complexity = 'high';
  } else if (content.length > 20 || estimatedTokens > 2000) {
    complexity = 'medium';
  }

  return {
    totalItems: content.length,
    averageLength: Math.round(averageLength),
    estimatedTokens,
    complexity
  };
}

/**
 * Group content by similarity for more efficient processing
 */
export interface ContentGroup {
  representativeContent: string;
  items: ContentItem[];
  similarity: number; // 0-100
}

export function groupSimilarContent(content: ContentItem[], threshold: number = 80): ContentGroup[] {
  const groups: ContentGroup[] = [];
  const processed = new Set<number>();

  content.forEach((item, index) => {
    if (processed.has(index)) return;

    const group: ContentGroup = {
      representativeContent: item.content,
      items: [item],
      similarity: 100
    };

    // Find similar items
    for (let i = index + 1; i < content.length; i++) {
      if (processed.has(i)) continue;

      const similarity = calculateSimilarity(item.content, content[i].content);
      if (similarity >= threshold) {
        group.items.push(content[i]);
        processed.add(i);
      }
    }

    groups.push(group);
    processed.add(index);
  });

  return groups.sort((a, b) => b.items.length - a.items.length); // Sort by group size
}

/**
 * Simple similarity calculation (Jaccard similarity on words)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return union.size === 0 ? 0 : Math.round((intersection.size / union.size) * 100);
}