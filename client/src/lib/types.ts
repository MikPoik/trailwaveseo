// Analysis Types
export type IssueType = 'critical' | 'warning' | 'info';
export type SeoCategory = 'title' | 'meta-description' | 'headings' | 'images' | 'links' | 'canonical' | 'robots';
export type AnalysisState = 'idle' | 'analyzing' | 'completed' | 'error';

export interface Heading {
  level: number; // 1-6
  text: string;
}

export interface Image {
  src: string;
  alt: string | null;
  width?: number;
  height?: number;
  suggestedAlt?: string;
}

export interface InternalLink {
  href: string;
  text: string;
  title?: string;
}

export interface SeoIssue {
  category: SeoCategory;
  severity: IssueType;
  title: string;
  description: string;
}

export interface ContentMetrics {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  sentenceCount: number;
  averageWordsPerSentence: number;
  averageWordsPerParagraph: number;
  readabilityScore: number;
  keywordDensity: Array<{keyword: string, count: number, density: number}>;
  contentDepthScore: number;
  semanticKeywords: string[];
}

export interface OpenGraphData {
  title: string | null;
  description: string | null;
  image: string | null;
  type: string | null;
  url: string | null;
}

export interface TwitterCardData {
  card: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
}

export interface PageAnalysis {
  url: string;
  pageName?: string;
  title: string | null;
  metaDescription: string | null;
  metaKeywords: string[] | null;
  headings: Heading[];
  images: Image[];
  internalLinks?: InternalLink[];
  canonical: string | null;
  robotsMeta: string | null;
  issues: SeoIssue[];
  suggestions: string[];
  contentMetrics?: ContentMetrics;
  schemaMarkup?: any[];
  openGraph?: OpenGraphData;
  twitterCard?: TwitterCardData;
  viewport?: string | null;
  htmlLang?: string | null;
  hreflangLinks?: Array<{hreflang: string, href: string}>;
  mobileOptimized?: boolean;
}

export interface WebsiteAnalysisMetrics {
  goodPractices: number;
  warnings: number;
  criticalIssues: number;
  titleOptimization: number;
  descriptionOptimization: number;
  headingsOptimization: number;
  imagesOptimization: number;
  linksOptimization: number;
}

export interface DuplicateItem {
  content: string;
  urls: string[];
  similarityScore: number;
  impactLevel?: 'Critical' | 'High' | 'Medium' | 'Low';
  priority?: number; // 1-5, where 1 is most urgent
  rootCause?: string;
  improvementStrategy?: string;
}

export interface ContentRepetitionAnalysis {
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
    score: number;
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

export interface ComparisonMetric {
  main: number;
  competitor: number;
  difference: number;
}

export interface CompetitorAnalysisResult {
  mainDomain: string;
  competitorDomain: string;
  metrics: {
    titleOptimization: ComparisonMetric;
    descriptionOptimization: ComparisonMetric;
    headingsOptimization: ComparisonMetric;
    imagesOptimization: ComparisonMetric;
    criticalIssues: ComparisonMetric;
  };
  recommendations: string[];
  analysis?: WebsiteAnalysis;
  details?: {
    main: {
      titles: string[];
      descriptions: string[];
      headings: string[];
      images: number;
      pages: number;
    };
    competitor: {
      titles: string[];
      descriptions: string[];
      headings: string[];
      images: number;
      pages: number;
    };
  };
}

export interface ScreenshotData {
  url: string;
  screenshotUrl: string;
  captureTimestamp: string;
  error?: string;
}

export interface DesignRecommendation {
  category: 'layout' | 'navigation' | 'visual_hierarchy' | 'accessibility' | 'mobile_responsiveness' | 'branding';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  expectedImpact: string;
  implementation: string;
}

export interface DesignAnalysis {
  overallScore: number;
  screenshotData: ScreenshotData;
  recommendations: DesignRecommendation[];
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

export interface SiteDesignAnalysis {
  overallScore: number;
  pageAnalyses: DesignAnalysis[];
  totalPagesAnalyzed: number;
  summary: string;
  error?: string;
}

export interface EnhancedInsights {
  technicalAnalysis?: {
    overallScore: number;
    explanation?: string;
    findings: Array<{
      category: string;
      score: number;
      issues: string[];
      recommendations: string[];
    }>;
  };
  contentQualityAnalysis?: {
    overallScore: number;
    explanation?: string;
    findings: Array<{
      category: string;
      score: number;
      issues: string[];
      recommendations: string[];
    }>;
  };
  linkArchitectureAnalysis?: {
    overallScore: number;
    explanation?: string;
    findings: Array<{
      category: string;
      score: number;
      issues: string[];
      recommendations: string[];
    }>;
  };
  performanceAnalysis?: {
    overallScore: number;
    explanation?: string;
    findings: Array<{
      category: string;
      score: number;
      issues: string[];
      recommendations: string[];
    }>;
  };
  designAnalysis?: SiteDesignAnalysis;
}

export interface WebsiteAnalysis {
  id?: number;
  domain: string;
  date: string;
  pagesCount: number;
  metrics: WebsiteAnalysisMetrics;
  pages: PageAnalysis[];
  contentRepetitionAnalysis?: ContentRepetitionAnalysis;
  keywordRepetitionAnalysis?: KeywordRepetitionAnalysis;
  competitorAnalysis?: CompetitorAnalysisResult;
  enhancedInsights?: EnhancedInsights;
  designAnalysis?: SiteDesignAnalysis;
  siteOverview?: {
    businessType?: string;
    industry?: string;
    targetAudience?: string;
    mainServices?: string[];
    location?: string;
  };
  processingStats?: {
    totalProcessingTime?: number;
    pagesDiscovered?: number;
    pagesAnalyzed: number;
    aiCallsMade?: number;
    creditsUsed?: number;
  };
}

// API Types
export interface AnalyzeRequestBody {
  domain: string;
  useSitemap: boolean;
}

export interface ProgressUpdate {
  status: 'in-progress' | 'completed' | 'error';
  domain: string;
  pagesFound: number;
  pagesAnalyzed: number;
  currentPageUrl: string;
  analyzedPages: string[];
  percentage: number;
  analysis?: WebsiteAnalysis;
  error?: string;
}

export interface SettingsData {
  maxPages: number;
  crawlDelay: number;
  followExternalLinks: boolean;
  analyzeImages: boolean;
  analyzeLinkStructure: boolean;
  useAI: boolean;
}