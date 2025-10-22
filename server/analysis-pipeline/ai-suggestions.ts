/**
 * AI-Powered SEO Suggestions Module
 * Handles generation of page-specific SEO improvement suggestions
 */

import OpenAI from "openai";
import crypto from "crypto";

// the newest OpenAI model is "gpt-4.1" which was released on 14.4.2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache for SEO suggestions to avoid regenerating for similar pages
const seoSuggestionsCache = new Map<string, { suggestions: string[], timestamp: number }>();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * Analyze content intent and user journey stage based on page content and business context
 */
function analyzeContentIntent(pageData: any, siteOverview?: any): {
  intentType: string;
  journeyStage: string;
  businessRelevance: string;
  conversionOpportunities: string[];
} {
  // Use basic content structure analysis instead of hardcoded language patterns
  const contentLength = pageData.paragraphs?.join(' ').length || 0;
  const hasLongContent = contentLength > 2000;
  const hasMultipleHeadings = pageData.headings?.length > 3;
  const hasCtaElements = false; // CTA analysis disabled
  const hasFormElements = false; // CTA analysis disabled

  // Determine content intent based on structure and business context
  let intentType = 'informational';
  if (hasFormElements || hasCtaElements) {
    intentType = 'transactional';
  } else if (hasLongContent && hasMultipleHeadings) {
    intentType = 'educational';
  } else if (siteOverview?.businessType && pageData.url?.includes('contact')) {
    intentType = 'navigational';
  }

  // Determine user journey stage based on page structure
  let journeyStage = 'awareness';
  if (hasFormElements || pageData.url?.includes('contact')) {
    journeyStage = 'decision';
  } else if (hasCtaElements && siteOverview?.mainServices?.length > 0) {
    journeyStage = 'consideration';
  }

  // Analyze business relevance using site overview data
  let businessRelevance = 'general';
  if (siteOverview?.mainServices?.length > 0) {
    businessRelevance = 'core service';
  }

  // Identify conversion opportunities based on content structure and business context
  const conversionOpportunities = [];
  if (intentType === 'educational' && journeyStage === 'awareness') {
    conversionOpportunities.push('Include related service mentions');
    conversionOpportunities.push('Add clear next steps for users');
  }
  if (journeyStage === 'consideration') {
    conversionOpportunities.push('Highlight unique value propositions');
    conversionOpportunities.push('Provide detailed service information');
  }
  if (journeyStage === 'decision') {
    conversionOpportunities.push('Strengthen trust signals and testimonials');
    conversionOpportunities.push('Provide clear contact information');
  }

  return {
    intentType,
    journeyStage,
    businessRelevance,
    conversionOpportunities
  };
}

/**
 * Generate SEO improvement suggestions using OpenAI
 * @param url URL of the page being analyzed
 * @param pageData Extracted SEO data from the page
 * @param siteStructure Optional site structure data for internal linking suggestions
 * @param siteOverview Business context and site analysis from overview
 * @returns Array of improvement suggestions
 */
export async function generateSeoSuggestions(url: string, pageData: any, siteStructure?: {
  allPages: Array<{
    url: string;
    title?: string;
    headings: Array<{ level: number; text: string }>;
  }>;
}, siteOverview?: {
  businessType: string;
  industry: string;
  targetAudience: string;
  mainServices: string[];
  location?: string;
}, additionalInfo?: string): Promise<string[]> {
  // Manual constant to force refresh of SEO suggestions cache
  const forceRefresh = true;
  try {
    // If no OpenAI API key is set, return empty suggestions
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping AI suggestions");
      return [];
    }

    // Create cache key based on page content fingerprint and URL
    const contentFingerprint = crypto.createHash('md5')
      .update(JSON.stringify({
        url: url, // Include URL to avoid cross-page caching
        title: pageData.title,
        metaDescription: pageData.metaDescription,
        headings: pageData.headings.slice(0, 3), // First 3 headings
        firstParagraph: pageData.paragraphs?.[0]?.substring(0, 200) || '',
        issues: pageData.issues.map((i: any) => i.category).sort(),
        timestamp: Math.floor(Date.now() / (1000 * 60 * 60)) // Cache per hour
      }))
      .digest('hex');

    // Consistent cache checking approach
    if (!forceRefresh) {
      const cached = seoSuggestionsCache.get(contentFingerprint);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`Using cached SEO suggestions for ${url}`);
        return cached.suggestions;
      }
    } else {
      console.log(`Force refresh enabled, skipping cache for ${url}`);
    }

    // Simple keyword extraction for content context (language-agnostic)
    const extractKeywords = (text: string): string[] => {
      if (!text) return [];

      // Extract words without language-specific filtering
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3); // Only filter by length

      const wordFreq = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
    };

    // Analyze page content for keywords with enhanced context
    const pageContent = [
      pageData.title || '',
      pageData.metaDescription || '',
      pageData.headings.map((h: any) => h.text).join(' '),
      ...(pageData.paragraphs || [])
    ].join(' ');

    const extractedKeywords = extractKeywords(pageContent);

    // Analyze content intent and business alignment
    const contentIntent = analyzeContentIntent(pageData, siteOverview);

    // Use AI-generated business context from site overview analysis
    const businessContext = siteOverview ? {
      industry: siteOverview.industry,
      businessType: siteOverview.businessType,
      targetAudience: siteOverview.targetAudience,
      mainServices: siteOverview.mainServices,
      isLocal: !!siteOverview.location,
      location: siteOverview.location,
      contentType: pageData.paragraphs && pageData.paragraphs.length > 8 ? 'Long-form content' : 'Short-form content'
    } : {
      industry: 'Unknown',
      businessType: 'Unknown',
      targetAudience: 'Unknown',
      mainServices: [],
      isLocal: false,
      location: undefined,
      contentType: pageData.paragraphs && pageData.paragraphs.length > 8 ? 'Long-form content' : 'Short-form content'
    };

    // Analyze existing internal links quality (optimized)
    const existingLinksAnalysis = pageData.internalLinks && pageData.internalLinks.length > 0 ? `
      Internal Links (${pageData.internalLinks.length} found):
      ${pageData.internalLinks.slice(0, 5).map((link: any) => {
        const linkText = link.text || 'No anchor text';
        const hasKeywords = extractedKeywords.some(keyword => 
          linkText.toLowerCase().includes(keyword.toLowerCase())
        );
        const linkLength = linkText.length;
        const quality = hasKeywords ? 'Keyword-rich' : linkLength > 50 ? 'Descriptive' : linkLength < 10 ? 'Short' : 'Neutral';
        return `- "${linkText}" (${quality})`;
      }).join('\n')}${pageData.internalLinks.length > 5 ? `\n  +${pageData.internalLinks.length - 5} more links` : ''}
    ` : '';

    const pageUrl = url;
    // Build optimized site structure information with better page display
    const internalLinkingOpportunities = siteStructure ? `
      Site Structure (${siteStructure.allPages.length} pages):
      Internal Link Opportunities:
      ${siteStructure.allPages
        .filter(page => page.url !== url)
        .map((page: any) => {
          const pageKeywords = extractKeywords([page.title || '', page.headings.find((h: any) => h.level === 1)?.text || ''].join(' '));
          const commonKeywords = extractedKeywords.filter(keyword => pageKeywords.includes(keyword));
          const isAlreadyLinked = pageData.internalLinks?.some((link: any) => link.href.includes(page.url)) || false;
          return { page, relevanceScore: commonKeywords.length, commonKeywords, isAlreadyLinked };
        })
        .filter(item => item.relevanceScore > 0)
        .sort((a: any, b: any) => {
          if (a.isAlreadyLinked && !b.isAlreadyLinked) return 1;
          if (!a.isAlreadyLinked && b.isAlreadyLinked) return -1;
          return b.relevanceScore - a.relevanceScore;
        })
        .slice(0, 6)
        .map(item => `- "${item.page.title || 'Untitled'}" (${item.page.url}) - Related topics: ${item.commonKeywords.slice(0, 3).join(', ')} ${item.isAlreadyLinked ? '[Already linked]' : '[Link opportunity]'}`)
        .join('\n')}

      Available pages for internal linking:
      ${siteStructure.allPages.filter(p => p.url !== pageUrl).map(page => 
  `      - "${page.title || 'Untitled'}" (${page.url})`
).join('\n')}${siteStructure.allPages.length > 9 ? `\n  +${siteStructure.allPages.length - 9} more pages available` : ''}
    ` : '';

    // Debug: Log CTA elements for troubleshooting
    console.log(`CTA Elements for ${pageUrl}:`, pageData.ctaElements ? pageData.ctaElements.length : 'undefined');

    // Analyze paragraph content quality
    const paragraphAnalysis = pageData.paragraphs && pageData.paragraphs.length > 0 ? `
      Content Structure Analysis:
      - Total paragraphs: ${pageData.paragraphs.length}
      - Average paragraph length: ~${Math.round(pageData.paragraphs.reduce((sum: number, p: string) => sum + p.length, 0) / pageData.paragraphs.length)} chars
      - Short paragraphs (<50 chars): ${pageData.paragraphs.filter((p: string) => p.length < 50).length}
      - Long paragraphs (>500 chars): ${pageData.paragraphs.filter((p: string) => p.length > 500).length}
      - Content readability: ${pageData.paragraphs.length > 8 ? 'Long-form content' : 'Short-form content'}
    ` : 'Content Structure: No paragraph content found';

    // Build enhanced prompt with content quality metrics
    const seoIssuesList = pageData.issues.map((issue: any) => `${issue.title} (${issue.severity})`).join(', ') || 'No major issues found';

    const contentQuality = pageData.contentMetrics ? `
CONTENT QUALITY:
- Words: ${pageData.contentMetrics.wordCount}
- Readability: ${pageData.contentMetrics.readabilityScore}/100
- Avg words/sentence: ${pageData.contentMetrics.averageWordsPerSentence}
- Content depth: ${pageData.contentMetrics.contentDepthScore}/100
- Top keywords: ${pageData.contentMetrics.keywordDensity?.slice(0, 5).map((k: any) => `${k.keyword}(${k.density.toFixed(1)}%)`).join(', ') || 'None'}
- Semantic phrases: ${pageData.contentMetrics.semanticKeywords?.slice(0, 5).join(', ') || 'None'}
` : '';

    // Extract and organize heading structure
    const headingStructure = pageData.headings && pageData.headings.length > 0 ? `
HEADING STRUCTURE:
H1 Headings (${pageData.headings.filter((h: any) => h.level === 1).length}):
${pageData.headings.filter((h: any) => h.level === 1).map((h: any) => `- "${h.text}"`).join('\n') || '- No H1 headings found'}

H2 Headings (${pageData.headings.filter((h: any) => h.level === 2).length}):
${pageData.headings.filter((h: any) => h.level === 2).map((h: any) => `- "${h.text}"`).join('\n') || '- No H2 headings found'}

H3 Headings (${pageData.headings.filter((h: any) => h.level === 3).length}):
${pageData.headings.filter((h: any) => h.level === 3).map((h: any) => `- "${h.text}"`).join('\n') || '- No H3 headings found'}

All Headings Overview: ${pageData.headings.map((h: any) => `H${h.level}: "${h.text}"`).join(' | ')}
` : `
HEADING STRUCTURE:
- No headings found on this page
`;

    // Include up to 5 paragraphs for better context (max 1000 chars each)
    const paragraphContent = pageData.paragraphs && pageData.paragraphs.length > 0 ? `
PARAGRAPH CONTENT (for context):
${pageData.paragraphs.slice(0, 10).map((paragraph: string, index: number) => {
  const truncatedParagraph = paragraph.length > 1000 ? paragraph.substring(0, 1000) + '...' : paragraph;
  return `Paragraph ${index + 1}: ${truncatedParagraph}`;
}).join('\n\n')}
` : 'PARAGRAPH CONTENT: No paragraph content available';

    // Filter out CTA elements with empty text
    const ctaElementsWithText = pageData.ctaElements ? pageData.ctaElements.filter((cta: any) => cta.text && cta.text.trim() !== '') : [];

    // Debug: Log filtering results
    console.log(`Original CTA elements: ${pageData.ctaElements ? pageData.ctaElements.length : 0}`);
    console.log(`CTA elements with text: ${ctaElementsWithText.length}`);


    // Analyze CTA elements on the page
    const ctaAnalysis = ctaElementsWithText && ctaElementsWithText.length > 0 ? `
CTA ELEMENTS ANALYSIS:
Total CTA elements with text: ${ctaElementsWithText.length}

Button-like Links (${ctaElementsWithText.filter((cta: any) => cta.type === 'link_button').length}):
${ctaElementsWithText.filter((cta: any) => cta.type === 'link_button').map((cta: any) => 
  `- "${cta.text}"`
).join('\n') || '- No button-like links found'}

Input Buttons (${ctaElementsWithText.filter((cta: any) => cta.type === 'input_button').length}):
${ctaElementsWithText.filter((cta: any) => cta.type === 'input_button').map((cta: any) => 
  `- "${cta.text}"`
).join('\n') || '- No input buttons found'}

Regular Buttons (${ctaElementsWithText.filter((cta: any) => cta.type === 'button').length}):
${ctaElementsWithText.filter((cta: any) => cta.type === 'button').map((cta: any) => 
  `- "${cta.text}"`
).join('\n') || '- No buttons with text found'}

Forms (${ctaElementsWithText.filter((cta: any) => cta.type === 'form').length}):
${ctaElementsWithText.filter((cta: any) => cta.type === 'form').map((cta: any) => 
  `- ${cta.text}`
).join('\n') || '- No forms found'}

CTA Quality Assessment:
- Average CTA text length: ${ctaElementsWithText.length > 0 ? Math.round(ctaElementsWithText.reduce((sum: number, cta: any) => sum + cta.text.length, 0) / ctaElementsWithText.length) : 0} characters
- Total actionable CTAs found: ${ctaElementsWithText.length}
` : `
CTA ELEMENTS ANALYSIS:
- No CTA elements with text found on this page
- This may indicate missing conversion opportunities or navigation buttons without descriptive text
`;

    const additionalInfoSection = additionalInfo ? `
ADDITIONAL BUSINESS CONTEXT: ${additionalInfo}
` : '';

    const prompt = `Analyze this webpage and provide 8-12 specific SEO improvements focused on content optimization.

PAGE: ${url}
Title: "${pageData.title || 'MISSING'}" (${pageData.title?.length || 0} chars)
Meta: "${pageData.metaDescription || 'MISSING'}" (${pageData.metaDescription?.length || 0} chars)
H1: "${pageData.headings.find((h: any) => h.level === 1)?.text || 'MISSING'}"
Content: ~${pageContent.split(/\s+/).length} words, ${pageData.paragraphs?.length || 0} paragraphs
Images: ${pageData.images?.length || 0} total (${pageData.images?.filter((img: any) => !img.alt).length || 0} missing alt)
Links: ${pageData.internalLinks?.length || 0} internal
Keywords: ${pageData.contentMetrics?.keywordDensity?.slice(0, 5).map((k: any) => k.keyword).join(', ') || 'None'}
CTAs: ${pageData.ctaElements ? pageData.ctaElements.length : 0} total (${pageData.ctaElements ? pageData.ctaElements.filter((cta: any) => cta.type === 'button' || cta.type === 'input_button' || cta.type === 'link_button').length : 0} buttons, ${pageData.ctaElements ? pageData.ctaElements.filter((cta: any) => cta.type === 'form').length : 0} forms)
HEADING STRUCTURE:
${contentQuality}${headingStructure}
ISSUES: ${seoIssuesList}

${siteOverview && siteOverview.industry !== 'Unknown' ? `
BUSINESS: ${siteOverview.industry} | ${siteOverview.businessType} | Target: ${siteOverview.targetAudience}
Services: ${siteOverview.mainServices.slice(0, 3).join(', ') || 'General'}${siteOverview.location ? ` | Location: ${siteOverview.location}` : ''}
` : ''}
${additionalInfoSection}
${internalLinkingOpportunities}
${ctaAnalysis}

${paragraphContent}
Provide specific, actionable improvements focusing on:
- Content quality optimization (readability, depth, semantic richness)
- Title/meta optimization with exact character counts
- Content structure and keyword integration
- Semantic keyword opportunities and topic clustering
- Internal linking with semantic relevance
- CTA optimization (button text, placement, conversion opportunities)
- Business-relevant content gaps and opportunities

Include specific examples, character counts, exact recommendations, and CTA improvements.
Respond in JSON: {"suggestions": ["suggestion 1", "suggestion 2", ...]}`;

    console.log(`Generating SEO suggestions for: ${url}`);
    
    // Retry mechanism with exponential backoff
    const maxRetries = 3;
    let response: any = null;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);

        response = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            { 
              role: "system", 
              content: "You are an expert SEO consultant. Provide specific, actionable suggestions with concrete examples. Always include exact character counts for titles/descriptions, specific keywords to target, and exact URLs for internal linking recommendations. Be detailed and specific, not generic. Respond in valid JSON format with proper escaping of quotes and special characters. CRITICAL: Escape all quotes and newlines in your suggestions. IMPORTANT: Write all suggestions in the EXACT same language as the page content above. Look at the title, headings, and paragraph content to determine the language, then write your suggestions in that same language. Match the language of the page content exactly."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.4,
          max_completion_tokens: 2000
        });

        // If we get here, the request succeeded
        break;

      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt} failed for ${url}:`, error);

        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Check if response was truncated
    if (response && response.choices[0].finish_reason === 'length') {
      console.warn(`Response was truncated for ${url} - may need to increase max_completion_tokens`);
    }

    if (!response) {
      console.error(`All ${maxRetries} attempts failed for ${url}. Last error:`, lastError);
      return [];
    }

    const content = response.choices[0].message.content;
    if (!content) {
      console.error(`No content returned from OpenAI for ${url}`);
      return [];
    }

    // Validate and clean content before parsing
    const trimmedContent = content.trim();
    if (!trimmedContent.startsWith('{')) {
      console.error(`Invalid JSON response for ${url}:`, trimmedContent.substring(0, 200));
      return [];
    }

    let result;
    try {
      result = JSON.parse(trimmedContent);
    } catch (parseError) {
      // Try to fix common JSON issues
      console.warn(`Initial JSON parse failed for ${url}, attempting cleanup...`);
      
      try {
        // Remove any trailing commas, fix common escaping issues
        const cleanedContent = trimmedContent
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/\n/g, '\\n') // Escape newlines in strings
          .replace(/\r/g, '\\r') // Escape carriage returns
          .replace(/\t/g, '\\t'); // Escape tabs
        
        result = JSON.parse(cleanedContent);
        console.log(`Successfully parsed JSON after cleanup for ${url}`);
      } catch (cleanupError) {
        console.error(`Failed to parse JSON even after cleanup for ${url}:`, parseError);
        console.error(`Content preview (first 500 chars):`, trimmedContent.substring(0, 500));
        console.error(`Content preview (last 200 chars):`, trimmedContent.substring(Math.max(0, trimmedContent.length - 200)));
        return [];
      }
    }

    const suggestions = result.suggestions || [];
    if (!Array.isArray(suggestions)) {
      console.error(`Invalid suggestions format for ${url}:`, typeof suggestions);
      return [];
    }

    // Cache successful result
    seoSuggestionsCache.set(contentFingerprint, {
      suggestions,
      timestamp: Date.now()
    });

    console.log(`Generated ${suggestions.length} SEO suggestions for ${url}`);
    return suggestions;

  } catch (error) {
    console.error(`Error generating SEO suggestions for ${url}:`, error);
    return [];
  }
}