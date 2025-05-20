import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Calendar, ExternalLink } from "lucide-react";
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

  const { data: analysisHistory = [], isLoading } = useQuery({
    queryKey: ["/api/analysis/history"],
    enabled: isAuthenticated,
  });

  const { mutate: deleteAnalysis } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/analysis/${id}`);
      if (!response.ok) {
        // Get error message from response
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete analysis");
      }
      return response;
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
      toast({
        title: "Error",
        description: error.message || "Failed to delete analysis",
        variant: "destructive",
      });
    },
  });

  const { mutate: fetchAnalysis, isPending: isLoadingAnalysis } = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("GET", `/api/analysis/${id}`);
      
      // Ensure we have all required properties
      if (!response || !response.pages) {
        throw new Error("Invalid analysis data received");
      }
      
      return response as unknown as WebsiteAnalysis;
    },
    onSuccess: (data) => {
      onSelectAnalysis(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to load analysis",
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Log in to view and manage your analysis history.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis History</CardTitle>
      </CardHeader>
      <CardContent>
        {analysisHistory && analysisHistory.length > 0 ? (
          <div className="space-y-3">
            {analysisHistory.map((analysis: any) => (
              <div
                key={analysis.id}
                className="flex justify-between items-center p-3 border rounded hover:bg-gray-50"
              >
                <div>
                  <h4 className="font-medium">{analysis.domain}</h4>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(analysis.date), { addSuffix: true })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fetchAnalysis(analysis.id)}
                    disabled={isLoadingAnalysis}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this analysis?")) {
                        deleteAnalysis(analysis.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No analysis history found. Analyze a website to get started.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalysisHistory;