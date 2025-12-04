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
      
      // Get or create user in our app's database
      let user = await storage.getUser(userId);
      
      if (!user) {
        // User doesn't exist yet - sync from Neon Auth
        try {
          const [neonAuthUser] = await db
            .select()
            .from(neonAuthUsers)
            .where(eq(neonAuthUsers.id, userId))
            .limit(1);
          
          console.log(`Creating new user in app database: ${userId}`);
          user = await storage.upsertUser({
            id: userId,
            email: neonAuthUser?.email || null,
            first_name: neonAuthUser?.name || null,
            last_name: null,
            profile_image_url: null,
          });
        } catch (error) {
          console.error('Error syncing from Neon Auth, creating user with defaults:', error);
          // Create user with defaults if Neon Auth query fails
          user = await storage.upsertUser({
            id: userId,
            email: null,
            first_name: null,
            last_name: null,
            profile_image_url: null,
          });
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}