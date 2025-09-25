
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  FileText, 
  Code, 
  Database, 
  PieChart, 
  Download, 
  Sparkles,
  MessageCircle,
  Target,
  BarChart3,
  Zap,
  Globe,
  Bot,
  TrendingUp,
  CheckCircle,
  Users,
  Shield,
  Coins
} from "lucide-react";
import { useEffect } from "react";

const HowItWorks = () => {
  const handleStartAnalysis = () => {
    window.location.href = "/api/login";
  };

  useEffect(() => {
    // Update meta tags for SEO
    document.title = "How TrailWave SEO Works - Complete Website Analysis Process";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Learn how TrailWave SEO analyzes your website with AI-powered insights, automated crawling, competitor analysis, and comprehensive SEO auditing to boost your search rankings.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <Navbar />

      {/* Header Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            How TrailWave SEO Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Comprehensive AI-powered SEO analysis with competitor insights, chat assistance, and actionable recommendations
          </p>
          <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              AI-powered insights
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Real-time chat support
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Competitor analysis
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {/* Core Analysis Process */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              Core SEO Analysis Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Our comprehensive SEO analysis engine combines automated crawling, AI-powered insights, and competitive intelligence
              to give you a complete picture of your website's performance and optimization opportunities.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="bg-primary/10 p-2 rounded-md mr-3">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium text-foreground">1. URL Input & Discovery</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your website URL and configure analysis settings. Our system automatically discovers pages through sitemap.xml parsing or intelligent crawling.
                </p>
              </div>

              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="bg-primary/10 p-2 rounded-md mr-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium text-foreground">2. Content Extraction</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Advanced parsing extracts titles, meta descriptions, headings, images, structured data, and technical SEO elements from each page.
                </p>
              </div>

              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="bg-primary/10 p-2 rounded-md mr-3">
                    <Code className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium text-foreground">3. Technical Analysis</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Comprehensive technical SEO audit covering page speed, mobile compatibility, structured data, and crawlability issues.
                </p>
              </div>

              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="bg-primary/10 p-2 rounded-md mr-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium text-foreground">4. AI-Powered Insights</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  GPT-4 analyzes your content to generate personalized SEO recommendations, alt text suggestions, and content optimization tips.
                </p>
              </div>

              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="bg-primary/10 p-2 rounded-md mr-3">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium text-foreground">5. Content Quality Scoring</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Unified content analysis detects duplication, keyword stuffing, readability issues, and provides quality scores with improvement suggestions.
                </p>
              </div>

              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="bg-primary/10 p-2 rounded-md mr-3">
                    <PieChart className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-medium text-foreground">6. Results Dashboard</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Comprehensive dashboard with prioritized issues, page-by-page analysis, progress tracking, and actionable recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Competitor Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Competitor Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Advanced competitive intelligence to understand how your site compares to competitors in your space.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h5 className="font-medium text-sm">Side-by-Side Comparison</h5>
                    <p className="text-xs text-muted-foreground">Compare SEO metrics, content strategies, and technical implementations</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h5 className="font-medium text-sm">Gap Analysis</h5>
                    <p className="text-xs text-muted-foreground">Identify opportunities where competitors outperform your site</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h5 className="font-medium text-sm">Strategic Insights</h5>
                    <p className="text-xs text-muted-foreground">AI-powered recommendations based on competitive analysis</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Credit Cost: 1 credits per analysis</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Chat Assistant */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-primary" />
                AI Chat Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Interactive AI assistant that helps you understand and implement SEO improvements for your specific content.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h5 className="font-medium text-sm">Content-Aware Discussions</h5>
                    <p className="text-xs text-muted-foreground">Chat about specific pages and get personalized advice</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h5 className="font-medium text-sm">SEO Implementation Help</h5>
                    <p className="text-xs text-muted-foreground">Step-by-step guidance for implementing recommendations</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h5 className="font-medium text-sm">Fresh Content Analysis</h5>
                    <p className="text-xs text-muted-foreground">Get real-time insights on current page content</p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Credit Cost: 1 credit per 10 messages</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How It Works Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Simple 4-Step Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">1. Enter URL</h3>
                <p className="text-muted-foreground text-sm">
                  Simply enter your website domain and configure analysis settings
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">2. AI Analysis</h3>
                <p className="text-muted-foreground text-sm">
                  Our AI crawls your site, analyzes content, and identifies optimization opportunities
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">3. Get Insights</h3>
                <p className="text-muted-foreground text-sm">
                  Receive detailed reports with prioritized issues and actionable recommendations
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">4. Improve Rankings</h3>
                <p className="text-muted-foreground text-sm">
                  Export data and implement changes to boost your search engine visibility
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">AI-Powered Suggestions</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Personalized SEO recommendations
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Automatic alt text generation
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Content optimization tips
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Technical issue explanations
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Comprehensive Analysis</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Automatic page discovery
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Technical SEO auditing
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Content quality scoring
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Mobile compatibility check
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Export & Integration</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  CSV export for spreadsheets
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  JSON export for developers
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Team sharing capabilities
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  Analysis history tracking
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Credit System */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-primary" />
              Credit-Based Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Our fair credit system ensures you only pay for what you use, with different pricing for trial and paid users.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Website Scans</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-sm">Trial Users</span>
                    <span className="font-medium">5 credits per scan</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-primary/10 rounded">
                    <span className="text-sm">Paid Users</span>
                    <span className="font-medium">3 credits per scan</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold">Premium Features</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-sm">AI Suggestions</span>
                    <span className="font-medium">1 credit per page</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-sm">Competitor Analysis</span>
                    <span className="font-medium">1 credits</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-sm">Chat Messages</span>
                    <span className="font-medium">1 credit per 10 messages</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Get Started CTA */}
        <Card className="text-center">
          <CardContent className="pt-6">
            <h3 className="text-2xl font-bold mb-4">Ready to Optimize Your Website?</h3>
            <p className="text-muted-foreground mb-6">
              Start your comprehensive SEO analysis today and discover how to improve your search rankings
            </p>
            <button
              onClick={handleStartAnalysis}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Start Free Analysis
            </button>
            
            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground mt-6">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Instant results
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                AI-powered insights
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HowItWorks;
