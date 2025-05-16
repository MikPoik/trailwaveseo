import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { WebsiteAnalysis } from '@/lib/types';
import { compareWithCompetitor } from '@/lib/api';
import { InfoIcon, AlertTriangle, AlertCircle, Check, ChevronRight } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Schema for competitor analysis form
const competitorSchema = z.object({
  competitorDomain: z.string().min(3, 'Competitor domain must be at least 3 characters')
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/, 'Please enter a valid domain (e.g., competitor.com)')
});

type CompetitorFormValues = z.infer<typeof competitorSchema>;

interface CompetitorAnalysisProps {
  mainAnalysis: WebsiteAnalysis;
}

interface ComparisonMetric {
  main: number;
  competitor: number;
  difference: number;
}

interface ComparisonResult {
  mainDomain: string;
  competitorDomain: string;
  metrics: {
    titleOptimization: ComparisonMetric;
    descriptionOptimization: ComparisonMetric;
    headingsOptimization: ComparisonMetric;
    imagesOptimization: ComparisonMetric;
    criticalIssues: ComparisonMetric;
  };
  recommendations: string[];
  // For detailed comparison
  details?: {
    main: {
      titles: string[];
      descriptions: string[];
      headings: string[];
      images: number;
      pages: number;
    };
    competitor: {
      titles: string[];
      descriptions: string[];
      headings: string[];
      images: number;
      pages: number;
    };
  };
}

const CompetitorAnalysis = ({ mainAnalysis }: CompetitorAnalysisProps) => {
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Create a unique query key for this analysis
  const cacheKey = [`competitor-analysis-${mainAnalysis.id || mainAnalysis.domain}`];
  
  // Fetch cached comparison data if it exists
  const { data: comparison, isLoading: isQueryLoading } = useQuery<ComparisonResult>({
    queryKey: cacheKey,
    // Don't actually fetch data, just use the query for caching
    enabled: false,
    staleTime: Infinity,
  });

  const form = useForm<CompetitorFormValues>({
    resolver: zodResolver(competitorSchema),
    defaultValues: {
      competitorDomain: ''
    }
  });
  
  // Use mutation for the competitor analysis request
  const competitorMutation = useMutation({
    mutationFn: (formData: CompetitorFormValues) => {
      return compareWithCompetitor({
        mainDomain: mainAnalysis.domain,
        competitorDomain: formData.competitorDomain
      });
    },
    onSuccess: (comparisonData, variables) => {
      console.log('Competitor analysis response:', comparisonData);
      
      // Extract details from main analysis
      const mainDetails = {
        titles: mainAnalysis.pages.slice(0, 5).map(page => page.title || '').filter(title => title),
        descriptions: mainAnalysis.pages.slice(0, 5).map(page => page.metaDescription || '').filter(desc => desc),
        headings: mainAnalysis.pages.slice(0, 5).flatMap(page => 
          page.headings.slice(0, 3).map(h => `${h.level}: ${h.text}`)),
        images: mainAnalysis.pages.reduce((total, page) => total + page.images.length, 0),
        pages: mainAnalysis.pages.length
      };
      
      // Extract details from competitor analysis response
      const competitorPages = comparisonData.analysis?.pages || [];
      const competitorDetails = {
        titles: competitorPages.slice(0, 5).map((page: any) => page.title || '').filter((title: string) => title),
        descriptions: competitorPages.slice(0, 5).map((page: any) => page.metaDescription || '').filter((desc: string) => desc),
        headings: competitorPages.slice(0, 5).flatMap((page: any) => 
          page.headings?.slice(0, 3).map((h: any) => `${h.level}: ${h.text}`) || []),
        images: competitorPages.reduce((total: number, page: any) => total + (page.images?.length || 0), 0),
        pages: competitorPages.length
      };
      
      // Add details to the comparison data
      const enhancedComparisonData = {
        ...comparisonData,
        details: {
          main: mainDetails,
          competitor: competitorDetails
        }
      };
      
      // Update the cache with enhanced comparison data
      queryClient.setQueryData(cacheKey, enhancedComparisonData);
      
      toast({
        title: 'Analysis Complete',
        description: `Successfully compared ${mainAnalysis.domain} with ${variables.competitorDomain}`,
      });
    },
    onError: (error: any) => {
      console.error('Competitor analysis error:', error);
      const errorMessage = error.message || 'Failed to compare with competitor. Please try again.';
      
      setError(errorMessage);
      toast({
        title: 'Analysis Failed',
        description: 'Could not compare with competitor domain. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const onSubmit = (data: CompetitorFormValues) => {
    setError(null);
    
    // Log the request details
    console.log('Starting competitor analysis for:', {
      mainDomain: mainAnalysis.domain,
      competitorDomain: data.competitorDomain
    });
    
    // Extract details from the main analysis for detailed comparison
    const extractDetailsFromMainAnalysis = () => {
      return {
        titles: mainAnalysis.pages.slice(0, 5).map(page => page.title || '').filter(title => title),
        descriptions: mainAnalysis.pages.slice(0, 5).map(page => page.metaDescription || '').filter(desc => desc),
        headings: mainAnalysis.pages.slice(0, 5).flatMap(page => 
          page.headings.slice(0, 3).map(h => `${h.level}: ${h.text}`)),
        images: mainAnalysis.pages.reduce((total, page) => total + page.images.length, 0),
        pages: mainAnalysis.pages.length
      };
    };
    
    competitorMutation.mutate(data);
  };

  // Helper function to determine if a metric is better or worse than competitor
  const getMetricStatus = (difference: number) => {
    if (difference > 5) return 'better';
    if (difference < -5) return 'worse';
    return 'similar';
  };

  // Special handling for critical issues where lower is better
  const getCriticalIssuesStatus = (difference: number) => {
    // For critical issues, a positive difference means we have FEWER issues (good)
    if (difference > 0) return 'better';
    if (difference < 0) return 'worse';
    return 'similar';
  };

  const renderMetricComparison = (
    title: string, 
    metric: ComparisonMetric, 
    statusFn: (diff: number) => string = getMetricStatus
  ) => {
    const status = statusFn(metric.difference);
    
    return (
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <h4 className="font-medium">{title}</h4>
          <div className="flex items-center">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
              status === 'better' ? 'bg-green-500' : 
              status === 'worse' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`}></span>
            <span className={
              status === 'better' ? 'text-green-600' : 
              status === 'worse' ? 'text-red-600' : 
              'text-yellow-600'
            }>
              {status === 'better' ? 'Better than competitor' : 
               status === 'worse' ? 'Needs improvement' : 
               'Similar to competitor'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium">Your Site:</div>
            <Progress value={metric.main} className="h-2" />
            <div className="text-sm font-medium">{Math.round(metric.main)}%</div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium">Competitor:</div>
            <Progress value={metric.competitor} className="h-2" />
            <div className="text-sm font-medium">{Math.round(metric.competitor)}%</div>
          </div>
        </div>
      </div>
    );
  };

  // Function to reset the comparison and start a new one
  const resetComparison = () => {
    queryClient.removeQueries({ queryKey: cacheKey });
    form.reset();
  };

  // Check if either the query is loading or the mutation is pending
  const isLoading = isQueryLoading || competitorMutation.isPending;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Competitor Analysis</CardTitle>
        <CardDescription>
          Compare your site against a competitor to identify SEO advantages and opportunities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!comparison ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="competitorDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competitor Domain</FormLabel>
                    <FormControl>
                      <Input placeholder="competitor.com" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Analyzing...' : 'Compare with Competitor'}
              </Button>
            </form>
          </Form>
        ) : (
          <Tabs defaultValue="metrics">
            <TabsList className="mb-4">
              <TabsTrigger value="metrics">Metrics Comparison</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Comparison</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="metrics" className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <div className="font-bold">{(comparison as ComparisonResult).mainDomain}</div>
                <div className="text-sm text-muted-foreground">vs</div>
                <div className="font-bold">{(comparison as ComparisonResult).competitorDomain}</div>
              </div>
              
              {renderMetricComparison('Title Optimization', (comparison as ComparisonResult).metrics.titleOptimization)}
              {renderMetricComparison('Meta Description', (comparison as ComparisonResult).metrics.descriptionOptimization)}
              {renderMetricComparison('Heading Structure', (comparison as ComparisonResult).metrics.headingsOptimization)}
              {renderMetricComparison('Image Optimization', (comparison as ComparisonResult).metrics.imagesOptimization)}
              {renderMetricComparison('Critical Issues', (comparison as ComparisonResult).metrics.criticalIssues, getCriticalIssuesStatus)}
              
              <Button variant="outline" onClick={() => resetComparison()} className="mt-4">
                Compare with Another Competitor
              </Button>
            </TabsContent>
            
            <TabsContent value="detailed" className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <div className="font-bold">{(comparison as ComparisonResult).mainDomain}</div>
                <div className="text-sm text-muted-foreground">vs</div>
                <div className="font-bold">{(comparison as ComparisonResult).competitorDomain}</div>
              </div>
              
              {(comparison as ComparisonResult).details ? (
                <div className="space-y-6">
                  {/* Page Count Comparison */}
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="text-lg font-semibold mb-2">Page Count</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <span className="text-2xl font-bold">{(comparison as ComparisonResult).details?.main?.pages || 0}</span>
                        <p className="text-sm text-muted-foreground mt-1">Your Site</p>
                      </div>
                      <div className="text-center">
                        <span className="text-2xl font-bold">{(comparison as ComparisonResult).details?.competitor?.pages || 0}</span>
                        <p className="text-sm text-muted-foreground mt-1">Competitor Site</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Titles Comparison */}
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="text-lg font-semibold mb-2">Page Titles (Sample)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Your Titles:</h4>
                        <ul className="space-y-2 text-sm">
                          {(comparison as ComparisonResult).details?.main?.titles?.length ? 
                            (comparison as ComparisonResult).details?.main?.titles.map((title: string, i: number) => (
                              <li key={`main-title-${i}`} className="border-b pb-1">{title}</li>
                            )) : 
                            <li className="text-muted-foreground">No titles available</li>
                          }
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Competitor Titles:</h4>
                        <ul className="space-y-2 text-sm">
                          {(comparison as ComparisonResult).details?.competitor?.titles?.length ? 
                            (comparison as ComparisonResult).details?.competitor?.titles.map((title: string, i: number) => (
                              <li key={`comp-title-${i}`} className="border-b pb-1">{title}</li>
                            )) : 
                            <li className="text-muted-foreground">No titles available</li>
                          }
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Meta Descriptions Comparison */}
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="text-lg font-semibold mb-2">Meta Descriptions (Sample)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Your Descriptions:</h4>
                        <ul className="space-y-2 text-sm">
                          {(comparison as ComparisonResult).details?.main?.descriptions?.length ? 
                            (comparison as ComparisonResult).details?.main?.descriptions.map((desc: string, i: number) => (
                              <li key={`main-desc-${i}`} className="border-b pb-1">{desc}</li>
                            )) : 
                            <li className="text-muted-foreground">No descriptions available</li>
                          }
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Competitor Descriptions:</h4>
                        <ul className="space-y-2 text-sm">
                          {(comparison as ComparisonResult).details?.competitor?.descriptions?.length ? 
                            (comparison as ComparisonResult).details?.competitor?.descriptions.map((desc: string, i: number) => (
                              <li key={`comp-desc-${i}`} className="border-b pb-1">{desc}</li>
                            )) : 
                            <li className="text-muted-foreground">No descriptions available</li>
                          }
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Headings Comparison */}
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="text-lg font-semibold mb-2">Heading Structure (Sample)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Your Headings:</h4>
                        <ul className="space-y-2 text-sm">
                          {(comparison as ComparisonResult).details?.main?.headings?.length ? 
                            (comparison as ComparisonResult).details?.main?.headings.map((heading: string, i: number) => (
                              <li key={`main-heading-${i}`} className="border-b pb-1">{heading}</li>
                            )) : 
                            <li className="text-muted-foreground">No headings available</li>
                          }
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Competitor Headings:</h4>
                        <ul className="space-y-2 text-sm">
                          {(comparison as ComparisonResult).details?.competitor?.headings?.length ? 
                            (comparison as ComparisonResult).details?.competitor?.headings.map((heading: string, i: number) => (
                              <li key={`comp-heading-${i}`} className="border-b pb-1">{heading}</li>
                            )) : 
                            <li className="text-muted-foreground">No headings available</li>
                          }
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Images Count Comparison */}
                  <div className="border rounded-lg p-4 bg-card">
                    <h3 className="text-lg font-semibold mb-2">Image Count</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <span className="text-2xl font-bold">{(comparison as ComparisonResult).details?.main?.images || 0}</span>
                        <p className="text-sm text-muted-foreground mt-1">Your Site</p>
                      </div>
                      <div className="text-center">
                        <span className="text-2xl font-bold">{(comparison as ComparisonResult).details?.competitor?.images || 0}</span>
                        <p className="text-sm text-muted-foreground mt-1">Competitor Site</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg">Detailed data not available</h3>
                  <p className="text-muted-foreground">
                    Cannot retrieve detailed comparison data.
                  </p>
                </div>
              )}
              
              <Button variant="outline" onClick={() => resetComparison()} className="mt-4">
                Compare with Another Competitor
              </Button>
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-4">
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>SEO Recommendations</AlertTitle>
                <AlertDescription>
                  Based on our comparison with {(comparison as ComparisonResult).competitorDomain}, here are some actionable recommendations:
                </AlertDescription>
              </Alert>
              
              {(comparison as ComparisonResult).recommendations.length > 0 ? (
                <ul className="space-y-2 mt-4">
                  {(comparison as ComparisonResult).recommendations.map((recommendation: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <ChevronRight className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg">Good job!</h3>
                  <p className="text-muted-foreground">
                    Your site is performing well compared to this competitor. Keep up the good work!
                  </p>
                </div>
              )}
              
              <Button variant="outline" onClick={() => resetComparison()} className="mt-4">
                Compare with Another Competitor
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default CompetitorAnalysis;