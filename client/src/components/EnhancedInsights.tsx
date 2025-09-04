import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  FileText, 
  Network, 
  Zap,
  CheckCircle,
  AlertTriangle,
  AlertCircle 
} from "lucide-react";
import { EnhancedInsights as EnhancedInsightsType } from "@/lib/types";

interface EnhancedInsightsProps {
  insights: EnhancedInsightsType;
}

const EnhancedInsights = ({ insights }: EnhancedInsightsProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 85) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (score >= 70) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const analysisCategories = [
    {
      title: "Technical SEO",
      icon: <Shield className="h-6 w-6" />,
      data: insights.technicalAnalysis,
      description: "Core technical SEO elements and structure"
    },
    {
      title: "Content Quality", 
      icon: <FileText className="h-6 w-6" />,
      data: insights.contentQualityAnalysis,
      description: "Content optimization and user experience"
    },
    {
      title: "Link Architecture",
      icon: <Network className="h-6 w-6" />,
      data: insights.linkArchitectureAnalysis,
      description: "Internal linking structure and navigation"
    },
    {
      title: "Performance",
      icon: <Zap className="h-6 w-6" />,
      data: insights.performanceAnalysis,
      description: "Site speed and technical performance"
    }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Enhanced SEO Insights</CardTitle>
        <p className="text-sm text-gray-600">
          Advanced analysis powered by specialized SEO modules
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {analysisCategories.map((category) => {
            const score = category.data?.overallScore || 0;
            return (
              <div key={category.title} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={getScoreColor(score)}>
                      {category.icon}
                    </div>
                    <h4 className="font-medium text-sm">{category.title}</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getScoreIcon(score)}
                    <Badge className={`text-xs ${getScoreBadgeColor(score)}`}>
                      {score}/100
                    </Badge>
                  </div>
                </div>
                
                <Progress 
                  value={score} 
                  className="h-2 mb-2"
                />
                
                <p className="text-xs text-gray-600 leading-relaxed">
                  {category.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Detailed findings for each category */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analysisCategories.filter(cat => cat.data?.findings?.length > 0).map((category) => (
            <Card key={category.title} className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center space-x-2">
                  <div className={getScoreColor(category.data?.overallScore || 0)}>
                    {category.icon}
                  </div>
                  <span>{category.title} Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.data?.findings?.slice(0, 3).map((finding, idx) => (
                    <div key={idx} className="border-l-4 border-gray-200 pl-4">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="text-sm font-medium text-gray-900">
                          {finding.category}
                        </h5>
                        <Badge className={`text-xs ${getScoreBadgeColor(finding.score)}`}>
                          {finding.score}/100
                        </Badge>
                      </div>
                      {finding.issues?.length > 0 && (
                        <ul className="text-xs text-red-600 mb-2">
                          {finding.issues.slice(0, 2).map((issue, i) => (
                            <li key={i}>• {issue}</li>
                          ))}
                        </ul>
                      )}
                      {finding.recommendations?.length > 0 && (
                        <ul className="text-xs text-green-600">
                          {finding.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i}>• {rec}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  
                  {((category.data?.findings?.length || 0) > 3) && (
                    <p className="text-xs text-gray-500 italic">
                      +{(category.data?.findings?.length || 0) - 3} more findings...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedInsights;