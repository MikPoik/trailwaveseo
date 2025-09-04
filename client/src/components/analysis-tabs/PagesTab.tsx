import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WebsiteAnalysis, PageAnalysis } from "@/lib/types";
import PageAnalysisCard from "../PageAnalysisCard";

interface PagesTabProps {
  analysis: WebsiteAnalysis;
  onPageReanalyze: (pageUrl: string, updatedPage: PageAnalysis) => void;
}

const PagesTab = ({ analysis, onPageReanalyze }: PagesTabProps) => {
  const [displayedPages, setDisplayedPages] = useState(10);

  const loadMorePages = () => {
    setDisplayedPages(prev => prev + 5);
  };

  return (
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
  );
};

export default PagesTab;