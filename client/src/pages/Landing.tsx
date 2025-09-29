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
    title: "BotTailor – AI SEO Analysis Platform",
    description:
      "Launch comprehensive AI-powered SEO audits, uncover technical issues, and deploy data-backed content fixes with BotTailor.",
    ogTitle: "BotTailor | AI-Powered SEO Analysis",
    ogDescription:
      "Transform your website SEO with intelligent crawling, competitor benchmarking, and automated optimization workflows.",
    canonical: "https://bottailor.com/",
  },
};

const Landing = () => {
  const handleStartAnalysis = () => {
    // Redirect to login endpoint which will handle authentication
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Navbar onGetStarted={handleStartAnalysis} />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6">
              <Zap className="w-3 h-3 mr-1" />
              AI-Powered SEO Analysis
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Transform Your Website SEO with
              <span className="text-primary block">AI-Powered Analysis & Insights</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Professional website SEO analysis tool that identifies technical issues, provides actionable optimization recommendations, 
              and helps you outrank competitors with intelligent automation and comprehensive site auditing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" onClick={handleStartAnalysis} className="text-lg px-8">
                Start Free Analysis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

            </div>
            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Instant analysis
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                Export ready reports
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Complete SEO Analysis Suite for Website Optimization
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive website analysis tools powered by AI to give you actionable SEO insights, technical audits, and competitive advantages for better search engine rankings
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="relative overflow-hidden border-0 bg-background/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Comprehensive Website SEO Auditing</h3>
                <p className="text-muted-foreground mb-6">
                  Automated website crawling and sitemap analysis with real-time SEO issue detection. 
                  Get detailed technical SEO insights, on-page optimization recommendations, and site health scores with severity levels.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Automatic page discovery
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    SEO issue detection
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Technical recommendations
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-background/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">AI-Powered SEO Recommendations</h3>
                <p className="text-muted-foreground mb-6">
                  Advanced AI-generated SEO improvement suggestions powered by GPT-4, including smart alt text generation, 
                  content optimization strategies, and personalized keyword recommendations for better search rankings.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Smart improvement suggestions
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Auto-generated alt text
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Content optimization tips
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-background/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">SEO Competitor Analysis</h3>
                <p className="text-muted-foreground mb-6">
                  Comprehensive competitor SEO analysis with side-by-side performance comparison, keyword gap analysis, 
                  and actionable competitive insights to help you outrank competitors and dominate search results.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Performance benchmarking
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Gap analysis
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    Competitive opportunities
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-xl text-muted-foreground">
              Get comprehensive SEO insights in just a few simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">1. Enter URL</h3>
              <p className="text-muted-foreground">
                Simply enter your website domain and configure analysis settings
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">2. AI Analysis</h3>
              <p className="text-muted-foreground">
                Our AI crawls your site, analyzes content, and identifies optimization opportunities
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">3. Get Insights</h3>
              <p className="text-muted-foreground">
                Receive detailed reports with prioritized issues and actionable recommendations
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">4. Improve Rankings</h3>
              <p className="text-muted-foreground">
                Export data and implement changes to boost your search engine visibility
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted by developers and marketers
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10,000+</div>
              <div className="text-muted-foreground">Websites Analyzed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">500K+</div>
              <div className="text-muted-foreground">SEO Issues Identified</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">85%</div>
              <div className="text-muted-foreground">Average Improvement</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to optimize your website's SEO?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Get started with TrailWave SEO today and discover what's holding back your search rankings
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleStartAnalysis} className="text-lg px-8">
              Start Your Free Analysis Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg" asChild className="text-lg px-8">
              <Link href="/how-it-works">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">TrailWave SEO</span>
              </div>
              <p className="text-muted-foreground">
                Professional AI-powered SEO analysis platform for comprehensive website optimization and search engine ranking improvement
              </p>
              <div className="flex items-center mt-4 space-x-2 text-muted-foreground">
                <Mail className="w-5 h-5" />
                <span>support@trailwaveseo.com</span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>SEO Analysis</li>
                <li>AI Recommendations</li>
                <li>Competitor Analysis</li>
                <li>Export Reports</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Built on Replit</li>
                <li>Powered by OpenAI</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 TrailWave SEO. Built with ❤️ on Replit.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
