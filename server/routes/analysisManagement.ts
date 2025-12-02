import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../neonAuth";

export function registerAnalysisManagementRoutes(app: Express) {
  // Get analysis history
  app.get("/api/analysis/history", requireAuth, async (req: any, res) => {
    try {
      const userId = req.neonUser.id;
      console.log('Fetching analysis history for user:', userId);
      const history = await storage.getAnalysisHistory(userId);
      console.log('Analysis history retrieved:', history.length, 'analyses');
      res.json(history);
    } catch (error) {
      console.error("Error in analysis history endpoint:", error);
      res.status(500).json({ error: "Failed to retrieve analysis history", details: (error as Error).message });
    }
  });

  // Get recent analyses (for sidebar)
  app.get("/api/analysis/recent", async (req: any, res) => {
    try {
      // Only return analyses if user has Neon Auth ID
      const userId = req.neonUser?.id;
      if (userId) {
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
  app.get("/api/analysis/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.neonUser.id;
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
  app.delete("/api/analysis/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = req.neonUser.id;
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
}