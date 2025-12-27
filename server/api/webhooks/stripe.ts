/**
 * Stripe Webhook Handler (Express Route)
 *
 * Handles Stripe webhook events with proper signature verification and idempotency.
 *
 * IMPORTANT: This is an Express route, NOT a tRPC endpoint, because:
 * 1. We need access to the raw request body for signature verification
 * 2. Stripe signs the raw bytes, not the JSON-parsed data
 * 3. JSON middleware breaks the signature if applied before verification
 *
 * Setup:
 * 1. Add this route to Express app: app.use('/api/webhooks/stripe', stripeWebhookRouter)
 * 2. Use raw body parser middleware for this route
 * 3. Configure webhook endpoint in Stripe Dashboard: https://dashboard.stripe.com/webhooks
 * 4. Set webhook URL to: https://yourdomain.com/api/webhooks/stripe
 * 5. Copy webhook signing secret to .env: STRIPE_WEBHOOK_SECRET=whsec_...
 *
 * Events Handled:
 * - checkout.session.completed: Credits purchase completed
 * - payment_intent.succeeded: Payment succeeded
 * - payment_intent.payment_failed: Payment failed
 * - charge.refunded: Handle refunds
 */

import { Router, Request, Response, raw } from "express";
import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { CreditService } from "../../services/credit.service";
import { getDb } from "../../db";
import { credit_packages } from "../../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const stripeWebhookRouter = Router();

// ========================================
// MIDDLEWARE
// ========================================

// Apply raw body parser BEFORE signature verification
stripeWebhookRouter.use(raw({ type: "application/json" }));

// ========================================
// TYPES
// ========================================

interface ProcessedStripeEvent {
  id: number;
  stripe_event_id: string;
  event_type: string;
  processed_at: Date;
  status: "completed" | "failed" | "pending";
  error_message?: string;
  created_at: Date;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Check if Stripe event has already been processed
 * Prevents duplicate credit awards from webhook retries
 */
async function checkProcessedEvent(eventId: string): Promise<ProcessedStripeEvent | null> {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database not available for idempotency check");
    return null;
  }

  try {
    const result = await db.execute(sql`
      SELECT * FROM stripe_processed_events
      WHERE stripe_event_id = ${eventId}
      LIMIT 1
    `);

    if (result.rows && result.rows.length > 0) {
      return result.rows[0] as unknown as ProcessedStripeEvent;
    }
    return null;
  } catch (error) {
    console.warn("[Stripe Webhook] Could not check processed events:", error);
    return null;
  }
}

/**
 * Mark Stripe event as processed
 */
async function markEventProcessed(
  eventId: string,
  eventType: string,
  status: "completed" | "failed" | "pending" = "completed",
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database not available for marking event");
    return;
  }

  try {
    await db.execute(sql`
      INSERT INTO stripe_processed_events
      (stripe_event_id, event_type, status, error_message, processed_at, created_at, updated_at)
      VALUES (${eventId}, ${eventType}, ${status}, ${errorMessage || null}, NOW(), NOW(), NOW())
      ON CONFLICT (stripe_event_id)
      DO UPDATE SET status = ${status}, error_message = ${errorMessage || null}, processed_at = NOW(), updated_at = NOW()
    `);

    console.log(
      `[Stripe Webhook] Marked event ${eventId} as ${status}${errorMessage ? `: ${errorMessage}` : ""}`
    );
  } catch (error) {
    console.error("[Stripe Webhook] Failed to mark event as processed:", error);
  }
}

/**
 * Handle checkout session completed event
 * Awards credits to user account
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata;

  if (!metadata || !metadata.userId || !metadata.packageId) {
    console.error("Missing metadata in checkout session:", session.id);
    throw new Error("Missing required metadata (userId, packageId)");
  }

  const userId = parseInt(metadata.userId);
  const packageId = parseInt(metadata.packageId);
  const creditType = metadata.creditType as "enrichment" | "calling" | "scraping";
  const creditAmount = parseInt(metadata.creditAmount);

  // Verify package exists
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const packageResult = await db
    .select()
    .from(credit_packages)
    .where(eq(credit_packages.id, packageId))
    .limit(1);

  if (packageResult.length === 0) {
    console.error("Package not found:", packageId);
    throw new Error(`Package not found: ${packageId}`);
  }

  const pkg = packageResult[0];

  // Award credits using CreditService
  const creditService = new CreditService();

  try {
    await creditService.addCredits(
      userId,
      creditAmount,
      creditType,
      `Purchased ${pkg.name} via Stripe`,
      "purchase",
      {
        packageId,
        packageName: pkg.name,
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        amountPaid: session.amount_total, // Amount in cents
        currency: session.currency,
      }
    );

    console.log(
      `[Stripe Webhook] Successfully awarded ${creditAmount} ${creditType} credits to user ${userId}`
    );
  } catch (error: any) {
    console.error("[Stripe Webhook] Failed to award credits:", error);
    throw error;
  }
}

/**
 * Handle payment intent succeeded event
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  console.log("[Stripe Webhook] Payment intent succeeded:", paymentIntent.id);
  // Additional handling if needed (logging, analytics, etc.)
}

/**
 * Handle payment intent failed event
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  console.error("[Stripe Webhook] Payment intent failed:", paymentIntent.id);
  // Could send notification to user about failed payment
}

/**
 * Handle charge refunded event
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  console.log("[Stripe Webhook] Charge refunded:", charge.id);

  // Get the payment intent to find related session
  if (!charge.payment_intent) {
    console.error("No payment intent found for refunded charge");
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error("Stripe not configured");
    return;
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia" as any,
    });

    // Find checkout sessions with this payment intent
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: charge.payment_intent as string,
      limit: 1,
    });

    if (sessions.data.length === 0) {
      console.error("No checkout session found for payment intent");
      return;
    }

    const session = sessions.data[0];
    const metadata = session.metadata;

    if (!metadata || !metadata.userId) {
      console.error("Missing metadata in session");
      return;
    }

    const userId = parseInt(metadata.userId);
    const creditType = metadata.creditType as "enrichment" | "calling" | "scraping";
    const creditAmount = parseInt(metadata.creditAmount);

    // Deduct the credits back (refund)
    const creditService = new CreditService();

    try {
      await creditService.deductCredits(
        userId,
        creditAmount,
        creditType,
        `Refund for Stripe charge ${charge.id}`,
        charge.id,
        "stripe_refund",
        {
          stripeChargeId: charge.id,
          stripePaymentIntentId: charge.payment_intent,
          refundAmount: charge.amount_refunded,
        }
      );

      console.log(
        `[Stripe Webhook] Successfully refunded ${creditAmount} ${creditType} credits from user ${userId}`
      );
    } catch (error: any) {
      console.error("[Stripe Webhook] Failed to refund credits:", error);
      // Don't throw - we don't want to fail the webhook
    }
  } catch (error: any) {
    console.error("[Stripe Webhook] Error handling refund:", error);
  }
}

// ========================================
// WEBHOOK ENDPOINT
// ========================================

/**
 * Main Stripe webhook endpoint
 * POST /api/webhooks/stripe
 *
 * Process incoming Stripe webhook events with signature verification
 */
stripeWebhookRouter.post("/", async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  // Validate configuration
  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return res.status(400).json({
      error: "Missing stripe-signature header",
      received: false,
    });
  }

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({
      error: "Webhook not configured",
      received: false,
    });
  }

  if (!stripeSecretKey) {
    console.error("[Stripe Webhook] STRIPE_SECRET_KEY not configured");
    return res.status(500).json({
      error: "Stripe not configured",
      received: false,
    });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-12-18.acacia" as any,
    });

    // Verify webhook signature using raw body
    // IMPORTANT: req.body must be the raw request body, not parsed JSON
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );

    console.log(`[Stripe Webhook] Received event: ${event.type} (ID: ${event.id})`);

    // Check idempotency - avoid duplicate processing
    const processedEvent = await checkProcessedEvent(event.id);
    if (processedEvent) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`);
      return res.json({
        received: true,
        alreadyProcessed: true,
      });
    }

    // Mark as processing
    await markEventProcessed(event.id, event.type, "pending");

    // Handle the event
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case "charge.refunded":
          await handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      // Mark as completed
      await markEventProcessed(event.id, event.type, "completed");

      return res.json({
        received: true,
        eventId: event.id,
        eventType: event.type,
      });
    } catch (error: any) {
      // Mark as failed
      await markEventProcessed(
        event.id,
        event.type,
        "failed",
        error instanceof Error ? error.message : String(error)
      );

      console.error("[Stripe Webhook] Error processing event:", error);

      // Return 500 so Stripe retries
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
        received: false,
      });
    }
  } catch (error: any) {
    // Signature verification failed
    console.error("[Stripe Webhook] Signature verification failed:", error.message);

    return res.status(401).json({
      error: "Invalid signature",
      received: false,
    });
  }
});

/**
 * Health check endpoint
 * GET /api/webhooks/stripe
 */
stripeWebhookRouter.get("/", (req: Request, res: Response) => {
  return res.json({
    status: "ok",
    message: "Stripe webhook endpoint is active",
    configurationStatus: {
      hasSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasApiKey: !!process.env.STRIPE_SECRET_KEY,
    },
  });
});

export default stripeWebhookRouter;
