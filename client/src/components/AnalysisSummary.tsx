import { useState } from "react";
import { WebsiteAnalysis, PageAnalysis } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BadgeCheck, AlertTriangle, AlertCircle, Download, RefreshCw } from "lucide-react";
import PageAnalysisCard from "./PageAnalysisCard";
import { format } from "date-fns";
import { exportAnalysisCSV } from "@/lib/api";

interface AnalysisSummaryProps {
  analysis: WebsiteAnalysis;
  onNewAnalysis: () => void;
}

const AnalysisSummary = ({ analysis, onNewAnalysis }: AnalysisSummaryProps) => {
  const [displayedPages, setDisplayedPages] = useState(5);
  
  const exportCSV = async () => {
    if (!analysis.id) {
      console.error('Analysis ID is undefined');
      alert('Analysis ID is missing. Unable to export CSV.');
      return;
    }

  const exportPDF = async () => {
    try {
      const response = await fetch(`/api/analysis/${analysis.id}/export/pdf`);
      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a link to download the blob
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `seo-analysis-${analysis.domain}.html`;
      
      // Append the link to the body
      document.body.appendChild(a);
      
      // Click the link
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Export",
        description: "Analysis exported as PDF successfully"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export PDF",
        variant: "destructive"
      });
    }
  };

    
    try {
      // Use the api helper to get the CSV blob
      const blob = await exportAnalysisCSV(analysis.id);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `seo-analysis-${analysis.domain}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      
      // Append to document and make it invisible
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Trigger the download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error instanceof Error ? error.message : String(error));
      alert('Failed to export CSV. Please try again later.');
    }
  };
  
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
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">SEO Analysis Results</h3>
              <p className="mt-1 text-sm text-gray-500">
                Website: <span>{analysis.domain}</span> • 
                Analyzed <span>{analysis.pages.length}</span> pages • 
                <span>{format(new Date(analysis.date), 'MMMM d, yyyy')}</span>
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button 
                variant="outline" 
                onClick={exportCSV}
              >
                <Download className="h-5 w-5 mr-2" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                onClick={exportPDF}
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
                    {analysis.metrics.goodPractices}
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
                    {analysis.metrics.warnings}
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
                    {analysis.metrics.criticalIssues}
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
              {/* Category Progress Bars */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm font-medium text-gray-700">Title Tags</div>
                  <div className="text-sm text-gray-500">{getCategoryOptimizationPercentage('title')}% Optimized</div>
                </div>
                <Progress 
                  value={getCategoryOptimizationPercentage('title')} 
                  className="h-2.5"
                  indicatorClassName={
                    getCategoryOptimizationPercentage('title') >= 70 
                      ? "bg-green-500" 
                      : getCategoryOptimizationPercentage('title') >= 50 
                        ? "bg-yellow-500" 
                        : "bg-red-500"
                  }
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm font-medium text-gray-700">Meta Descriptions</div>
                  <div className="text-sm text-gray-500">{getCategoryOptimizationPercentage('meta-description')}% Optimized</div>
                </div>
                <Progress 
                  value={getCategoryOptimizationPercentage('meta-description')} 
                  className="h-2.5"
                  indicatorClassName={
                    getCategoryOptimizationPercentage('meta-description') >= 70 
                      ? "bg-green-500" 
                      : getCategoryOptimizationPercentage('meta-description') >= 50 
                        ? "bg-yellow-500" 
                        : "bg-red-500"
                  }
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm font-medium text-gray-700">Headings Structure</div>
                  <div className="text-sm text-gray-500">{getCategoryOptimizationPercentage('headings')}% Optimized</div>
                </div>
                <Progress 
                  value={getCategoryOptimizationPercentage('headings')} 
                  className="h-2.5"
                  indicatorClassName={
                    getCategoryOptimizationPercentage('headings') >= 70 
                      ? "bg-green-500" 
                      : getCategoryOptimizationPercentage('headings') >= 50 
                        ? "bg-yellow-500" 
                        : "bg-red-500"
                  }
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <div className="text-sm font-medium text-gray-700">Image Alt Text</div>
                  <div className="text-sm text-gray-500">{getCategoryOptimizationPercentage('images')}% Optimized</div>
                </div>
                <Progress 
                  value={getCategoryOptimizationPercentage('images')} 
                  className="h-2.5"
                  indicatorClassName={
                    getCategoryOptimizationPercentage('images') >= 70 
                      ? "bg-green-500" 
                      : getCategoryOptimizationPercentage('images') >= 50 
                        ? "bg-yellow-500" 
                        : "bg-red-500"
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Page Analysis */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Page-by-Page Analysis</h3>
        
        {analysis.pages.slice(0, displayedPages).map((page, index) => (
          <PageAnalysisCard key={index} page={page} />
        ))}
        
        {displayedPages < analysis.pages.length && (
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              onClick={loadMorePages}
            >
              Load More Pages
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisSummary;
