import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Bot, 
  BarChart3, 
  CheckCircle, 
  ArrowRight, 
  Zap,
  Target,
  TrendingUp,
  FileText,
  Users,
  Globe,
  Mail
} from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import type { RouteDefinition } from "@shared/route-metadata";

export const route: RouteDefinition = {
  path: "/",
  ssr: true,
  metadata: {
    title: "TrailWave SEO – AI SEO Analysis Platform",
    description:
      "Launch comprehensive AI-powered SEO audits, uncover technical issues, and deploy data-backed content fixes with TrailWave SEO.",
    ogTitle: "TrailWave SEO | AI-Powered Website Analysis",
    ogDescription:
      "Transform your website SEO with intelligent crawling, competitor benchmarking, and automated optimization workflows.",
    canonical: "https://trailwaveseo.com/",
  },
};

const Landing = () => {
  const handleStartAnalysis = () => {
    // Redirect to login endpoint which will handle authentication
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      <Navbar onGetStarted={handleStartAnalysis} />

      {/* Hero Section with Enhanced Visuals */}
      <section className="relative overflow-hidden py-20 lg:py-40">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6 inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800">
              <Zap className="w-3 h-3 mr-1" />
              AI-Powered SEO Analysis
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-6 leading-tight">
              Transform Your Website SEO
            </h1>
            <p className="text-2xl text-slate-700 dark:text-slate-300 mb-6 font-semibold">
              with AI-Powered Analysis & Insights
            </p>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              Unlock your website's potential with intelligent SEO analysis. Identify technical issues, receive AI-powered recommendations, and outrank your competitors with comprehensive insights powered by OpenAI's latest models.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                onClick={handleStartAnalysis}
                className="text-lg px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Free Analysis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                asChild 
                className="text-lg px-8 border-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Link href="/how-it-works">Watch Demo</Link>
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 rounded-lg px-4 py-2 backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">No credit card needed</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 rounded-lg px-4 py-2 backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Results in seconds</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 rounded-lg px-4 py-2 backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Export ready reports</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Complete SEO Analysis Suite
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
              Comprehensive website analysis tools powered by AI to give you actionable SEO insights, technical audits, and competitive advantages
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/10 backdrop-blur-xl hover:shadow-xl transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-300 -mr-8 -mt-8"></div>
              <CardContent className="p-8 relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:shadow-xl transition-all">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Website SEO Auditing</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  Automated website crawling and sitemap analysis with real-time SEO issue detection. Get detailed technical insights and recommendations.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Automatic page discovery</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">SEO issue detection</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Technical recommendations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-900/20 dark:to-purple-900/10 backdrop-blur-xl hover:shadow-xl transition-all duration-300 group md:translate-y-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/10 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-300 -mr-8 -mt-8"></div>
              <CardContent className="p-8 relative">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:shadow-xl transition-all">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">AI-Powered Recommendations</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  Advanced AI-generated SEO improvement suggestions including smart alt text generation and content optimization strategies.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Smart improvement suggestions</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Auto-generated alt text</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Content optimization tips</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-pink-500/10 to-pink-500/5 dark:from-pink-900/20 dark:to-pink-900/10 backdrop-blur-xl hover:shadow-xl transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-400/10 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-300 -mr-8 -mt-8"></div>
              <CardContent className="p-8 relative">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-600 to-pink-500 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:shadow-xl transition-all">
                  <BarChart3 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Competitor Analysis</h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  Comprehensive competitor SEO analysis with side-by-side performance comparison and keyword gap analysis.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Performance benchmarking</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Gap analysis</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Competitive opportunities</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              How it works
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Get comprehensive SEO insights in just a few simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/3 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 -z-10"></div>

            <div className="text-center relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg hover:shadow-xl transition-shadow z-10">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">1. Enter URL</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Simply enter your website domain and let us handle the rest
              </p>
            </div>

            <div className="text-center relative">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg hover:shadow-xl transition-shadow z-10">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">2. AI Analysis</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Our AI crawls your site and identifies all opportunities
              </p>
            </div>

            <div className="text-center relative">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg hover:shadow-xl transition-shadow z-10">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">3. Get Insights</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive detailed reports with prioritized recommendations
              </p>
            </div>

            <div className="text-center relative">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg hover:shadow-xl transition-shadow z-10">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">4. Improve Ranks</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Export and implement changes to boost visibility
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Trusted by developers and marketers
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 hover:bg-white/20 transition-all duration-300">
              <div className="text-5xl font-bold text-white mb-3">10,000+</div>
              <div className="text-white/80 text-lg">Websites Analyzed</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 hover:bg-white/20 transition-all duration-300">
              <div className="text-5xl font-bold text-white mb-3">500K+</div>
              <div className="text-white/80 text-lg">SEO Issues Identified</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 hover:bg-white/20 transition-all duration-300">
              <div className="text-5xl font-bold text-white mb-3">85%</div>
              <div className="text-white/80 text-lg">Average Improvement</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -ml-32 -mb-32"></div>

            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to optimize your SEO?
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                Get started with TrailWave SEO today and discover what's holding back your search rankings. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={handleStartAnalysis}
                  className="text-lg px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Start Your Free Analysis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  asChild
                  className="text-lg px-8 border-2 border-white text-white hover:bg-white/10 transition-colors"
                >
                  <Link href="/how-it-works">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-12 text-white" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">TrailWave SEO</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                AI-powered SEO analysis platform for comprehensive website optimization
              </p>
              <div className="flex items-center mt-4 space-x-2 text-slate-400">
                <Mail className="w-5 h-5" />
                <span>support@trailwaveseo.com</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Features</h4>
              <ul className="space-y-2 text-slate-400">
                <li className="hover:text-white transition-colors cursor-default">SEO Analysis</li>
                <li className="hover:text-white transition-colors cursor-default">AI Recommendations</li>
                <li className="hover:text-white transition-colors cursor-default">Competitor Analysis</li>
                <li className="hover:text-white transition-colors cursor-default">Export Reports</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white">Platform</h4>
              <ul className="space-y-2 text-slate-400">
                <li className="hover:text-white transition-colors cursor-default">Built on Replit</li>
                <li className="hover:text-white transition-colors cursor-default">Powered by OpenAI</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2025 TrailWave SEO. Built with ❤️ on Replit.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
