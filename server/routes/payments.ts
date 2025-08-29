import type { Express } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { storage } from "../storage";
import bodyParser from "body-parser";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil", //Latest api version
});

// Credit packages configuration with environment variable price IDs
const CREDIT_PACKAGES = {
  starter: { 
    credits: 100, 
    name: "Starter Pack",
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_default'
  },
  pro: { 
    credits: 300, 
    name: "Pro Pack",
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_default'
  },
  business: { 
    credits: 750, 
    name: "Business Pack",
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_business_default'
  }
};

const createCheckoutSessionSchema = z.object({
  packageType: z.enum(['starter', 'pro', 'business'])
});

export async function registerPaymentRoutes(app: Express): Promise<void> {
  
  // Create Stripe checkout session for credit purchase
  app.post("/api/payments/create-checkout-session", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = (req.user as any).claims.sub;
      const validation = createCheckoutSessionSchema.safeParse(req.body);
      
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

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: creditPackage.priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/credits?canceled=true`,
        metadata: {
          userId: userId,
          packageType: packageType,
          credits: creditPackage.credits.toString()
        }
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ 
        error: "Failed to create checkout session",
        message: error.message 
      });
    }
  });

  // Stripe webhook to handle successful payments
  app.post("/api/payments/webhook", bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('Missing Stripe webhook secret');
      return res.status(400).send('Webhook secret not configured');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Payment successful for session:', session.id);
        
        // Extract metadata
        const userId = session.metadata?.userId;
        const packageType = session.metadata?.packageType;
        const creditsToAdd = parseInt(session.metadata?.credits || '0');

        if (userId && creditsToAdd > 0) {
          try {
            // Add credits to user account
            await storage.addCredits(userId, creditsToAdd);
            console.log(`Added ${creditsToAdd} credits to user ${userId}`);
            
            // Change account status to "paid" on first purchase
            await storage.setAccountStatus(userId, "paid");
            console.log(`Updated account status to 'paid' for user ${userId}`);
          } catch (error) {
            console.error('Error adding credits to user:', error);
          }
        }
        break;
      
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Legacy endpoint - now redirects to checkout
  app.post("/api/payments/create-intent", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = (req.user as any).claims.sub;
      const validation = createCheckoutSessionSchema.safeParse(req.body);
      
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

      // Create checkout session instead of payment intent
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: creditPackage.priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/credits?canceled=true`,
        metadata: {
          userId: userId,
          packageType: packageType,
          credits: creditPackage.credits.toString()
        }
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ 
        error: "Failed to create checkout session",
        message: error.message 
      });
    }
  });

  // Get available credit packages
  app.get("/api/payments/packages", (req, res) => {
    const packages = Object.entries(CREDIT_PACKAGES).map(([key, pkg]) => ({
      id: key,
      ...pkg,
      priceDisplay: `$${Math.round(pkg.credits * 0.10).toFixed(2)}` // Approx pricing at 10¢ per credit
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
        credits: usage.credits || 0,
        accountStatus: usage.accountStatus || "trial",
        freeScansUsed: usage.freeScansUsed || 0,
        freeScansResetDate: null // Removed monthly reset
      });
    } catch (error: any) {
      console.error('Error fetching user credits:', error);
      res.status(500).json({ 
        error: "Failed to fetch credits",
        message: error.message 
      });
    }
  });
}