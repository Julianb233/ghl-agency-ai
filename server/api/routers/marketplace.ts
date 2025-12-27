import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { credit_packages } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getSubscriptionService } from "../../services/subscription.service";

/**
 * Marketplace Router
 * Handles feature purchases, credit packs, and subscription management
 *
 * Stripe Integration:
 * - Install Stripe SDK: npm install stripe
 * - Set environment variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * - Configure Stripe webhook endpoint in Stripe Dashboard
 * - Create products and prices in Stripe Dashboard
 *
 * NOTE: Requires stripe package to be installed
 */
export const marketplaceRouter = router({
    /**
     * Get available credit packages from database
     */
    getProducts: publicProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Database not available",
            });
        }

        try {
            // Get active credit packages from database
            const packages = await db
                .select()
                .from(credit_packages)
                .where(eq(credit_packages.isActive, true))
                .orderBy(credit_packages.sortOrder);

            // Group packages by credit type for easier display
            const groupedPackages = packages.reduce((acc, pkg) => {
                if (!acc[pkg.creditType]) {
                    acc[pkg.creditType] = [];
                }
                acc[pkg.creditType].push({
                    id: pkg.id,
                    name: pkg.name,
                    description: pkg.description || "",
                    creditAmount: pkg.creditAmount,
                    price: pkg.price, // Price in cents
                    priceUSD: (pkg.price / 100).toFixed(2),
                    metadata: pkg.metadata,
                });
                return acc;
            }, {} as Record<string, any[]>);

            return {
                packages: groupedPackages,
                // Legacy format for compatibility
                products: [
                    {
                        id: "prod_ad_manager",
                        name: "AI Ad Manager",
                        priceMonthly: 49,
                        priceOneTime: 499,
                        features: ["Unlimited Ad Analysis", "Auto-Edit Ad Sets", "Password Manager Auth"],
                    },
                    {
                        id: "prod_seo_suite",
                        name: "SEO & Reports Suite",
                        priceMonthly: 29,
                        priceOneTime: 299,
                        features: ["Keyword Research", "Technical Audits", "User Heatmaps"],
                    },
                    {
                        id: "prod_voice_pro",
                        name: "Voice Agent Pro",
                        priceMonthly: 99,
                        priceOneTime: 999,
                        features: ["400% Call Volume", "Custom Voice Cloning", "Sentiment Analysis"],
                    },
                ],
            };
        } catch (error: any) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to fetch products: ${error.message}`,
            });
        }
    }),

    /**
     * Create Stripe checkout session for credit package purchase
     */
    createCheckout: publicProcedure
        .input(
            z.object({
                packageId: z.number().int().positive(),
                successUrl: z.string().url().optional(),
                cancelUrl: z.string().url().optional(),
            })
        )
        .mutation(async ({ input }) => {
            // PLACEHOLDER: Replace with actual userId from auth context
            const userId = 1;

            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Database not available",
                });
            }

            // Get the package details
            const packageResult = await db
                .select()
                .from(credit_packages)
                .where(eq(credit_packages.id, input.packageId))
                .limit(1);

            if (packageResult.length === 0) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Package not found",
                });
            }

            const pkg = packageResult[0];

            if (!pkg.isActive) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Package is not active",
                });
            }

            // Check if Stripe is configured
            const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeSecretKey) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
                });
            }

            try {
                // Dynamically import Stripe (will fail gracefully if not installed)
                const Stripe = (await import("stripe")).default;
                const stripe = new Stripe(stripeSecretKey, {
                    apiVersion: "2025-11-17.clover" as any,
                });

                // Create Stripe checkout session
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ["card"],
                    line_items: [
                        {
                            price_data: {
                                currency: "usd",
                                product_data: {
                                    name: pkg.name,
                                    description: `${pkg.creditAmount} ${pkg.creditType} credits`,
                                },
                                unit_amount: pkg.price, // Price in cents
                            },
                            quantity: 1,
                        },
                    ],
                    mode: "payment",
                    success_url: input.successUrl || `${process.env.APP_URL || "http://localhost:3000"}/marketplace/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: input.cancelUrl || `${process.env.APP_URL || "http://localhost:3000"}/marketplace`,
                    metadata: {
                        userId: userId.toString(),
                        packageId: pkg.id.toString(),
                        creditType: pkg.creditType,
                        creditAmount: pkg.creditAmount.toString(),
                    },
                });

                return {
                    success: true,
                    checkoutUrl: session.url,
                    sessionId: session.id,
                };
            } catch (error: any) {
                if (error.message?.includes("Cannot find module 'stripe'")) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Stripe SDK not installed. Run: npm install stripe",
                    });
                }
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to create checkout session: ${error.message}`,
                });
            }
        }),

    /**
     * Verify checkout session and return purchase details
     */
    verifyCheckout: publicProcedure
        .input(
            z.object({
                sessionId: z.string(),
            })
        )
        .query(async ({ input }) => {
            const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeSecretKey) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Stripe is not configured",
                });
            }

            try {
                const Stripe = (await import("stripe")).default;
                const stripe = new Stripe(stripeSecretKey, {
                    apiVersion: "2025-11-17.clover" as any,
                });

                const session = await stripe.checkout.sessions.retrieve(input.sessionId);

                return {
                    success: session.payment_status === "paid",
                    status: session.payment_status,
                    metadata: session.metadata,
                };
            } catch (error: any) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to verify checkout: ${error.message}`,
                });
            }
        }),

    /**
     * Get user's subscription status
     */
    getSubscription: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "User not authenticated",
            });
        }

        const subscriptionService = getSubscriptionService();
        const subscription = await subscriptionService.getUserSubscription(userId);

        if (!subscription) {
            return {
                hasSubscription: false,
                plan: null,
                features: [],
                nextBillingDate: null,
            };
        }

        return {
            hasSubscription: subscription.subscription.status === "active",
            plan: {
                name: subscription.tier.name,
                slug: subscription.tier.slug,
                priceMonthly: subscription.tier.monthlyPriceCents / 100, // Convert cents to dollars
            },
            features: subscription.tier.features || [],
            nextBillingDate: subscription.subscription.currentPeriodEnd,
            usage: subscription.usage,
            limits: subscription.limits,
        };
    }),

    /**
     * Cancel subscription
     */
    cancelSubscription: protectedProcedure
        .input(
            z.object({
                cancelImmediately: z.boolean().default(false),
                reason: z.string().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.user?.id;
            if (!userId) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "User not authenticated",
                });
            }

            try {
                const subscriptionService = getSubscriptionService();
                await subscriptionService.cancelStripeSubscription(userId, input.cancelImmediately);

                return {
                    success: true,
                    message: input.cancelImmediately
                        ? "Subscription cancelled immediately"
                        : "Subscription will cancel at end of billing period",
                };
            } catch (error: any) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to cancel subscription: ${error.message}`,
                });
            }
        }),
});
