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
  pageLimit: integer("page_limit").notNull().default(-1), // -1 means unlimited
  credits: integer("credits").notNull().default(15), // New users get 15 starter credits
  accountStatus: varchar("account_status").notNull().default("trial"), // "trial" or "paid"
  stripeCustomerId: varchar("stripe_customer_id"),
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
  keywordRepetitionAnalysis: jsonb("keyword_repetition_analysis"),
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
  keywordRepetitionAnalysis: true,
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

// Content duplication analysis types
export interface DuplicateItem {
  content: string;
  urls: string[];
  similarityScore: number;
  impactLevel?: 'Critical' | 'High' | 'Medium' | 'Low';
  priority?: number; // 1-5, where 1 is most urgent
  rootCause?: string;
  improvementStrategy?: string;
}

export interface ContentDuplicationAnalysis {
  titleRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
    duplicateGroups: DuplicateItem[];
  };
  descriptionRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
    duplicateGroups: DuplicateItem[];
  };
  headingRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
    duplicateGroups: DuplicateItem[];
    byLevel: {
      h1: DuplicateItem[];
      h2: DuplicateItem[];
      h3: DuplicateItem[];
      h4: DuplicateItem[];
      h5: DuplicateItem[];
      h6: DuplicateItem[];
    };
  };
  paragraphRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
    duplicateGroups: DuplicateItem[];
  };
  overallRecommendations: string[];
}

// Keyword repetition analysis types
export interface KeywordDensityItem {
  keyword: string;
  density: number;
  occurrences: number;
  impactLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  affectedPages: string[];
  improvementStrategy: string;
  alternatives: string[];
}

export interface KeywordRepetitionAnalysis {
  overallKeywordHealth: {
    score: number; // 1-100, where 100 is optimal
    issues: number;
    recommendations: string[];
  };
  topProblematicKeywords: KeywordDensityItem[];
  siteWidePatterns: {
    repetitiveCount: number;
    totalAnalyzed: number;
    examples: string[];
    recommendations: string[];
  };
  readabilityImpact: {
    affectedPages: number;
    severityLevel: 'Critical' | 'High' | 'Medium' | 'Low';
    improvementAreas: string[];
  };
  keywordOpportunities: {
    suggestion: string;
    benefit: string;
    implementation: string;
  }[];
}

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
