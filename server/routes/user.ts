import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../neonAuth";

export function registerUserRoutes(app: Express) {
  // User usage endpoint - protected by auth
  app.get('/api/user/usage', requireAuth, async (req: any, res) => {
    try {
      const userId = req.neonUser.id;
      
      // Get or create user
      let usage = await storage.getUserUsage(userId);
      
      if (!usage) {
        // User doesn't exist yet, create them first
        console.log(`Creating new user for usage check: ${userId}`);
        await storage.upsertUser({
          id: userId,
          email: null,
          first_name: null,
          last_name: null,
          profile_image_url: null,
        });
        
        // Now get their usage (should have default values)
        usage = await storage.getUserUsage(userId);
      }
      
      if (!usage) {
        res.status(500).json({ message: "Failed to create user" });
        return;
      }
      
      res.json(usage);
    } catch (error) {
      console.error("Error fetching user usage:", error);
      res.status(500).json({ message: "Failed to fetch user usage" });
    }
  });
}