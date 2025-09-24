import { useState, useEffect } from "react";
import { WebsiteAnalysis, PageAnalysis } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportAnalysisCSV } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Import modular tab components
import OverviewTab from "./analysis-tabs/OverviewTab";
import PagesTab from "./analysis-tabs/PagesTab";
import ContentQualityTab from "./analysis-tabs/ContentQualityTab";
import CompetitorTab from "./analysis-tabs/CompetitorTab";
import DesignAnalysisTab from "./analysis-tabs/DesignAnalysisTab";

interface AnalysisSummaryProps {
  analysis: WebsiteAnalysis;
  onNewAnalysis: () => void;
  onReanalyzePage?: (pageUrl: string) => Promise<void>;
}

const AnalysisSummary = ({ analysis, onNewAnalysis, onReanalyzePage }: AnalysisSummaryProps) => {
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

  const handleAnalysisUpdate = (newAnalysis: WebsiteAnalysis) => {
    setUpdatedAnalysis(newAnalysis);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Analysis Overview</TabsTrigger>
          <TabsTrigger value="content-quality">Content Quality</TabsTrigger>
          <TabsTrigger value="design-analysis">Design Analysis</TabsTrigger>
          <TabsTrigger value="competitor">Competitor Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            analysis={updatedAnalysis}
            onNewAnalysis={onNewAnalysis}
            onExportCSV={exportCSV}
            onExportPDF={exportPDF}
            onPageReanalyze={handlePageReanalyze}
          />
        </TabsContent>

        <TabsContent value="content-quality">
          <ContentQualityTab
            analysis={updatedAnalysis}
          />
        </TabsContent>

        <TabsContent value="design-analysis">
          <DesignAnalysisTab analysis={updatedAnalysis} />
        </TabsContent>

        <TabsContent value="competitor">
          <CompetitorTab analysis={updatedAnalysis} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalysisSummary;