/**
 * CTA Elements Extractor
 * Enhanced CTA element extraction for modern React/Tailwind/component-based sites
 */

import * as cheerio from 'cheerio';

export function extractCtaElements($: cheerio.CheerioAPI, url: string) {
  const ctaElements: Array<{
    type: string;
    text: string;
    element: string;
    attributes: Record<string, string>;
  }> = [];

  console.log(`Analyzing CTAs for ${url}`);

  // Cookie banner detection patterns
  const cookieBannerSelectors = [
    '[class*="cookie"]', '[id*="cookie"]',
    '[class*="gdpr"]', '[id*="gdpr"]',
    '[class*="consent"]', '[id*="consent"]',
    '[class*="privacy-banner"]', '[id*="privacy-banner"]',
    '[class*="notice-banner"]', '[id*="notice-banner"]',
    '[class*="modal-cacsp"]', '[id*="modal-cacsp"]',
    '[role="dialog"][aria-label*="cookie"]',
    '[role="dialog"][aria-label*="consent"]',
    '[data-testid*="cookie"]', '[data-testid*="consent"]'
  ];

  const cookieBannerKeywords = [
    'accept cookies', 'reject cookies', 'cookie consent', 'cookie preferences',
    'manage cookies', 'cookie settings', 'privacy settings', 'consent preferences',
    'accept all', 'reject all', 'necessary cookies', 'optional cookies',
    'cookies policy', 'cookie notice', 'we use cookies', 'this site uses cookies'
  ];

  // Helper function to check if element is within a cookie banner
  const isInCookieBanner = ($el: cheerio.Cheerio<cheerio.Element>): boolean => {
    // Check if element or any parent matches cookie banner selectors
    for (const selector of cookieBannerSelectors) {
      if ($el.is(selector) || $el.closest(selector).length > 0) {
        return true;
      }
    }

    // Check if element text matches cookie banner keywords
    const elementText = $el.text().toLowerCase();
    for (const keyword of cookieBannerKeywords) {
      if (elementText.includes(keyword)) {
        return true;
      }
    }

    return false;
  };


  // Strategy 1: Traditional button elements
  $('button').each((_, el) => {
    const $el = $(el);

    // Skip cookie banner buttons
    if (isInCookieBanner($el)) {
      return;
    }

    const buttonText = $el.text().trim();
    const type = $el.attr('type') || 'button';
    const classes = $el.attr('class') || '';
    const ariaLabel = $el.attr('aria-label') || '';

    // Use aria-label if text is empty (for icon buttons)
    const finalText = buttonText || ariaLabel || 'Button';

    ctaElements.push({
      type: 'button',
      text: finalText,
      element: 'button',
      attributes: {
        type: type,
        class: classes,
        'aria-label': ariaLabel
      }
    });
  });

  // Strategy 2: Traditional input buttons
  $('input[type="submit"], input[type="button"], input[type="image"]').each((_, el) => {
    const $el = $(el);

    // Skip cookie banner inputs
    if (isInCookieBanner($el)) {
      return;
    }

    const buttonText = $el.val()?.toString().trim() || $el.attr('value') || $el.attr('alt') || 'Submit';
    const type = $el.attr('type') || '';
    const classes = $el.attr('class') || '';

    ctaElements.push({
      type: 'input_button',
      text: buttonText,
      element: 'input',
      attributes: {
        type: type,
        class: classes
      }
    });
  });

  // Strategy 3: Enhanced link buttons with comprehensive class detection
  $('a').each((_, el) => {
    const $el = $(el);
    const classes = $el.attr('class') || '';
    const href = $el.attr('href') || '';
    const linkText = $el.text().trim();
    const role = $el.attr('role') || '';
    const ariaLabel = $el.attr('aria-label') || '';

    // Skip cookie banner links
    if (isInCookieBanner($el)) {
      return;
    }

    // Enhanced button class detection for modern frameworks
    const hasButtonClass = classes.includes('button') || 
                          classes.includes('btn') ||
                          role === 'button' ||
                          classes.match(/bg-(blue|green|red|purple|indigo|pink|yellow|orange|emerald|cyan|amber|lime|violet|fuchsia|rose|sky|teal)-\d+/) || // Tailwind button colors
                          classes.includes('rounded') && classes.includes('px-') && classes.includes('py-') || // Tailwind button pattern
                          classes.includes('MuiButton') || // Material-UI
                          classes.includes('chakra-button') || // Chakra UI
                          classes.includes('ant-btn') || // Ant Design
                          classes.includes('Button--') || // Styled components pattern
                          classes.includes('cursor-pointer') && (classes.includes('border') || classes.includes('shadow')); // Interactive styled elements

    if (hasButtonClass && (linkText || ariaLabel)) {
      const finalText = linkText || ariaLabel || 'Link';
      ctaElements.push({
        type: 'link_button',
        text: finalText,
        element: 'a',
        attributes: {
          href: href,
          class: classes,
          role: role
        }
      });
    }
  });

  // Strategy 4: ARIA role-based CTAs (React components often use divs with roles)
  $('[role="button"], [role="link"], [tabindex="0"][class*="cursor-pointer"]').each((_, el) => {
    const $el = $(el);
    if ($el.is('button, a, input')) return; // Skip if already processed above

    // Skip cookie banner elements
    if (isInCookieBanner($el)) {
      return;
    }

    const classes = $el.attr('class') || '';
    const text = $el.text().trim();
    const ariaLabel = $el.attr('aria-label') || '';
    const role = $el.attr('role') || '';
    const element = $el.get(0) as Element;
    const tagName = element?.tagName?.toLowerCase() || 'div';

    // Skip if likely not a CTA (too long, navigation, etc.)
    if (text.length > 100 || text.match(/^(menu|nav|navigation|header|footer)$/i)) return;

    const finalText = text || ariaLabel || `Interactive ${role}`;
    if (finalText.length > 2) {
      ctaElements.push({
        type: 'aria_cta',
        text: finalText,
        element: tagName,
        attributes: {
          role: role,
          class: classes,
          'aria-label': ariaLabel
        }
      });
    }
  });

  // Strategy 5: Tailwind and modern CSS framework button patterns
  const buttonLikeSelectors = [
    // WordPress block buttons
    '.wp-block-button__link, .wp-block-button > a',
    '.wp-block-buttons .wp-block-button a',
    '.wp-block-group .wp-block-button__link',
    '.wp-element-button', // WordPress 6.0+ button class
    
    // Tailwind button patterns
    '[class*="bg-blue-"][class*="hover:bg-"], [class*="bg-green-"][class*="hover:bg-"]',
    '[class*="bg-red-"][class*="hover:bg-"], [class*="bg-purple-"][class*="hover:bg-"]',
    '[class*="px-"][class*="py-"][class*="rounded"][class*="cursor-pointer"]',
    '[class*="border"][class*="rounded"][class*="px-"][class*="hover:"]',

    // Component library patterns
    '.MuiButton-root, .MuiIconButton-root, .MuiFab-root',
    '.chakra-button, .chakra-icon-button',
    '.ant-btn',
    '[class*="Button--"], [class*="button--"]', // BEM or styled-components

    // Generic interactive patterns
    '[class*="btn-"], [class*="cta-"], [class*="action-"]',
    '[data-testid*="button"], [data-testid*="cta"], [data-testid*="action"]'
  ];

  buttonLikeSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const $el = $(el);
      if ($el.is('button, a, input, [role="button"]')) return; // Skip if already processed

      // Skip cookie banner elements
      if (isInCookieBanner($el)) {
        return;
      }

      const classes = $el.attr('class') || '';
      const text = $el.text().trim();
      const ariaLabel = $el.attr('aria-label') || '';
      const testId = $el.attr('data-testid') || '';
      const element = $el.get(0) as Element;
      const tagName = element?.tagName?.toLowerCase() || 'div';

      // Skip if likely not a CTA
      if (text.length > 100 || text.match(/^(menu|nav|navigation|header|footer|copyright|privacy)$/i)) return;

      const finalText = text || ariaLabel || testId || 'Interactive Element';
      if (finalText.length > 2) {
        ctaElements.push({
          type: 'styled_cta',
          text: finalText,
          element: tagName,
          attributes: {
            class: classes,
            'data-testid': testId
          }
        });
      }
    });
  });

  // Strategy 6: Form submission elements and download links
  $('a[href*="download"], a[href*=".pdf"], a[href*=".zip"], a[href*=".doc"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const linkText = $el.text().trim();
    const classes = $el.attr('class') || '';

    // Skip cookie banner links
    if (isInCookieBanner($el)) {
      return;
    }

    if (linkText && !ctaElements.some(cta => cta.text === linkText && cta.type === 'link_button')) {
      ctaElements.push({
        type: 'download_cta',
        text: linkText,
        element: 'a',
        attributes: {
          href: href,
          class: classes
        }
      });
    }
  });

  // Strategy 7: Common CTA text patterns (last resort for untagged CTAs)
  const ctaTextPatterns = /\b(sign up|sign in|log in|log out|register|subscribe|buy now|purchase|order|shop now|get started|learn more|contact us|call now|book now|try free|download|join now|apply now|request|submit|continue|proceed|next|finish|complete)\b/i;

  $('span, div').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const classes = $el.attr('class') || '';
    const parentClasses = $el.parent().attr('class') || '';

    // Skip cookie banner elements
    if (isInCookieBanner($el)) {
      return;
    }

    // Only consider if text matches CTA patterns, is short, and has interactive styling
    if (text.match(ctaTextPatterns) && 
        text.length <= 50 && 
        text.split(' ').length <= 5 &&
        (classes.includes('cursor-pointer') || 
         parentClasses.includes('cursor-pointer') ||
         classes.includes('hover:') || 
         parentClasses.includes('hover:')) &&
        !$el.closest('button, a, [role="button"]').length) { // Not nested in other CTAs

      const element = $el.get(0) as Element;
      const tagName = element?.tagName?.toLowerCase() || 'span';
      ctaElements.push({
        type: 'text_pattern_cta',
        text: text,
        element: tagName,
        attributes: {
          class: classes
        }
      });
    }
  });

  // Strategy 8: Forms (potential CTAs)
  $('form').each((_, el) => {
    const $el = $(el);

    // Skip cookie banner forms
    if (isInCookieBanner($el)) {
      return;
    }

    const formId = $el.attr('id') || $el.attr('class') || 'form';
    
    // Check for WordPress form buttons and standard submit buttons
    const submitButton = $el.find('input[type="submit"], button[type="submit"], .wp-block-button__link, .wp-element-button').first();
    const formText = submitButton.attr('value') || 
                     submitButton.text().trim() ||
                     'Form submission';

    ctaElements.push({
      type: 'form',
      text: formText,
      element: 'form',
      attributes: {
        class: $el.attr('class') || '',
        id: $el.attr('id') || '',
        action: $el.attr('action') || ''
      }
    });
  });

  // Strategy 9: WordPress-specific form blocks
  $('.wp-block-contact-form, .wpforms-form, .gform_wrapper, .wpcf7-form, [class*="wp-block-"] form').each((_, el) => {
    const $el = $(el);
    
    // Skip cookie banner forms
    if (isInCookieBanner($el)) {
      return;
    }

    // Skip if already captured as a standard form
    if ($el.is('form')) return;

    const formText = $el.find('input[type="submit"], button[type="submit"], .wp-block-button__link').first().text().trim() || 
                     $el.find('input[type="submit"], button[type="submit"], .wp-block-button__link').first().attr('value') ||
                     'WordPress form';

    if (formText && formText !== 'WordPress form') {
      ctaElements.push({
        type: 'wp_form',
        text: formText,
        element: 'div',
        attributes: {
          class: $el.attr('class') || ''
        }
      });
    }
  });


  // Remove duplicates based on text and proximity
  const uniqueCtaElements = ctaElements.reduce((unique, current) => {
    const isDuplicate = unique.some(existing => 
      existing.text.toLowerCase() === current.text.toLowerCase() &&
      Math.abs(existing.text.length - current.text.length) <= 5
    );

    if (!isDuplicate) {
      unique.push(current);
    }

    return unique;
  }, [] as typeof ctaElements);

  console.log(`Found ${uniqueCtaElements.length} unique CTA elements on ${url}`);
  return uniqueCtaElements;
}