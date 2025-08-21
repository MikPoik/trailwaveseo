import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AnalysisState, WebsiteAnalysis } from "@/lib/types";
import { useAuth } from "../hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface URLInputFormProps {
  onAnalyzeStart: (domain: string, useSitemap: boolean) => void;
  onAnalysisUpdate: (progressData: any) => void;
  onAnalysisComplete: (analysis: WebsiteAnalysis) => void;
  analysisState: AnalysisState;
}

const urlSchema = z.object({
  websiteUrl: z.string()
    .min(1, "Website URL is required")
    .regex(/^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/, "Enter a valid domain without http:// or https://"),
  crawlMethod: z.enum(["sitemap", "crawl"]),
  advancedOptions: z.boolean().optional(),
  additionalInfo: z.string().optional(),
});

type FormValues = z.infer<typeof urlSchema>;

const URLInputForm = ({ 
  onAnalyzeStart, 
  onAnalysisUpdate, 
  onAnalysisComplete,
  analysisState
}: URLInputFormProps) => {
  const { isAuthenticated, login } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(urlSchema),
    defaultValues: {
      websiteUrl: "",
      crawlMethod: "sitemap",
      advancedOptions: false,
      additionalInfo: ""
    }
  });

  const { mutate: analyzeWebsite, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/analyze", {
        domain: data.websiteUrl,
        useSitemap: data.crawlMethod === "sitemap",
        additionalInfo: data.additionalInfo
      });

      // Setup event source for real-time progress updates
      const domain = data.websiteUrl;
      const useSitemap = data.crawlMethod === "sitemap";

      onAnalyzeStart(domain, useSitemap);

      // Using EventSource for SSE (Server-Sent Events)
      const source = new EventSource(`/api/analyze/progress?domain=${encodeURIComponent(domain)}`);

      return new Promise<WebsiteAnalysis>((resolve, reject) => {
        source.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.status === "in-progress") {
            onAnalysisUpdate({
              domain,
              pagesFound: data.pagesFound,
              pagesAnalyzed: data.pagesAnalyzed,
              currentPageUrl: data.currentPageUrl,
              analyzedPages: data.analyzedPages,
              percentage: data.percentage || 0
            });
          } else if (data.status === "completed") {
            source.close();
            if (data.analysis) {
              // Dispatch custom event to notify other components that analysis is complete
              window.dispatchEvent(new CustomEvent('analysisComplete', { detail: data.analysis }));
              resolve(data.analysis);
            } else {
              reject(new Error("Analysis completed but no analysis data received"));
            }
          } else if (data.status === "error") {
            source.close();
            reject(new Error(data.error || "Analysis failed"));
          }
        };

        source.onerror = (error) => {
          source.close();
          reject(new Error("Failed to connect to analysis progress stream"));
        };
      });
    },
    onSuccess: (data) => {
      onAnalysisComplete(data);
    },
    onError: (error: any) => {
      // Handle freemium usage limit errors specifically
      if (error.status === 403) {
        if (error.needsCredits || error.message?.includes("Free scan limit")) {
          toast({
            title: "Free Scans Used Up",
            description: "You've used all 3 free scans this month. Purchase credits to continue analyzing websites.",
            variant: "destructive",
            action: (
              <Button variant="outline" onClick={() => window.location.href = "/credits"}>
                Get Credits
              </Button>
            ),
          });
        } else if (error.message?.includes("limit reached")) {
          toast({
            title: "Usage Limit Reached",
            description: error.message || "You have reached your page analysis limit.",
            variant: "destructive",
            action: (
              <Button variant="outline" onClick={() => window.location.href = "/account"}>
                View Account
              </Button>
            ),
          });
        }
      } else {
        toast({
          title: "Analysis Failed",
          description: error.message || "Failed to start analysis",
          variant: "destructive",
        });
      }
    }
  });

  const onSubmit = (data: FormValues) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to analyze websites and save your results.",
        action: (
          <Button variant="outline" onClick={() => login()}>
            Log in
          </Button>
        ),
      });
      return;
    }
    analyzeWebsite(data);
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
    form.setValue("advancedOptions", !showAdvanced);
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Analyze Website</h3>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="website-url">Website URL</Label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                https://
              </span>
              <Input
                id="website-url"
                className="flex-1 min-w-0 block w-full rounded-none rounded-r-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm border-gray-300"
                placeholder="example.com"
                {...form.register("websiteUrl")}
                disabled={isPending || analysisState === "analyzing"}
              />
            </div>
            {form.formState.errors.websiteUrl && (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.websiteUrl.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">Enter a website URL without the https:// prefix</p>
          </div>

          <RadioGroup 
            defaultValue="sitemap" 
            className="flex items-center space-x-4"
            disabled={isPending || analysisState === "analyzing"}
            onValueChange={(value) => {
              form.setValue("crawlMethod", value as "sitemap" | "crawl");
            }}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sitemap" id="use-sitemap" />
              <Label htmlFor="use-sitemap">Use sitemap.xml</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="crawl" id="crawl-site" />
              <Label htmlFor="crawl-site">Crawl site (fallback)</Label>
            </div>
          </RadioGroup>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="advanced-options" 
                checked={showAdvanced}
                onCheckedChange={toggleAdvanced}
                disabled={isPending || analysisState === "analyzing"}
              />
              <Label htmlFor="advanced-options">Show advanced options</Label>
            </div>
            <div>
              <Button 
                type="submit" 
                disabled={isPending || analysisState === "analyzing"}
              >
                {isPending || analysisState === "analyzing" ? "Analyzing..." : "Analyze Website"}
              </Button>
            </div>
          </div>

          {showAdvanced && (
            <div className="pt-4 border-t mt-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Advanced Options</h4>
              <div>
                <Label htmlFor="additional-info">Additional Information</Label>
                <Textarea
                  id="additional-info"
                  className="mt-1"
                  placeholder="Enter additional context for analysis (e.g., Google Search Console keyword data, target keywords, business goals, etc.)"
                  rows={4}
                  {...form.register("additionalInfo")}
                  disabled={isPending || analysisState === "analyzing"}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Provide additional context like keyword statistics, target audience, or business goals to enhance the AI-powered analysis.
                </p>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default URLInputForm;