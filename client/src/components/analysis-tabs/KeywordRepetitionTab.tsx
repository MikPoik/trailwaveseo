import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertTriangle, Target, TrendingUp, Hash, RefreshCw } from "lucide-react";
import { WebsiteAnalysis } from "@/lib/types";

interface KeywordRepetitionTabProps {
  analysis: WebsiteAnalysis;
  onAnalysisUpdate: (updatedAnalysis: WebsiteAnalysis) => void;
}

const KeywordRepetitionTab = ({ analysis, onAnalysisUpdate }: KeywordRepetitionTabProps) => {
  const [isRunningKeywordAnalysis, setIsRunningKeywordAnalysis] = useState(false);
  const { toast } = useToast();

  const runKeywordRepetitionAnalysis = async () => {
    if (!analysis.id) {
      toast({
        title: "Analysis Required",
        description: "Please run an analysis first before checking for keyword repetition.",
        variant: "destructive"
      });
      return;
    }

    setIsRunningKeywordAnalysis(true);

    try {
      const response = await fetch(`/api/analysis/${analysis.id}/keyword-repetition`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to run keyword repetition analysis');
      }

      const result = await response.json();
      
      // Update the analysis with the keyword repetition results
      const updatedAnalysis = {
        ...analysis,
        keywordRepetitionAnalysis: result.keywordRepetitionAnalysis
      };
      onAnalysisUpdate(updatedAnalysis);

      toast({
        title: "Keyword Analysis Complete",
        description: "Keyword repetition analysis has been completed successfully."
      });
    } catch (error) {
      console.error('Error running keyword repetition analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to run keyword repetition analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRunningKeywordAnalysis(false);
    }
  };

  const getImpactLevelColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'text-red-600';
      case 'High': return 'text-orange-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (!analysis.keywordRepetitionAnalysis) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Hash className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keyword Repetition Analysis</h3>
            <p className="text-sm text-gray-500 mb-4">
              Analyze your website for keyword stuffing, over-optimization, and repetitive content patterns
            </p>
            <Button onClick={runKeywordRepetitionAnalysis} disabled={isRunningKeywordAnalysis}>
              {isRunningKeywordAnalysis ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Hash className="h-4 w-4 mr-2" />
                  Run Keyword Analysis (2 Credits)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const keywordData = analysis.keywordRepetitionAnalysis;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Keyword Repetition Analysis</h3>
              <p className="mt-1 text-sm text-gray-500">
                AI-powered analysis of keyword density and over-optimization
              </p>
            </div>
            <Button 
              onClick={runKeywordRepetitionAnalysis} 
              disabled={isRunningKeywordAnalysis}
              variant="outline"
              size="sm"
            >
              {isRunningKeywordAnalysis ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Rerunning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rerun Analysis
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Overall Keyword Health Score */}
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-blue-600" />
              <div>
                <h4 className="text-lg font-semibold text-blue-900">Overall Keyword Health</h4>
                <p className="text-sm text-blue-700">
                  {keywordData.overallKeywordHealth.issues} issues found
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {keywordData.overallKeywordHealth.score}/100
              </div>
              <p className="text-sm text-blue-700">Health Score</p>
            </div>
          </div>
          <Progress value={keywordData.overallKeywordHealth.score} className="h-3 mb-4" />
          {keywordData.overallKeywordHealth.recommendations.length > 0 && (
            <div className="space-y-2">
              {keywordData.overallKeywordHealth.recommendations.slice(0, 2).map((rec, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-blue-800">
                  <Lightbulb className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                  {rec}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Problematic Keywords</h4>
                <p className="text-lg font-semibold text-red-600">
                  {keywordData.topProblematicKeywords.length}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Over-optimized terms
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Hash className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Affected Pages</h4>
                <p className="text-lg font-semibold text-yellow-600">
                  {keywordData.readabilityImpact.affectedPages}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Need optimization
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="text-sm font-medium text-green-800">Opportunities</h4>
                <p className="text-lg font-semibold text-green-600">
                  {keywordData.keywordOpportunities.length}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Improvement areas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Problematic Keywords */}
        {keywordData.topProblematicKeywords.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Most Problematic Keywords ({keywordData.topProblematicKeywords.length})
            </h4>
            <div className="space-y-4">
              {keywordData.topProblematicKeywords.slice(0, 8).map((keyword, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h5 className="font-medium text-gray-900">"{keyword.keyword}"</h5>
                        <Badge className={`text-xs ${getImpactLevelColor(keyword.impactLevel)}`}>
                          {keyword.impactLevel} Impact
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Density: <strong className={getSeverityColor(keyword.impactLevel)}>{keyword.density}%</strong></span>
                        <span>Occurrences: <strong>{keyword.occurrences}</strong></span>
                        <span>Pages: <strong>{keyword.affectedPages.length}</strong></span>
                      </div>
                    </div>
                  </div>
                  
                  {keyword.improvementStrategy && (
                    <div className="bg-green-50 rounded p-3 mb-3">
                      <p className="text-xs font-medium text-green-700 mb-1">💡 AI Improvement Strategy:</p>
                      <p className="text-xs text-green-600">{keyword.improvementStrategy}</p>
                    </div>
                  )}

                  {keyword.alternatives && keyword.alternatives.length > 0 && (
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-xs font-medium text-blue-700 mb-2">🔄 Alternative Terms:</p>
                      <div className="flex flex-wrap gap-1">
                        {keyword.alternatives.slice(0, 4).map((alt, altIndex) => (
                          <Badge key={altIndex} variant="outline" className="text-xs text-blue-600 border-blue-200">
                            {alt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Site-wide Patterns */}
        {keywordData.siteWidePatterns.repetitiveCount > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Hash className="h-5 w-5 text-purple-600" />
              Site-wide Patterns
            </h4>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-sm text-purple-700">Repetitive Patterns</p>
                  <p className="text-lg font-semibold text-purple-600">{keywordData.siteWidePatterns.repetitiveCount}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-700">Total Analyzed</p>
                  <p className="text-lg font-semibold text-purple-600">{keywordData.siteWidePatterns.totalAnalyzed}</p>
                </div>
              </div>
              {keywordData.siteWidePatterns.examples.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-purple-700 mb-1">Examples:</p>
                  <div className="flex flex-wrap gap-1">
                    {keywordData.siteWidePatterns.examples.map((example, index) => (
                      <Badge key={index} variant="outline" className="text-xs text-purple-600 border-purple-200">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {keywordData.siteWidePatterns.recommendations.length > 0 && (
                <div className="space-y-1">
                  {keywordData.siteWidePatterns.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-purple-800">
                      <Lightbulb className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                      {rec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keyword Opportunities */}
        {keywordData.keywordOpportunities.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Keyword Opportunities
            </h4>
            <div className="space-y-3">
              {keywordData.keywordOpportunities.map((opportunity, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-800 mb-2">{opportunity.suggestion}</h5>
                  <p className="text-sm text-green-700 mb-2">
                    <strong>Benefit:</strong> {opportunity.benefit}
                  </p>
                  <p className="text-sm text-green-600">
                    <strong>How to implement:</strong> {opportunity.implementation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Readability Impact */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-gray-600" />
            Readability Impact
          </h4>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-sm text-gray-700">Affected Pages</p>
              <p className="text-lg font-semibold text-gray-600">{keywordData.readabilityImpact.affectedPages}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">Severity Level</p>
              <Badge className={`${getImpactLevelColor(keywordData.readabilityImpact.severityLevel)}`}>
                {keywordData.readabilityImpact.severityLevel}
              </Badge>
            </div>
          </div>
          {keywordData.readabilityImpact.improvementAreas.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Areas for Improvement:</p>
              <div className="flex flex-wrap gap-1">
                {keywordData.readabilityImpact.improvementAreas.map((area, index) => (
                  <Badge key={index} variant="outline" className="text-xs text-gray-600 border-gray-300">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
};

export default KeywordRepetitionTab;