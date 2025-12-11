import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { user_credits, credit_packages, credit_transactions } from "../../../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { CreditService, CreditType, TransactionType } from "../../services/credit.service";

/**
 * Credits Router
 * Manages credit balances, packages, purchases, and transaction history
 *
 * Features:
 * - View credit balances by type
 * - Purchase credit packages
 * - Transaction history
 * - Admin: create packages, adjust credits
 * - Usage statistics
 *
 * PLACEHOLDER: userId is hardcoded to 1 until authentication is implemented
 */

// ========================================
// VALIDATION SCHEMAS
// ========================================

const creditTypeEnum = z.enum(["enrichment", "calling", "scraping"]);
const transactionTypeEnum = z.enum(["purchase", "usage", "refund", "adjustment"]);

const createPackageSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  creditAmount: z.number().int().positive(),
  price: z.number().int().positive(), // Price in cents
  creditType: creditTypeEnum,
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  metadata: z.record(z.any()).optional(),
});

const updatePackageSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  creditAmount: z.number().int().positive().optional(),
  price: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  metadata: z.record(z.any()).optional(),
});

const purchaseCreditsSchema = z.object({
  packageId: z.number().int(),
  paymentMethodId: z.string().optional(), // Stripe payment method ID
});

const adjustCreditsSchema = z.object({
  userId: z.number().int(),
  amount: z.number().int(), // Can be positive or negative
  creditType: creditTypeEnum,
  description: z.string(),
  metadata: z.record(z.any()).optional(),
});

const transactionHistorySchema = z.object({
  creditType: creditTypeEnum.optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

const usageStatsSchema = z.object({
  creditType: creditTypeEnum,
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// ========================================
// CREDITS ROUTER
// ========================================

export const creditsRouter = router({
  /**
   * Get user's credit balances for all types
   */
  getBalances: publicProcedure.query(async () => {
    // PLACEHOLDER: Replace with actual userId from auth context
    const userId = 1;

    const creditService = new CreditService();

    try {
      const balances = await creditService.getAllBalances(userId);

      return {
        enrichment: balances.enrichment || { balance: 0, totalPurchased: 0, totalUsed: 0 },
        calling: balances.calling || { balance: 0, totalPurchased: 0, totalUsed: 0 },
        scraping: balances.scraping || { balance: 0, totalPurchased: 0, totalUsed: 0 },
      };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to get balances: ${error.message}`,
      });
    }
  }),

  /**
   * Get balance for a specific credit type
   */
  getBalance: publicProcedure
    .input(z.object({ creditType: creditTypeEnum }))
    .query(async ({ input }) => {
      // PLACEHOLDER: Replace with actual userId from auth context
      const userId = 1;

      const creditService = new CreditService();

      try {
        const balance = await creditService.getBalance(userId, input.creditType);

        return { balance };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get balance: ${error.message}`,
        });
      }
    }),

  /**
   * Get available credit packages
   */
  getPackages: publicProcedure
    .input(
      z.object({
        creditType: creditTypeEnum.optional(),
        activeOnly: z.boolean().default(true),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      let query = db.select().from(credit_packages).orderBy(credit_packages.sortOrder);

      if (input.activeOnly) {
        query = db
          .select()
          .from(credit_packages)
          .where(eq(credit_packages.isActive, true))
          .orderBy(credit_packages.sortOrder);
      }

      if (input.creditType) {
        query = db
          .select()
          .from(credit_packages)
          .where(
            input.activeOnly
              ? and(eq(credit_packages.creditType, input.creditType), eq(credit_packages.isActive, true))
              : eq(credit_packages.creditType, input.creditType)
          )
          .orderBy(credit_packages.sortOrder);
      }

      const packages = await query;

      return { packages };
    }),

  /**
   * Create a new credit package (Admin only)
   */
  createPackage: publicProcedure
    .input(createPackageSchema)
    .mutation(async ({ input }) => {
      // PLACEHOLDER: Add admin role check when auth is implemented

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const result = await db
        .insert(credit_packages)
        .values({
          name: input.name,
          description: input.description,
          creditAmount: input.creditAmount,
          price: input.price,
          creditType: input.creditType,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          metadata: input.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return result[0];
    }),

  /**
   * Update a credit package (Admin only)
   */
  updatePackage: publicProcedure
    .input(updatePackageSchema)
    .mutation(async ({ input }) => {
      // PLACEHOLDER: Add admin role check when auth is implemented

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.creditAmount !== undefined) updateData.creditAmount = input.creditAmount;
      if (input.price !== undefined) updateData.price = input.price;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
      if (input.metadata !== undefined) updateData.metadata = input.metadata;

      const result = await db
        .update(credit_packages)
        .set(updateData)
        .where(eq(credit_packages.id, input.id))
        .returning();

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Package not found",
        });
      }

      return result[0];
    }),

  /**
   * Purchase credits
   * PLACEHOLDER: Stripe integration required for actual payment processing
   */
  purchaseCredits: publicProcedure
    .input(purchaseCreditsSchema)
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

      // Get package
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

      // PLACEHOLDER: Process payment with Stripe
      // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: pkg.price,
      //   currency: 'usd',
      //   payment_method: input.paymentMethodId,
      //   confirm: true,
      // });
      //
      // if (paymentIntent.status !== 'succeeded') {
      //   throw new TRPCError({
      //     code: "PAYMENT_REQUIRED",
      //     message: "Payment failed",
      //   });
      // }

      // For now, just add credits without payment processing
      const creditService = new CreditService();

      try {
        await creditService.addCredits(
          userId,
          pkg.creditAmount,
          pkg.creditType as CreditType,
          `Purchased ${pkg.name}`,
          "purchase",
          {
            packageId: pkg.id,
            packageName: pkg.name,
            price: pkg.price,
            // paymentIntentId: paymentIntent.id, // PLACEHOLDER
          }
        );

        const newBalance = await creditService.getBalance(userId, pkg.creditType as CreditType);

        return {
          success: true,
          creditsAdded: pkg.creditAmount,
          newBalance,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to add credits: ${error.message}`,
        });
      }
    }),

  /**
   * Get transaction history
   */
  getTransactionHistory: publicProcedure
    .input(transactionHistorySchema)
    .query(async ({ input }) => {
      // PLACEHOLDER: Replace with actual userId from auth context
      const userId = 1;

      const creditService = new CreditService();

      try {
        const transactions = await creditService.getTransactionHistory(
          userId,
          input.creditType,
          input.limit,
          input.offset
        );

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Get total count
        let countQuery = db
          .select({ total: count() })
          .from(credit_transactions)
          .where(eq(credit_transactions.userId, userId));

        if (input.creditType) {
          countQuery = db
            .select({ total: count() })
            .from(credit_transactions)
            .where(
              and(
                eq(credit_transactions.userId, userId),
                eq(credit_transactions.creditType, input.creditType)
              )
            );
        }

        const [{ total }] = await countQuery;

        return {
          transactions,
          total,
          hasMore: input.offset + input.limit < total,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get transaction history: ${error.message}`,
        });
      }
    }),

  /**
   * Get usage statistics
   */
  getUsageStats: publicProcedure
    .input(usageStatsSchema)
    .query(async ({ input }) => {
      // PLACEHOLDER: Replace with actual userId from auth context
      const userId = 1;

      const creditService = new CreditService();

      try {
        const stats = await creditService.getUsageStats(
          userId,
          input.creditType,
          input.startDate,
          input.endDate
        );

        return stats;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get usage stats: ${error.message}`,
        });
      }
    }),

  /**
   * Adjust credits manually (Admin only)
   */
  adjustCredits: publicProcedure
    .input(adjustCreditsSchema)
    .mutation(async ({ input }) => {
      // PLACEHOLDER: Add admin role check when auth is implemented

      const creditService = new CreditService();

      try {
        await creditService.adjustCredits(
          input.userId,
          input.amount,
          input.creditType,
          input.description,
          input.metadata
        );

        const newBalance = await creditService.getBalance(input.userId, input.creditType);

        return {
          success: true,
          adjustment: input.amount,
          newBalance,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to adjust credits: ${error.message}`,
        });
      }
    }),

  /**
   * Check if user has sufficient credits
   */
  checkBalance: publicProcedure
    .input(
      z.object({
        creditType: creditTypeEnum,
        required: z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {
      // PLACEHOLDER: Replace with actual userId from auth context
      const userId = 1;

      const creditService = new CreditService();

      try {
        const hasSufficient = await creditService.checkBalance(
          userId,
          input.creditType,
          input.required
        );
        const balance = await creditService.getBalance(userId, input.creditType);

        return {
          hasSufficient,
          balance,
          required: input.required,
          shortfall: hasSufficient ? 0 : input.required - balance,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to check balance: ${error.message}`,
        });
      }
    }),
});
