/**
 * Competitor Insights Generation Module
 * Handles AI-powered competitive analysis and insights
 */

import OpenAI from "openai";

// the newest OpenAI model is "gpt-4.1" which was released on 14.4.2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate competitor insights using OpenAI for competitive analysis
 * @param mainAnalysis Analysis of the main website
 * @param competitorAnalyses Array of competitor analysis results
 * @param userInput Additional context from user
 * @returns Competitor insights and recommendations
 */
export async function generateCompetitorInsights(
  mainAnalysis: any,
  competitorAnalyses: any[],
  userInput?: string
): Promise<{
  insights: string[];
  strategicRecommendations: string[];
  competitiveAdvantages: string[];
  threats: string[];
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, skipping competitor insights generation");
      return {
        insights: [],
        strategicRecommendations: [],
        competitiveAdvantages: [],
        threats: []
      };
    }

    // Prepare analysis data for AI processing
    const mainSite = {
      domain: mainAnalysis.domain,
      pages: mainAnalysis.pages?.length || 0,
      avgWordsPerPage: calculateAverageWords(mainAnalysis.pages || []),
      techScore: mainAnalysis.enhancedInsights?.technicalAnalysis?.overallScore || 0,
      contentScore: mainAnalysis.enhancedInsights?.contentQualityAnalysis?.overallScore || 0,
      linkScore: mainAnalysis.enhancedInsights?.linkArchitectureAnalysis?.overallScore || 0,
      performanceScore: mainAnalysis.enhancedInsights?.performanceAnalysis?.overallScore || 0
    };

    const competitors = competitorAnalyses.map(comp => ({
      domain: comp.domain,
      pages: comp.pages?.length || 0,
      avgWordsPerPage: calculateAverageWords(comp.pages || []),
      techScore: comp.enhancedInsights?.technicalAnalysis?.overallScore || 0,
      contentScore: comp.enhancedInsights?.contentQualityAnalysis?.overallScore || 0,
      linkScore: comp.enhancedInsights?.linkArchitectureAnalysis?.overallScore || 0,
      performanceScore: comp.enhancedInsights?.performanceAnalysis?.overallScore || 0
    }));

    const prompt = `Analyze the competitive landscape and provide strategic insights for ${mainSite.domain}.

MAIN WEBSITE: ${mainSite.domain}
- Pages: ${mainSite.pages}
- Avg Words/Page: ${mainSite.avgWordsPerPage}
- Technical SEO: ${mainSite.techScore}/100
- Content Quality: ${mainSite.contentScore}/100
- Link Architecture: ${mainSite.linkScore}/100
- Performance: ${mainSite.performanceScore}/100

COMPETITORS:
${competitors.map(comp => `
${comp.domain}:
- Pages: ${comp.pages}
- Avg Words/Page: ${comp.avgWordsPerPage}
- Technical SEO: ${comp.techScore}/100
- Content Quality: ${comp.contentScore}/100
- Link Architecture: ${comp.linkScore}/100
- Performance: ${comp.performanceScore}/100`).join('\n')}

${userInput ? `Additional Context: ${userInput}` : ''}

Provide competitive analysis with:
1. Key insights about competitive positioning
2. Strategic recommendations for improvement
3. Competitive advantages to leverage
4. Potential threats to address

Focus on actionable insights with specific score comparisons and recommendations.

Respond in JSON format:
{
  "insights": ["insight1", "insight2", ...],
  "strategicRecommendations": ["rec1", "rec2", ...],
  "competitiveAdvantages": ["adv1", "adv2", ...],
  "threats": ["threat1", "threat2", ...]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "You are a competitive SEO strategist. Analyze website performance data to provide actionable competitive insights. Focus on specific score comparisons and concrete recommendations."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_completion_tokens: 1200
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      insights: result.insights || [],
      strategicRecommendations: result.strategicRecommendations || [],
      competitiveAdvantages: result.competitiveAdvantages || [],
      threats: result.threats || []
    };

  } catch (error) {
    console.error("Error generating competitor insights:", error);
    return {
      insights: ["Unable to generate competitive insights due to analysis error."],
      strategicRecommendations: ["Focus on improving overall SEO scores to compete more effectively."],
      competitiveAdvantages: ["Conduct manual competitive analysis to identify opportunities."],
      threats: ["Monitor competitors regularly for strategic changes."]
    };
  }
}

/**
 * Helper function to calculate average word count across pages
 */
function calculateAverageWords(pages: any[]): number {
  if (!pages || pages.length === 0) return 0;
  
  const totalWords = pages.reduce((sum, page) => {
    return sum + (page.wordCount || 0);
  }, 0);
  
  return Math.round(totalWords / pages.length);
}