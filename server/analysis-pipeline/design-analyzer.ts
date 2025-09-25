/**
 * Design analysis service using AI to analyze page screenshots
 * Generates layout and design recommendations from visual analysis
 */

import OpenAI from 'openai';
import type { ScreenshotData, DesignAnalysis, DesignRecommendation } from '../../shared/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze page design from screenshot using AI vision
 */
export async function analyzePageDesign(
  screenshotData: ScreenshotData,
  pageTitle?: string,
  pageDescription?: string
): Promise<DesignAnalysis> {
  
  if (!screenshotData.screenshotUrl || screenshotData.error) {
    return {
      overallScore: 0,
      screenshotData,
      recommendations: [{
        category: 'layout',
        severity: 'critical',
        title: 'Screenshot Unavailable',
        description: 'Unable to capture page screenshot for design analysis',
        recommendation: 'Ensure the page loads correctly and try again',
        expectedImpact: 'Cannot provide visual design recommendations without screenshot',
        implementation: 'Check page accessibility and loading performance'
      }],
      strengths: [],
      weaknesses: ['Screenshot capture failed'],
      summary: 'Design analysis unavailable due to screenshot capture error'
    };
  }

  

  try {
    console.log(`Analyzing design for: ${screenshotData.url}`);

    // Prepare context information
    const pageInfo = pageTitle || pageDescription ? 
      `Page context: ${pageTitle ? `Title: "${pageTitle}". ` : ''}${pageDescription ? `Description: "${pageDescription}".` : ''}` :
      '';

    const prompt = `You are a UX/UI design expert analyzing a website screenshot. ${pageInfo}

Please analyze this webpage screenshot and provide detailed design recommendations focusing on:

1. **Layout & Visual Hierarchy**: How well organized is the content? Is there clear visual hierarchy?
2. **Navigation**: Is the navigation intuitive and accessible?
3. **Mobile Responsiveness**: Based on the layout, how well would this adapt to mobile?
4. **Accessibility**: Are there potential accessibility issues visible?
5. **Branding & Visual Appeal**: How consistent and appealing is the visual design? Include color, typography, and imagery.
6. **User Experience**: How user-friendly does the interface appear?

Please provide:
- An overall design score (0-100)
- 3-6 specific, actionable recommendations with severity levels
- Key strengths of the current design
- Main weaknesses that need attention
- A brief summary of the overall design assessment

Focus on practical, implementable and concrete suggestions that would improve user experience and conversion rates. Also including color suggestions
**Write response in same language as the page content.**`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: screenshotData.screenshotUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No analysis content received from OpenAI');
    }

    // Parse the AI response into structured recommendations
    const analysis = parseDesignAnalysis(analysisText, screenshotData);
    
    console.log(`Design analysis completed for ${screenshotData.url} - Score: ${analysis.overallScore}/100`);
    return analysis;

  } catch (error) {
    console.error(`Failed to analyze design for ${screenshotData.url}:`, error);
    
    return {
      overallScore: 50, // Neutral score when analysis fails
      screenshotData,
      recommendations: [{
        category: 'layout',
        severity: 'medium',
        title: 'Design Analysis Unavailable',
        description: 'Unable to complete AI-powered design analysis',
        recommendation: 'Manual review of page design is recommended',
        expectedImpact: 'Cannot provide specific design insights without AI analysis',
        implementation: 'Review page manually for layout, navigation, and visual hierarchy issues'
      }],
      strengths: ['Screenshot captured successfully'],
      weaknesses: ['AI analysis failed'],
      summary: 'Screenshot available but AI analysis could not be completed'
    };
  }
}

/**
 * Parse AI analysis text into structured design recommendations
 */
function parseDesignAnalysis(analysisText: string, screenshotData: ScreenshotData): DesignAnalysis {
  // Extract score (looking for patterns like "Score: 85" or "85/100")
  const scoreMatch = analysisText.match(/(?:score|rating):\s*(\d+)(?:\/100)?/i) || 
                   analysisText.match(/(\d+)\/100/) ||
                   analysisText.match(/overall.*?(\d+)/i);
  const overallScore = scoreMatch ? parseInt(scoreMatch[1]) : 75; // Default to 75 if no score found

  // Extract sections using common patterns
  const recommendations = extractRecommendations(analysisText);
  const strengths = extractListItems(analysisText, ['strength', 'positive', 'good', 'well']);
  const weaknesses = extractListItems(analysisText, ['weakness', 'issue', 'problem', 'concern', 'improvement']);
  const summary = extractSummary(analysisText);

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    screenshotData,
    recommendations,
    strengths,
    weaknesses,
    summary
  };
}

/**
 * Extract design recommendations from AI analysis text
 */
function extractRecommendations(text: string): DesignRecommendation[] {
  const recommendations: DesignRecommendation[] = [];
  
  // Look for numbered or bulleted recommendations
  const recommendationPatterns = [
    /(?:\d+\.|[-•])\s*\*\*(.*?)\*\*[:\s]*([\s\S]*?)(?=\n(?:\d+\.|[-•]|\*\*|$))/g,
    /(?:\d+\.|[-•])\s*(.+?)(?=\n(?:\d+\.|[-•]|$))/g
  ];

  for (const pattern of recommendationPatterns) {
    let match;
    const matches: RegExpExecArray[] = [];
    while ((match = pattern.exec(text)) !== null) {
      matches.push(match);
    }
    if (matches.length > 0) {
      matches.forEach((match, index) => {
        const title = (match[1] || match[0]).trim().replace(/^\*\*|\*\*$/g, '');
        const description = (match[2] || match[0]).trim();
        
        if (title && title.length > 10) { // Filter out too short matches
          recommendations.push({
            category: categorizeRecommendation(title + ' ' + description),
            severity: determineSeverity(title + ' ' + description),
            title: title.substring(0, 100), // Limit title length
            description: description.substring(0, 300), // Limit description
            recommendation: extractActionableText(description),
            expectedImpact: `Implementing this ${categorizeRecommendation(title + ' ' + description)} improvement should enhance user experience`,
            implementation: extractImplementationText(description)
          });
        }
      });
      break; // Use the first pattern that matches
    }
  }

  // If no structured recommendations found, create some based on key issues mentioned
  if (recommendations.length === 0) {
    const keyIssues = [
      { keyword: 'navigation', category: 'navigation' as const, title: 'Navigation Improvement' },
      { keyword: 'mobile', category: 'mobile_responsiveness' as const, title: 'Mobile Optimization' },
      { keyword: 'accessibility', category: 'accessibility' as const, title: 'Accessibility Enhancement' },
      { keyword: 'layout', category: 'layout' as const, title: 'Layout Optimization' },
      { keyword: 'visual', category: 'visual_hierarchy' as const, title: 'Visual Hierarchy' }
    ];

    keyIssues.forEach(issue => {
      if (text.toLowerCase().includes(issue.keyword)) {
        const relevantText = extractRelevantSentence(text, issue.keyword);
        recommendations.push({
          category: issue.category,
          severity: 'medium',
          title: issue.title,
          description: relevantText,
          recommendation: `Improve ${issue.keyword.toLowerCase()} based on the analysis findings`,
          expectedImpact: `Better ${issue.keyword.toLowerCase()} should improve user experience`,
          implementation: 'Review and implement suggested improvements'
        });
      }
    });
  }

  return recommendations.slice(0, 6); // Limit to 6 recommendations
}

/**
 * Extract list items based on section keywords
 */
function extractListItems(text: string, sectionKeywords: string[]): string[] {
  const items: string[] = [];
  
  for (const keyword of sectionKeywords) {
    const sectionRegex = new RegExp(`${keyword}[s]?:?\\s*([\\s\\S]*?)(?=\\n[A-Z]|\\n\\n|$)`, 'i');
    const match = text.match(sectionRegex);
    
    if (match) {
      const content = match[1];
      const listItems = content
        .split(/\n/)
        .map(item => item.replace(/^[-•*]\s*/, '').trim())
        .filter(item => item && item.length > 10)
        .slice(0, 4); // Limit to 4 items per section
      
      items.push(...listItems);
    }
  }
  
  return Array.from(new Set(items)); // Remove duplicates
}

/**
 * Extract summary from analysis text
 */
function extractSummary(text: string): string {
  const summaryPatterns = [
    /(?:summary|conclusion|overall|in summary)[:\s]*([\s\S]*?)(?=\n\n|$)/i,
    /^(.{100,300}?)(?:\.|$)/ // First substantial sentence
  ];
  
  for (const pattern of summaryPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 500);
    }
  }
  
  // Fallback to first paragraph
  const firstParagraph = text.split('\n\n')[0];
  return firstParagraph ? firstParagraph.substring(0, 300) : 'Design analysis completed successfully.';
}

/**
 * Categorize recommendation based on content
 */
function categorizeRecommendation(text: string): DesignRecommendation['category'] {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('navigation') || lowerText.includes('menu')) return 'navigation';
  if (lowerText.includes('mobile') || lowerText.includes('responsive')) return 'mobile_responsiveness';
  if (lowerText.includes('accessibility') || lowerText.includes('a11y')) return 'accessibility';
  if (lowerText.includes('brand') || lowerText.includes('color') || lowerText.includes('font')) return 'branding';
  if (lowerText.includes('hierarchy') || lowerText.includes('visual') || lowerText.includes('contrast')) return 'visual_hierarchy';
  
  return 'layout'; // Default category
}

/**
 * Determine severity based on text content
 */
function determineSeverity(text: string): DesignRecommendation['severity'] {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('critical') || lowerText.includes('urgent') || lowerText.includes('must')) return 'critical';
  if (lowerText.includes('important') || lowerText.includes('significant') || lowerText.includes('should')) return 'high';
  if (lowerText.includes('minor') || lowerText.includes('consider') || lowerText.includes('could')) return 'low';
  
  return 'medium'; // Default severity
}

/**
 * Extract actionable text for recommendations
 */
function extractActionableText(text: string): string {
  // Look for sentences with action verbs
  const actionVerbs = ['improve', 'add', 'remove', 'update', 'change', 'implement', 'optimize', 'fix'];
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (actionVerbs.some(verb => lowerSentence.includes(verb))) {
      return sentence.trim();
    }
  }
  
  return text.substring(0, 200); // Fallback to first part of text
}

/**
 * Extract implementation guidance
 */
function extractImplementationText(text: string): string {
  // Look for implementation-related sentences
  const implKeywords = ['implement', 'use', 'apply', 'create', 'develop', 'design'];
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (implKeywords.some(keyword => lowerSentence.includes(keyword))) {
      return sentence.trim();
    }
  }
  
  return 'Review current implementation and apply suggested changes';
}

/**
 * Extract relevant sentence containing a keyword
 */
function extractRelevantSentence(text: string, keyword: string): string {
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(keyword.toLowerCase()) && sentence.length > 50) {
      return sentence.trim();
    }
  }
  
  return `Analysis indicates ${keyword} improvements are needed.`;
}

/**
 * Analyze design for multiple pages in parallel
 */
export async function analyzeMultiplePageDesigns(
  screenshotDataList: ScreenshotData[],
  pageData?: Array<{ title?: string; description?: string }>
): Promise<DesignAnalysis[]> {
  
  console.log(`Starting design analysis for ${screenshotDataList.length} pages...`);
  
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
        batchData?.[index]?.description
      )
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches for API rate limiting
    if (i + batchSize < screenshotDataList.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`Completed design analysis for ${results.length} pages`);
  return results;
}