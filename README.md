
# TrailWave SEO - Advanced SEO Analysis Platform

TrailWave SEO is a comprehensive SEO analysis platform that provides AI-powered insights, competitor analysis, and detailed site auditing capabilities. Built with modern web technologies and powered by OpenAI's GPT-4, it offers professional-grade SEO analysis tools for websites of all sizes.

## Features

### Core SEO Analysis
- **Complete Site Crawling**: Automated discovery and analysis of all website pages
- **Sitemap Integration**: XML sitemap parsing with recursive sitemap index support
- **Real-time Progress**: Live updates during analysis with Server-Sent Events
- **Issue Detection**: Automated identification of SEO issues with severity levels

### AI-Powered Insights
- **Content Analysis**: AI-generated suggestions for improving content quality
- **Alt Text Generation**: Automatic alt text suggestions for images
- **SEO Recommendations**: Personalized optimization recommendations
- **Competitor Analysis**: AI-powered competitive analysis and insights

### Advanced Features
- **Content Repetition Analysis**: Detection of duplicate titles, descriptions, and headings
- **Internal Link Optimization**: Analysis of internal linking structure and opportunities
- **Mobile Compatibility**: Mobile-first SEO analysis
- **Page Speed Insights**: Performance optimization recommendations
- **Structured Data Analysis**: Schema markup validation and suggestions

### User Management
- **Replit Authentication**: Secure login via Replit's OpenID Connect
- **Usage Tracking**: Monitor page analysis limits and usage
- **Personalized Settings**: Customizable crawling and analysis parameters
- **Analysis History**: Complete history of all site analyses

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **TanStack Query** for state management
- **Wouter** for routing
- **React Hook Form** with Zod validation

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **PostgreSQL** (via Neon serverless)
- **OpenAI API** for AI-powered features

### Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Platform**: Authentication and deployment
- **Server-Sent Events**: Real-time progress updates
- **Session Management**: PostgreSQL-backed sessions

## Getting Started

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database (Neon recommended)
- OpenAI API key
- Replit account for authentication

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Database
   DATABASE_URL=your_neon_database_url
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   
   # Replit Auth
   REPLIT_CLIENT_ID=your_replit_client_id
   REPLIT_CLIENT_SECRET=your_replit_client_secret
   ```

4. Initialize the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### Basic SEO Analysis
1. Enter a website URL in the analysis form
2. Configure crawling settings (optional)
3. Start the analysis and monitor real-time progress
4. Review comprehensive SEO insights and recommendations

### Advanced Features
- **Competitor Analysis**: Compare your site against competitors
- **Content Repetition**: Identify and fix duplicate content issues
- **AI Suggestions**: Get personalized optimization recommendations
- **Export Results**: Download analysis results in CSV or JSON format

### Settings Configuration
- **Max Pages**: Set crawling limits (1-100 pages)
- **Crawl Delay**: Configure delays between requests
- **Analysis Options**: Toggle specific analysis features
- **AI Integration**: Enable/disable AI-powered suggestions

## API Documentation

### Authentication
All protected endpoints require authentication via Replit's OpenID Connect.

### Key Endpoints
- `POST /api/analyze` - Start SEO analysis
- `GET /api/analysis/history` - Get analysis history
- `GET /api/analysis/:id` - Get specific analysis
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings

## Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Express backend
│   ├── crawler.ts          # Web crawling logic
│   ├── seoAnalyzer.ts      # SEO analysis engine
│   ├── openai.ts           # AI integration
│   ├── storage.ts          # Database operations
│   └── routes.ts           # API endpoints
├── shared/                 # Shared types and schemas
└── db/                     # Database migrations
```

### Build Process
```bash
# Development
npm run dev

# Production build
npm run build

# Type checking
npm run check

# Database operations
npm run db:push
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

**TrailWave SEO** - Empowering websites with professional SEO insights and AI-powered optimization recommendations.
