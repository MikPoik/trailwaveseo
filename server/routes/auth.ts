import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../neonAuth";

export function registerAuthRoutes(app: Express) {
  // User endpoint - protected by auth
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.neonUser.id;
      
      // Get or create user in our app's database
      let user = await storage.getUser(userId);
      
      if (!user) {
        // User exists in Neon Auth but not in our app database yet
        // Create them with default values
        console.log(`Creating new user in app database: ${userId}`);
        user = await storage.upsertUser({
          id: userId,
          email: null,
          first_name: null,
          last_name: null,
          profile_image_url: null,
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}