import OpenAI from "openai";
import axios from "axios";
import crypto from "crypto";

// Using gpt-4o as the OpenAI model for better reliability
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache for storing generated alt text to avoid regenerating for the same images
const altTextCache = new Map<string, string>();

// Cache for SEO suggestions to avoid regenerating for similar pages
const seoSuggestionsCache = new Map<string, { suggestions: string[], timestamp: number }>();

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
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// Define interface for content duplication analysis results
export interface DuplicateItem {
  content: string;
  urls: string[];
  similarityScore: number;
  impactLevel?: 'Critical' | 'High' | 'Medium' | 'Low';
  priority?: number; // 1-5, where 1 is most urgent
  rootCause?: string;
  improvementStrategy?: string;
}

export interface ContentDuplicationAnalysis {
  titleRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
    duplicateGroups: DuplicateItem[];
  };
  descriptionRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
    duplicateGroups: DuplicateItem[];
  };
  headingRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
    duplicateGroups: DuplicateItem[];
    byLevel: {
      h1: DuplicateItem[];
      h2: DuplicateItem[];
      h3: DuplicateItem[];
      h4: DuplicateItem[];
      h5: DuplicateItem[];
      h6: DuplicateItem[];
    };
  };
  paragraphRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
    duplicateGroups: DuplicateItem[];
  };
  overallRecommendations: string[];
}

/**
 * Analyze site overview to detect business context and provide general insights
 * @param siteStructure Site structure with all pages
 * @param additionalInfo Additional business context provided by user
 * @returns Business context and site overview analysis
 */
export async function analyzeSiteOverview(siteStructure: {
  allPages: Array<{
    url: string;
    title?: string;
    headings: Array<{ level: number; text: string }>;
    metaDescription?: string;
    paragraphs?: string[];
  }>;
}, additionalInfo?: string): Promise<{
  businessType: string;
  industry: string;
  targetAudience: string;
  mainServices: string[];
  location?: string;
  siteStructureAnalysis: string;
  contentStrategy: string[];
  overallRecommendations: string[];
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping site overview analysis");
      return {
        businessType: 'Unknown',
        industry: 'Unknown',
        targetAudience: 'Unknown',
        mainServices: [],
        siteStructureAnalysis: 'Analysis unavailable',
        contentStrategy: [],
        overallRecommendations: []
      };
    }

    // Prepare site overview data
    const siteOverview = siteStructure.allPages.map(page => ({
      url: page.url,
      title: page.title || 'Untitled',
      h1: page.headings.find(h => h.level === 1)?.text || 'No H1',
      metaDescription: page.metaDescription || 'No description',
      contentSample: page.paragraphs ? page.paragraphs.slice(0, 2).join(' ').substring(0, 300) : 'No content'
    }));

    const prompt = `Analyze this website's overall structure and content to provide comprehensive business context.

SITE OVERVIEW (${siteStructure.allPages.length} pages):
${siteOverview.map(page => `
URL: ${page.url}
Title: ${page.title}
H1: ${page.h1}
Meta: ${page.metaDescription}
Content: ${page.contentSample}
---`).join('\n')}

${additionalInfo ? `Additional Business Context: ${additionalInfo}` : ''}

Please analyze and provide:
1. Business type and industry classification
2. Target audience analysis
3. Main services/products offered
4. Geographic location (if any)
5. Site structure analysis (navigation, content organization)
6. Content strategy recommendations
7. Overall SEO improvement priorities

Respond in JSON format:
{
  "businessType": "string",
  "industry": "string", 
  "targetAudience": "string",
  "mainServices": ["service1", "service2"],
  "location": "string or null",
  "siteStructureAnalysis": "detailed analysis string",
  "contentStrategy": ["strategy1", "strategy2"],
  "overallRecommendations": ["recommendation1", "recommendation2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { 
          role: "system", 
          content: "You are an expert business analyst and SEO consultant. Analyze website structure and content to provide accurate business context and strategic recommendations. Always respond in JSON format."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }

    const result = JSON.parse(content);

    return {
      businessType: result.businessType || 'Unknown',
      industry: result.industry || 'Unknown', 
      targetAudience: result.targetAudience || 'Unknown',
      mainServices: result.mainServices || [],
      location: result.location || undefined,
      siteStructureAnalysis: result.siteStructureAnalysis || 'Analysis unavailable',
      contentStrategy: result.contentStrategy || [],
      overallRecommendations: result.overallRecommendations || []
    };
  } catch (error) {
    console.error("Error analyzing site overview with OpenAI:", error);
    return {
      businessType: 'Unknown',
      industry: 'Unknown',
      targetAudience: 'Unknown', 
      mainServices: [],
      siteStructureAnalysis: 'Analysis unavailable',
      contentStrategy: [],
      overallRecommendations: []
    };
  }
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
        issues: pageData.issues.map(i => i.category).sort(),
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
      ${pageData.internalLinks.slice(0, 5).map(link => {
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
        .map(page => {
          const pageKeywords = extractKeywords([page.title || '', page.headings.find(h => h.level === 1)?.text || ''].join(' '));
          const commonKeywords = extractedKeywords.filter(keyword => pageKeywords.includes(keyword));
          const isAlreadyLinked = pageData.internalLinks?.some(link => link.href.includes(page.url)) || false;
          return { page, relevanceScore: commonKeywords.length, commonKeywords, isAlreadyLinked };
        })
        .filter(item => item.relevanceScore > 0)
        .sort((a, b) => {
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
- Top keywords: ${pageData.contentMetrics.keywordDensity?.slice(0, 5).map(k => `${k.keyword}(${k.density.toFixed(1)}%)`).join(', ') || 'None'}
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
    if (ctaElementsWithText.length > 0) {
      console.log('CTA elements with text:', ctaElementsWithText.map(cta => `${cta.type}: "${cta.text}"`));
    }

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
Keywords: ${pageData.contentMetrics?.keywordDensity?.slice(0, 5).map(k => k.keyword).join(', ') || 'None'}
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
    //console.log(`Prompt: ${prompt}`);
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
              content: "You are an expert SEO consultant. Provide specific, actionable suggestions with concrete examples. Always include exact character counts for titles/descriptions, specific keywords to target, and exact URLs for internal linking recommendations. Be detailed and specific, not generic. Respond in valid JSON format with proper escaping of quotes and special characters. Write in the same language as the website's content is."
            },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.4,
          max_tokens: 1500
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

    if (!response) {
      console.error(`All ${maxRetries} attempts failed for ${url}. Last error:`, lastError);
      return [];
    }

    const content = response.choices[0].message.content;
    if (!content) {
      console.error(`No content returned from OpenAI for ${url}`);
      return [];
    }

    // Validate that content looks like JSON before parsing
    const trimmedContent = content.trim();
    if (!trimmedContent.startsWith('{') || (!trimmedContent.endsWith('}') && !trimmedContent.endsWith(']'))) {
      console.error(`OpenAI response for ${url} doesn't appear to be valid JSON. Content: ${trimmedContent.substring(0, 200)}...`);
      return [];
    }

    console.log(`OpenAI response for ${url}:`, content.substring(0, 500) + '...');

    // Enhanced JSON parsing with retry logic and fallback
    let suggestions: string[] = [];
    try {
      // First attempt to parse the response as-is
      const result = JSON.parse(content);

      if (result?.suggestions && Array.isArray(result.suggestions)) {
        suggestions = result.suggestions.filter(s => typeof s === 'string' && s.trim().length > 0);
      } else {
        console.error(`Invalid response format for ${url}. Expected: {"suggestions": [...]}`);
        return [];
      }
    } catch (parseError) {
      console.error(`Failed to parse OpenAI response for ${url}:`, parseError);

      // Try to fix common JSON issues and retry parsing
      try {
        // Remove any trailing commas and fix incomplete JSON
        let fixedContent = content.trim();

        // Remove trailing comma before closing brace/bracket
        fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');

        // If JSON is incomplete, try to complete it
        if (!fixedContent.endsWith('}') && !fixedContent.endsWith(']')) {
          // Find the last complete suggestion and close the JSON properly
          const lastCompleteMatch = fixedContent.lastIndexOf('"]');
          if (lastCompleteMatch > 0) {
            fixedContent = fixedContent.substring(0, lastCompleteMatch + 2) + '}';
          } else {
            // If no complete suggestions found, return empty
            console.warn(`Could not fix malformed JSON for ${url}, returning empty suggestions`);
            return [];
          }
        }

        const fixedResult = JSON.parse(fixedContent);
        if (fixedResult?.suggestions && Array.isArray(fixedResult.suggestions)) {
          suggestions = fixedResult.suggestions.filter(s => typeof s === 'string' && s.trim().length > 0);
          console.log(`Successfully recovered ${suggestions.length} suggestions after JSON fix for ${url}`);
        } else {
          console.warn(`Fixed JSON still invalid format for ${url}`);
          return [];
        }
      } catch (secondParseError) {
        console.error(`Failed to fix and parse OpenAI response for ${url}:`, secondParseError);
        return [];
      }
    }

    if (suggestions.length === 0) {
      console.warn(`No valid suggestions generated for ${url}`);
      return [];
    }

    console.log(`Generated ${suggestions.length} valid suggestions for ${url}`);

    // Cache successful results
    if (suggestions.length > 0) {
      seoSuggestionsCache.set(contentFingerprint, {
        suggestions,
        timestamp: Date.now()
      });
    }

    return suggestions;
  } catch (error) {
    console.error("Error generating SEO suggestions with OpenAI:", error);
    // Return empty array on error
    return [];
  }
}

/**
 * Generate AI-powered competitor analysis insights
 * @param mainAnalysis Main site analysis data
 * @param competitorAnalysis Competitor site analysis data
 * @returns Array of strategic competitive recommendations
 */
export async function generateCompetitorInsights(
  mainAnalysis: any,
  competitorAnalysis: any
): Promise<string[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping AI competitor insights");
      return [];
    }

    // Extract key competitive intelligence data
    const mainSite = {
      domain: mainAnalysis.domain,
      pages: mainAnalysis.pages.length,
      avgTitleLength: mainAnalysis.pages.reduce((sum: number, page: any) => 
        sum + (page.title?.length || 0), 0) / mainAnalysis.pages.length,
      avgDescLength: mainAnalysis.pages.reduce((sum: number, page: any) => 
        sum + (page.metaDescription?.length || 0), 0) / mainAnalysis.pages.length,
      topKeywords: extractTopKeywords(mainAnalysis.pages),
      contentTopics: extractContentTopics(mainAnalysis.pages),
      headingStrategy: analyzeHeadingStrategy(mainAnalysis.pages),
      contentDepth: analyzeContentDepth(mainAnalysis.pages),
      linkingStrategy: analyzeLinkingStrategy(mainAnalysis.pages),
      ctaApproach: analyzeCtaApproach(mainAnalysis.pages)
    };

    const competitorSite = {
      domain: competitorAnalysis.domain,
      pages: competitorAnalysis.pages.length,
      avgTitleLength: competitorAnalysis.pages.reduce((sum: number, page: any) => 
        sum + (page.title?.length || 0), 0) / competitorAnalysis.pages.length,
      avgDescLength: competitorAnalysis.pages.reduce((sum: number, page: any) => 
        sum + (page.metaDescription?.length || 0), 0) / competitorAnalysis.pages.length,
      topKeywords: extractTopKeywords(competitorAnalysis.pages),
      contentTopics: extractContentTopics(competitorAnalysis.pages),
      headingStrategy: analyzeHeadingStrategy(competitorAnalysis.pages),
      contentDepth: analyzeContentDepth(competitorAnalysis.pages),
      linkingStrategy: analyzeLinkingStrategy(competitorAnalysis.pages),
      ctaApproach: analyzeCtaApproach(competitorAnalysis.pages)
    };

    const prompt = `Analyze these two websites and provide strategic competitive intelligence for SEO improvement.

MAIN SITE: ${mainSite.domain}
- Pages analyzed: ${mainSite.pages}
- Avg title length: ${Math.round(mainSite.avgTitleLength)} chars
- Avg description length: ${Math.round(mainSite.avgDescLength)} chars
- Top keywords: ${mainSite.topKeywords.join(', ')}
- Content topics: ${mainSite.contentTopics.join(', ')}
- Heading strategy: ${mainSite.headingStrategy}
- Content depth: ${mainSite.contentDepth}
- Linking approach: ${mainSite.linkingStrategy}
- CTA strategy: ${mainSite.ctaApproach}

COMPETITOR: ${competitorSite.domain}
- Pages analyzed: ${competitorSite.pages}
- Avg title length: ${Math.round(competitorSite.avgTitleLength)} chars
- Avg description length: ${Math.round(competitorSite.avgDescLength)} chars
- Top keywords: ${competitorSite.topKeywords.join(', ')}
- Content topics: ${competitorSite.contentTopics.join(', ')}
- Heading strategy: ${competitorSite.headingStrategy}
- Content depth: ${competitorSite.contentDepth}
- Linking approach: ${competitorSite.linkingStrategy}
- CTA strategy: ${competitorSite.ctaApproach}

COMPETITIVE ANALYSIS REQUEST:
Provide 6-10 specific, actionable recommendations focusing on:
1. Content strategy gaps and opportunities
2. Keyword positioning improvements based on competitor success
3. Content depth and quality enhancements
4. Title/meta optimization with specific length and keyword suggestions
5. Heading structure improvements based on competitor patterns
6. Internal linking strategy enhancements
7. Conversion optimization opportunities from CTA analysis

Be specific with examples, numbers, and actionable steps. Focus on what the main site can learn from the competitor's approach.

Respond in JSON: {"insights": ["insight 1", "insight 2", ...]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { 
          role: "system", 
          content: "You are an expert competitive SEO analyst. Provide strategic insights based on content analysis differences between two websites. Be specific with actionable recommendations, exact numbers, and concrete examples. Focus on what can be learned from the competitor's successful strategies."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error("No content returned from OpenAI for competitor analysis");
      return [];
    }

    const result = JSON.parse(content);
    const insights = result.insights || [];

    console.log(`Generated ${insights.length} competitive insights comparing ${mainSite.domain} vs ${competitorSite.domain}`);
    return insights;

  } catch (error) {
    console.error("Error generating competitor insights with OpenAI:", error);
    return [];
  }
}

// Helper functions for competitive analysis
function extractTopKeywords(pages: any[]): string[] {
  const allKeywords: string[] = [];
  pages.forEach(page => {
    if (page.contentMetrics?.keywordDensity) {
      allKeywords.push(...page.contentMetrics.keywordDensity.slice(0, 3).map((k: any) => k.keyword));
    }
  });

  // Get most frequent keywords across all pages
  const keywordCounts = allKeywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(keywordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
    .map(([keyword]) => keyword);
}

function extractContentTopics(pages: any[]): string[] {
  const topics = new Set<string>();
  pages.forEach(page => {
    // Extract topics from H1 and H2 headings
    page.headings?.forEach((heading: any) => {
      if (heading.level <= 2 && heading.text) {
        // Extract meaningful words from headings (simple topic extraction)
        const words = heading.text.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 4);
        words.forEach(word => topics.add(word));
      }
    });
  });
  return Array.from(topics).slice(0, 10);
}

function analyzeHeadingStrategy(pages: any[]): string {
  const h1Count = pages.reduce((sum, page) => sum + (page.headings?.filter((h: any) => h.level === 1).length || 0), 0);
  const h2Count = pages.reduce((sum, page) => sum + (page.headings?.filter((h: any) => h.level === 2).length || 0), 0);
  const avgH1PerPage = h1Count / pages.length;
  const avgH2PerPage = h2Count / pages.length;

  return `${avgH1PerPage.toFixed(1)} H1s per page, ${avgH2PerPage.toFixed(1)} H2s per page`;
}

function analyzeContentDepth(pages: any[]): string {
  const avgParagraphs = pages.reduce((sum, page) => sum + (page.paragraphs?.length || 0), 0) / pages.length;
  const avgWordCount = pages.reduce((sum, page) => {
    const wordCount = page.paragraphs?.join(' ').split(/\s+/).length || 0;
    return sum + wordCount;
  }, 0) / pages.length;

  return `${Math.round(avgWordCount)} words avg, ${avgParagraphs.toFixed(1)} paragraphs per page`;
}

function analyzeLinkingStrategy(pages: any[]): string {
  const avgInternalLinks = pages.reduce((sum, page) => sum + (page.internalLinks?.length || 0), 0) / pages.length;
  const totalUniqueLinks = new Set(pages.flatMap(page => page.internalLinks?.map((link: any) => link.href) || [])).size;

  return `${avgInternalLinks.toFixed(1)} internal links per page, ${totalUniqueLinks} unique destinations`;
}

function analyzeCtaApproach(pages: any[]): string {
  const avgCtas = pages.reduce((sum, page) => sum + (page.ctaElements?.length || 0), 0) / pages.length;
  const buttonTypes = new Set(pages.flatMap(page => page.ctaElements?.map((cta: any) => cta.type) || []));

  return `${avgCtas.toFixed(1)} CTAs per page, types: ${Array.from(buttonTypes).join(', ') || 'none'}`;
}

/**
 * Generate alt text suggestions for images using OpenAI vision
 * @param imageUrl URL of the image to analyze
 * @param pageContext Context from the page where the image appears
 * @returns Suggested alt text for the image
 */
export async function generateImageAltText(imageUrl: string, pageContext: {
  url: string;
  title?: string | null;
  nearbyText?: string;
  siteTitle?: string;
  firstHeading?: string;
  keywords?: string;
}): Promise<string> {
  try {
    // If no OpenAI API key is set, return empty string
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping AI alt text generation");
      return "";
    }

    // Extract image filename for cache key
    const imageFilename = imageUrl.split('/').pop() || '';

    // Create cache key from the image URL and filename
    // This helps identify the same image across different pages
    const cacheKey = crypto.createHash('md5').update(imageFilename).digest('hex');

    // Check if we already have alt text for this image
    if (altTextCache.has(cacheKey)) {
      console.log(`Using cached alt text for image: ${imageFilename}`);
      return altTextCache.get(cacheKey) || "";
    }

    // Skip data URLs, SVG placeholders, and other problematic image sources
    if (imageUrl.startsWith('data:') || 
        imageUrl.includes('placeholder') ||
        imageUrl.includes('lazy-load') ||
        imageUrl.includes('%3Csvg%20xmlns') ||
        imageUrl.endsWith('.svg')) {
      console.log(`Skipping placeholder/data URL image: ${imageUrl.substring(0, 100)}...`);
      return "";
    }

    // Download the image or get its data
    let imageData: string | null = null;

    try {
      // Handle relative URLs
      const fullImageUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : new URL(imageUrl, pageContext.url).toString();

      // Additional validation for the final URL
      if (fullImageUrl.startsWith('data:')) {
        console.log(`Skipping data URL after processing: ${fullImageUrl.substring(0, 100)}...`);
        return "";
      }

      const response = await axios.get(fullImageUrl, {
        responseType: 'arraybuffer',
        timeout: 5000, // 5-second timeout
        headers: {
          'User-Agent': 'SEO-Optimizer-Bot/1.0 (+https://seooptimizer.com/bot)',
        }
      });

      // Convert image to base64
      const buffer = Buffer.from(response.data, 'binary');
      imageData = buffer.toString('base64');
    } catch (error) {
      console.error(`Error downloading image ${imageUrl}:`, error.message || error);
      return ""; // Return empty string if image can't be downloaded
    }

    if (!imageData) {
      return "";
    }

    // Construct prompt with context
    const systemPrompt = "You are an accessibility expert who writes concise, descriptive alt text for images. " +
      "Create alt text that is informative, descriptive, and under 125 characters. " +
      "Focus on the main subject of the image and its purpose in the context of the page. " +
      "Include relevant keywords that match the page content when appropriate. " +
      "Don't start with phrases like 'Image of' or 'Picture showing'." +
      "Respond with same language as the website's language is (Heading, Title, Keywords).";

    // Send request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        { 
          role: "user", 
          content: [
            {
              type: "text",
              text: `Generate a concise, descriptive alt text for this image. The image appears on a page with these details:

Page URL: ${pageContext.url}
Page Title: ${pageContext.title || 'Unknown'}
Nearby Text: ${pageContext.nearbyText || 'Not available'}
Site Context: ${pageContext.siteTitle || 'Not available'}
Page First Heading: ${pageContext.firstHeading || 'Not available'}
Page Keywords: ${pageContext.keywords || 'Not available'}

The alt text should:
- Be relevant to the page content and purpose
- Include appropriate keywords from the page context
- Be concise but descriptive (under 125 characters)
- Not use phrases like "Image of" or "Picture showing"

Respond with ONLY the suggested alt text - nothing else.
Respond with the same language as the website's Heading, Title, Keywords is.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageData}`
              }
            }
          ]
        }
      ],
      max_tokens: 100
    });

    const altText = response.choices[0].message.content?.trim() || "";

    // Cache the generated alt text
    if (altText) {
      altTextCache.set(cacheKey, altText);
      console.log(`Cached alt text for image: ${imageFilename}`);
    }

    return altText;
  } catch (error) {
    console.error("Error generating alt text with OpenAI:", error);
    return ""; // Return empty string on error
  }
}

/**
 * Generate alt text suggestions for multiple images
 * @param images Array of images with their URLs and contexts
 * @returns Array of the same images with suggested alt text
 */
export async function generateBatchImageAltText(images: Array<{
  src: string;
  context: {
    url: string;
    title?: string | null;
    nearbyText?: string;
  }
}>): Promise<Array<{
  src: string;
  suggestedAlt: string;
}>> {
  // Track stats for logging
  let totalImages = images.length;
  let skippedImages = 0;

  // Process images in small batches to avoid rate limits
  const batchSize = 3;
  const results: Array<{ src: string; suggestedAlt: string }> = [];

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    const batchPromises = batch.map(img => {
      // Extract image filename for cache key check
      const imageFilename = img.src.split('/').pop() || '';
      const cacheKey = crypto.createHash('md5').update(imageFilename).digest('hex');

      // If already in cache, use cached version (skips API call)
      if (altTextCache.has(cacheKey)) {
        skippedImages++;
        return Promise.resolve({ 
          src: img.src, 
          suggestedAlt: altTextCache.get(cacheKey) || "" 
        });
      }

      // Otherwise generate new alt text
      return generateImageAltText(img.src, img.context)
        .then(alt => ({ src: img.src, suggestedAlt: alt }))
        .catch(() => ({ src: img.src, suggestedAlt: "" })); // Handle errors
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to avoid rate limits
    if (i + batchSize < images.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Log statistics about cache usage
  if (skippedImages > 0) {
    console.log(`Alt text generation stats: ${skippedImages}/${totalImages} images used cached alt text`);
  }

  return results;
}

/**
 * Analyze content repetition across a website (titles, headings, meta descriptions, paragraphs)
 * @param pages Array of analyzed pages with their SEO elements
 * @returns Enhanced analysis of content duplication with URL attribution and similarity scores
 */
export async function analyzeContentRepetition(pages: Array<any>): Promise<ContentDuplicationAnalysis> {
  try {
    // If no OpenAI API key is set, return empty analysis
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping content repetition analysis");
      return createEmptyContentAnalysis();
    }

    // Enhanced content extraction with URL mapping
    const titlesWithUrls = pages.map(page => ({
      content: page.title,
      url: page.url
    })).filter(item => item.content);

    const descriptionsWithUrls = pages.map(page => ({
      content: page.metaDescription,
      url: page.url
    })).filter(item => item.content);

    // Extract headings by level with URL mapping
    const headingsByLevel = {
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: []
    } as Record<string, Array<{content: string, url: string}>>;

    pages.forEach(page => {
      page.headings?.forEach((heading: any) => {
        if (heading.level >= 1 && heading.level <= 6) {
          const levelKey = `h${heading.level}`;
          headingsByLevel[levelKey].push({
            content: heading.text,
            url: page.url
          });
        }
      });
    });

    // Extract paragraph content with URL mapping (limit to prevent token overflow)
    const paragraphsWithUrls = pages.flatMap(page => 
      (page.paragraphs || [])
        .slice(0, 5) // Limit to first 5 paragraphs per page
        .filter((p: string) => p.length > 50) // Only analyze substantial paragraphs
        .map((p: string) => ({
          content: p.length > 300 ? p.substring(0, 300) + '...' : p, // Truncate very long paragraphs
          url: page.url
        }))
    );

    // Prepare data for AI analysis with better structure for batch processing
    const analysisData = {
      titles: titlesWithUrls,
      descriptions: descriptionsWithUrls,
      headings: headingsByLevel,
      paragraphs: paragraphsWithUrls,
      totalPages: pages.length
    };

    // Split into batches if site is large to avoid token limits
    const shouldBatch = pages.length > 15;
    let finalResults: ContentDuplicationAnalysis;

    if (shouldBatch) {
      console.log(`Large site detected (${pages.length} pages), using batch processing for content duplication analysis`);
      finalResults = await processBatchedContentAnalysis(analysisData);
    } else {
      finalResults = await processSingleContentAnalysis(analysisData);
    }

    return finalResults;
  } catch (error) {
    console.error("Error analyzing content repetition with OpenAI:", error);
    return createEmptyContentAnalysis();
  }
}

// Helper function to create empty analysis structure
function createEmptyContentAnalysis(): ContentDuplicationAnalysis {
  return {
    titleRepetition: { 
      repetitiveCount: 0, 
      totalCount: 0, 
      examples: [], 
      recommendations: [],
      duplicateGroups: []
    },
    descriptionRepetition: { 
      repetitiveCount: 0, 
      totalCount: 0, 
      examples: [], 
      recommendations: [],
      duplicateGroups: []
    },
    headingRepetition: { 
      repetitiveCount: 0, 
      totalCount: 0, 
      examples: [], 
      recommendations: [],
      duplicateGroups: [],
      byLevel: {
        h1: [], h2: [], h3: [], h4: [], h5: [], h6: []
      }
    },
    paragraphRepetition: {
      repetitiveCount: 0,
      totalCount: 0,
      examples: [],
      recommendations: [],
      duplicateGroups: []
    },
    overallRecommendations: []
  };
}

// Helper function to sanitize content for JSON prompts
function sanitizeContentForPrompt(content: string): string {
  return content
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/"/g, '\\"')    // Escape quotes
    .replace(/\n/g, '\\n')    // Escape newlines
    .replace(/\r/g, '\\r')    // Escape carriage returns
    .replace(/\t/g, '\\t');   // Escape tabs
}

// Process content analysis for smaller sites (single API call)
async function processSingleContentAnalysis(data: any): Promise<ContentDuplicationAnalysis> {
  try {
    // Sanitize content to prevent JSON injection issues
    const sanitizedTitles = data.titles.map((item: any) => ({
      content: sanitizeContentForPrompt(item.content || ''),
      url: item.url
    }));

    const sanitizedDescriptions = data.descriptions.map((item: any) => ({
      content: sanitizeContentForPrompt(item.content || ''),
      url: item.url
    }));

    const sanitizedHeadings = {
      h1: data.headings.h1.map((item: any) => ({ content: sanitizeContentForPrompt(item.content || ''), url: item.url })),
      h2: data.headings.h2.map((item: any) => ({ content: sanitizeContentForPrompt(item.content || ''), url: item.url })),
      h3: data.headings.h3.map((item: any) => ({ content: sanitizeContentForPrompt(item.content || ''), url: item.url })),
      h4: data.headings.h4.map((item: any) => ({ content: sanitizeContentForPrompt(item.content || ''), url: item.url })),
      h5: data.headings.h5.map((item: any) => ({ content: sanitizeContentForPrompt(item.content || ''), url: item.url })),
      h6: data.headings.h6.map((item: any) => ({ content: sanitizeContentForPrompt(item.content || ''), url: item.url }))
    };

    const sanitizedParagraphs = data.paragraphs.map((item: any) => ({
      content: sanitizeContentForPrompt(item.content || ''),
      url: item.url
    }));

    const prompt = `As an expert SEO content analyst, analyze this website's content for duplication patterns and provide strategic insights for deduplication.

CONTENT ANALYSIS DATA:

TITLES (${sanitizedTitles.length} total):
${sanitizedTitles.map((item: any) => `"${item.content}" → ${item.url}`).join('\n')}

META DESCRIPTIONS (${sanitizedDescriptions.length} total):
${sanitizedDescriptions.map((item: any) => `"${item.content}" → ${item.url}`).join('\n')}

HEADINGS BY LEVEL:
H1 (${sanitizedHeadings.h1.length}): ${sanitizedHeadings.h1.map((item: any) => `"${item.content}" → ${item.url}`).join('\n')}
H2 (${sanitizedHeadings.h2.length}): ${sanitizedHeadings.h2.map((item: any) => `"${item.content}" → ${item.url}`).join('\n')}
H3 (${sanitizedHeadings.h3.length}): ${sanitizedHeadings.h3.map((item: any) => `"${item.content}" → ${item.url}`).join('\n')}

PARAGRAPH CONTENT (${sanitizedParagraphs.length} substantial paragraphs):
${sanitizedParagraphs.map((item: any, idx: number) => `P${idx + 1}: "${item.content}" → ${item.url}`).join('\n')}

ANALYSIS REQUIREMENTS:
1. **Smart Duplicate Detection**: Identify exact matches and high similarity content (80%+ similar)
2. **Impact Assessment**: Prioritize duplicates by SEO impact (title > H1 > meta desc > other headings > paragraphs)
3. **Pattern Recognition**: Detect template-based duplicates, boilerplate content, and systematic issues
4. **Actionable Insights**: Provide specific, prioritized recommendations with URL references
5. **Content Uniqueness Strategy**: Suggest content differentiation approaches for each duplicate group

RESPONSE FORMAT:
For each duplicate group, provide:
- Content type and impact level (Critical/High/Medium/Low)
- Similarity score and affected URLs
- Root cause analysis (template issue, copy-paste, auto-generation, etc.)
- Specific improvement strategy with examples
- Priority level for fixing (1-5, where 1 is most urgent)

Focus on highlighting the most critical deduplication opportunities that will have the biggest SEO impact.

Respond in valid JSON format with comprehensive analysis and strategic recommendations.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { 
          role: "system", 
          content: "You are an expert SEO content strategist specializing in intelligent content deduplication analysis. Your role is to identify not just what content is duplicated, but WHY it matters for SEO and HOW to strategically fix it. Provide actionable insights that highlight the most critical deduplication opportunities with clear business impact. Focus on: 1) SEO impact prioritization, 2) Root cause analysis, 3) Strategic differentiation recommendations, 4) Implementation roadmap. Always respond in valid JSON format with comprehensive analysis that helps users understand which duplicates to fix first and why."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,  // Slightly higher for more creative suggestions
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error("No content in OpenAI response for content duplication analysis");
      return createEmptyContentAnalysis();
    }

    console.log(`Content duplication OpenAI response length: ${content.length} characters`);
    console.log(`Content duplication response preview:`, content.substring(0, 200) + '...');

    // Enhanced JSON parsing with robust error handling (same pattern as generateSEOSuggestions)
    let result: any;
    try {
      // First attempt to parse the response as-is
      result = JSON.parse(content);
      console.log('Successfully parsed content duplication response on first attempt');
    } catch (parseError) {
      console.error('Failed to parse content duplication response on first attempt:', parseError);

      // Try to fix common JSON issues and retry parsing
      try {
        // Remove any trailing commas and fix incomplete JSON
        let fixedContent = content.trim();

        // Remove trailing comma before closing brace/bracket
        fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');

        // If JSON is incomplete, try to complete it
        if (!fixedContent.endsWith('}') && !fixedContent.endsWith(']')) {
          // Find the last complete object structure and close the JSON properly
          const lastCompleteMatch = fixedContent.lastIndexOf('}');
          if (lastCompleteMatch > 0) {
            // Try to find the main object structure
            const openBraceCount = (fixedContent.match(/{/g) || []).length;
            const closeBraceCount = (fixedContent.match(/}/g) || []).length;
            const missingBraces = openBraceCount - closeBraceCount;

            if (missingBraces > 0) {
              fixedContent = fixedContent + '}'.repeat(missingBraces);
            }
          } else {
            // If no complete structure found, return empty analysis
            console.warn('Could not fix malformed JSON for content duplication, returning empty analysis');
            return createEmptyContentAnalysis();
          }
        }

        result = JSON.parse(fixedContent);
        console.log('Successfully recovered content duplication response after JSON fix');
      } catch (secondParseError) {
        console.error('Failed to fix and parse content duplication response:', secondParseError);
        console.error('Original content length:', content.length);
        console.error('Content sample:', content.substring(0, 500));
        return createEmptyContentAnalysis();
      }
    }

    return parseEnhancedAnalysisResult(result);
  } catch (error) {
    console.error('Error in processSingleContentAnalysis:', error);
    return createEmptyContentAnalysis();
  }
}

// Process content analysis for larger sites (simplified rule-based + minimal AI)
async function processBatchedContentAnalysis(data: any): Promise<ContentDuplicationAnalysis> {
  try {
    console.log(`Processing large site with ${data.totalPages} pages using simplified analysis`);

    // For large sites, use rule-based analysis with minimal AI enhancement
    const analysis = createEmptyContentAnalysis();

    // Rule-based title duplication detection
    const titleDuplicates = findExactDuplicates(data.titles);
    analysis.titleRepetition.repetitiveCount = titleDuplicates.duplicateCount;
    analysis.titleRepetition.totalCount = data.titles.length;
    analysis.titleRepetition.duplicateGroups = titleDuplicates.groups;
    analysis.titleRepetition.examples = titleDuplicates.examples;

    // Rule-based description duplication detection
    const descriptionDuplicates = findExactDuplicates(data.descriptions);
    analysis.descriptionRepetition.repetitiveCount = descriptionDuplicates.duplicateCount;
    analysis.descriptionRepetition.totalCount = data.descriptions.length;
    analysis.descriptionRepetition.duplicateGroups = descriptionDuplicates.groups;
    analysis.descriptionRepetition.examples = descriptionDuplicates.examples;

    // Rule-based heading duplication (focus on H1-H3)
    const h1Duplicates = findExactDuplicates(data.headings.h1);
    const h2Duplicates = findExactDuplicates(data.headings.h2);
    const h3Duplicates = findExactDuplicates(data.headings.h3);

    analysis.headingRepetition.repetitiveCount = h1Duplicates.duplicateCount + h2Duplicates.duplicateCount + h3Duplicates.duplicateCount;
    analysis.headingRepetition.totalCount = data.headings.h1.length + data.headings.h2.length + data.headings.h3.length;
    analysis.headingRepetition.byLevel.h1 = h1Duplicates.groups;
    analysis.headingRepetition.byLevel.h2 = h2Duplicates.groups;
    analysis.headingRepetition.byLevel.h3 = h3Duplicates.groups;
    analysis.headingRepetition.examples = [...h1Duplicates.examples, ...h2Duplicates.examples, ...h3Duplicates.examples];

    // Generate rule-based recommendations
    analysis.titleRepetition.recommendations = generateRuleBasedRecommendations('titles', titleDuplicates);
    analysis.descriptionRepetition.recommendations = generateRuleBasedRecommendations('descriptions', descriptionDuplicates);
    analysis.headingRepetition.recommendations = generateRuleBasedRecommendations('headings', {
      duplicateCount: analysis.headingRepetition.repetitiveCount,
      groups: [...h1Duplicates.groups, ...h2Duplicates.groups, ...h3Duplicates.groups]
    });

    // Add minimal AI enhancement only if we have significant duplicates
    const totalDuplicates = analysis.titleRepetition.repetitiveCount + analysis.descriptionRepetition.repetitiveCount + analysis.headingRepetition.repetitiveCount;

    if (totalDuplicates > 0) {
      try {
        const simplifiedAIRecommendations = await generateSimplifiedAIRecommendations(analysis, data.totalPages);
        analysis.overallRecommendations = simplifiedAIRecommendations;
      } catch (aiError) {
        console.warn('AI enhancement failed for large site, using rule-based only:', aiError);
        analysis.overallRecommendations = [
          `Found ${totalDuplicates} duplicate content issues across ${data.totalPages} pages`,
          'Focus on making each page title unique and descriptive',
          'Ensure meta descriptions provide unique value for each page',
          'Review heading structure to avoid repetitive content'
        ];
      }
    } else {
      analysis.overallRecommendations = [`No major content duplication detected across ${data.totalPages} pages`];
    }

    console.log(`Completed simplified analysis: ${totalDuplicates} duplicates found`);
    return analysis;

  } catch (error) {
    console.error('Error in processBatchedContentAnalysis:', error);
    return createEmptyContentAnalysis();
  }
}

// Helper function to find exact duplicates using rule-based analysis
function findExactDuplicates(items: Array<{content: string, url: string}>): {
  duplicateCount: number;
  groups: Array<{content: string, urls: string[], similarityScore: number}>;
  examples: string[];
} {
  const contentMap = new Map<string, string[]>();

  // Group items by exact content match (case-insensitive, trimmed)
  items.forEach(item => {
    const normalizedContent = item.content.trim().toLowerCase();
    if (normalizedContent.length > 0) {
      if (!contentMap.has(normalizedContent)) {
        contentMap.set(normalizedContent, []);
      }
      contentMap.get(normalizedContent)!.push(item.url);
    }
  });

  // Find groups with duplicates (more than 1 URL)
  const duplicateGroups: Array<{content: string, urls: string[], similarityScore: number}> = [];
  const examples: string[] = [];
  let duplicateCount = 0;

  contentMap.forEach((urls, content) => {
    if (urls.length > 1) {
      // Find original content (not normalized) for display
      const originalContent = items.find(item => 
        item.content.trim().toLowerCase() === content
      )?.content || content;

      duplicateGroups.push({
        content: originalContent,
        urls: urls,
        similarityScore: 100 // Exact match
      });

      examples.push(originalContent);
      duplicateCount += urls.length - 1; // Count extra occurrences
    }
  });

  return {
    duplicateCount,
    groups: duplicateGroups,
    examples: examples.slice(0, 5) // Limit examples
  };
}

// Helper function to generate rule-based recommendations
function generateRuleBasedRecommendations(contentType: string, duplicateData: {duplicateCount: number, groups: any[]}): string[] {
  const recommendations: string[] = [];

  if (duplicateData.duplicateCount === 0) {
    recommendations.push(`No duplicate ${contentType} detected - good content uniqueness!`);
  } else {
    recommendations.push(`Found ${duplicateData.duplicateCount} duplicate ${contentType} across ${duplicateData.groups.length} groups`);

    if (contentType === 'titles') {
      recommendations.push('Make each page title unique and descriptive for better SEO');
      recommendations.push('Include target keywords specific to each page content');
    } else if (contentType === 'descriptions') {
      recommendations.push('Write unique meta descriptions that summarize each page content');
      recommendations.push('Keep descriptions between 150-160 characters for optimal display');
    } else if (contentType === 'headings') {
      recommendations.push('Use unique headings that clearly describe section content');
      recommendations.push('Avoid generic headings like "Welcome" or "About Us" across multiple pages');
    }

    if (duplicateData.groups.length > 0) {
      const topDuplicate = duplicateData.groups[0];
      recommendations.push(`Most duplicated content: "${topDuplicate.content}" appears on ${topDuplicate.urls?.length || 0} pages`);
    }
  }

  return recommendations;
}

// Helper function to generate simplified AI recommendations for large sites
async function generateSimplifiedAIRecommendations(analysis: ContentDuplicationAnalysis, totalPages: number): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    return ['AI recommendations unavailable - OpenAI API key not configured'];
  }

  try {
    const summary = {
      totalPages,
      titleDuplicates: analysis.titleRepetition.repetitiveCount,
      descriptionDuplicates: analysis.descriptionRepetition.repetitiveCount,
      headingDuplicates: analysis.headingRepetition.repetitiveCount,
      topExamples: [
        ...analysis.titleRepetition.examples.slice(0, 2),
        ...analysis.descriptionRepetition.examples.slice(0, 2)
      ],
      criticalGroups: [
        ...analysis.titleRepetition.duplicateGroups.slice(0, 2),
        ...analysis.descriptionRepetition.duplicateGroups.slice(0, 2)
      ]
    };

    const prompt = `As an SEO strategist, analyze this large website's content duplication issues and provide KEY INSIGHTS for prioritized deduplication:

SITE OVERVIEW: ${totalPages} pages analyzed
DUPLICATION SUMMARY:
- Title duplicates: ${summary.titleDuplicates} (CRITICAL impact)
- Description duplicates: ${summary.descriptionDuplicates} (HIGH impact)  
- Heading duplicates: ${summary.headingDuplicates} (MEDIUM impact)

TOP DUPLICATE GROUPS:
${summary.criticalGroups.map((group: any, idx: number) => 
  `${idx + 1}. "${group.content}" (${group.urls?.length || 0} pages affected)`
).join('\n')}

REQUIREMENTS:
1. **Highlight the #1 most critical deduplication priority** 
2. **Identify pattern-based vs random duplicates**
3. **Provide a strategic 3-step action plan**
4. **Estimate effort vs SEO impact for each recommendation**
5. **Suggest automation opportunities for template-based fixes**

Focus on actionable insights that help prioritize which duplicates to fix first for maximum SEO impact on a large site.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { 
          role: "system", 
          content: "You are an SEO expert. Provide concise, actionable recommendations for improving content uniqueness on large websites. Respond with a JSON array of recommendation strings."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500 // Very limited to avoid truncation
    });

    const content = response.choices[0].message.content;
    if (content) {
      try {
        const result = JSON.parse(content);
        return Array.isArray(result.recommendations) ? result.recommendations : 
               [content.replace(/[{}"\[\]]/g, '').trim()]; // Fallback parsing
      } catch (parseError) {
        return [`AI analysis complete: Focus on the ${summary.titleDuplicates + summary.descriptionDuplicates + summary.headingDuplicates} identified duplicates for maximum SEO impact`];
      }
    }

    return ['AI recommendations generated successfully'];
  } catch (error) {
    console.error('Error generating simplified AI recommendations:', error);
    throw error; // Let caller handle the fallback
  }
}

// Helper function to parse enhanced analysis results
function parseEnhancedAnalysisResult(result: any): ContentDuplicationAnalysis {
  // Handle both new structured format and legacy format
  if (result.deduplication_analysis) {
    // New format from OpenAI with deduplication_analysis array
    const analysis = result.deduplication_analysis;
    const overallRecommendations = result.strategic_recommendations || result.overall_recommendations || [];

    // Initialize counters and groups
    const titleGroups: DuplicateItem[] = [];
    const descriptionGroups: DuplicateItem[] = [];
    const headingGroups: DuplicateItem[] = [];
    const paragraphGroups: DuplicateItem[] = [];

    let titleCount = 0, titleRepetitive = 0;
    let descCount = 0, descRepetitive = 0;
    let headingCount = 0, headingRepetitive = 0;
    let paragraphCount = 0, paragraphRepetitive = 0;

    // Process each duplicate group from OpenAI response
    analysis.forEach((item: any) => {
      const duplicateItem: DuplicateItem = {
        content: item.content || item.group || '',
        urls: item.affected_urls || item.urls || [],
        similarityScore: typeof item.similarity_score === 'string' 
          ? parseInt(item.similarity_score.replace('%', '')) 
          : item.similarity_score || 0,
        impactLevel: item.impact_level as 'Critical' | 'High' | 'Medium' | 'Low',
        priority: item.priority || 3,
        rootCause: item.root_cause,
        improvementStrategy: item.improvement_strategy || item.specific_recommendations
      };

      // Categorize by content type
      const contentType = item.content_type?.toLowerCase() || '';
      if (contentType.includes('title') || contentType.includes('brand')) {
        titleGroups.push(duplicateItem);
        titleRepetitive += duplicateItem.urls.length;
        titleCount += duplicateItem.urls.length;
      } else if (contentType.includes('description') || contentType.includes('meta')) {
        descriptionGroups.push(duplicateItem);
        descRepetitive += duplicateItem.urls.length;
        descCount += duplicateItem.urls.length;
      } else if (contentType.includes('heading') || contentType.includes('h1') || contentType.includes('h2')) {
        headingGroups.push(duplicateItem);
        headingRepetitive += duplicateItem.urls.length;
        headingCount += duplicateItem.urls.length;
      } else if (contentType.includes('paragraph') || contentType.includes('content')) {
        paragraphGroups.push(duplicateItem);
        paragraphRepetitive += duplicateItem.urls.length;
        paragraphCount += duplicateItem.urls.length;
      }
    });

    // Extract unique examples from duplicate groups, filtering out empty content
    const titleExamples = titleGroups
      .map(g => g.content)
      .filter(content => content && content.trim().length > 0)
      .slice(0, 5);

    const descriptionExamples = descriptionGroups
      .map(g => g.content)
      .filter(content => content && content.trim().length > 0)
      .slice(0, 5);

    const headingExamples = headingGroups
      .map(g => g.content)
      .filter(content => content && content.trim().length > 0)
      .slice(0, 5);

    const paragraphExamples = paragraphGroups
      .map(g => g.content)
      .filter(content => content && content.trim().length > 0)
      .slice(0, 5);

    // Extract recommendations from improvement strategies, ensuring they're strings
    const titleRecommendations = titleGroups
      .map(g => {
        if (typeof g.improvementStrategy === 'string') return g.improvementStrategy;
        if (typeof g.improvementStrategy === 'object' && g.improvementStrategy?.description) {
          return g.improvementStrategy.description;
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 3);

    const descriptionRecommendations = descriptionGroups
      .map(g => {
        if (typeof g.improvementStrategy === 'string') return g.improvementStrategy;
        if (typeof g.improvementStrategy === 'object' && g.improvementStrategy?.description) {
          return g.improvementStrategy.description;
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 3);

    const headingRecommendations = headingGroups
      .map(g => {
        if (typeof g.improvementStrategy === 'string') return g.improvementStrategy;
        if (typeof g.improvementStrategy === 'object' && g.improvementStrategy?.description) {
          return g.improvementStrategy.description;
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 3);

    const paragraphRecommendations = paragraphGroups
      .map(g => {
        if (typeof g.improvementStrategy === 'string') return g.improvementStrategy;
        if (typeof g.improvementStrategy === 'object' && g.improvementStrategy?.description) {
          return g.improvementStrategy.description;
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 3);

    // Parse overall recommendations ensuring they're strings
    const parsedOverallRecommendations = Array.isArray(overallRecommendations) 
      ? overallRecommendations.map(rec => {
          if (typeof rec === 'string') return rec;
          if (typeof rec === 'object' && rec?.description) return rec.description;
          return String(rec || '');
        }).filter(rec => rec.trim().length > 0)
      : [];

    return {
      titleRepetition: {
        repetitiveCount: titleRepetitive,
        totalCount: Math.max(titleCount, titleRepetitive),
        examples: titleExamples,
        recommendations: titleRecommendations,
        duplicateGroups: titleGroups
      },
      descriptionRepetition: {
        repetitiveCount: descRepetitive,
        totalCount: Math.max(descCount, descRepetitive),
        examples: descriptionExamples,
        recommendations: descriptionRecommendations,
        duplicateGroups: descriptionGroups
      },
      headingRepetition: {
        repetitiveCount: headingRepetitive,
        totalCount: Math.max(headingCount, headingRepetitive),
        examples: headingExamples,
        recommendations: headingRecommendations,
        duplicateGroups: headingGroups,
        byLevel: {
          h1: headingGroups.filter(g => g.content.toLowerCase().includes('h1')),
          h2: headingGroups.filter(g => g.content.toLowerCase().includes('h2')),
          h3: headingGroups.filter(g => g.content.toLowerCase().includes('h3')),
          h4: headingGroups.filter(g => g.content.toLowerCase().includes('h4')),
          h5: headingGroups.filter(g => g.content.toLowerCase().includes('h5')),
          h6: headingGroups.filter(g => g.content.toLowerCase().includes('h6'))
        }
      },
      paragraphRepetition: {
        repetitiveCount: paragraphRepetitive,
        totalCount: Math.max(paragraphCount, paragraphRepetitive),
        examples: paragraphExamples,
        recommendations: paragraphRecommendations,
        duplicateGroups: paragraphGroups
      },
      overallRecommendations: parsedOverallRecommendations
    };
  }

  // Legacy format handling
  return {
    titleRepetition: {
      repetitiveCount: result.titleRepetition?.repetitiveCount || 0,
      totalCount: result.titleRepetition?.totalCount || 0,
      examples: result.titleRepetition?.examples || [],
      recommendations: (result.titleRepetition?.recommendations || []).map((rec: any) => {
        if (typeof rec === 'string') return rec;
        if (typeof rec === 'object' && rec?.description) return rec.description;
        return String(rec || '');
      }),
      duplicateGroups: result.titleRepetition?.duplicateGroups || []
    },
    descriptionRepetition: {
      repetitiveCount: result.descriptionRepetition?.repetitiveCount || 0,
      totalCount: result.descriptionRepetition?.totalCount || 0,
      examples: result.descriptionRepetition?.examples || [],
      recommendations: (result.descriptionRepetition?.recommendations || []).map((rec: any) => {
        if (typeof rec === 'string') return rec;
        if (typeof rec === 'object' && rec?.description) return rec.description;
        return String(rec || '');
      }),
      duplicateGroups: result.descriptionRepetition?.duplicateGroups || []
    },
    headingRepetition: {
      repetitiveCount: result.headingRepetition?.repetitiveCount || 0,
      totalCount: result.headingRepetition?.totalCount || 0,
      examples: result.headingRepetition?.examples || [],
      recommendations: (result.headingRepetition?.recommendations || []).map((rec: any) => {
        if (typeof rec === 'string') return rec;
        if (typeof rec === 'object' && rec?.description) return rec.description;
        return String(rec || '');
      }),
      duplicateGroups: result.headingRepetition?.duplicateGroups || [],
      byLevel: {
        h1: result.headingRepetition?.byLevel?.h1 || [],
        h2: result.headingRepetition?.byLevel?.h2 || [],
        h3: result.headingRepetition?.byLevel?.h3 || [],
        h4: result.headingRepetition?.byLevel?.h4 || [],
        h5: result.headingRepetition?.byLevel?.h5 || [],
        h6: result.headingRepetition?.byLevel?.h6 || []
      }
    },
    paragraphRepetition: {
      repetitiveCount: result.paragraphRepetition?.repetitiveCount || 0,
      totalCount: result.paragraphRepetition?.totalCount || 0,
      examples: result.paragraphRepetition?.examples || [],
      recommendations: (result.paragraphRepetition?.recommendations || []).map((rec: any) => {
        if (typeof rec === 'string') return rec;
        if (typeof rec === 'object' && rec?.description) return rec.description;
        return String(rec || '');
      }),
      duplicateGroups: result.paragraphRepetition?.duplicateGroups || []
    },
    overallRecommendations: result.overallRecommendations || []
  };
}

// Helper function to chunk arrays for batch processing
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Helper function to merge analysis results from batches
function mergeAnalysisResults(base: ContentDuplicationAnalysis, additional: ContentDuplicationAnalysis): ContentDuplicationAnalysis {
  return {
    titleRepetition: {
      repetitiveCount: base.titleRepetition.repetitiveCount + additional.titleRepetition.repetitiveCount,
      totalCount: Math.max(base.titleRepetition.totalCount, additional.titleRepetition.totalCount),
      examples: [...base.titleRepetition.examples, ...additional.titleRepetition.examples],
      recommendations: [...base.titleRepetition.recommendations, ...additional.titleRepetition.recommendations],
      duplicateGroups: [...base.titleRepetition.duplicateGroups, ...additional.titleRepetition.duplicateGroups]
    },
    descriptionRepetition: {
      repetitiveCount: base.descriptionRepetition.repetitiveCount + additional.descriptionRepetition.repetitiveCount,
      totalCount: Math.max(base.descriptionRepetition.totalCount, additional.descriptionRepetition.totalCount),
      examples: [...base.descriptionRepetition.examples, ...additional.descriptionRepetition.examples],
      recommendations: [...base.descriptionRepetition.recommendations, ...additional.descriptionRepetition.recommendations],
      duplicateGroups: [...base.descriptionRepetition.duplicateGroups, ...additional.descriptionRepetition.duplicateGroups]
    },
    headingRepetition: {
      repetitiveCount: base.headingRepetition.repetitiveCount + additional.headingRepetition.repetitiveCount,
      totalCount: Math.max(base.headingRepetition.totalCount, additional.headingRepetition.totalCount),
      examples: [...base.headingRepetition.examples, ...additional.headingRepetition.examples],
      recommendations: [...base.headingRepetition.recommendations, ...additional.headingRepetition.recommendations],
      duplicateGroups: [...base.headingRepetition.duplicateGroups, ...additional.headingRepetition.duplicateGroups],
      byLevel: {
        h1: [...base.headingRepetition.byLevel.h1, ...additional.headingRepetition.byLevel.h1],
        h2: [...base.headingRepetition.byLevel.h2, ...additional.headingRepetition.byLevel.h2],
        h3: [...base.headingRepetition.byLevel.h3, ...additional.headingRepetition.byLevel.h3],
        h4: [...base.headingRepetition.byLevel.h4, ...additional.headingRepetition.byLevel.h4],
        h5: [...base.headingRepetition.byLevel.h5, ...additional.headingRepetition.byLevel.h5],
        h6: [...base.headingRepetition.byLevel.h6, ...additional.headingRepetition.byLevel.h6]
      }
    },
    paragraphRepetition: {
      repetitiveCount: base.paragraphRepetition.repetitiveCount + additional.paragraphRepetition.repetitiveCount,
      totalCount: Math.max(base.paragraphRepetition.totalCount, additional.paragraphRepetition.totalCount),
      examples: [...base.paragraphRepetition.examples, ...additional.paragraphRepetition.examples],
      recommendations: [...base.paragraphRepetition.recommendations, ...additional.paragraphRepetition.recommendations],
      duplicateGroups: [...base.paragraphRepetition.duplicateGroups, ...additional.paragraphRepetition.duplicateGroups]
    },
    overallRecommendations: [...base.overallRecommendations, ...additional.overallRecommendations]
  };
}