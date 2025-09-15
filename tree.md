# Source Code Tree

Generated on: 2025-09-15T10:37:32.964Z

```
├── 📁 client/
│   └── 📁 src/
│       ├── 📄 App.tsx
│       │   ⚡ ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>; path: string }): Element
│       │   ⚡ Router(): Element
│       │   ⚡ AuthenticatedApp({ children }: { children: React.ReactNode }): Element
│       │   ⚡ App(): Element
│       ├── 📁 components/
│       │   ├── 📄 AnalysisHistory.tsx
│       │   │   ➡️ AnalysisHistory({ onSelectAnalysis }: AnalysisHistoryProps): Element
│       │   │   📋 AnalysisHistoryProps
│       │   ├── 📄 AnalysisProgress.tsx
│       │   │   ➡️ AnalysisProgress({
  domain,
  pagesFound,
  pagesAnalyzed,
  currentPageUrl,
  analyzedPages,
  percentage,
  onCancel
}: AnalysisProgressProps): Element
│       │   │   📋 AnalysisProgressProps
│       │   ├── 📄 AnalysisSummary.tsx
│       │   │   ➡️ AnalysisSummary({ analysis, onNewAnalysis }: AnalysisSummaryProps): Element
│       │   │   📋 AnalysisSummaryProps
│       │   ├── 📄 CompetitorAnalysis.tsx
│       │   │   ➡️ CompetitorAnalysis({ mainAnalysis }: CompetitorAnalysisProps): Element
│       │   │   📋 CompetitorAnalysisProps
│       │   │   📋 MetricComparison
│       │   │   📋 CompetitorInsight
│       │   │   📋 ContentGapAnalysis
│       │   │   📋 StrategyAnalysis
│       │   │   📋 StrategyComparison
│       │   │   📋 CompetitiveSummary
│       │   │   📋 ProcessingStats
│       │   │   📋 ComparisonResult
│       │   ├── 📄 EnhancedInsights.tsx
│       │   │   ➡️ EnhancedInsights({ insights }: EnhancedInsightsProps): Element
│       │   │   📋 EnhancedInsightsProps
│       │   ├── 📄 Header.tsx
│       │   │   ➡️ Header({ title, description }: HeaderProps): Element
│       │   │   📋 HeaderProps
│       │   ├── 📄 Navbar.tsx
│       │   │   ➡️ Navbar({ onGetStarted, showGetStarted = true }: NavbarProps): Element
│       │   │   📋 NavbarProps
│       │   ├── 📄 PageAnalysisCard.tsx
│       │   │   ➡️ PageAnalysisCard({ page, analysisId, onReanalyze }: PageAnalysisCardProps): Element
│       │   │   📋 PageAnalysisCardProps
│       │   ├── 📄 Sidebar.tsx
│       │   │   ➡️ Sidebar(): Element
│       │   ├── 📄 URLInputForm.tsx
│       │   │   ➡️ URLInputForm({ 
  onAnalyzeStart, 
  onAnalysisUpdate, 
  onAnalysisComplete,
  analysisState
}: URLInputFormProps): Element
│       │   │   📋 URLInputFormProps
│       │   ├── 📁 analysis-tabs/
│       │   │   ├── 📄 CompetitorTab.tsx
│       │   │   │   ➡️ CompetitorTab({ analysis }: CompetitorTabProps): Element
│       │   │   │   📋 CompetitorTabProps
│       │   │   ├── 📄 ContentQualityTab.tsx
│       │   │   │   ➡️ ContentQualityTab({ analysis }: ContentQualityTabProps): Element
│       │   │   │   📋 ContentQualityTabProps
│       │   │   ├── 📄 DuplicationTab.tsx
│       │   │   │   ➡️ DuplicationTab({ analysis, onAnalysisUpdate }: DuplicationTabProps): Element
│       │   │   │   📋 DuplicationTabProps
│       │   │   ├── 📄 KeywordRepetitionTab.tsx
│       │   │   │   ➡️ KeywordRepetitionTab({ analysis, onAnalysisUpdate }: KeywordRepetitionTabProps): Element
│       │   │   │   📋 KeywordRepetitionTabProps
│       │   │   ├── 📄 OverviewTab.tsx
│       │   │   │   ➡️ OverviewTab({ analysis, onNewAnalysis, onExportCSV, onExportPDF, onPageReanalyze }: OverviewTabProps): Element
│       │   │   │   📋 OverviewTabProps
│       │   │   └── 📄 PagesTab.tsx
│       │   │       ➡️ PagesTab({ analysis, onPageReanalyze }: PagesTabProps): Element
│       │   │       📋 PagesTabProps
│       │   └── 📁 content-editor/
│       │       ├── 📄 ChatInterface.tsx
│       │       │   ➡️ ChatInterface({ analysisId, pageUrl, pageData, analysis, onFreshContentLoaded }: ChatInterfaceProps): Element
│       │       │   📋 ChatInterfaceProps
│       │       ├── 📄 ChatMessage.tsx
│       │       │   ➡️ ChatMessageComponent({ message, onCopy }: ChatMessageProps): Element
│       │       │   📋 ChatMessageProps
│       │       └── 📄 ContextSidebar.tsx
│       │           ➡️ ContextSidebar({ analysis, pageData, pageUrl }: ContextSidebarProps): Element
│       │           📋 ContextSidebarProps
│       ├── 📁 hooks/
│       │   ├── 📄 use-mobile.tsx
│       │   │   ⚡ export useIsMobile(): boolean
│       │   ├── 📄 use-toast.ts
│       │   │   ⚡ genId(): string
│       │   │   ➡️ addToRemoveQueue(toastId: string): void
│       │   │   ➡️ export reducer(state: State, action: Action): State
│       │   │   ⚡ dispatch(action: Action): void
│       │   │   ⚡ toast({ ...props }: Toast): { id: string; dismiss: () => void; update: (props: any) => void; }
│       │   │   ⚡ useToast(): { toast: ({ ...props }: Toast) => { id: string; dismiss: () => void; update: (props: any) => void; }; dismiss: (toastId?: string | undefined) => void; toasts: any[]; }
│       │   │   📋 State
│       │   └── 📄 useAuth.ts
│       │       ⚡ export useAuth(): { user: unknown; isLoading: boolean; isAuthenticated: boolean; error: Error | null; login: () => void; logout: () => void; requireAuth: () => boolean; refetch: (options?: RefetchOptions | undefined) => Promise<...>; }
│       ├── 📁 lib/
│       │   ├── 📄 api.ts
│       │   │   ⚡ export async analyzeWebsite(data: AnalyzeRequestBody): Promise<Response>
│       │   │   ⚡ export async getAnalysisHistory(): Promise<WebsiteAnalysis[]>
│       │   │   ⚡ export async getAnalysisById(id: number): Promise<WebsiteAnalysis>
│       │   │   ⚡ export async deleteAnalysis(id: number): Promise<void>
│       │   │   ⚡ export async getSettings(): Promise<SettingsData>
│       │   │   ⚡ export async updateSettings(settings: SettingsData): Promise<void>
│       │   │   ⚡ export async exportAnalysisCSV(id: number): Promise<Blob>
│       │   │   ⚡ export async exportAnalysisJSON(id: number): Promise<Blob>
│       │   │   ⚡ export async compareWithCompetitor(data: CompetitorAnalysisRequest): Promise<any>
│       │   │   ⚡ export async saveCompetitorAnalysis(analysisId: number, competitorData: any): Promise<any>
│       │   │   ➡️ export async runContentDuplicationAnalysis(analysisId: number): Promise<any>
│       │   │   ➡️ export async reanalyzePage(analysisId: number, pageUrl: string): Promise<any>
│       │   │   📋 CompetitorAnalysisRequest
│       │   ├── 📄 queryClient.ts
│       │   │   ⚡ async throwIfResNotOk(res: Response): Promise<void>
│       │   │   ⚡ export async apiRequest(method: string, url: string, data?: unknown | undefined): Promise<Response>
│       │   │   ➡️ export getQueryFn({ on401: unauthorizedBehavior }: any): ({ queryKey }: { queryKey: QueryKey; signal: AbortSignal; meta: Record<string, unknown> | undefined; pageParam?: unknown; direction?: unknown; }) => Promise<any>
│       │   ├── 📄 types.ts
│       │   │   📋 Heading
│       │   │   📋 Image
│       │   │   📋 InternalLink
│       │   │   📋 SeoIssue
│       │   │   📋 ContentMetrics
│       │   │   📋 OpenGraphData
│       │   │   📋 TwitterCardData
│       │   │   📋 PageAnalysis
│       │   │   📋 WebsiteAnalysisMetrics
│       │   │   📋 DuplicateItem
│       │   │   📋 ContentRepetitionAnalysis
│       │   │   📋 KeywordDensityItem
│       │   │   📋 KeywordRepetitionAnalysis
│       │   │   📋 ComparisonMetric
│       │   │   📋 CompetitorAnalysisResult
│       │   │   📋 EnhancedInsights
│       │   │   📋 WebsiteAnalysis
│       │   │   📋 AnalyzeRequestBody
│       │   │   📋 ProgressUpdate
│       │   │   📋 SettingsData
│       │   └── 📄 utils.ts
│       │       ⚡ export cn(inputs: ClassValue[]): string
│       ├── 📄 main.tsx
│       └── 📁 pages/
│           ├── 📄 Account.tsx
│           │   ➡️ Account(): Element
│           │   📋 UserUsage
│           │   📋 CreditPackage
│           │   📋 UserCredits
│           ├── 📄 AnalysisDetails.tsx
│           │   ➡️ AnalysisDetails(): Element
│           ├── 📄 ContentEditor.tsx
│           │   ➡️ ContentEditor(): Element
│           ├── 📄 Dashboard.tsx
│           │   ➡️ Dashboard(): Element
│           │   📋 UserUsage
│           ├── 📄 HowItWorks.tsx
│           │   ➡️ HowItWorks(): Element
│           ├── 📄 Landing.tsx
│           │   ➡️ Landing(): Element
│           ├── 📄 Settings.tsx
│           │   ➡️ Settings(): Element
│           ├── 📄 SiteHistory.tsx
│           │   ➡️ SiteHistory(): Element
│           └── 📄 not-found.tsx
│               ⚡ export NotFound(): Element
├── 📄 drizzle.config.ts
├── 📄 postcss.config.js
├── 📁 server/
│   ├── 📁 analysis-pipeline/
│   │   ├── 📄 ai-suggestions.ts
│   │   │   ⚡ analyzeContentIntent(pageData: any, siteOverview?: any): {
  intentType: string;
  journeyStage: string;
  businessRelevance: string;
  conversionOpportunities: string[];
}
│   │   │   ⚡ export async generateSeoSuggestions(url: string, pageData: any, siteStructure?: {
  allPages: Array<{
    url: string;
    title?: string;
    headings: Array<{ level: number; text: string }>;
  }>;
}, siteOverview?: {
  businessType: string;
  industry: string;
  targetAudience: string;
  mainServices: string[];
  location?: string;
}, additionalInfo?: string): Promise<string[]>
│   │   ├── 📄 analysis-orchestrator.ts
│   │   │   ⚡ export async orchestrateAnalysis(domain: string, settings: any, userId?: string, additionalInfo?: string, isCompetitorAnalysis: boolean, events?: EventEmitter): Promise<AnalysisResult>
│   │   │   ⚡ async initializeAnalysisContext(domain: string, userId: string | undefined, controller: AbortController, events: EventEmitter, settings: any): Promise<AnalysisContext>
│   │   │   ⚡ async discoverPages(context: AnalysisContext, options: AnalysisOptions): Promise<string[]>
│   │   │   ⚡ async analyzePages(context: AnalysisContext, pages: string[], options: AnalysisOptions): Promise<any[]>
│   │   │   ⚡ async generateInsights(context: AnalysisContext, analyzedPages: any[], options: AnalysisOptions): Promise<any>
│   │   │   ⚡ async aggregateResults(context: AnalysisContext, analyzedPages: any[], insights: any, options: AnalysisOptions): Promise<AnalysisResult>
│   │   │   ⚡ async reportCompletion(context: AnalysisContext, result: AnalysisResult): Promise<void>
│   │   │   ⚡ async handlePipelineError(controller: AbortController, domain: string, events: EventEmitter, error: any): Promise<void>
│   │   │   📋 AnalysisOptions
│   │   │   📋 AnalysisContext
│   │   │   📋 AnalysisResult
│   │   │   📋 ProcessingStats
│   │   ├── 📄 competitor-insights.ts
│   │   │   ⚡ export async generateCompetitorInsights(mainAnalysis: any, competitorAnalyses: any[], userInput?: string): Promise<{
  insights: string[];
  strategicRecommendations: string[];
  competitiveAdvantages: string[];
  threats: string[];
}>
│   │   │   ⚡ calculateAverageWords(pages: any[]): number
│   │   ├── 📄 content-quality-analyzer.ts
│   │   │   ⚡ export async analyzeUnifiedContentQuality(pages: Array<any>, useAI: boolean): Promise<ContentQualityAnalysis>
│   │   │   ⚡ async analyzeContentUniqueness(pages: Array<any>, openai: OpenAI): Promise<{ duplicateContent: { titles: any; descriptions: any; headings: any; paragraphs: any; }; uniquenessScore: number; totalDuplicates: any; pagesAnalyzed: number; }>
│   │   │   ⚡ async analyzeKeywordQuality(pages: Array<any>, openai: OpenAI): Promise<{ overOptimization: any; underOptimization: any; healthScore: number; readabilityImpact: any; affectedPages: any; }>
│   │   │   ⚡ async analyzeContentQualityScores(pages: Array<any>, openai: OpenAI): Promise<{ averageScores: { uniqueness: number; userValue: number; seoEffectiveness: number; readability: number; overall: number; }; topPerformers: ContentQualityScore[]; needsImprovement: ContentQualityScore[]; }>
│   │   │   ⚡ generateStrategicRecommendations(uniqueness: any, keywords: any, quality: any): ContentQualityAnalysis['strategicRecommendations']
│   │   │   ⚡ calculateOverallHealth(uniqueness: any, keywords: any, quality: any): { contentScore: any; keywordScore: any; qualityScore: any; combinedScore: number; }
│   │   │   ⚡ generateBasicContentQualityAnalysis(pages: Array<any>): ContentQualityAnalysis
│   │   │   ⚡ generateBasicUniquenessAnalysis(pages: Array<any>): { duplicateContent: { titles: { content: string; urls: any[]; similarityScore: number; impactLevel: "High"; improvementStrategy: string; duplicationType: "exact"; }[]; descriptions: never[]; headings: never[]; paragraphs: never[]; }; uniquenessScore: number; totalDuplicates: number; pagesAnalyzed: number; }
│   │   │   ⚡ generateBasicKeywordAnalysis(pages: Array<any>): { overOptimization: never[]; underOptimization: { suggestion: string; currentUsage: string; opportunity: string; expectedBenefit: string; implementation: string; }[]; healthScore: number; readabilityImpact: "Medium"; affectedPages: number; }
│   │   │   ⚡ findBasicDuplicates(items: string[]): string[]
│   │   │   📋 ContentQualityAnalysis
│   │   │   📋 ContentDuplicateGroup
│   │   │   📋 KeywordIssue
│   │   │   📋 KeywordOpportunity
│   │   ├── 📄 content-quality.ts
│   │   │   ⚡ export async analyzeContentQuality(pages: PageAnalysisResult[]): Promise<ContentQualityAnalysis>
│   │   │   ⚡ analyzeReadability(pages: PageAnalysisResult[]): ReadabilityAnalysis
│   │   │   ⚡ analyzeKeywordOptimization(pages: PageAnalysisResult[]): KeywordOptimizationAnalysis
│   │   │   ⚡ analyzeContentDepth(pages: PageAnalysisResult[]): ContentDepthAnalysis
│   │   │   ⚡ analyzeEngagementFactors(pages: PageAnalysisResult[]): EngagementFactorsAnalysis
│   │   │   ⚡ calculateKeywordDistribution(pages: PageAnalysisResult[]): number
│   │   │   ⚡ generateContentQualityRecommendations(pages: PageAnalysisResult[], readability: ReadabilityAnalysis, keywords: KeywordOptimizationAnalysis, depth: ContentDepthAnalysis, engagement: EngagementFactorsAnalysis): ContentQualityRecommendation[]
│   │   │   ⚡ calculateContentQualityScore(readability: ReadabilityAnalysis, keywords: KeywordOptimizationAnalysis, depth: ContentDepthAnalysis, engagement: EngagementFactorsAnalysis): number
│   │   │   📋 ContentQualityAnalysis
│   │   │   📋 ReadabilityAnalysis
│   │   │   📋 KeywordOptimizationAnalysis
│   │   │   📋 ContentDepthAnalysis
│   │   │   📋 EngagementFactorsAnalysis
│   │   │   📋 ContentQualityRecommendation
│   │   ├── 📄 image-alt-text.ts
│   │   │   ⚡ export async generateImageAltText(imageUrl: string, pageContext: {
  url: string;
  title?: string;
  headings?: Array<{ level: number; text: string }>;
  businessType?: string;
  industry?: string;
}): Promise<string>
│   │   │   ⚡ export async generateBatchImageAltText(images: Array<{
  src: string;
  context: {
    url: string;
    title?: string;
    headings?: Array<{ level: number; text: string }>;
    businessType?: string;
    industry?: string;
  };
}>): Promise<Array<{ src: string; altText: string; }>>
│   │   ├── 📄 insights-explanations.ts
│   │   │   ⚡ export async generateInsightsExplanations(domain: string, technicalAnalysis: any, contentQualityAnalysis: any, linkArchitectureAnalysis: any, performanceAnalysis: any, pages: any[]): Promise<{
  technicalExplanation: string;
  contentQualityExplanation: string;
  linkArchitectureExplanation: string;
  performanceExplanation: string;
}>
│   │   ├── 📄 insights-generator.ts
│   │   │   ⚡ export async generateComprehensiveInsights(context: AnalysisContext, analyzedPages: PageAnalysisResult[], options: AnalysisOptions): Promise<InsightsResult>
│   │   │   ⚡ async generateBusinessContext(analyzedPages: PageAnalysisResult[], additionalInfo?: string): Promise<{ siteOverview: any; aiCallsMade: number }>
│   │   │   ⚡ async generatePageSuggestions(context: AnalysisContext, analyzedPages: PageAnalysisResult[], siteOverview: any, additionalInfo?: string): Promise<{
  enhancedPages: PageAnalysisResult[];
  totalSuggestions: number;
  aiCallsMade: number;
  creditsUsed: number;
}>
│   │   │   ⚡ async generatePageSpecificSuggestions(context: AnalysisContext, page: PageAnalysisResult, siteStructure: any, siteOverview: any, additionalInfo?: string, pagesWithAI?: PageAnalysisResult[]): Promise<{ suggestionsCount: number; aiCallsMade: number; creditsUsed: number } | null>
│   │   │   📋 InsightsResult
│   │   ├── 📄 link-architecture.ts
│   │   │   ⚡ export async analyzeLinkArchitecture(pages: PageAnalysisResult[]): Promise<LinkArchitectureAnalysis>
│   │   │   ⚡ buildLinkGraph(pages: PageAnalysisResult[]): Map<string, { incoming: string[]; outgoing: string[] }>
│   │   │   ⚡ analyzeLinkDistribution(pages: PageAnalysisResult[], linkGraph: Map<string, { incoming: string[]; outgoing: string[] }>): LinkDistributionAnalysis
│   │   │   ⚡ analyzeAnchorText(pages: PageAnalysisResult[]): AnchorTextAnalysis
│   │   │   ⚡ analyzeNavigationStructure(pages: PageAnalysisResult[], linkGraph: Map<string, { incoming: string[]; outgoing: string[] }>): NavigationStructureAnalysis
│   │   │   ⚡ calculatePageDepths(homepageUrl: string, linkGraph: Map<string, { incoming: string[]; outgoing: string[] }>): Record<string, number>
│   │   │   ⚡ analyzeLinkEquity(pages: PageAnalysisResult[], linkGraph: Map<string, { incoming: string[]; outgoing: string[] }>): LinkEquityAnalysis
│   │   │   ⚡ calculateLinkArchitectureScore(distribution: LinkDistributionAnalysis, anchorText: AnchorTextAnalysis, navigation: NavigationStructureAnalysis, equity: LinkEquityAnalysis): number
│   │   │   ⚡ generateLinkArchitectureRecommendations(pages: PageAnalysisResult[], distribution: LinkDistributionAnalysis, anchorText: AnchorTextAnalysis, navigation: NavigationStructureAnalysis, equity: LinkEquityAnalysis): LinkArchitectureRecommendation[]
│   │   │   📋 LinkArchitectureAnalysis
│   │   │   📋 LinkDistributionAnalysis
│   │   │   📋 AnchorTextAnalysis
│   │   │   📋 NavigationStructureAnalysis
│   │   │   📋 LinkEquityAnalysis
│   │   │   📋 LinkArchitectureRecommendation
│   │   ├── 📄 page-analyzer.ts
│   │   │   ⚡ export async analyzePagesBatch(context: AnalysisContext, pages: string[], options: AnalysisOptions): Promise<PageAnalysisResult[]>
│   │   │   ⚡ async analyzeSinglePage(context: AnalysisContext, pageUrl: string, analyzedPages: PageAnalysisResult[], options: AnalysisOptions): Promise<PageAnalysisResult | null>
│   │   │   ⚡ async performEnhancedPageAnalysis(url: string, settings: any, signal: AbortSignal, isCompetitor: boolean, additionalInfo?: string, options?: { useAI?: boolean; skipAltTextGeneration?: boolean }): Promise<PageAnalysisResult | null>
│   │   │   ⚡ extractBasicSeoElements($: cheerio.CheerioAPI, url: string): { title: string; metaDescription: string | null; metaKeywords: string | null; metaKeywordsArray: string[] | null; canonical: string | null; robotsMeta: string | null; }
│   │   │   ⚡ extractContentElements($: cheerio.CheerioAPI, url: string, settings: any): { headings: Heading[]; images: AnalysisImage[]; paragraphs: string[]; sentences: string[]; allTextContent: string; }
│   │   │   ⚡ extractLinkElements($: cheerio.CheerioAPI, url: string, settings: any): { internalLinks: { href: string; text: string; title?: string | undefined; }[]; externalLinks: { href: string; text: string; title?: string | undefined; }[]; }
│   │   │   ⚡ extractCtaElements($: cheerio.CheerioAPI, url: string): { type: string; text: string; element: string; attributes: Record<string, string>; }[]
│   │   │   ⚡ analyzeContentQuality(contentElements: any): { wordCount: any; readabilityScore: number; keywordDensity: { keyword: string; count: number; density: number; }[]; contentDepth: number; semanticKeywords: string[]; }
│   │   │   ⚡ async detectSeoIssues(basicElements: any, contentElements: any, contentQuality: any): Promise<SeoIssue[]>
│   │   │   ⚡ calculateReadabilityScore(sentences: string[]): number
│   │   │   ⚡ countSyllables(word: string): number
│   │   │   ⚡ extractKeywordDensity(content: string): Array<{keyword: string, count: number, density: number}>
│   │   │   ⚡ calculateContentDepth(paragraphs: string[], headings: Heading[]): number
│   │   │   ⚡ extractSemanticKeywords(content: string): string[]
│   │   │   📋 AnalysisImage
│   │   │   📋 PageAnalysisResult
│   │   ├── 📄 page-discovery.ts
│   │   │   ⚡ export async discoverSitePages(context: AnalysisContext, options: AnalysisOptions): Promise<string[]>
│   │   │   ⚡ async discoverPages(domain: string, useSitemap: boolean, maxPages: number, signal: AbortSignal, events: EventEmitter): Promise<PageDiscoveryResult>
│   │   │   ⚡ async tryCommonSitemapPatterns(domain: string, signal: AbortSignal, maxPages: number): Promise<string[]>
│   │   │   ⚡ async performCrawling(domain: string, maxPages: number, signal: AbortSignal, events: EventEmitter): Promise<{ pages: string[]; crawlData: Map<string, any> }>
│   │   │   ⚡ preparePagesList(discoveredPages: string[], domain: string, maxPages: number): string[]
│   │   │   ⚡ normalizeUrlForAnalysis(url: string): string
│   │   │   ⚡ ensureHomepageFirst(pages: string[], domain: string): string[]
│   │   │   📋 PageDiscoveryResult
│   │   ├── 📄 performance-analyzer.ts
│   │   │   ⚡ export async analyzePerformance(pages: PageAnalysisResult[]): Promise<PerformanceAnalysis>
│   │   │   ⚡ analyzeResourceOptimization(pages: PageAnalysisResult[]): ResourceOptimizationAnalysis
│   │   │   ⚡ analyzeLoadingPatterns(pages: PageAnalysisResult[]): LoadingPatternsAnalysis
│   │   │   ⚡ analyzeUserExperience(pages: PageAnalysisResult[]): UserExperienceMetrics
│   │   │   ⚡ calculatePerformanceScore(resources: ResourceOptimizationAnalysis, loading: LoadingPatternsAnalysis, ux: UserExperienceMetrics): number
│   │   │   ⚡ generatePerformanceRecommendations(pages: PageAnalysisResult[], resources: ResourceOptimizationAnalysis, loading: LoadingPatternsAnalysis, ux: UserExperienceMetrics): PerformanceRecommendation[]
│   │   │   📋 PerformanceAnalysis
│   │   │   📋 ResourceOptimizationAnalysis
│   │   │   📋 LoadingPatternsAnalysis
│   │   │   📋 UserExperienceMetrics
│   │   │   📋 PerformanceRecommendation
│   │   ├── 📄 progress-tracker.ts
│   │   │   ⚡ export registerAnalysis(domain: string, controller: AbortController): void
│   │   │   ⚡ export cleanupAnalysis(domain: string): void
│   │   │   ⚡ export cancelAnalysis(domain: string): boolean
│   │   │   ⚡ export emitPageProgress(context: AnalysisContext, totalPages: number, analyzedPages: any[], currentPageUrl: string): void
│   │   │   ⚡ export emitAIProgress(context: AnalysisContext, totalPages: number, analyzedPages: any[], currentOperation: string, progressWithinAI: number): void
│   │   │   ⚡ export emitFinalProgress(context: AnalysisContext, totalPages: number, analyzedPages: any[], operation: string): void
│   │   │   ⚡ export async reportAnalysisCompletion(context: AnalysisContext, result: AnalysisResult): Promise<void>
│   │   │   ⚡ export async handleAnalysisError(domain: string, events: EventEmitter, error: any): Promise<void>
│   │   │   📋 ProgressUpdate
│   │   ├── 📄 quota-manager.ts
│   │   │   ⚡ export async initializeQuotas(userId: string | undefined, options: any): Promise<QuotaInfo>
│   │   │   ⚡ export async checkQuotaLimits(userId: string | undefined, currentPagesAnalyzed: number, remainingQuota: number, settings: any): Promise<boolean>
│   │   │   ⚡ export async deductAICredits(userId: string | undefined, isTrialUser: boolean, costPerPage: number): Promise<CreditResult>
│   │   │   ⚡ export async deductChatCredits(userId: string | undefined, isTrialUser: boolean): Promise<CreditResult>
│   │   │   ⚡ export async incrementUserUsage(userId: string | undefined, pagesAnalyzed: number): Promise<void>
│   │   │   📋 QuotaInfo
│   │   │   📋 CreditResult
│   │   ├── 📄 results-aggregator.ts
│   │   │   ⚡ export async aggregateAnalysisResults(context: AnalysisContext, analyzedPages: PageAnalysisResult[], insights: any, options: AnalysisOptions): Promise<AnalysisResult>
│   │   │   ⚡ calculateAggregateMetrics(analyzedPages: PageAnalysisResult[]): { goodPractices: number; warnings: number; criticalIssues: number; titleOptimization: number; descriptionOptimization: number; headingsOptimization: number; imagesOptimization: number; linksOptimization: number; }
│   │   ├── 📄 site-overview.ts
│   │   │   ⚡ export async analyzeSiteOverview(siteStructure: {
  allPages: Array<{
    url: string;
    title?: string;
    headings: Array<{ level: number; text: string }>;
    metaDescription?: string;
    paragraphs?: string[];
  }>;
}, additionalInfo?: string): Promise<{
  businessType: string;
  industry: string;
  targetAudience: string;
  mainServices: string[];
  location?: string;
  siteStructureAnalysis: string;
  contentStrategy: string[];
  overallRecommendations: string[];
}>
│   │   └── 📄 technical-seo.ts
│   │       ⚡ export async analyzeTechnicalSeo(pages: PageAnalysisResult[], domain: string): Promise<TechnicalSeoAnalysis>
│   │       ⚡ analyzeCoreWebVitals(pages: PageAnalysisResult[]): CoreWebVitalsAnalysis
│   │       ⚡ analyzeMobileOptimization(pages: PageAnalysisResult[]): MobileOptimizationAnalysis
│   │       ⚡ analyzeSecurityAspects(pages: PageAnalysisResult[], domain: string): SecurityAnalysis
│   │       ⚡ async checkSitemapExists(domain: string): Promise<boolean>
│   │       ⚡ async analyzeTechnicalElements(pages: PageAnalysisResult[], domain: string): Promise<TechnicalElementsAnalysis>
│   │       ⚡ calculateTechnicalScore(coreWebVitals: CoreWebVitalsAnalysis, mobile: MobileOptimizationAnalysis, security: SecurityAnalysis, technical: TechnicalElementsAnalysis): number
│   │       ⚡ generateTechnicalRecommendations(coreWebVitals: CoreWebVitalsAnalysis, mobile: MobileOptimizationAnalysis, security: SecurityAnalysis, technical: TechnicalElementsAnalysis): TechnicalRecommendation[]
│   │       📋 TechnicalSeoAnalysis
│   │       📋 CoreWebVitalsAnalysis
│   │       📋 MobileOptimizationAnalysis
│   │       📋 SecurityAnalysis
│   │       📋 TechnicalElementsAnalysis
│   │       📋 TechnicalRecommendation
│   ├── 📁 competitive-analysis/
│   │   ├── 📄 competitive-analyzer.ts
│   │   │   ⚡ export async analyzeCompetitor(mainAnalysis: any, competitorAnalysis: any, openai?: OpenAI, options: Partial<CompetitorAnalysisOptions>): Promise<CompetitiveAnalysisResult>
│   │   │   ⚡ async calculateAdvancedMetrics(mainAnalysis: any, competitorAnalysis: any): Promise<CompetitorMetricsComparison>
│   │   │   ⚡ async analyzeContentGaps(mainAnalysis: any, competitorAnalysis: any): Promise<ContentGapAnalysis>
│   │   │   ⚡ async compareStrategies(mainAnalysis: any, competitorAnalysis: any): Promise<StrategyComparison>
│   │   │   ⚡ async generateAIInsights(metrics: CompetitorMetricsComparison, gaps: ContentGapAnalysis, strategies: StrategyComparison, openai: OpenAI, maxTokens: number): Promise<CompetitorInsight[]>
│   │   │   ⚡ generateBasicInsights(metrics: CompetitorMetricsComparison, gaps: ContentGapAnalysis, strategies: StrategyComparison): CompetitorInsight[]
│   │   │   ⚡ createCompetitiveSummary(metrics: CompetitorMetricsComparison, gaps: ContentGapAnalysis, insights: CompetitorInsight[]): CompetitiveSummary
│   │   │   ⚡ calculateTechnicalScore(analysis: any): number
│   │   │   ⚡ calculateContentQuality(analysis: any): number
│   │   │   ⚡ getActionItemFor(metricKey: string): string
│   │   │   ⚡ formatAreaName(key: string): string
│   │   │   ⚡ estimateTokenUsage(result: CompetitiveAnalysisResult): number
│   │   │   ⚡ calculateConfidenceScore(mainPageCount: number, competitorPageCount: number, insightCount: number): number
│   │   │   📋 CompetitorAnalysisOptions
│   │   │   📋 CompetitorInsight
│   │   │   📋 CompetitiveAnalysisResult
│   │   │   📋 CompetitorMetricsComparison
│   │   │   📋 MetricComparison
│   │   │   📋 ContentGapAnalysis
│   │   │   📋 StrategyComparison
│   │   │   📋 StrategyAnalysis
│   │   │   📋 CompetitiveSummary
│   │   │   📋 ProcessingStats
│   │   ├── 📄 gap-analyzer.ts
│   │   │   ⚡ export analyzeGaps(mainAnalysis: any, competitorAnalysis: any): ContentGapAnalysis
│   │   │   ⚡ analyzeTopicalCoverage(mainPages: any[], competitorPages: any[]): TopicalCoverageAnalysis
│   │   │   ⚡ extractTopicClusters(pages: any[]): TopicCluster[]
│   │   │   ⚡ extractTopicsFromPage(page: any): string[]
│   │   │   ⚡ extractKeyPhrases(text: string): string[]
│   │   │   ⚡ extractTopicsFromUrl(url: string): string[]
│   │   │   ⚡ calculateTopicStrength(pages: any[], totalWords: number): number
│   │   │   ⚡ analyzeKeywordGaps(mainPages: any[], competitorPages: any[]): KeywordGapAnalysis
│   │   │   ⚡ extractAllKeywords(pages: any[]): Array<{
  keyword: string;
  pageCount: number;
  totalDensity: number;
  avgDensity: number;
}>
│   │   │   ⚡ estimateKeywordDifficulty(keyword: string, avgDensity: number): 'low' | 'medium' | 'high'
│   │   │   ⚡ calculateKeywordOpportunity(pageCount: number, avgDensity: number): number
│   │   │   ⚡ calculateOverallOpportunityScore(opportunities: KeywordOpportunity[]): number
│   │   │   ⚡ analyzeContentVolumeGaps(mainPages: any[], competitorPages: any[]): ContentVolumeGap[]
│   │   │   ⚡ countPagesByArea(pages: any[], area: string): number
│   │   │   ⚡ identifyMissingTopics(topicalCoverage: TopicalCoverageAnalysis): string[]
│   │   │   ⚡ identifyUnderOptimizedAreas(mainPages: any[], competitorPages: any[]): string[]
│   │   │   ⚡ calculateAverageWordCount(pages: any[]): number
│   │   │   ⚡ calculateImageOptimizationRate(pages: any[]): number
│   │   │   ⚡ calculateAverageInternalLinks(pages: any[]): number
│   │   │   ⚡ calculateHeadingUsageRate(pages: any[]): number
│   │   │   📋 ContentGapAnalysis
│   │   │   📋 ContentVolumeGap
│   │   │   📋 TopicalCoverageAnalysis
│   │   │   📋 TopicCluster
│   │   │   📋 KeywordGapAnalysis
│   │   │   📋 KeywordOpportunity
│   │   ├── 📄 insight-generator.ts
│   │   │   ⚡ export async generateContextualInsights(metrics: any, gaps: any, strategies: any, openai: OpenAI, maxTokens: number): Promise<CompetitorInsight[]>
│   │   │   ⚡ buildCompetitiveIntelligence(metrics: any, gaps: any, strategies: any): CompetitiveIntelligenceSummary
│   │   │   ⚡ createInsightGenerationPrompt(intelligence: CompetitiveIntelligenceSummary): string
│   │   │   ⚡ parseAIInsights(aiInsights: any[]): CompetitorInsight[]
│   │   │   ⚡ generateFallbackInsights(metrics: any, gaps: any, strategies: any): CompetitorInsight[]
│   │   │   ⚡ analyzePerformanceGaps(metrics: any): PerformanceGap[]
│   │   │   ⚡ analyzeContentOpportunities(gaps: any): ContentOpportunity[]
│   │   │   ⚡ analyzeStrategicInsights(strategies: any): StrategicInsight[]
│   │   │   ⚡ identifyCompetitiveThreats(metrics: any, strategies: any): CompetitiveThreat[]
│   │   │   ⚡ identifyQuickWins(metrics: any, gaps: any): QuickWin[]
│   │   │   ⚡ identifyLongTermStrategies(gaps: any, strategies: any): LongTermStrategy[]
│   │   │   ⚡ estimateDifficulty(metric: string, gap: number): 'easy' | 'medium' | 'hard'
│   │   │   ⚡ mapMetricToCategory(metric: string): string
│   │   │   ⚡ formatMetricName(metric: string): string
│   │   │   ⚡ getActionItemsForMetric(metric: string): string[]
│   │   │   ⚡ estimateTrafficPotential(volume: number, type: 'topics' | 'pages'): number
│   │   │   📋 CompetitorInsight
│   │   │   📋 CompetitiveIntelligenceSummary
│   │   │   📋 PerformanceGap
│   │   │   📋 ContentOpportunity
│   │   │   📋 StrategicInsight
│   │   │   📋 CompetitiveThreat
│   │   │   📋 QuickWin
│   │   │   📋 LongTermStrategy
│   │   ├── 📄 metrics-calculator.ts
│   │   │   ⚡ export calculateMetricComparison(mainValue: number, competitorValue: number, metricType: 'optimization' | 'issues' | 'count'): MetricComparison
│   │   │   ⚡ getSignificanceLevel(percentageDiff: number, absoluteDiff: number): 'critical' | 'important' | 'minor'
│   │   │   ⚡ export calculateAdvancedSEOMetrics(analysis: any): AdvancedMetrics
│   │   │   ⚡ calculateTitleOptimization(pages: any[]): number
│   │   │   ⚡ calculateDescriptionOptimization(pages: any[]): number
│   │   │   ⚡ calculateHeadingStructure(pages: any[]): number
│   │   │   ⚡ calculateContentDepth(pages: any[]): number
│   │   │   ⚡ calculateTechnicalSEO(pages: any[]): number
│   │   │   ⚡ calculateUserExperience(pages: any[]): number
│   │   │   ⚡ calculateKeywordOptimization(pages: any[]): number
│   │   │   ⚡ calculateInternalLinking(pages: any[], domain: string): number
│   │   │   📋 MetricComparison
│   │   │   📋 AdvancedMetrics
│   │   └── 📄 strategy-detector.ts
│   │       ⚡ export detectStrategies(mainAnalysis: any, competitorAnalysis: any): StrategyComparison
│   │       ⚡ analyzeContentStrategy(mainAnalysis: any, competitorAnalysis: any): StrategyAnalysis
│   │       ⚡ analyzeContentProfile(pages: any[]): ContentProfile
│   │       ⚡ categorizeContentTypes(pages: any[]): Record<string, number>
│   │       ⚡ extractUniqueTopics(pages: any[]): string[]
│   │       ⚡ describeContentApproach(profile: ContentProfile): string
│   │       ⚡ compareContentEffectiveness(mainProfile: ContentProfile, competitorProfile: ContentProfile): 'superior' | 'comparable' | 'inferior'
│   │       ⚡ generateContentStrategyRecommendations(mainProfile: ContentProfile, competitorProfile: ContentProfile, effectiveness: string): string[]
│   │       ⚡ analyzeKeywordStrategy(mainAnalysis: any, competitorAnalysis: any): StrategyAnalysis
│   │       ⚡ extractKeywordStrategy(pages: any[]): KeywordStrategyProfile
│   │       ⚡ describeKeywordApproach(strategy: KeywordStrategyProfile): string
│   │       ⚡ compareKeywordEffectiveness(mainStrategy: KeywordStrategyProfile, competitorStrategy: KeywordStrategyProfile): 'superior' | 'comparable' | 'inferior'
│   │       ⚡ generateKeywordRecommendations(mainStrategy: KeywordStrategyProfile, competitorStrategy: KeywordStrategyProfile, effectiveness: string): string[]
│   │       ⚡ analyzeTechnicalStrategy(mainAnalysis: any, competitorAnalysis: any): StrategyAnalysis
│   │       ⚡ analyzeTechnicalProfile(pages: any[]): TechnicalProfile
│   │       ⚡ isCleanUrl(url: string): boolean
│   │       ⚡ describeTechnicalApproach(profile: TechnicalProfile): string
│   │       ⚡ compareTechnicalEffectiveness(mainProfile: TechnicalProfile, competitorProfile: TechnicalProfile): 'superior' | 'comparable' | 'inferior'
│   │       ⚡ generateTechnicalRecommendations(mainProfile: TechnicalProfile, competitorProfile: TechnicalProfile, effectiveness: string): string[]
│   │       ⚡ analyzeUserExperienceStrategy(mainAnalysis: any, competitorAnalysis: any): StrategyAnalysis
│   │       ⚡ analyzeUXProfile(pages: any[]): UXProfile
│   │       ⚡ calculateEngagementIndicators(pages: any[]): number
│   │       ⚡ describeUXApproach(profile: UXProfile): string
│   │       ⚡ compareUXEffectiveness(mainProfile: UXProfile, competitorProfile: UXProfile): 'superior' | 'comparable' | 'inferior'
│   │       ⚡ generateUXRecommendations(mainProfile: UXProfile, competitorProfile: UXProfile, effectiveness: string): string[]
│   │       📋 StrategyComparison
│   │       📋 StrategyAnalysis
│   │       📋 ContentProfile
│   │       📋 KeywordStrategyProfile
│   │       📋 TechnicalProfile
│   │       📋 UXProfile
│   ├── 📁 content-analysis/
│   │   ├── 📄 content-preprocessor.ts
│   │   │   ⚡ export extractPageContent(pages: Array<any>): ExtractedContent
│   │   │   ⚡ export sanitizeContent(content: string): string
│   │   │   ⚡ export calculateContentStats(content: ContentItem[]): ContentStats
│   │   │   ⚡ export groupSimilarContent(content: ContentItem[], threshold: number): ContentGroup[]
│   │   │   ⚡ calculateSimilarity(text1: string, text2: string): number
│   │   │   📋 ExtractedContent
│   │   │   📋 ContentItem
│   │   │   📋 HeadingsByLevel
│   │   │   📋 ContentStats
│   │   │   📋 ContentGroup
│   │   └── 📄 content-quality-scorer.ts
│   │       ⚡ export async analyzeContentQuality(content: ContentItem[], contentType: 'titles' | 'descriptions' | 'headings' | 'paragraphs', openai: OpenAI, options: QualityAnalysisOptions): Promise<QualityAnalysisResult>
│   │       ⚡ async analyzeBatchQuality(batch: ContentItem[], contentType: string, openai: OpenAI, options: QualityAnalysisOptions): Promise<ContentQualityScore[]>
│   │       ⚡ createQualityAnalysisPrompt(content: ContentItem[], contentType: string): string
│   │       ⚡ createQualityBatches(content: ContentItem[], batchSize: number): ContentItem[][]
│   │       ⚡ validateQualityScore(score: any): boolean
│   │       ⚡ enrichQualityScore(score: any): ContentQualityScore
│   │       ⚡ calculateQualitySummary(scores: ContentQualityScore[]): QualityAnalysisResult['summary']
│   │       ⚡ generateRecommendationForIssue(issue: string): string
│   │       ⚡ generateQualityInsights(scores: ContentQualityScore[], summary: QualityAnalysisResult['summary'], contentType: string): string[]
│   │       ⚡ createEmptyQualityResult(): QualityAnalysisResult
│   │       📋 ContentQualityScore
│   │       📋 QualityAnalysisOptions
│   │       📋 QualityAnalysisResult
│   ├── 📄 crawler.ts
│   │   ⚡ async parseRobotsTxt(domain: string): Promise<Set<string>>
│   │   ⚡ isUrlAllowed(url: string, disallowedPaths: Set<string>): boolean
│   │   ⚡ export async crawlWebsite(startUrl: string, maxPages: number, delay: number, followExternalLinks: boolean, signal?: AbortSignal, progressCallback?: (urls: string[], seoData?: any) => void): Promise<string[]>
│   │   ⚡ normalizeUrl(url: string): string
│   │   ⚡ calculateUrlPriority(url: string, baseDomain: string): number
│   ├── 📄 db.ts
│   ├── 📁 export/
│   │   ├── 📄 csvExporter.ts
│   │   │   ➡️ csvEscape(value: any): string
│   │   │   ➡️ formatNumber(value: any): string
│   │   │   ➡️ formatPercentage(value: any): string
│   │   │   ➡️ joinArray(arr: any[], separator: string): string
│   │   │   ⚡ export async exportAnalysisCSV(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>
│   │   └── 📄 pdfExporter.ts
│   │       ➡️ safeRender(value: any): any
│   │       ➡️ formatScore(score: number): string
│   │       ⚡ export async exportAnalysisPDF(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>
│   ├── 📄 index.ts
│   ├── 📄 replitAuth.ts
│   │   ⚡ export getSession(): RequestHandler<ParamsDictionary, any, any, ParsedQs, Record<string, any>>
│   │   ⚡ updateUserSession(user: any, tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers): void
│   │   ⚡ async upsertUser(claims: any): Promise<void>
│   │   ⚡ export async setupAuth(app: Express): Promise<void>
│   │   ➡️ export async isAuthenticated(req: any, res: any, next: any): Promise<void | Response<any, Record<string, any>, number>>
│   ├── 📁 routes/
│   │   ├── 📄 analysis.ts
│   │   │   ⚡ export registerAnalysisRoutes(app: Express): void
│   │   ├── 📄 analysisFeatures.ts
│   │   │   ⚡ generateBasicCompetitorRecommendations(metrics: any): string[]
│   │   │   ⚡ export registerAnalysisFeaturesRoutes(app: Express): void
│   │   ├── 📄 analysisManagement.ts
│   │   │   ⚡ export registerAnalysisManagementRoutes(app: Express): void
│   │   ├── 📄 auth.ts
│   │   │   ⚡ export registerAuthRoutes(app: Express): void
│   │   ├── 📄 contentConversations.ts
│   │   │   ⚡ export registerContentConversationRoutes(app: Express): void
│   │   │   ⚡ async generateAIResponse(analysis: any, pageUrl: string, userMessage: string, conversationHistory: any[], providedFreshContent?: any): Promise<string>
│   │   │   ⚡ buildAnalysisContext(analysis: any, pageData: any, pageUrl: string): string
│   │   │   ⚡ shouldFetchFreshContent(message: string): boolean
│   │   │   ⚡ async fetchPageContent(url: string): Promise<any>
│   │   ├── 📄 index.ts
│   │   │   ⚡ export async registerRoutes(app: Express): Promise<Server>
│   │   ├── 📄 payments.ts
│   │   │   ⚡ export async registerPaymentRoutes(app: Express): Promise<void>
│   │   ├── 📄 schemas.ts
│   │   ├── 📄 settings.ts
│   │   │   ⚡ export registerSettingsRoutes(app: Express): void
│   │   └── 📄 user.ts
│   │       ⚡ export registerUserRoutes(app: Express): void
│   ├── 📄 seoAnalyzer.ts
│   │   ⚡ async calculateReadabilityScore(text: string, language?: string): Promise<number>
│   │   ⚡ countSyllables(word: string): number
│   │   ⚡ extractSemanticKeywords(text: string): string[]
│   │   ⚡ splitIntoSentences(text: string): string[]
│   │   ⚡ export async analyzePage(url: string, settings: any, signal: AbortSignal, isCompetitor: boolean, analyzedPages: any[], additionalInfo?: string, savedSiteOverview?: any): Promise<{ url: string; title: string; metaDescription: string | null; metaKeywords: string[] | null; canonical: string | null; robotsMeta: string | null; headings: Heading[]; images: AnalysisImage[]; ... 10 more ...; suggestions: never[]; } | undefined>
│   │   ⚡ export cancelAnalysis(domain: string): boolean
│   │   📋 AnalysisImage
│   ├── 📄 sitemap.ts
│   │   ⚡ export async parseSitemap(sitemapUrl: string, signal?: AbortSignal, maxPages?: number): Promise<string[]>
│   ├── 📄 storage.ts
│   │   📋 IStorage
│   │   │  🔧 getUser(id: string): Promise<User | undefined>
│   │   │  🔧 upsertUser(user: UpsertUser): Promise<User>
│   │   │  🔧 getUserUsage(userId: string): Promise<{ pagesAnalyzed: number; pageLimit: number; credits: number; accountStatus: string; chatMessagesInPack: number } | undefined>
│   │   │  🔧 incrementUserUsage(userId: string, pageCount: number): Promise<User | undefined>
│   │   │  🔧 deductCredits(userId: string, credits: number): Promise<User | undefined>
│   │   │  🔧 atomicDeductCredits(userId: string, credits: number): Promise<{ success: boolean; remainingCredits: number; user?: User }>
│   │   │  🔧 refundCredits(userId: string, credits: number, reason: string): Promise<User | undefined>
│   │   │  🔧 setAccountStatus(userId: string, status: string): Promise<User | undefined>
│   │   │  🔧 incrementChatMessageInPack(userId: string): Promise<{ shouldDeductCredit: boolean; user?: User }>
│   │   │  🔧 getAnalysisById(id: number): Promise<Analysis | undefined>
│   │   │  🔧 getAnalysisHistory(userId?: string): Promise<Analysis[]>
│   │   │  🔧 getRecentAnalyses(limit: number, userId?: string): Promise<{id: number, domain: string}[]>
│   │   │  🔧 getLatestAnalysisByDomain(domain: string, userId?: string): Promise<Analysis | null>
│   │   │  🔧 saveAnalysis(analysis: any, userId?: string): Promise<Analysis>
│   │   │  🔧 updateCompetitorAnalysis(id: number, competitorData: any): Promise<Analysis | undefined>
│   │   │  🔧 updatePageInAnalysis(id: number, pageUrl: string, updatedPageData: any): Promise<Analysis | undefined>
│   │   │  🔧 deleteAnalysis(id: number): Promise<boolean>
│   │   │  🔧 getSettings(userId?: string): Promise<Settings>
│   │   │  🔧 updateSettings(newSettings: Partial<Settings>, userId?: string): Promise<Settings>
│   │   │  🔧 getContentConversation(analysisId: number, pageUrl: string, userId: string): Promise<ContentConversation | undefined>
│   │   │  🔧 createContentConversation(data: InsertContentConversation): Promise<ContentConversation>
│   │   │  🔧 updateContentConversation(id: number, data: Partial<ContentConversation>): Promise<ContentConversation | undefined>
│   │   │  🔧 getAnalysis(id: number): Promise<Analysis | undefined>
│   │   📋 AggregateMetrics
│   │   📋 PageAnalysis
│   │   🏛️ DatabaseStorage
│   │   │  🔧 async getUser(id: string): Promise<User | undefined>
│   │   │  🔧 async upsertUser(userData: UpsertUser): Promise<User>
│   │   │  🔧 async getUserUsage(userId: string): Promise<{ pagesAnalyzed: number; pageLimit: number; credits: number; accountStatus: string; chatMessagesInPack: number } | undefined>
│   │   │  🔧 async incrementUserUsage(userId: string, pageCount: number): Promise<User | undefined>
│   │   │  🔧 async createUser(userId: string, email: string): Promise<User>
│   │   │  🔧 async addCredits(userId: string, credits: number): Promise<User | undefined>
│   │   │  🔧 async deductCredits(userId: string, credits: number): Promise<User | undefined>
│   │   │  🔧 async atomicDeductCredits(userId: string, credits: number): Promise<{ success: boolean; remainingCredits: number; user?: User }>
│   │   │  🔧 async refundCredits(userId: string, credits: number, reason: string): Promise<User | undefined>
│   │   │  🔧 async setAccountStatus(userId: string, status: string): Promise<User | undefined>
│   │   │  🔧 async incrementChatMessageInPack(userId: string): Promise<{ shouldDeductCredit: boolean; user?: User }>
│   │   │  🔧 async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined>
│   │   │  🔧 async getAnalysisById(id: number): Promise<Analysis | undefined>
│   │   │  🔧 async getAnalysisHistory(userId?: string): Promise<Analysis[]>
│   │   │  🔧 async getRecentAnalyses(limit: number, userId?: string): Promise<{id: number, domain: string}[]>
│   │   │  🔧 async getLatestAnalysisByDomain(domain: string, userId?: string): Promise<Analysis | null>
│   │   │  🔧 async saveAnalysis(analysis: Analysis): Promise<Analysis>
│   │   │  🔧 async updateCompetitorAnalysis(id: number, competitorData: any): Promise<Analysis | undefined>
│   │   │  🔧 async updatePageInAnalysis(id: number, pageUrl: string, updatedPageData: any): Promise<Analysis | undefined>
│   │   │  🔧 calculateMetricsForPages(pages: any[]): { goodPractices: number; warnings: number; criticalIssues: number; titleOptimization: number; descriptionOptimization: number; headingsOptimization: number; imagesOptimization: number; linksOptimization: number; }
│   │   │  🔧 async deleteAnalysis(id: number): Promise<boolean>
│   │   │  🔧 async getSettings(userId?: string): Promise<Settings>
│   │   │  🔧 async updateSettings(newSettings: Partial<Settings>, userId?: string): Promise<Settings>
│   │   │  🔧 async getContentConversation(analysisId: number, pageUrl: string, userId: string): Promise<ContentConversation | undefined>
│   │   │  🔧 async createContentConversation(data: InsertContentConversation): Promise<ContentConversation>
│   │   │  🔧 async updateContentConversation(id: number, data: Partial<ContentConversation>): Promise<ContentConversation | undefined>
│   │   │  🔧 async getAnalysis(id: number): Promise<Analysis | undefined>
│   └── 📄 vite.ts
│       ⚡ export log(message: string, source: any): void
│       ⚡ export async setupVite(app: Express, server: Server): Promise<void>
│       ⚡ export serveStatic(app: Express): void
├── 📁 shared/
│   └── 📄 schema.ts
│       📋 DuplicateItem
│       📋 ContentCategory
│       📋 TemplatePattern
│       📋 IntentAnalysis
│       📋 ContentDuplicationAnalysis
│       📋 KeywordDensityItem
│       📋 KeywordRepetitionAnalysis
│       📋 ContentQualityAnalysis
│       📋 ContentDuplicateGroup
│       📋 KeywordIssue
│       📋 KeywordOpportunity
│       📋 ChatMessage
├── 📄 tailwind.config.ts
└── 📄 vite.config.ts

```
