import { useState } from "react";
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

interface UserUsage {
  pagesAnalyzed: number;
  pageLimit: number;
  credits: number;
  accountStatus: string;
}

const Dashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Account Status Banner */}
        {usage && (
          <Card className={`mb-6 ${usage.accountStatus === "trial" ? "border-purple-200 bg-purple-50" : "border-blue-200 bg-blue-50"}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Coins className={`h-4 w-4 ${usage.accountStatus === "trial" ? "text-purple-600" : "text-blue-600"}`} />
                      <span className="text-sm font-medium">{usage.credits || 0} Credits</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm px-2 py-1 rounded-full text-xs font-medium ${
                        usage.accountStatus === "trial" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-green-100 text-green-700"
                      }`}>
                        {usage.accountStatus === "trial" ? "Trial Account" : "Paid Account"}
                      </span>
                      {usage.accountStatus === "trial" && (
                        <span className="text-sm text-gray-600">
                          Lite scans (3 pages max, 5 suggestions per page)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {usage.credits < 5 && (
                    <div className="flex items-center space-x-2 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Low credits</span>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className={`border-2 ${
                    usage.accountStatus === "trial" 
                      ? "text-purple-600 border-purple-300 hover:bg-purple-100" 
                      : "text-blue-600 border-blue-300 hover:bg-blue-100"
                  }`}>
                    <Link className="h-3 w-3 mr-1" />
                    <a href="/account">{usage.accountStatus === "trial" ? "Upgrade Account" : "Get Credits"}</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                // Invalidate queries to refresh history and recent sites
                queryClient.invalidateQueries({ queryKey: ["/api/analysis/history"] });
                queryClient.invalidateQueries({ queryKey: ["/api/analysis/recent"] });
              }}
              analysisState={analysisState}
            />
          </div>
          <div>
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
              // Call the cancel API endpoint first
              try {
                await fetch('/api/analyze/cancel', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ domain: progressData.domain }),
                });
                
                // Then update the UI state
                setAnalysisState("idle");
              } catch (error) {
                console.error("Error canceling analysis:", error);
                // Still update UI state even if API call fails
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
    </>
  );
};

export default Dashboard;
