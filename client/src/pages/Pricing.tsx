
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  X, 
  Zap,
  ArrowRight,
  Star,
  Coins,
  Globe,
  Bot,
  BarChart3,
  FileText,
  Users,
  Shield,
  MessageSquare
} from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import type { RouteDefinition } from "@shared/route-metadata";

export const route: RouteDefinition = {
  path: "/pricing",
  ssr: true,
  metadata: {
    title: "Pricing – TrailWave SEO Plans",
    description:
      "Choose flexible TrailWave SEO plans to automate SEO analysis, competitor benchmarking, and content recommendations at scale.",
    ogTitle: "TrailWave SEO Pricing",
    ogDescription:
      "Compare TrailWave SEO plans and unlock AI-powered SEO audits that grow with your marketing team.",
    canonical: "https://trailwaveseo.com/pricing",
  },
};

const Pricing = () => {
  const handleGetStarted = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      <Navbar onGetStarted={handleGetStarted} />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6 inline-block bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800">
              <Coins className="w-3 h-3 mr-1" />
              Credit-Based Pricing Packages
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-6 leading-tight">
              Simple, Transparent Pricing
            </h1>
            <p className="text-2xl text-slate-700 dark:text-slate-300 mb-6 font-semibold">
              Choose Your Credit Package
            </p>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Our credit-based system ensures you only pay for the SEO analysis you need. 
              Purchase credit packages that fit your usage and scale with your business growth.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Starter Pack */}
            <Card className="relative border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl text-slate-900 dark:text-white">Starter Pack</CardTitle>
                <div className="mt-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">€4.99</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-3 font-medium">
                  50 Credits • ~€0.100 per credit
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">50 credits for scans & AI features</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Scans: 3 credits each</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">AI suggestions: 1 credit per page</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Competitor analysis: 1 credits</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Chat: 1 credit per 10 messages</span>
                  </div>
                </div>
                <Button onClick={handleGetStarted} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md hover:shadow-lg transition-all">
                  <Coins className="w-4 h-4 mr-2" />
                  Purchase Credits
                </Button>
              </CardContent>
            </Card>

            {/* Pro Pack */}
            <Card className="relative border-0 bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-900/20 dark:to-purple-900/10 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 ring-2 ring-purple-400/50">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1.5 shadow-lg">
                  <Star className="w-3 h-3 mr-1.5" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="text-center pb-8 pt-12">
                <CardTitle className="text-2xl text-slate-900 dark:text-white">Pro Pack</CardTitle>
                <div className="mt-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">€9.99</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-3 font-medium">
                  120 Credits • ~€0.083 per credit
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">120 credits for scans & AI features</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Scans: 3 credits each</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">AI suggestions: 1 credit per page</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Competitor analysis: 1 credits</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Chat: 1 credit per 10 messages</span>
                  </div>
                </div>
                <Button onClick={handleGetStarted} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all" size="lg">
                  <Coins className="w-4 h-4 mr-2" />
                  Purchase Credits
                </Button>
              </CardContent>
            </Card>

            {/* Business Pack */}
            <Card className="relative border-0 bg-gradient-to-br from-pink-500/10 to-pink-500/5 dark:from-pink-900/20 dark:to-pink-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-orange-600 to-pink-600 text-white px-4 py-1.5 shadow-lg">
                  Best Value
                </Badge>
              </div>
              <CardHeader className="text-center pb-8 pt-12">
                <CardTitle className="text-2xl text-slate-900 dark:text-white">Business Pack</CardTitle>
                <div className="mt-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent">€19.99</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-3 font-medium">
                  280 Credits • ~€0.071 per credit
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">280 credits for scans & AI features</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Scans: 3 credits each</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">AI suggestions: 1 credit per page</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Competitor analysis: 1 credits</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">Chat: 1 credit per 10 messages</span>
                  </div>
                </div>
                <Button onClick={handleGetStarted} className="w-full bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all">
                  <Coins className="w-4 h-4 mr-2" />
                  Purchase Credits
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Credit System Explanation */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              How Our Credit System Works
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Simple, transparent pricing that scales with your usage
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Website Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                    <span>Website Scan (Credit Users)</span>
                    <Badge className="bg-primary text-primary-foreground">3 credits</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-100 rounded-lg">
                    <span>Website Scan (Trial Users)</span>
                    <Badge className="bg-orange-600 text-white">5 credits</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Each comprehensive website scan including technical SEO analysis, 
                    page discovery, and basic optimization recommendations. Trial users pay 5 credits per scan.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  AI-Powered Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>AI Suggestions (per page)</span>
                    <Badge variant="outline">1 credit</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Competitor Analysis</span>
                    <Badge variant="outline">1 credit</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Chat (per 10 messages)</span>
                    <Badge variant="outline">1 credit</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Value Comparison */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Package Comparison
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Choose the package that best fits your SEO analysis needs
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 pr-8">Package Details</th>
                  <th className="text-center py-4 px-4">Starter Pack</th>
                  <th className="text-center py-4 px-4">Pro Pack</th>
                  <th className="text-center py-4 px-4">Business Pack</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-4 pr-8 font-medium">Total Credits</td>
                  <td className="text-center py-4 px-4">50</td>
                  <td className="text-center py-4 px-4">120</td>
                  <td className="text-center py-4 px-4">280</td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Price</td>
                  <td className="text-center py-4 px-4">€4.99</td>
                  <td className="text-center py-4 px-4">€9.99</td>
                  <td className="text-center py-4 px-4">€19.99</td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Cost per Credit</td>
                  <td className="text-center py-4 px-4">~€0.100</td>
                  <td className="text-center py-4 px-4">~€0.083</td>
                  <td className="text-center py-4 px-4">~€0.071</td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Website Scans (~16 scans)</td>
                  <td className="text-center py-4 px-4">~16 scans</td>
                  <td className="text-center py-4 px-4">~40 scans</td>
                  <td className="text-center py-4 px-4">~93 scans</td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">AI Features</td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Competitor Analysis</td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Chat Support</td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Export Reports</td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">How do credit packages work?</h3>
                <p className="text-muted-foreground">
                  Purchase credit packages that suit your needs. Credits are consumed based on the features you use:
                  website scans (3 credits), AI suggestions (1 credit per page), competitor analysis (1 credit), 
                  and chat support (1 credit per 10 messages).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">Do credits expire?</h3>
                <p className="text-muted-foreground">
                  No, credits do not expire. Once purchased, you can use them at your own pace. 
                  This gives you complete flexibility to analyze websites when needed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">Can I purchase multiple packages?</h3>
                <p className="text-muted-foreground">
                  Yes, you can purchase multiple credit packages. All credits will be added to your account balance 
                  and can be used for any features across the platform.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">What's the difference between packages?</h3>
                <p className="text-muted-foreground">
                  The main difference is the number of credits and cost efficiency. Larger packages offer 
                  better value per credit: Starter (€0.100/credit), Pro (€0.083/credit), Business (€0.071/credit).
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl -ml-32 -mb-32"></div>

            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to improve your SEO?
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                Choose your credit package and start analyzing your website's SEO performance today
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                  Get Started Now
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
      <footer className="border-t border-slate-800 bg-slate-900 py-12 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">TrailWave SEO</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                AI-powered SEO analysis platform for comprehensive website optimization.
              </p>
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

export default Pricing;
