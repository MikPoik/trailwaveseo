/**
 * Design analysis service using AI to analyze page screenshots
 * Generates layout and design recommendations from visual analysis
 */

import OpenAI from "openai";
import type {
  ScreenshotData,
  DesignAnalysis,
  DesignRecommendation,
} from "../../shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze page design from screenshot using AI vision
 */
export async function analyzePageDesign(
  screenshotData: ScreenshotData,
  pageTitle?: string,
  pageDescription?: string,
): Promise<DesignAnalysis> {
  if (!screenshotData.screenshotUrl || screenshotData.error) {
    return {
      overallScore: 0,
      screenshotData,
      recommendations: [
        {
          category: "layout",
          severity: "critical",
          title: "Screenshot Unavailable",
          description: "Unable to capture page screenshot for design analysis",
          recommendation: "Ensure the page loads correctly and try again",
          expectedImpact:
            "Cannot provide visual design recommendations without screenshot",
          implementation: "Check page accessibility and loading performance",
        },
      ],
      strengths: [],
      weaknesses: ["Screenshot capture failed"],
      summary: "Design analysis unavailable due to screenshot capture error",
    };
  }

  try {
    console.log(`Analyzing design for: ${screenshotData.url}`);

    // Prepare context information
    const pageInfo =
      pageTitle || pageDescription
        ? `Page context: ${pageTitle ? `Title: "${pageTitle}". ` : ""}${pageDescription ? `Description: "${pageDescription}".` : ""}`
        : "";

    const prompt = `You are a UX/UI design expert analyzing a website screenshot. ${pageInfo}

Please analyze this webpage screenshot and provide detailed design recommendations focusing on:

1. **Layout & Visual Hierarchy**: How well organized is the content? Is there clear visual hierarchy?
2. **Navigation**: Is the navigation intuitive and accessible?
3. **Content Structure & Readability**: 
   - Are paragraphs appropriately positioned and spaced?
   - Do text blocks appear too dense or overwhelming?
   - Is there good balance between text and white space?
   - Are paragraphs too long without proper breaks?
   - Does the content flow naturally and encourage reading?
4. **Mobile Responsiveness**: Based on the layout, how well would this adapt to mobile?
5. **Accessibility**: Are there potential accessibility issues visible?
6. **Branding & Visual Appeal**: How consistent and appealing is the visual design? Include color, typography, and imagery.
7. **Brand Color Analysis & Emotional Impact**: 
   - What emotions and feelings do the color choices convey to users?
   - How do the colors align with brand perception (trustworthy, modern, professional, friendly, etc.)?
   - Is there good color harmony and visual cohesion?
   - Do the colors support the intended brand message and target audience?
   - Are there any cultural or psychological associations with the color palette?
8. **User Experience**: How user-friendly does the interface appear?

**You must respond with valid JSON only in this exact format:**

{
  "overallScore": 85,
  "recommendations": [
    {
      "category": "layout",
      "severity": "high", 
      "title": "Improve Visual Hierarchy",
      "description": "The main content areas lack clear visual separation and hierarchy",
      "recommendation": "Use consistent spacing, typography sizes, and color contrast to establish clear content hierarchy",
      "expectedImpact": "Better content organization will improve user engagement and conversion rates",
      "implementation": "Apply consistent margin/padding rules and establish a typography scale"
    }
  ],
  "strengths": [
    "Clean and modern design aesthetic",
    "Good use of white space in header area",
    "Professional color palette"
  ],
  "weaknesses": [
    "Inconsistent spacing between sections",
    "Call-to-action buttons could be more prominent"
  ],
  "summary": "The website has a solid foundation with a clean aesthetic, but would benefit from improved visual hierarchy and stronger call-to-action elements."
}

**Important requirements:**
- Provide 3-6 specific, actionable recommendations
- Score from 0-100 based on overall design quality
- Focus on practical, implementable suggestions
- Include both strengths (2-5 items) and weaknesses (2-5 items)
- Recommendations should have varied categories: layout, navigation, visual_hierarchy, accessibility, mobile_responsiveness, branding, content_structure, brand_color_psychology
- Severity levels: critical, high, medium, low
- Write response in same language as the page content if non-English
- Return ONLY valid JSON, no additional text
- **Write suggestions and analysis in the same language as the page content**

NOTE: due to automatic screenshot capture, page'stop  navigation menu might be showing in wrong position. Respond as the navigation menu is correctly placed on the page. Ignore possible Cookie consent banners or other temporary elements.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: screenshotData.screenshotUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_completion_tokens: 2000,
      temperature: 0.3,
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error("No analysis content received from OpenAI");
    }

    

    // Parse the JSON response
    let parsedAnalysis: any;
    try {
      // Clean the response in case there's any markdown formatting
      const cleanedResponse = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      parsedAnalysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.log('Raw response:', analysisText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate and structure the response
    const analysis = validateAndStructureAnalysis(parsedAnalysis, screenshotData);

    console.log(
      `Design analysis completed for ${screenshotData.url} - Score: ${analysis.overallScore}/100`,
    );
    return analysis;
  } catch (error) {
    console.error(`Failed to analyze design for ${screenshotData.url}:`, error);

    return {
      overallScore: 50, // Neutral score when analysis fails
      screenshotData,
      recommendations: [
        {
          category: "layout",
          severity: "medium",
          title: "Design Analysis Unavailable",
          description: "Unable to complete AI-powered design analysis",
          recommendation: "Manual review of page design is recommended",
          expectedImpact:
            "Cannot provide specific design insights without AI analysis",
          implementation:
            "Review page manually for layout, navigation, and visual hierarchy issues",
        },
      ],
      strengths: ["Screenshot captured successfully"],
      weaknesses: ["AI analysis failed"],
      summary: "Screenshot available but AI analysis could not be completed",
    };
  }
}

/**
 * Validate and structure the AI analysis response
 */
function validateAndStructureAnalysis(
  parsedAnalysis: any,
  screenshotData: ScreenshotData,
): DesignAnalysis {
  // Ensure overallScore is valid
  const overallScore = typeof parsedAnalysis.overallScore === 'number' 
    ? Math.min(100, Math.max(0, parsedAnalysis.overallScore))
    : 75;

  // Validate and structure recommendations
  const recommendations: DesignRecommendation[] = [];
  if (Array.isArray(parsedAnalysis.recommendations)) {
    parsedAnalysis.recommendations.forEach((rec: any) => {
      if (rec && typeof rec === 'object') {
        recommendations.push({
          category: validateCategory(rec.category),
          severity: validateSeverity(rec.severity),
          title: String(rec.title || 'Design Improvement').substring(0, 100),
          description: String(rec.description || '').substring(0, 300),
          recommendation: String(rec.recommendation || '').substring(0, 500),
          expectedImpact: String(rec.expectedImpact || 'Improves user experience').substring(0, 300),
          implementation: String(rec.implementation || 'Review and implement suggested changes').substring(0, 300),
        });
      }
    });
  }

  // Ensure we have at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      category: "layout",
      severity: "medium",
      title: "General Design Review",
      description: "Consider reviewing the overall design for improvements",
      recommendation: "Evaluate layout, typography, and visual hierarchy",
      expectedImpact: "Better design can improve user engagement",
      implementation: "Conduct a comprehensive design audit",
    });
  }

  // Validate strengths and weaknesses arrays
  const strengths = Array.isArray(parsedAnalysis.strengths) 
    ? parsedAnalysis.strengths.slice(0, 5).map((s: any) => String(s).substring(0, 200))
    : ["Professional appearance"];

  const weaknesses = Array.isArray(parsedAnalysis.weaknesses)
    ? parsedAnalysis.weaknesses.slice(0, 5).map((w: any) => String(w).substring(0, 200))
    : ["Could benefit from design improvements"];

  // Validate summary
  const summary = typeof parsedAnalysis.summary === 'string'
    ? parsedAnalysis.summary.substring(0, 500)
    : "Design analysis completed successfully.";

  return {
    overallScore,
    screenshotData,
    recommendations: recommendations.slice(0, 6), // Limit to 6 recommendations
    strengths,
    weaknesses,
    summary,
  };
}

/**
 * Validate recommendation category
 */
function validateCategory(category: any): DesignRecommendation["category"] {
  const validCategories = ["layout", "navigation", "visual_hierarchy", "accessibility", "mobile_responsiveness", "branding", "content_structure", "brand_color_psychology"];
  return validCategories.includes(category) ? category : "layout";
}

/**
 * Validate recommendation severity
 */
function validateSeverity(severity: any): DesignRecommendation["severity"] {
  const validSeverities = ["critical", "high", "medium", "low"];
  return validSeverities.includes(severity) ? severity : "medium";
}

/**
 * Analyze design for multiple pages in parallel
 */
export async function analyzeMultiplePageDesigns(
  screenshotDataList: ScreenshotData[],
  pageData?: Array<{ title?: string; description?: string }>,
): Promise<DesignAnalysis[]> {
  console.log(
    `Starting design analysis for ${screenshotDataList.length} pages...`,
  );

  // Process in smaller batches to avoid rate limiting
  const batchSize = 2;
  const results: DesignAnalysis[] = [];

  for (let i = 0; i < screenshotDataList.length; i += batchSize) {
    const batch = screenshotDataList.slice(i, i + batchSize);
    const batchData = pageData?.slice(i, i + batchSize);

    const batchPromises = batch.map((screenshot, index) =>
      analyzePageDesign(
        screenshot,
        batchData?.[index]?.title,
        batchData?.[index]?.description,
      ),
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches for API rate limiting
    if (i + batchSize < screenshotDataList.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`Completed design analysis for ${results.length} pages`);
  return results;
}