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
}, additionalInfo?: string): Promise<string[]> {
  try {
    // If no OpenAI API key is set, return empty suggestions
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping AI suggestions");
      return [];
    }

    // Extract keywords from page content for better analysis
    const extractKeywords = (text: string): string[] => {
      if (!text) return [];
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'more', 'very', 'what', 'know', 'just', 'first', 'into', 'over', 'think', 'also', 'back', 'after', 'work', 'well', 'want', 'because', 'good', 'water', 'through', 'right', 'where', 'come', 'could', 'would', 'should', 'about', 'make', 'than', 'only', 'other', 'many', 'some', 'like', 'when', 'here', 'them', 'your', 'there'].includes(word));

      const wordFreq = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
    };

    // Analyze page content for keywords
    const pageContent = [
      pageData.title || '',
      pageData.metaDescription || '',
      pageData.headings.map((h: any) => h.text).join(' '),
      ...(pageData.paragraphs || [])
    ].join(' ');

    const extractedKeywords = extractKeywords(pageContent);
    const metaKeywords = pageData.metaKeywords || [];

    // Analyze existing internal links quality
    const existingLinksAnalysis = pageData.internalLinks ? `

      Current Internal Links Analysis (${pageData.internalLinks.length} links found):
      ${pageData.internalLinks.map(link => {
        const linkText = link.text || 'No anchor text';
        const linkUrl = link.href;
        const isGeneric = ['click here', 'read more', 'learn more', 'here', 'this', 'link', 'more info'].some(generic => 
          linkText.toLowerCase().includes(generic)
        );
        const hasKeywords = extractedKeywords.some(keyword => 
          linkText.toLowerCase().includes(keyword.toLowerCase())
        );
        return `- "${linkText}" → ${linkUrl}
          Quality: ${isGeneric ? 'Generic (needs improvement)' : hasKeywords ? 'Good (keyword-rich)' : 'Neutral'}`;
      }).join('\n')}
    ` : '';

    // Build enhanced site structure information
    const siteStructureInfo = siteStructure ? `

      Website Structure Analysis (${siteStructure.allPages.length} total pages):

      Main Pages:
      ${siteStructure.allPages.slice(0, 15).map(page => {
        const h1 = page.headings.find(h => h.level === 1)?.text || '';
        const pageKeywords = extractKeywords([page.title || '', h1].join(' ')).slice(0, 3);
        const urlPath = new URL(page.url).pathname;
        const category = urlPath.split('/')[1] || 'root';
        const isAlreadyLinked = pageData.internalLinks?.some(link => link.href.includes(page.url)) || false;
        return `- ${page.url}
          Category: ${category}
          Title: "${page.title || 'No title'}"
          H1: "${h1 || 'No H1'}"
          Key topics: ${pageKeywords.join(', ') || 'none detected'}
          Already linked: ${isAlreadyLinked ? 'Yes' : 'No'}`;
      }).join('\n')}

      ${siteStructure.allPages.length > 15 ? `... and ${siteStructure.allPages.length - 15} more pages` : ''}

      Related Pages for Internal Linking:
      ${siteStructure.allPages
        .filter(page => page.url !== url) // Exclude current page
        .map(page => {
          const pageKeywords = extractKeywords([page.title || '', page.headings.find(h => h.level === 1)?.text || ''].join(' '));
          const commonKeywords = extractedKeywords.filter(keyword => pageKeywords.includes(keyword));
          const isAlreadyLinked = pageData.internalLinks?.some(link => link.href.includes(page.url)) || false;
          return { page, relevanceScore: commonKeywords.length, commonKeywords, isAlreadyLinked };
        })
        .filter(item => item.relevanceScore > 0)
        .sort((a, b) => {
          // Prioritize unlinked pages with high relevance
          if (a.isAlreadyLinked && !b.isAlreadyLinked) return 1;
          if (!a.isAlreadyLinked && b.isAlreadyLinked) return -1;
          return b.relevanceScore - a.relevanceScore;
        })
        .slice(0, 10)
        .map(item => `- ${item.page.title || 'Untitled'} (${item.page.url}) - Common topics: ${item.commonKeywords.join(', ')} ${item.isAlreadyLinked ? '[Already linked]' : '[Not linked - opportunity]'}`)
        .join('\n')}
    ` : '';

    // Build comprehensive content analysis
    const contentAnalysis = `
      Content Analysis:
      - Word count: ~${pageContent.split(/\s+/).length} words
      - Content keywords detected: ${extractedKeywords.slice(0, 8).join(', ') || 'none'}
      - Meta keywords: ${metaKeywords.length > 0 ? metaKeywords.join(', ') : 'none set'}
      - Heading structure: ${pageData.headings.map((h: any) => `H${h.level}`).join(', ') || 'none'}
      - Images: ${pageData.images?.length || 0} total, ${pageData.images?.filter((img: any) => !img.alt).length || 0} missing alt text
      - Internal links: ${pageData.internalLinks?.length || 0} internal links found
      - Page type: ${url.includes('/blog/') ? 'Blog post' : url.includes('/product/') ? 'Product page' : url.includes('/service/') ? 'Service page' : url.includes('/about') ? 'About page' : url.includes('/contact') ? 'Contact page' : 'General page'}
    `;

    const prompt = `
      I need specific, actionable SEO improvement suggestions for this webpage. Provide concrete examples and specific recommendations.

      URL: ${url}

      Current SEO Elements:
      - Title: ${pageData.title || 'Missing'}
      - Meta Description: ${pageData.metaDescription || 'Missing'}
      - H1 Heading: ${pageData.headings.find((h: any) => h.level === 1)?.text || 'Missing'}
      - All Headings: ${pageData.headings.map((h: any) => `H${h.level}: "${h.text}"`).join(' | ') || 'None'}

      ${contentAnalysis}

      ${existingLinksAnalysis}

      Page Content Sample:
      ${pageData.paragraphs && pageData.paragraphs.length > 0 ? 
        pageData.paragraphs.slice(0, 5).join('\n\n').substring(0, 1200) + 
        (pageData.paragraphs.join('').length > 1200 ? '...' : '') 
        : 'No content available'}

      ${siteStructureInfo}

      Current Issues Identified:
      ${pageData.issues.map((issue: any) => `- ${issue.title}: ${issue.description}`).join('\n')}

      ${additionalInfo ? `
      Additional Context from User:
      ${additionalInfo}

      Please incorporate this additional context into your analysis and suggestions. Use any keywords, business goals, target audience information, or other relevant details provided to make your recommendations more targeted and specific.
      ` : ''}

      Please provide 4-8 specific, actionable SEO improvements with concrete examples:

      1. Include specific keyword suggestions based on the content analysis
      2. Provide exact title and meta description examples (with character counts)
      3. Suggest specific heading improvements with examples
      4. Analyze existing internal links and suggest improvements:
         - Identify generic anchor text that should be replaced with keyword-rich alternatives
         - Recommend new internal links to relevant unlinked pages
         - Suggest removing poor-quality internal links if any exist
      5. Suggest content enhancements with specific topics,sections or keywords to add
      6. Provide image optimization suggestions if applicable

      Each suggestion should be:
      - Specific and actionable (not generic advice)
      - Include concrete examples when possible
      - Reference actual page content, keywords, or site structure
      - Specify exact character counts for titles/descriptions
      - Include specific URLs for internal links when suggesting them
      - For internal link improvements, provide exact current and suggested anchor text

      Format as JSON: {"suggestions": ["suggestion 1", "suggestion 2", ...]}

      Examples of good suggestions:
      - "Optimize title to 'Keyword-Rich Title Here' (52 characters) instead of current '${pageData.title}' to better target the keywords: ${extractedKeywords.slice(0, 3).join(', ')}"
      - "Replace generic anchor text 'click here' with keyword-rich 'learn about sustainable energy solutions' for the link to [specific URL]"
      - "Add internal links to '${siteStructure?.allPages[0]?.title}' (${siteStructure?.allPages[0]?.url}) using anchor text '${extractedKeywords[0] || 'relevant keyword'}' in the second paragraph"
      - "Remove or improve the internal link to [URL] as it's not topically relevant to this page's content about ${extractedKeywords[0] || 'main topic'}"
      - "Include the keyword '${extractedKeywords[0] || 'primary-keyword'}' in your H1 heading for better keyword targeting"
      - ...

      Respond in the same language as the page content (detected from title/headings).
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an expert SEO consultant. Provide specific, actionable suggestions with concrete examples. Always include exact character counts for titles/descriptions, specific keywords to target, and exact URLs for internal linking recommendations. Be detailed and specific, not generic."
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