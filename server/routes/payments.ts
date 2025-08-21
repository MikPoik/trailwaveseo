import type { Express } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { storage } from "../storage";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Credit packages configuration
const CREDIT_PACKAGES = {
  starter: { credits: 50, price: 999, name: "Starter Pack" }, // $9.99
  pro: { credits: 150, price: 2499, name: "Pro Pack" },      // $24.99 (25% bonus)
  business: { credits: 350, price: 4999, name: "Business Pack" } // $49.99 (40% bonus)
};

const createPaymentIntentSchema = z.object({
  packageType: z.enum(['starter', 'pro', 'business'])
});

export async function registerPaymentRoutes(app: Express): Promise<void> {
  
  // Create payment intent for credit purchase
  app.post("/api/payments/create-intent", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = (req.user as any).claims.sub;
      const validation = createPaymentIntentSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid package type",
          details: validation.error.errors 
        });
      }

      const { packageType } = validation.data;
      const creditPackage = CREDIT_PACKAGES[packageType];

      if (!creditPackage) {
        return res.status(400).json({ error: "Invalid package type" });
      }

      // Get or create Stripe customer
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            userId: userId,
            firstName: user.firstName || '',
            lastName: user.lastName || ''
          }
        });
        
        customerId = customer.id;
        await storage.updateStripeCustomerId(userId, customerId);
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: creditPackage.price,
        currency: "usd",
        customer: customerId,
        metadata: {
          userId: userId,
          packageType: packageType,
          credits: creditPackage.credits.toString()
        },
        description: `${creditPackage.name} - ${creditPackage.credits} credits`
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        packageDetails: creditPackage
      });

    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ 
        error: "Failed to create payment intent",
        message: error.message 
      });
    }
  });

  // Webhook to handle successful payments
  app.post("/api/payments/webhook", async (req, res) => {
    let event;

    try {
      const sig = req.headers['stripe-signature'] as string;
      // In production, you should set up a webhook endpoint secret
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        if (paymentIntent.metadata.userId && paymentIntent.metadata.credits) {
          const userId = paymentIntent.metadata.userId;
          const credits = parseInt(paymentIntent.metadata.credits);
          
          try {
            await storage.addCredits(userId, credits);
            console.log(`Added ${credits} credits to user ${userId}`);
          } catch (error) {
            console.error('Error adding credits after payment:', error);
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Get available credit packages
  app.get("/api/payments/packages", (req, res) => {
    const packages = Object.entries(CREDIT_PACKAGES).map(([key, pkg]) => ({
      id: key,
      ...pkg,
      priceDisplay: `$${(pkg.price / 100).toFixed(2)}`
    }));
    
    res.json(packages);
  });

  // Get user's credit balance
  app.get("/api/payments/credits", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = (req.user as any).claims.sub;
      const usage = await storage.getUserUsage(userId);
      
      if (!usage) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        credits: usage.credits,
        freeScansUsed: usage.freeScansUsed,
        freeScansResetDate: usage.freeScansResetDate
      });

    } catch (error: any) {
      console.error('Error fetching credits:', error);
      res.status(500).json({ 
        error: "Failed to fetch credits",
        message: error.message 
      });
    }
  });
}