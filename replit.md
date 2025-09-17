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
- **AI Integration**: OpenAI GPT-4o for SEO suggestions and competitor analysis

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
- **OpenAI API**: GPT-4o model for AI-powered suggestions
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

## Cost-Effective Development Workflow

**Target: 3-5 tool calls maximum**

## Core Rules

**Before Acting:** Plan ALL reads + edits mentally first
**Information:** Batch all file reads in 1 call (predict what you need)
**Changes:** Use multi_edit for everything, batch parallel edits
**Verification:** Trust dev tools, stop when they confirm success

## Critical Batching

**Phase 1:** read(file1) + read(file2) + grep(pattern) + diagnostics() [1 call]
**Phase 2:** multi_edit(file1) + multi_edit(file2) + bash() [1-2 calls]
**Phase 3:** restart_workflow() only if runtime fails [0-1 call]

## Anti-Patterns ❌
- Sequential: read → analyze → read more → edit
- Multiple edits to same file
- Verification anxiety (checking working changes)
- Using architect for normal development

## ZERO DELEGATION RULE 🚫

**NEVER USE:**
- `start_subagent` - Execute everything yourself
- `write_task_list` - Plan mentally, act directly  
- `architect` - Only for genuine 3+ attempt failures

**WHY:** Sub-agents cost 2x+ tool calls via context transfer + cold starts

**ALWAYS:** Direct execution with batched tools = 3-5 calls total

## Surgical Precision
- **UI issues:** component + parent + hooks
- **API issues:** routes + services + schema  
- **Data issues:** schema + storage + endpoints
- **Errors:** Follow stack trace to deepest frame, work bottom-up, try the simplest fix, switch layers when stuck

## Stop Conditions
- HMR reload success
- Console shows expected behavior
- LSP errors cleared
- Dev server responds correctly

**Success metric:** Fix root cause with pattern-based changes in minimum tool calls

## User Preferences

Preferred communication style: Simple, everyday language.

If you need to use OpenAI models, model "gpt-4.1" is the newest model released on 14.4.2025.

- Use "rg" command to find occurrences of functions and signatures
- Always test the api routes after changes with "curl" e.g. curl https://localhost:5000 ... 
- For server routes, create modular structure with separation of concerns UI design choices should be mobile first unless stated otherwise
- Create reusable and modular components instead of inline components or monolithic code files

## Recent Changes

### September 10, 2025 - Auth0 Migration Implementation
- **Authentication Provider**: Successfully migrated from Replit Auth to Auth0 for enhanced flexibility and features
- **OpenID Connect (OIDC)**: Maintained existing OIDC architecture with Passport.js to minimize refactoring effort
- **Social Login Support**: Added support for Google and other social providers through Auth0
- **Enhanced Security**: Improved authentication flow with proper client secret handling and token validation
- **Dynamic Domain Support**: Fixed callback and logout URLs to work with Replit's dynamic domain system
- **Seamless Migration**: 2-4 hour migration path preserved all existing user sessions and functionality

### September 8, 2025 - Fair Pricing Model Implementation
- **Website Scan Pricing**: Updated to fair pricing model - trial users pay 5 credits per scan, paid users pay 3 credits per scan (discount for loyal customers)
- **Incentivized Upgrades**: Trial users now pay premium pricing, while paid users get rewarded with discounted scan costs
- **UI Updates**: Account page now displays different pricing for trial vs paid users
- **Credit Package Calculations**: Fixed to show accurate scan estimates based on user account status
- **Business Logic**: Aligns with standard freemium pricing where paying customers receive better value

### September 5, 2025 - Optimized Trial User Pricing Model
- **Website Scan Credits**: ~~Trial users now pay 3 credits per scan (down from 5), providing better value~~ *Updated September 8: Trial users pay 5 credits, paid users pay 3 credits*
- **Competitor Analysis**: Trial users now pay 2 credits for competitor analysis (previously free)
- **Chat Message Packs**: Implemented pack-based pricing for AI chat - 1 credit per 5 chat messages instead of 1 credit per message
- **Database Schema**: Added `chatMessagesInPack` field to track message pack usage
- **Smart Credit Tracking**: Chat messages are tracked in packs of 5, only deducting 1 credit when pack is complete
- **UI Enhancements**: Added chat pack progress indicators on Account and Dashboard pages for trial users
- **Credit Efficiency**: Trial users get more value with reduced website scan costs and bulk chat pricing
- **Comprehensive Testing**: Verified all credit deduction flows work correctly for trial user scenarios

### September 5, 2025 - Streamlined Content Analysis Pipeline 
- **Unified Content Quality Analysis**: Merged overlapping "Content Duplication" and "Keyword Analysis" functionality into a single, efficient system
- **Cost Reduction**: Achieved 50% cost reduction by eliminating redundant content processing (from 3 separate credits to 1 unified analysis)
- **Performance Improvement**: Integrated content quality analysis directly into main pipeline (generateInsights step) instead of separate API calls
- **Enhanced User Experience**: Replaced separate duplication and keyword tabs with unified "Content Quality" tab showing comprehensive insights
- **Architecture Simplification**: Removed server/content-analysis/content-duplication.ts and keyword-repetition.ts modules
- **Streamlined API**: Removed /api/analysis/:id/content-duplication and /api/analysis/:id/keyword-repetition endpoints
- **Unified Schema**: Content quality data now stored in analysis.contentQualityAnalysis and analysis.enhancedInsights fields
- **AI Integration**: Content quality analysis leverages existing AI processing for enhanced insights without additional costs

### August 21, 2025 - Implemented Freemium Monetization Model
- **Freemium System**: Transitioned from unlimited free access to credit-based freemium model
- **Free Tier Limits**: 3 free website scans total (one-time allocation) with basic SEO analysis only
- **Credit System**: Premium features require credits (trial users: 5 credits per scan, paid users: 3 credits per scan, 1 credit per page for AI suggestions)
- **AI Limitations**: Free users get 3 AI suggestions per analysis; paid users get unlimited suggestions based on credits
- **No Monthly Reset**: Free scans are a one-time allocation, users must purchase credits after using all 3
- **Export Remains Free**: All export functionality (CSV, JSON) remains free for all users

### August 21, 2025 - Fixed Credit Consumption System
- **Pricing Model Update**: Changed AI suggestion pricing from 1 credit per individual suggestion to 1 credit per page
- **User Experience Fix**: Resolved issue where users ran out of credits mid-analysis, leaving some pages without AI suggestions
- **Predictable Costs**: Users can now calculate exact costs upfront (trial: 5 credits, paid: 3 credits + 1 credit per page for AI)
- **Better Value**: Users get all suggestions for a page (typically 10-12) for just 1 credit instead of 10-12 credits

### Freemium Implementation Details:
- **Database Schema**: Added `credits`, `freeScansUsed` to users table (removed reset date functionality)
- **Credit Packs**: $9.99 for 50 credits, $24.99 for 150 credits, $49.99 for 350 credits
- **Analysis Limits**: Free users limited to 3 pages per scan (matching AI quota), paid users unlimited within technical limits
- **UI Updates**: Dashboard shows credit status and total free scan usage, Account page displays remaining free scans
- **Error Handling**: User-friendly messages guide users to purchase credits when all free scans are exhausted
- **Stripe Integration**: Secure payment processing with checkout sessions and webhook handling
- **One-Time Free Allocation**: No monthly reset - users get 3 free scans total, then must upgrade
- **AI Quota Consistency**: Fixed issue where some pages appeared analyzed but lacked suggestions

### August 21, 2025 - Improved Stripe Payment Flow
- **Checkout Sessions**: Replaced embedded payment forms with Stripe checkout sessions
- **Environment Variables**: Price IDs now configurable via STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_BUSINESS_PRICE_ID
- **Webhook Processing**: Implemented secure webhook handling for payment completion
- **User Experience**: Users now redirected to Stripe-hosted checkout page for payment entry
- **Security Enhancement**: Payment processing handled entirely by Stripe infrastructure

### Previous Changes:
- ~~**Unlimited Access**: Previously removed all scan limits for free users~~
- ~~**Database Migration**: All existing users had unlimited access (`pageLimit: -1`)~~

### July 24, 2025 - Modular Route Structure Refactoring
- Refactored monolithic `server/routes.ts` (800+ lines) into modular structure with separation of concerns
- Created dedicated route modules:
  - `server/routes/auth.ts` - User authentication endpoints
  - `server/routes/user.ts` - User profile and usage management
  - `server/routes/settings.ts` - User settings configuration
  - `server/routes/analysis.ts` - Core analysis functionality (start, cancel, progress)
  - `server/routes/analysisManagement.ts` - CRUD operations for analyses
  - `server/routes/analysisFeatures.ts` - Export, compare, content duplication features
  - `server/routes/schemas.ts` - Shared validation schemas
- Improved maintainability and code organization
- Preserved all existing functionality while enhancing developer experience
- Kept original routes.ts as backup

### Route Organization Benefits
- **Separation of Concerns**: Each module handles specific functionality domain
- **Better Maintainability**: Easier to locate and modify specific features
- **Improved Readability**: Smaller, focused files instead of one large file
- **Shared Schemas**: Centralized validation logic reduces duplication
- **Scalability**: Easy to add new features without affecting existing modules

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
│       │   ├── 📄 Header.tsx
│       │   ├── 📄 Navbar.tsx
│       │   ├── 📄 PageAnalysisCard.tsx
│       │   ├── 📄 Sidebar.tsx
│       │   ├── 📄 URLInputForm.tsx
│       │   ├── 📁 analysis-tabs/
│       │   │   ├── 📄 CompetitorTab.tsx
│       │   │   ├── 📄 ContentQualityTab.tsx
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
