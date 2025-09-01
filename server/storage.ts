import { users, type User, type InsertUser, analyses, type Analysis, type InsertAnalysis, settings, type Settings, type InsertSettings } from "@shared/schema";
import { z } from "zod";
import { db } from './db';
import { eq, desc, and, count, sql } from 'drizzle-orm';

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserUsage(userId: string): Promise<{ pagesAnalyzed: number; pageLimit: number; credits: number; accountStatus: string } | undefined>;
  incrementUserUsage(userId: string, pageCount: number): Promise<User | undefined>;
  deductCredits(userId: string, credits: number): Promise<User | undefined>;
  atomicDeductCredits(userId: string, credits: number): Promise<{ success: boolean; remainingCredits: number; user?: User }>;
  refundCredits(userId: string, credits: number, reason: string): Promise<User | undefined>;
  setAccountStatus(userId: string, status: string): Promise<User | undefined>;

  // Analysis operations
  getAnalysisById(id: number): Promise<Analysis | undefined>;
  getAnalysisHistory(userId?: string): Promise<Analysis[]>;
  getRecentAnalyses(limit: number, userId?: string): Promise<{id: number, domain: string}[]>;
  getLatestAnalysisByDomain(domain: string, userId?: string): Promise<Analysis | null>;
  saveAnalysis(analysis: any, userId?: string): Promise<Analysis>;
  updateCompetitorAnalysis(id: number, competitorData: any): Promise<Analysis | undefined>;
  updateContentRepetitionAnalysis(id: number, contentRepetitionAnalysis: any): Promise<Analysis | undefined>;
  updatePageInAnalysis(id: number, pageUrl: string, updatedPageData: any): Promise<Analysis | undefined>;
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

// Define AggregateMetrics and PageAnalysis interfaces if they are not globally available
interface AggregateMetrics {
  goodPractices: number;
  warnings: number;
  criticalIssues: number;
  titleOptimization: number;
  descriptionOptimization: number;
  headingsOptimization: number;
  imagesOptimization: number;
  linksOptimization: number;
}

interface PageAnalysis {
  url: string;
  title?: string;
  metaDescription?: string;
  headings: { level: number; text: string }[];
  images: { alt: string | null }[];
  internalLinks: { text: string; url: string }[];
  issues: { severity: string; category: string }[];
  // ... other properties of a page analysis
}


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

  async getUserUsage(userId: string): Promise<{ pagesAnalyzed: number; pageLimit: number; credits: number; accountStatus: string } | undefined> {
    const [user] = await db.select({
      pagesAnalyzed: users.pagesAnalyzed,
      pageLimit: users.pageLimit,
      credits: users.credits,
      accountStatus: users.accountStatus
    }).from(users).where(eq(users.id, userId));
    return user;
  }

  async incrementUserUsage(userId: string, pageCount: number): Promise<User | undefined> {
    console.log(`Incrementing usage for user ${userId} by ${pageCount} pages`);
    try {
      // First check if user exists, if not create them
      const existingUser = await this.getUser(userId);
      if (!existingUser) {
        console.log(`User ${userId} doesn't exist, creating user first`);
        await this.createUser(userId, 'unknown@example.com'); // Email will be updated by auth
      }

      const [user] = await db
        .update(users)
        .set({
          pagesAnalyzed: sql`${users.pagesAnalyzed} + ${pageCount}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      console.log(`Successfully incremented usage for user ${userId}`);
      return user;
    } catch (error) {
      console.error(`Error incrementing usage for user ${userId}:`, error);
      return undefined
    }
  }

  async createUser(userId: string, email: string): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        email: email,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
        updatedAt: new Date()
      })
      .returning();
    return newUser;
  }

  // Credit management methods
  async addCredits(userId: string, credits: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({
          credits: sql`${users.credits} + ${credits}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error(`Error adding credits for user ${userId}:`, error);
      return undefined;
    }
  }

  async deductCredits(userId: string, credits: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({
          credits: sql`GREATEST(0, ${users.credits} - ${credits})`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error(`Error deducting credits for user ${userId}:`, error);
      return undefined;
    }
  }

  // Atomic credit operations to prevent race conditions
  async atomicDeductCredits(userId: string, credits: number): Promise<{ success: boolean; remainingCredits: number; user?: User }> {
    try {
      // Use a transaction-like approach by checking credits in the same query
      const [user] = await db
        .update(users)
        .set({
          credits: sql`GREATEST(0, ${users.credits} - ${credits})`,
          updatedAt: new Date()
        })
        .where(and(
          eq(users.id, userId),
          sql`${users.credits} >= ${credits}` // Only deduct if sufficient credits
        ))
        .returning();

      if (user) {
        return { success: true, remainingCredits: user.credits, user };
      } else {
        // Get current credits to return in failure case
        const currentUser = await this.getUser(userId);
        return {
          success: false,
          remainingCredits: currentUser?.credits || 0
        };
      }
    } catch (error) {
      console.error(`Error atomically deducting credits for user ${userId}:`, error);
      const currentUser = await this.getUser(userId);
      return {
        success: false,
        remainingCredits: currentUser?.credits || 0
      };
    }
  }

  async refundCredits(userId: string, credits: number, reason: string): Promise<User | undefined> {
    try {
      console.log(`Refunding ${credits} credits to user ${userId} - Reason: ${reason}`);
      const [user] = await db
        .update(users)
        .set({
          credits: sql`${users.credits} + ${credits}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error(`Error refunding credits for user ${userId}:`, error);
      return undefined;
    }
  }

  async setAccountStatus(userId: string, status: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({
          accountStatus: status,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error(`Error setting account status for user ${userId}:`, error);
      return undefined;
    }
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({
          stripeCustomerId: stripeCustomerId,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error(`Error updating Stripe customer ID for user ${userId}:`, error);
      return undefined;
    }
  }

  // Analysis operations
  async getAnalysisById(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis;
  }

  async getAnalysisHistory(userId?: string): Promise<Analysis[]> {
    if (userId) {
      return db.select().from(analyses)
        .where(and(eq(analyses.userId, userId), sql`(is_competitor_analysis IS NULL OR is_competitor_analysis = false)`))
        .orderBy(desc(analyses.date));
    }
    // If no userId is provided, return all non-competitor analyses
    return db.select().from(analyses)
      .where(sql`(is_competitor_analysis IS NULL OR is_competitor_analysis = false)`)
      .orderBy(desc(analyses.date));
  }

  async getRecentAnalyses(limit: number = 5, userId?: string): Promise<{id: number, domain: string}[]> {
    const { pool } = await import('./db');

    let query: string;
    let params: any[];

    if (userId) {
      query = `SELECT id, domain
               FROM analyses
               WHERE user_id = $1 AND (is_competitor_analysis IS NULL OR is_competitor_analysis = false)
               ORDER BY date DESC
               LIMIT $2`;
      params = [userId, limit];
    } else {
      // If no userId, fetch global recent analyses (which are also not competitor analyses)
      query = `SELECT id, domain
               FROM analyses
               WHERE user_id IS NULL AND (is_competitor_analysis IS NULL OR is_competitor_analysis = false)
               ORDER BY date DESC
               LIMIT $1`;
      params = [limit];
    }

    const result = await pool.query(query, params);
    return result.rows;
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

  async saveAnalysis(analysis: Analysis): Promise<Analysis> {
    const { pool } = await import('./db');


    const result = await pool.query(
      `INSERT INTO analyses (user_id, domain, date, pages_count, metrics, pages, content_repetition_analysis, competitor_analysis, site_overview, is_competitor_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        analysis.userId,
        analysis.domain,
        analysis.date,
        analysis.pagesCount,
        JSON.stringify(analysis.metrics),
        JSON.stringify(analysis.pages),
        analysis.contentRepetitionAnalysis ? JSON.stringify(analysis.contentRepetitionAnalysis) : null,
        analysis.competitorAnalysis ? JSON.stringify(analysis.competitorAnalysis) : null,
        analysis.siteOverview ? JSON.stringify(analysis.siteOverview) : null,
        analysis.isCompetitorAnalysis || false
      ]
    );

    const newAnalysis = result.rows[0];

    // Increment user's page usage count if userId is provided and it's not a competitor analysis
    if (analysis.userId && !analysis.isCompetitorAnalysis) {
      const pageCount = analysis.pagesCount || analysis.pages.length;
      await this.incrementUserUsage(analysis.userId, pageCount);
    }

    // Return the saved analysis object
    return newAnalysis;
  }

  async updateCompetitorAnalysis(id: number, competitorData: any): Promise<Analysis | undefined> {
    // First check if the analysis exists
    const analysis = await this.getAnalysisById(id);
    if (!analysis) {
      return undefined;
    }

    console.log(`Saving competitor analysis for ID ${id}, data:`, JSON.stringify(competitorData).substring(0, 200) + '...');

    try {
      // Update the analysis with competitor data
      const [updatedAnalysis] = await db
        .update(analyses)
        .set({
          competitorAnalysis: competitorData,
          isCompetitorAnalysis: true // Ensure this flag is set
        })
        .where(eq(analyses.id, id))
        .returning();

      console.log(`Successfully saved competitor analysis for ID ${id}`);
      return updatedAnalysis;
    } catch (error) {
      console.error(`Error saving competitor analysis for ID ${id}:`, error);
      // Try using raw SQL as a fallback if the ORM approach fails
      try {
        const { pool } = await import('./db');
        const result = await pool.query(
          'UPDATE analyses SET competitor_analysis = $1, is_competitor_analysis = true WHERE id = $2 RETURNING *',
          [JSON.stringify(competitorData), id]
        );

        if (result.rows && result.rows.length > 0) {
          console.log(`Successfully saved competitor analysis with raw SQL for ID ${id}`);
          return result.rows[0];
        } else {
          console.error(`No rows updated for ID ${id}`);
          return undefined;
        }
      } catch (sqlError) {
        console.error(`Fallback SQL error for ID ${id}:`, sqlError);
        return undefined;
      }
    }
  }

  async updateContentRepetitionAnalysis(id: number, contentRepetitionAnalysis: any): Promise<Analysis | undefined> {
      // First check if the analysis exists
      const analysis = await this.getAnalysisById(id);
      if (!analysis) {
        return undefined;
      }

      console.log(`Saving content repetition analysis for ID ${id}, data:`, JSON.stringify(contentRepetitionAnalysis).substring(0, 200) + '...');

      try {
        // Update the analysis with content repetition data
        const [updatedAnalysis] = await db
          .update(analyses)
          .set({
            contentRepetitionAnalysis: contentRepetitionAnalysis
          })
          .where(eq(analyses.id, id))
          .returning();

        console.log(`Successfully saved content repetition analysis for ID ${id}`);
        return updatedAnalysis;
      } catch (error) {
        console.error(`Error saving content repetition analysis for ID ${id}:`, error);
        return undefined;
      }
  }

  async updatePageInAnalysis(id: number, pageUrl: string, updatedPageData: any): Promise<Analysis | undefined> {
    // First get the current analysis
    const analysis = await this.getAnalysisById(id);
    if (!analysis) {
      return undefined;
    }

    console.log(`Updating page ${pageUrl} in analysis ${id}`);

    try {
      // Find and update the specific page in the pages array
      const updatedPages = analysis.pages.map(page => {
        if (page.url === pageUrl) {
          console.log(`Found page to update: ${pageUrl}`);
          return updatedPageData;
        }
        return page;
      });

      // Recalculate metrics after the page update
      const updatedMetrics = this.calculateMetricsForPages(updatedPages);

      // Update the analysis with the new page data and metrics
      const [updatedAnalysis] = await db
        .update(analyses)
        .set({
          pages: updatedPages,
          metrics: updatedMetrics
        })
        .where(eq(analyses.id, id))
        .returning();

      console.log(`Successfully updated page ${pageUrl} in analysis ${id}`);
      return updatedAnalysis;
    } catch (error) {
      console.error(`Error updating page ${pageUrl} in analysis ${id}:`, error);
      return undefined;
    }
  }

  // Helper method to recalculate metrics for updated pages
  private calculateMetricsForPages(pages: any[]) {
    let goodPractices = 0;
    let warnings = 0;
    let criticalIssues = 0;
    let titleOptimizedPages = 0;
    let descriptionOptimizedPages = 0;
    let headingsOptimizedPages = 0;
    let imagesOptimizedPages = 0;
    let linksOptimizedPages = 0;

    pages.forEach(page => {
      // Count issues by severity
      page.issues.forEach((issue: any) => {
        if (issue.severity === 'critical') {
          criticalIssues++;
        } else if (issue.severity === 'warning') {
          warnings++;
        } else if (issue.severity === 'info') {
          goodPractices++;
        }
      });

      // Check optimization criteria
      let titleOptimized = false;
      if (page.title && page.title.length >= 10 && page.title.length <= 60) {
        titleOptimized = true;
        goodPractices++;
      }
      const titleIssues = page.issues.filter((issue: any) =>
        issue.category === 'title' && issue.severity === 'critical'
      );
      if (titleIssues.length > 0) {
        titleOptimized = false;
      }
      if (titleOptimized) titleOptimizedPages++;

      let descriptionOptimized = false;
      if (page.metaDescription && page.metaDescription.length >= 50 && page.metaDescription.length <= 160) {
        descriptionOptimized = true;
        goodPractices++;
      }
      const descriptionIssues = page.issues.filter((issue: any) =>
        issue.category === 'meta-description' && issue.severity === 'critical'
      );
      if (descriptionIssues.length > 0) {
        descriptionOptimized = false;
      }
      if (descriptionOptimized) descriptionOptimizedPages++;

      let headingsOptimized = false;
      if (page.headings.length > 0 && page.headings.some((h: any) => h.level === 1)) {
        headingsOptimized = true;
        goodPractices++;
      }
      const headingsIssues = page.issues.filter((issue: any) =>
        issue.category === 'headings' && issue.severity === 'critical'
      );
      if (headingsIssues.length > 0) {
        headingsOptimized = false;
      }
      if (headingsOptimized) headingsOptimizedPages++;

      let imagesOptimized = false;
      if (page.images.length > 0 && page.images.every((img: any) => img.alt)) {
        imagesOptimized = true;
        goodPractices++;
      } else if (page.images.length === 0) {
        imagesOptimized = true;
      }
      const imagesIssues = page.issues.filter((issue: any) =>
        issue.category === 'images' && issue.severity === 'critical'
      );
      if (imagesIssues.length > 0) {
        imagesOptimized = false;
      }
      if (imagesOptimized) imagesOptimizedPages++;

      let linksOptimized = false;
      if (page.internalLinks && page.internalLinks.length >= 3) {
        const genericTexts = ['click here', 'read more', 'learn more', 'here', 'this', 'link'];
        const hasGoodAnchorText = page.internalLinks.every((link: any) =>
          !genericTexts.some(generic => link.text.toLowerCase().includes(generic))
        );
        if (hasGoodAnchorText) {
          linksOptimized = true;
          goodPractices++;
        }
      }
      const linksIssues = page.issues.filter((issue: any) =>
        issue.category === 'links' && issue.severity === 'critical'
      );
      if (linksIssues.length > 0) {
        linksOptimized = false;
      }
      if (linksOptimized) linksOptimizedPages++;
    });

    const pageCount = Math.max(1, pages.length);
    return {
      goodPractices,
      warnings,
      criticalIssues,
      titleOptimization: Math.round((titleOptimizedPages / pageCount) * 100),
      descriptionOptimization: Math.round((descriptionOptimizedPages / pageCount) * 100),
      headingsOptimization: Math.round((headingsOptimizedPages / pageCount) * 100),
      imagesOptimization: Math.round((imagesOptimizedPages / pageCount) * 100),
      linksOptimization: Math.round((linksOptimizedPages / pageCount) * 100)
    };
  }

  async deleteAnalysis(id: number): Promise<boolean> {
    const result = await db.delete(analyses).where(eq(analyses.id, id));
    return result.rowCount > 0;
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