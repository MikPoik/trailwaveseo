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

      const domain = data.websiteUrl;
      const useSitemap = data.crawlMethod === "sitemap";

      onAnalyzeStart(domain, useSitemap);

      const source = new EventSource(`/api/analyze/progress?domain=${encodeURIComponent(domain)}`);

      return new Promise<WebsiteAnalysis>((resolve, reject) => {
        // Server sends plain SSE messages without named events; use onmessage
        source.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            // Update progress on every message
            onAnalysisUpdate({
              domain: data.domain,
              pagesFound: data.pagesFound ?? 0,
              pagesAnalyzed: data.pagesAnalyzed ?? 0,
              currentPageUrl: data.currentPageUrl ?? "",
              analyzedPages: data.analyzedPages ?? [],
              percentage: data.percentage ?? 0,
            });

            // Handle terminal states
            if (data.status === "completed") {
              source.close();
              // Server includes full analysis in completion payload
              resolve(data.analysis ?? data);
            } else if (data.status === "error" || data.status === "cancelled") {
              source.close();
              reject(new Error(data.error || data.status || "Analysis failed"));
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error);
          }
        };

        source.onerror = () => {
          // Network/SSE error; close and reject to surface to UI
          try { source.close(); } catch {}
          reject(new Error("Connection to progress stream failed"));
        };
      });
    },
    onSuccess: (data) => {
      onAnalysisComplete(data);
    },
    onError: (error: any) => {
      if (error.status === 403) {
        if (error.needsCredits || error.message?.includes("Free scan limit")) {
          toast({
            title: "Free Scans Used Up",
            description: "You've used all 3 free scans. Purchase credits to continue analyzing websites.",
            variant: "destructive",
            action: (
              <Button variant="outline" onClick={() => window.location.href = "/account"}>
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
    <Card className="border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 backdrop-blur-xl shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">Analyze Website</h3>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <div>
            <Label htmlFor="website-url" className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Website URL</Label>
            <div className="mt-2 flex rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
              <span className="inline-flex items-center px-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium">
                https://
              </span>
              <Input
                id="website-url"
                className="flex-1 border-0 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                placeholder="example.com"
                {...form.register("websiteUrl")}
                disabled={isPending || analysisState === "analyzing"}
              />
            </div>
            {form.formState.errors.websiteUrl && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{form.formState.errors.websiteUrl.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Enter a website URL without https://</p>
          </div>

          <div>
            <Label className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-3 block">Crawl Method</Label>
            <RadioGroup
              defaultValue="sitemap"
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
              disabled={isPending || analysisState === "analyzing"}
              onValueChange={(value) => {
                form.setValue("crawlMethod", value as "sitemap" | "crawl");
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sitemap" id="use-sitemap" />
                <Label htmlFor="use-sitemap" className="text-xs sm:text-sm cursor-pointer text-slate-900 dark:text-white font-normal">Use sitemap.xml</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="crawl" id="crawl-site" />
                <Label htmlFor="crawl-site" className="text-xs sm:text-sm cursor-pointer text-slate-900 dark:text-white font-normal">Crawl site (fallback)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="advanced-options"
                checked={showAdvanced}
                onCheckedChange={toggleAdvanced}
                disabled={isPending || analysisState === "analyzing"}
              />
              <Label htmlFor="advanced-options" className="text-xs sm:text-sm cursor-pointer text-slate-900 dark:text-white font-normal">Show advanced options</Label>
            </div>
            <Button
              type="submit"
              disabled={isPending || analysisState === "analyzing"}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm"
            >
              {isPending || analysisState === "analyzing" ? "Analyzing..." : "Analyze Website"}
            </Button>
          </div>

          {showAdvanced && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Advanced Options</h4>
              <div>
                <Label htmlFor="additional-info" className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Additional Information</Label>
                <Textarea
                  id="additional-info"
                  className="mt-2 text-xs sm:text-sm min-h-20 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  placeholder="Enter additional context for analysis"
                  rows={4}
                  {...form.register("additionalInfo")}
                  disabled={isPending || analysisState === "analyzing"}
                />
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Provide context like target keywords or business goals to enhance analysis
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
