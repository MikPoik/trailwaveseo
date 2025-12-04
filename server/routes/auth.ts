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
      
      // Always sync user data from Neon Auth to keep it up-to-date
      try {
        const [neonAuthUser] = await db
          .select()
          .from(neonAuthUsers)
          .where(eq(neonAuthUsers.id, userId))
          .limit(1);
        
        // Upsert will create if doesn't exist, or update if it does
        const user = await storage.upsertUser({
          id: userId,
          email: neonAuthUser?.email || null,
          first_name: neonAuthUser?.name || null,
          last_name: null,
          profile_image_url: null,
        });
        
        res.json(user);
      } catch (error) {
        console.error('Error syncing from Neon Auth:', error);
        // Fallback to existing user data if sync fails
        const user = await storage.getUser(userId);
        if (user) {
          res.json(user);
        } else {
          res.status(500).json({ message: "Failed to fetch user" });
        }
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}