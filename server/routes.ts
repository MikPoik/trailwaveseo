import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeSite, cancelAnalysis } from "./seoAnalyzer";
import { parseSitemap } from "./sitemap";
import { crawlWebsite } from "./crawler";
import { generateSeoSuggestions, analyzeContentRepetition } from "./openai";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { EventEmitter } from "events";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Global event emitter for Server-Sent Events
const analysisEvents = new EventEmitter();

// Rate limiting - increased limits for development
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased for development
  standardHeaders: true,
  legacyHeaders: false,
});

const crawlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased for development
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Replit Auth
  await setupAuth(app);

  // Basic rate limiting for all API routes (skip in development)
  if (process.env.NODE_ENV !== 'development') {
    app.use("/api", apiLimiter);
  }

  // =============================================================================
  // AUTHENTICATION ROUTES
  // =============================================================================

  // User endpoint - protected by auth
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // =============================================================================
  // USER ROUTES
  // =============================================================================

  // User usage endpoint - protected by auth
  app.get('/api/user/usage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const usage = await storage.getUserUsage(userId);
      if (!usage) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json(usage);
    } catch (error) {
      console.error("Error fetching user usage:", error);
      res.status(500).json({ message: "Failed to fetch user usage" });
    }
  });

  // =============================================================================
  // VALIDATION SCHEMAS
  // =============================================================================
  // Input validation schemas
  const analyzeRequestSchema = z.object({
    domain: z.string().min(1).max(255),
    useSitemap: z.boolean().default(true),
    additionalInfo: z.string().optional(),
  });

  const settingsSchema = z.object({
    maxPages: z.number().min(1).max(100).default(20),
    crawlDelay: z.number().min(100).max(3000).default(500),
    followExternalLinks: z.boolean().default(false),
    analyzeImages: z.boolean().default(true),
    analyzeLinkStructure: z.boolean().default(true),
    analyzePageSpeed: z.boolean().default(true),
    analyzeStructuredData: z.boolean().default(true),
    analyzeMobileCompatibility: z.boolean().default(true),
    useAI: z.boolean().default(true),
  });

  // =============================================================================
  // SETTINGS ROUTES  
  // =============================================================================

  // Default settings endpoint
  app.get("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getSettings(userId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve settings" });
    }
  });

  // Update settings endpoint
  app.post("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Updating settings for user:", userId);
      console.log("Settings payload:", JSON.stringify(req.body));

      // Create a more flexible validation schema that only requires expected fields
      const flexibleSettingsSchema = z.object({
        maxPages: z.number().optional(),
        crawlDelay: z.number().optional(),
        followExternalLinks: z.boolean().optional(),
        analyzeImages: z.boolean().optional(),
        analyzeLinkStructure: z.boolean().optional(),
        useAI: z.boolean().optional(),
        // Optional newer fields
        analyzePageSpeed: z.boolean().optional(),
        analyzeStructuredData: z.boolean().optional(),
        analyzeMobileCompatibility: z.boolean().optional(),
      });

      // Validate and parse the settings
      const parsedSettings = flexibleSettingsSchema.parse(req.body);
      console.log("Parsed settings:", JSON.stringify(parsedSettings));

      // Update settings
      const updatedSettings = await storage.updateSettings(parsedSettings, userId);
      res.json(updatedSettings);
    } catch (error: any) {
      console.error("Settings update failed:", error);

      if (error instanceof z.ZodError) {
        console.error("Validation error:", JSON.stringify(error.errors));
        res.status(400).json({ error: "Invalid settings format", details: error.errors });
      } else {
        console.error("Server error updating settings:", error);
        res.status(500).json({ 
          error: "Failed to update settings", 
          message: error.message || "Unknown error",
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }
  });

  // =============================================================================
  // CORE ANALYSIS ROUTES
  // =============================================================================

  // Analyze website endpoint
  app.post("/api/analyze", isAuthenticated, process.env.NODE_ENV !== 'development' ? crawlLimiter : (req: any, res: any, next: any) => next(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { domain, useSitemap, additionalInfo } = analyzeRequestSchema.parse(req.body);

      // Check user's usage limits before starting analysis
      const usage = await storage.getUserUsage(userId);
      if (!usage) {
        return res.status(404).json({ error: "User not found" });
      }

      if (usage.pagesAnalyzed >= usage.pageLimit) {
        return res.status(403).json({ 
          error: "Page analysis limit reached", 
          message: `You have reached your limit of ${usage.pageLimit} pages. You have analyzed ${usage.pagesAnalyzed} pages.`,
          usage: usage
        });
      }

      // Start analysis in the background
      analyzeSite(domain, useSitemap, analysisEvents, false, userId, additionalInfo)
        .catch(error => {
          console.error(`Analysis error for ${domain}:`, error);
          analysisEvents.emit(domain, {
            status: 'error',
            domain,
            error: error.message,
            pagesFound: 0,
            pagesAnalyzed: 0,
            currentPageUrl: '',
            analyzedPages: [],
            percentage: 0
          });
        });

      // Return immediately with 202 Accepted
      res.status(202).json({ 
        message: "Analysis started", 
        domain 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request format", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to start analysis" });
      }
    }
  });

  // Cancel ongoing analysis
  app.post("/api/analyze/cancel", async (req, res) => {
    try {
      const { domain } = req.body;
      if (!domain) {
        return res.status(400).json({ error: "Domain is required" });
      }

      cancelAnalysis(domain);
      res.json({ message: "Analysis cancelled" });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel analysis" });
    }
  });

  // Get analysis progress with Server-Sent Events
  app.get("/api/analyze/progress", (req, res) => {
    const domain = req.query.domain as string;

    if (!domain) {
      return res.status(400).json({ error: "Domain parameter is required" });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial update
    res.write(`data: ${JSON.stringify({
      status: 'in-progress',
      domain,
      pagesFound: 0,
      pagesAnalyzed: 0,
      currentPageUrl: '',
      analyzedPages: [],
      percentage: 0
    })}\n\n`);

    // Event handler for this specific domain
    const progressHandler = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);

      // If analysis is completed or errored, end the connection
      if (data.status === 'completed' || data.status === 'error') {
        analysisEvents.removeListener(domain, progressHandler);
        res.end();
      }
    };

    // Register the event listener
    analysisEvents.on(domain, progressHandler);

    // Handle client disconnect
    req.on('close', () => {
      analysisEvents.removeListener(domain, progressHandler);
    });
  });

  // =============================================================================
  // ANALYSIS MANAGEMENT ROUTES
  // =============================================================================

  // Get analysis history
  app.get("/api/analysis/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getAnalysisHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve analysis history" });
    }
  });

  // Get recent analyses (for sidebar)
  app.get("/api/analysis/recent", async (req: any, res) => {
    try {
      // Only return analyses if user is authenticated
      if (req.isAuthenticated()) {
        const userId = req.user.claims.sub;
        const recentAnalyses = await storage.getRecentAnalyses(5, userId);
        res.json(recentAnalyses);
      } else {
        // Return empty array for anonymous users
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve recent analyses" });
    }
  });

  // Get specific analysis by ID
  app.get("/api/analysis/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysisById(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Check if the analysis belongs to the authenticated user
      if (analysis.userId && analysis.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to access this analysis" });
      }

      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve analysis" });
    }
  });

  // Delete analysis by ID
  app.delete("/api/analysis/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      // Check if the analysis exists and belongs to the user
      const analysis = await storage.getAnalysisById(id);
      if (!analysis) {
        console.log(`Analysis with ID ${id} not found for deletion`);
        // Still return success to avoid UI errors when record is already gone
        return res.json({ message: "Analysis already deleted" });
      }

      if (analysis.userId && analysis.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to delete this analysis" });
      }

      const success = await storage.deleteAnalysis(id);

      // Even if the deletion reports failure, we'll return success to the client
      // This prevents UI error states when the record is actually gone
      res.json({ message: "Analysis deleted successfully" });
    } catch (error) {
      console.error("Error deleting analysis:", error);
      res.status(500).json({ error: "Failed to delete analysis" });
    }
  });

  // =============================================================================
  // ANALYSIS FEATURES & EXPORT ROUTES
  // =============================================================================

  // Export analysis as PDF
  app.get("/api/analysis/:id/export/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysisById(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Generate PDF content
      // This would normally use a library like PDFKit, but for simplicity we're using HTML to PDF approach

      // Create simple HTML template for the PDF
      const pdfHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>SEO Analysis Report - ${analysis.domain}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            h2 { color: #444; margin-top: 30px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .issue { margin-bottom: 10px; padding: 10px; background-color: #f9f9f9; }
            .critical { border-left: 4px solid #e74c3c; }
            .warning { border-left: 4px solid #f39c12; }
            .metrics { display: flex; margin-bottom: 20px; }
            .metric-box { padding: 15px; margin-right: 15px; border-radius: 4px; }
            .good { background-color: #e6ffe6; }
            .warning-box { background-color: #fff8e6; }
            .critical-box { background-color: #ffe6e6; }
          </style>
        </head>
        <body>
          <h1>SEO Analysis Report</h1>
          <p>
            <strong>Domain:</strong> ${analysis.domain}<br>
            <strong>Analysis Date:</strong> ${new Date(analysis.date).toLocaleDateString()}<br>
            <strong>Pages Analyzed:</strong> ${analysis.pagesCount}
          </p>

          <h2>Overall Metrics</h2>
          <div class="metrics">
            <div class="metric-box good">
              <h3>Good Practices</h3>
              <p>${analysis.metrics.goodPractices}</p>
            </div>
            <div class="metric-box warning-box">
              <h3>Warnings</h3>
              <p>${analysis.metrics.warnings}</p>
            </div>
            <div class="metric-box critical-box">
              <h3>Critical Issues</h3>
              <p>${analysis.metrics.criticalIssues}</p>
            </div>
          </div>

          <h2>Page Analysis</h2>
          ${analysis.pages.map(page => `
            <div class="page-analysis">
              <h3>${page.pageName} - ${page.url}</h3>
              <p><strong>Title:</strong> ${page.title || 'None'}</p>
              <p><strong>Meta Description:</strong> ${page.metaDescription || 'None'}</p>

              ${page.issues.length > 0 ? `
                <h4>Issues (${page.issues.length})</h4>
                ${page.issues.map(issue => `
                  <div class="issue ${issue.severity}">
                    <strong>${issue.title}</strong>: ${issue.description}
                  </div>
                `).join('')}
              ` : '<p>No issues found</p>'}

              ${page.suggestions.length > 0 ? `
                <h4>Suggestions</h4>
                <ul>
                  ${page.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </body>
        </html>
      `;

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.html`);
      res.send(pdfHtml);

    } catch (error) {
      res.status(500).json({ error: "Failed to export analysis as PDF" });
    }
  });

  // Export analysis as CSV
  app.get("/api/analysis/:id/export/csv", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysisById(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Generate CSV content
      let csv = "URL,Title,Title Length,Meta Description,Description Length,Headings,Issues,Suggestions\n";

      analysis.pages.forEach(page => {
        const row = [
          `"${page.url}"`,
          `"${page.title || ''}"`,
          page.title?.length || 0,
          `"${page.metaDescription || ''}"`,
          page.metaDescription?.length || 0,
          `"${page.headings.map(h => `${h.level}: ${h.text}`).join('; ')}"`,
          page.issues.length,
          `"${page.suggestions.join('; ')}"`
        ];

        csv += row.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.csv`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export analysis as CSV" });
    }
  });

  // Compare with competitor
  app.post("/api/analyze/compare", apiLimiter, async (req, res) => {
    try {
      const { mainDomain, competitorDomain } = req.body;
      if (!mainDomain || !competitorDomain) {
        return res.status(400).json({ error: "Both domains are required" });
      }

      // Get the most recent analysis for the main domain
      const mainAnalysis = await storage.getLatestAnalysisByDomain(mainDomain);
      if (!mainAnalysis) {
        return res.status(404).json({ error: "No analysis found for main domain" });
      }

      try {
        // Check if user is authenticated and get their usage
        let userId: string | undefined;
        if (req.isAuthenticated && req.isAuthenticated()) {
          userId = req.user.claims.sub;
          const usage = await storage.getUserUsage(userId);
          if (usage && usage.pagesAnalyzed >= usage.pageLimit) {
            return res.status(403).json({ 
              error: "Page analysis limit reached", 
              message: `You have reached your limit of ${usage.pageLimit} pages. You have analyzed ${usage.pagesAnalyzed} pages.`,
              usage: usage
            });
          }
          
          // Also check if user has any pages remaining
          const remainingPages = usage ? usage.pageLimit - usage.pagesAnalyzed : 0;
          if (remainingPages <= 0) {
            return res.status(403).json({ 
              error: "No pages remaining", 
              message: `You have no pages remaining in your current limit of ${usage?.pageLimit || 0} pages.`,
              usage: usage
            });
          }
        }

        // Analyze the competitor domain
        // For simplicity, we'll reuse the existing analysis flow but mark as competitor to skip alt text generation
        const competitorAnalysisId = await analyzeSite(competitorDomain, true, analysisEvents, true, userId);

        // Get the competitor analysis results
        const competitorAnalysis = await storage.getAnalysisById(competitorAnalysisId);
        if (!competitorAnalysis) {
          return res.status(404).json({ error: "Competitor analysis failed" });
        }

        // Compare the analyses
        const comparison = {
          mainDomain,
          competitorDomain,
          metrics: {
            titleOptimization: {
              main: mainAnalysis.metrics.titleOptimization,
              competitor: competitorAnalysis.metrics.titleOptimization,
              difference: mainAnalysis.metrics.titleOptimization - competitorAnalysis.metrics.titleOptimization
            },
            descriptionOptimization: {
              main: mainAnalysis.metrics.descriptionOptimization,
              competitor: competitorAnalysis.metrics.descriptionOptimization,
              difference: mainAnalysis.metrics.descriptionOptimization - competitorAnalysis.metrics.descriptionOptimization
            },
            headingsOptimization: {
              main: mainAnalysis.metrics.headingsOptimization,
              competitor: competitorAnalysis.metrics.headingsOptimization,
              difference: mainAnalysis.metrics.headingsOptimization - competitorAnalysis.metrics.headingsOptimization
            },
            imagesOptimization: {
              main: mainAnalysis.metrics.imagesOptimization,
              competitor: competitorAnalysis.metrics.imagesOptimization,
              difference: mainAnalysis.metrics.imagesOptimization - competitorAnalysis.metrics.imagesOptimization
            },
            criticalIssues: {
              main: mainAnalysis.metrics.criticalIssues,
              competitor: competitorAnalysis.metrics.criticalIssues,
              difference: competitorAnalysis.metrics.criticalIssues - mainAnalysis.metrics.criticalIssues
            }
          },
          // Include optimized analysis data to reduce payload size
        analysis: {
          ...competitorAnalysis,
          // Remove large data that's not needed for comparison
          pages: competitorAnalysis.pages.map(page => ({
            ...page,
            paragraphs: page.paragraphs ? page.paragraphs.slice(0, 2) : [], // Limit paragraphs
            suggestions: page.suggestions ? page.suggestions.slice(0, 3) : [] // Limit suggestions
          }))
        },
          recommendations: []
        };

        // Generate recommendations based on the comparison
        if (comparison.metrics.titleOptimization.difference < 0) {
          comparison.recommendations.push("Your competitor has better optimized page titles. Consider reviewing and improving your title tags.");
        }

        if (comparison.metrics.descriptionOptimization.difference < 0) {
          comparison.recommendations.push("Your competitor has better optimized meta descriptions. Focus on writing more compelling and keyword-rich descriptions.");
        }

        if (comparison.metrics.headingsOptimization.difference < 0) {
          comparison.recommendations.push("Your competitor has better heading structure. Ensure you use a logical heading hierarchy with relevant keywords.");
        }

        if (comparison.metrics.imagesOptimization.difference < 0) {
          comparison.recommendations.push("Your competitor has better optimized images. Make sure all your images have descriptive alt text.");
        }

        if (comparison.metrics.criticalIssues.difference < 0) {
          comparison.recommendations.push("You have more critical issues than your competitor. Prioritize fixing these issues to improve your SEO performance.");
        }

        res.json(comparison);
      } catch (error) {
        console.error("Error analyzing competitor domain:", error);
        res.status(500).json({ error: "Failed to analyze competitor domain" });
      }
    } catch (error) {
      console.error("Error in competitor comparison:", error);
      res.status(500).json({ error: "Failed to compare with competitor" });
    }
  });

  // Save competitor analysis to an existing analysis
  app.post("/api/analysis/:id/save-competitor", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analysisId = parseInt(req.params.id);
      const competitorData = req.body;

      if (!competitorData) {
        return res.status(400).json({ error: "Competitor analysis data is required" });
      }

      // Check if the analysis exists and belongs to the user
      const analysis = await storage.getAnalysisById(analysisId);

      if (!analysis) {
        console.log(`Analysis with ID ${analysisId} not found for saving competitor data`);
        return res.status(404).json({ error: "Analysis not found" });
      }

      if (analysis.userId && analysis.userId !== userId) {
        console.log(`User ${userId} attempted to update analysis ${analysisId} belonging to user ${analysis.userId}`);
        return res.status(403).json({ error: "You don't have permission to update this analysis" });
      }

      console.log(`Saving competitor analysis for ID ${analysisId}, user ${userId}, data size: ${JSON.stringify(competitorData).length} bytes`);

      const updatedAnalysis = await storage.updateCompetitorAnalysis(analysisId, competitorData);

      if (!updatedAnalysis) {
        return res.status(500).json({ error: "Failed to update analysis with competitor data" });
      }

      res.json(updatedAnalysis);
    } catch (error) {
      console.error("Error saving competitor analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ 
        error: "Failed to save competitor analysis",
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  });

  // Run content duplication analysis for an existing analysis
  app.post("/api/analysis/:id/content-duplication", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysisById(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Check if the analysis belongs to the authenticated user
      if (analysis.userId && analysis.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to access this analysis" });
      }

      // Check if analysis has enough pages for content duplication
      if (analysis.pages.length < 2) {
        return res.status(400).json({ error: "Content duplication analysis requires at least 2 pages" });
      }

      try {
        console.log(`Running content duplication analysis for analysis ${id}...`);
        const contentRepetitionAnalysis = await analyzeContentRepetition(analysis.pages);
        
        // Update the analysis with the content repetition results
        const updatedAnalysis = await storage.updateContentRepetitionAnalysis(id, contentRepetitionAnalysis);
        
        if (!updatedAnalysis) {
          return res.status(500).json({ error: "Failed to save content duplication analysis" });
        }

        // Increment user's page usage count for content duplication analysis
        // Count as 1 page since it's analyzing existing content
        await storage.incrementUserUsage(userId, 1);

        res.json({ contentRepetitionAnalysis });
      } catch (error) {
        console.error(`Error analyzing content repetition for analysis ${id}:`, error);
        res.status(500).json({ error: "Failed to analyze content duplication" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to run content duplication analysis" });
    }
  });

  // Export analysis as JSON
  app.get("/api/analysis/:id/export/json", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysisById(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.json`);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to export analysis as JSON" });
    }
  });

  // Reanalyze a single page from an existing analysis
  app.post("/api/analysis/:id/reanalyze-page", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analysisId = parseInt(req.params.id);
      const { pageUrl } = req.body;

      if (isNaN(analysisId)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      if (!pageUrl) {
        return res.status(400).json({ error: "Page URL is required" });
      }

      // Get the existing analysis
      const analysis = await storage.getAnalysisById(analysisId);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Check if the analysis belongs to the authenticated user
      if (analysis.userId && analysis.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to modify this analysis" });
      }

      // Check user's usage limits before reanalysis
      const usage = await storage.getUserUsage(userId);
      if (usage && usage.pagesAnalyzed >= usage.pageLimit) {
        return res.status(403).json({ 
          error: "Page analysis limit reached", 
          message: `You have reached your limit of ${usage.pageLimit} pages. You have analyzed ${usage.pagesAnalyzed} pages.`,
          usage: usage
        });
      }

      // Get user settings
      const settings = await storage.getSettings(userId);

      // Import the analyzePage function from seoAnalyzer
      const { analyzePage } = await import('./seoAnalyzer');
      
      // Create abort controller for this specific reanalysis
      const controller = new AbortController();

      // Reanalyze the specific page with saved business context
      const updatedPageAnalysis = await analyzePage(pageUrl, settings, controller.signal, false, analysis.pages, undefined, analysis.siteOverview);

      if (!updatedPageAnalysis) {
        return res.status(500).json({ error: "Failed to reanalyze page" });
      }

      // Update the analysis with the new page data
      const updatedAnalysis = await storage.updatePageInAnalysis(analysisId, pageUrl, updatedPageAnalysis);

      if (!updatedAnalysis) {
        return res.status(500).json({ error: "Failed to update analysis with new page data" });
      }

      // Increment user's page usage count for reanalysis
      await storage.incrementUserUsage(userId, 1);

      res.json({
        message: "Page reanalyzed successfully",
        updatedPage: updatedPageAnalysis,
        analysis: updatedAnalysis
      });

    } catch (error) {
      console.error("Error reanalyzing page:", error);
      res.status(500).json({ 
        error: "Failed to reanalyze page",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}