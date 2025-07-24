import { z } from "zod";

// Shared validation schemas used across different route modules

export const analyzeRequestSchema = z.object({
  domain: z.string().min(1).max(255),
  useSitemap: z.boolean().default(true),
  additionalInfo: z.string().optional(),
});

export const settingsSchema = z.object({
  maxPages: z.number().min(1).max(100).default(20),
  crawlDelay: z.number().min(100).max(3000).default(500),
  followExternalLinks: z.boolean().default(false),
  analyzeImages: z.boolean().default(true),
  analyzeLinkStructure: z.boolean().default(true),
  analyzePageSpeed: z.boolean().default(true),
  analyzeStructuredData: z.boolean().default(true),
  analyzeMobileCompatibility: z.boolean().default(true),
  useAI: z.boolean().default(true),
});

export const flexibleSettingsSchema = z.object({
  maxPages: z.number().optional(),
  crawlDelay: z.number().optional(),
  followExternalLinks: z.boolean().optional(),
  analyzeImages: z.boolean().optional(),
  analyzeLinkStructure: z.boolean().optional(),
  useAI: z.boolean().optional(),
  // Optional newer fields
  analyzePageSpeed: z.boolean().optional(),
  analyzeStructuredData: z.boolean().optional(),
  analyzeMobileCompatibility: z.boolean().optional(),
});