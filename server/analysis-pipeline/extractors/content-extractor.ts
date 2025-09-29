/**
 * Content Elements Extractor
 * Handles extraction of headings, images, paragraphs, and text content
 */

import * as cheerio from 'cheerio';
import { Heading } from '../../../client/src/lib/types.js';

// Extend the Image interface to include suggestedAlt
export interface AnalysisImage {
  src: string;
  alt: string | null;
  width?: number;
  height?: number;
  suggestedAlt?: string;
}

export function extractContentElements($: cheerio.CheerioAPI, url: string, settings: any) {
  // Enhanced heading extraction for SSR React components
  const headings: Heading[] = [];
  
  // Traditional heading tags
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      headings.push({
        level: parseInt($(el).get(0)?.tagName.substring(1) || '6'),
        text: text
      });
    }
  });

  // Enhanced heading selectors for modern React/Tailwind/SSR components
  const headingSelectors = [
    // Tailwind typography scale - Extra large (H1 candidates)
    '[class*="text-4xl"], [class*="text-5xl"], [class*="text-6xl"], [class*="text-7xl"], [class*="text-8xl"], [class*="text-9xl"]',
    // Large text (H2 candidates)
    '[class*="text-3xl"]',
    // Medium-large text (H3 candidates) 
    '[class*="text-2xl"]',
    // Medium text (H4/H5/H6 candidates)
    '[class*="text-xl"], [class*="text-lg"][class*="font-bold"], [class*="text-lg"][class*="font-semibold"]',
    
    // Font weight combinations (often used for headings)
    '[class*="font-bold"][class*="text-"], [class*="font-extrabold"], [class*="font-black"]',
    '[class*="font-semibold"][class*="text-lg"], [class*="font-medium"][class*="text-xl"]',
    
    // Explicit semantic classes
    '[class*="heading"], [class*="title"], [class*="headline"]',
    '[class*="hero-title"], [class*="page-title"], [class*="section-title"]',
    '[class*="display-"], [class*="lead-"]', // Bootstrap-style classes
    
    // ARIA and role-based selectors (accessibility-focused React apps)
    '[role="heading"], [aria-level]',
    
    // Component library patterns (MUI, Chakra, etc.)
    '[class*="MuiTypography-h"], [class*="chakra-heading"]',
    '[class*="Typography--variant-h"], [class*="Heading--"]',
    
    // Next.js/Gatsby common patterns
    '[class*="prose"] h1, [class*="prose"] h2, [class*="prose"] h3, [class*="prose"] h4, [class*="prose"] h5, [class*="prose"] h6',
    '[data-testid*="heading"], [data-testid*="title"]',
    
    // Styled-components and CSS-in-JS patterns
    '[class*="styled__Heading"], [class*="sc-"][class*="heading"]',
    
    // Utility-first framework alternatives to Tailwind
    '[class*="fs-1"], [class*="fs-2"], [class*="fs-3"]', // Bootstrap font-size
    '[class*="text-size-"], [class*="font-size-"]', // Generic patterns
    
    // Modern design system patterns
    '[class*="typography-h"], [class*="type-h"], [class*="text-h"]',
    '[class*="scale-"], [class*="level-"]' // Design token patterns
  ];

  headingSelectors.forEach((selector, index) => {
    $(selector).each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      // Skip if already processed as a semantic heading
      if ($el.is('h1, h2, h3, h4, h5, h6')) return;
      
      // Skip if this element contains other heading elements
      if ($el.find('h1, h2, h3, h4, h5, h6').length > 0) return;
      
      // Skip if text is too long (likely not a heading)
      if (text.length > 200) return;
      
      // Skip if text is too short or looks like UI text
      if (text.length < 3 || text.match(/^(menu|login|signup|cart|search|home|about|contact)$/i)) return;

      if (text) {
        // Enhanced heading level determination based on multiple factors
        let level = 6; // Default to H6
        const classes = $el.attr('class') || '';
        const role = $el.attr('role') || '';
        const ariaLevel = $el.attr('aria-level');
        
        // Priority 1: Explicit ARIA level
        if (ariaLevel) {
          level = Math.max(1, Math.min(6, parseInt(ariaLevel)));
        }
        // Priority 2: Explicit role heading with level indicators
        else if (role === 'heading' && ariaLevel) {
          level = Math.max(1, Math.min(6, parseInt(ariaLevel)));
        }
        // Priority 3: Component library patterns
        else if (classes.includes('MuiTypography-h')) {
          const match = classes.match(/MuiTypography-h([1-6])/);
          if (match) level = parseInt(match[1]);
        }
        else if (classes.includes('Typography--variant-h')) {
          const match = classes.match(/Typography--variant-h([1-6])/);
          if (match) level = parseInt(match[1]);
        }
        // Priority 4: Size-based detection with enhanced logic
        else if (selector.includes('text-4xl') || selector.includes('text-5xl') || selector.includes('text-6xl') || selector.includes('text-7xl') || selector.includes('text-8xl') || selector.includes('text-9xl') || classes.includes('hero-title') || classes.includes('display-1')) {
          level = 1;
        } else if (selector.includes('text-3xl') || classes.includes('page-title') || classes.includes('display-2') || classes.includes('fs-1')) {
          level = 2;
        } else if (selector.includes('text-2xl') || classes.includes('section-title') || classes.includes('display-3') || classes.includes('fs-2')) {
          level = 3;
        } else if (selector.includes('text-xl') || classes.includes('fs-3')) {
          level = 4;
        } else if (selector.includes('text-lg') || classes.includes('lead')) {
          level = 5;
        }
        // Priority 5: Semantic class patterns
        else if (classes.includes('title') || classes.includes('heading') || classes.includes('headline')) {
          // Determine level based on position in document and context
          const parents = $el.parents('main, article, section').length;
          level = Math.min(3, Math.max(1, parents + 1));
        }

        // Avoid duplicates by checking if we already have this exact text
        const isDuplicate = headings.some(h => h.text === text && Math.abs(h.level - level) <= 1);
        if (!isDuplicate) {
          headings.push({
            level: level,
            text: text
          });
        }
      }
    });
  });

  // Extract images
  const images: AnalysisImage[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      images.push({
        src: src.startsWith('http') ? src : new URL(src, url).toString(),
        alt: $(el).attr('alt') || null,
        width: parseInt($(el).attr('width') || '0') || undefined,
        height: parseInt($(el).attr('height') || '0') || undefined,
        suggestedAlt: undefined
      });
    }
  });

  // Extract content with quality metrics
  const paragraphs: string[] = [];
  const sentences: string[] = [];
  let totalContentLength = 0;
  const maxTotalLength = 15000;
  const maxParagraphLength = 1000;

  // Enhanced content extraction for SSR React pages
  const allTextContent = $('body').clone()
    .find('script, style, nav, header, footer, aside, .menu, .navigation, .sidebar, .comments, noscript, [aria-hidden="true"]')
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  // Enhanced content extraction strategies for modern React/Tailwind/SSR pages
  const textExtractionStrategy = [
    // Strategy 1: Traditional semantic elements (highest priority)
    { selector: 'p', priority: 1, name: 'traditional_paragraphs' },
    { selector: 'main p, article p, section p', priority: 1, name: 'semantic_paragraphs' },
    
    // Strategy 2: Enhanced semantic content areas
    { selector: 'main, article, section[class*="content"], [role="main"], [role="article"]', priority: 2, name: 'semantic_content_areas' },
    { selector: '[class*="prose"] p, [class*="prose"] div:not(:has(p)):not(:has(div))', priority: 2, name: 'prose_content' },
    
    // Strategy 3: Tailwind typography and text utility classes
    { selector: '[class*="text-lg"]:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6):not([class*="heading"]):not([class*="title"])', priority: 2, name: 'large_text' },
    { selector: '[class*="text-base"]:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6):not([class*="heading"]):not([class*="title"])', priority: 2, name: 'base_text' },
    { selector: '[class*="text-sm"], [class*="text-xs"]', priority: 3, name: 'small_text' },
    { selector: '[class*="text-muted"], [class*="text-gray"], [class*="text-slate"]', priority: 3, name: 'muted_text' },
    
    // Strategy 4: Content-specific semantic classes
    { selector: '[class*="description"]:not(meta)', priority: 2, name: 'descriptions' },
    { selector: '[class*="lead"], [class*="intro"], [class*="excerpt"]', priority: 2, name: 'lead_text' },
    { selector: '[class*="summary"], [class*="abstract"], [class*="overview"]', priority: 2, name: 'summary_text' },
    { selector: '[class*="body-text"], [class*="content-text"], [class*="post-content"]', priority: 2, name: 'body_content' },
    
    // Strategy 5: Component library and framework patterns
    { selector: '.MuiTypography-body1, .MuiTypography-body2', priority: 2, name: 'mui_typography' },
    { selector: '[class*="chakra-text"], [class*="chakra-stack"] p', priority: 2, name: 'chakra_text' },
    { selector: '[data-testid*="content"], [data-testid*="text"], [data-testid*="body"]', priority: 2, name: 'testid_content' },
    
    // Strategy 6: Layout-based content detection (React component patterns)
    { selector: 'div[class*="container"] p, div[class*="wrapper"] p', priority: 3, name: 'container_paragraphs' },
    { selector: 'div[class*="grid"] > div:not(:has(div)):not(:has(section)):not(:has(article))', priority: 3, name: 'grid_content' },
    { selector: 'div[class*="flex"] > div:not(:has(div)):not(:has(section)):not(:has(article))', priority: 3, name: 'flex_content' },
    { selector: 'div[class*="col-"] > div:not(:has(div)), div[class*="w-full"] > div:not(:has(div))', priority: 3, name: 'column_content' },
    
    // Strategy 7: Card and component content
    { selector: '[class*="card"] p, [class*="card"] div:not(:has(p)):not(:has(div))', priority: 3, name: 'card_content' },
    { selector: '[class*="item"] div:not(:has(div)), [class*="post"] div:not(:has(div))', priority: 3, name: 'item_content' },
    { selector: '[class*="feature"] div:not(:has(div)), [class*="benefit"] div:not(:has(div))', priority: 3, name: 'feature_content' },
    
    // Strategy 8: Blog/CMS patterns (Next.js, Gatsby, etc.)
    { selector: '[class*="post-body"], [class*="entry-content"], [class*="article-body"]', priority: 2, name: 'cms_content' },
    { selector: '[class*="markdown"], [class*="md-content"], [class*="rich-text"]', priority: 2, name: 'markdown_content' },
    { selector: '[data-mdx], [class*="mdx"]', priority: 2, name: 'mdx_content' },
    
    // Strategy 9: Spacing and layout utility patterns (Tailwind-style)
    { selector: '[class*="space-y-"] > div, [class*="gap-"] > div', priority: 3, name: 'spaced_content' },
    { selector: '[class*="py-"] div:not(:has(div)), [class*="px-"] div:not(:has(div))', priority: 4, name: 'padded_content' },
    
    // Strategy 10: Generic text containers (last resort)
    { selector: 'div:not(:has(div)):not(:has(section)):not(:has(article)):not(:has(p))', priority: 4, name: 'leaf_divs' },
    { selector: 'span:not(:has(*)):not([class*="icon"]):not([class*="btn"])', priority: 4, name: 'span_text' }
  ];

  const extractedTexts = new Set<string>();
  
  textExtractionStrategy.forEach(strategy => {
    if (totalContentLength >= maxTotalLength) return;
    
    $(strategy.selector).each((_, el) => {
      if (totalContentLength >= maxTotalLength) return false;
      
      const $el = $(el);
      
      // Get direct text content (not including nested elements for some strategies)
      let elementText = '';
      
      if (strategy.priority <= 2) {
        // For high-priority strategies, get all text content
        elementText = $el.text().trim();
      } else {
        // For lower-priority strategies, be more selective
        elementText = $el.contents()
          .filter(function() {
            return this.nodeType === 3 || // Text nodes
                   (this.nodeType === 1 && $(this).is('span, strong, em, b, i, a:not(:has(div)):not(:has(p))')); // Simple inline elements
          })
          .text()
          .trim();
      }
      
      // Skip if no meaningful text
      if (!elementText || elementText.length < 15) return;
      
      // Skip navigation, menu, and UI elements
      if (elementText.match(/^(menu|nav|navigation|header|footer|sidebar|cookie|privacy|terms|login|signup|register|cart|search|home|about|contact|back to top|skip to|toggle|close|open)$/i)) return;
      
      // Skip if text is very short phrases that are likely UI elements
      if (elementText.length < 30 && elementText.split(' ').length < 5) return;
      
      // Skip if we've already extracted this exact text
      if (extractedTexts.has(elementText)) return;
      
      // Skip if this text is contained within already extracted text
      let isDuplicate = false;
      for (const existing of Array.from(extractedTexts) as string[]) {
        if (existing.includes(elementText) || elementText.includes(existing)) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) return;
      
      // Additional filtering for lower priority extractions
      if (strategy.priority >= 3) {
        // Skip if element has many child elements (likely a container)
        const childElementCount = $el.children().length;
        if (childElementCount > 3) return;
        
        // Skip if text seems to be a title or heading based on length and caps
        if (elementText.length < 100 && elementText.toUpperCase() === elementText) return;
        
        // Skip if it looks like a button or link text
        if (elementText.match(/^(click|read more|learn more|get started|sign up|download|buy now|order now|contact us|call now)$/i)) return;
      }
      
      // Extract sentences for readability analysis
      const elementSentences = elementText.match(/[^\.!?]+[\.!?]+/g) || [];
      if (elementSentences.length > 0) {
        sentences.push(...elementSentences.map(s => s.trim()));
      } else if (elementText.length > 50) {
        // If no proper sentences, treat the whole text as one sentence for analysis
        sentences.push(elementText);
      }
      
      // Truncate if too long
      let finalText = elementText;
      if (finalText.length > maxParagraphLength) {
        finalText = finalText.substring(0, maxParagraphLength) + '...';
      }
      
      // Add to paragraphs if within limits
      if (totalContentLength + finalText.length <= maxTotalLength) {
        paragraphs.push(finalText);
        extractedTexts.add(elementText);
        totalContentLength += finalText.length;
        
        console.log(`[Content Extraction] Found ${finalText.length} chars via ${strategy.name}: "${finalText.substring(0, 50)}..."`);
      } else {
        const remainingLength = maxTotalLength - totalContentLength;
        if (remainingLength > 50) { // Only add if we have meaningful space left
          const truncated = finalText.substring(0, remainingLength) + '...';
          paragraphs.push(truncated);
          extractedTexts.add(elementText);
          totalContentLength += truncated.length;
          console.log(`[Content Extraction] Added truncated ${truncated.length} chars via ${strategy.name}`);
        }
        return false;
      }
    });
  });
  
  // Fallback: If still no meaningful content, try a more aggressive approach
  if (paragraphs.length === 0 || totalContentLength < 100) {
    console.log(`[Content Extraction] Fallback mode - trying aggressive extraction`);
    
    // Remove common non-content elements and extract all remaining text
    const cleanedBody = $('body').clone();
    cleanedBody.find('script, style, nav, header, footer, aside, noscript, [aria-hidden="true"], .menu, .navigation, .sidebar, .comments, .cookie, .popup, .modal').remove();
    
    const fallbackText = cleanedBody.text().replace(/\s+/g, ' ').trim();
    
    if (fallbackText.length > 100) {
      // Split into sentences and take meaningful chunks
      const fallbackSentences = fallbackText.match(/[^\.!?]+[\.!?]+/g) || [];
      
      if (fallbackSentences.length > 0) {
        let fallbackContent = '';
        for (const sentence of fallbackSentences) {
          const cleanSentence = sentence.trim();
          if (cleanSentence.length > 20 && fallbackContent.length + cleanSentence.length < maxTotalLength) {
            fallbackContent += cleanSentence + ' ';
            sentences.push(cleanSentence);
          }
        }
        
        if (fallbackContent.trim().length > 100) {
          paragraphs.push(fallbackContent.trim());
          totalContentLength = fallbackContent.length;
          console.log(`[Content Extraction] Fallback extracted ${fallbackContent.length} chars`);
        }
      }
    }
  }
  
  console.log(`[Content Extraction] Final stats: ${paragraphs.length} paragraphs, ${totalContentLength} total chars, ${sentences.length} sentences`);

  return {
    headings,
    images,
    paragraphs,
    sentences,
    allTextContent
  };
}