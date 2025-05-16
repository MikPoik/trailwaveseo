import React, { useState } from 'react';
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
}

const CompetitorAnalysis = ({ mainAnalysis }: CompetitorAnalysisProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<CompetitorFormValues>({
    resolver: zodResolver(competitorSchema),
    defaultValues: {
      competitorDomain: ''
    }
  });

  const onSubmit = async (data: CompetitorFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Log the request details
      console.log('Starting competitor analysis for:', {
        mainDomain: mainAnalysis.domain,
        competitorDomain: data.competitorDomain
      });
      
      const comparisonData = await compareWithCompetitor({
        mainDomain: mainAnalysis.domain,
        competitorDomain: data.competitorDomain
      });
      
      console.log('Competitor analysis response:', comparisonData);
      setComparison(comparisonData);
      
      toast({
        title: 'Analysis Complete',
        description: `Successfully compared ${mainAnalysis.domain} with ${data.competitorDomain}`,
      });
    } catch (error: any) {
      // More detailed error logging
      console.error('Competitor analysis error:', error);
      const errorMessage = error.message || 'Failed to compare with competitor. Please try again.';
      
      setError(errorMessage);
      toast({
        title: 'Analysis Failed',
        description: 'Could not compare with competitor domain. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
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
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="metrics" className="space-y-4">
              <div className="flex justify-between items-center mb-6">
                <div className="font-bold">{comparison.mainDomain}</div>
                <div className="text-sm text-muted-foreground">vs</div>
                <div className="font-bold">{comparison.competitorDomain}</div>
              </div>
              
              {renderMetricComparison('Title Optimization', comparison.metrics.titleOptimization)}
              {renderMetricComparison('Meta Description', comparison.metrics.descriptionOptimization)}
              {renderMetricComparison('Heading Structure', comparison.metrics.headingsOptimization)}
              {renderMetricComparison('Image Optimization', comparison.metrics.imagesOptimization)}
              {renderMetricComparison('Critical Issues', comparison.metrics.criticalIssues, getCriticalIssuesStatus)}
              
              <Button variant="outline" onClick={() => setComparison(null)} className="mt-4">
                Compare with Another Competitor
              </Button>
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-4">
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>SEO Recommendations</AlertTitle>
                <AlertDescription>
                  Based on our comparison with {comparison.competitorDomain}, here are some actionable recommendations:
                </AlertDescription>
              </Alert>
              
              {comparison.recommendations.length > 0 ? (
                <ul className="space-y-2 mt-4">
                  {comparison.recommendations.map((recommendation, index) => (
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
              
              <Button variant="outline" onClick={() => setComparison(null)} className="mt-4">
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