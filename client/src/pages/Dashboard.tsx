import { useState } from "react";
import Header from "@/components/Header";
import URLInputForm from "@/components/URLInputForm";
import AnalysisProgress from "@/components/AnalysisProgress";
import AnalysisSummary from "@/components/AnalysisSummary";
import { AnalysisState, WebsiteAnalysis } from "@/lib/types";

const Dashboard = () => {
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
          }}
          analysisState={analysisState}
        />

        {analysisState === "analyzing" && (
          <AnalysisProgress 
            domain={progressData.domain}
            pagesFound={progressData.pagesFound}
            pagesAnalyzed={progressData.pagesAnalyzed}
            currentPageUrl={progressData.currentPageUrl}
            analyzedPages={progressData.analyzedPages}
            percentage={progressData.percentage}
            onCancel={() => setAnalysisState("idle")}
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
