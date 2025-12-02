import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { EventEmitter } from "events";

// Import route modules
import { registerAuthRoutes } from "./auth";
import { registerUserRoutes } from "./user";
import { registerSettingsRoutes } from "./settings";
import { registerAnalysisRoutes } from "./analysis";
import { registerAnalysisManagementRoutes } from "./analysisManagement";
import { registerAnalysisFeaturesRoutes } from "./analysisFeatures";
import { registerPaymentRoutes } from "./payments";
import { registerContentConversationRoutes } from "./contentConversations";

// Global event emitter for Server-Sent Events
export const analysisEvents = new EventEmitter();

// Rate limiting - increased limits for development
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased for development
  standardHeaders: true,
  legacyHeaders: false,
});

export const crawlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased for development
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Basic rate limiting for all API routes (skip in development)
  if (process.env.NODE_ENV !== 'development') {
    app.use("/api", apiLimiter);
  }

  // Register all route modules
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerSettingsRoutes(app);
  registerAnalysisRoutes(app);
  registerAnalysisManagementRoutes(app);
  registerAnalysisFeaturesRoutes(app);
  registerContentConversationRoutes(app);
  await registerPaymentRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}