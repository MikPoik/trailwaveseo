# SEO Website Analyzer - Architecture Overview

## Overview

This is a full-stack web application for analyzing website SEO performance using AI-powered suggestions. The application allows users to crawl websites, analyze their SEO metrics, and receive actionable recommendations for improvement. It features user authentication via Replit Auth, competitor analysis capabilities, and comprehensive SEO reporting.

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
- **Authentication**: Replit Auth with OpenID Connect (OIDC)
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
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **User Management**: User profiles with email, name, and avatar support
- **Route Protection**: Authentication middleware for protected endpoints

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

1. **User Authentication**: Users authenticate via Replit Auth, creating/updating user records
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

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

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

## Changelog

Changelog:
- July 03, 2025. Initial setup
- July 24, 2025. Refactored route structure into modular architecture