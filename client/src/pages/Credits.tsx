import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coins, CreditCard, Check, Zap } from "lucide-react";

// Load Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  name: string;
  priceDisplay: string;
}

interface UserCredits {
  credits: number;
  freeScansUsed: number;
  freeScansResetDate: string | null;
}

const CreditPurchaseForm = ({ selectedPackage, onSuccess }: { 
  selectedPackage: CreditPackage | null; 
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !selectedPackage) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/credits",
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: `${selectedPackage.credits} credits added to your account!`,
        });
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? "Processing..." : `Purchase ${selectedPackage?.credits} Credits`}
      </Button>
    </form>
  );
};

export default function Credits() {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available packages
  const { data: packages, isLoading: packagesLoading } = useQuery<CreditPackage[]>({
    queryKey: ['/api/payments/packages'],
  });

  // Fetch user's current credits
  const { data: userCredits, isLoading: creditsLoading } = useQuery<UserCredits>({
    queryKey: ['/api/payments/credits'],
  });

  // Create payment intent mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (packageType: string) => {
      const response = await apiRequest("POST", "/api/payments/create-intent", { packageType });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
      console.error("Payment intent creation failed:", error);
    },
  });

  const handlePurchaseClick = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    createPaymentMutation.mutate(pkg.id);
  };

  const handlePaymentSuccess = () => {
    setSelectedPackage(null);
    setClientSecret("");
    queryClient.invalidateQueries({ queryKey: ['/api/payments/credits'] });
    queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
  };

  const getFreeScansRemaining = () => {
    if (!userCredits) return 0;
    return Math.max(0, 3 - userCredits.freeScansUsed); // 3 free scans per month
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
                <p className="text-sm text-muted-foreground">Free Scans Used This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Packages */}
        {!selectedPackage && (
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
                    {pkg.id === 'pro' && (
                      <div className="text-sm text-green-600 font-medium">
                        25% Bonus Credits
                      </div>
                    )}
                    {pkg.id === 'business' && (
                      <div className="text-sm text-green-600 font-medium">
                        40% Bonus Credits
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">AI-powered suggestions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Unlimited website scans</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Competitor analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Priority processing</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handlePurchaseClick(pkg)}
                    disabled={createPaymentMutation.isPending}
                    className="w-full"
                    variant={pkg.id === 'pro' ? 'default' : 'outline'}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {createPaymentMutation.isPending ? "Setting up..." : "Purchase Credits"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Payment Form */}
        {selectedPackage && clientSecret && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Complete Your Purchase
              </CardTitle>
              <CardDescription>
                {selectedPackage.name} - {selectedPackage.credits} credits for {selectedPackage.priceDisplay}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CreditPurchaseForm 
                  selectedPackage={selectedPackage} 
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedPackage(null);
                  setClientSecret("");
                }}
                className="w-full mt-4"
              >
                Back to Packages
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Credit Usage Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How Credits Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">What You Get Free:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 3 website scans per month</li>
                  <li>• Basic SEO analysis</li>
                  <li>• Limited AI suggestions (2-3 per scan)</li>
                  <li>• CSV export</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Credit Features:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• 1 credit = 1 AI suggestion</li>
                  <li>• 5 credits = 1 additional scan</li>
                  <li>• 10 credits = 1 competitor analysis</li>
                  <li>• Unlimited page analysis</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}