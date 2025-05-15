import { users, type User, type InsertUser, analyses, type Analysis, type InsertAnalysis, settings, type Settings, type InsertSettings } from "@shared/schema";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Analysis operations
  getAnalysisById(id: number): Promise<Analysis | undefined>;
  getAnalysisHistory(): Promise<Analysis[]>;
  getRecentAnalyses(limit: number): Promise<{id: number, domain: string}[]>;
  saveAnalysis(analysis: any): Promise<Analysis>;
  deleteAnalysis(id: number): Promise<boolean>;
  
  // Settings operations
  getSettings(): Promise<Settings>;
  updateSettings(newSettings: Partial<Settings>): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private analyses: Map<number, Analysis>;
  private appSettings: Settings;
  private userIdCounter: number;
  private analysisIdCounter: number;

  constructor() {
    this.users = new Map();
    this.analyses = new Map();
    this.userIdCounter = 1;
    this.analysisIdCounter = 1;
    
    // Default settings
    this.appSettings = {
      id: 1,
      userId: null,
      maxPages: 20,
      crawlDelay: 500,
      followExternalLinks: false,
      analyzeImages: true,
      analyzeLinkStructure: true,
      useAI: true
    };
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Analysis operations
  async getAnalysisById(id: number): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }
  
  async getAnalysisHistory(): Promise<Analysis[]> {
    return Array.from(this.analyses.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getRecentAnalyses(limit: number): Promise<{id: number, domain: string}[]> {
    return Array.from(this.analyses.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
      .map(analysis => ({
        id: analysis.id,
        domain: analysis.domain
      }));
  }
  
  async saveAnalysis(analysis: any): Promise<Analysis> {
    const id = this.analysisIdCounter++;
    const newAnalysis: Analysis = {
      id,
      domain: analysis.domain,
      date: analysis.date || new Date().toISOString(),
      pagesCount: analysis.pagesCount || analysis.pages.length,
      metrics: analysis.metrics,
      pages: analysis.pages
    };
    
    this.analyses.set(id, newAnalysis);
    return newAnalysis;
  }
  
  async deleteAnalysis(id: number): Promise<boolean> {
    return this.analyses.delete(id);
  }
  
  // Settings operations
  async getSettings(): Promise<Settings> {
    return { ...this.appSettings };
  }
  
  async updateSettings(newSettings: Partial<Settings>): Promise<Settings> {
    this.appSettings = {
      ...this.appSettings,
      ...newSettings
    };
    
    return { ...this.appSettings };
  }
}

export const storage = new MemStorage();


  /**
   * Get the latest analysis for a specific domain
   * @param domain Domain to search for
   * @returns Most recent analysis for the domain, or null if not found
   */
  async getLatestAnalysisByDomain(domain: string): Promise<any> {
    const analysisHistory = await this.getAnalysisHistory();
    
    // Find all analyses for this domain
    const domainAnalyses = analysisHistory.filter(analysis => analysis.domain === domain);
    
    // Sort by date (newest first)
    domainAnalyses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Return the most recent, or null if none found
    return domainAnalyses.length > 0 ? domainAnalyses[0] : null;
  }
