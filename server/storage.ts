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
    // First, ensure settings exist
    await this.getSettings(userId);
    
    let updateQuery = db.update(settings);
    
    if (userId) {
      updateQuery = updateQuery.where(eq(settings.userId, userId));
    } else {
      updateQuery = updateQuery.where(sql`${settings.userId} IS NULL`);
    }
    
    const [updatedSettings] = await updateQuery
      .set(newSettings)
      .returning();
    
    return updatedSettings;
  }
}

export const storage = new DatabaseStorage();
