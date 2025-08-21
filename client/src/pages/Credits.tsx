import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coins, CreditCard, Check, Zap } from "lucide-react";
import { useState } from "react";

interface CreditPackage {
  id: string;
  credits: number;
  name: string;
  priceDisplay: string;
}

interface UserCredits {
  credits: number;
  freeScansUsed: number;
  freeScansResetDate: string | null;
}

export default function Credits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);

  // Fetch available packages
  const { data: packages, isLoading: packagesLoading } = useQuery<CreditPackage[]>({
    queryKey: ['/api/payments/packages'],
  });

  // Fetch user's current credits
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

  const getFreeScansRemaining = () => {
    if (!userCredits) return 0;
    return Math.max(0, 3 - userCredits.freeScansUsed); // 3 free scans total
  };

  if (packagesLoading || creditsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading credit packages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">SEO Credits</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Purchase credits to unlock advanced AI-powered SEO suggestions and unlimited website scans
          </p>
        </div>

        {/* Current Credits Display */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Your Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {userCredits?.credits || 0}
                </div>
                <p className="text-sm text-muted-foreground">Available Credits</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {getFreeScansRemaining()}
                </div>
                <p className="text-sm text-muted-foreground">Free Scans Remaining</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">
                  {userCredits?.freeScansUsed || 0}/3
                </div>
                <p className="text-sm text-muted-foreground">Total Free Scans Used</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Packages */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
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

        {/* Info Section */}
        <Card>
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
                  AI-powered suggestions cost 1 credit each. Free users get 3 suggestions per page.
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
    </div>
  );
}