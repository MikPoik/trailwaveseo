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

export interface ContentRepetitionAnalysis {
  titleRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
  };
  descriptionRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
  };
  headingRepetition: {
    repetitiveCount: number;
    totalCount: number;
    examples: string[];
    recommendations: string[];
  };
  overallRecommendations: string[];
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

export interface WebsiteAnalysis {
  id?: number;
  domain: string;
  date: string;
  pagesCount: number;
  metrics: WebsiteAnalysisMetrics;
  pages: PageAnalysis[];
  contentRepetitionAnalysis?: ContentRepetitionAnalysis;
  competitorAnalysis?: CompetitorAnalysisResult;
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