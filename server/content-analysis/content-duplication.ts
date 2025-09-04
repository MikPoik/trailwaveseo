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

CONTENT SAMPLES:
${contentSamples.map((page, index) => `
Page ${index + 1}: ${page.url}
Title: "${page.title}"
Meta: "${page.metaDescription}"
Headings: ${page.headings}
Content: ${page.paragraphs}
---`).join('\n')}

Analyze for:
1. Duplicate or very similar titles
2. Duplicate or very similar meta descriptions  
3. Repetitive heading patterns
4. Duplicate paragraph content
5. Overall content strategy recommendations

Identify specific examples of duplication and provide recommendations for improvement.

Respond in JSON format:
{
  "titleRepetition": {
    "repetitiveCount": number,
    "totalCount": number,
    "examples": ["example1", "example2"],
    "recommendations": ["rec1", "rec2"],
    "duplicateGroups": [{"content": "title", "affected_urls": ["url1", "url2"]}]
  },
  "descriptionRepetition": {
    "repetitiveCount": number,
    "totalCount": number,
    "examples": ["example1", "example2"],
    "recommendations": ["rec1", "rec2"],
    "duplicateGroups": [{"content": "description", "affected_urls": ["url1", "url2"]}]
  },
  "headingRepetition": {
    "repetitiveCount": number,
    "totalCount": number,
    "examples": ["example1", "example2"],
    "recommendations": ["rec1", "rec2"],
    "duplicateGroups": [{"content": "heading", "affected_urls": ["url1", "url2"]}],
    "byLevel": {
      "h1": [{"content": "heading", "affected_urls": ["url1", "url2"]}],
      "h2": [{"content": "heading", "affected_urls": ["url1", "url2"]}],
      "h3": [{"content": "heading", "affected_urls": ["url1", "url2"]}],
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
    "duplicateGroups": [{"content": "paragraph", "affected_urls": ["url1", "url2"]}]
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
      temperature: 0.3,
      max_completion_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

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
        affected_urls: pages.filter(p => p.title === title).map(p => p.url)
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
        affected_urls: pages.filter(p => p.metaDescription === desc).map(p => p.url)
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
      duplicateGroups: result.titleRepetition?.duplicateGroups || []
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
      duplicateGroups: result.descriptionRepetition?.duplicateGroups || []
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
      duplicateGroups: result.headingRepetition?.duplicateGroups || [],
      byLevel: {
        h1: result.headingRepetition?.byLevel?.h1 || [],
        h2: result.headingRepetition?.byLevel?.h2 || [],
        h3: result.headingRepetition?.byLevel?.h3 || [],
        h4: result.headingRepetition?.byLevel?.h4 || [],
        h5: result.headingRepetition?.byLevel?.h5 || [],
        h6: result.headingRepetition?.byLevel?.h6 || []
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
      duplicateGroups: result.paragraphRepetition?.duplicateGroups || []
    },
    overallRecommendations: result.overallRecommendations || []
  };
}