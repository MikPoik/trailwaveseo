import OpenAI from "openai";
import axios from "axios";
import crypto from "crypto";

// the newest OpenAI model is "gpt-4.1 which was released 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache for storing generated alt text to avoid regenerating for the same images
const altTextCache = new Map<string, string>();

// Cache for SEO suggestions to avoid regenerating for similar pages
const seoSuggestionsCache = new Map<string, { suggestions: string[], timestamp: number }>();
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
  try {
    // If no OpenAI API key is set, return empty suggestions
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping AI suggestions");
      return [];
    }

    // Create cache key based on page content fingerprint
    const contentFingerprint = crypto.createHash('md5')
      .update(JSON.stringify({
        title: pageData.title,
        metaDescription: pageData.metaDescription,
        headings: pageData.headings.slice(0, 3), // First 3 headings
        firstParagraph: pageData.paragraphs?.[0]?.substring(0, 200) || '',
        issues: pageData.issues.map(i => i.category).sort()
      }))
      .digest('hex');

    // Check cache first
    const cached = seoSuggestionsCache.get(contentFingerprint);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Using cached SEO suggestions for similar content pattern`);
      return cached.suggestions;
    }

    // Cache for keyword extraction to avoid redundant processing
    const keywordCache = new Map<string, string[]>();
    
    // Extract keywords from page content for better analysis
    const extractKeywords = (text: string): string[] => {
      if (!text) return [];
      
      // Use cache key based on first 500 characters
      const cacheKey = text.substring(0, 500);
      if (keywordCache.has(cacheKey)) {
        return keywordCache.get(cacheKey) || [];
      }
      
      const stopWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'more', 'very', 'what', 'know', 'just', 'first', 'into', 'over', 'think', 'also', 'back', 'after', 'work', 'well', 'want', 'because', 'good', 'water', 'through', 'right', 'where', 'come', 'could', 'would', 'should', 'about', 'make', 'than', 'only', 'other', 'many', 'some', 'like', 'when', 'here', 'them', 'your', 'there']);
      
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

      const wordFreq = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const keywords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
      
      keywordCache.set(cacheKey, keywords);
      return keywords;
    };

    // Analyze page content for keywords with enhanced context
    const pageContent = [
      pageData.title || '',
      pageData.metaDescription || '',
      pageData.headings.map((h: any) => h.text).join(' '),
      ...(pageData.paragraphs || [])
    ].join(' ');

    const extractedKeywords = extractKeywords(pageContent);
    const metaKeywords = pageData.metaKeywords || [];
    
    // Use AI-generated business context or fallback to basic detection
    const businessContext = siteOverview ? {
      industry: siteOverview.industry,
      businessType: siteOverview.businessType,
      targetAudience: siteOverview.targetAudience,
      mainServices: siteOverview.mainServices,
      isLocal: !!siteOverview.location,
      location: siteOverview.location,
      contentType: pageData.paragraphs && pageData.paragraphs.length > 8 ? 'Long-form content' : 'Short-form content'
    } : {
      industry: url.includes('terapia') || extractedKeywords.includes('terapia') ? 'Healthcare/Therapy' :
                url.includes('shop') || url.includes('store') ? 'E-commerce' :
                url.includes('blog') ? 'Content/Blog' :
                url.includes('service') ? 'Services' : 'General Business',
      businessType: 'Unknown',
      targetAudience: 'Unknown',
      mainServices: [],
      isLocal: extractedKeywords.some(k => ['järvenpää', 'helsinki', 'tampere', 'turku', 'oulu'].includes(k.toLowerCase())),
      location: undefined,
      contentType: pageData.paragraphs && pageData.paragraphs.length > 8 ? 'Long-form content' : 'Short-form content'
    };

    // Analyze existing internal links quality (optimized)
    const existingLinksAnalysis = pageData.internalLinks && pageData.internalLinks.length > 0 ? `
      Internal Links (${pageData.internalLinks.length} found):
      ${pageData.internalLinks.slice(0, 5).map(link => {
        const linkText = link.text || 'No anchor text';
        const isGeneric = ['click here', 'read more', 'learn more', 'here', 'this', 'link', 'more info'].some(generic => 
          linkText.toLowerCase().includes(generic)
        );
        const hasKeywords = extractedKeywords.some(keyword => 
          linkText.toLowerCase().includes(keyword.toLowerCase())
        );
        return `- "${linkText}" (${isGeneric ? 'Generic' : hasKeywords ? 'Good' : 'Neutral'})`;
      }).join('\n')}${pageData.internalLinks.length > 5 ? `\n  +${pageData.internalLinks.length - 5} more links` : ''}
    ` : '';

    // Build optimized site structure information
    const siteStructureInfo = siteStructure ? `
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

    const prompt = `Analyze this ${businessContext.industry} webpage and provide 4-8 actionable SEO improvements.

URL: ${url}
Title: ${pageData.title || 'Missing'} (${pageData.title?.length || 0} chars)
Meta Description: ${pageData.metaDescription || 'Missing'} (${pageData.metaDescription?.length || 0} chars)
H1: ${pageData.headings.find((h: any) => h.level === 1)?.text || 'Missing'}

Business Context:
- Industry: ${businessContext.industry}
- Business Type: ${businessContext.businessType}
- Target Audience: ${businessContext.targetAudience}
- Main Services: ${businessContext.mainServices.join(', ') || 'Unknown'}
- Location: ${businessContext.location || 'Not specified'}${businessContext.isLocal ? ' (Local business)' : ''}

Content Analysis:
- Keywords: ${extractedKeywords.slice(0, 6).join(', ') || 'none'}
- Word count: ~${pageContent.split(/\s+/).length}
- Content type: ${businessContext.contentType}
- Images: ${pageData.images?.length || 0} total, ${pageData.images?.filter((img: any) => !img.alt).length || 0} missing alt text

${existingLinksAnalysis}

${siteStructureInfo}

Current Issues: ${pageData.issues.map((issue: any) => issue.title).join(', ') || 'None'}

${additionalInfo ? `Business Context: ${additionalInfo}` : ''}

Content Sample: ${pageData.paragraphs && pageData.paragraphs.length > 0 ? 
  pageData.paragraphs.slice(0, 2).join(' ').substring(0, 800) + '...' : 'No content'}

Provide specific recommendations with exact examples:
- Title/meta improvements with character counts (optimized for ${businessContext.targetAudience})
- Internal link suggestions with anchor text
- Keyword targeting for ${businessContext.industry} targeting ${businessContext.targetAudience}
- Service-specific content optimization for: ${businessContext.mainServices.join(', ')}
- Local SEO recommendations (if applicable for ${businessContext.location || 'location'})
- Specific URLs for new internal links

JSON format: {"suggestions": ["suggestion 1", "suggestion 2", ...]}
Language: Match page content language.`;
    console.log(prompt)
    const response = await openai.chat.completions.create({
      model: "gpt-4.1", //Newest model as of 2025
      messages: [
        { 
          role: "system", 
          content: "You are an expert SEO consultant. Provide specific, actionable suggestions with concrete examples. Always include exact character counts for titles/descriptions, specific keywords to target, and exact URLs for internal linking recommendations. Be detailed and specific, not generic. Match your response language to the page content language."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent, focused suggestions
      max_tokens: 1200 // Increased for more detailed suggestions
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return [];
    }

    // Parse the JSON response
    const result = JSON.parse(content);

    // Ensure we have an array of suggestions
    let suggestions: string[] = [];
    if (Array.isArray(result.suggestions)) {
      suggestions = result.suggestions;
    } else if (result.suggestions) {
      suggestions = [result.suggestions];
    } else if (Array.isArray(result)) {
      suggestions = result;
    }

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
      model: "gpt-4.1",
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
      model: "gpt-4.1",
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