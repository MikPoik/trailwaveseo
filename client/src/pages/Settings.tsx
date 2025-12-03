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
import { Zap, Link2, Gauge, Database, Cookie } from "lucide-react";
import type { RouteDefinition } from "@shared/route-metadata";
import { updateMetadata } from "@/lib/updateMetadata";
import { initGA, cleanupGA } from "@/lib/analytics";

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
  const [cookieConsent, setCookieConsent] = useState<string | null>(null);

  useEffect(() => {
    if (route.metadata) {
      updateMetadata(route.metadata);
    }
    // Load cookie consent preference
    setCookieConsent(localStorage.getItem('cookie-consent'));
  }, []);

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

  const queryFn = async () => {
    const res = await apiRequest('GET', '/api/settings');
    return await res.json();
  };

  const { data: currentSettings, isLoading: isLoadingSettings, error: settingsError } = useQuery<any>({
    queryKey: ['/api/settings'],
    queryFn
  });

  useEffect(() => {
    if (settingsError) {
      toast({
        title: "Failed to load settings",
        description: "Your default settings will be used instead.",
        variant: "destructive",
      });
    }
  }, [settingsError, toast]);

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

  const handleCookiePreference = (accept: boolean) => {
    const newConsent = accept ? 'accepted' : 'declined';
    localStorage.setItem('cookie-consent', newConsent);
    setCookieConsent(newConsent);
    
    if (accept) {
      initGA();
      toast({
        title: "Cookies enabled",
        description: "Analytics cookies have been enabled.",
      });
    } else {
      cleanupGA();
      toast({
        title: "Cookies disabled",
        description: "Analytics cookies have been disabled and removed.",
      });
    }
  };

  if (isLoadingSettings) {
    return (
      <>
        <Header 
          title="Settings" 
          description="Configure your SEO analysis preferences" 
        />
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Loading settings...</p>
          </div>
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

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 md:space-y-8">
              
              <Card className="border-0 bg-gradient-to-br from-teal-500/10 to-teal-500/5 dark:from-teal-900/20 dark:to-teal-900/10 backdrop-blur-xl shadow-lg">
                <CardContent className="pt-6 sm:pt-8">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-600 to-teal-500 rounded-lg flex items-center justify-center text-white shadow-md">
                      <Gauge className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Crawling Settings</h3>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <FormField
                      control={form.control}
                      name="maxPages"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm text-slate-900 dark:text-white font-semibold">Maximum Pages</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              className="text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-slate-600 dark:text-slate-400">
                            Limit pages to analyze (1-100)
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="crawlDelay"
                      render={({ field }) => (
                        <FormItem className="space-y-2 sm:space-y-3">
                          <FormLabel className="text-sm text-slate-900 dark:text-white font-semibold">Crawl Delay: {field.value}ms</FormLabel>
                          <div className="pt-2 px-1 sm:px-2">
                            <Slider
                              min={100}
                              max={3000}
                              step={100}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                              className="w-full"
                            />
                          </div>
                          <FormDescription className="text-xs text-slate-600 dark:text-slate-400">
                            Delay between requests
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="followExternalLinks"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2 bg-white dark:bg-slate-800/50 rounded-lg border border-teal-200/50 dark:border-teal-800/50 p-3 sm:p-4">
                          <div className="space-y-0.5 flex-1">
                            <FormLabel className="text-sm text-slate-900 dark:text-white font-semibold">External Links</FormLabel>
                            <FormDescription className="text-xs text-slate-600 dark:text-slate-400">
                              Analyze other domains
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-900/20 dark:to-emerald-900/10 backdrop-blur-xl shadow-lg">
                <CardContent className="pt-6 sm:pt-8">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-lg flex items-center justify-center text-white shadow-md">
                      <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Analysis Settings</h3>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <FormField
                      control={form.control}
                      name="analyzeImages"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2 bg-white dark:bg-slate-800/50 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 p-3 sm:p-4">
                          <div className="space-y-0.5 flex-1">
                            <FormLabel className="text-sm text-slate-900 dark:text-white font-semibold">Images</FormLabel>
                            <FormDescription className="text-xs text-slate-600 dark:text-slate-400">
                              Check alt text & optimization
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="analyzeLinkStructure"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2 bg-white dark:bg-slate-800/50 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 p-3 sm:p-4">
                          <div className="space-y-0.5 flex-1">
                            <FormLabel className="text-sm text-slate-900 dark:text-white font-semibold">Link Structure</FormLabel>
                            <FormDescription className="text-xs text-slate-600 dark:text-slate-400">
                              Internal linking patterns
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="analyzePageSpeed"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2 bg-white dark:bg-slate-800/50 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 p-3 sm:p-4">
                          <div className="space-y-0.5 flex-1">
                            <FormLabel className="text-sm text-slate-900 dark:text-white font-semibold">Page Speed</FormLabel>
                            <FormDescription className="text-xs text-slate-600 dark:text-slate-400">
                              Load performance
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="analyzeStructuredData"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2 bg-white dark:bg-slate-800/50 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 p-3 sm:p-4">
                          <div className="space-y-0.5 flex-1">
                            <FormLabel className="text-sm text-slate-900 dark:text-white font-semibold">Structured Data</FormLabel>
                            <FormDescription className="text-xs text-slate-600 dark:text-slate-400">
                              Schema & rich snippets
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="analyzeMobileCompatibility"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2 bg-white dark:bg-slate-800/50 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 p-3 sm:p-4">
                          <div className="space-y-0.5 flex-1">
                            <FormLabel className="text-sm text-slate-900 dark:text-white font-semibold">Mobile</FormLabel>
                            <FormDescription className="text-xs text-slate-600 dark:text-slate-400">
                              Mobile-friendly design
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 dark:from-cyan-900/20 dark:to-cyan-900/10 backdrop-blur-xl shadow-lg">
                <CardContent className="pt-6 sm:pt-8">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-md">
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">AI Settings</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="useAI"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2 bg-white dark:bg-slate-800/50 rounded-lg border border-cyan-200/50 dark:border-cyan-800/50 p-3 sm:p-4">
                        <div className="space-y-0.5 flex-1">
                          <FormLabel className="text-sm text-slate-900 dark:text-white font-semibold">AI Suggestions</FormLabel>
                          <FormDescription className="text-xs text-slate-600 dark:text-slate-400">
                            AI-powered recommendations
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-amber-500/10 to-amber-500/5 dark:from-amber-900/20 dark:to-amber-900/10 backdrop-blur-xl shadow-lg">
                <CardContent className="pt-6 sm:pt-8">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-600 to-amber-500 rounded-lg flex items-center justify-center text-white shadow-md">
                      <Cookie className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Cookie Preferences</h3>
                  </div>

                  <div className="bg-white dark:bg-slate-800/50 rounded-lg border border-amber-200/50 dark:border-amber-800/50 p-3 sm:p-4 space-y-4">
                    <div>
                      <p className="text-sm text-slate-900 dark:text-white font-semibold mb-2">Analytics Cookies</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                        We use Google Analytics to understand how visitors use our site. This helps us improve your experience.
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          Status: <span className={`font-semibold ${cookieConsent === 'accepted' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {cookieConsent === 'accepted' ? 'Enabled' : cookieConsent === 'declined' ? 'Disabled' : 'Not Set'}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant={cookieConsent === 'accepted' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleCookiePreference(true)}
                        className={cookieConsent === 'accepted' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        Enable
                      </Button>
                      <Button
                        type="button"
                        variant={cookieConsent === 'declined' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleCookiePreference(false)}
                        className={cookieConsent === 'declined' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        Disable
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end pt-2 sm:pt-4">
                <Button 
                  type="submit" 
                  disabled={loading || updateSettingsMutation.isPending}
                  className="text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 sm:px-8 py-2 font-bold"
                >
                  {(loading || updateSettingsMutation.isPending) ? 
                    "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </>
  );
};

export default Settings;
