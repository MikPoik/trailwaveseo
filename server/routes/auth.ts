
import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../neonAuth";
import { db } from "../db";
import { neonAuthUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerAuthRoutes(app: Express) {
  // User endpoint - protected by auth
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.neonUser.id;
      
      // Just get the user from our database
      const user = await storage.getUser(userId);
      
      if (!user) {
        res.status(404).json({ message: "User not found. Please refresh the page." });
        return;
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Sync user data from Neon Auth - called during login
  app.post('/api/auth/sync-user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.neonUser.id;
      
      // Sync user data from Neon Auth
      const [neonAuthUser] = await db
        .select()
        .from(neonAuthUsers)
        .where(eq(neonAuthUsers.id, userId))
        .limit(1);
      
      if (!neonAuthUser) {
        res.status(404).json({ message: "User not found in Neon Auth" });
        return;
      }
      
      // Upsert will create if doesn't exist, or update if it does
      const user = await storage.upsertUser({
        id: userId,
        email: neonAuthUser.email || null,
        first_name: neonAuthUser.name || null,
        last_name: null,
        profile_image_url: null,
      });
      
      res.json(user);
    } catch (error) {
      console.error('Error syncing user from Neon Auth:', error);
      res.status(500).json({ message: "Failed to sync user" });
    }
  });
}
