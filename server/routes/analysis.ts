import type { Express } from "express";
import { storage } from "../storage";
import { analyzeSite, cancelAnalysis } from "../seoAnalyzer";
import { isAuthenticated } from "../replitAuth";
import { analysisEvents, crawlLimiter } from "./index";
import { analyzeRequestSchema } from "./schemas";
import { z } from "zod";

export function registerAnalysisRoutes(app: Express) {
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
}