import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../neonAuth";

export function registerUserRoutes(app: Express) {
  // User usage endpoint - protected by auth
  app.get('/api/user/usage', requireAuth, async (req: any, res) => {
    try {
      const userId = req.neonUser.id;

      // Get their usage
      const usage = await storage.getUserUsage(userId);

      if (!usage) {
        res.status(404).json({ message: "User not found. Please refresh the page." });
        return;
      }

      res.json(usage);
    } catch (error) {
      console.error("Error fetching user usage:", error);
      res.status(500).json({ message: "Failed to fetch user usage" });
    }
  });
}