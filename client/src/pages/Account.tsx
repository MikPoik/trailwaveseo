import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { User, BarChart3, CheckCircle, AlertCircle, Coins, Calendar, Link } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { useEffect } from "react";

interface UserUsage {
  pagesAnalyzed: number;
  pageLimit: number;
  credits: number;
  freeScansUsed: number;
  freeScansResetDate: string | null;
}

const Account = () => {
  const { user } = useAuth();

  const { data: usage, isLoading, refetch } = useQuery<UserUsage>({
    queryKey: ['/api/user/usage'],
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale to ensure fresh data
  });

  // Refetch usage when the page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, refetch]);

  // Listen for analysis completion events to refetch usage
  useEffect(() => {
    const handleAnalysisComplete = () => {
      if (user) {
        // Small delay to ensure the backend has updated the usage count
        setTimeout(() => {
          refetch();
        }, 1000);
      }
    };

    // Listen for custom events that might be dispatched when analysis completes
    window.addEventListener('analysisComplete', handleAnalysisComplete);
    
    return () => {
      window.removeEventListener('analysisComplete', handleAnalysisComplete);
    };
  }, [user, refetch]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your account information...</p>
          </div>
        </div>
      </div>
    );
  }

  const isUnlimited = usage ? usage.pageLimit === -1 : false;
  const usagePercentage = usage && !isUnlimited ? Math.round((usage.pagesAnalyzed / usage.pageLimit) * 100) : 0;
  const remainingPages = usage && !isUnlimited ? Math.max(0, usage.pageLimit - usage.pagesAnalyzed) : Infinity;

  return (
    <div className="container mx-auto px-4 py-8">
      <Header
        title="Account Overview"
        description="View your current usage and account information"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-8">
        {/* User Profile Card */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
            <User className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user?.profileImageUrl && (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full mx-auto"
                />
              )}
              <div className="text-center">
                <p className="text-lg font-semibold">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || 'User'}
                </p>
                {user?.email && (
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits Card */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <Coins className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                {usage?.credits || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                Available credits for premium features
              </p>
              <a href="/credits" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                <Link className="h-3 w-3 mr-1" />
                Purchase Credits
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Free Scans Card */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Scans</CardTitle>
            <Calendar className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {usage ? Math.max(0, 3 - (usage.freeScansUsed || 0)) : 3} / 3
              </div>
              <Progress 
                value={usage ? ((usage.freeScansUsed || 0) / 3) * 100 : 0} 
                className="w-full" 
              />
              <p className="text-xs text-muted-foreground">
                Free scans available for new users
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Usage Overview Card */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Analysis Usage</CardTitle>
            <BarChart3 className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-2xl font-bold">
                {usage?.pagesAnalyzed || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Total pages analyzed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            {isUnlimited || remainingPages > 0 ? (
              <CheckCircle className="h-4 w-4 ml-auto text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 ml-auto text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={isUnlimited || remainingPages > 0 ? "default" : "destructive"}>
                  {isUnlimited ? "Unlimited" : (remainingPages > 0 ? "Active" : "Limit Reached")}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Remaining</span>
                <span className="font-semibold">
                  {isUnlimited ? "Unlimited" : `${remainingPages} pages`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Usage Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Usage Details</CardTitle>
          <CardDescription>
            Your page analysis usage for the current period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Plan</h4>
              <p className="text-sm text-muted-foreground">
                {isUnlimited 
                  ? "You have unlimited access to analyze pages."
                  : `You have access to analyze up to ${usage?.pageLimit || 5} pages.`
                }
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Usage Progress</h4>
              <div className="flex items-center space-x-2">
                <Progress value={usagePercentage} className="flex-1" />
                <span className="text-sm font-medium">{usagePercentage}%</span>
              </div>
            </div>
          </div>

          {remainingPages === 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    Usage Limit Reached
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have analyzed all {usage?.pageLimit} pages in your current plan. 
                    To analyze more pages, please contact support or wait for your usage to reset.
                  </p>
                </div>
              </div>
            </div>
          )}

          {remainingPages > 0 && remainingPages <= 2 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">
                    Running Low on Pages
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    You have {remainingPages} page{remainingPages === 1 ? '' : 's'} remaining in your current plan.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Account;