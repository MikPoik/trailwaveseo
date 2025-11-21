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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      <div className="container mx-auto px-4 py-8">
        <Header
          title="Account Overview"
          description="View your current usage and account information"
        />

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-8">
          {/* User Profile Card */}
          <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Profile</CardTitle>
                <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-center">
                {typedUser?.profileImageUrl && (
                  <img src={typedUser.profileImageUrl} alt="Profile" className="w-16 h-16 rounded-full mx-auto shadow-md" />
                )}
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
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

          {/* Credits Card */}
          <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-900/20 dark:to-purple-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Credits</CardTitle>
                <Coins className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {usage?.credits || 0}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Available credits for premium features
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Status Card */}
          <Card className="border-0 bg-gradient-to-br from-pink-500/10 to-pink-500/5 dark:from-pink-900/20 dark:to-pink-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Account Status</CardTitle>
                <UserIcon className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-center">
                <div className={`text-lg font-bold ${usage?.accountStatus === "trial" ? "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : "bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"}`}>
                  {getAccountStatusDisplay()}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {usage?.accountStatus === "trial"
                    ? "Lite scans: 3 pages max"
                    : "Full scans: unlimited pages"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Chat Pack Status Card */}
          <Card className="border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-900/20 dark:to-emerald-900/10 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Chat Pack</CardTitle>
                <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
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

        {/* Purchase Credits Section */}
        <Card className="mt-8 border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl text-slate-900 dark:text-white">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white">
                <CreditCard className="h-5 w-5" />
              </div>
              Purchase Credits
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Purchase credits for website scans, AI suggestions, competitor analysis, and chat features
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Current Balance */}
            <Card className="mb-8 border-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-white">
                  <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Your Current Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {userCredits?.credits || usage?.credits || 0}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Available Credits</p>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${usage?.accountStatus === "trial" ? "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : "bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"}`}>
                      {getAccountStatusDisplay()}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                      {usage?.accountStatus === "trial" ? "Lite scans: 3 pages max" : "Full scans: unlimited"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit Packages */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
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
                    <Badge className="absolute top-4 right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
                      Most Popular
                    </Badge>
                  )}
                  {pkg.id === 'business' && (
                    <Badge className="absolute top-4 right-4 bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-lg">
                      Best Value
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-4 pt-8">
                    <CardTitle className="text-2xl text-slate-900 dark:text-white">{pkg.name}</CardTitle>
                    <div className="space-y-2 mt-4">
                      <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{pkg.priceDisplay}</div>
                      <div className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                        {pkg.credits} Credits
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        ~€{(Number(pkg.priceDisplay.replace('€', '')) / pkg.credits).toFixed(3)} per credit
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {pkg.credits} credits for scans & AI features
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          Scans: {usage?.accountStatus === "trial" ? "5" : "3"} credits each
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">AI suggestions: 1 credit per page</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Competitor analysis: 1 credits</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Chat: 1 credit per 10 messages</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handlePurchaseClick(pkg)}
                      disabled={processingPackage === pkg.id}
                      className={`w-full font-bold ${
                        pkg.id === 'pro'
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                          : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg"
                      }`}
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
        <Card className="mt-8 border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl text-slate-900 dark:text-white">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center text-white">
                <Zap className="h-5 w-5" />
              </div>
              How Credits Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Website Scans</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Trial users: 5 credits per scan. Paid users: 3 credits per scan (discount for paid customers).
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 dark:from-purple-900/20 dark:to-purple-900/10 rounded-lg p-4 border border-purple-200/50 dark:border-purple-800/50">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">AI Suggestions</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  AI-powered SEO suggestions cost 1 credit per page. Content duplication analysis costs 1 credit per scan.
                </p>
              </div>
              <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 dark:from-pink-900/20 dark:to-pink-900/10 rounded-lg p-4 border border-pink-200/50 dark:border-pink-800/50">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Competitor Analysis</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Competitor analysis costs 1 credit per scan.
                </p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-lg p-4 border border-emerald-200/50 dark:border-emerald-800/50">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Chat Messages</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Chat with AI about your content costs 1 credit per 10 messages. Counter resets after every 10 messages.
                </p>
              </div>
              <div className="md:col-span-2 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 dark:from-cyan-900/20 dark:to-cyan-900/10 rounded-lg p-4 border border-cyan-200/50 dark:border-cyan-800/50">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">No Expiration</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Credits never expire and can be used whenever you need them.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
