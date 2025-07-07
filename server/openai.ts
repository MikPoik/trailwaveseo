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
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Define interface for content duplication analysis results
export interface ContentDuplicationAnalysis {
  titleRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
  };
  descriptionRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
  };
  headingRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
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
      model: "gpt-4o",
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

    // Check cache first - but be less aggressive (skip if forceRefresh is true)
    if (!forceRefresh) {
      const cached = seoSuggestionsCache.get(contentFingerprint);
      if (cached && Date.now() - cached.timestamp < (CACHE_DURATION / 4)) { // Reduce cache time to 6 hours
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

    // Build optimized site structure information
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
        .map(item => `- ${item.page.title || 'Untitled'} (${item.page.url}) - Topics: ${item.commonKeywords.slice(0, 3).join(', ')} ${item.isAlreadyLinked ? '[Linked]' : '[New opportunity]'}`)
        .join('\n')}
    ` : '';

    // CTA analysis removed as requested
    const ctaAnalysis = 'Call-to-Action Analysis: Disabled';

    // Analyze paragraph content quality
    const paragraphAnalysis = pageData.paragraphs && pageData.paragraphs.length > 0 ? `
      Content Structure Analysis:
      - Total paragraphs: ${pageData.paragraphs.length}
      - Average paragraph length: ~${Math.round(pageData.paragraphs.reduce((sum: number, p: string) => sum + p.length, 0) / pageData.paragraphs.length)} chars
      - Short paragraphs (<50 chars): ${pageData.paragraphs.filter((p: string) => p.length < 50).length}
      - Long paragraphs (>500 chars): ${pageData.paragraphs.filter((p: string) => p.length > 500).length}
      - Content readability: ${pageData.paragraphs.length > 8 ? 'Long-form content' : 'Short-form content'}
    ` : 'Content Structure: No paragraph content found';

    // Build a more focused prompt
    const seoIssuesList = pageData.issues.map((issue: any) => `${issue.title} (${issue.severity})`).join(', ') || 'No major issues found';
    
    const prompt = `You are an SEO expert with expertise in conversion optimization and business strategy. Analyze this webpage and provide 8-12 specific, actionable SEO improvement suggestions based on the business context.

WEBPAGE ANALYSIS:
URL: ${url}
Title: "${pageData.title || 'MISSING'}" (${pageData.title?.length || 0} characters)
Meta Description: "${pageData.metaDescription || 'MISSING'}" (${pageData.metaDescription?.length || 0} characters)
H1 Heading: "${pageData.headings.find((h: any) => h.level === 1)?.text || 'MISSING'}"

CONTENT OVERVIEW:
- Content Keywords: ${extractedKeywords.slice(0, 8).join(', ') || 'No clear keywords found'}
- Content Length: ~${pageContent.split(/\s+/).length} words
- Paragraphs: ${pageData.paragraphs?.length || 0} found
- Images: ${pageData.images?.length || 0} total (${pageData.images?.filter((img: any) => !img.alt).length || 0} missing alt text)
- Internal Links: ${pageData.internalLinks?.length || 0} found
- CTA Elements: Analysis disabled

${paragraphAnalysis}

${internalLinkingOpportunities}

DETECTED ISSUES:
${seoIssuesList}

${siteOverview && siteOverview.industry !== 'Unknown' ? `
BUSINESS CONTEXT:
- Industry: ${siteOverview.industry}
- Business Type: ${siteOverview.businessType}
- Target Audience: ${siteOverview.targetAudience}
- Main Services: ${siteOverview.mainServices.join(', ') || 'General'}
${siteOverview.location ? `- Location: ${siteOverview.location}` : ''}
${additionalInfo ? `- Additional Context: ${additionalInfo}` : ''}

CONTENT STRATEGY ANALYSIS:
- Content Intent: ${contentIntent.intentType} (${contentIntent.businessRelevance})
- User Journey Stage: ${contentIntent.journeyStage}
- Conversion Opportunities: ${contentIntent.conversionOpportunities.join(', ') || 'None identified'}
` : ''}

CONTENT SAMPLE:
${pageData.paragraphs && pageData.paragraphs.length > 0 ? 
  pageData.paragraphs.slice(0, 3).join(' ').substring(0, 1000) + (pageData.paragraphs.slice(0, 3).join(' ').length > 1000 ? '...' : '') : 'No content available'}

TASK:
Provide specific, actionable SEO improvements that align with the business goals and target audience. Focus on:

1. **Title & Meta Optimization**: Industry-specific keywords, local SEO (if applicable), character count optimization
2. **Content Strategy**: Business-relevant topics, customer pain points, service/product focused content
3. **Content Structure**: Improve content organization and readability
4. **Semantic SEO**: Related keywords, topic clusters, user intent matching
5. **Technical SEO**: Image optimization, internal linking, page structure
6. **Local SEO**: Location-based optimization (if applicable)
7. **User Experience**: Content structure, readability, engagement elements
8. **Competitive Advantage**: Unique value proposition, differentiators

For content improvements specifically:
- Analyze current content structure and organization
- Suggest improvements for readability and user engagement
- Recommend strategic content placement and flow
- Align content messaging with business goals and target audience needs

Respond in JSON format with highly specific, actionable suggestions:
{"suggestions": ["specific suggestion 1", "specific suggestion 2", ...]}

Make every suggestion SPECIFIC, ACTIONABLE, and BUSINESS-FOCUSED. Include exact character counts, specific keywords, concrete examples, and measurable improvements.`;
    
    console.log('SEO Suggestions Prompt:', prompt.substring(0, 500) + '...')
    console.log(`Generating SEO suggestions for: ${url}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an expert SEO consultant. Provide specific, actionable suggestions with concrete examples. Always include exact character counts for titles/descriptions, specific keywords to target, and exact URLs for internal linking recommendations. Be detailed and specific, not generic. Respond in JSON format only."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error(`No content returned from OpenAI for ${url}`);
      return [];
    }

    console.log(`OpenAI response for ${url}:`, content.substring(0, 500) + '...');

    // Parse the JSON response with better error handling
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error(`Failed to parse OpenAI response for ${url}:`, parseError);
      console.error('Raw response:', content);
      
      // Try to extract suggestions from malformed JSON
      try {
        // Look for suggestions array in the content
        const suggestionsMatch = content.match(/["']suggestions["']\s*:\s*\[(.*?)\]/s);
        if (suggestionsMatch) {
          const suggestionsStr = '[' + suggestionsMatch[1] + ']';
          const extractedSuggestions = JSON.parse(suggestionsStr);
          console.log(`Extracted ${extractedSuggestions.length} suggestions from malformed JSON`);
          return extractedSuggestions.filter(s => typeof s === 'string' && s.trim());
        }
      } catch (extractError) {
        console.error('Failed to extract suggestions from malformed response');
      }
      
      return [];
    }

    // Ensure we have an array of suggestions with better validation
    let suggestions: string[] = [];
    
    if (result && typeof result === 'object') {
      if (Array.isArray(result.suggestions)) {
        suggestions = result.suggestions.filter(s => typeof s === 'string' && s.trim());
      } else if (typeof result.suggestions === 'string') {
        suggestions = [result.suggestions];
      } else if (Array.isArray(result)) {
        suggestions = result.filter(s => typeof s === 'string' && s.trim());
      } else {
        console.error(`Unexpected response format for ${url}:`, result);
        console.error('Expected format: {"suggestions": ["suggestion1", "suggestion2", ...]}');
        return [];
      }
    } else {
      console.error(`Invalid response object for ${url}:`, result);
      return [];
    }

    // Validate suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      console.error(`No valid suggestions found for ${url}. Response:`, result);
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

    // Download the image or get its data
    let imageData: string | null = null;

    try {
      // Handle relative URLs
      const fullImageUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : new URL(imageUrl, pageContext.url).toString();

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
      console.error("Error downloading image:", error);
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
      model: "gpt-4o",
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
 * Analyze content repetition across a website (titles, headings, meta descriptions)
 * @param pages Array of analyzed pages with their SEO elements
 * @returns Analysis of content duplication and recommendations
 */
export async function analyzeContentRepetition(pages: Array<any>): Promise<ContentDuplicationAnalysis> {
  try {
    // If no OpenAI API key is set, return empty analysis
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping content repetition analysis");
      return {
        titleRepetition: { repetitiveCount: 0, totalCount: 0, examples: [], recommendations: [] },
        descriptionRepetition: { repetitiveCount: 0, totalCount: 0, examples: [], recommendations: [] },
        headingRepetition: { repetitiveCount: 0, totalCount: 0, examples: [], recommendations: [] },
        overallRecommendations: []
      };
    }

    // Extract all titles, descriptions, and h1 headings
    const titles = pages.map(page => page.title).filter(Boolean);
    const descriptions = pages.map(page => page.metaDescription).filter(Boolean);
    const h1Headings = pages.flatMap(page => 
      page.headings.filter((h: any) => h.level === 1).map((h: any) => h.text)
    );

    const prompt = `
      I need an analysis of potential content duplication in a website's SEO elements.

      Here are all page titles from the website:
      ${JSON.stringify(titles)}

      Here are all meta descriptions:
      ${JSON.stringify(descriptions)}

      Here are all H1 headings:
      ${JSON.stringify(h1Headings)}

      Please analyze these SEO elements and identify:
      1. How many titles appear to be duplicated or too similar
      2. How many meta descriptions appear to be duplicated or too similar
      3. How many H1 headings appear to be duplicated or too similar
      4. For each category (titles, descriptions, headings), provide specific examples of repetitive content
      5. For each category, provide actionable recommendations to fix the issues
      6. Provide overall recommendations for improving content uniqueness across the site, suggesting specific changes to titles, descriptions, and headings

      Respond with a JSON object in this exact format:
      {
        "titleRepetition": {
          "repetitiveCount": number,
          "totalCount": number,
          "examples": string[],
          "recommendations": string[]
        },
        "descriptionRepetition": {
          "repetitiveCount": number,
          "totalCount": number,
          "examples": string[],
          "recommendations": string[]
        },
        "headingRepetition": {
          "repetitiveCount": number,
          "totalCount": number,
          "examples": string[],
          "recommendations": string[]
        },
        "overallRecommendations": string[]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an SEO expert assistant specializing in content uniqueness analysis. Provide clear, actionable recommendations for improving content. Always respond in JSON format." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }

    // Parse the JSON response
    const result = JSON.parse(content);

    // Return the analysis
    return {
      titleRepetition: {
        repetitiveCount: result.titleRepetition?.repetitiveCount || 0,
        totalCount: result.titleRepetition?.totalCount || 0,
        examples: result.titleRepetition?.examples || [],
        recommendations: result.titleRepetition?.recommendations || []
      },
      descriptionRepetition: {
        repetitiveCount: result.descriptionRepetition?.repetitiveCount || 0,
        totalCount: result.descriptionRepetition?.totalCount || 0,
        examples: result.descriptionRepetition?.examples || [],
        recommendations: result.descriptionRepetition?.recommendations || []
      },
      headingRepetition: {
        repetitiveCount: result.headingRepetition?.repetitiveCount || 0,
        totalCount: result.headingRepetition?.totalCount || 0,
        examples: result.headingRepetition?.examples || [], 
        recommendations: result.headingRepetition?.recommendations || []
      },
      overallRecommendations: result.overallRecommendations || []
    };
  } catch (error) {
    console.error("Error analyzing content repetition with OpenAI:", error);
    // Return empty analysis on error
    return {
      titleRepetition: { repetitiveCount: 0, totalCount: 0, examples: [], recommendations: [] },
      descriptionRepetition: { repetitiveCount: 0, totalCount: 0, examples: [], recommendations: [] },
      headingRepetition: { repetitiveCount: 0, totalCount: 0, examples: [], recommendations: [] },
      overallRecommendations: []
    };
  }
}