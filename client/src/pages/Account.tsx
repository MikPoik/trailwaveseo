import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User as UserIcon, BarChart3, CheckCircle, AlertCircle, Coins, Calendar, Link, CreditCard, Check, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { useEffect, useState } from "react";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserUsage {
  pagesAnalyzed: number;
  pageLimit: number;
  credits: number;
  accountStatus: string;
}

interface CreditPackage {
  id: string;
  credits: number;
  name: string;
  priceDisplay: string;
}

interface UserCredits {
  credits: number;
  accountStatus: string;
}

const Account = () => {
  const { user } = useAuth();
  const typedUser = user as User | null | undefined;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);

  const { data: usage, isLoading, refetch } = useQuery<UserUsage>({
    queryKey: ['/api/user/usage'],
    enabled: !!typedUser,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale to ensure fresh data
  });

  // Fetch available credit packages
  const { data: packages, isLoading: packagesLoading } = useQuery<CreditPackage[]>({
    queryKey: ['/api/payments/packages'],
  });

  // Fetch user's current credits (for detailed credit info)
  const { data: userCredits, isLoading: creditsLoading } = useQuery<UserCredits>({
    queryKey: ['/api/payments/credits'],
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: async (packageType: string) => {
      setProcessingPackage(packageType);
      const response = await apiRequest("POST", "/api/payments/create-checkout-session", { packageType });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.url;
    },
    onError: (error: any) => {
      setProcessingPackage(null);
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      console.error("Checkout session creation failed:", error);
    },
  });

  const handlePurchaseClick = (pkg: CreditPackage) => {
    createCheckoutMutation.mutate(pkg.id);
  };

  const getAccountStatusDisplay = () => {
    if (!usage) return "Loading...";
    return usage.accountStatus === "trial" ? "Trial Account" : "Paid Account";
  };

  // Refetch usage when the page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && typedUser) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [typedUser, refetch]);

  // Listen for analysis completion events to refetch usage
  useEffect(() => {
    const handleAnalysisComplete = () => {
      if (typedUser) {
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
  }, [typedUser, refetch]);

  if (isLoading || packagesLoading || creditsLoading) {
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
            <UserIcon className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typedUser?.profileImageUrl && (
                <img
                  src={typedUser.profileImageUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full mx-auto"
                />
              )}
              <div className="text-center">
                <p className="text-lg font-semibold">
                  {typedUser?.firstName && typedUser?.lastName
                    ? `${typedUser.firstName} ${typedUser.lastName}`
                    : typedUser?.email || 'User'}
                </p>
                {typedUser?.email && (
                  <p className="text-sm text-muted-foreground">{typedUser.email}</p>
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
            </div>
          </CardContent>
        </Card>

        {/* Account Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <UserIcon className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`text-2xl font-bold ${usage?.accountStatus === "trial" ? "text-purple-600" : "text-green-600"}`}>
                {getAccountStatusDisplay()}
              </div>
              <p className="text-xs text-muted-foreground">
                {usage?.accountStatus === "trial" 
                  ? "Lite scans: 3 pages max, 5 suggestions per page" 
                  : "Full scans: unlimited pages, all suggestions"}
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

        
      </div>

      

      {/* Purchase Credits Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Purchase Credits
          </CardTitle>
          <CardDescription>
            Unlock advanced AI-powered SEO suggestions and unlimited website scans
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Enhanced Current Credits Display */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Your Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {userCredits?.credits || usage?.credits || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Available Credits</p>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${usage?.accountStatus === "trial" ? "text-purple-600" : "text-green-600"}`}>
                    {getAccountStatusDisplay()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {usage?.accountStatus === "trial" 
                      ? "Lite scans: 3 pages max" 
                      : "Full scans: unlimited"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Packages */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {packages?.map((pkg) => (
              <Card key={pkg.id} className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                {pkg.id === 'pro' && (
                  <Badge className="absolute top-4 right-4 bg-blue-600">
                    Most Popular
                  </Badge>
                )}
                {pkg.id === 'business' && (
                  <Badge className="absolute top-4 right-4 bg-purple-600">
                    Best Value
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">{pkg.priceDisplay}</div>
                    <div className="text-lg text-muted-foreground">
                      {pkg.credits} Credits
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ~${(Number(pkg.priceDisplay.replace('$', '')) / pkg.credits).toFixed(3)} per credit
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{Math.floor(pkg.credits / 5)} additional website scans</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{pkg.credits} AI-powered suggestions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Unlimited pages per scan</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Advanced competitor analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Priority support</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handlePurchaseClick(pkg)}
                    disabled={processingPackage === pkg.id}
                    className="w-full"
                    size="lg"
                  >
                    {processingPackage === pkg.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Purchase Credits
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How Credits Work Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            How Credits Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Website Scans</h4>
              <p className="text-sm text-muted-foreground">
                Each additional website scan costs 5 credits. Free users get 3 scans total.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">AI Suggestions</h4>
              <p className="text-sm text-muted-foreground">
                AI-powered suggestions cost 1 credit per page. Content duplication analysis costs 1 credit per scan.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">No Expiration</h4>
              <p className="text-sm text-muted-foreground">
                Credits never expire and can be used whenever you need them.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Secure Payment</h4>
              <p className="text-sm text-muted-foreground">
                All payments are processed securely through Stripe with bank-level encryption.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Account;