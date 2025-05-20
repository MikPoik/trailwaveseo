import { users, type User, type InsertUser, analyses, type Analysis, type InsertAnalysis, settings, type Settings, type InsertSettings } from "@shared/schema";
import { z } from "zod";
import { db } from './db';
import { eq, desc, and, count, sql } from 'drizzle-orm';

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Analysis operations
  getAnalysisById(id: number): Promise<Analysis | undefined>;
  getAnalysisHistory(userId?: string): Promise<Analysis[]>;
  getRecentAnalyses(limit: number, userId?: string): Promise<{id: number, domain: string}[]>;
  getLatestAnalysisByDomain(domain: string, userId?: string): Promise<Analysis | null>;
  saveAnalysis(analysis: any, userId?: string): Promise<Analysis>;
  updateCompetitorAnalysis(id: number, competitorData: any): Promise<Analysis | undefined>;
  deleteAnalysis(id: number): Promise<boolean>;
  
  // Settings operations
  getSettings(userId?: string): Promise<Settings>;
  updateSettings(newSettings: Partial<Settings>, userId?: string): Promise<Settings>;
}

// Type for user upsert from Replit Auth
export type UpsertUser = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
};

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        profileImageUrl: userData.profile_image_url,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          profileImageUrl: userData.profile_image_url,
          updatedAt: new Date()
        }
      })
      .returning();
    return user;
  }
  
  // Analysis operations
  async getAnalysisById(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis;
  }
  
  async getAnalysisHistory(userId?: string): Promise<Analysis[]> {
    if (userId) {
      return db.select().from(analyses)
        .where(eq(analyses.userId, userId))
        .orderBy(desc(analyses.date));
    }
    return db.select().from(analyses).orderBy(desc(analyses.date));
  }
  
  async getRecentAnalyses(limit: number, userId?: string): Promise<{id: number, domain: string}[]> {
    let query = db.select({
      id: analyses.id,
      domain: analyses.domain
    }).from(analyses);
    
    if (userId) {
      query = query.where(eq(analyses.userId, userId));
    }
    
    return query.orderBy(desc(analyses.date)).limit(limit);
  }
  
  async getLatestAnalysisByDomain(domain: string, userId?: string): Promise<Analysis | null> {
    let query = db.select().from(analyses)
      .where(eq(analyses.domain, domain));
    
    if (userId) {
      query = query.where(eq(analyses.userId, userId));
    }
    
    const analysisResults = await query.orderBy(desc(analyses.date)).limit(1);
    return analysisResults.length > 0 ? analysisResults[0] : null;
  }
  
  async saveAnalysis(analysis: any, userId?: string): Promise<Analysis> {
    const [newAnalysis] = await db
      .insert(analyses)
      .values({
        userId: userId || null,
        domain: analysis.domain,
        date: new Date(),
        pagesCount: analysis.pagesCount || analysis.pages.length,
        metrics: analysis.metrics,
        pages: analysis.pages,
        contentRepetitionAnalysis: analysis.contentRepetitionAnalysis
      })
      .returning();
    
    return newAnalysis;
  }
  
  async updateCompetitorAnalysis(id: number, competitorData: any): Promise<Analysis | undefined> {
    // First check if the analysis exists
    const analysis = await this.getAnalysisById(id);
    if (!analysis) {
      return undefined;
    }
    
    // Update the analysis with competitor data
    const [updatedAnalysis] = await db
      .update(analyses)
      .set({
        competitorAnalysis: competitorData
      })
      .where(eq(analyses.id, id))
      .returning();
    
    return updatedAnalysis;
  }
  
  async deleteAnalysis(id: number): Promise<boolean> {
    const result = await db.delete(analyses).where(eq(analyses.id, id));
    return result.count > 0;
  }
  
  // Settings operations
  async getSettings(userId?: string): Promise<Settings> {
    let settingsQuery = db.select().from(settings);
    
    if (userId) {
      settingsQuery = settingsQuery.where(eq(settings.userId, userId));
    } else {
      // Get global settings (no userId)
      settingsQuery = settingsQuery.where(sql`${settings.userId} IS NULL`);
    }
    
    const settingsResults = await settingsQuery.limit(1);
    
    if (settingsResults.length > 0) {
      return settingsResults[0];
    }
    
    // If no settings found, create default settings
    const defaultSettings: Omit<Settings, 'id'> = {
      userId: userId || null,
      maxPages: 20,
      crawlDelay: 500,
      followExternalLinks: false,
      analyzeImages: true,
      analyzeLinkStructure: true,
      analyzePageSpeed: true,
      analyzeStructuredData: true,
      analyzeMobileCompatibility: true,
      useAI: true
    };
    
    // Insert default settings
    const [newSettings] = await db
      .insert(settings)
      .values(defaultSettings)
      .returning();
    
    return newSettings;
  }
  
  async updateSettings(newSettings: Partial<Settings>, userId?: string): Promise<Settings> {
    try {
      // First, get current settings or create if they don't exist
      const currentSettings = await this.getSettings(userId);
      
      console.log("Current settings:", currentSettings);
      console.log("New settings to apply:", newSettings);
      
      // Directly use the imported pool from db.ts
      const query = `
        UPDATE settings 
        SET 
          max_pages = $1,
          crawl_delay = $2,
          follow_external_links = $3,
          analyze_images = $4,
          analyze_link_structure = $5,
          use_ai = $6,
          analyze_page_speed = $7,
          analyze_structured_data = $8,
          analyze_mobile_compatibility = $9
        WHERE 
          ${userId ? "user_id = $10" : "user_id IS NULL"}
        RETURNING *
      `;
      
      const values = [
        newSettings.maxPages ?? currentSettings.maxPages,
        newSettings.crawlDelay ?? currentSettings.crawlDelay,
        newSettings.followExternalLinks ?? currentSettings.followExternalLinks,
        newSettings.analyzeImages ?? currentSettings.analyzeImages,
        newSettings.analyzeLinkStructure ?? currentSettings.analyzeLinkStructure,
        newSettings.useAI ?? currentSettings.useAI,
        newSettings.analyzePageSpeed ?? currentSettings.analyzePageSpeed ?? true,
        newSettings.analyzeStructuredData ?? currentSettings.analyzeStructuredData ?? true,
        newSettings.analyzeMobileCompatibility ?? currentSettings.analyzeMobileCompatibility ?? true
      ];
      
      // Add userId as the last parameter if it exists
      if (userId) {
        values.push(userId);
      }
      
      // Import the pool directly from db.ts file
      const { pool } = await import('./db');
      const result = await pool.query(query, values);
      
      console.log("Settings update result rows:", result.rows?.length);
      
      // If no rows updated, something went wrong
      if (!result.rows || result.rows.length === 0) {
        throw new Error("No settings were updated");
      }
      
      // Convert snake_case column names to camelCase for response
      const updatedSettings = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        maxPages: result.rows[0].max_pages,
        crawlDelay: result.rows[0].crawl_delay,
        followExternalLinks: result.rows[0].follow_external_links,
        analyzeImages: result.rows[0].analyze_images,
        analyzeLinkStructure: result.rows[0].analyze_link_structure,
        analyzePageSpeed: result.rows[0].analyze_page_speed,
        analyzeStructuredData: result.rows[0].analyze_structured_data,
        analyzeMobileCompatibility: result.rows[0].analyze_mobile_compatibility,
        useAI: result.rows[0].use_ai
      };
      
      return updatedSettings as Settings;
    } catch (error) {
      console.error("Error in updateSettings:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
