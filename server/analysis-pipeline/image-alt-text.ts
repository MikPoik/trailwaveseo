/**
 * Image Alt Text Generation Module
 * Handles AI-powered alt text generation for images
 */

import OpenAI from "openai";
import axios from "axios";

// the newest OpenAI model is "gpt-4.1" which was released on 14.4.2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache for storing generated alt text to avoid regenerating for the same images
const altTextCache = new Map<string, string>();

/**
 * Generate alt text for an image using OpenAI Vision API
 * @param imageUrl URL of the image
 * @param pageContext Context about the page where the image appears
 * @returns Generated alt text
 */
export async function generateImageAltText(imageUrl: string, pageContext: {
  url: string;
  title?: string;
  headings?: Array<{ level: number; text: string }>;
  businessType?: string;
  industry?: string;
}): Promise<string> {
  try {
    // Check cache first
    const cacheKey = `${imageUrl}-${pageContext.url}`;
    if (altTextCache.has(cacheKey)) {
      return altTextCache.get(cacheKey)!;
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping alt text generation");
      return '';
    }

    // Try to fetch the image to check if it's accessible
    let imageBase64: string;
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)'
        }
      });
      
      const imageBuffer = Buffer.from(response.data);
      imageBase64 = imageBuffer.toString('base64');
      
      // Check if image is too large (OpenAI has limits)
      if (imageBase64.length > 20000000) { // ~20MB base64 limit
        console.warn(`Image too large for analysis: ${imageUrl}`);
        return '';
      }
    } catch (error) {
      console.warn(`Could not fetch image for alt text generation: ${imageUrl}`, error);
      return '';
    }

    const contextInfo = `
Page: ${pageContext.url}
Title: ${pageContext.title || 'Unknown'}
Business: ${pageContext.businessType || 'Unknown'} in ${pageContext.industry || 'Unknown'} industry
Main headings: ${pageContext.headings?.slice(0, 3).map(h => h.text).join(', ') || 'None'}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use vision-capable model
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Generate a concise, descriptive alt text for this image. Consider the page context:
${contextInfo}

Requirements:
- 125 characters or less
- Describe what you see, not what you think it means
- Include relevant details for accessibility
- Consider the business context
- Be specific and helpful for screen readers

Return only the alt text, no extra formatting.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_completion_tokens: 150,
      temperature: 0.3
    });

    const altText = response.choices[0].message.content?.trim() || '';
    
    // Cache the result
    if (altText) {
      altTextCache.set(cacheKey, altText);
    }

    return altText;

  } catch (error) {
    console.error(`Error generating alt text for ${imageUrl}:`, error);
    return '';
  }
}

/**
 * Generate alt text for multiple images in batch
 * @param images Array of images with context
 * @returns Array of results with generated alt text
 */
export async function generateBatchImageAltText(images: Array<{
  src: string;
  context: {
    url: string;
    title?: string;
    headings?: Array<{ level: number; text: string }>;
    businessType?: string;
    industry?: string;
  };
}>): Promise<Array<{ src: string; altText: string; }>> {

  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not set, skipping batch alt text generation");
    return images.map(img => ({ src: img.src, altText: '' }));
  }

  console.log(`Generating alt text for ${images.length} images...`);

  // Process images in parallel but with concurrency limit
  const BATCH_SIZE = 3; // Limit concurrent requests
  const results: Array<{ src: string; altText: string; }> = [];

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (img) => {
      try {
        const altText = await generateImageAltText(img.src, img.context);
        return { src: img.src, altText };
      } catch (error) {
        console.error(`Failed to generate alt text for ${img.src}:`, error);
        return { src: img.src, altText: '' };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < images.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`Generated alt text for ${results.filter(r => r.altText).length}/${images.length} images`);
  return results;
}