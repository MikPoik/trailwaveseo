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
import type { RouteDefinition } from "@shared/route-metadata";
import { updateMetadata } from "@/lib/updateMetadata";

export const route: RouteDefinition = {
  path: "/account",
  ssr: false,
  metadata: {
    title: "Account – TrailWave SEO",
    description: "Manage your TrailWave SEO account, billing, and subscription.",
    canonical: "https://trailwaveseo.com/account",
  },
};

interface UserUsage {
  pagesAnalyzed: number;
  pageLimit: number;
  credits: number;
  accountStatus: string;
  chatMessagesInPack: number;
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

  useEffect(() => {
    if (route.metadata) {
      updateMetadata(route.metadata);
    }
  }, []);

  const { data: usage, isLoading, refetch } = useQuery<UserUsage>({
    queryKey: ['/api/user/usage'],
    enabled: !!typedUser,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: packages, isLoading: packagesLoading } = useQuery<CreditPackage[]>({
    queryKey: ['/api/payments/packages'],
  });

  const { data: userCredits, isLoading: creditsLoading } = useQuery<UserCredits>({
    queryKey: ['/api/payments/credits'],
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (packageType: string) => {
      setProcessingPackage(packageType);
      const response = await apiRequest("POST", "/api/payments/create-checkout-session", { packageType });
      return response.json();
    },
    onSuccess: (data) => {
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

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && typedUser) {
        refetch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [typedUser, refetch]);

  useEffect(() => {
    const handleAnalysisComplete = () => {
      if (typedUser) {
        setTimeout(() => {
          refetch();
        }, 1000);
      }
    };
    window.addEventListener('analysisComplete', handleAnalysisComplete);
    return () => {
      window.removeEventListener('analysisComplete', handleAnalysisComplete);
    };
  }, [typedUser, refetch]);

  if (isLoading || packagesLoading || creditsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading your account information...</p>
        </div>
      </div>
    );
  }

  const isUnlimited = usage ? usage.pageLimit === -1 : false;
  const usagePercentage = usage && !isUnlimited ? Math.round((usage.pagesAnalyzed / usage.pageLimit) * 100) : 0;
  const remainingPages = usage && !isUnlimited ? Math.max(0, usage.pageLimit - usage.pagesAnalyzed) : Infinity;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 w-full">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <Header
          title="Account Overview"
          description="View your current usage and account information"
        />

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-6 sm:mt-8">
          <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Profile</CardTitle>
                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-center">
                {typedUser?.profileImageUrl && (
                  <img src={typedUser.profileImageUrl} alt="Profile" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto shadow-md" />
                )}
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {typedUser?.firstName && typedUser?.lastName
                      ? `${typedUser.firstName} ${typedUser.lastName}`
                      : typedUser?.email || 'User'}
                  </p>
                  {typedUser?.email && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">{typedUser.email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-900/20 dark:to-purple-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Credits</CardTitle>
                <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-center">
                <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {usage?.credits || 0}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Available credits
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-pink-500/10 to-pink-500/5 dark:from-pink-900/20 dark:to-pink-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Account Status</CardTitle>
                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600 dark:text-pink-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-center">
                <div className={`text-sm sm:text-lg font-bold ${usage?.accountStatus === "trial" ? "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : "bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"}`}>
                  {getAccountStatusDisplay()}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {usage?.accountStatus === "trial"
                    ? "Lite: 3 pages"
                    : "Full: unlimited"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-900/20 dark:to-emerald-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Chat Pack</CardTitle>
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-center">
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {usage?.chatMessagesInPack || 0}/10
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((usage?.chatMessagesInPack || 0) / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 sm:mt-8 border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl text-slate-900 dark:text-white">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              Purchase Credits
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Purchase credits for scans, AI features, and more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {packages?.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={`relative overflow-hidden border-0 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 ${
                    pkg.id === 'pro' 
                      ? "bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-900/20 dark:to-purple-900/10 ring-2 ring-purple-400/50"
                      : "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50"
                  }`}
                >
                  {pkg.id === 'pro' && (
                    <Badge className="absolute top-3 right-3 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
                      Popular
                    </Badge>
                  )}
                  {pkg.id === 'business' && (
                    <Badge className="absolute top-3 right-3 text-xs bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-lg">
                      Best Value
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-3 pt-6 sm:pt-8">
                    <CardTitle className="text-lg sm:text-2xl text-slate-900 dark:text-white">{pkg.name}</CardTitle>
                    <div className="space-y-2 mt-3">
                      <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{pkg.priceDisplay}</div>
                      <div className="text-sm sm:text-lg text-slate-600 dark:text-slate-400 font-medium">
                        {pkg.credits} Credits
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        ~€{(Number(pkg.priceDisplay.replace('€', '')) / pkg.credits).toFixed(3)}/credit
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {pkg.credits} credits for all features
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">
                          Scans: 3-5 credits each
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300">AI suggestions: 1 credit/page</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handlePurchaseClick(pkg)}
                      disabled={processingPackage === pkg.id}
                      className={`w-full font-bold text-xs sm:text-sm ${
                        pkg.id === 'pro'
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                          : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg"
                      }`}
                    >
                      {processingPackage === pkg.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2 inline-block"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-3 w-3 inline" />
                          Purchase
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
