import type { Express } from 'express';
import { storage } from '../storage.js';
import { isAuthenticated } from '../replitAuth.js';

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
      const { message } = req.body;

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

      const updatedMessages = [...conversation.messages, userMessage];

      // Generate AI response
      const aiResponse = await generateAIResponse(analysis, pageUrl, message, conversation.messages);
      
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
async function generateAIResponse(analysis: any, pageUrl: string, userMessage: string, conversationHistory: any[]): Promise<string> {
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

    // Check if user message indicates need for fresh content
    const needsFreshContent = shouldFetchFreshContent(userMessage);
    let freshContent = null;
    
    if (needsFreshContent) {
      try {
        freshContent = await fetchPageContent(pageUrl);
      } catch (error) {
        console.warn('Could not fetch fresh content, using analysis data:', error);
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

Previous conversation context: ${conversationHistory.length > 0 ? JSON.stringify(conversationHistory.slice(-4)) : 'None'}`;

    console.log(systemPrompt);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
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

  if (pageData) {
    context += `PAGE DETAILS:\n`;
    context += `- Title: ${pageData.title || 'None'}\n`;
    context += `- Meta Description: ${pageData.metaDescription || 'None'}\n`;
    context += `- Word Count: ${pageData.contentMetrics?.wordCount || 0}\n`;
    context += `- SEO Issues: ${pageData.issues?.length || 0}\n`;
    
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

  // Add additional analysis data if available
  if (analysis.contentRepetitionAnalysis) {
    context += `\nCONTENT PATTERNS: Available\n`;
  }
  
  if (analysis.competitorAnalysis) {
    context += `COMPETITOR DATA: Available\n`;
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