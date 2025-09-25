import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WebsiteAnalysis } from "@/lib/types";
import { Eye, Layout, Smartphone, Accessibility, Palette, Navigation, AlertCircle, CheckCircle, Info, FileText, Paintbrush } from "lucide-react";

interface DesignAnalysisTabProps {
  analysis: WebsiteAnalysis;
}

// Simple markdown formatter for basic formatting
const formatMarkdown = (text: string): string => {
  if (!text) return text;
  
  return text
    // Bold text: **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic text: *text* or _text_
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>')
    // Code: `text`
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br />');
};

const DesignAnalysisTab = ({ analysis }: DesignAnalysisTabProps) => {
  const designAnalysis = analysis.designAnalysis || analysis.enhancedInsights?.designAnalysis;

  if (!designAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Design Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Design Analysis Available</h3>
            <p className="text-gray-500 mb-4">
              Design analysis with screenshots is not available for this analysis. 
              This feature requires AI analysis to be enabled during the scan.
            </p>
            <p className="text-sm text-gray-400">
              Run a new analysis with AI enabled to get visual design recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Info className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'layout':
        return <Layout className="h-4 w-4" />;
      case 'navigation':
        return <Navigation className="h-4 w-4" />;
      case 'mobile_responsiveness':
        return <Smartphone className="h-4 w-4" />;
      case 'accessibility':
        return <Accessibility className="h-4 w-4" />;
      case 'branding':
      case 'visual_hierarchy':
        return <Palette className="h-4 w-4" />;
      case 'content_structure':
        return <FileText className="h-4 w-4" />;
      case 'brand_color_psychology':
        return <Paintbrush className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return "bg-red-100 text-red-800 border-red-200";
      case 'high':
        return "bg-orange-100 text-orange-800 border-orange-200";
      case 'medium':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'low':
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Design Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Overall Design Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-3xl font-bold ${getScoreColor(designAnalysis.overallScore)}`}>
                {designAnalysis.overallScore}/100
              </div>
              <div className="text-sm text-gray-600">
                {getScoreLabel(designAnalysis.overallScore)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">
                {designAnalysis.totalPagesAnalyzed} pages analyzed
              </div>
              <Progress value={designAnalysis.overallScore} className="w-24" />
            </div>
          </div>
          
          {designAnalysis.summary && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div 
                className="text-sm text-gray-700"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(designAnalysis.summary) }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Design Recommendations by Page */}
      {designAnalysis.pageAnalyses && designAnalysis.pageAnalyses.length > 0 && (
        <div className="space-y-4">
          {designAnalysis.pageAnalyses.map((pageAnalysis: any, index: number) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" data-testid={`page-title-${index}`}>
                      {pageAnalysis.screenshotData?.url || `Page ${index + 1}`}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Design Score:</span>
                        <span className={`font-semibold ${getScoreColor(pageAnalysis.overallScore)}`}>
                          {pageAnalysis.overallScore}/100
                        </span>
                      </div>
                      {pageAnalysis.screenshotData?.captureTimestamp && (
                        <div className="text-sm text-gray-400">
                          Screenshot: {new Date(pageAnalysis.screenshotData.captureTimestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Screenshot Display */}
                {pageAnalysis.screenshotData?.screenshotUrl && !pageAnalysis.screenshotData.error && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Page Screenshot
                    </h4>
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <ScrollArea className="h-96 w-full">
                        <div className="p-2">
                          <img 
                            src={pageAnalysis.screenshotData.screenshotUrl}
                            alt={`Screenshot of ${pageAnalysis.screenshotData.url}`}
                            className="w-full shadow-sm"
                            loading="lazy"
                            data-testid={`screenshot-${index}`}
                          />
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {pageAnalysis.screenshotData?.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Screenshot Error</span>
                    </div>
                    <p className="text-sm text-red-700">{pageAnalysis.screenshotData.error}</p>
                  </div>
                )}

                {/* Strengths */}
                {pageAnalysis.strengths && pageAnalysis.strengths.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      Design Strengths
                    </h4>
                    <ul className="space-y-1">
                      {pageAnalysis.strengths.slice(0, 3).map((strength: string, strengthIndex: number) => (
                        <li key={strengthIndex} className="text-sm text-gray-700 flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          <span dangerouslySetInnerHTML={{ __html: formatMarkdown(strength) }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Design Recommendations */}
                {pageAnalysis.recommendations && pageAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Layout className="h-4 w-4" />
                      Design Recommendations
                    </h4>
                    <div className="space-y-3">
                      {pageAnalysis.recommendations.slice(0, 4).map((rec: any, recIndex: number) => (
                        <div key={recIndex} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getSeverityIcon(rec.severity)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-medium text-gray-900" data-testid={`recommendation-title-${index}-${recIndex}`}>
                                  {rec.title}
                                </h5>
                                <Badge className={`text-xs ${getSeverityColor(rec.severity)}`}>
                                  {rec.severity}
                                </Badge>
                                <div className="flex items-center gap-1 text-gray-500">
                                  {getCategoryIcon(rec.category)}
                                  <span className="text-xs capitalize">
                                    {rec.category.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                              
                              <div 
                                className="text-sm text-gray-700 mb-2"
                                dangerouslySetInnerHTML={{ __html: formatMarkdown(rec.description) }}
                              />
                              
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>
                                  <span className="font-medium">Recommendation:</span> 
                                  <span 
                                    className="ml-1"
                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(rec.recommendation) }}
                                  />
                                </div>
                                <div>
                                  <span className="font-medium">Expected Impact:</span> 
                                  <span 
                                    className="ml-1"
                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(rec.expectedImpact) }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Page Summary */}
                {pageAnalysis.summary && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2 text-blue-900">Analysis Summary</h4>
                    <div 
                      className="text-sm text-blue-800"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(pageAnalysis.summary) }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {designAnalysis.error && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Design Analysis Error</h3>
              <p className="text-gray-500 mb-4">{designAnalysis.error}</p>
              <p className="text-sm text-gray-400">
                Please try running the analysis again or contact support if the issue persists.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DesignAnalysisTab;