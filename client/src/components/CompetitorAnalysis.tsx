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
import { compareWithCompetitor, saveCompetitorAnalysis } from '@/lib/api';
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

interface MetricComparison {
  main: number;
  competitor: number;
  difference: number;
  percentageDiff: number;
  advantage: 'main' | 'competitor' | 'neutral';
  significance: 'critical' | 'important' | 'minor';
}

interface CompetitorInsight {
  category: string;
  priority: 'high' | 'medium' | 'low';
  impact: number;
  recommendation: string;
  evidence: string[];
  actionItems: string[];
}

interface ContentGapAnalysis {
  missingTopics: string[];
  underOptimizedAreas: string[];
  opportunityKeywords: string[];
  contentVolumeGaps: {
    area: string;
    mainCount: number;
    competitorCount: number;
    gap: number;
  }[];
}

interface StrategyAnalysis {
  mainApproach: string;
  competitorApproach: string;
  effectiveness: 'superior' | 'comparable' | 'inferior';
  recommendations: string[];
}

interface StrategyComparison {
  contentStrategy: StrategyAnalysis;
  keywordStrategy: StrategyAnalysis;
  technicalStrategy: StrategyAnalysis;
  userExperience: StrategyAnalysis;
}

interface CompetitiveSummary {
  overallAdvantage: 'main' | 'competitor' | 'neutral';
  strengthAreas: string[];
  weaknessAreas: string[];
  quickWins: string[];
  longTermOpportunities: string[];
}

interface ProcessingStats {
  analysisTime: number;
  tokensUsed: number;
  aiCallsMade: number;
  confidence: number;
}

interface ComparisonResult {
  mainDomain: string;
  competitorDomain: string;
  metrics: {
    titleOptimization: MetricComparison;
    descriptionOptimization: MetricComparison;
    headingsOptimization: MetricComparison;
    imagesOptimization: MetricComparison;
    criticalIssues: MetricComparison;
    technicalSEO: MetricComparison;
    contentQuality: MetricComparison;
  };
  gaps?: ContentGapAnalysis;
  strategies?: StrategyComparison;
  detailedInsights?: CompetitorInsight[];  // Backend uses 'detailedInsights'
  competitiveSummary?: CompetitiveSummary; // Backend uses 'competitiveSummary'
  stats?: ProcessingStats;                 // Backend uses 'stats'
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
        titles: mainAnalysis.pages.slice(0, 10).map(page => page.title || '').filter(title => title),
        descriptions: mainAnalysis.pages.slice(0, 10).map(page => page.metaDescription || '').filter(desc => desc),
        headings: mainAnalysis.pages.slice(0, 10).flatMap(page => 
          page.headings.slice(0, 5).map(h => `${h.level}: ${h.text}`)),
        images: mainAnalysis.pages.reduce((total, page) => total + page.images.length, 0),
        pages: mainAnalysis.pages.length
      };
      
      // Extract details from competitor analysis response
      const competitorPages = comparisonData.analysis?.pages || [];
      const competitorDetails = {
        titles: competitorPages.slice(0, 10).map((page: any) => page.title || '').filter((title: string) => title),
        descriptions: competitorPages.slice(0, 10).map((page: any) => page.metaDescription || '').filter((desc: string) => desc),
        headings: competitorPages.slice(0, 10).flatMap((page: any) => 
          page.headings?.slice(0, 5).map((h: any) => `${h.level}: ${h.text}`) || []),
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
      
      // Save the competitor analysis data to the database if we have an analysis ID
      if (mainAnalysis.id) {
        // Save the competitor analysis data to the database
        console.log(`Attempting to save competitor analysis for ${mainAnalysis.domain} vs ${variables.competitorDomain}`);
        saveCompetitorAnalysis(mainAnalysis.id, enhancedComparisonData)
          .then((result) => {
            console.log('Competitor analysis saved to database:', result);
            // Invalidate the analysis cache to force a refresh
            queryClient.invalidateQueries({queryKey: [`/api/analysis/${mainAnalysis.id}`]});
            
            // Show success toast
            toast({
              title: 'Analysis Saved',
              description: `Competitor analysis with ${variables.competitorDomain} was saved successfully`,
            });
          })
          .catch(error => {
            console.error('Error saving competitor analysis:', error);
            
            // Show error toast
            toast({
              title: 'Save Failed',
              description: 'Could not save competitor analysis. Please try again.',
              variant: 'destructive'
            });
          });
      } else {
        console.warn('Cannot save competitor analysis: Analysis ID is missing');
      }
      
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

  // Enhanced status function that uses the modular system's advantage data
  const getMetricStatus = (metric: MetricComparison) => {
    return metric.advantage === 'main' ? 'better' : 
           metric.advantage === 'competitor' ? 'worse' : 'similar';
  };

  // Get significance badge styling
  const getSignificanceBadge = (significance: string) => {
    return significance === 'critical' ? 'bg-red-100 text-red-800' :
           significance === 'important' ? 'bg-yellow-100 text-yellow-800' :
           'bg-gray-100 text-gray-800';
  };

  const renderMetricComparison = (
    title: string, 
    metric: MetricComparison
  ) => {
    const status = getMetricStatus(metric);
    
    return (
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium">{title}</h4>
            <span className={`px-2 py-1 text-xs rounded-full ${
              getSignificanceBadge(metric.significance)
            }`}>
              {metric.significance}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-block w-3 h-3 rounded-full ${
              status === 'better' ? 'bg-green-500' : 
              status === 'worse' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`}></span>
            <span className={`text-sm font-medium ${
              status === 'better' ? 'text-green-600' : 
              status === 'worse' ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {status === 'better' ? 'Better' : 
               status === 'worse' ? 'Needs work' : 
               'Similar'}
            </span>
            <span className="text-xs text-muted-foreground">({metric.percentageDiff > 0 ? '+' : ''}{metric.percentageDiff}%)</span>
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
            <TabsList className="mb-4 grid grid-cols-2 md:grid-cols-6">
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="gaps">Content Gaps</TabsTrigger>
              <TabsTrigger value="strategies">Strategies</TabsTrigger>
              <TabsTrigger value="detailed">Details</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
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
              {renderMetricComparison('Critical Issues', (comparison as ComparisonResult).metrics.criticalIssues)}
              {renderMetricComparison('Technical SEO', (comparison as ComparisonResult).metrics.technicalSEO)}
              {renderMetricComparison('Content Quality', (comparison as ComparisonResult).metrics.contentQuality)}
              
              {(comparison as ComparisonResult).stats && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span>Analysis Confidence:</span>
                    <span className="font-medium">{(comparison as ComparisonResult).stats?.confidence}%</span>
                  </div>
                  <Progress value={(comparison as ComparisonResult).stats?.confidence || 0} className="h-2 mt-2" />
                </div>
              )}
              
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
                        <ul className="space-y-2 text-sm max-h-60 overflow-y-auto pr-2">
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
                        <ul className="space-y-2 text-sm max-h-60 overflow-y-auto pr-2">
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
                        <ul className="space-y-2 text-sm max-h-60 overflow-y-auto pr-2">
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
                        <ul className="space-y-2 text-sm max-h-60 overflow-y-auto pr-2">
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
                        <ul className="space-y-2 text-sm max-h-60 overflow-y-auto pr-2">
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
                        <ul className="space-y-2 text-sm max-h-60 overflow-y-auto pr-2">
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
            
            {/* AI Insights Tab */}
            <TabsContent value="insights" className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">AI-Powered Competitive Insights</h3>
                {(comparison as ComparisonResult).stats && (
                  <div className="text-sm text-muted-foreground">
                    {(comparison as ComparisonResult).stats?.confidence}% confidence
                  </div>
                )}
              </div>
              
              {(comparison as ComparisonResult).detailedInsights && (comparison as ComparisonResult).detailedInsights?.length > 0 ? (
                <div className="space-y-4">
                  {(comparison as ComparisonResult).detailedInsights.map((insight: CompetitorInsight, index: number) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{insight.category}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              insight.priority === 'high' ? 'bg-red-100 text-red-800' :
                              insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {insight.priority} priority
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-muted-foreground">Impact:</span>
                            <span className="text-sm font-medium">{insight.impact}/10</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{insight.recommendation}</p>
                        
                        {insight.evidence && insight.evidence.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-xs font-medium text-muted-foreground mb-1">Evidence:</h5>
                            <ul className="text-xs space-y-1">
                              {insight.evidence.slice(0, 3).map((evidence: string, i: number) => (
                                <li key={i} className="flex items-start">
                                  <span className="text-primary mr-1">•</span>
                                  <span>{evidence}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {insight.actionItems && insight.actionItems.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1">Action Items:</h5>
                            <ul className="text-xs space-y-1">
                              {insight.actionItems.slice(0, 3).map((action: string, i: number) => (
                                <li key={i} className="flex items-start">
                                  <ChevronRight className="h-3 w-3 text-primary mr-1 mt-0.5 shrink-0" />
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <InfoIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg">No AI insights available</h3>
                  <p className="text-muted-foreground">
                    AI-powered insights were not generated for this comparison.
                  </p>
                </div>
              )}
              
              <Button variant="outline" onClick={() => resetComparison()} className="mt-4">
                Compare with Another Competitor
              </Button>
            </TabsContent>
            
            {/* Content Gaps Tab */}
            <TabsContent value="gaps" className="space-y-4">
              <h3 className="text-xl font-semibold mb-6">Content Gap Analysis</h3>
              
              {(comparison as ComparisonResult).gaps ? (
                <div className="space-y-6">
                  {/* Missing Topics */}
                  {(comparison as ComparisonResult).gaps?.missingTopics && (comparison as ComparisonResult).gaps?.missingTopics.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Missing Topics</CardTitle>
                        <CardDescription>Topics your competitor covers that you don't</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2">
                          {(comparison as ComparisonResult).gaps?.missingTopics.map((topic: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <span className="text-sm">{topic}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Under-optimized Areas */}
                  {(comparison as ComparisonResult).gaps?.underOptimizedAreas && (comparison as ComparisonResult).gaps?.underOptimizedAreas.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Under-optimized Areas</CardTitle>
                        <CardDescription>Areas where you could improve compared to competitor</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2">
                          {(comparison as ComparisonResult).gaps?.underOptimizedAreas.map((area: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">{area}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Opportunity Keywords */}
                  {(comparison as ComparisonResult).gaps?.opportunityKeywords && (comparison as ComparisonResult).gaps?.opportunityKeywords.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Opportunity Keywords</CardTitle>
                        <CardDescription>Keywords your competitor targets that you could explore</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {(comparison as ComparisonResult).gaps?.opportunityKeywords.map((keyword: string, index: number) => (
                            <span key={index} className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <InfoIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg">No gap analysis available</h3>
                  <p className="text-muted-foreground">
                    Content gap analysis was not generated for this comparison.
                  </p>
                </div>
              )}
              
              <Button variant="outline" onClick={() => resetComparison()} className="mt-4">
                Compare with Another Competitor
              </Button>
            </TabsContent>
            
            {/* Strategies Tab */}
            <TabsContent value="strategies" className="space-y-4">
              <h3 className="text-xl font-semibold mb-6">Strategy Comparison</h3>
              
              {(comparison as ComparisonResult).strategies ? (
                <div className="space-y-6">
                  {Object.entries((comparison as ComparisonResult).strategies || {}).map(([strategyKey, strategy]) => {
                    const typedStrategy = strategy as StrategyAnalysis;
                    return (
                    <Card key={strategyKey}>
                      <CardHeader>
                        <CardTitle className="text-lg capitalize">{strategyKey.replace(/([A-Z])/g, ' $1').trim()}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            typedStrategy.effectiveness === 'superior' ? 'bg-green-100 text-green-800' :
                            typedStrategy.effectiveness === 'comparable' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {typedStrategy.effectiveness}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h5 className="font-medium text-sm mb-2">Your Approach:</h5>
                            <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded">{typedStrategy.mainApproach}</p>
                          </div>
                          <div>
                            <h5 className="font-medium text-sm mb-2">Competitor's Approach:</h5>
                            <p className="text-sm text-muted-foreground bg-orange-50 p-3 rounded">{typedStrategy.competitorApproach}</p>
                          </div>
                        </div>
                        
                        {typedStrategy.recommendations && typedStrategy.recommendations.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-2">Recommendations:</h5>
                            <ul className="space-y-1">
                              {typedStrategy.recommendations.map((rec: string, index: number) => (
                                <li key={index} className="flex items-start text-sm">
                                  <ChevronRight className="h-4 w-4 text-primary mr-1 mt-0.5 shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <InfoIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg">No strategy analysis available</h3>
                  <p className="text-muted-foreground">
                    Strategy comparison was not generated for this analysis.
                  </p>
                </div>
              )}
              
              <Button variant="outline" onClick={() => resetComparison()} className="mt-4">
                Compare with Another Competitor
              </Button>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <h3 className="text-xl font-semibold mb-6">Competitive Summary</h3>
              
              {(comparison as ComparisonResult).competitiveSummary ? (
                <div className="space-y-6">
                  {/* Overall Advantage */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                          (comparison as ComparisonResult).competitiveSummary?.overallAdvantage === 'main' ? 'bg-green-100 text-green-800' :
                          (comparison as ComparisonResult).competitiveSummary?.overallAdvantage === 'competitor' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(comparison as ComparisonResult).competitiveSummary?.overallAdvantage === 'main' ? 
                            `Your site has the overall advantage` :
                           (comparison as ComparisonResult).competitiveSummary?.overallAdvantage === 'competitor' ?
                            `Competitor has the overall advantage` :
                            `Both sites are competitive`}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Strengths and Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-green-700">Your Strengths</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(comparison as ComparisonResult).competitiveSummary?.strengthAreas && (comparison as ComparisonResult).competitiveSummary?.strengthAreas.length > 0 ? (
                          <ul className="space-y-2">
                            {(comparison as ComparisonResult).competitiveSummary?.strengthAreas.map((strength: string, index: number) => (
                              <li key={index} className="flex items-start text-sm">
                                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No specific strengths identified</p>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-red-700">Areas for Improvement</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(comparison as ComparisonResult).competitiveSummary?.weaknessAreas && (comparison as ComparisonResult).competitiveSummary?.weaknessAreas.length > 0 ? (
                          <ul className="space-y-2">
                            {(comparison as ComparisonResult).competitiveSummary?.weaknessAreas.map((weakness: string, index: number) => (
                              <li key={index} className="flex items-start text-sm">
                                <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 shrink-0" />
                                <span>{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No specific weaknesses identified</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Quick Wins and Long-term Opportunities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-blue-700">Quick Wins</CardTitle>
                        <CardDescription>Easy improvements you can make right away</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(comparison as ComparisonResult).competitiveSummary?.quickWins && (comparison as ComparisonResult).competitiveSummary?.quickWins.length > 0 ? (
                          <ul className="space-y-2">
                            {(comparison as ComparisonResult).competitiveSummary?.quickWins.map((win: string, index: number) => (
                              <li key={index} className="flex items-start text-sm">
                                <ChevronRight className="h-4 w-4 text-blue-500 mr-2 mt-0.5 shrink-0" />
                                <span>{win}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No quick wins identified</p>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-purple-700">Long-term Opportunities</CardTitle>
                        <CardDescription>Strategic improvements for sustained advantage</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(comparison as ComparisonResult).competitiveSummary?.longTermOpportunities && (comparison as ComparisonResult).competitiveSummary?.longTermOpportunities.length > 0 ? (
                          <ul className="space-y-2">
                            {(comparison as ComparisonResult).competitiveSummary?.longTermOpportunities.map((opportunity: string, index: number) => (
                              <li key={index} className="flex items-start text-sm">
                                <ChevronRight className="h-4 w-4 text-purple-500 mr-2 mt-0.5 shrink-0" />
                                <span>{opportunity}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No long-term opportunities identified</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <InfoIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg">No summary analysis available</h3>
                  <p className="text-muted-foreground">
                    Competitive summary was not generated for this analysis.
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