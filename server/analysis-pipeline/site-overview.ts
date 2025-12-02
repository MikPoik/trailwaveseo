/**
 * Site Overview Analysis Module  
 * Handles AI-powered business context and site structure analysis
 */

import OpenAI from "openai";

// the newest OpenAI model is "gpt-4.1" which was released on 14.4.2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    // Build a comprehensive prompt with rich context
    const pagesSummary = siteStructure.allPages.slice(0, 15).map((page, index) => {
      const headingText = page.headings.map(h => h.text).join(', ').substring(0, 300);
      const paragraphText = page.paragraphs?.slice(0, 5).join(' ').substring(0, 500) || '';

      return `Page ${index + 1}: ${page.url}
Title: ${page.title || 'No title'}
Meta: ${page.metaDescription || 'No description'}
Headings: ${headingText || 'No headings'}
Content: ${paragraphText || 'No content'}`;
    }).join('\n\n');

    const prompt = `Analyze this website thoroughly and provide detailed business context. You MUST provide specific, meaningful insights - do NOT use "Unknown" or generic placeholders.

${additionalInfo ? `USER PROVIDED CONTEXT: ${additionalInfo}\n\n` : ''}

WEBSITE DATA (${siteStructure.allPages.length} pages analyzed):
${pagesSummary}

REQUIRED: Analyze the content above and provide a JSON response with specific, actionable insights:
{
  "businessType": "Specific business model (e.g., E-commerce Store, SaaS Platform, Digital Agency, Content Publisher, Local Service Business, Portfolio Site, etc.)",
  "industry": "Specific industry vertical (e.g., Technology, Healthcare, Real Estate, Fashion, Food & Beverage, Professional Services, etc.)",
  "targetAudience": "Specific target market (e.g., Small Business Owners, Millennials, B2B Enterprise, Local Consumers, etc.)",
  "mainServices": ["List 3-5 specific services or offerings based on the content"],
  "location": "If local business, specify location; otherwise null",
  "siteStructureAnalysis": "2-3 sentence analysis of navigation, page organization, and user journey",
  "contentStrategy": ["3-4 specific observations about content approach, tone, and focus"],
  "overallRecommendations": ["3-5 specific, actionable SEO and content recommendations"]
}

IMPORTANT: Base your analysis on the actual page titles, headings, and content provided. Make informed inferences rather than leaving fields empty or using "Unknown".`;

    // Make the OpenAI API call
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing websites to detect their business type, industry, target audience, and strategic positioning. Always provide specific, actionable analysis based on the content provided. Never use 'Unknown' - always make an informed inference based on the available data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("No content in OpenAI response for site overview");
      throw new Error("No content in OpenAI response");
    }

    //console.log("Site overview AI response:", content);
    const result = JSON.parse(content);

    // Validate that we got meaningful results
    if (!result.businessType || result.businessType === 'Unknown') {
      console.warn("OpenAI returned Unknown business type, response:", result);
    }

    return {
      businessType: result.businessType || 'General Website',
      industry: result.industry || 'General', 
      targetAudience: result.targetAudience || 'General Public',
      mainServices: Array.isArray(result.mainServices) ? result.mainServices : [],
      location: result.location || undefined,
      siteStructureAnalysis: result.siteStructureAnalysis || 'Analysis unavailable',
      contentStrategy: Array.isArray(result.contentStrategy) ? result.contentStrategy : [],
      overallRecommendations: Array.isArray(result.overallRecommendations) ? result.overallRecommendations : []
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