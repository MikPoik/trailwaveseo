/**
 * SEO Issues Detector
 * Detect SEO issues on the page
 */

import { SeoIssue, SeoCategory } from '../../../client/src/lib/types.js';

export async function detectSeoIssues(
  basicElements: any,
  contentElements: any,
  contentQuality: any
): Promise<SeoIssue[]> {

  const issues: SeoIssue[] = [];
  const { title, metaDescription, headings, images, metaTags, robotsMeta, canonical, hasJsonLd, structuredData } = { ...basicElements, ...contentElements };

  // Title analysis
  if (!title || title.length === 0) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'critical',
      title: 'Missing Title Tag',
      description: 'This page is missing a title tag, which is crucial for SEO.'
    });
  } else if (title.length < 30) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Short Title Tag',
      description: `Title tag is only ${title.length} characters long.`
    });
  } else if (title.length > 60) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Long Title Tag',
      description: `Title tag is ${title.length} characters long and may be truncated.`
    });
  }

  // Meta description analysis
  if (!metaDescription) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Missing Meta Description',
      description: 'This page is missing a meta description.'
    });
  } else if (metaDescription.length < 120) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'info',
      title: 'Short Meta Description',
      description: `Meta description is only ${metaDescription.length} characters long.`
    });
  } else if (metaDescription.length > 160) {
    issues.push({
      category: 'meta' as SeoCategory,
      severity: 'warning',
      title: 'Long Meta Description',
      description: `Meta description is ${metaDescription.length} characters long.`
    });
  }

  // Heading analysis
  const h1Count = headings.filter((h: any) => h.level === 1).length;
  if (h1Count === 0) {
    issues.push({
      category: 'headings' as SeoCategory,
      severity: 'critical',
      title: 'Missing H1 Tag',
      description: 'This page is missing an H1 heading tag.'
    });
  } else if (h1Count > 1) {
    issues.push({
      category: 'headings' as SeoCategory,
      severity: 'warning',
      title: 'Multiple H1 Tags',
      description: `Found ${h1Count} H1 tags on this page.`
    });
  }

  // Image analysis
  const imagesWithoutAlt = images.filter((img: any) => !img.alt);
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      category: 'images' as SeoCategory,
      severity: 'warning',
      title: 'Images Without Alt Text',
      description: `${imagesWithoutAlt.length} images are missing alt text.`
    });
  }

  // Content quality issues
  if (contentQuality.wordCount < 300) {
    issues.push({
      category: 'content' as SeoCategory,
      severity: 'warning',
      title: 'Low Content Volume',
      description: `Page has only ${contentQuality.wordCount} words.`
    });
  }

  // JSON-LD analysis
  if (!hasJsonLd) {
    issues.push({
      category: 'structured-data' as SeoCategory,
      severity: 'warning',
      title: 'Missing JSON-LD',
      description: 'This page does not have JSON-LD structured data, which can improve search engine understanding.'
    });
  } else if (structuredData && structuredData.length > 0) {
    const hasOrganizationSchema = structuredData.some((data: any) => data['@type'] === 'Organization');
    const hasLocalBusinessSchema = structuredData.some((data: any) => Array.isArray(data['@type']) ? data['@type'].includes('LocalBusiness') : data['@type'] === 'LocalBusiness');
    const hasProductSchema = structuredData.some((data: any) => data['@type'] === 'Product');

    if (!hasOrganizationSchema && !hasLocalBusinessSchema && !hasProductSchema) {
      issues.push({
        category: 'structured-data' as SeoCategory,
        severity: 'info',
        title: 'JSON-LD Schema Type Not Recognized',
        description: 'The detected JSON-LD schema type is not one of the commonly recognized types (Organization, LocalBusiness, Product).'
      });
    }
  }

  return issues;
}