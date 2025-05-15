import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeSite, cancelAnalysis } from "./seoAnalyzer";
import { parseSitemap } from "./sitemap";
import { crawlWebsite } from "./crawler";
import { generateSeoSuggestions } from "./openai";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { EventEmitter } from "events";

// Global event emitter for Server-Sent Events
const analysisEvents = new EventEmitter();

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

const crawlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 crawl requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Input validation schemas
  const analyzeRequestSchema = z.object({
    domain: z.string().min(1).max(255),
    useSitemap: z.boolean().default(true),
  });

  const settingsSchema = z.object({
    maxPages: z.number().min(1).max(100).default(20),
    crawlDelay: z.number().min(100).max(3000).default(500),
    followExternalLinks: z.boolean().default(false),
    analyzeImages: z.boolean().default(true),
    analyzeLinkStructure: z.boolean().default(true),
    useAI: z.boolean().default(true),
  });

  // Basic rate limiting for all API routes
  app.use("/api", apiLimiter);

  // Default settings endpoint
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve settings" });
    }
  });

  // Update settings endpoint
  app.post("/api/settings", async (req, res) => {
    try {
      const parsedSettings = settingsSchema.parse(req.body);
      const updatedSettings = await storage.updateSettings(parsedSettings);
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid settings format", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  });

  // Analyze website endpoint
  app.post("/api/analyze", crawlLimiter, async (req, res) => {
    try {
      const { domain, useSitemap } = analyzeRequestSchema.parse(req.body);

      // Start analysis in the background
      analyzeSite(domain, useSitemap, analysisEvents)
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

  // Get analysis history
  app.get("/api/analysis/history", async (req, res) => {
    try {
      const history = await storage.getAnalysisHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve analysis history" });
    }
  });

  // Get recent analyses (for sidebar)
  app.get("/api/analysis/recent", async (req, res) => {
    try {
      const recentAnalyses = await storage.getRecentAnalyses(5);
      res.json(recentAnalyses);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve recent analyses" });
    }
  });

  // Get specific analysis by ID
  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }
      
      const analysis = await storage.getAnalysisById(id);
      
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve analysis" });
    }
  });

  // Delete analysis by ID
  app.delete("/api/analysis/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }
      
      const success = await storage.deleteAnalysis(id);
      
      if (!success) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      
      res.json({ message: "Analysis deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete analysis" });
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
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.csv`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export analysis as CSV" });
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

  const httpServer = createServer(app);

  return httpServer;
}
