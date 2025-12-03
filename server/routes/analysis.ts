import type { Express } from "express";
import { storage } from "../storage";
import { cancelAnalysis } from "../seoAnalyzer";
import { orchestrateAnalysis } from "../analysis-pipeline/analysis-orchestrator";
import { requireAuth } from "../neonAuth";
import { analysisEvents, crawlLimiter } from "./index";
import { analyzeRequestSchema } from "./schemas";
import { z } from "zod";

export function registerAnalysisRoutes(app: Express) {
  // Analyze website endpoint
  app.post("/api/analyze", requireAuth, process.env.NODE_ENV !== 'development' ? crawlLimiter : (req: any, res: any, next: any) => next(), async (req: any, res) => {
    try {
      const userId = req.neonUser.id;
      const { domain, useSitemap, additionalInfo } = analyzeRequestSchema.parse(req.body);

      // Check user's usage limits before starting analysis
      const usage = await storage.getUserUsage(userId);
      if (!usage) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user has a specific page limit (not unlimited) - for legacy users
      if (usage.pageLimit !== -1 && usage.pagesAnalyzed >= usage.pageLimit) {
        return res.status(403).json({ 
          error: "Page analysis limit reached", 
          message: `You have reached your limit of ${usage.pageLimit} pages. You have analyzed ${usage.pagesAnalyzed} pages.`,
          usage: usage
        });
      }

      // Determine credit cost based on user type
      const isTrialUser = usage.accountStatus === "trial";
      const scanCost = isTrialUser ? 5 : 3; // Trial users pay 5 credits, paid users pay 3 (discount)
      
      // Atomically check and deduct credits for starting the scan
      const creditResult = await storage.atomicDeductCredits(userId, scanCost);
      if (!creditResult.success) {
        return res.status(403).json({ 
          error: "Insufficient credits", 
          message: `You need at least ${scanCost} credits to start a website scan. You currently have ${creditResult.remainingCredits} credits.`,
          usage: { ...usage, credits: creditResult.remainingCredits },
          needsCredits: true
        });
      }

      // Start modular analysis in the background with error handling and credit refund
      (async () => {
        try {
          const settings = await storage.getSettings(userId);
          const modularSettings = {
            ...settings,
            useSitemap,
            skipAltTextGeneration: false,
            useAI: true
          };
          
          await orchestrateAnalysis(
            domain,
            modularSettings,
            userId,
            additionalInfo,
            false, // isCompetitorAnalysis
            analysisEvents
          );
        } catch (error) {
          console.error(`Analysis error for ${domain}:`, error);
          
          // Refund the credits since analysis failed
          const errorMessage = error instanceof Error ? error.message : String(error);
          await storage.refundCredits(userId, scanCost, `Analysis failed for ${domain}: ${errorMessage}`);
          
          analysisEvents.emit(domain, {
            status: 'error',
            domain,
            error: errorMessage,
            pagesFound: 0,
            pagesAnalyzed: 0,
            currentPageUrl: '',
            analyzedPages: [],
            percentage: 0
          });
        }
      })();

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

      // Use the progress tracker's cancel function
      const { cancelAnalysis: cancelProgressAnalysis } = await import("../analysis-pipeline/progress-tracker");
      const cancelled = cancelProgressAnalysis(domain);
      
      if (cancelled) {
        console.log(`Successfully cancelled analysis for ${domain}`);
        res.json({ message: "Analysis cancelled" });
      } else {
        console.log(`No active analysis found for ${domain} to cancel`);
        res.json({ message: "No active analysis found to cancel" });
      }
    } catch (error) {
      console.error("Error cancelling analysis:", error);
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

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

    // Keepalive to prevent connection timeout (every 15 seconds)
    const keepaliveInterval = setInterval(() => {
      try {
        res.write(`:keepalive\n\n`);
      } catch (error) {
        console.log(`[SSE] Keepalive failed for ${domain}, connection likely closed`);
        clearInterval(keepaliveInterval);
      }
    }, 15000);

    // Event handler for this specific domain
    const progressHandler = (data: any) => {
      try {
        console.log(`[SSE] Sending progress update for ${domain}:`, data.status, `${data.percentage}%`);
        
        // Ensure we have a clean JSON string
        const jsonData = JSON.stringify(data);
        res.write(`data: ${jsonData}\n\n`);

        // If analysis is completed or errored, end the connection after a small delay
        if (data.status === 'completed' || data.status === 'error' || data.status === 'cancelled') {
          console.log(`[SSE] Ending connection for ${domain} - status: ${data.status}`);
          
          // Small delay to ensure the completion event is sent before closing
          setTimeout(() => {
            clearInterval(keepaliveInterval);
            analysisEvents.removeListener(domain, progressHandler);
            if (!res.headersSent) {
              res.end();
            }
          }, 250);
        }
      } catch (error) {
        console.error(`[SSE] Error sending progress update for ${domain}:`, error);
        clearInterval(keepaliveInterval);
        analysisEvents.removeListener(domain, progressHandler);
        if (!res.headersSent) {
          res.end();
        }
      }
    };

    // Register the event listener
    analysisEvents.on(domain, progressHandler);

    // Handle client disconnect
    req.on('close', () => {
      console.log(`[SSE] Client disconnected for ${domain}`);
      clearInterval(keepaliveInterval);
      analysisEvents.removeListener(domain, progressHandler);
    });

    // Handle connection errors
    req.on('error', (error) => {
      console.error(`[SSE] Connection error for ${domain}:`, error);
      clearInterval(keepaliveInterval);
      analysisEvents.removeListener(domain, progressHandler);
    });
  });
}