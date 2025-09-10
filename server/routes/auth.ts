import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

export function registerAuthRoutes(app: Express) {
  // User endpoint - protected by auth
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const userId = req.user.claims.sub;
      
      // First try to find user by email (for migrated users)
      let user = await storage.getUserByEmail(userEmail);
      
      // If not found by email, try by ID (for new Auth0 users)
      if (!user) {
        user = await storage.getUser(userId);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}