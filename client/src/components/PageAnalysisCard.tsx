import { useState } from "react";
import { PageAnalysis, IssueType } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, AlertTriangle, Info, Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageAnalysisCardProps {
  page: PageAnalysis;
}

const PageAnalysisCard = ({ page }: PageAnalysisCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const getStatusColor = () => {
    if (page.issues.some(i => i.severity === 'critical')) return "bg-red-500";
    if (page.issues.some(i => i.severity === 'warning')) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    const criticalCount = page.issues.filter(i => i.severity === 'critical').length;
    const warningCount = page.issues.filter(i => i.severity === 'warning').length;
    
    if (criticalCount > 0) {
      return (
        <Badge variant="destructive">
          {criticalCount} critical
        </Badge>
      );
    } else if (warningCount > 0) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          {warningCount} warnings
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
          All good
        </Badge>
      );
    }
  };

  const renderSeverityIcon = (severity: IssueType) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <CardContent className="p-0">
        <div 
          className="border-b border-gray-200 p-4 cursor-pointer flex items-center justify-between"
          onClick={toggleExpand}
        >
          <div className="flex items-center">
            <div className={cn("w-2 h-2 rounded-full mr-3", getStatusColor())}></div>
            <h4 className="text-base font-medium text-gray-900">
              {page.pageName || page.url.split('/').pop() || 'Homepage'}
            </h4>
            <span className="ml-3 text-sm text-gray-500">{page.url}</span>
          </div>
          <div className="flex items-center">
            {getStatusText()}
            <div className="ml-2">
              {isExpanded ? 
                <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                <ChevronDown className="h-5 w-5 text-gray-400" />
              }
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Title</h5>
                  <p className="text-sm text-gray-900">{page.title || 'No title found'}</p>
                  <div className="mt-1 flex items-center">
                    {page.title ? (
                      page.title.length > 60 ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-xs text-yellow-700">
                            Title too long ({page.title.length} chars, recommended: 50-60)
                          </span>
                        </>
                      ) : page.title.length < 20 ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-xs text-yellow-700">
                            Title too short ({page.title.length} chars, recommended: 50-60)
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-xs text-green-700">
                            Good length ({page.title.length} chars)
                          </span>
                        </>
                      )
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500 mr-1" />
                        <span className="text-xs text-red-700">Missing title</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Meta Description</h5>
                  <p className="text-sm text-gray-900">{page.metaDescription || 'No meta description found'}</p>
                  <div className="mt-1 flex items-center">
                    {page.metaDescription ? (
                      page.metaDescription.length > 160 ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-xs text-yellow-700">
                            Description too long ({page.metaDescription.length} chars, recommended: 120-160)
                          </span>
                        </>
                      ) : page.metaDescription.length < 70 ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-xs text-yellow-700">
                            Description too short ({page.metaDescription.length} chars, recommended: 120-160)
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-xs text-green-700">
                            Good length ({page.metaDescription.length} chars)
                          </span>
                        </>
                      )
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500 mr-1" />
                        <span className="text-xs text-red-700">Missing meta description</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Headings</h5>
                  <div className="space-y-1">
                    {page.headings.length > 0 ? (
                      page.headings.slice(0, 3).map((heading, idx) => (
                        <div key={idx} className="flex items-center">
                          <span className="text-xs font-medium bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded mr-2">
                            H{heading.level}
                          </span>
                          <span className="text-sm text-gray-900 truncate">{heading.text}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-red-700">No headings found on page</div>
                    )}
                    {page.headings.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{page.headings.length - 3} more headings
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-3">AI Optimization Suggestions</h5>
              <div className="space-y-3">
                {page.suggestions.length > 0 ? (
                  page.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        {renderSeverityIcon(page.issues[idx]?.severity || 'info')}
                      </div>
                      <div className="ml-3">
                        <h6 className="text-sm font-medium text-gray-900">
                          {page.issues[idx]?.title || `Suggestion ${idx + 1}`}
                        </h6>
                        <p className="mt-1 text-sm text-gray-600">{suggestion}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-green-600">
                    No issues found. This page is well optimized!
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PageAnalysisCard;
