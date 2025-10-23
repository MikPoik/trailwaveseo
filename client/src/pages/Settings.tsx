import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { RouteDefinition } from "@shared/route-metadata";
import { updateMetadata } from "@/lib/updateMetadata";

export const route: RouteDefinition = {
  path: "/settings",
  ssr: false,
  metadata: {
    title: "Settings – TrailWave SEO",
    description: "Manage your TrailWave SEO account settings and preferences.",
    canonical: "https://trailwaveseo.com/settings",
  },
};

const settingsSchema = z.object({
  maxPages: z.number().min(1).max(100),
  crawlDelay: z.number().min(100).max(3000),
  followExternalLinks: z.boolean(),
  analyzeImages: z.boolean(),
  analyzeLinkStructure: z.boolean(),
  analyzePageSpeed: z.boolean(),
  analyzeStructuredData: z.boolean(),
  analyzeMobileCompatibility: z.boolean(),
  useAI: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Update metadata on mount
  useEffect(() => {
    if (route.metadata) {
      updateMetadata(route.metadata);
    }
  }, []);

  // Default values
  const defaultValues: SettingsFormValues = {
    maxPages: 20,
    crawlDelay: 500,
    followExternalLinks: false,
    analyzeImages: true,
    analyzeLinkStructure: true,
    analyzePageSpeed: true,
    analyzeStructuredData: true,
    analyzeMobileCompatibility: true,
    useAI: true,
  };

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

  // Fetch current settings
  const queryFn = async () => {
    const res = await apiRequest('GET', '/api/settings');
    return await res.json();
  };

  const { data: currentSettings, isLoading: isLoadingSettings, error: settingsError } = useQuery<any>({
    queryKey: ['/api/settings'],
    queryFn
  });

  // Show toast on error separately because useQuery options typed overload rejected our onError above
  useEffect(() => {
    if (settingsError) {
      toast({
        title: "Failed to load settings",
        description: "Your default settings will be used instead.",
        variant: "destructive",
      });
    }
  }, [settingsError, toast]);

  // Update form values when settings are loaded
  useEffect(() => {
    if (currentSettings && !isLoadingSettings) {
      form.reset({
        maxPages: currentSettings.maxPages ?? defaultValues.maxPages,
        crawlDelay: currentSettings.crawlDelay ?? defaultValues.crawlDelay,
        followExternalLinks: currentSettings.followExternalLinks ?? defaultValues.followExternalLinks,
        analyzeImages: currentSettings.analyzeImages ?? defaultValues.analyzeImages,
        analyzeLinkStructure: currentSettings.analyzeLinkStructure ?? defaultValues.analyzeLinkStructure,
        analyzePageSpeed: currentSettings.analyzePageSpeed ?? defaultValues.analyzePageSpeed,
        analyzeStructuredData: currentSettings.analyzeStructuredData ?? defaultValues.analyzeStructuredData,
        analyzeMobileCompatibility: currentSettings.analyzeMobileCompatibility ?? defaultValues.analyzeMobileCompatibility,
        useAI: currentSettings.useAI ?? defaultValues.useAI,
      });
    }
  }, [currentSettings, isLoadingSettings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      return await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      // Invalidate the settings query to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });

      toast({
        title: "Settings updated",
        description: "Your SEO analysis settings have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  // Show loading state until settings are loaded
  if (isLoadingSettings) {
    return (
      <>
        <Header 
          title="Settings" 
          description="Configure your SEO analysis preferences" 
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading settings...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Settings" 
        description="Configure your SEO analysis preferences" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Crawling Settings</h3>

                  <FormField
                    control={form.control}
                    name="maxPages"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Maximum Pages to Analyze</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Limit the number of pages to analyze (1-100)
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="crawlDelay"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Crawl Delay (ms)</FormLabel>
                        <div className="pt-2">
                          <Slider
                            min={100}
                            max={3000}
                            step={100}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </div>
                        <FormDescription>
                          Delay between requests: {field.value}ms (lower values may be blocked by some servers)
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="followExternalLinks"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Follow External Links</FormLabel>
                          <FormDescription>
                            Analyze pages on different domains
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-medium text-gray-900">Analysis Settings</h3>

                  <FormField
                    control={form.control}
                    name="analyzeImages"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Analyze Images</FormLabel>
                          <FormDescription>
                            Check for alt text and image optimization. When AI is enabled, also generates suggested alt text for images missing it.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="analyzeLinkStructure"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Analyze Link Structure</FormLabel>
                          <FormDescription>
                            Check for internal linking patterns and anchor texts
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="analyzePageSpeed"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Analyze Page Speed</FormLabel>
                          <FormDescription>
                            Check page load performance and optimization opportunities
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="analyzeStructuredData"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Analyze Structured Data</FormLabel>
                          <FormDescription>
                            Check for schema.org markup and rich snippets
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="analyzeMobileCompatibility"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Analyze Mobile Compatibility</FormLabel>
                          <FormDescription>
                            Check for mobile-friendly design and viewport configuration
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="useAI"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 rounded-md border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Use AI for Suggestions</FormLabel>
                          <FormDescription>
                            Generate AI-powered SEO improvement suggestions and missing alt text for images (uses OpenAI)
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={loading || updateSettingsMutation.isPending}
                  >
                    {(loading || updateSettingsMutation.isPending) ? 
                      "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Settings;