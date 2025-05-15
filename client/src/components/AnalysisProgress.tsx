import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalysisProgressProps {
  domain: string;
  pagesFound: number;
  pagesAnalyzed: number;
  currentPageUrl: string;
  analyzedPages: string[];
  percentage: number;
  onCancel: () => void;
}

const AnalysisProgress = ({
  domain,
  pagesFound,
  pagesAnalyzed,
  currentPageUrl,
  analyzedPages,
  percentage,
  onCancel
}: AnalysisProgressProps) => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Analyzing: <span>{domain}</span>
          </h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-gray-700">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2.5" />
        </div>
        
        <div className="space-y-3">
          {pagesFound > 0 && (
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm text-gray-700">
                {pagesFound > 0 
                  ? `Found ${pagesFound} pages to analyze` 
                  : "Searching for pages..."}
              </span>
            </div>
          )}
          
          {currentPageUrl && (
            <div className="flex items-center">
              <Loader className="animate-spin h-5 w-5 text-primary-600 mr-2" />
              <span className="text-sm text-gray-700">
                Analyzing page: <span>{currentPageUrl}</span>
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Pages Analyzed: <span>{pagesAnalyzed}</span>/<span>{pagesFound || '?'}</span>
          </h4>
          <ScrollArea className="bg-gray-100 rounded-md p-3 h-32 text-xs font-mono">
            {analyzedPages.map((page, index) => (
              <div key={index} className="text-gray-600">
                ✓ {page}
              </div>
            ))}
            {currentPageUrl && (
              <div className="text-green-600">→ Currently analyzing: {currentPageUrl}</div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisProgress;
