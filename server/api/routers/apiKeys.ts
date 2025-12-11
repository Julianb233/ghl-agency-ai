/**
 * API Keys Management Router
 * TRPC router for managing public API keys
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { apiKeys, apiRequestLogs } from "../../../drizzle/schema";
import { eq, and, desc, count, gte } from "drizzle-orm";
import crypto from "crypto";

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Generate a secure API key
 * Format: ghl_<32-char-random-string>
 */
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 base64 chars
  const keyValue = randomBytes.toString("base64url");
  return `ghl_${keyValue}`;
}

/**
 * Hash API key for storage
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Get key prefix for display (first 12 characters)
 */
function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12);
}

/**
 * Mask API key for display
 */
function maskApiKey(prefix: string): string {
  return `${prefix}...`;
}

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  scopes: z.array(
    z.enum([
      "*",
      "tasks:read",
      "tasks:write",
      "tasks:execute",
      "executions:read",
      "templates:read",
    ])
  ).min(1),
  expiresInDays: z.number().int().positive().max(365).optional(),
  rateLimitPerMinute: z.number().int().positive().max(1000).default(100),
  rateLimitPerHour: z.number().int().positive().max(10000).default(1000),
  rateLimitPerDay: z.number().int().positive().max(100000).default(10000),
});

const updateApiKeySchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  scopes: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
  rateLimitPerMinute: z.number().int().positive().max(1000).optional(),
  rateLimitPerHour: z.number().int().positive().max(10000).optional(),
  rateLimitPerDay: z.number().int().positive().max(100000).optional(),
});

// ========================================
// ROUTER
// ========================================

export const apiKeysRouter = router({
  /**
   * List all API keys for the authenticated user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const keys = await db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          description: apiKeys.description,
          scopes: apiKeys.scopes,
          isActive: apiKeys.isActive,
          lastUsedAt: apiKeys.lastUsedAt,
          totalRequests: apiKeys.totalRequests,
          rateLimitPerMinute: apiKeys.rateLimitPerMinute,
          rateLimitPerHour: apiKeys.rateLimitPerHour,
          rateLimitPerDay: apiKeys.rateLimitPerDay,
          expiresAt: apiKeys.expiresAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.userId, ctx.user.id),
            eq(apiKeys.revokedAt, null) as any // Not revoked
          )
        )
        .orderBy(desc(apiKeys.createdAt));

      return {
        keys: keys.map((key) => ({
          ...key,
          maskedKey: maskApiKey(key.keyPrefix),
          isExpired: key.expiresAt ? new Date(key.expiresAt) < new Date() : false,
        })),
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to list API keys",
        cause: error,
      });
    }
  }),

  /**
   * Create a new API key
   */
  create: protectedProcedure
    .input(createApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // PLACEHOLDER: Check user's plan limits
        // For now, allow up to 5 API keys per user
        const [{ count: existingKeys }] = await db
          .select({ count: apiKeys.id })
          .from(apiKeys)
          .where(
            and(
              eq(apiKeys.userId, ctx.user.id),
              eq(apiKeys.isActive, true),
              eq(apiKeys.revokedAt, null) as any
            )
          );

        if (Number(existingKeys) >= 5) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "API key limit reached (5). Delete an existing key or upgrade your plan.",
          });
        }

        // Generate new API key
        const apiKey = generateApiKey();
        const keyHash = hashApiKey(apiKey);
        const keyPrefix = getKeyPrefix(apiKey);

        // Calculate expiration date
        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
          : null;

        // Insert into database
        const [newKey] = await db
          .insert(apiKeys)
          .values({
            userId: ctx.user.id,
            name: input.name,
            description: input.description,
            keyHash,
            keyPrefix,
            scopes: input.scopes as any,
            rateLimitPerMinute: input.rateLimitPerMinute,
            rateLimitPerHour: input.rateLimitPerHour,
            rateLimitPerDay: input.rateLimitPerDay,
            expiresAt,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return {
          success: true,
          message: "API key created successfully",
          key: {
            id: newKey.id,
            name: newKey.name,
            apiKey, // Return the full key ONLY on creation
            keyPrefix: newKey.keyPrefix,
            scopes: newKey.scopes,
            expiresAt: newKey.expiresAt,
          },
          warning: "Save this key now - you won't be able to see it again!",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create API key",
          cause: error,
        });
      }
    }),

  /**
   * Update an API key
   */
  update: protectedProcedure
    .input(updateApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Verify ownership
        const [existing] = await db
          .select()
          .from(apiKeys)
          .where(
            and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.user.id))
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "API key not found",
          });
        }

        // Update key
        const { id, ...updates } = input;
        const [updated] = await db
          .update(apiKeys)
          .set({
            ...updates,
            scopes: updates.scopes as any,
            updatedAt: new Date(),
          })
          .where(eq(apiKeys.id, input.id))
          .returning();

        return {
          success: true,
          message: "API key updated successfully",
          key: {
            id: updated.id,
            name: updated.name,
            keyPrefix: updated.keyPrefix,
            scopes: updated.scopes,
            isActive: updated.isActive,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update API key",
          cause: error,
        });
      }
    }),

  /**
   * Revoke (delete) an API key
   */
  revoke: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Verify ownership
        const [existing] = await db
          .select()
          .from(apiKeys)
          .where(
            and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.user.id))
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "API key not found",
          });
        }

        // Soft delete by setting revokedAt timestamp
        await db
          .update(apiKeys)
          .set({
            isActive: false,
            revokedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(apiKeys.id, input.id));

        return {
          success: true,
          message: "API key revoked successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke API key",
          cause: error,
        });
      }
    }),

  /**
   * Get usage statistics for an API key
   */
  getUsageStats: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        days: z.number().int().positive().max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        // Verify ownership
        const [apiKey] = await db
          .select()
          .from(apiKeys)
          .where(
            and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.user.id))
          )
          .limit(1);

        if (!apiKey) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "API key not found",
          });
        }

        // Get usage statistics
        const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

        const logs = await db
          .select({
            count: apiRequestLogs.id,
            statusCode: apiRequestLogs.statusCode,
            endpoint: apiRequestLogs.endpoint,
          })
          .from(apiRequestLogs)
          .where(
            and(
              eq(apiRequestLogs.apiKeyId, input.id),
              gte(apiRequestLogs.createdAt, since)
            )
          );

        // Aggregate statistics
        const totalRequests = logs.length;
        const successRequests = logs.filter((log) => log.statusCode < 400).length;
        const errorRequests = logs.filter((log) => log.statusCode >= 400).length;

        // Endpoint breakdown
        const endpointStats = logs.reduce((acc: any, log) => {
          const endpoint = log.endpoint;
          if (!acc[endpoint]) {
            acc[endpoint] = { count: 0, errors: 0 };
          }
          acc[endpoint].count++;
          if (log.statusCode >= 400) {
            acc[endpoint].errors++;
          }
          return acc;
        }, {});

        return {
          stats: {
            totalRequests,
            successRequests,
            errorRequests,
            successRate: totalRequests > 0 ? (successRequests / totalRequests) * 100 : 0,
            lastUsedAt: apiKey.lastUsedAt,
            endpoints: Object.entries(endpointStats).map(([endpoint, stats]: [string, any]) => ({
              endpoint,
              count: stats.count,
              errors: stats.errors,
            })),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get usage statistics",
          cause: error,
        });
      }
    }),
});
