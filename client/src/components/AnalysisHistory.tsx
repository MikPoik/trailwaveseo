import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Calendar, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { WebsiteAnalysis } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "../hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalysisHistoryProps {
  onSelectAnalysis: (analysis: WebsiteAnalysis) => void;
}

const AnalysisHistory = ({ onSelectAnalysis }: AnalysisHistoryProps) => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: analysisHistory = [], isLoading } = useQuery<WebsiteAnalysis[]>({
    queryKey: ["/api/analysis/history"],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/analysis/history');
      return await res.json();
    },
    enabled: isAuthenticated,
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
      
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/recent"] });
      
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

  if (!isAuthenticated) {
    return (
      <Card className="border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 backdrop-blur-xl shadow-lg">
        <CardContent className="p-4 sm:p-6 text-center">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Log in to view your analysis history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 backdrop-blur-xl shadow-lg h-fit">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Recent Analyses</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !analysisHistory?.length ? (
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">No analyses yet. Start by analyzing a website.</p>
        ) : (
          <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
            {analysisHistory.slice(0, 5).map((analysis: any) => (
              <div
                key={analysis.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{analysis.domain}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(analysis.date), { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectAnalysis(analysis)}
                    className="flex-1 sm:flex-none text-xs border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Delete this analysis?")) {
                        deleteAnalysis(analysis.id);
                      }
                    }}
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalysisHistory;
