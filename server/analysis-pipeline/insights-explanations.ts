/**
 * Enhanced Insights Explanations Module
 * Generates AI-powered explanations for modular analysis scores
 */

import OpenAI from "openai";

// the newest OpenAI model is "gpt-4.1" which was released on 14.4.2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate AI explanations for each enhanced insights area
 */
export async function generateInsightsExplanations(
  domain: string,
  technicalAnalysis: any,
  contentQualityAnalysis: any,
  linkArchitectureAnalysis: any,
  performanceAnalysis: any,
  pages: any[]
): Promise<{
  technicalExplanation: string;
  contentQualityExplanation: string;
  linkArchitectureExplanation: string;
  performanceExplanation: string;
}> {

  try {
    console.log(`Generating AI explanations for enhanced insights on ${domain}...`);

    // Extract specific metrics from each analysis area for detailed insights
    const technicalDetails = {
      score: technicalAnalysis.overallScore,
      coreWebVitals: technicalAnalysis.coreWebVitals?.score || 0,
      mobileScore: technicalAnalysis.mobileOptimization?.mobileScore || 0,
      securityScore: technicalAnalysis.securityAnalysis?.securityScore || 0,
      technicalScore: technicalAnalysis.technicalElements?.technicalScore || 0,
      httpsEnabled: technicalAnalysis.securityAnalysis?.httpsEnabled,
      hasViewportMeta: technicalAnalysis.mobileOptimization?.hasViewportMeta,
      xmlSitemap: technicalAnalysis.technicalElements?.xmlSitemap,
      recommendations: technicalAnalysis.recommendations?.length || 0
    };

    const contentDetails = {
      score: contentQualityAnalysis.overallHealth?.combinedScore || 0,
      contentScore: contentQualityAnalysis.overallHealth?.contentScore || 0,
      keywordScore: contentQualityAnalysis.overallHealth?.keywordScore || 0,
      qualityScore: contentQualityAnalysis.overallHealth?.qualityScore || 0,
      uniquenessScore: contentQualityAnalysis.contentUniqueness?.uniquenessScore || 0,
      totalDuplicates: contentQualityAnalysis.contentUniqueness?.totalDuplicates || 0,
      pagesAnalyzed: contentQualityAnalysis.contentUniqueness?.pagesAnalyzed || 0,
      keywordHealthScore: contentQualityAnalysis.keywordQuality?.healthScore || 0,
      readabilityImpact: contentQualityAnalysis.keywordQuality?.readabilityImpact || 'Unknown',
      affectedPages: contentQualityAnalysis.keywordQuality?.affectedPages || 0,
      readabilityScore: contentQualityAnalysis.qualityScores?.averageScores?.readability || 0,
      userValueScore: contentQualityAnalysis.qualityScores?.averageScores?.userValue || 0,
      seoEffectivenessScore: contentQualityAnalysis.qualityScores?.averageScores?.seoEffectiveness || 0,
      recommendations: contentQualityAnalysis.strategicRecommendations?.length || 0
    };

    const linkDetails = {
      score: linkArchitectureAnalysis.overallScore,
      totalInternalLinks: linkArchitectureAnalysis.linkDistribution?.totalInternalLinks || 0,
      averageLinksPerPage: linkArchitectureAnalysis.linkDistribution?.averageLinksPerPage || 0,
      orphanPages: linkArchitectureAnalysis.linkDistribution?.orphanPages?.length || 0,
      anchorTextScore: linkArchitectureAnalysis.anchorTextAnalysis?.anchorTextScore || 0,
      navigationScore: linkArchitectureAnalysis.navigationStructure?.navigationScore || 0,
      genericAnchors: linkArchitectureAnalysis.anchorTextAnalysis?.genericAnchors || 0,
      recommendations: linkArchitectureAnalysis.recommendations?.length || 0
    };

    const performanceDetails = {
      score: performanceAnalysis.overallScore,
      imageOptimization: performanceAnalysis.resourceOptimization?.imageOptimization || 0,
      totalImages: performanceAnalysis.resourceOptimization?.resourceCount?.images || 0,
      loadingScore: performanceAnalysis.loadingPatterns?.loadingScore || 0,
      uxScore: performanceAnalysis.userExperienceMetrics?.uxScore || 0,
      accessibilityScore: performanceAnalysis.userExperienceMetrics?.contentAccessibility || 0,
      recommendations: performanceAnalysis.recommendations?.length || 0
    };

    const prompt = `Provide a comprehensive SEO analysis explanation for this website analysis. IMPORTANT: Write your entire response in the EXACT same language as the website content. Look at the page titles, headings, and content to determine the language, then write your analysis in that same language.

Analysis data:
WEBSITE: ${domain} (${pages.length} pages analyzed)

TECHNICAL SEO DATA (Score: ${technicalDetails.score}/100):
- Core Web Vitals: ${technicalDetails.coreWebVitals}/100
- Mobile Optimization: ${technicalDetails.mobileScore}/100 (${technicalDetails.hasViewportMeta ? 'Has' : 'Missing'} viewport meta tag)
- Security: ${technicalDetails.securityScore}/100 (HTTPS: ${technicalDetails.httpsEnabled ? 'Enabled' : 'Disabled'})
- Technical Elements: ${technicalDetails.technicalScore}/100 (XML Sitemap: ${technicalDetails.xmlSitemap ? 'Present' : 'Missing'})
- Issues found: ${technicalDetails.recommendations} recommendations

CONTENT QUALITY DATA (Score: ${contentDetails.score}/100):
- Content uniqueness: ${contentDetails.uniquenessScore}/100 (${contentDetails.totalDuplicates} duplicates across ${contentDetails.pagesAnalyzed} pages)
- Keyword quality: ${contentDetails.keywordHealthScore}/100 (readability impact: ${contentDetails.readabilityImpact})
- Content readability: ${contentDetails.readabilityScore}/100
- User value score: ${contentDetails.userValueScore}/100
- SEO effectiveness: ${contentDetails.seoEffectivenessScore}/100
- Issues found: ${contentDetails.recommendations} recommendations

LINK ARCHITECTURE DATA (Score: ${linkDetails.score}/100):
- Total internal links: ${linkDetails.totalInternalLinks} (${linkDetails.averageLinksPerPage.toFixed(1)} per page)
- Orphan pages: ${linkDetails.orphanPages} pages with no incoming links
- Anchor text quality: ${linkDetails.anchorTextScore}/100 (${Math.round(linkDetails.genericAnchors)}% generic anchors)
- Navigation structure: ${linkDetails.navigationScore}/100
- Issues found: ${linkDetails.recommendations} recommendations

PERFORMANCE DATA (Score: ${performanceDetails.score}/100):
- Image optimization: ${performanceDetails.imageOptimization}/100 (${performanceDetails.totalImages} total images)
- Loading patterns: ${performanceDetails.loadingScore}/100
- User experience: ${performanceDetails.uxScore}/100
- Accessibility: ${performanceDetails.accessibilityScore}/100
- Issues found: ${performanceDetails.recommendations} recommendations

For each area, provide a specific explanation (2-3 sentences) that:
1. States the exact reason for the score using the provided data
2. Identifies the specific biggest problem with numbers
3. Gives one concrete, actionable fix with expected impact

Please respond with a JSON object in the following format:
{
  "technicalExplanation": "Your specific Technical SEO explanation with actual data...",
  "contentQualityExplanation": "Your specific Content Quality explanation with actual data...",
  "linkArchitectureExplanation": "Your specific Link Architecture explanation with actual data...", 
  "performanceExplanation": "Your specific Performance explanation with actual data..."
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1", // the newest OpenAI model is "gpt-4.1" which was released on 14.4.2025. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: "You are an expert SEO consultant providing strategic insights. Your explanations should be clear, actionable, and focused on business impact. Use data to support your recommendations and provide specific next steps. IMPORTANT: Always write your response in the EXACT same language as the website content being analyzed. Match the language of the page titles, headings, and content exactly."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_completion_tokens: 1200
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    console.log("Generated AI explanations for enhanced insights");

    return {
      technicalExplanation: result.technicalExplanation || `Technical SEO scored ${technicalAnalysis.overallScore}/100. Focus on improving technical elements for better search engine visibility.`,
      contentQualityExplanation: result.contentQualityExplanation || `Content Quality scored ${contentQualityAnalysis.overallHealth?.combinedScore || 0}/100. Enhance content depth and optimization for better engagement.`,
      linkArchitectureExplanation: result.linkArchitectureExplanation || `Link Architecture scored ${linkArchitectureAnalysis.overallScore}/100. Improve internal linking structure for better navigation.`,
      performanceExplanation: result.performanceExplanation || `Performance scored ${performanceAnalysis.overallScore}/100. Optimize loading speed and user experience metrics.`
    };

  } catch (error) {
    console.error('Error generating insights explanations:', error);
    return {
      technicalExplanation: `Technical SEO scored ${technicalAnalysis.overallScore}/100. Focus on improving technical elements for better search engine visibility.`,
      contentQualityExplanation: `Content Quality scored ${contentQualityAnalysis.overallHealth?.combinedScore || 0}/100. Enhance content depth and optimization for better engagement.`,
      linkArchitectureExplanation: `Link Architecture scored ${linkArchitectureAnalysis.overallScore}/100. Improve internal linking structure for better navigation.`,
      performanceExplanation: `Performance scored ${performanceAnalysis.overallScore}/100. Optimize loading speed and user experience metrics.`
    };
  }
}