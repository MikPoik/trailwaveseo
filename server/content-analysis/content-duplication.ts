/**
 * Content Duplication Analysis Module
 * Handles AI-powered content duplication detection and analysis
 */

import OpenAI from "openai";
import { ContentDuplicationAnalysis, DuplicateItem } from '@shared/schema';

// the newest OpenAI model is "gpt-4.1" which was released on 14.4.2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyze content repetition across website pages using AI
 * @param pages Array of page analysis results
 * @returns Content duplication analysis with AI-powered insights
 */
export async function analyzeContentRepetition(pages: Array<any>): Promise<ContentDuplicationAnalysis> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, returning basic content repetition analysis");
      return generateBasicContentAnalysis(pages);
    }

    console.log(`Analyzing content repetition across ${pages.length} pages with AI...`);

    // Prepare content for analysis
    const contentSamples = pages.map(page => ({
      url: page.url,
      title: page.title || '',
      metaDescription: page.metaDescription || '',
      headings: page.headings.map((h: any) => h.text).join(', '),
      paragraphs: page.paragraphs?.slice(0, 3).join(' ').substring(0, 500) || ''
    }));

    const prompt = `Analyze this website content for duplication and repetition patterns across ${pages.length} pages.

CONTENT SAMPLES (${contentSamples.length} pages):
${contentSamples.slice(0, 8).map((page, index) => `
Page ${index + 1}: ${page.url}
Title: "${page.title.substring(0, 100)}"
Meta: "${page.metaDescription.substring(0, 100)}"
Headings: ${page.headings.substring(0, 150)}
Content: ${page.paragraphs.substring(0, 200)}
---`).join('\n')}${contentSamples.length > 8 ? `\n(+ ${contentSamples.length - 8} more pages analyzed)` : ''}

Analyze for:
1. Duplicate or very similar titles
2. Duplicate or very similar meta descriptions  
3. Repetitive heading patterns
4. Duplicate paragraph content
5. Overall content strategy recommendations

For each duplicate group, assess:
- Impact level: "critical" (exact duplicates, major SEO issues), "warning" (similar content, moderate issues), or "minor" (slight similarities)
- Specific improvement strategy: Actionable advice for fixing this particular duplication

Identify specific examples of duplication and provide detailed recommendations for improvement.

CRITICAL: Your response MUST be valid JSON. Escape all quotes properly. Keep all examples under 80 characters. Limit to 3 examples max per category.

Respond in JSON format:
{
  "titleRepetition": {
    "repetitiveCount": number,
    "totalCount": number,
    "examples": ["example1", "example2"],
    "recommendations": ["rec1", "rec2"],
    "duplicateGroups": [{"content": "title", "affected_urls": ["url1", "url2"], "impactLevel": "Critical", "improvementStrategy": "strategy"}]
  },
  "descriptionRepetition": {
    "repetitiveCount": number,
    "totalCount": number,
    "examples": ["example1", "example2"],
    "recommendations": ["rec1", "rec2"],
    "duplicateGroups": [{"content": "description", "affected_urls": ["url1", "url2"], "impactLevel": "High", "improvementStrategy": "strategy"}]
  },
  "headingRepetition": {
    "repetitiveCount": number,
    "totalCount": number,
    "examples": ["example1", "example2"],
    "recommendations": ["rec1", "rec2"],
    "duplicateGroups": [{"content": "heading", "affected_urls": ["url1", "url2"], "impactLevel": "High", "improvementStrategy": "strategy"}],
    "byLevel": {
      "h1": [{"content": "heading", "affected_urls": ["url1", "url2"], "impactLevel": "Critical", "improvementStrategy": "strategy"}],
      "h2": [{"content": "heading", "affected_urls": ["url1", "url2"], "impactLevel": "High", "improvementStrategy": "strategy"}],
      "h3": [{"content": "heading", "affected_urls": ["url1", "url2"], "impactLevel": "Low", "improvementStrategy": "strategy"}],
      "h4": [],
      "h5": [],
      "h6": []
    }
  },
  "paragraphRepetition": {
    "repetitiveCount": number,
    "totalCount": number,
    "examples": ["example1", "example2"],
    "recommendations": ["rec1", "rec2"],
    "duplicateGroups": [{"content": "paragraph", "affected_urls": ["url1", "url2"], "impactLevel": "Low", "improvementStrategy": "strategy"}]
  },
  "overallRecommendations": ["rec1", "rec2"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "You are a content analysis expert. Identify duplicate and repetitive content patterns with specific examples and actionable recommendations. Focus on SEO impact and content uniqueness."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_completion_tokens: 3000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error("No content returned from OpenAI for content duplication analysis");
      return generateBasicContentAnalysis(pages);
    }

    // Enhanced JSON parsing with robust error handling
    let result: any;
    try {
      // First attempt to parse the response as-is
      result = JSON.parse(content);
      console.log('Successfully parsed content duplication response on first attempt');
    } catch (parseError) {
      console.error('Failed to parse content duplication response on first attempt:', parseError);
      console.log('Response preview:', content.substring(0, 200) + '...');

      // Try to fix common JSON issues and retry parsing
      try {
        // Remove any trailing commas and fix incomplete JSON
        let fixedContent = content.trim();

        // Remove trailing comma before closing brace/bracket
        fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');

        // If JSON is incomplete, try to complete it
        if (!fixedContent.endsWith('}') && !fixedContent.endsWith(']')) {
          // Find the last complete object structure and close the JSON properly
          const openBraceCount = (fixedContent.match(/{/g) || []).length;
          const closeBraceCount = (fixedContent.match(/}/g) || []).length;
          const missingBraces = openBraceCount - closeBraceCount;

          if (missingBraces > 0) {
            fixedContent = fixedContent + '}'.repeat(missingBraces);
          }
        }

        result = JSON.parse(fixedContent);
        console.log('Successfully parsed content duplication response after JSON repair');
      } catch (secondParseError) {
        console.error('Failed to parse content duplication response even after repair:', secondParseError);
        console.log('Failed content preview:', content.substring(0, 500));
        return generateBasicContentAnalysis(pages);
      }
    }

    return parseContentRepetitionResult(result);

  } catch (error) {
    console.error('Error analyzing content repetition with AI:', error);
    return generateBasicContentAnalysis(pages);
  }
}

/**
 * Generate basic content analysis without AI
 */
function generateBasicContentAnalysis(pages: Array<any>): ContentDuplicationAnalysis {
  // Simple rule-based analysis
  const titles = pages.map(p => p.title).filter(Boolean);
  const descriptions = pages.map(p => p.metaDescription).filter(Boolean);
  
  const titleDuplicates = findSimpleDuplicates(titles);
  const descriptionDuplicates = findSimpleDuplicates(descriptions);

  return {
    titleRepetition: {
      repetitiveCount: titleDuplicates.length,
      totalCount: titles.length,
      examples: titleDuplicates.slice(0, 3),
      recommendations: titleDuplicates.length > 0 ? [
        "Create unique, descriptive titles for each page",
        "Include target keywords naturally in titles",
        "Keep titles under 60 characters for better display"
      ] : ["Titles appear to be unique across pages"],
      duplicateGroups: titleDuplicates.map(title => ({
        content: title,
        urls: pages.filter(p => p.title === title).map(p => p.url),
        similarityScore: 100,
        impactLevel: 'Critical',
        improvementStrategy: 'Create unique, descriptive titles that reflect each page\'s specific content and purpose'
      }))
    },
    descriptionRepetition: {
      repetitiveCount: descriptionDuplicates.length,
      totalCount: descriptions.length,
      examples: descriptionDuplicates.slice(0, 3),
      recommendations: descriptionDuplicates.length > 0 ? [
        "Write unique meta descriptions for each page",
        "Include relevant keywords and compelling calls-to-action",
        "Keep descriptions between 150-160 characters"
      ] : ["Meta descriptions appear to be unique across pages"],
      duplicateGroups: descriptionDuplicates.map(desc => ({
        content: desc,
        urls: pages.filter(p => p.metaDescription === desc).map(p => p.url),
        similarityScore: 100,
        impactLevel: 'High',
        improvementStrategy: 'Write unique meta descriptions with relevant keywords and compelling calls-to-action'
      }))
    },
    headingRepetition: {
      repetitiveCount: 0,
      totalCount: 0,
      examples: [],
      recommendations: ["Manual review recommended for heading duplication analysis"],
      duplicateGroups: [],
      byLevel: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] }
    },
    paragraphRepetition: {
      repetitiveCount: 0,
      totalCount: 0,
      examples: [],
      recommendations: ["Manual review recommended for paragraph duplication analysis"],
      duplicateGroups: []
    },
    overallRecommendations: [
      "Review content for uniqueness across all pages",
      "Develop distinct value propositions for each page",
      "Consider AI-powered analysis for more detailed insights"
    ]
  };
}

/**
 * Find simple duplicates in an array of strings
 */
function findSimpleDuplicates(items: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  
  items.forEach(item => {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  });
  
  return Array.from(duplicates);
}

/**
 * Parse and validate AI response for content repetition analysis
 */
function parseContentRepetitionResult(result: any): ContentDuplicationAnalysis {
  return {
    titleRepetition: {
      repetitiveCount: result.titleRepetition?.repetitiveCount || 0,
      totalCount: result.titleRepetition?.totalCount || 0,
      examples: result.titleRepetition?.examples || [],
      recommendations: (result.titleRepetition?.recommendations || []).map((rec: any) => {
        if (typeof rec === 'string') return rec;
        if (typeof rec === 'object' && rec?.description) return rec.description;
        return String(rec || '');
      }),
      duplicateGroups: (result.titleRepetition?.duplicateGroups || []).map((group: any) => ({
        content: group.content || '',
        urls: group.urls || group.affected_urls || [],
        similarityScore: group.similarityScore || 100,
        impactLevel: group.impactLevel || 'Low',
        improvementStrategy: group.improvementStrategy || 'Create unique, descriptive content for each page'
      }))
    },
    descriptionRepetition: {
      repetitiveCount: result.descriptionRepetition?.repetitiveCount || 0,
      totalCount: result.descriptionRepetition?.totalCount || 0,
      examples: result.descriptionRepetition?.examples || [],
      recommendations: (result.descriptionRepetition?.recommendations || []).map((rec: any) => {
        if (typeof rec === 'string') return rec;
        if (typeof rec === 'object' && rec?.description) return rec.description;
        return String(rec || '');
      }),
      duplicateGroups: (result.descriptionRepetition?.duplicateGroups || []).map((group: any) => ({
        content: group.content || '',
        urls: group.urls || group.affected_urls || [],
        similarityScore: group.similarityScore || 100,
        impactLevel: group.impactLevel || 'Low',
        improvementStrategy: group.improvementStrategy || 'Write unique meta descriptions with relevant keywords'
      }))
    },
    headingRepetition: {
      repetitiveCount: result.headingRepetition?.repetitiveCount || 0,
      totalCount: result.headingRepetition?.totalCount || 0,
      examples: result.headingRepetition?.examples || [],
      recommendations: (result.headingRepetition?.recommendations || []).map((rec: any) => {
        if (typeof rec === 'string') return rec;
        if (typeof rec === 'object' && rec?.description) return rec.description;
        return String(rec || '');
      }),
      duplicateGroups: (result.headingRepetition?.duplicateGroups || []).map((group: any) => ({
        content: group.content || '',
        urls: group.urls || group.affected_urls || [],
        similarityScore: group.similarityScore || 100,
        impactLevel: group.impactLevel || 'Low',
        improvementStrategy: group.improvementStrategy || 'Create distinct heading structures for each page'
      })),
      byLevel: {
        h1: (result.headingRepetition?.byLevel?.h1 || []).map((group: any) => ({
          content: group.content || '',
          urls: group.urls || group.affected_urls || [],
          similarityScore: group.similarityScore || 100,
          impactLevel: group.impactLevel || 'Critical',
          improvementStrategy: group.improvementStrategy || 'Create unique H1 headings that reflect each page\'s specific purpose'
        })),
        h2: (result.headingRepetition?.byLevel?.h2 || []).map((group: any) => ({
          content: group.content || '',
          urls: group.urls || group.affected_urls || [],
          similarityScore: group.similarityScore || 100,
          impactLevel: group.impactLevel || 'warning',
          improvementStrategy: group.improvementStrategy || 'Diversify H2 headings to reflect unique section content'
        })),
        h3: (result.headingRepetition?.byLevel?.h3 || []).map((group: any) => ({
          content: group.content || '',
          urls: group.urls || group.affected_urls || [],
          similarityScore: group.similarityScore || 100,
          impactLevel: group.impactLevel || 'Low',
          improvementStrategy: group.improvementStrategy || 'Vary H3 headings to distinguish subsection topics'
        })),
        h4: (result.headingRepetition?.byLevel?.h4 || []).map((group: any) => ({
          content: group.content || '',
          urls: group.urls || group.affected_urls || [],
          similarityScore: group.similarityScore || 100,
          impactLevel: group.impactLevel || 'Low',
          improvementStrategy: group.improvementStrategy || 'Create specific H4 headings for detailed sections'
        })),
        h5: (result.headingRepetition?.byLevel?.h5 || []).map((group: any) => ({
          content: group.content || '',
          urls: group.urls || group.affected_urls || [],
          similarityScore: group.similarityScore || 100,
          impactLevel: group.impactLevel || 'Low',
          improvementStrategy: group.improvementStrategy || 'Use descriptive H5 headings for fine-grained content organization'
        })),
        h6: (result.headingRepetition?.byLevel?.h6 || []).map((group: any) => ({
          content: group.content || '',
          urls: group.urls || group.affected_urls || [],
          similarityScore: group.similarityScore || 100,
          impactLevel: group.impactLevel || 'Low',
          improvementStrategy: group.improvementStrategy || 'Ensure H6 headings are specific and contextually relevant'
        }))
      }
    },
    paragraphRepetition: {
      repetitiveCount: result.paragraphRepetition?.repetitiveCount || 0,
      totalCount: result.paragraphRepetition?.totalCount || 0,
      examples: result.paragraphRepetition?.examples || [],
      recommendations: (result.paragraphRepetition?.recommendations || []).map((rec: any) => {
        if (typeof rec === 'string') return rec;
        if (typeof rec === 'object' && rec?.description) return rec.description;
        return String(rec || '');
      }),
      duplicateGroups: (result.paragraphRepetition?.duplicateGroups || []).map((group: any) => ({
        content: group.content || '',
        urls: group.urls || group.affected_urls || [],
        similarityScore: group.similarityScore || 100,
        impactLevel: group.impactLevel || 'Low',
        improvementStrategy: group.improvementStrategy || 'Rewrite paragraphs to provide unique value and context for each page'
      }))
    },
    overallRecommendations: result.overallRecommendations || []
  };
}