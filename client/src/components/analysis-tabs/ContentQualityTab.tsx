import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb,
  AlertTriangle, 
  Target,
  TrendingUp,
  Hash,
  Copy,
  FileText,
  ExternalLink,
  AlignLeft,
  CheckCircle,
  XCircle
} from "lucide-react";
import { WebsiteAnalysis } from "@/lib/types";

interface ContentQualityTabProps {
  analysis: WebsiteAnalysis;
}

const ContentQualityTab = ({ analysis }: ContentQualityTabProps) => {
  
  // Get unified content quality analysis from enhanced insights
  const contentQualityAnalysis = analysis.enhancedInsights?.contentQualityAnalysis;

  if (!contentQualityAnalysis) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Content Quality Analysis</h3>
            <p className="text-sm text-gray-500 mb-4">
              Unified analysis of content duplication and keyword optimization is now part of the main analysis pipeline.
            </p>
            <p className="text-xs text-gray-400">
              Content quality analysis runs automatically with each website scan.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract analysis data - handle both old and new formats
  const analysisData = contentQualityAnalysis as any;

  const getImpactLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">Unified Content Quality Analysis</h3>
          <p className="mt-1 text-sm text-gray-500">
            AI-powered analysis combining content duplication detection and keyword optimization
          </p>
        </div>

        {/* Overall Health Score */}
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-blue-600" />
              <div>
                <h4 className="text-lg font-semibold text-blue-900">Overall Content Health</h4>
                <p className="text-sm text-blue-700">
                  Content quality analysis score
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {analysisData.overallHealth?.combinedScore || analysisData.overallScore || 0}/100
              </div>
              <p className="text-sm text-blue-700">Health Score</p>
            </div>
          </div>
          <Progress value={analysisData.overallHealth?.combinedScore || analysisData.overallScore || 0} className="h-3 mb-4" />
          
          {/* Health Summary */}
          {analysisData.overallHealth && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Duplication Score: <strong>{analysisData.overallHealth.duplicationScore || 0}/100</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  Keyword Score: <strong>{analysisData.overallHealth.keywordScore || 0}/100</strong>
                </span>
              </div>
            </div>
          )}

          {/* Key Recommendations */}
          {analysisData.keyRecommendations?.length > 0 && (
            <div className="space-y-2">
              {analysisData.keyRecommendations.slice(0, 3).map((recommendation: string, index: number) => (
                <div key={index} className="flex items-start gap-2 text-sm text-blue-800">
                  <Lightbulb className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                  {recommendation}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Critical Issues</h4>
                <p className="text-lg font-semibold text-red-600">
                  {(analysisData.duplicationPatterns?.critical?.length || 0) + 
                   (analysisData.keywordIssues?.problematicKeywords?.filter((k: any) => k.severity === 'critical')?.length || 0)}
                </p>
                <p className="text-xs text-red-600 mt-1">Need immediate attention</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Copy className="h-5 w-5 text-orange-600" />
              <div>
                <h4 className="text-sm font-medium text-orange-800">Content Issues</h4>
                <p className="text-lg font-semibold text-orange-600">
                  {analysisData.findings?.filter((f: any) => f.category.includes('Content')).length || 0}
                </p>
                <p className="text-xs text-orange-600 mt-1">Areas identified</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Hash className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Findings</h4>
                <p className="text-lg font-semibold text-yellow-600">
                  {analysisData.findings?.length || 0}
                </p>
                <p className="text-xs text-yellow-600 mt-1">Total issues found</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="text-sm font-medium text-green-800">Opportunities</h4>
                <p className="text-lg font-semibold text-green-600">
                  {analysisData.findings?.reduce((acc: number, f: any) => acc + (f.recommendations?.length || 0), 0) || 0}
                </p>
                <p className="text-xs text-green-600 mt-1">Recommendations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Quality Findings */}
        {analysisData.findings?.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Content Quality Findings
            </h4>
            
            <div className="space-y-4">
              {analysisData.findings.map((finding: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h5 className="font-medium text-gray-900">{finding.category}</h5>
                        <Badge className={`text-xs ${finding.score >= 80 ? 'bg-green-100 text-green-800' : finding.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          Score: {finding.score}/100
                        </Badge>
                      </div>
                      {finding.issues?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">Issues Found:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {finding.issues.slice(0, 3).map((issue: string, issueIndex: number) => (
                              <li key={issueIndex} className="flex items-start gap-2">
                                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                {issue}
                              </li>
                            ))}
                            {finding.issues.length > 3 && (
                              <li className="text-gray-500">... and {finding.issues.length - 3} more issues</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {finding.recommendations?.length > 0 && (
                        <div className="bg-green-50 rounded p-3">
                          <p className="text-sm font-medium text-green-700 mb-2">💡 Recommendations:</p>
                          <ul className="text-sm text-green-600 space-y-1">
                            {finding.recommendations.slice(0, 3).map((rec: string, recIndex: number) => (
                              <li key={recIndex} className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                            {finding.recommendations.length > 3 && (
                              <li className="text-green-500">... and {finding.recommendations.length - 3} more recommendations</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <h5 className="font-medium text-gray-900">Analysis Complete</h5>
          </div>
          <p className="text-sm text-gray-600">
            This unified content quality analysis combines duplication detection and keyword optimization 
            into a single efficient process, providing comprehensive insights without additional credits.
          </p>
          {analysisData.processedAt && (
            <p className="text-xs text-gray-500 mt-2">
              Processed: {new Date(analysisData.processedAt).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentQualityTab;