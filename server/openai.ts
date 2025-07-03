import OpenAI from "openai";
import axios from "axios";
import crypto from "crypto";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache for storing generated alt text to avoid regenerating for the same images
const altTextCache = new Map<string, string>();

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
 * Generate SEO improvement suggestions using OpenAI
 * @param url URL of the page being analyzed
 * @param pageData Extracted SEO data from the page
 * @param siteStructure Optional site structure data for internal linking suggestions
 * @returns Array of improvement suggestions
 */
export async function generateSeoSuggestions(url: string, pageData: any, siteStructure?: {
  allPages: Array<{
    url: string;
    title?: string;
    headings: Array<{ level: number; text: string }>;
  }>;
}): Promise<string[]> {
  try {
    // If no OpenAI API key is set, return empty suggestions
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping AI suggestions");
      return [];
    }

    // Build site structure information for internal linking suggestions
    const siteStructureInfo = siteStructure ? `
      
      Site Structure (for internal linking suggestions):
      ${siteStructure.allPages.slice(0, 20).map(page => {
        const h1 = page.headings.find(h => h.level === 1)?.text || '';
        return `- ${page.url} | Title: "${page.title || 'No title'}" | H1: "${h1 || 'No H1'}"`;
      }).join('\n')}
      ${siteStructure.allPages.length > 20 ? `\n... and ${siteStructure.allPages.length - 20} more pages` : ''}
    ` : '';

    const prompt = `
      I need SEO improvement suggestions for a webpage.
      
      URL: ${url}
      
      Current SEO elements:
      - Title: ${pageData.title || 'None'}
      - Meta Description: ${pageData.metaDescription || 'None'}
      - H1 Heading: ${pageData.headings.find((h: any) => h.level === 1)?.text || 'None'}
      - Other Headings: ${pageData.headings.filter((h: any) => h.level !== 1).map((h: any) => `H${h.level}: ${h.text}`).join(', ') || 'None'}
      - Page Content: ${pageData.paragraphs && pageData.paragraphs.length > 0 ? pageData.paragraphs.slice(0, 3).join(' ').substring(0, 500) + '...' : 'No content available'}
      ${siteStructureInfo}
      
      Issues identified:
      ${pageData.issues.map((issue: any) => `- ${issue.title}: ${issue.description}`).join('\n')}
      
      Please provide 3-5 specific, actionable suggestions to improve this page's SEO. 
      Each suggestion should be concise (1-2 sentences) and directly related to fixing the identified issues.
      ${siteStructure ? 'When appropriate, suggest specific internal links to relevant pages from the site structure to improve SEO and user navigation.' : ''}
      
      Format your response as a JSON array of strings. Example:
      ["Add a unique and descriptive title tag between 50-60 characters, such as ...", "Include primary keywords in your H1 heading, such as ...", "Add internal links to relevant pages like [Page Title](URL) to improve user navigation and SEO"]
      Respond with the same language as the website's Meta Description and H1 heading is.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "You are an SEO expert assistant. Provide concise, actionable SEO improvement suggestions. Respond with the same language as the website's Meta Description and H1 heading is." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 600
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return [];
    }

    // Parse the JSON response
    const result = JSON.parse(content);
    
    // Ensure we have an array of suggestions
    if (Array.isArray(result.suggestions)) {
      return result.suggestions;
    } else if (result.suggestions) {
      return [result.suggestions];
    } else if (Array.isArray(result)) {
      return result;
    }
    
    return [];
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
      
      Respond with a JSON object in this format:
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
        { role: "system", content: "You are an SEO expert assistant specializing in content uniqueness analysis. Provide clear, actionable recommendations for improving content." },
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
