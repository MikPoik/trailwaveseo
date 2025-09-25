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

IMPORTANT: Write your analysis in the same language as the website content. Match the website's language exactly.

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
      max_completion_tokens: 1500
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