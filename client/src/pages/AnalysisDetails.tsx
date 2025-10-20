import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Header from "@/components/Header";
import AnalysisSummary from "@/components/AnalysisSummary";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RouteDefinition } from "@shared/route-metadata";
import { updateMetadata } from "@/lib/updateMetadata";

export const route: RouteDefinition = {
  path: "/analysis/:id",
  ssr: false,
  metadata: {
    title: "Analysis Details – TrailWave SEO",
    description: "View detailed SEO analysis results and recommendations.",
    canonical: "https://trailwaveseo.com/analysis",
  },
};

const AnalysisDetails = () => {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Update metadata on mount
  useEffect(() => {
    if (route.metadata) {
      updateMetadata(route.metadata);
    }
  }, []);

  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/analysis', id],
    queryFn: () => fetch(`/api/analysis/${id}`).then(res => {
      if (!res.ok) throw new Error('Analysis not found');
      return res.json();
    }),
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading analysis",
        description: "The requested analysis could not be found",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleReanalyzePage = async (pageUrl: string) => {
    try {
      const response = await fetch(`/api/analysis/${id}/reanalyze-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageUrl }),
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          toast({
            title: "Insufficient Credits",
            description: result.message || "You need 1 credit to reanalyze a page.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(result.error || 'Failed to reanalyze page');
      }

      // Refetch the analysis to get updated data
      refetch();

      toast({
        title: "Page reanalyzed",
        description: "The page has been successfully reanalyzed with fresh data.",
      });
    } catch (error) {
      console.error('Failed to reanalyze page:', error);
      toast({
        title: "Error",
        description: "Failed to reanalyze the page. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Header
        title={analysis ? `Analysis: ${analysis.domain}` : "Analysis Details"}
        description={analysis ? `Analyzed on ${new Date(analysis.date).toLocaleDateString()}` : "Loading analysis details..."}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Button variant="outline" onClick={() => setLocation("/history")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis not found</h3>
            <p className="text-gray-500 mb-4">
              The requested analysis could not be found or may have been deleted.
            </p>
            <Button onClick={() => setLocation("/history")}>
              Return to Analysis History
            </Button>
          </div>
        ) : analysis && (
          <AnalysisSummary
            analysis={analysis}
            onNewAnalysis={() => setLocation("/")}
            onReanalyzePage={handleReanalyzePage} // Pass the reanalyze handler
          />
        )}
      </div>
    </>
  );
};

export default AnalysisDetails;