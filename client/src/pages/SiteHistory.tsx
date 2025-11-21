import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ExternalLinkIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { RouteDefinition } from "@shared/route-metadata";
import { updateMetadata } from "@/lib/updateMetadata";

export const route: RouteDefinition = {
  path: "/history",
  ssr: false,
  metadata: {
    title: "Analysis History – TrailWave SEO",
    description: "View your website SEO analysis history and track optimization progress.",
    canonical: "https://trailwaveseo.com/history",
  },
};

const SiteHistory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (route.metadata) {
      updateMetadata(route.metadata);
    }
  }, []);
  
  const { data: analysisHistory, isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/analysis/history'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/analysis/history');
      return await res.json();
    }
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
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/analysis/history"] });
      const previousAnalyses = queryClient.getQueryData(["/api/analysis/history"]);
      queryClient.setQueryData(["/api/analysis/history"], (old: any[]) => {
        return old?.filter((analysis) => analysis.id !== deletedId) || [];
      });
      return { previousAnalyses };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/recent"] });
      toast({
        title: "Analysis deleted",
        description: "The analysis has been removed from your history",
      });
    },
    onError: (error: any, deletedId, context) => {
      console.error("Delete analysis error:", error);
      queryClient.setQueryData(["/api/analysis/history"], context?.previousAnalyses);
      
      if (error.message?.includes("not found")) {
        queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analysis/recent"] });
        toast({
          title: "Analysis deleted",
          description: "The analysis has been removed from your history",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete analysis",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
    },
  });

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

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <Card className="border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 backdrop-blur-xl shadow-lg">
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
              ) : !analysisHistory?.length ? (
                <div className="text-center py-10">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No analysis history yet</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    You haven't analyzed any websites yet. Start by analyzing a website.
                  </p>
                  <Link href="/">
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                      Start Analysis
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">Your Previous Analyses</h3>
                  
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-3 font-bold text-slate-900 dark:text-white">Website</th>
                          <th className="text-left py-3 px-3 font-bold text-slate-900 dark:text-white">Date</th>
                          <th className="text-left py-3 px-3 font-bold text-slate-900 dark:text-white">Pages</th>
                          <th className="text-left py-3 px-3 font-bold text-slate-900 dark:text-white">Issues</th>
                          <th className="text-left py-3 px-3 font-bold text-slate-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisHistory?.map((analysis: any) => (
                          <tr key={analysis.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-medium text-slate-900 dark:text-white truncate max-w-xs block text-sm">{analysis.domain}</span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {new Date(analysis.date).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-900 dark:text-white text-sm">
                              {analysis.pagesCount}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md">
                                  {analysis.metrics.criticalIssues}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 text-white shadow-md">
                                  {analysis.metrics.warnings}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Link href={`/analysis/${analysis.id}`}>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 text-xs"
                                  >
                                    View
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                                  onClick={() => {
                                    if (window.confirm("Are you sure?")) {
                                      deleteAnalysis(analysis.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {analysisHistory?.map((analysis: any) => (
                      <div key={analysis.id} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg p-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{analysis.domain}</p>
                              <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 mt-1">
                                <CalendarIcon className="mr-1 h-3 w-3" />
                                {new Date(analysis.date).toLocaleDateString()}
                              </div>
                            </div>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">{analysis.pagesCount} pages</span>
                          </div>
                          <div className="flex gap-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 to-red-500 text-white">
                              {analysis.metrics.criticalIssues}C
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 text-white">
                              {analysis.metrics.warnings}W
                            </span>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <Link href={`/analysis/${analysis.id}`} className="flex-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 w-full text-xs"
                              >
                                View
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                              onClick={() => {
                                if (window.confirm("Delete?")) {
                                  deleteAnalysis(analysis.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SiteHistory;
