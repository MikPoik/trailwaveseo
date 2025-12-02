import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index, pgSchema } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Reference to Neon Auth's managed schema
export const neonAuthSchema = pgSchema("neon_auth");

export const neonAuthUsers = neonAuthSchema.table("users_sync", {
  id: text("id").primaryKey(),
  rawJson: jsonb("raw_json"),
  name: text("name"),
  email: text("email"),
  createdAt: timestamp("created_at"),
  deletedAt: timestamp("deleted_at"),
  updatedAt: timestamp("updated_at"),
});

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
  chatMessagesInPack: integer("chat_messages_in_pack").notNull().default(0), // Track messages in current pack of 5
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
  contentQualityAnalysis: jsonb("content_quality_analysis"),
  competitorAnalysis: jsonb("competitor_analysis"),
  siteOverview: jsonb("site_overview"),
  enhancedInsights: jsonb("enhanced_insights"),
  designAnalysis: jsonb("design_analysis"),
  isCompetitorAnalysis: boolean("is_competitor_analysis").notNull().default(false),
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
  contentQualityAnalysis: true,
  competitorAnalysis: true,
  siteOverview: true,
  enhancedInsights: true,
  designAnalysis: true,
  isCompetitorAnalysis: true,
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

// Content conversations for AI chat editor
export const contentConversations = pgTable("content_conversations", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => analyses.id).notNull(),
  pageUrl: text("page_url").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  messages: jsonb("messages").notNull().default('[]'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schema for content conversations
export const insertContentConversationSchema = createInsertSchema(contentConversations).pick({
  analysisId: true,
  pageUrl: true,
  userId: true,
  messages: true,
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
  duplicationType?: 'exact' | 'template' | 'intent' | 'boilerplate';
  templatePattern?: string;
  businessImpact?: string;
}

// Screenshot and design analysis types
export interface ScreenshotData {
  url: string;
  screenshotUrl: string;
  captureTimestamp: string;
  error?: string;
}

export interface DesignRecommendation {
  category: 'layout' | 'navigation' | 'visual_hierarchy' | 'accessibility' | 'mobile_responsiveness' | 'branding' | 'content_structure' | 'brand_color_psychology';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  expectedImpact: string;
  implementation: string;
}

export interface DesignAnalysis {
  overallScore: number; // 0-100
  screenshotData: ScreenshotData;
  recommendations: DesignRecommendation[];
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

// Enhanced analysis types
export interface ContentCategory {
  type: 'boilerplate' | 'navigation' | 'value' | 'cta' | 'template';
  confidence: number;
  reason: string;
}

export interface TemplatePattern {
  pattern: string;
  variables: string[];
  instances: Array<{
    content: string;
    url: string;
    extractedVariables: Record<string, string>;
  }>;
  businessImpact: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface IntentAnalysis {
  intent: string;
  confidence: number;
  competingPages: Array<{
    url: string;
    content: string;
    intentMatch: number;
  }>;
  consolidationSuggestion?: string;
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

// Unified Content Quality Analysis types
export interface ContentQualityAnalysis {
  // Content uniqueness analysis
  contentUniqueness: {
    duplicateContent: {
      titles: ContentDuplicateGroup[];
      descriptions: ContentDuplicateGroup[];
      headings: ContentDuplicateGroup[];
      paragraphs: ContentDuplicateGroup[];
    };
    uniquenessScore: number; // 0-100
    totalDuplicates: number;
    pagesAnalyzed: number;
  };
  
  // Keyword quality analysis  
  keywordQuality: {
    overOptimization: KeywordIssue[];
    underOptimization: KeywordOpportunity[];
    healthScore: number; // 0-100
    readabilityImpact: 'Critical' | 'High' | 'Medium' | 'Low';
    affectedPages: number;
  };
  
  // Content quality scores
  qualityScores: {
    averageScores: {
      uniqueness: number;
      userValue: number;
      seoEffectiveness: number;
      readability: number;
      overall: number;
    };
    topPerformers: Array<{
      url: string;
      content: string;
      scores: {
        uniqueness: number;
        userValue: number;
        seoEffectiveness: number;
        readability: number;
        overall: number;
      };
      insights: {
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
      };
      contentType: 'exceptional' | 'good' | 'average' | 'poor' | 'critical';
      priority: number;
    }>;
    needsImprovement: Array<{
      url: string;
      content: string;
      scores: {
        uniqueness: number;
        userValue: number;
        seoEffectiveness: number;
        readability: number;
        overall: number;
      };
      insights: {
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
      };
      contentType: 'exceptional' | 'good' | 'average' | 'poor' | 'critical';
      priority: number;
    }>;
  };
  
  // Strategic recommendations
  strategicRecommendations: {
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    category: 'content' | 'keywords' | 'structure' | 'quality';
    title: string;
    description: string;
    implementation: string;
    expectedImpact: string;
  }[];
  
  // Overall health metrics
  overallHealth: {
    contentScore: number; // 0-100
    keywordScore: number; // 0-100
    qualityScore: number; // 0-100
    combinedScore: number; // 0-100
  };
}

export interface ContentDuplicateGroup {
  content: string;
  urls: string[];
  similarityScore: number;
  impactLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  improvementStrategy: string;
  duplicationType: 'exact' | 'template' | 'boilerplate' | 'pattern';
}

export interface KeywordIssue {
  keyword: string;
  density: number;
  occurrences: number;
  impactLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  affectedPages: string[];
  improvementStrategy: string;
  alternatives: string[];
}

export interface KeywordOpportunity {
  suggestion: string;
  currentUsage: string;
  opportunity: string;
  expectedBenefit: string;
  implementation: string;
}

// Chat message interface
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type ContentConversation = typeof contentConversations.$inferSelect;
export type InsertContentConversation = z.infer<typeof insertContentConversationSchema>;
