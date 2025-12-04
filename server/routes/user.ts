import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../neonAuth";
import { db } from "../db";
import { neonAuthUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerUserRoutes(app: Express) {
  // User usage endpoint - protected by auth
  app.get('/api/user/usage', requireAuth, async (req: any, res) => {
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
        await storage.upsertUser({
          id: userId,
          email: neonAuthUser?.email || null,
          first_name: neonAuthUser?.name || null,
          last_name: null,
          profile_image_url: null,
        });
      } catch (error) {
        console.error('Error syncing from Neon Auth:', error);
        // Continue anyway - user might already exist
      }
      
      // Get their usage
      const usage = await storage.getUserUsage(userId);
      
      if (!usage) {
        res.status(500).json({ message: "Failed to fetch user usage" });
        return;
      }
      
      res.json(usage);
    } catch (error) {
      console.error("Error fetching user usage:", error);
      res.status(500).json({ message: "Failed to fetch user usage" });
    }
  });
}