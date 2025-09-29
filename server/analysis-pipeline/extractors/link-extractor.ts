/**
 * Link Elements Extractor
 * Handles extraction of internal and external links
 */

import * as cheerio from 'cheerio';

export function extractLinkElements($: cheerio.CheerioAPI, url: string, settings: any) {
  const internalLinks: Array<{ href: string; text: string; title?: string }> = [];
  const externalLinks: Array<{ href: string; text: string; title?: string }> = [];

  if (settings.analyzeLinkStructure) {
    const urlObj = new URL(url);
    const baseDomain = urlObj.hostname;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const linkText = $(el).text().trim();
      const title = $(el).attr('title');

      if (href && linkText) {
        try {
          let fullUrl: string;
          let isInternal = false;

          if (href.startsWith('http')) {
            const linkUrlObj = new URL(href);
            isInternal = linkUrlObj.hostname === baseDomain;
            fullUrl = href;
          } else if (href.startsWith('/') || !href.includes('://')) {
            // Relative URL - make it absolute and mark as internal
            fullUrl = new URL(href, url).toString();
            isInternal = true;
          } else {
            return; // Skip other protocols
          }

          // Skip anchor links to the same page
          if (isInternal) {
            const linkUrl = new URL(fullUrl);
            if (linkUrl.pathname === urlObj.pathname && linkUrl.search === urlObj.search) {
              return;
            }

            internalLinks.push({
              href: fullUrl,
              text: linkText,
              title: title || undefined
            });
          } else if (settings.followExternalLinks) {
            externalLinks.push({
              href: fullUrl,
              text: linkText,
              title: title || undefined
            });
          }
        } catch (error) {
          console.warn(`Skipping malformed URL: ${href} on page ${url}`);
        }
      }
    });
  }

  return {
    internalLinks,
    externalLinks
  };
}