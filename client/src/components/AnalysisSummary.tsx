import { useState, useEffect } from "react";
import { WebsiteAnalysis, PageAnalysis, ContentRepetitionAnalysis } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BadgeCheck, 
  AlertTriangle, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  FileText,
  Copy,
  ChevronRight,
  Info,
  ExternalLink
} from "lucide-react";
import PageAnalysisCard from "./PageAnalysisCard";
import CompetitorAnalysis from "./CompetitorAnalysis";
import { format } from "date-fns";
import { exportAnalysisCSV } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AnalysisSummaryProps {
  analysis: WebsiteAnalysis;
  onNewAnalysis: () => void;
}

const AnalysisSummary = ({ analysis, onNewAnalysis }: AnalysisSummaryProps) => {
  const [displayedPages, setDisplayedPages] = useState(10);
  const [isRunningContentDuplication, setIsRunningContentDuplication] = useState(false);
  const [updatedAnalysis, setUpdatedAnalysis] = useState(analysis);
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setUpdatedAnalysis(analysis);
  }, [analysis]);

  const handlePageReanalyze = (pageUrl: string, updatedPage: PageAnalysis) => {
    // Update the analysis with the reanalyzed page
    setUpdatedAnalysis(prev => ({
      ...prev,
      pages: prev.pages.map(page => 
        page.url === pageUrl ? updatedPage : page
      )
    }));

    toast({
      title: "Page Reanalyzed",
      description: `Successfully reanalyzed ${pageUrl}`,
    });
  };

  // If analysis has competitor data stored in the database, initialize it in the cache
  useEffect(() => {
    if (analysis.id && analysis.competitorAnalysis) {
      console.log('Found existing competitor analysis data:', analysis.competitorAnalysis);

      // Set the competitor analysis data in the query cache
      const cacheKey = [`competitor-analysis-${analysis.id || analysis.domain}`];
      queryClient.setQueryData(cacheKey, analysis.competitorAnalysis);
    }
  }, [analysis.id, analysis.competitorAnalysis, analysis.domain, queryClient]);

  const exportCSV = async () => {
    if (!analysis.id) {
      console.error('Analysis ID is undefined');
      toast({
        title: "Export Failed",
        description: "Analysis ID is missing. Unable to export CSV.",
        variant: "destructive"
      });
      return;
    }

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

      toast({
        title: "CSV Export",
        description: "Analysis exported as CSV successfully"
      });
    } catch (error) {
      console.error('Error exporting CSV:', error instanceof Error ? error.message : String(error));
      toast({
        title: "Export Failed",
        description: "Failed to export CSV. Please try again later.",
        variant: "destructive"
      });
    }
  };

  const exportPDF = async () => {
    if (!analysis.id) {
      console.error('Analysis ID is undefined');
      toast({
        title: "Export Failed",
        description: "Analysis ID is missing. Unable to export PDF.",
        variant: "destructive"
      });
      return;
    }

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

  const loadMorePages = () => {
    setDisplayedPages(prev => prev + 5);
  };

  const runContentDuplicationAnalysis = async () => {
    if (!analysis.id) {
      toast({
        title: "Error",
        description: "Analysis ID is missing. Unable to run content duplication analysis.",
        variant: "destructive"
      });
      return;
    }

    if (analysis.pages.length < 2) {
      toast({
        title: "Insufficient Data",
        description: "Content duplication analysis requires at least 2 pages to analyze.",
        variant: "destructive"
      });
      return;
    }

    setIsRunningContentDuplication(true);

    try {
      const response = await fetch(`/api/analysis/${analysis.id}/content-duplication`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run content duplication analysis');
      }

      const result = await response.json();
      console.log('Content duplication analysis result:', result);

      // Update the analysis data with the new content repetition analysis
      const updatedAnalysisData = {
        ...analysis,
        contentRepetitionAnalysis: result.contentRepetitionAnalysis
      };

      // Update the state and the query cache with the new data
      setUpdatedAnalysis(updatedAnalysisData);
      queryClient.setQueryData(['/api/analysis', analysis.id?.toString()], updatedAnalysisData);
      queryClient.invalidateQueries({ queryKey: ['/api/analysis', analysis.id?.toString()] });

      toast({
        title: "Content Duplication Analysis Complete",
        description: "Content duplication analysis has been completed successfully."
      });
    } catch (error) {
      console.error('Error running content duplication analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to run content duplication analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRunningContentDuplication(false);
    }
  };

  const getCategoryOptimizationPercentage = (category: string): number => {
    const allPagesWithIssues = updatedAnalysis.pages.filter(page => 
      page.issues.some(issue => issue.category === category)
    ).length;

    if (allPagesWithIssues === 0) return 100;

    const pagesWithCategory = updatedAnalysis.pages.length;
    return Math.round(((pagesWithCategory - allPagesWithIssues) / pagesWithCategory) * 100);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Analysis Overview</TabsTrigger>
          <TabsTrigger value="content-repetition">Content Duplication</TabsTrigger>
          <TabsTrigger value="competitor">Competitor Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">SEO Analysis Results</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Website: <span>{updatedAnalysis.domain}</span> • 
                    Analyzed <span>{updatedAnalysis.pages?.length || 0}</span> pages • 
                    <span>{format(new Date(updatedAnalysis.date), 'MMMM d, yyyy')}</span>
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
                        {updatedAnalysis.metrics.goodPractices}
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
                        {updatedAnalysis.metrics.warnings}
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
                        {updatedAnalysis.metrics.criticalIssues}
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
                      style={{
                        backgroundColor: getCategoryOptimizationPercentage('title') >= 70 
                          ? "#10b981" 
                          : getCategoryOptimizationPercentage('title') >= 50 
                            ? "#f59e0b" 
                            : "#ef4444"
                      }}
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
                      style={{
                        backgroundColor: getCategoryOptimizationPercentage('meta-description') >= 70 
                          ? "#10b981" 
                          : getCategoryOptimizationPercentage('meta-description') >= 50 
                            ? "#f59e0b" 
                            : "#ef4444"
                      }}
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
                      style={{
                        backgroundColor: getCategoryOptimizationPercentage('headings') >= 70 
                          ? "#10b981" 
                          : getCategoryOptimizationPercentage('headings') >= 50 
                            ? "#f59e0b" 
                            : "#ef4444"
                      }}
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
                      style={{
                        backgroundColor: getCategoryOptimizationPercentage('images') >= 70 
                          ? "#10b981" 
                          : getCategoryOptimizationPercentage('images') >= 50 
                            ? "#f59e0b" 
                            : "#ef4444"
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Page Analysis */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Page-by-Page Analysis</h3>

            {updatedAnalysis.pages.slice(0, displayedPages).map((page, index) => (
                <PageAnalysisCard 
                  key={index} 
                  page={page} 
                  analysisId={updatedAnalysis.id}
                  onReanalyze={handlePageReanalyze}
                />
              ))}

            {displayedPages < updatedAnalysis.pages.length && (
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
        </TabsContent>

        <TabsContent value="content-repetition">
          {updatedAnalysis.contentRepetitionAnalysis && (
            updatedAnalysis.contentRepetitionAnalysis.titleRepetition?.totalCount > 0 ||
            updatedAnalysis.contentRepetitionAnalysis.descriptionRepetition?.totalCount > 0 ||
            updatedAnalysis.contentRepetitionAnalysis.headingRepetition?.totalCount > 0 ||
            (updatedAnalysis.contentRepetitionAnalysis.overallRecommendations && updatedAnalysis.contentRepetitionAnalysis.overallRecommendations.length > 0)
          ) ? (
            <Card>
              <CardContent className="pt-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Content Duplication Analysis</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Analysis of repeated or similar content across your website
                  </p>
                </div>

                {/* Summary statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {/* Title repetition */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Copy className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-blue-800">Title Repetition</h4>
                        <div className="mt-1 text-3xl font-semibold text-blue-600">
                          {updatedAnalysis.contentRepetitionAnalysis.titleRepetition.repetitiveCount}/{updatedAnalysis.contentRepetitionAnalysis.titleRepetition.totalCount}
                        </div>
                        <p className="mt-1 text-sm text-blue-700">
                          {Math.round((updatedAnalysis.contentRepetitionAnalysis.titleRepetition.repetitiveCount / 
                          Math.max(1, updatedAnalysis.contentRepetitionAnalysis.titleRepetition.totalCount)) * 100)}% of titles have duplication issues
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description repetition */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Copy className="h-6 w-6 text-purple-500" />
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-purple-800">Meta Description Repetition</h4>
                        <div className="mt-1 text-3xl font-semibold text-purple-600">
                          {updatedAnalysis.contentRepetitionAnalysis.descriptionRepetition.repetitiveCount}/{updatedAnalysis.contentRepetitionAnalysis.descriptionRepetition.totalCount}
                        </div>
                        <p className="mt-1 text-sm text-purple-700">
                          {Math.round((updatedAnalysis.contentRepetitionAnalysis.descriptionRepetition.repetitiveCount / 
                          Math.max(1, updatedAnalysis.contentRepetitionAnalysis.descriptionRepetition.totalCount)) * 100)}% of descriptions have duplication issues
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Heading repetition */}
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Copy className="h-6 w-6 text-teal-500" />
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-teal-800">Heading Repetition</h4>
                        <div className="mt-1 text-3xl font-semibold text-teal-600">
                          {updatedAnalysis.contentRepetitionAnalysis.headingRepetition.repetitiveCount}/{updatedAnalysis.contentRepetitionAnalysis.headingRepetition.totalCount}
                        </div>
                        <p className="mt-1 text-sm text-teal-700">
                          {Math.round((updatedAnalysis.contentRepetitionAnalysis.headingRepetition.repetitiveCount / 
                          Math.max(1, updatedAnalysis.contentRepetitionAnalysis.headingRepetition.totalCount)) * 100)}% of headings have duplication issues
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Paragraph repetition */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Copy className="h-6 w-6 text-orange-500" />
                      </div>
                      <div className="ml-4">
                        <h4 className="text-sm font-medium text-orange-800">Paragraph Repetition</h4>
                        <div className="mt-1 text-3xl font-semibold text-orange-600">
                          {updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition?.repetitiveCount || 0}/{updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition?.totalCount || 0}
                        </div>
                        <p className="mt-1 text-sm text-orange-700">
                          {updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition?.totalCount > 0 ? 
                            Math.round((updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition.repetitiveCount / 
                            Math.max(1, updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition.totalCount)) * 100) : 0}% of paragraphs have duplication issues
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed analysis sections */}
                <div className="space-y-6">
                  {/* Title repetition section */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-base font-medium text-gray-900 flex items-center mb-3">
                      <span className="bg-blue-100 text-blue-800 p-1 rounded-md mr-2">
                        <Copy className="h-5 w-5" />
                      </span>
                      Title Repetition Analysis
                    </h4>

                    {updatedAnalysis.contentRepetitionAnalysis.titleRepetition.examples.length > 0 ? (
                      <>
                        <p className="text-sm text-gray-600 mb-3">Examples of duplicate or similar titles:</p>
                        <ul className="space-y-1 mb-4">
                          {updatedAnalysis.contentRepetitionAnalysis.titleRepetition.examples.map((example, index) => (
                            <li key={index} className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex items-start">
                              <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600 mb-3">No examples of duplicate titles found.</p>
                    )}

                    <h5 className="text-sm font-medium text-gray-800 mb-2">Recommendations:</h5>
                    <ul className="space-y-1">
                      {updatedAnalysis.contentRepetitionAnalysis.titleRepetition.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <div className="bg-green-100 rounded-full p-1 text-green-700 mr-2 flex-shrink-0">
                            <BadgeCheck className="h-3.5 w-3.5" />
                          </div>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Meta description repetition section */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-base font-medium text-gray-900 flex items-center mb-3">
                      <span className="bg-purple-100 text-purple-800 p-1 rounded-md mr-2">
                        <Copy className="h-5 w-5" />
                      </span>
                      Meta Description Repetition Analysis
                    </h4>

                    {updatedAnalysis.contentRepetitionAnalysis.descriptionRepetition.examples.length > 0 ? (
                      <>
                        <p className="text-sm text-gray-600 mb-3">Examples of duplicate or similar meta descriptions:</p>
                        <ul className="space-y-1 mb-4">
                          {updatedAnalysis.contentRepetitionAnalysis.descriptionRepetition.examples.map((example, index) => (
                            <li key={index} className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex items-start">
                              <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600 mb-3">No examples of duplicate meta descriptions found.</p>
                    )}

                    <h5 className="text-sm font-medium text-gray-800 mb-2">Recommendations:</h5>
                    <ul className="space-y-1">
                      {updatedAnalysis.contentRepetitionAnalysis.descriptionRepetition.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <div className="bg-green-100 rounded-full p-1 text-green-700 mr-2 flex-shrink-0">
                            <BadgeCheck className="h-3.5 w-3.5" />
                          </div>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* H1 Heading repetition section */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-base font-medium text-gray-900 flex items-center mb-3">
                      <span className="bg-teal-100 text-teal-800 p-1 rounded-md mr-2">
                        <Copy className="h-5 w-5" />
                      </span>
                      Heading Repetition Analysis (All Levels)
                    </h4>

                    {updatedAnalysis.contentRepetitionAnalysis.headingRepetition.examples.length > 0 ? (
                      <>
                        <p className="text-sm text-gray-600 mb-3">Examples of duplicate or similar headings (H1-H6):</p>
                        <ul className="space-y-1 mb-4">
                          {updatedAnalysis.contentRepetitionAnalysis.headingRepetition.examples.map((example, index) => (
                            <li key={index} className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex items-start">
                              <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600 mb-3">No examples of duplicate headings found.</p>
                    )}

                    <h5 className="text-sm font-medium text-gray-800 mb-2">Recommendations:</h5>
                    <ul className="space-y-1">
                      {updatedAnalysis.contentRepetitionAnalysis.headingRepetition.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start">
                          <div className="bg-green-100 rounded-full p-1 text-green-700 mr-2 flex-shrink-0">
                            <BadgeCheck className="h-3.5 w-3.5" />
                          </div>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Paragraph repetition section */}
                  {updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-medium text-gray-900 flex items-center mb-3">
                        <span className="bg-orange-100 text-orange-800 p-1 rounded-md mr-2">
                          <Copy className="h-5 w-5" />
                        </span>
                        Paragraph Content Repetition
                      </h4>

                      {updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition.examples.length > 0 ? (
                        <>
                          <p className="text-sm text-gray-600 mb-3">Examples of duplicate or similar paragraph content:</p>
                          <ul className="space-y-1 mb-4">
                            {updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition.examples.map((example, index) => (
                              <li key={index} className="text-sm text-gray-800 bg-gray-50 p-2 rounded flex items-start">
                                <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5 mr-1 flex-shrink-0" />
                                <span className="break-words">{example}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-gray-600 mb-3">No examples of duplicate paragraph content found.</p>
                      )}

                      <h5 className="text-sm font-medium text-gray-800 mb-2">Recommendations:</h5>
                      <ul className="space-y-1">
                        {updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start">
                            <div className="bg-green-100 rounded-full p-1 text-green-700 mr-2 flex-shrink-0">
                              <BadgeCheck className="h-3.5 w-3.5" />
                            </div>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Enhanced URL Attribution Section */}
                  {(updatedAnalysis.contentRepetitionAnalysis.titleRepetition.duplicateGroups?.length > 0 ||
                    updatedAnalysis.contentRepetitionAnalysis.descriptionRepetition.duplicateGroups?.length > 0 ||
                    updatedAnalysis.contentRepetitionAnalysis.headingRepetition.duplicateGroups?.length > 0 ||
                    updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition?.duplicateGroups?.length > 0) && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                      <h4 className="text-base font-medium text-gray-900 flex items-center mb-4">
                        <span className="bg-blue-100 text-blue-800 p-1 rounded-md mr-2">
                          <ExternalLink className="h-5 w-5" />
                        </span>
                        Duplicate Content Attribution
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">Specific pages containing duplicate content with similarity scores</p>

                      <div className="space-y-4">
                        {/* Title duplicate groups */}
                        {updatedAnalysis.contentRepetitionAnalysis.titleRepetition.duplicateGroups?.map((group, index) => (
                          <div key={`title-${index}`} className="bg-white border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="text-sm font-medium text-blue-800">Duplicate Title</h5>
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                {group.similarityScore}% similar
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 mb-2 font-medium">\"{group.content}\"</p>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Found on {group.urls.length} pages:</span>
                              <ul className="mt-1 space-y-1">
                                {group.urls.map((url, urlIndex) => (
                                  <li key={urlIndex} className="flex items-center">
                                    <ChevronRight className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
                                    <span className="truncate">{url}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )) || null}

                        {/* Description duplicate groups */}
                        {updatedAnalysis.contentRepetitionAnalysis.descriptionRepetition.duplicateGroups?.map((group, index) => (
                          <div key={`desc-${index}`} className="bg-white border border-purple-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="text-sm font-medium text-purple-800">Duplicate Meta Description</h5>
                              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                {group.similarityScore}% similar
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 mb-2 font-medium">\"{group.content}\"</p>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Found on {group.urls.length} pages:</span>
                              <ul className="mt-1 space-y-1">
                                {group.urls.map((url, urlIndex) => (
                                  <li key={urlIndex} className="flex items-center">
                                    <ChevronRight className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
                                    <span className="truncate">{url}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )) || null}

                        {/* Heading duplicate groups */}
                        {updatedAnalysis.contentRepetitionAnalysis.headingRepetition.duplicateGroups?.map((group, index) => (
                          <div key={`heading-${index}`} className="bg-white border border-teal-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="text-sm font-medium text-teal-800">Duplicate Heading</h5>
                              <span className="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full">
                                {group.similarityScore}% similar
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 mb-2 font-medium">\"{group.content}\"</p>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Found on {group.urls.length} pages:</span>
                              <ul className="mt-1 space-y-1">
                                {group.urls.map((url, urlIndex) => (
                                  <li key={urlIndex} className="flex items-center">
                                    <ChevronRight className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
                                    <span className="truncate">{url}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )) || null}

                        {/* Paragraph duplicate groups */}
                        {updatedAnalysis.contentRepetitionAnalysis.paragraphRepetition?.duplicateGroups?.map((group, index) => (
                          <div key={`paragraph-${index}`} className="bg-white border border-orange-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="text-sm font-medium text-orange-800">Duplicate Paragraph Content</h5>
                              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                                {group.similarityScore}% similar
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 mb-2 font-medium break-words">\"{group.content.substring(0, 150)}{group.content.length > 150 ? '...' : ''}\"</p>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Found on {group.urls.length} pages:</span>
                              <ul className="mt-1 space-y-1">
                                {group.urls.map((url, urlIndex) => (
                                  <li key={urlIndex} className="flex items-center">
                                    <ChevronRight className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
                                    <span className="truncate">{url}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )) || null}
                      </div>
                    </div>
                  )}

                  {/* Overall recommendations */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-base font-medium text-gray-900 flex items-center mb-3">
                      <span className="bg-amber-100 text-amber-800 p-1 rounded-md mr-2">
                        <Info className="h-5 w-5" />
                      </span>
                      Overall Content Recommendations
                    </h4>

                    <ul className="space-y-2">
                      {updatedAnalysis.contentRepetitionAnalysis.overallRecommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 bg-white p-3 rounded-md border border-gray-100 flex items-start">
                          <div className="bg-amber-100 rounded-full p-1 text-amber-700 mr-2 flex-shrink-0">
                            <BadgeCheck className="h-3.5 w-3.5" />
                          </div>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Copy className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Content Duplication Analysis</h3>
                  <p className="text-gray-500 max-w-md mb-6">
                    Run an analysis to detect duplicate or similar content across your website's titles, meta descriptions, headings, and paragraph content.
                  </p>

                  {updatedAnalysis.pages.length < 2 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left w-full max-w-md">
                      <h4 className="text-sm font-medium text-amber-800 mb-2">Requirements:</h4>
                      <ul className="text-xs text-amber-700 list-disc pl-4 space-y-1">
                        <li>Pages analyzed: {updatedAnalysis.pages.length} (minimum 2 required)</li>
                        <li>AI analysis must be enabled in settings</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left w-full max-w-md">
                      <h4 className="text-sm font-medium text-green-800 mb-2">Ready to analyze:</h4>
                      <ul className="text-xs text-green-700 list-disc pl-4 space-y-1">
                        <li>Pages available: {updatedAnalysis.pages.length}</li>
                        <li>Analysis will check for duplicate titles, descriptions, and headings</li>
                      </ul>
                    </div>
                  )}

                  <Button 
                    onClick={runContentDuplicationAnalysis} 
                    disabled={isRunningContentDuplication || updatedAnalysis.pages.length < 2}
                    className="mb-4"
                  >
                    {isRunningContentDuplication ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running Analysis...
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Run Content Duplication Analysis
                      </>
                    )}
                  </Button>

                  {updatedAnalysis.pages.length < 2 && (
                    <Button variant="outline" onClick={onNewAnalysis}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Run New Analysis with More Pages
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="competitor">
          <CompetitorAnalysis mainAnalysis={updatedAnalysis} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalysisSummary;