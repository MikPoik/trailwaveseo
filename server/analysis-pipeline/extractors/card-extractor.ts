/**
 * Card Elements Extractor
 * Extract card elements from modern component-based layouts
 */

import * as cheerio from 'cheerio';

export function extractCardElements($: cheerio.CheerioAPI, url: string) {
  const cardElements: Array<{
    type: string;
    title: string;
    content: string;
    classes: string;
    hasImage: boolean;
    hasCTA: boolean;
  }> = [];

  console.log(`Analyzing card elements for ${url}`);

  // Enhanced card selectors for modern UI frameworks and SSR React components
  const cardSelectors = [
    // Traditional and semantic patterns
    '.card', '[class*="card"]', 'article', '[role="article"]', '[data-card]',
    
    // Tailwind CSS patterns
    '[class*="rounded-lg"][class*="bg-card"]', '[class*="rounded-lg"][class*="shadow"]',
    '[class*="border"][class*="rounded"]', '[class*="bg-card"][class*="text-card-foreground"]',
    '[class*="rounded"][class*="border-0"][class*="shadow"]', '[class*="hover:shadow"]',
    '[class*="rounded-md"][class*="p-"], [class*="rounded-xl"][class*="p-"]', // Padded rounded containers
    '[class*="bg-white"][class*="shadow"], [class*="bg-gray-"][class*="shadow"]', // Background + shadow
    
    // Grid and layout patterns
    '.grid > div[class*="rounded"], .grid > div[class*="border"]',
    '.flex > div[class*="shadow"], .flex > div[class*="border"]',
    '[class*="grid-cols-"] > div[class*="p-"]', '[class*="flex-col"] > div[class*="rounded"]',
    
    // Next.js specific patterns
    '[class*="_card_"], [class*="card_module"]', // CSS Modules
    '[data-testid*="card"], [data-testid*="item"], [data-testid*="post"]',
    
    // Gatsby specific patterns  
    '.gatsby-card, [class*="gatsby-card"]',
    '[class*="post-card"], [class*="blog-card"], [class*="article-card"]',
    
    // Component library patterns
    '.MuiCard-root, .MuiPaper-root[class*="elevation"]', // Material-UI
    '.chakra-card, [class*="chakra-card"]', // Chakra UI
    '.ant-card', // Ant Design
    '.card-component, [class*="Card--"]', // Styled components
    
    // Blog/CMS component patterns
    '[class*="post-preview"], [class*="post-item"], [class*="blog-post"]',
    '[class*="entry-"], [class*="article-"], [class*="content-item"]',
    
    // E-commerce patterns
    '[class*="product-"], [class*="item-"], [class*="listing-"]',
    '[class*="tile"], [class*="thumbnail"]',
    
    // Modern design system patterns
    '[class*="surface"], [class*="panel"], [class*="container"][class*="elevated"]',
    '[data-component="card"], [data-component="item"]',
    
    // React component data attributes
    '[data-react-component*="card"], [data-react-component*="item"]',
    '[data-component-name*="Card"], [data-component-name*="Item"]',
    
    // Framework-agnostic modern patterns
    'section[class*="rounded"]', 'div[class*="hover:scale"]', 
    '[class*="transition"][class*="shadow"]', '[class*="backdrop-blur"]'
  ];

  cardSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const $el = $(el);
      const classes = $el.attr('class') || '';

      // Skip if this element is nested inside another card
      if ($el.closest('.card, [class*="card"]').length > 1) return;

      // Look for card-like styling patterns
      const hasCardStyling = 
        classes.includes('card') ||
        classes.includes('shadow') ||
        (classes.includes('border') && classes.includes('rounded')) ||
        classes.includes('bg-card') ||
        $el.attr('data-card') !== undefined;

      if (!hasCardStyling && selector !== '[role="article"]') return;

      // Extract card content
      const title = $el.find('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]').first().text().trim();
      const contentText = $el.text().trim();

      // Skip if content is too short (likely not a meaningful card)
      if (contentText.length < 20) return;

      // Skip if content is too long (likely a page section, not a card)
      if (contentText.length > 500) return;

      const hasImage = $el.find('img, [role="img"], picture').length > 0;
      const hasCTA = $el.find('a, button, [role="button"], [class*="btn"], [class*="button"]').length > 0;

      cardElements.push({
        type: 'component_card',
        title: title || 'Untitled Card',
        content: contentText.substring(0, 200) + (contentText.length > 200 ? '...' : ''),
        classes: classes,
        hasImage: hasImage,
        hasCTA: hasCTA
      });
    });
  });

  console.log(`Found ${cardElements.length} card elements on ${url}`);
  return cardElements;
}