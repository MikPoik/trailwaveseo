/**
 * Basic SEO Elements Extractor
 * Handles extraction of title, meta tags, canonical, structured data, etc.
 */

import * as cheerio from 'cheerio';

export function extractBasicSeoElements($: cheerio.CheerioAPI, url: string) {
  // Extract meta tags for SEO analysis
  const metaTags = $('meta').map((_, el) => ({
    name: $(el).attr('name') || $(el).attr('property') || $(el).attr('http-equiv'),
    content: $(el).attr('content')
  })).get().filter(tag => tag.name && tag.content);

  // Extract meta description
  const metaDescription = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';

  // Extract robots meta
  const robotsMeta = $('meta[name="robots"]').attr('content') || null;

  // Extract canonical URL
  const canonical = $('link[rel="canonical"]').attr('href') || null;

  // Check for JSON-LD structured data
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const hasJsonLd = jsonLdScripts.length > 0;

  // Extract JSON-LD data for analysis
  const structuredData: any[] = [];
  jsonLdScripts.each((_, script) => {
    try {
      const jsonContent = $(script).html();
      if (jsonContent) {
        const parsedData = JSON.parse(jsonContent);
        structuredData.push(parsedData);
      }
    } catch (error) {
      // Invalid JSON-LD, skip
      console.warn(`Invalid JSON-LD found on ${url}:`, error);
    }
  });

  return {
    title: $('title').text().trim(),
    metaDescription,
    metaKeywords: $('meta[name="keywords"]').attr('content') || null,
    metaKeywordsArray: $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || null,
    canonical,
    robotsMeta,
    metaTags,
    hasJsonLd,
    structuredData
  };
}