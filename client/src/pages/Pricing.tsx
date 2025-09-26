
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
  Shield
} from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";

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
              Fair Credit-Based Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Simple, Transparent Pricing
              <span className="text-primary block">Pay Only for What You Use</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
              Our credit-based system ensures you only pay for the SEO analysis you need. 
              Start with a generous free trial, then scale with flexible pricing that grows with your business.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Free Trial */}
            <Card className="relative border-2 border-muted">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Free Trial</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">Free</span>
                  <span className="text-muted-foreground ml-2">to start</span>
                </div>
                <p className="text-muted-foreground mt-2">
                  Perfect for testing our platform
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>50 free credits included</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>10 website scans (5 credits each)</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Basic SEO analysis</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Export to CSV/JSON</span>
                  </div>
                  <div className="flex items-center">
                    <X className="w-5 h-5 text-muted-foreground mr-3" />
                    <span className="text-muted-foreground">AI-powered suggestions</span>
                  </div>
                  <div className="flex items-center">
                    <X className="w-5 h-5 text-muted-foreground mr-3" />
                    <span className="text-muted-foreground">Competitor analysis</span>
                  </div>
                </div>
                <Button onClick={handleGetStarted} className="w-full">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-2 border-primary shadow-lg">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
                <p className="text-muted-foreground mt-2">
                  For growing businesses and agencies
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>500 credits per month</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>166+ website scans (3 credits each)</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>AI-powered SEO suggestions</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Competitor analysis</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Priority support</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Advanced export options</span>
                  </div>
                </div>
                <Button onClick={handleGetStarted} className="w-full" size="lg">
                  Start Pro Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className="relative border-2 border-muted">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
                <p className="text-muted-foreground mt-2">
                  For large teams and organizations
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>2000 credits per month</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>666+ website scans (3 credits each)</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Advanced AI features</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>White-label reports</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>API access</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>Dedicated support</span>
                  </div>
                </div>
                <Button onClick={handleGetStarted} variant="outline" className="w-full">
                  Contact Sales
                  <ArrowRight className="w-4 h-4 ml-2" />
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
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Trial Users</span>
                    <Badge variant="outline">5 credits per scan</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                    <span>Paid Users</span>
                    <Badge className="bg-primary text-primary-foreground">3 credits per scan</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Premium Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>AI Suggestions</span>
                    <Badge variant="outline">+1 credit</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Competitor Analysis</span>
                    <Badge variant="outline">+2 credits</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Feature Comparison
            </h2>
            <p className="text-xl text-muted-foreground">
              Choose the plan that best fits your SEO analysis needs
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 pr-8">Features</th>
                  <th className="text-center py-4 px-4">Free Trial</th>
                  <th className="text-center py-4 px-4">Pro</th>
                  <th className="text-center py-4 px-4">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-4 pr-8 font-medium">Monthly Credits</td>
                  <td className="text-center py-4 px-4">50</td>
                  <td className="text-center py-4 px-4">500</td>
                  <td className="text-center py-4 px-4">2000</td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Website Scans</td>
                  <td className="text-center py-4 px-4">~10</td>
                  <td className="text-center py-4 px-4">166+</td>
                  <td className="text-center py-4 px-4">666+</td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Basic SEO Analysis</td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">AI-Powered Suggestions</td>
                  <td className="text-center py-4 px-4"><X className="w-5 h-5 text-muted-foreground mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Competitor Analysis</td>
                  <td className="text-center py-4 px-4"><X className="w-5 h-5 text-muted-foreground mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Export Reports</td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">Priority Support</td>
                  <td className="text-center py-4 px-4"><X className="w-5 h-5 text-muted-foreground mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="text-center py-4 px-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-4 pr-8 font-medium">API Access</td>
                  <td className="text-center py-4 px-4"><X className="w-5 h-5 text-muted-foreground mx-auto" /></td>
                  <td className="text-center py-4 px-4"><X className="w-5 h-5 text-muted-foreground mx-auto" /></td>
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
                <h3 className="text-lg font-semibold mb-3">How do credits work?</h3>
                <p className="text-muted-foreground">
                  Credits are consumed based on the features you use. A basic website scan costs 3-5 credits 
                  depending on your plan, while premium features like AI suggestions and competitor analysis 
                  require additional credits.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">What happens if I run out of credits?</h3>
                <p className="text-muted-foreground">
                  You can upgrade your plan at any time or purchase additional credit packages. 
                  Your account will show your remaining credit balance, and you'll receive notifications 
                  when running low.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">Can I cancel anytime?</h3>
                <p className="text-muted-foreground">
                  Yes, you can cancel your subscription at any time. Your remaining credits will stay 
                  active until the end of your billing period, and you won't be charged for the next cycle.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">Do credits roll over?</h3>
                <p className="text-muted-foreground">
                  Unused credits do not roll over to the next billing period. We recommend choosing a plan 
                  that matches your expected monthly usage to get the best value.
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
            Start with our free trial and see the difference professional SEO analysis can make
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8">
              Start Free Trial
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
