import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Info, 
  AlertTriangle, 
  XCircle, 
  Target, 
  Building2, 
  Users,
  TrendingUp,
  Lightbulb,
  FileText
} from "lucide-react";
import { WebsiteAnalysis, PageAnalysis } from "@/lib/types";

interface ContextSidebarProps {
  analysis: WebsiteAnalysis;
  pageData?: PageAnalysis;
  pageUrl: string;
}

const ContextSidebar = ({ analysis, pageData, pageUrl }: ContextSidebarProps) => {
  const criticalIssues = pageData?.issues?.filter(issue => issue.severity === 'critical') || [];
  const warningIssues = pageData?.issues?.filter(issue => issue.severity === 'warning') || [];
  const suggestions = pageData?.suggestions || [];

  return (
    <div className="space-y-4">
      {/* Page Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <FileText className="h-4 w-4 mr-2 text-blue-600" />
            Page Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Title</p>
            <p className="text-sm text-gray-900">{pageData?.title || 'No title'}</p>
          </div>
          
          {pageData?.metaDescription && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Meta Description</p>
              <p className="text-sm text-gray-700">{pageData.metaDescription}</p>
            </div>
          )}
          
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Word Count</p>
            <p className="text-sm text-gray-900">{pageData?.contentMetrics?.wordCount || 0} words</p>
          </div>
        </CardContent>
      </Card>

      {/* Business Context */}
      {analysis.siteOverview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Building2 className="h-4 w-4 mr-2 text-green-600" />
              Business Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center text-xs">
                <TrendingUp className="h-3 w-3 mr-2 text-blue-500" />
                <span className="font-medium">Industry:</span>
                <span className="ml-1 text-gray-700">{analysis.siteOverview.industry || 'Unknown'}</span>
              </div>
              
              <div className="flex items-center text-xs">
                <Users className="h-3 w-3 mr-2 text-purple-500" />
                <span className="font-medium">Target:</span>
                <span className="ml-1 text-gray-700">{analysis.siteOverview.targetAudience || 'Unknown'}</span>
              </div>
              
              {analysis.siteOverview.mainServices && analysis.siteOverview.mainServices.length > 0 && (
                <div className="text-xs">
                  <div className="flex items-center mb-1">
                    <Target className="h-3 w-3 mr-2 text-orange-500" />
                    <span className="font-medium">Services:</span>
                  </div>
                  <div className="ml-5 space-y-1">
                    {analysis.siteOverview.mainServices.slice(0, 3).map((service, index) => (
                      <Badge key={index} variant="outline" className="text-xs mr-1 mb-1">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEO Issues */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600" />
            SEO Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-40">
            <div className="space-y-2">
              {criticalIssues.map((issue, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-red-50 rounded-md">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-red-800">{issue.title}</p>
                    <p className="text-xs text-red-600 mt-1">{issue.description}</p>
                  </div>
                </div>
              ))}
              
              {warningIssues.map((issue, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-50 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-yellow-800">{issue.title}</p>
                    <p className="text-xs text-yellow-600 mt-1">{issue.description}</p>
                  </div>
                </div>
              ))}
              
              {criticalIssues.length === 0 && warningIssues.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500">No issues found for this page</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Lightbulb className="h-4 w-4 mr-2 text-blue-600" />
              AI Suggestions ({suggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-md">
                    <p className="text-xs font-medium text-blue-800 mb-1">
                      Suggestion #{index + 1}
                    </p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      {suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Additional Analysis Data */}
      {(analysis.contentRepetitionAnalysis || analysis.competitorAnalysis) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Info className="h-4 w-4 mr-2 text-gray-600" />
              Additional Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.contentRepetitionAnalysis && (
              <div className="text-xs">
                <Badge variant="outline" className="text-xs">
                  Content Patterns Available
                </Badge>
              </div>
            )}
            
            {analysis.competitorAnalysis && (
              <div className="text-xs">
                <Badge variant="outline" className="text-xs">
                  Competitor Data Available
                </Badge>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              Mention these in your chat for more detailed insights
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContextSidebar;