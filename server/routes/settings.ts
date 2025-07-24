import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { flexibleSettingsSchema } from "./schemas";

export function registerSettingsRoutes(app: Express) {
  // Default settings endpoint
  app.get("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getSettings(userId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve settings" });
    }
  });

  // Update settings endpoint
  app.post("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Updating settings for user:", userId);
      console.log("Settings payload:", JSON.stringify(req.body));

      // Validate and parse the settings
      const parsedSettings = flexibleSettingsSchema.parse(req.body);
      console.log("Parsed settings:", JSON.stringify(parsedSettings));

      // Update settings
      const updatedSettings = await storage.updateSettings(parsedSettings, userId);
      res.json(updatedSettings);
    } catch (error: any) {
      console.error("Settings update failed:", error);

      if (error instanceof z.ZodError) {
        console.error("Validation error:", JSON.stringify(error.errors));
        res.status(400).json({ error: "Invalid settings format", details: error.errors });
      } else {
        console.error("Server error updating settings:", error);
        res.status(500).json({ 
          error: "Failed to update settings", 
          message: error.message || "Unknown error",
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }
  });
}