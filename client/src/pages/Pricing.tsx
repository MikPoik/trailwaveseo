
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Navbar onGetStarted={handleGetStarted} />

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6">
              <Coins className="w-3 h-3 mr-1" />
              Credit-Based Pricing Packages
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Simple, Transparent Pricing
              <span className="text-primary block">Choose Your Credit Package</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
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
            <Card className="relative border-2 border-muted">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Starter Pack</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">€4.99</span>
                </div>
                <p className="text-muted-foreground mt-2">
                  50 Credits • ~€0.100 per credit
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>50 credits for scans & AI features</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Scans: 3 credits each</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>AI suggestions: 1 credit per page</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Competitor analysis: 1 credits</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Chat: 1 credit per 10 messages</span>
                  </div>
                </div>
                <Button onClick={handleGetStarted} className="w-full">
                  <Coins className="w-4 h-4 mr-2" />
                  Purchase Credits
                </Button>
              </CardContent>
            </Card>

            {/* Pro Pack */}
            <Card className="relative border-2 border-primary shadow-lg">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white px-3 py-1">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl">Pro Pack</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">€9.99</span>
                </div>
                <p className="text-muted-foreground mt-2">
                  120 Credits • ~€0.083 per credit
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>120 credits for scans & AI features</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Scans: 3 credits each</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>AI suggestions: 1 credit per page</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Competitor analysis: 1 credits</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Chat: 1 credit per 10 messages</span>
                  </div>
                </div>
                <Button onClick={handleGetStarted} className="w-full" size="lg">
                  <Coins className="w-4 h-4 mr-2" />
                  Purchase Credits
                </Button>
              </CardContent>
            </Card>

            {/* Business Pack */}
            <Card className="relative border-2 border-muted">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-purple-500 text-white px-3 py-1">
                  Best Value
                </Badge>
              </div>
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl">Business Pack</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">€19.99</span>
                </div>
                <p className="text-muted-foreground mt-2">
                  280 Credits • ~€0.071 per credit
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>280 credits for scans & AI features</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Scans: 3 credits each</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>AI suggestions: 1 credit per page</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Competitor analysis: 1 credits</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Chat: 1 credit per 10 messages</span>
                  </div>
                </div>
                <Button onClick={handleGetStarted} className="w-full">
                  <Coins className="w-4 h-4 mr-2" />
                  Purchase Credits
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Credit System Explanation */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How Our Credit System Works
            </h2>
            <p className="text-xl text-muted-foreground">
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
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Package Comparison
            </h2>
            <p className="text-xl text-muted-foreground">
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
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to improve your SEO?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Choose your credit package and start analyzing your website's SEO performance today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8">
              Get Started Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg" asChild className="text-lg px-8">
              <Link href="/how-it-works">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">TrailWave SEO</span>
              </div>
              <p className="text-muted-foreground">
                Professional AI-powered SEO analysis platform for comprehensive website optimization.
              </p>
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

export default Pricing;
