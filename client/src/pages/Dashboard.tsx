import { useState, useEffect } from "react";
import Header from "@/components/Header";
import URLInputForm from "@/components/URLInputForm";
import AnalysisProgress from "@/components/AnalysisProgress";
import AnalysisSummary from "@/components/AnalysisSummary";
import AnalysisHistory from "@/components/AnalysisHistory";
import { AnalysisState, WebsiteAnalysis } from "@/lib/types";
import { useAuth } from "../hooks/useAuth";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, AlertTriangle, Link } from "lucide-react";
import type { RouteDefinition } from "@shared/route-metadata";
import { updateMetadata } from "@/lib/updateMetadata";

export const route: RouteDefinition = {
  path: "/dashboard",
  ssr: false,
  metadata: {
    title: "Dashboard – TrailWave SEO",
    description: "Access your SEO analysis dashboard and manage your website optimization projects.",
    canonical: "https://trailwaveseo.com/dashboard",
  },
};

interface UserUsage {
  pagesAnalyzed: number;
  pageLimit: number;
  credits: number;
  accountStatus: string;
  chatMessagesInPack: number;
}

const Dashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (route.metadata) {
      updateMetadata(route.metadata);
    }
  }, []);
  
  const { data: usage } = useQuery<UserUsage>({
    queryKey: ['/api/user/usage'],
    enabled: !!user,
  });
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [analysis, setAnalysis] = useState<WebsiteAnalysis | null>(null);
  const [progressData, setProgressData] = useState({
    domain: "",
    pagesFound: 0,
    pagesAnalyzed: 0,
    currentPageUrl: "",
    analyzedPages: [] as string[],
    percentage: 0,
  });

  return (
    <>
      <Header 
        title="Website SEO Analysis" 
        description="Optimize your website's SEO with AI-powered suggestions" 
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          {usage && (
            <Card className={`mb-4 sm:mb-6 border-0 backdrop-blur-xl shadow-lg ${usage.accountStatus === "trial" ? "bg-gradient-to-r from-purple-500/10 to-purple-500/5 dark:from-purple-900/20 dark:to-purple-900/10" : "bg-gradient-to-r from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/10"}`}>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex items-center space-x-2 sm:space-x-3 bg-white dark:bg-slate-800/50 rounded-lg px-3 sm:px-4 py-2 backdrop-blur-sm">
                      <Coins className={`h-4 w-4 sm:h-5 sm:w-5 ${usage.accountStatus === "trial" ? "text-purple-600" : "text-blue-600"}`} />
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">{usage.credits || 0} Credits</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                        usage.accountStatus === "trial" 
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" 
                          : "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                      }`}>
                        {usage.accountStatus === "trial" ? "Trial" : "Paid"}
                      </span>
                      {usage.accountStatus === "trial" && (
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          3 pages max
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {usage.credits < 5 && (
                      <div className="flex items-center space-x-1 text-orange-600">
                        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm font-medium">Low</span>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`border-2 text-xs sm:text-sm flex-1 sm:flex-none ${
                        usage.accountStatus === "trial" 
                          ? "text-purple-600 border-purple-300 hover:bg-purple-100 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/30" 
                          : "text-blue-600 border-blue-300 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/30"
                      }`}
                    >
                      <Link className="h-3 w-3 mr-1" />
                      <a href="/account">{usage.accountStatus === "trial" ? "Upgrade" : "Buy"}</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <URLInputForm 
                onAnalyzeStart={(domain, useSitemap) => {
                  setAnalysisState("analyzing");
                  setProgressData(prev => ({
                    ...prev,
                    domain,
                    pagesFound: 0,
                    pagesAnalyzed: 0,
                    currentPageUrl: "",
                    analyzedPages: [],
                    percentage: 0
                  }));
                }}
                onAnalysisUpdate={(data) => {
                  setProgressData(data);
                }}
                onAnalysisComplete={(analysisResult) => {
                  setAnalysis(analysisResult);
                  setAnalysisState("completed");
                  queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/analysis/recent"] });
                }}
                analysisState={analysisState}
              />
            </div>
            <div className="w-full">
              <AnalysisHistory 
                onSelectAnalysis={(selectedAnalysis) => {
                  setAnalysis(selectedAnalysis);
                  setAnalysisState("completed");
                }} 
              />
            </div>
          </div>

          {analysisState === "analyzing" && (
            <AnalysisProgress 
              domain={progressData.domain}
              pagesFound={progressData.pagesFound}
              pagesAnalyzed={progressData.pagesAnalyzed}
              currentPageUrl={progressData.currentPageUrl}
              analyzedPages={progressData.analyzedPages}
              percentage={progressData.percentage}
              onCancel={async () => {
                try {
                  await fetch('/api/analyze/cancel', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ domain: progressData.domain }),
                  });
                  setAnalysisState("idle");
                } catch (error) {
                  console.error("Error canceling analysis:", error);
                  setAnalysisState("idle");
                }
              }}
            />
          )}

          {analysisState === "completed" && analysis && (
            <AnalysisSummary 
              analysis={analysis}
              onNewAnalysis={() => setAnalysisState("idle")}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
