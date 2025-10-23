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

  // Cookie banner detection patterns - more specific to avoid false positives
  const cookieBannerSelectors = [
    // Specific cookie banner containers (not just any element with "cookie" in class)
    '.cookie-banner', '.cookie-consent', '.cookie-notice', '.cookie-bar', '.cookie-popup',
    '#cookie-banner', '#cookie-consent', '#cookie-notice', '#cookie-bar', '#cookie-popup',
    '.gdpr-banner', '.gdpr-consent', '.gdpr-notice',
    '#gdpr-banner', '#gdpr-consent', '#gdpr-notice',
    '.consent-banner', '.consent-popup', '.consent-modal',
    '#consent-banner', '#consent-popup', '#consent-modal',
    // Common cookie consent library classes
    '.cc-window', '.cc-banner', '.cc-floating', '.cc-popup', // Cookie Consent library
    '#cookieConsent', '#cookieBanner', '#gdprConsent',
    '.CookieConsent', '.CookieBanner', '.GDPRConsent',
    '.modal-cacsp', '#modal-cacsp', // Cookies and Content Security Policy plugin
    // Dialog/modal with cookie/consent in aria-label
    '[role="dialog"][aria-label*="cookie"]',
    '[role="dialog"][aria-label*="consent"]',
    '[role="alertdialog"][aria-label*="cookie"]',
    '[role="alertdialog"][aria-label*="consent"]'
  ];

  const cookieBannerKeywords = [
    'accept cookies', 'reject cookies', 'cookie consent', 'cookie preferences',
    'manage cookies', 'cookie settings', 'privacy settings', 'consent preferences',
    'accept all', 'reject all', 'necessary cookies', 'optional cookies',
    'cookies policy', 'cookie notice', 'we use cookies', 'this site uses cookies'
  ];

  // Helper function to check if element is within a cookie banner
  const isInCookieBanner = ($el: cheerio.Cheerio<any>): boolean => {
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
                          classes.includes('wp-element-button') || // WordPress 6.0+ button
                          classes.includes('wp-block-button__link') || // WordPress block button
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
    const element = $el.get(0);
    const tagName = (element && 'tagName' in element) ? element.tagName?.toLowerCase() : 'div';

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

  // Strategy 5: WordPress block buttons (dedicated strategy for better detection)
  console.log(`[CTA Extractor] Strategy 5: Checking WordPress block buttons...`);
  const wpButtons = $('.wp-block-button a, .wp-block-button__link, .wp-element-button');
  console.log(`[CTA Extractor] Found ${wpButtons.length} potential WordPress buttons`);
  
  wpButtons.each((_, el) => {
    const $el = $(el);
    
    const classes = $el.attr('class') || '';
    const text = $el.text().trim();
    const href = $el.attr('href') || '';
    
    // Skip cookie banner elements
    if (isInCookieBanner($el)) {
      return;
    }

    // Skip if already processed
    if ($el.is('button, input')) {
      return;
    }

    const ariaLabel = $el.attr('aria-label') || '';

    const finalText = text || ariaLabel;
    if (finalText && finalText.length > 0) {
      ctaElements.push({
        type: 'wp_block_button',
        text: finalText,
        element: 'a',
        attributes: {
          href: href,
          class: classes
        }
      });
    } else {
      console.log(`[CTA Extractor] Skipping - no text found`);
    }
  });

  // Strategy 6: Tailwind and modern CSS framework button patterns
  const buttonLikeSelectors = [
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
      const element = $el.get(0);
      const tagName = (element && 'tagName' in element) ? element.tagName?.toLowerCase() : 'div';

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

  // Strategy 7: Form submission elements and download links
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

  // Strategy 8: Phone number CTAs (tel: links - language agnostic)
  $('a[href^="tel:"], a[href^="tel%3A"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const text = $el.text().trim();

    // Skip cookie banner elements
    if (isInCookieBanner($el)) {
      return;
    }

    if (text) {
      ctaElements.push({
        type: 'phone_cta',
        text: text,
        element: 'a',
        attributes: {
          href: href,
          class: $el.attr('class') || ''
        }
      });
    }
  });

  // Detect phone numbers in clickable elements with semantic classes
  $('[class*="phone"], [class*="tel"], [class*="call"], [class*="contact-number"]').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();

    // Skip cookie banner elements
    if (isInCookieBanner($el)) {
      return;
    }

    // Skip if already captured
    if ($el.is('a[href^="tel:"]')) return;

    // Skip if not clickable
    if (!$el.is('a, button, [onclick], [role="button"]')) return;

    // Only include if text looks like it could be a phone number (contains digits)
    if (/\d/.test(text)) {
      ctaElements.push({
        type: 'phone_cta',
        text: text,
        element: $el.get(0)?.tagName?.toLowerCase() || 'span',
        attributes: {
          class: $el.attr('class') || ''
        }
      });
    }
  });

  // Strategy 9: Common CTA text patterns (language agnostic - English only for universal patterns)
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

      const element = $el.get(0);
      const tagName = (element && 'tagName' in element) ? element.tagName?.toLowerCase() : 'span';
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

  // Strategy 10: Forms (potential CTAs) - Enhanced WordPress and captcha detection
  $('form').each((_, el) => {
    const $el = $(el);

    // Skip cookie banner forms
    if (isInCookieBanner($el)) {
      return;
    }

    const formId = $el.attr('id') || $el.attr('class') || 'form';
    const formClasses = $el.attr('class') || '';

    // Enhanced WordPress form button detection
    let submitButton = $el.find('input[type="submit"]').first();
    
    if (!submitButton.length) {
      submitButton = $el.find('button[type="submit"]').first();
    }
    
    if (!submitButton.length) {
      // WordPress block buttons
      submitButton = $el.find('.wp-block-button__link, .wp-element-button').first();
    }
    
    if (!submitButton.length) {
      // WordPress plugin form buttons
      submitButton = $el.find('.wpcf7-submit, .wpforms-submit, .gform_button, .button, .btn').first();
    }
    
    if (!submitButton.length) {
      // Any button in form
      submitButton = $el.find('button').first();
    }

    // Extract form text from multiple sources
    let formText = submitButton.attr('value') || 
                   submitButton.text().trim() ||
                   $el.attr('aria-label') ||
                   $el.find('legend, h1, h2, h3, h4').first().text().trim() ||
                   'Form submission';

    // Detect captcha in form
    const hasCaptcha = $el.find('[class*="turnstile"], [class*="recaptcha"], [class*="g-recaptcha"], [class*="h-captcha"], [class*="hcaptcha"], [class*="captcha"], [data-sitekey], [data-captcha], .cf-turnstile').length > 0;
    
    // Detect form type
    let formType = 'form';
    if (formClasses.includes('wpcf7') || formId.includes('wpcf7')) {
      formType = 'contact_form_7';
    } else if (formClasses.includes('wpforms') || formId.includes('wpforms')) {
      formType = 'wpforms';
    } else if (formClasses.includes('gform') || formId.includes('gform')) {
      formType = 'gravity_forms';
    } else if (formClasses.includes('elementor') || formId.includes('elementor')) {
      formType = 'elementor_form';
    } else if (formClasses.includes('ninja-forms') || formId.includes('ninja')) {
      formType = 'ninja_forms';
    } else if (formClasses.includes('formidable') || formId.includes('frm')) {
      formType = 'formidable_forms';
    }

    ctaElements.push({
      type: hasCaptcha ? `${formType}_with_captcha` : formType,
      text: formText,
      element: 'form',
      attributes: {
        class: formClasses,
        id: $el.attr('id') || '',
        action: $el.attr('action') || '',
        captcha: hasCaptcha ? 'detected' : 'none'
      }
    });
  });

  // Strategy 11: WordPress and general form wrapper blocks - Enhanced detection
  console.log(`[CTA Extractor] Strategy 11: Checking WordPress form wrappers...`);
  const wpForms = $('.wp-block-contact-form, .wpforms-container, .wpforms-form, .gform_wrapper, .wpcf7, .wpcf7-form, .elementor-form, .nf-form-cont, .frm_forms, [class*="wp-block-"] form, .wp-block-contact-form-7-contact-form-selector, [class*="form-wrapper"], [class*="contact-form"], [id*="contact-form"]');
  console.log(`[CTA Extractor] Found ${wpForms.length} potential WordPress forms`);
  
  wpForms.each((_, el) => {
    const $el = $(el);

    const wrapperClasses = $el.attr('class') || '';
    const wrapperId = $el.attr('id') || '';
    
    // Skip cookie banner forms
    if (isInCookieBanner($el)) {
      return;
    }

    // Find the actual form element inside wrapper
    const formElement = $el.is('form') ? $el : $el.find('form').first();
    if (!formElement.length) {
      return;
    }
    
    // Universal submit button detection with expanded selectors
    let submitButton = formElement.find('input[type="submit"]').first();

    if (!submitButton.length) {
      submitButton = formElement.find('button[type="submit"]').first();
    }

    if (!submitButton.length) {
      submitButton = formElement.find('.wp-block-button__link, .wp-element-button').first();
    }

    if (!submitButton.length) {
      // WordPress plugin-specific submit buttons
      submitButton = formElement.find('.wpcf7-submit, .wpforms-submit, .gform_button, .elementor-button, .nf-element-submit, .frm_button_submit').first();
    }

    if (!submitButton.length) {
      // Generic button/submit classes
      submitButton = formElement.find('.button, .btn, [type="button"], button').first();
    }

    // Extract form text from multiple sources
    let formText = '';

    // Priority 1: Submit button value/text
    formText = submitButton.attr('value') || submitButton.text().trim();

    // Priority 2: Form aria-label
    if (!formText) {
      formText = formElement.attr('aria-label') || '';
    }

    // Priority 3: Wrapper aria-label or title
    if (!formText) {
      formText = $el.attr('aria-label') || $el.attr('title') || '';
    }

    // Priority 4: Form legend or heading
    if (!formText) {
      const legend = formElement.find('legend, h1, h2, h3, h4, h5').first().text().trim();
      formText = legend;
    }

    // Priority 5: Form name attribute
    if (!formText) {
      formText = formElement.attr('name') || '';
    }

    // Priority 6: Default based on form type
    if (!formText) {
      const tempClasses = $el.attr('class') || '';
      if (tempClasses.includes('contact')) {
        formText = 'Contact Form';
      } else if (tempClasses.includes('subscribe') || tempClasses.includes('newsletter')) {
        formText = 'Subscribe Form';
      } else {
        formText = 'Form';
      }
    }

    // Detect form type based on wrapper classes (using variables from top of function)
    let formType = 'wp_form';
    
    if (wrapperClasses.includes('wpcf7') || wrapperId.includes('wpcf7') || wrapperClasses.includes('wp-block-contact-form-7')) {
      formType = 'contact_form_7';
    } else if (wrapperClasses.includes('wpforms') || wrapperId.includes('wpforms')) {
      formType = 'wpforms';
    } else if (wrapperClasses.includes('gform') || wrapperId.includes('gform')) {
      formType = 'gravity_forms';
    } else if (wrapperClasses.includes('elementor-form') || wrapperId.includes('elementor')) {
      formType = 'elementor_form';
    } else if (wrapperClasses.includes('nf-form') || wrapperId.includes('ninja-forms')) {
      formType = 'ninja_forms';
    } else if (wrapperClasses.includes('frm_forms') || wrapperId.includes('frm') || wrapperClasses.includes('formidable')) {
      formType = 'formidable_forms';
    } else if (wrapperClasses.includes('wp-block-contact-form')) {
      formType = 'wp_block_form';
    }

    // Enhanced CAPTCHA detection with more providers
    const hasCaptcha = formElement.find(`
      [class*="turnstile"], 
      [class*="recaptcha"], 
      [class*="g-recaptcha"], 
      [class*="h-captcha"], 
      [class*="hcaptcha"], 
      [class*="captcha"],
      [class*="cf-turnstile"],
      [data-sitekey], 
      [data-captcha],
      iframe[src*="recaptcha"],
      iframe[src*="hcaptcha"],
      iframe[src*="turnstile"],
      .wpcf7-recaptcha,
      .wpforms-recaptcha,
      .gform_captcha
    `.replace(/\s+/g, ' ').trim()).length > 0;

    ctaElements.push({
      type: hasCaptcha ? `${formType}_with_captcha` : formType,
      text: formText,
      element: 'div',
      attributes: {
        class: wrapperClasses,
        id: wrapperId,
        captcha: hasCaptcha ? 'detected' : 'none',
        formPlugin: formType
      }
    });
  });


  // Strategy 12: Detect embedded forms in iframes (common with third-party forms and captchas)
  $('iframe[src*="form"], iframe[name*="form"], iframe[title*="form"], iframe[src*="survey"], iframe[src*="typeform"], iframe[src*="google.com/forms"], iframe[src*="jotform"]').each((_, el) => {
    const $el = $(el);
    
    // Skip cookie banner iframes
    if (isInCookieBanner($el)) {
      return;
    }
    
    const src = $el.attr('src') || '';
    const title = $el.attr('title') || $el.attr('name') || 'Embedded Form';
    
    ctaElements.push({
      type: 'iframe_form',
      text: title,
      element: 'iframe',
      attributes: {
        src: src,
        title: title
      }
    });
  });

  // Strategy 13: Detect WordPress shortcode comments (forms rendered via shortcodes)
  // These often appear as HTML comments before the actual form renders
  const htmlContent = $.html();
  const shortcodeMatches = htmlContent.match(/\[(?:contact-form-7|wpforms|gravityform|ninja_form|formidable|elementor-template).*?\]/g);
  
  if (shortcodeMatches && shortcodeMatches.length > 0) {
    shortcodeMatches.forEach(shortcode => {
      let formType = 'wp_shortcode_form';
      let formText = 'WordPress Form';
      
      if (shortcode.includes('contact-form-7')) {
        formType = 'contact_form_7_shortcode';
        formText = 'Contact Form 7';
      } else if (shortcode.includes('wpforms')) {
        formType = 'wpforms_shortcode';
        formText = 'WPForms';
      } else if (shortcode.includes('gravityform')) {
        formType = 'gravity_forms_shortcode';
        formText = 'Gravity Forms';
      } else if (shortcode.includes('ninja_form')) {
        formType = 'ninja_forms_shortcode';
        formText = 'Ninja Forms';
      } else if (shortcode.includes('formidable')) {
        formType = 'formidable_forms_shortcode';
        formText = 'Formidable Forms';
      }
      
      // Check if we haven't already detected this form type
      const alreadyDetected = ctaElements.some(cta => 
        cta.type.includes(formType.replace('_shortcode', ''))
      );
      
      if (!alreadyDetected) {
        ctaElements.push({
          type: formType,
          text: formText,
          element: 'shortcode',
          attributes: {
            shortcode: shortcode
          }
        });
      }
    });
  }

  // Remove duplicates based on text and proximity
  // Prioritize form types over button types when deduplicating
  const formTypes = ['form', 'contact_form_7', 'wpforms', 'gravity_forms', 'elementor_form', 'ninja_forms', 'formidable_forms', 'wp_block_form', 'wp_form'];
  const isFormType = (type: string) => formTypes.includes(type) || formTypes.some(ft => type.startsWith(ft + '_with_captcha'));
  
  const uniqueCtaElements = ctaElements.reduce((unique, current) => {
    const existingIndex = unique.findIndex(existing => 
      existing.text.toLowerCase() === current.text.toLowerCase() &&
      Math.abs(existing.text.length - current.text.length) <= 5
    );

    if (existingIndex === -1) {
      // No duplicate found, add it
      unique.push(current);
    } else {
      // Duplicate found - prefer form types over button types
      const existing = unique[existingIndex];
      const currentIsForm = isFormType(current.type);
      const existingIsForm = isFormType(existing.type);
      
      if (currentIsForm && !existingIsForm) {
        // Replace existing button with current form
        unique[existingIndex] = current;
      }
      // Otherwise keep existing (either both are forms, both are buttons, or existing is already a form)
    }

    return unique;
  }, [] as typeof ctaElements);

  return uniqueCtaElements;
}