import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ExternalLinkIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

const SiteHistory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: analysisHistory, isLoading, error } = useQuery({
    queryKey: ['/api/analysis/history'],
  });

  const { mutate: deleteAnalysis } = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await apiRequest("DELETE", `/api/analysis/${id}`);
        
        if (response.status >= 400) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete analysis");
        }
        
        return response;
      } catch (error) {
        console.error("Error in delete mutation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/recent"] });
      toast({
        title: "Analysis deleted",
        description: "The analysis has been removed from your history",
      });
    },
    onError: (error: any) => {
      console.error("Delete analysis error:", error);
      
      if (error.message?.includes("not found")) {
        queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analysis/recent"] });
        toast({
          title: "Analysis deleted",
          description: "The analysis has been removed from your history",
        });
        return;
      }
      
      // Revert the optimistic update by invalidating queries
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/recent"] });
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete analysis",
        variant: "destructive",
      });
    },
  });

  // Use useEffect to show error toast only when error changes
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading history",
        description: "Could not load your previous analyses",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <>
      <Header 
        title="Site Analysis History" 
        description="Review your previous website SEO analyses" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : !analysisHistory?.length ? (
              <div className="text-center py-10">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No analysis history yet</h3>
                <p className="text-gray-500 mb-4">
                  You haven't analyzed any websites yet. Start by analyzing a website.
                </p>
                <Link href="/">
                  <Button>
                    Start Analysis
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Previous Analyses</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Website</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Pages</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Issues</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisHistory?.map((analysis) => (
                        <tr key={analysis.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="truncate max-w-xs">{analysis.domain}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center text-sm text-gray-500">
                              <CalendarIcon className="mr-1 h-4 w-4" />
                              {new Date(analysis.date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {analysis.pagesCount}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {analysis.metrics.criticalIssues} Critical
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {analysis.metrics.warnings} Warnings
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Link href={`/analysis/${analysis.id}`}>
                                <Button variant="outline" size="sm">
                                  View Details
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this analysis?")) {
                                    deleteAnalysis(analysis.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SiteHistory;
