
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
import type { RouteDefinition } from "@shared/route-metadata";

export const route: RouteDefinition = {
  path: "/how-it-works",
  ssr: true,
  metadata: {
    title: "How TrailWave SEO Works – Automated SEO Workflows",
    description:
      "See how TrailWave SEO crawls your site, analyzes competitors, and ships AI-assisted SEO fixes across your marketing stack.",
    ogTitle: "How TrailWave SEO Works",
    ogDescription:
      "Follow the TrailWave SEO workflow that turns raw crawl data into prioritized SEO recommendations and ready-to-ship content.",
    canonical: "https://trailwaveseo.com/how-it-works",
  },
};

const HowItWorks = () => {
  const handleStartAnalysis = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950">
      <Navbar />

      {/* Header Section */}
      <section className="relative overflow-hidden py-20">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-10 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent mb-6 leading-tight">
            How TrailWave SEO Works
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8 leading-relaxed">
            Comprehensive AI-powered SEO analysis with competitor insights, chat assistance, and actionable recommendations
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 rounded-lg px-4 py-2 backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-slate-700 dark:text-slate-300">AI-powered insights</span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 rounded-lg px-4 py-2 backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Real-time chat support</span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 rounded-lg px-4 py-2 backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Competitor analysis</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {/* Core Analysis Process */}
        <Card className="mb-8 border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl text-slate-900 dark:text-white">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Search className="h-6 w-6" />
              </div>
              Core SEO Analysis Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              Our comprehensive SEO analysis engine combines automated crawling, AI-powered insights, and competitive intelligence
              to give you a complete picture of your website's performance and optimization opportunities.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-500 p-3 rounded-lg mr-3 text-white shadow-md">
                    <Globe className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">1. URL Input & Discovery</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enter your website URL and configure analysis settings. Our system automatically discovers pages through sitemap.xml parsing or intelligent crawling.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-purple-200/50 dark:border-purple-800/50">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-purple-600 to-purple-500 p-3 rounded-lg mr-3 text-white shadow-md">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">2. Content Extraction</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Advanced parsing extracts titles, meta descriptions, headings, images, structured data, and technical SEO elements from each page.
                </p>
              </div>

              <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 dark:from-pink-900/20 dark:to-pink-900/10 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-pink-200/50 dark:border-pink-800/50">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-pink-600 to-pink-500 p-3 rounded-lg mr-3 text-white shadow-md">
                    <Code className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">3. Technical Analysis</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Comprehensive technical SEO audit covering page speed, mobile compatibility, structured data, and crawlability issues.
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-emerald-200/50 dark:border-emerald-800/50">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 p-3 rounded-lg mr-3 text-white shadow-md">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">4. AI-Powered Insights</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  GPT-4 analyzes your content to generate personalized SEO recommendations, alt text suggestions, and content optimization tips.
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 dark:from-orange-900/20 dark:to-orange-900/10 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-orange-200/50 dark:border-orange-800/50">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-orange-600 to-orange-500 p-3 rounded-lg mr-3 text-white shadow-md">
                    <Database className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">5. Content Quality Scoring</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Unified content analysis detects duplication, keyword stuffing, readability issues, and provides quality scores with improvement suggestions.
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 dark:from-cyan-900/20 dark:to-cyan-900/10 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-cyan-200/50 dark:border-cyan-800/50">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-cyan-600 to-cyan-500 p-3 rounded-lg mr-3 text-white shadow-md">
                    <PieChart className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">6. Results Dashboard</h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Comprehensive dashboard with prioritized issues, page-by-page analysis, progress tracking, and actionable recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Competitor Analysis */}
          <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-white">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center text-white shadow-md">
                  <Target className="h-5 w-5" />
                </div>
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
          <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-900/20 dark:to-purple-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-white">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-500 rounded-lg flex items-center justify-center text-white shadow-md">
                  <MessageCircle className="h-5 w-5" />
                </div>
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
        <Card className="mb-8 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900 dark:text-white">Simple 4-Step Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6 relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-1/4 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 -z-10"></div>

              <div className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg hover:shadow-xl transition-shadow z-10">
                  <Globe className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">1. Enter URL</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Simply enter your website domain and configure analysis settings
                </p>
              </div>
              
              <div className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg hover:shadow-xl transition-shadow z-10">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2. AI Analysis</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Our AI crawls your site, analyzes content, and identifies opportunities
                </p>
              </div>
              
              <div className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg hover:shadow-xl transition-shadow z-10">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">3. Get Insights</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Receive detailed reports with prioritized recommendations
                </p>
              </div>
              
              <div className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg hover:shadow-xl transition-shadow z-10">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">4. Improve Rankings</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Export data and implement changes to boost visibility
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-900/20 dark:to-purple-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-8">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">AI-Powered Suggestions</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">Personalized SEO recommendations</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">Automatic alt text generation</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">Content optimization tips</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">Technical issue explanations</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-8">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Comprehensive Analysis</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">Automatic page discovery</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">Technical SEO auditing</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">Content quality scoring</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">Mobile compatibility check</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-pink-500/10 to-pink-500/5 dark:from-pink-900/20 dark:to-pink-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-8">
              <div className="w-14 h-14 bg-gradient-to-br from-pink-600 to-pink-500 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg">
                <Download className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5">Export & Integration</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">CSV export for spreadsheets</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">JSON export for developers</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">Team sharing capabilities</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">Analysis history tracking</span>
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
        <Card className="border-0 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 text-center relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -ml-32 -mb-32"></div>

          <CardContent className="pt-12 pb-12 relative z-10">
            <h3 className="text-3xl font-bold text-white mb-4">Ready to Optimize Your Website?</h3>
            <p className="text-slate-300 mb-8 leading-relaxed max-w-2xl mx-auto">
              Start your comprehensive SEO analysis today and discover how to improve your search rankings
            </p>
            <button
              onClick={handleStartAnalysis}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Start Free Analysis
            </button>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-slate-300 mt-8">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="font-medium">No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="font-medium">Instant results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="font-medium">AI-powered insights</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HowItWorks;
