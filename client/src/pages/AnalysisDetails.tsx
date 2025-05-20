import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Header from "@/components/Header";
import AnalysisSummary from "@/components/AnalysisSummary";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AnalysisDetails = () => {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: analysis, isLoading, error } = useQuery({
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
          />
        )}
      </div>
    </>
  );
};

export default AnalysisDetails;