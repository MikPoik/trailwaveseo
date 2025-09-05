import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BadgeCheck, 
  AlertTriangle, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  FileText,
  Building2,
  Users,
  Target,
  Clock,
  Zap,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { WebsiteAnalysis, PageAnalysis } from "@/lib/types";
import EnhancedInsights from "../EnhancedInsights";
import PageAnalysisCard from "../PageAnalysisCard";

interface OverviewTabProps {
  analysis: WebsiteAnalysis;
  onNewAnalysis: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onPageReanalyze: (pageUrl: string, updatedPage: PageAnalysis) => void;
}

const OverviewTab = ({ analysis, onNewAnalysis, onExportCSV, onExportPDF, onPageReanalyze }: OverviewTabProps) => {
  const [displayedPages, setDisplayedPages] = useState(10);

  const loadMorePages = () => {
    setDisplayedPages(prev => prev + 5);
  };
  
  const getCategoryOptimizationPercentage = (category: string): number => {
    const allPagesWithIssues = analysis.pages.filter(page => 
      page.issues.some(issue => issue.category === category)
    ).length;

    if (allPagesWithIssues === 0) return 100;

    const pagesWithCategory = analysis.pages.length;
    return Math.round(((pagesWithCategory - allPagesWithIssues) / pagesWithCategory) * 100);
  };

  return (
    <>
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">SEO Analysis Results</h3>
            <p className="mt-1 text-sm text-gray-500">
              Website: <span>{analysis.domain}</span> • 
              Analyzed <span>{analysis.pages?.length || 0}</span> pages • 
              <span>
                {analysis.date 
                  ? format(new Date(analysis.date), 'MMMM d, yyyy')
                  : format(new Date(), 'MMMM d, yyyy')}
              </span>
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button 
              variant="outline" 
              onClick={onExportCSV}
            >
              <Download className="h-5 w-5 mr-2" />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={onExportPDF}
            >
              <FileText className="h-5 w-5 mr-2" />
              Export PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={onNewAnalysis}
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              New Analysis
            </Button>
          </div>
        </div>

        {/* Enhanced Insights - New modular analysis scores */}
        {analysis.enhancedInsights && (
          <EnhancedInsights insights={analysis.enhancedInsights} />
        )}

        {/* Business Context Insights - From modular analysis pipeline */}
        {analysis.siteOverview && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                Business Context Analysis
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                    <h5 className="text-sm font-medium text-blue-800">Business Type</h5>
                  </div>
                  <p className="text-sm text-blue-700">{analysis.siteOverview.businessType || 'Not detected'}</p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                    <h5 className="text-sm font-medium text-green-800">Industry</h5>
                  </div>
                  <p className="text-sm text-green-700">{analysis.siteOverview.industry || 'Not identified'}</p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Users className="h-5 w-5 text-purple-600 mr-2" />
                    <h5 className="text-sm font-medium text-purple-800">Target Audience</h5>
                  </div>
                  <p className="text-sm text-purple-700">{analysis.siteOverview.targetAudience || 'Not specified'}</p>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Target className="h-5 w-5 text-orange-600 mr-2" />
                    <h5 className="text-sm font-medium text-orange-800">Main Services</h5>
                  </div>
                  <p className="text-sm text-orange-700">
                    {analysis.siteOverview.mainServices && analysis.siteOverview.mainServices.length > 0 
                      ? analysis.siteOverview.mainServices.slice(0, 2).join(', ') + 
                        (analysis.siteOverview.mainServices.length > 2 ? '...' : '')
                      : 'Not detected'
                    }
                  </p>
                </div>
              </div>

              {analysis.siteOverview.location && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Location:</strong> {analysis.siteOverview.location}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Processing Statistics - From modular analysis pipeline */}
        {analysis.processingStats && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                Analysis Performance Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {analysis.processingStats.pagesAnalyzed}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Pages Analyzed</div>
                  {analysis.processingStats.pagesDiscovered && 
                   analysis.processingStats.pagesDiscovered !== analysis.processingStats.pagesAnalyzed && (
                    <div className="text-xs text-gray-500">
                      of {analysis.processingStats.pagesDiscovered} discovered
                    </div>
                  )}
                </div>
                
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">
                    {analysis.processingStats.aiCallsMade || 0}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">AI Insights Generated</div>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">
                    {analysis.processingStats.creditsUsed || 0}
                  </div>
                  <div className="text-xs text-green-600 mt-1">Credits Used</div>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-900 flex items-center justify-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {analysis.processingStats.totalProcessingTime 
                      ? Math.round(analysis.processingStats.totalProcessingTime / 1000) 
                      : 0}s
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">Processing Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <BadgeCheck className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-green-800">Good Practices</h4>
                <div className="mt-1 text-3xl font-semibold text-green-600">
                  {analysis.metrics?.goodPractices || 0}
                </div>
                <p className="mt-1 text-sm text-green-700">SEO elements that meet best practices</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-yellow-800">Warnings</h4>
                <div className="mt-1 text-3xl font-semibold text-yellow-600">
                  {analysis.metrics?.warnings || 0}
                </div>
                <p className="mt-1 text-sm text-yellow-700">Issues that should be improved</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-red-800">Critical Issues</h4>
                <div className="mt-1 text-3xl font-semibold text-red-600">
                  {analysis.metrics?.criticalIssues || 0}
                </div>
                <p className="mt-1 text-sm text-red-700">Urgent SEO problems to fix</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Summary */}
        <div className="mb-6">
          <h4 className="text-base font-medium text-gray-900 mb-3">Issues by Category</h4>
          <div className="space-y-3">
            {/* Title Tags */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-medium text-gray-700">Title Tags</div>
                <div className="text-sm text-gray-500">{getCategoryOptimizationPercentage('title')}% Optimized</div>
              </div>
              <Progress 
                value={getCategoryOptimizationPercentage('title')} 
                className="h-2.5"
              />
            </div>

            {/* Meta Descriptions */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-medium text-gray-700">Meta Descriptions</div>
                <div className="text-sm text-gray-500">{getCategoryOptimizationPercentage('meta-description')}% Optimized</div>
              </div>
              <Progress 
                value={getCategoryOptimizationPercentage('meta-description')} 
                className="h-2.5"
              />
            </div>

            {/* Headings */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-medium text-gray-700">Heading Structure</div>
                <div className="text-sm text-gray-500">{getCategoryOptimizationPercentage('headings')}% Optimized</div>
              </div>
              <Progress 
                value={getCategoryOptimizationPercentage('headings')} 
                className="h-2.5"
              />
            </div>

            {/* Images */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-medium text-gray-700">Image Optimization</div>
                <div className="text-sm text-gray-500">{getCategoryOptimizationPercentage('images')}% Optimized</div>
              </div>
              <Progress 
                value={getCategoryOptimizationPercentage('images')} 
                className="h-2.5"
              />
            </div>

            {/* Links */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-medium text-gray-700">Link Structure</div>
                <div className="text-sm text-gray-500">{getCategoryOptimizationPercentage('links')}% Optimized</div>
              </div>
              <Progress 
                value={getCategoryOptimizationPercentage('links')} 
                className="h-2.5"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Page Details Section */}
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Page-by-Page Analysis</h3>

      {analysis.pages.slice(0, displayedPages).map((page, index) => (
        <PageAnalysisCard 
          key={index} 
          page={page} 
          analysisId={analysis.id}
          onReanalyze={onPageReanalyze}
        />
      ))}

      {displayedPages < analysis.pages.length && (
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={loadMorePages}
          >
            Load More Pages ({analysis.pages.length - displayedPages} remaining)
          </Button>
        </div>
      )}
    </div>
    </>
  );
};

export default OverviewTab;