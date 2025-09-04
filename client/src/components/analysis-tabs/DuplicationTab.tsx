import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw,
  Copy,
  FileText,
  Hash,
  Lightbulb,
  ExternalLink
} from "lucide-react";
import { WebsiteAnalysis } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface DuplicationTabProps {
  analysis: WebsiteAnalysis;
  onAnalysisUpdate: (updatedAnalysis: WebsiteAnalysis) => void;
}

const DuplicationTab = ({ analysis, onAnalysisUpdate }: DuplicationTabProps) => {
  const [isRunningContentDuplication, setIsRunningContentDuplication] = useState(false);
  const { toast } = useToast();

  const runContentDuplicationAnalysis = async () => {
    if (!analysis.id) {
      toast({
        title: "Analysis Required",
        description: "Please run an analysis first before checking for content duplication.",
        variant: "destructive"
      });
      return;
    }

    setIsRunningContentDuplication(true);

    try {
      const response = await fetch(`/api/analysis/${analysis.id}/content-duplication`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to run content duplication analysis');
      }

      const updatedAnalysis = await response.json();
      onAnalysisUpdate(updatedAnalysis);

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

  if (!analysis.contentRepetitionAnalysis || 
      !analysis.contentRepetitionAnalysis.titleRepetition || 
      !analysis.contentRepetitionAnalysis.descriptionRepetition) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Copy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Content Duplication Analysis</h3>
            <p className="text-sm text-gray-500 mb-4">
              Analyze your website for duplicate titles, descriptions, and content
            </p>
            <Button onClick={runContentDuplicationAnalysis} disabled={isRunningContentDuplication}>
              {isRunningContentDuplication ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Run Content Duplication Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Content Duplication Analysis</h3>
              <p className="mt-1 text-sm text-gray-500">
                AI-powered analysis of duplicate content across your website
              </p>
            </div>
            <Button 
              onClick={runContentDuplicationAnalysis} 
              disabled={isRunningContentDuplication}
              variant="outline"
              size="sm"
            >
              {isRunningContentDuplication ? (
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

        {/* Summary Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Copy className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Page Titles</h4>
                <p className="text-lg font-semibold text-blue-600">
                  {analysis.contentRepetitionAnalysis.titleRepetition.repetitiveCount} duplicates
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {analysis.contentRepetitionAnalysis.titleRepetition.totalCount} analyzed
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <h4 className="text-sm font-medium text-purple-800">Meta Descriptions</h4>
                <p className="text-lg font-semibold text-purple-600">
                  {analysis.contentRepetitionAnalysis.descriptionRepetition.repetitiveCount} duplicates
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {analysis.contentRepetitionAnalysis.descriptionRepetition.totalCount} analyzed
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Hash className="h-5 w-5 text-teal-600" />
              <div>
                <h4 className="text-sm font-medium text-teal-800">Headings</h4>
                <p className="text-lg font-semibold text-teal-600">
                  {analysis.contentRepetitionAnalysis.headingRepetition.repetitiveCount} duplicates
                </p>
                <p className="text-xs text-teal-600 mt-1">
                  {analysis.contentRepetitionAnalysis.headingRepetition.totalCount} analyzed
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-orange-600" />
              <div>
                <h4 className="text-sm font-medium text-orange-800">Paragraphs</h4>
                <p className="text-lg font-semibold text-orange-600">
                  {analysis.contentRepetitionAnalysis.paragraphRepetition.repetitiveCount} duplicates
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {analysis.contentRepetitionAnalysis.paragraphRepetition.totalCount} analyzed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Key Insights */}
        {analysis.contentRepetitionAnalysis.overallRecommendations?.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-indigo-600" />
              <h4 className="font-semibold text-indigo-900">AI Key Insights</h4>
            </div>
            <div className="space-y-3">
              {analysis.contentRepetitionAnalysis.overallRecommendations.slice(0, 3).map((recommendation, index) => {
                const recommendationText = typeof recommendation === 'string' 
                  ? recommendation 
                  : ((recommendation as any)?.text || (recommendation as any)?.recommendation || 'Improve content uniqueness across pages');
                
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-indigo-800 leading-relaxed">{recommendationText}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Duplicate Content - Title Duplicates */}
        <div className="space-y-4">
          {analysis.contentRepetitionAnalysis.titleRepetition.duplicateGroups.length > 0 && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <Copy className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">
                  Duplicate Page Titles ({analysis.contentRepetitionAnalysis.titleRepetition.duplicateGroups.length})
                </h4>
              </div>
              <div className="space-y-3">
                {analysis.contentRepetitionAnalysis.titleRepetition.duplicateGroups.map((group, index) => {
                  const duplicateContent = group.content || 'Duplicate content detected';
                  
                  return (
                    <div key={index} className="bg-white rounded p-3 border border-blue-100">
                      <p className="font-medium text-sm mb-2">"{duplicateContent}"</p>
                      <p className="text-xs text-gray-600 mb-2">
                        Found on {group.urls?.length || 0} pages • {group.similarityScore}% similar
                        {group.impactLevel && ` • ${group.impactLevel} impact`}
                      </p>
                      <div className="text-xs text-blue-600 space-y-1 mb-2">
                        {(group.urls || []).slice(0, 3).map((url, urlIndex) => (
                          <div key={urlIndex} className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {typeof url === 'string' ? url : (url as any).href || 'Unknown URL'}
                          </div>
                        ))}
                        {(group.urls?.length || 0) > 3 && (
                          <div className="text-gray-500">... and {(group.urls?.length || 0) - 3} more pages</div>
                        )}
                      </div>
                      {group.improvementStrategy && (
                        <div className="bg-green-50 rounded p-2">
                          <p className="text-xs font-medium text-green-700 mb-1">💡 AI Suggestion:</p>
                          <p className="text-xs text-green-600">
                            {typeof group.improvementStrategy === 'string' ? group.improvementStrategy : 'Create unique titles for each page'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Meta Description Duplicates */}
          {analysis.contentRepetitionAnalysis.descriptionRepetition.duplicateGroups.length > 0 && (
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">
                  Duplicate Meta Descriptions ({analysis.contentRepetitionAnalysis.descriptionRepetition.duplicateGroups.length})
                </h4>
              </div>
              <div className="space-y-3">
                {analysis.contentRepetitionAnalysis.descriptionRepetition.duplicateGroups.map((group, index) => {
                  const duplicateContent = group.content || 'Duplicate content detected';
                  
                  return (
                    <div key={index} className="bg-white rounded p-3 border border-purple-100">
                      <p className="font-medium text-sm mb-2">"{duplicateContent}"</p>
                      <p className="text-xs text-gray-600 mb-2">
                        Found on {group.urls?.length || 0} pages • {group.similarityScore}% similar
                        {group.impactLevel && ` • ${group.impactLevel} impact`}
                      </p>
                      <div className="text-xs text-purple-600 space-y-1 mb-2">
                        {(group.urls || []).slice(0, 3).map((url, urlIndex) => (
                          <div key={urlIndex} className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {typeof url === 'string' ? url : (url as any).href || 'Unknown URL'}
                          </div>
                        ))}
                        {(group.urls?.length || 0) > 3 && (
                          <div className="text-gray-500">... and {(group.urls?.length || 0) - 3} more pages</div>
                        )}
                      </div>
                      {group.improvementStrategy && (
                        <div className="bg-green-50 rounded p-2">
                          <p className="text-xs font-medium text-green-700 mb-1">💡 AI Suggestion:</p>
                          <p className="text-xs text-green-600">
                            {typeof group.improvementStrategy === 'string' ? group.improvementStrategy : 'Create unique descriptions for each page'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DuplicationTab;