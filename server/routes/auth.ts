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
      
      // Get user data from Neon Auth
      const [neonAuthUser] = await db
        .select()
        .from(neonAuthUsers)
        .where(eq(neonAuthUsers.id, userId))
        .limit(1);
      
      // Get or create user in our app's database
      let user = await storage.getUser(userId);
      
      if (!user) {
        // User exists in Neon Auth but not in our app database yet
        // Create them with data from Neon Auth
        console.log(`Creating new user in app database: ${userId}`);
        user = await storage.upsertUser({
          id: userId,
          email: neonAuthUser?.email || null,
          first_name: neonAuthUser?.name || null,
          last_name: null,
          profile_image_url: null,
        });
      } else if (neonAuthUser) {
        // User exists, but check if we need to update email/name
        const needsUpdate = 
          user.email !== neonAuthUser.email || 
          user.first_name !== neonAuthUser.name;
        
        if (needsUpdate) {
          console.log(`Syncing user data from Neon Auth for: ${userId}`);
          user = await storage.upsertUser({
            id: userId,
            email: neonAuthUser.email || user.email,
            first_name: neonAuthUser.name || user.first_name,
            last_name: user.last_name,
            profile_image_url: user.profile_image_url,
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