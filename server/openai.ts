import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate SEO improvement suggestions using OpenAI
 * @param url URL of the page being analyzed
 * @param pageData Extracted SEO data from the page
 * @returns Array of improvement suggestions
 */
export async function generateSeoSuggestions(url: string, pageData: any): Promise<string[]> {
  try {
    // If no OpenAI API key is set, return empty suggestions
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping AI suggestions");
      return [];
    }

    const prompt = `
      I need SEO improvement suggestions for a webpage.
      
      URL: ${url}
      
      Current SEO elements:
      - Title: ${pageData.title || 'None'}
      - Meta Description: ${pageData.metaDescription || 'None'}
      - H1 Heading: ${pageData.headings.find(h => h.level === 1)?.text || 'None'}
      - Other Headings: ${pageData.headings.filter(h => h.level !== 1).map(h => `H${h.level}: ${h.text}`).join(', ') || 'None'}
      
      Issues identified:
      ${pageData.issues.map(issue => `- ${issue.title}: ${issue.description}`).join('\n')}
      
      Please provide 3-5 specific, actionable suggestions to improve this page's SEO. 
      Each suggestion should be concise (1-2 sentences) and directly related to fixing the identified issues.
      
      Format your response as a JSON array of strings. Example:
      ["Add a unique and descriptive title tag between 50-60 characters.", "Include primary keywords in your H1 heading."]
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an SEO expert assistant. Provide concise, actionable SEO improvement suggestions." },
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
