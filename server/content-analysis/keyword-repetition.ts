/**
 * Keyword Repetition Analysis Module
 * Detects keyword stuffing, over-optimization, and repetitive content patterns
 */

import OpenAI from "openai";
import { KeywordRepetitionAnalysis, KeywordDensityItem } from '@shared/schema';

// the newest OpenAI model is "gpt-4.1" which was released on 14.4.2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyze keyword repetition and density across website pages
 * @param pages Array of page analysis results
 * @returns Keyword repetition analysis with AI-powered insights
 */
export async function analyzeKeywordRepetition(pages: Array<any>): Promise<KeywordRepetitionAnalysis> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key not set, returning basic keyword repetition analysis");
      return generateBasicKeywordAnalysis(pages);
    }

    console.log(`Analyzing keyword repetition across ${pages.length} pages with AI...`);

    // Prepare content for keyword analysis
    const contentSamples = pages.map(page => ({
      url: page.url,
      title: page.title || '',
      metaDescription: page.metaDescription || '',
      headings: page.headings?.map((h: any) => h.text).join(' ') || '',
      content: page.paragraphs?.join(' ').substring(0, 1500) || '',
      wordCount: page.wordCount || 0
    }));

    const prompt = `Analyze this website content for keyword repetition, density, and potential SEO over-optimization across ${pages.length} pages.

CONTENT SAMPLES (${contentSamples.length} pages):
${contentSamples.slice(0, 6).map((page, index) => `
Page ${index + 1}: ${page.url}
Title: "${page.title.substring(0, 100)}"
Meta: "${page.metaDescription.substring(0, 100)}"
Headings: ${page.headings.substring(0, 200)}
Content: ${page.content.substring(0, 300)}
Word Count: ${page.wordCount}
---`).join('\n')}${contentSamples.length > 6 ? `\n(+ ${contentSamples.length - 6} more pages analyzed)` : ''}

Analyze for:
1. Keyword density - identify words/phrases used excessively (>3-5% density)
2. Keyword stuffing - unnatural repetition that hurts readability
3. Phrase repetition - repetitive sentence structures or phrases
4. Site-wide keyword patterns - overused keywords across multiple pages
5. Natural vs. forced keyword usage - context and readability assessment

For each problematic keyword/phrase, assess:
- Density percentage and impact level: "Critical" (>5% density, obvious stuffing), "High" (3-5% density, some over-optimization), "Medium" (2-3% density, minor concerns), or "Low" (<2% density, natural usage)
- Specific improvement strategy: How to use the keyword more naturally
- Alternative suggestions: Synonyms and related terms to diversify content

Identify the top 10 most problematic keywords and provide actionable recommendations.

CRITICAL: Your response MUST be valid JSON. Escape all quotes properly. Keep all examples under 100 characters.

Respond in JSON format:
{
  "overallKeywordHealth": {
    "score": number (1-100, where 100 is optimal),
    "issues": number,
    "recommendations": ["rec1", "rec2"]
  },
  "topProblematicKeywords": [
    {
      "keyword": "example keyword",
      "density": 5.2,
      "occurrences": 15,
      "impactLevel": "Critical",
      "affectedPages": ["url1", "url2"],
      "improvementStrategy": "Reduce usage and use synonyms naturally",
      "alternatives": ["synonym1", "synonym2"]
    }
  ],
  "siteWidePatterns": {
    "repetitiveCount": number,
    "totalAnalyzed": number,
    "examples": ["pattern1", "pattern2"],
    "recommendations": ["rec1", "rec2"]
  },
  "readabilityImpact": {
    "affectedPages": number,
    "severityLevel": "High",
    "improvementAreas": ["area1", "area2"]
  },
  "keywordOpportunities": [
    {
      "suggestion": "Use more long-tail keywords",
      "benefit": "Better targeting and natural flow",
      "implementation": "Replace repeated short keywords with specific phrases"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "You are an SEO and content optimization expert. Analyze keyword usage patterns to identify over-optimization, keyword stuffing, and opportunities for natural content improvement. Focus on readability and search engine best practices."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_completion_tokens: 3000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error("No content returned from OpenAI for keyword repetition analysis");
      return generateBasicKeywordAnalysis(pages);
    }

    // Enhanced JSON parsing with robust error handling
    let result: any;
    try {
      result = JSON.parse(content);
      console.log('Successfully parsed keyword repetition response on first attempt');
    } catch (parseError) {
      console.error('Failed to parse keyword repetition response on first attempt:', parseError);
      console.log('Response preview:', content.substring(0, 200) + '...');

      try {
        // Fix common JSON issues
        let fixedContent = content.trim();
        fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');

        if (!fixedContent.endsWith('}') && !fixedContent.endsWith(']')) {
          const openBraceCount = (fixedContent.match(/{/g) || []).length;
          const closeBraceCount = (fixedContent.match(/}/g) || []).length;
          const missingBraces = openBraceCount - closeBraceCount;

          if (missingBraces > 0) {
            fixedContent = fixedContent + '}'.repeat(missingBraces);
          }
        }

        result = JSON.parse(fixedContent);
        console.log('Successfully parsed keyword repetition response after JSON repair');
      } catch (secondParseError) {
        console.error('Failed to parse keyword repetition response even after repair:', secondParseError);
        console.log('Failed content preview:', content.substring(0, 500));
        return generateBasicKeywordAnalysis(pages);
      }
    }

    return parseKeywordRepetitionResult(result, pages);

  } catch (error) {
    console.error('Error analyzing keyword repetition with AI:', error);
    return generateBasicKeywordAnalysis(pages);
  }
}

/**
 * Generate basic keyword analysis without AI
 */
function generateBasicKeywordAnalysis(pages: Array<any>): KeywordRepetitionAnalysis {
  // Simple rule-based keyword analysis
  const allContent = pages.map(p => 
    `${p.title || ''} ${p.metaDescription || ''} ${p.paragraphs?.join(' ') || ''}`
  ).join(' ').toLowerCase();

  const words = allContent.split(/\s+/).filter(word => 
    word.length > 3 && !isStopWord(word)
  );

  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalWords = words.length;
  const problematicKeywords = Object.entries(wordCounts)
    .filter(([word, count]) => (count / totalWords) > 0.02) // >2% density
    .map(([word, count]) => ({
      keyword: word,
      density: Number(((count / totalWords) * 100).toFixed(2)),
      occurrences: count,
      impactLevel: (count / totalWords) > 0.05 ? 'Critical' as const : 
                   (count / totalWords) > 0.03 ? 'High' as const : 'Medium' as const,
      affectedPages: pages.filter(p => 
        p.title?.toLowerCase().includes(word) || 
        p.paragraphs?.some((para: string) => para.toLowerCase().includes(word))
      ).map(p => p.url),
      improvementStrategy: `Reduce usage of "${word}" and use synonyms to improve natural flow`,
      alternatives: [`${word} alternative`, `related ${word} term`]
    }))
    .slice(0, 10);

  return {
    overallKeywordHealth: {
      score: Math.max(30, 100 - (problematicKeywords.length * 10)),
      issues: problematicKeywords.length,
      recommendations: [
        "Review keyword density across pages for natural usage",
        "Use synonyms and related terms to diversify content",
        "Focus on readability over keyword repetition"
      ]
    },
    topProblematicKeywords: problematicKeywords,
    siteWidePatterns: {
      repetitiveCount: problematicKeywords.length,
      totalAnalyzed: words.length,
      examples: problematicKeywords.slice(0, 3).map(k => k.keyword),
      recommendations: [
        "Vary vocabulary to avoid repetitive patterns",
        "Use long-tail keywords for better targeting"
      ]
    },
    readabilityImpact: {
      affectedPages: pages.filter(p => 
        problematicKeywords.some(k => 
          p.title?.toLowerCase().includes(k.keyword) || 
          p.paragraphs?.some((para: string) => para.toLowerCase().includes(k.keyword))
        )
      ).length,
      severityLevel: problematicKeywords.some(k => k.impactLevel === 'Critical') ? 'High' : 'Medium',
      improvementAreas: ["Keyword diversity", "Natural language flow", "Content uniqueness"]
    },
    keywordOpportunities: [
      {
        suggestion: "Use more long-tail keywords",
        benefit: "Better targeting and natural content flow",
        implementation: "Replace repeated short keywords with specific phrases"
      },
      {
        suggestion: "Implement semantic keyword strategies",
        benefit: "Improved search relevance without over-optimization",
        implementation: "Use related terms and synonyms throughout content"
      }
    ]
  };
}

/**
 * Check if a word is a common stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an'
  ]);
  return stopWords.has(word.toLowerCase());
}

/**
 * Parse and validate AI response for keyword repetition analysis
 */
function parseKeywordRepetitionResult(result: any, pages: Array<any>): KeywordRepetitionAnalysis {
  return {
    overallKeywordHealth: {
      score: Math.max(0, Math.min(100, result.overallKeywordHealth?.score || 70)),
      issues: result.overallKeywordHealth?.issues || 0,
      recommendations: (result.overallKeywordHealth?.recommendations || []).map((rec: any) => 
        typeof rec === 'string' ? rec : String(rec || '')
      )
    },
    topProblematicKeywords: (result.topProblematicKeywords || []).slice(0, 10).map((keyword: any) => ({
      keyword: keyword.keyword || 'Unknown keyword',
      density: Math.max(0, keyword.density || 0),
      occurrences: Math.max(0, keyword.occurrences || 0),
      impactLevel: (['Critical', 'High', 'Medium', 'Low'].includes(keyword.impactLevel)) 
        ? keyword.impactLevel 
        : 'Medium',
      affectedPages: Array.isArray(keyword.affectedPages) ? keyword.affectedPages : [],
      improvementStrategy: keyword.improvementStrategy || 'Use keyword more naturally and sparingly',
      alternatives: Array.isArray(keyword.alternatives) ? keyword.alternatives : []
    })),
    siteWidePatterns: {
      repetitiveCount: result.siteWidePatterns?.repetitiveCount || 0,
      totalAnalyzed: result.siteWidePatterns?.totalAnalyzed || pages.length,
      examples: Array.isArray(result.siteWidePatterns?.examples) 
        ? result.siteWidePatterns.examples 
        : [],
      recommendations: Array.isArray(result.siteWidePatterns?.recommendations)
        ? result.siteWidePatterns.recommendations.map((rec: any) => String(rec || ''))
        : []
    },
    readabilityImpact: {
      affectedPages: Math.max(0, result.readabilityImpact?.affectedPages || 0),
      severityLevel: (['Critical', 'High', 'Medium', 'Low'].includes(result.readabilityImpact?.severityLevel))
        ? result.readabilityImpact.severityLevel
        : 'Medium',
      improvementAreas: Array.isArray(result.readabilityImpact?.improvementAreas)
        ? result.readabilityImpact.improvementAreas
        : []
    },
    keywordOpportunities: (result.keywordOpportunities || []).map((opp: any) => ({
      suggestion: opp.suggestion || 'Improve keyword strategy',
      benefit: opp.benefit || 'Better SEO performance',
      implementation: opp.implementation || 'Review and optimize content'
    }))
  };
}