import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table for authentication/preferences
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Insert schema for users
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Stored SEO analyses
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  pagesCount: integer("pages_count").notNull(),
  metrics: jsonb("metrics").notNull(),
  pages: jsonb("pages").notNull(),
});

// Insert schema for analyses
export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  domain: true,
  pagesCount: true,
  metrics: true,
  pages: true,
});

// User settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  maxPages: integer("max_pages").notNull().default(20),
  crawlDelay: integer("crawl_delay").notNull().default(500),
  followExternalLinks: boolean("follow_external_links").notNull().default(false),
  analyzeImages: boolean("analyze_images").notNull().default(true),
  analyzeLinkStructure: boolean("analyze_link_structure").notNull().default(true),
  useAI: boolean("use_ai").notNull().default(true),
});

// Insert schema for settings
export const insertSettingsSchema = createInsertSchema(settings).pick({
  userId: true,
  maxPages: true,
  crawlDelay: true,
  followExternalLinks: true,
  analyzeImages: true,
  analyzeLinkStructure: true,
  useAI: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
