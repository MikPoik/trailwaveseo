
## Workflow tips:
- When core functionality is missing (APIs, endpoints, database methods), implement it **fully** instead of working around it
- Missing backend functionality MUST be treated as required work, not obstacles to avoid
- Creating necessary files/endpoints for core functionality is ALWAYS "truly important"
- Don't seek permission for implementing missing pieces that are clearly needed for the feature to work
- ALWAYS Prefer complete implementation over workarounds, even if it requires more files/changes
- Trace to source, not symptoms - Find the actual originating file/function, not just where errors surface
- For server routes, create modular structure with separation of concerns
- Use modular design for features
- UI design choices should be mobile first unless stated otherwise.
- If you need to use OpenAI models, model "gpt-4.1" is the newest model released on 14.4.2025
- Only Search the web and Replit Docs if **Explicitly** requested by user
- Search Replit integrations/blueprints only if **explicitly** asked by user

## Workflow phase suggestions
Phase 1: Discover
- Use read to understand existing code patterns and conventions (read, ls, glob, grep,rg ), only search_codebase if unable find files otherway.
- Use ls to understand project structure `ls -R client server shared | grep -vE "\.config|\.git|attached_assets|node_modules|\.upm|^\.|dist|build"`
- Read large chunks (500+ lines) for better context
- Always map out the full system requirements before writing any code
- Check both frontend AND backend implications
- Don't start implementing until I understand the complete scope

Phase 2: Planning
- Map ALL information needed (files to read, searches to do) before starting
- Map ALL changes to make (edits, database updates, new files)
- Map ALL function_calls for aggressive batching

Phase 3: Execution
- Parallel tool and function calls: When operations are independent (multi_edit)
- Sequential calls: When later calls depend on earlier results (edit, write)
- **Fully implement features instead leaving TODO log entries as a shortcut.**
- Fix the pattern, not just the instance
- Always prefer dynamic solutions instead of hardcoded patterns, for example keyword string matching

Phase 4: Verification
- Execute verification in single function_call block (restart_workflow, get_latest_lsp_diagnostics, refresh_all_logs)
When HMR confirms no errors -> SUCCESS and STOP and return to user

 Key Optimization Opportunities:
- Parallel Tool Calls: Use independent tools simultaneously within single function_calls block (read multiple files, search + grep, etc.)
- Efficient File Operations: Use multi_edit instead of multiple edit calls on same file
- For UI issues:** Read component + parent + related hooks/state
- For API issues:** Read routes + services + storage + schema
- For data issues:** Read schema + storage + related API endpoints
- For feature additions:** Read similar existing implementations

# SEO Website Analyzer - Architecture Overview

## Overview

This is a full-stack web application for analyzing website SEO performance using AI-powered suggestions. The application allows users to crawl websites, analyze their SEO metrics, and receive actionable recommendations for improvement. It features user authentication via Auth0, competitor analysis capabilities, and comprehensive SEO reporting.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: Auth0 with OpenID Connect (OIDC)
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with rate limiting
- **Route Organization**: Modular route structure with separation of concerns
- **SEO Analysis**: Custom crawler with robots.txt compliance
- **AI Integration**: OpenAI GPT-4.1 for SEO suggestions and competitor analysis

### Data Storage Solutions
- **Database**: PostgreSQL (via Neon serverless)
- **ORM**: Drizzle ORM with push-based migrations
- **Connection Pooling**: Neon serverless connection pooling
- **Schema Management**: Type-safe schema definitions in TypeScript

## Key Components

### Authentication System
- **Provider**: Auth0 using OpenID Connect (OIDC)
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **User Management**: User profiles with email, name, and avatar support
- **Route Protection**: Authentication middleware for protected endpoints
- **Social Login**: Supports Google and other social providers through Auth0

### SEO Analysis Engine
- **Web Crawler**: Custom crawler with configurable settings (max pages, crawl delay, external links)
- **Sitemap Parser**: XML sitemap parsing with recursive sitemap index support
- **Content Analysis**: Extraction of titles, meta descriptions, headings, images, and canonical URLs
- **Issue Detection**: Automated detection of SEO issues with severity levels (critical, warning, info)
- **AI Enhancement**: OpenAI integration for generating alt text and SEO suggestions

### Competitor Analysis
- **Comparison Engine**: Side-by-side analysis of main site vs competitors
- **Metrics Tracking**: Performance comparison across key SEO metrics
- **AI Recommendations**: Competitive analysis insights and improvement suggestions
- **Data Persistence**: Competitor analysis results stored with main analysis

### User Settings Management
- **Crawl Configuration**: Customizable crawling parameters (max pages, delays, link following)
- **Analysis Options**: Toggle features like image analysis, AI suggestions, and link structure analysis
- **Performance Settings**: Configurable analysis depth and speed settings

## Data Flow

1. **User Authentication**: Users authenticate via Auth0, creating/updating user records
2. **Analysis Request**: User submits domain for analysis with optional crawl settings
3. **Page Discovery**: System attempts sitemap parsing, falls back to crawling if needed
4. **Content Extraction**: Each page is analyzed for SEO elements and issues
5. **AI Processing**: OpenAI generates suggestions and alt text for images (if enabled)
6. **Results Storage**: Analysis results stored in PostgreSQL with JSONB fields
7. **Real-time Updates**: Server-Sent Events provide progress updates during analysis
8. **Export Options**: Results can be exported as CSV or JSON formats

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **OpenAI API**: GPT-4.1 model for AI-powered suggestions
- **Replit Platform**: Authentication and hosting infrastructure

### NPM Packages
- **Backend**: Express, Drizzle ORM, Cheerio (HTML parsing), Axios (HTTP requests)
- **Frontend**: React, TanStack Query, Radix UI, React Hook Form, Zod
- **Development**: Vite, TypeScript, ESBuild, Tailwind CSS

### Web Standards
- **Robots.txt Compliance**: Respects robot exclusion protocols
- **Sitemap.xml Support**: XML sitemap parsing following sitemap protocol
- **OpenID Connect**: Standard authentication protocol via Replit

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with Express backend
- **Hot Reload**: Vite HMR for frontend, tsx for backend
- **Database**: Direct connection to Neon database
- **Environment**: Development environment with Replit-specific tooling

### Production Build
- **Frontend**: Vite builds to `dist/public` directory
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Static Serving**: Express serves built frontend assets
- **Process Management**: Single Node.js process handling both API and static content

### Database Management
- **Migrations**: Drizzle Kit for schema management
- **Schema Evolution**: Multiple migration scripts for incremental updates
- **Connection Handling**: Serverless-friendly connection pooling
- **Backup Strategy**: Relies on Neon's built-in backup capabilities


## User Preferences

MANDATORY communication style: Technical and detailed, like talking to a developer
Remember the above policies at all times.

# Source Code Tree

```
├── 📁 client/
│   └── 📁 src/
│       ├── 📄 App.tsx
│       ├── 📁 components/
│       │   ├── 📄 AnalysisHistory.tsx
│       │   ├── 📄 AnalysisProgress.tsx
│       │   ├── 📄 AnalysisSummary.tsx
│       │   ├── 📄 CompetitorAnalysis.tsx
│       │   ├── 📄 EnhancedInsights.tsx
│       │   ├── 📄 Footer.tsx
│       │   ├── 📄 Header.tsx
│       │   ├── 📄 Navbar.tsx
│       │   ├── 📄 PageAnalysisCard.tsx
│       │   ├── 📄 Sidebar.tsx
│       │   ├── 📄 URLInputForm.tsx
│       │   ├── 📁 analysis-tabs/
│       │   │   ├── 📄 CompetitorTab.tsx
│       │   │   ├── 📄 ContentQualityTab.tsx
│       │   │   ├── 📄 DesignAnalysisTab.tsx
│       │   │   ├── 📄 DuplicationTab.tsx
│       │   │   ├── 📄 KeywordRepetitionTab.tsx
│       │   │   ├── 📄 OverviewTab.tsx
│       │   │   └── 📄 PagesTab.tsx
│       │   └── 📁 content-editor/
│       │       ├── 📄 ChatInterface.tsx
│       │       ├── 📄 ChatMessage.tsx
│       │       └── 📄 ContextSidebar.tsx
│       ├── 📁 hooks/
│       │   ├── 📄 use-mobile.tsx
│       │   ├── 📄 use-toast.ts
│       │   └── 📄 useAuth.ts
│       ├── 📁 lib/
│       │   ├── 📄 api.ts
│       │   ├── 📄 queryClient.ts
│       │   ├── 📄 types.ts
│       │   └── 📄 utils.ts
│       ├── 📄 main.tsx
│       └── 📁 pages/
│           ├── 📄 Account.tsx
│           ├── 📄 AnalysisDetails.tsx
│           ├── 📄 ContentEditor.tsx
│           ├── 📄 Dashboard.tsx
│           ├── 📄 HowItWorks.tsx
│           ├── 📄 Landing.tsx
│           ├── 📄 Settings.tsx
│           ├── 📄 SiteHistory.tsx
│           └── 📄 not-found.tsx
├── 📄 drizzle.config.ts
├── 📄 postcss.config.js
├── 📁 server/
│   ├── 📁 analysis-pipeline/
│   │   ├── 📄 ai-suggestions.ts
│   │   ├── 📄 analysis-orchestrator.ts
│   │   ├── 📄 competitor-insights.ts
│   │   ├── 📄 content-quality-analyzer.ts
│   │   ├── 📄 content-quality.ts
│   │   ├── 📄 design-analyzer.ts
│   │   ├── 📄 image-alt-text.ts
│   │   ├── 📄 insights-explanations.ts
│   │   ├── 📄 insights-generator.ts
│   │   ├── 📄 link-architecture.ts
│   │   ├── 📄 page-analyzer.ts
│   │   ├── 📄 page-discovery.ts
│   │   ├── 📄 performance-analyzer.ts
│   │   ├── 📄 progress-tracker.ts
│   │   ├── 📄 quota-manager.ts
│   │   ├── 📄 results-aggregator.ts
│   │   ├── 📄 screenshot-service.ts
│   │   ├── 📄 site-overview.ts
│   │   └── 📄 technical-seo.ts
│   ├── 📁 competitive-analysis/
│   │   ├── 📄 competitive-analyzer.ts
│   │   ├── 📄 gap-analyzer.ts
│   │   ├── 📄 insight-generator.ts
│   │   ├── 📄 metrics-calculator.ts
│   │   └── 📄 strategy-detector.ts
│   ├── 📁 content-analysis/
│   │   ├── 📄 content-preprocessor.ts
│   │   └── 📄 content-quality-scorer.ts
│   ├── 📄 crawler.ts
│   ├── 📄 db.ts
│   ├── 📁 export/
│   │   ├── 📄 csvExporter.ts
│   │   └── 📄 pdfExporter.ts
│   ├── 📄 index.ts
│   ├── 📄 replitAuth.ts
│   ├── 📁 routes/
│   │   ├── 📄 analysis.ts
│   │   ├── 📄 analysisFeatures.ts
│   │   ├── 📄 analysisManagement.ts
│   │   ├── 📄 auth.ts
│   │   ├── 📄 contentConversations.ts
│   │   ├── 📄 index.ts
│   │   ├── 📄 payments.ts
│   │   ├── 📄 schemas.ts
│   │   ├── 📄 settings.ts
│   │   └── 📄 user.ts
│   ├── 📄 seoAnalyzer.ts
│   ├── 📄 sitemap.ts
│   ├── 📄 storage.ts
│   ├── 📄 types.d.ts
│   └── 📄 vite.ts
├── 📁 shared/
│   └── 📄 schema.ts
├── 📄 tailwind.config.ts
└── 📄 vite.config.ts

```
