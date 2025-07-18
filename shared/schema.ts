import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User table for authentication/preferences
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  pagesAnalyzed: integer("pages_analyzed").notNull().default(0),
  pageLimit: integer("page_limit").notNull().default(10),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schema for users
export const insertUserSchema = createInsertSchema(users);

// Upsert schema for Replit Auth
export const upsertUserSchema = createInsertSchema(users);

// Stored SEO analyses
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  domain: text("domain").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  pagesCount: integer("pages_count").notNull(),
  metrics: jsonb("metrics").notNull(),
  pages: jsonb("pages").notNull(),
  contentRepetitionAnalysis: jsonb("content_repetition_analysis"),
  competitorAnalysis: jsonb("competitor_analysis"),
  siteOverview: jsonb("site_overview"),
});

// Insert schema for analyses
export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  userId: true,
  domain: true,
  pagesCount: true,
  metrics: true,
  pages: true,
  contentRepetitionAnalysis: true,
  competitorAnalysis: true,
  siteOverview: true,
});

// User settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  maxPages: integer("max_pages").notNull().default(20),
  crawlDelay: integer("crawl_delay").notNull().default(500),
  followExternalLinks: boolean("follow_external_links").notNull().default(false),
  analyzeImages: boolean("analyze_images").notNull().default(true),
  analyzeLinkStructure: boolean("analyze_link_structure").notNull().default(true),
  analyzePageSpeed: boolean("analyze_page_speed").notNull().default(true),
  analyzeStructuredData: boolean("analyze_structured_data").notNull().default(true),
  analyzeMobileCompatibility: boolean("analyze_mobile_compatibility").notNull().default(true),
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
  analyzePageSpeed: true,
  analyzeStructuredData: true,
  analyzeMobileCompatibility: true,
  useAI: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
