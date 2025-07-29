import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  FileText, 
  Code, 
  Database, 
  PieChart, 
  Download, 
  Sparkles
} from "lucide-react";

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <Navbar />
      
      {/* Header Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            How It Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Learn how our SEO Optimizer analyzes and improves your website with AI-powered insights
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">SEO Optimizer Process</h3>
            <p className="text-gray-600 mb-6">
              Our SEO Optimizer uses advanced algorithms and AI to analyze your website's SEO performance
              and provide actionable recommendations to improve your search engine rankings.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="bg-primary-50 p-2 rounded-md mr-3">
                    <Search className="h-6 w-6 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">1. URL Input</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Enter your website URL to begin the analysis process. You can choose between sitemap.xml retrieval or site crawling.
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="bg-primary-50 p-2 rounded-md mr-3">
                    <FileText className="h-6 w-6 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">2. Sitemap Retrieval</h4>
                </div>
                <p className="text-sm text-gray-600">
                  We'll first attempt to locate and parse your sitemap.xml file to identify all pages on your site.
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="bg-primary-50 p-2 rounded-md mr-3">
                    <Code className="h-6 w-6 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">3. Page Analysis</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Each page is analyzed for key SEO elements: titles, meta descriptions, headings, images, and more.
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="bg-primary-50 p-2 rounded-md mr-3">
                    <Database className="h-6 w-6 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">4. Data Extraction</h4>
                </div>
                <p className="text-sm text-gray-600">
                  We extract and organize all the relevant SEO data from your pages to prepare for analysis.
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="bg-primary-50 p-2 rounded-md mr-3">
                    <Sparkles className="h-6 w-6 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">5. AI Processing</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Our AI analyzes the data to identify issues and generate tailored recommendations specific to your website.
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <div className="bg-primary-50 p-2 rounded-md mr-3">
                    <PieChart className="h-6 w-6 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">6. Results Dashboard</h4>
                </div>
                <p className="text-sm text-gray-600">
                  View comprehensive results with detailed page-by-page analysis and actionable recommendations.
                </p>
              </div>
            </div>

            <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Export Options</h4>
              <div className="flex items-start">
                <Download className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                <p className="text-sm text-gray-600">
                  Export your analysis results in CSV format for easy sharing with your team or clients.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HowItWorks;
