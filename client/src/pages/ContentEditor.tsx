import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import ChatInterface from "@/components/content-editor/ChatInterface";
import ContextSidebar from "@/components/content-editor/ContextSidebar";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { RouteDefinition } from "@shared/route-metadata";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";
import { WebsiteAnalysis } from "@/lib/types";

export const route: RouteDefinition = {
  path: "/editor/:conversationId",
  ssr: false,
  metadata: {
    title: "Content Editor – TrailWave SEO",
    description: "AI-powered content optimization and editing workspace.",
    canonical: "https://trailwaveseo.com/editor",
  },
};

const ContentEditor = () => {
  const [, params] = useRoute("/content-editor/:analysisId/:pageUrl");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pageUrl, setPageUrl] = useState<string>("");
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [freshPageData, setFreshPageData] = useState<any>(null);

  // Decode URL parameters
  useEffect(() => {
    if (params?.analysisId && params?.pageUrl) {
      setAnalysisId(parseInt(params.analysisId));
      setPageUrl(decodeURIComponent(params.pageUrl));
    }
  }, [params]);

  // Fetch analysis data
  const { data: analysis, isLoading, error } = useQuery<WebsiteAnalysis>({
    queryKey: [`/api/analysis/${analysisId}`],
    enabled: !!analysisId && !!user,
  });

  // Back navigation
  const handleBack = () => {
    setLocation('/dashboard');
  };

  // Handle fresh content loaded from chat
  const handleFreshContentLoaded = (freshContent: any) => {
    setFreshPageData(freshContent);
  };

  if (!params?.analysisId || !params?.pageUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Invalid content editor URL</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <Header 
          title="Content Editor" 
          description="AI-powered content editing and optimization" 
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading analysis data...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !analysis) {
    return (
      <>
        <Header 
          title="Content Editor" 
          description="AI-powered content editing and optimization" 
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-4">Unable to load analysis data</p>
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Find the specific page data
  const pageData = analysis.pages.find(page => page.url === pageUrl);

  // Merge fresh content with original analysis data to preserve suggestions
  const displayPageData = freshPageData ? {
    ...pageData, // Keep original analysis data (including suggestions)
    ...freshPageData, // Override with fresh content (title, meta, word count, etc.)
    contentMetrics: {
      ...pageData?.contentMetrics,
      wordCount: freshPageData.wordCount || pageData?.contentMetrics?.wordCount || 0
    },
    suggestions: pageData?.suggestions || [], // Ensure suggestions are preserved
    issues: pageData?.issues || [] // Ensure SEO issues are preserved
  } : pageData;

  return (
    <>
      <Header 
        title="Content Editor" 
        description="AI-powered content editing and optimization" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 pb-0">
        {/* Header with back button and page info */}
        <div className="mb-1 pb-0">
          <div className="flex items-center justify-between mb-4">
            <Button onClick={handleBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analysis
            </Button>
            <div className="text-right">
              <h2 className="text-lg font-medium text-gray-900">
                {displayPageData?.title || pageData?.title || 'Page Content Editor'}
              </h2>
              <p className="text-sm text-gray-500">{pageUrl}</p>
            </div>
          </div>
        </div>

        {/* Main content area with chat and sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
          {/* Chat Interface - Takes 3/4 of the width */}
          <div className="lg:col-span-3 flex flex-col min-h-[600px]">
            <ChatInterface 
              analysisId={analysisId!}
              pageUrl={pageUrl}
              pageData={displayPageData}
              analysis={analysis}
              onFreshContentLoaded={handleFreshContentLoaded}
            />
          </div>

          {/* Context Sidebar - Takes 1/4 of the width */}
          <div className="lg:col-span-1">
            <ContextSidebar 
              analysis={analysis}
              pageData={displayPageData}
              pageUrl={pageUrl}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ContentEditor;