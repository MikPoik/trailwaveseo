import type { Express } from 'express';
import { storage } from '../storage.js';
import { isAuthenticated } from '../replitAuth.js';
import { deductChatCredits } from '../analysis-pipeline/quota-manager.js';

export function registerContentConversationRoutes(app: Express) {
  // Get conversation history for a specific page
  app.get('/api/content-conversations/:analysisId/:pageUrl', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analysisId = parseInt(req.params.analysisId);
      const pageUrl = decodeURIComponent(req.params.pageUrl);

      // Verify user owns the analysis
      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis || analysis.userId !== userId) {
        return res.status(403).json({ error: 'Analysis not found or access denied' });
      }

      // Get or create conversation
      let conversation = await storage.getContentConversation(analysisId, pageUrl, userId);
      if (!conversation) {
        // Create new conversation
        conversation = await storage.createContentConversation({
          analysisId,
          pageUrl,
          userId,
          messages: []
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  // Send a message and get AI response
  app.post('/api/content-conversations/:analysisId/:pageUrl/message', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analysisId = parseInt(req.params.analysisId);
      const pageUrl = decodeURIComponent(req.params.pageUrl);
      const { message, freshContent } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Verify user owns the analysis
      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis || analysis.userId !== userId) {
        return res.status(403).json({ error: 'Analysis not found or access denied' });
      }

      // Get or create conversation
      let conversation = await storage.getContentConversation(analysisId, pageUrl, userId);
      if (!conversation) {
        conversation = await storage.createContentConversation({
          analysisId,
          pageUrl,
          userId,
          messages: []
        });
      }

      // Add user message
      const userMessage = {
        role: 'user' as const,
        content: message.trim(),
        timestamp: new Date().toISOString()
      };

      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      const updatedMessages = [...messages, userMessage];

      // Check user account status and handle credits
      const userUsage = await storage.getUserUsage(userId);
      const isTrialUser = userUsage?.accountStatus === "trial";

      // Deduct credits for both trial and paid users (1 credit per 5 messages)
      const creditResult = await deductChatCredits(userId, isTrialUser);
      if (!creditResult.success) {
        return res.status(402).json({
          error: 'Insufficient credits for chat messages. Purchase more credits to continue chatting.',
          remainingCredits: creditResult.remainingCredits
        });
      }

      // Generate AI response with fresh content if provided
      const aiResponse = await generateAIResponse(analysis, pageUrl, message, messages, freshContent);

      const aiMessage = {
        role: 'assistant' as const,
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, aiMessage];

      // Update conversation in database
      const updatedConversation = await storage.updateContentConversation(conversation.id, {
        messages: finalMessages
      });

      res.json(updatedConversation);
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // Dynamic content fetching endpoint
  app.post('/api/content-conversations/:analysisId/:pageUrl/fetch-content', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analysisId = parseInt(req.params.analysisId);
      const pageUrl = decodeURIComponent(req.params.pageUrl);

      // Verify user owns the analysis
      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis || analysis.userId !== userId) {
        return res.status(403).json({ error: 'Analysis not found or access denied' });
      }

      // Fetch fresh page content
      const freshContent = await fetchPageContent(pageUrl);

      res.json({ content: freshContent });
    } catch (error) {
      console.error('Error fetching page content:', error);
      res.status(500).json({ error: 'Failed to fetch page content' });
    }
  });
}

// AI response generation function
async function generateAIResponse(analysis: any, pageUrl: string, userMessage: string, conversationHistory: any[], providedFreshContent?: any): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return "AI responses are currently unavailable. Please check the OpenAI API key configuration.";
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Find the specific page data
    const pageData = analysis.pages.find((page: any) => page.url === pageUrl);

    // Build context from analysis data
    const context = buildAnalysisContext(analysis, pageData, pageUrl);

    // Use provided fresh content or fetch if user message indicates need
    let freshContent = providedFreshContent;
    const needsFreshContent = shouldFetchFreshContent(userMessage);

    if (needsFreshContent && !freshContent) {
      try {
        freshContent = await fetchPageContent(pageUrl);
      } catch (error) {
        console.warn('Could not fetch fresh content, using analysis data:', error);
      }
    }

    // Check if screenshot is available for this page
    let screenshotUrl = null;
    if (analysis.designAnalysis && Array.isArray(analysis.designAnalysis)) {
      const pageScreenshot = analysis.designAnalysis.find((design: any) => 
        design.screenshotData?.url === pageUrl
      );
      
      if (pageScreenshot?.screenshotData?.screenshotUrl && !pageScreenshot.screenshotData.error) {
        screenshotUrl = pageScreenshot.screenshotData.screenshotUrl;
      }
    }

    // Build the system prompt with context
    const systemPrompt = `You are a helpful SEO content editor assistant. You have access to comprehensive analysis data for a website and can help users improve their content.

ANALYSIS CONTEXT:
${context}

${freshContent ? `FRESH PAGE CONTENT:\n${JSON.stringify(freshContent, null, 2)}` : ''}

GUIDELINES:
1. Provide specific, actionable content suggestions
2. Base recommendations on the analysis data and SEO best practices
3. When asked to rewrite or improve content, provide the complete improved version
4. Reference specific SEO issues from the analysis when relevant
5. Keep responses focused and practical
6. If you need fresh page content and it's not available, mention that dynamic content fetching would help
7. ${screenshotUrl ? 'You have access to a visual screenshot of this page - use it to provide visual design feedback when relevant' : 'No visual screenshot is available for this page'}

LANGUAGE REQUIREMENT: Always respond in the same language as the website content. Look at the page title, headings, and content to determine the language, then write your responses in that exact same language.

Previous conversation context: ${conversationHistory.length > 0 ? JSON.stringify(conversationHistory.slice(-4)) : 'None'}`;

    //console.log(systemPrompt);

    // Prepare messages array - include screenshot if available and relevant
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // If screenshot is available and user message might benefit from visual context
    if (screenshotUrl && shouldIncludeScreenshot(userMessage)) {
      messages.push({
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: `Here's the current page screenshot for visual reference, followed by my question: ${userMessage}` 
          },
          {
            type: 'image_url',
            image_url: {
              url: screenshotUrl,
              detail: 'high'
            }
          }
        ]
      });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Sorry, I encountered an error generating a response. Please try again.';
  }
}

// Build analysis context for AI
function buildAnalysisContext(analysis: any, pageData: any, pageUrl: string): string {
  let context = `Website: ${analysis.domain}\n`;
  context += `Page: ${pageUrl}\n`;
  context += `Analysis Date: ${analysis.date}\n\n`;

  // Add screenshot information if available
  if (analysis.designAnalysis && Array.isArray(analysis.designAnalysis)) {
    const pageScreenshot = analysis.designAnalysis.find((design: any) => 
      design.screenshotData?.url === pageUrl
    );
    
    if (pageScreenshot?.screenshotData?.screenshotUrl && !pageScreenshot.screenshotData.error) {
      context += `SCREENSHOT AVAILABLE: ${pageScreenshot.screenshotData.screenshotUrl}\n`;
      context += `Screenshot captured: ${pageScreenshot.screenshotData.captureTimestamp}\n`;
      
      if (pageScreenshot.overallScore !== undefined) {
        context += `Design score: ${pageScreenshot.overallScore}/100\n`;
      }
      
      if (pageScreenshot.summary) {
        context += `Design summary: ${pageScreenshot.summary}\n`;
      }
      
      context += '\n';
    }
  }

  if (pageData) {
    context += `PAGE DETAILS:\n`;
    context += `- Title: ${pageData.title || 'None'}\n`;
    context += `- Meta Description: ${pageData.metaDescription || 'None'}\n`;
    context += `- Word Count: ${pageData.contentMetrics?.wordCount || 0}\n`;
    context += `- SEO Issues: ${pageData.issues?.length || 0}\n`;

    // Add semantic keywords if available
    if (pageData.contentMetrics?.semanticKeywords?.length > 0) {
      context += `- Semantic Keywords: ${pageData.contentMetrics.semanticKeywords.join(', ')}\n`;
    }

    // Add content quality metrics if available
    if (pageData.contentMetrics) {
      context += `- Content Depth Score: ${pageData.contentMetrics.contentDepthScore || 'N/A'}\n`;
      context += `- Readability Score: ${pageData.contentMetrics.readabilityScore || 'N/A'}\n`;
    }

    if (pageData.issues?.length > 0) {
      context += `\nSEO ISSUES:\n`;
      pageData.issues.forEach((issue: any, index: number) => {
        context += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}\n`;
      });
    }

    if (pageData.suggestions?.length > 0) {
      context += `\nAI SUGGESTIONS:\n`;
      pageData.suggestions.forEach((suggestion: any, index: number) => {
        context += `${index + 1}. ${suggestion}\n`;
      });
    }

    // Add internal links analysis
    if (pageData.internalLinks?.length > 0) {
      context += `\nINTERNAL LINKS ON THIS PAGE (${pageData.internalLinks.length}):\n`;
      pageData.internalLinks.slice(0, 10).forEach((link: any, index: number) => {
        const linkText = link.text?.length > 50 ? link.text.substring(0, 50) + '...' : link.text;
        context += `${index + 1}. "${linkText}" → ${link.href}\n`;
      });
      if (pageData.internalLinks.length > 10) {
        context += `... and ${pageData.internalLinks.length - 10} more internal links\n`;
      }
    } else {
      context += `\nINTERNAL LINKS: None found on this page\n`;
    }
  }

  // Add business context
  if (analysis.siteOverview) {
    context += `\nBUSINESS CONTEXT:\n`;
    context += `- Industry: ${analysis.siteOverview.industry}\n`;
    context += `- Business Type: ${analysis.siteOverview.businessType}\n`;
    context += `- Target Audience: ${analysis.siteOverview.targetAudience}\n`;

    if (analysis.siteOverview.mainServices?.length > 0) {
      context += `- Main Services: ${analysis.siteOverview.mainServices.join(', ')}\n`;
    }
  }

  // Add content quality analysis if available
  if (analysis.contentQualityAnalysis) {
    context += `\nCONTENT QUALITY ANALYSIS:\n`;
    if (analysis.contentQualityAnalysis.overallScore !== undefined) {
      context += `- Overall Content Score: ${analysis.contentQualityAnalysis.overallScore}/100\n`;
    }
    if (analysis.contentQualityAnalysis.keywordDensity) {
      context += `- Keyword Density Issues: ${analysis.contentQualityAnalysis.keywordDensity.length || 0}\n`;
    }
    if (analysis.contentQualityAnalysis.contentGaps?.length > 0) {
      context += `- Content Gaps: ${analysis.contentQualityAnalysis.contentGaps.slice(0, 3).join(', ')}\n`;
    }
  }

  // Add detailed competitor analysis if available
  if (analysis.competitorAnalysis) {
    context += `\nCOMPETITOR ANALYSIS INSIGHTS:\n`;
    const ca = analysis.competitorAnalysis;

    if (ca.mainDomain && ca.competitorDomain) {
      context += `- Comparing ${ca.mainDomain} vs ${ca.competitorDomain}\n`;
    }

    if (ca.metrics) {
      context += `- Title Optimization: ${ca.metrics.titleOptimization?.advantage || 'N/A'} advantage\n`;
      context += `- Content Quality: ${ca.metrics.contentQuality?.advantage || 'N/A'} advantage\n`;
      context += `- Technical SEO: ${ca.metrics.technicalSEO?.advantage || 'N/A'} advantage\n`;
    }

    if (ca.gaps?.opportunityKeywords?.length > 0) {
      context += `- Opportunity Keywords: ${ca.gaps.opportunityKeywords.slice(0, 5).join(', ')}\n`;
    }

    if (ca.gaps?.missingTopics?.length > 0) {
      context += `- Missing Topics: ${ca.gaps.missingTopics.slice(0, 3).join(', ')}\n`;
    }

    if (ca.summary?.quickWins?.length > 0) {
      context += `- Quick Wins: ${ca.summary.quickWins.slice(0, 3).join(', ')}\n`;
    }

    if (ca.summary?.strengthAreas?.length > 0) {
      context += `- Your Strengths: ${ca.summary.strengthAreas.slice(0, 3).join(', ')}\n`;
    }

    if (ca.summary?.weaknessAreas?.length > 0) {
      context += `- Areas to Improve: ${ca.summary.weaknessAreas.slice(0, 3).join(', ')}\n`;
    }
  }

  // Add content patterns if available
  if (analysis.contentRepetitionAnalysis) {
    context += `\nCONTENT PATTERNS: Available for duplication analysis\n`;
  }

  return context;
}

// Check if message indicates need for fresh content
function shouldFetchFreshContent(message: string): boolean {
  const indicators = [
    'current content',
    'latest version',
    'fresh content',
    'page content',
    'what does the page say',
    'paragraph',
    'section',
    'heading',
    'text on the page'
  ];

  const lowerMessage = message.toLowerCase();
  return indicators.some(indicator => lowerMessage.includes(indicator));
}

// Check if message would benefit from visual screenshot context
function shouldIncludeScreenshot(message: string): boolean {
  const visualIndicators = [
    'design',
    'layout',
    'visual',
    'appearance',
    'look',
    'style',
    'color',
    'font',
    'image',
    'button',
    'navigation',
    'menu',
    'header',
    'footer',
    'sidebar',
    'page structure',
    'user interface',
    'ui',
    'ux',
    'branding',
    'logo',
    'spacing',
    'alignment',
    'mobile',
    'responsive',
    'screenshot'
  ];

  const lowerMessage = message.toLowerCase();
  return visualIndicators.some(indicator => lowerMessage.includes(indicator));
}

// Fetch fresh page content
async function fetchPageContent(url: string): Promise<any> {
  try {
    // Import the analyzer to reuse content extraction logic
    const { analyzePage } = await import('../seoAnalyzer.js');

    // Create simple settings for content fetching
    const settings = {
      useAI: false,
      skipAltTextGeneration: true,
      maxPages: 1,
      crawlDelay: 0,
      followExternalLinks: false,
      useSitemap: false,
      analyzeImages: true,
      analyzeLinkStructure: false,
      analyzePageSpeed: false,
      analyzeStructuredData: false,
      analyzeMobileCompatibility: false
    };

    // Use existing analysis function to get fresh content with abort signal
    const abortController = new AbortController();
    const freshAnalysis = await analyzePage(url, settings, abortController.signal, false, [], undefined, undefined);

    if (!freshAnalysis) {
      throw new Error('Failed to analyze page');
    }

    return {
      title: freshAnalysis.title,
      metaDescription: freshAnalysis.metaDescription,
      headings: freshAnalysis.headings,
      paragraphs: freshAnalysis.paragraphs,
      images: freshAnalysis.images,
      wordCount: freshAnalysis.contentMetrics?.wordCount,
      lastFetched: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching fresh page content:', error);
    throw new Error('Failed to fetch page content');
  }
}