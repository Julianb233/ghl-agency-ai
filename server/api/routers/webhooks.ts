import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { eq, and, desc, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";

// Generate a secure HMAC secret key
function generateSecretKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

import {
  userWebhooks,
  inboundMessages,
  botConversations,
  outboundMessages,
} from "../../../drizzle/schema-webhooks";

// ========================================
// VALIDATION SCHEMAS
// ========================================

const channelTypeEnum = z.enum(["sms", "email", "custom_webhook"]);

const providerConfigSchema = z.object({
  // SMS (Twilio)
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioPhoneNumber: z.string().optional(),
  twilioMessagingServiceSid: z.string().optional(),

  // Email
  inboundEmailAddress: z.string().email().optional(),
  forwardingEnabled: z.boolean().optional(),
  emailProvider: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  fromAddress: z.string().email().optional(),
  replyToAddress: z.string().email().optional(),

  // Custom webhook
  authType: z.enum(["none", "bearer", "api_key", "hmac"]).optional(),
  authToken: z.string().optional(),
  authHeader: z.string().optional(),
  hmacSecret: z.string().optional(),
  outboundWebhookUrl: z.string().url().optional(),
  outboundHeaders: z.record(z.string(), z.string()).optional(),
  outboundMethod: z.enum(["POST", "PUT"]).optional(),
}).optional();

const createWebhookSchema = z.object({
  channelType: channelTypeEnum,
  channelName: z.string().min(1).max(100),
  providerConfig: providerConfigSchema,
  outboundEnabled: z.boolean().default(true),
  outboundConfig: providerConfigSchema,
  isPrimary: z.boolean().default(false),
  rateLimitPerMinute: z.number().int().min(1).max(100).default(30),
  rateLimitPerHour: z.number().int().min(1).max(1000).default(200),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateWebhookSchema = z.object({
  id: z.number().int().positive(),
  channelName: z.string().min(1).max(100).optional(),
  providerConfig: providerConfigSchema,
  outboundEnabled: z.boolean().optional(),
  outboundConfig: providerConfigSchema,
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  rateLimitPerMinute: z.number().int().min(1).max(100).optional(),
  rateLimitPerHour: z.number().int().min(1).max(1000).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ========================================
// WEBHOOK ROUTER
// ========================================

export const webhooksRouter = router({
  /**
   * Create a new webhook channel
   * Users can have up to 3 webhooks
   */
  create: protectedProcedure
    .input(createWebhookSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        // Check if user already has 3 webhooks
        const existingWebhooks = await db
          .select({ count: count() })
          .from(userWebhooks)
          .where(eq(userWebhooks.userId, userId));

        const webhookCount = existingWebhooks[0]?.count || 0;
        if (webhookCount >= 3) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Maximum of 3 webhooks allowed per user",
          });
        }

        // Determine channel order (next available slot)
        const channelOrder = webhookCount + 1;

        // If setting as primary, unset other primaries
        if (input.isPrimary) {
          await db
            .update(userWebhooks)
            .set({ isPrimary: false, updatedAt: new Date() })
            .where(eq(userWebhooks.userId, userId));
        }

        // Create the webhook with HMAC secret key
        const secretKey = generateSecretKey();
        const [webhook] = await db
          .insert(userWebhooks)
          .values({
            userId,
            channelType: input.channelType,
            channelName: input.channelName,
            channelOrder,
            providerConfig: input.providerConfig,
            outboundEnabled: input.outboundEnabled,
            outboundConfig: input.outboundConfig,
            isPrimary: input.isPrimary || channelOrder === 1,
            rateLimitPerMinute: input.rateLimitPerMinute,
            rateLimitPerHour: input.rateLimitPerHour,
            tags: input.tags,
            metadata: input.metadata,
            isActive: true,
            isVerified: false,
            verificationCode: nanoid(6).toUpperCase(),
            secretKey, // HMAC signing key for webhook validation
          })
          .returning();

        // Generate webhook URL
        const webhookUrl = `/api/webhooks/inbound/${webhook.webhookToken}`;
        await db
          .update(userWebhooks)
          .set({ webhookUrl })
          .where(eq(userWebhooks.id, webhook.id));

        return {
          ...webhook,
          webhookUrl,
          // Don't return sensitive config in response
          providerConfig: undefined,
          outboundConfig: undefined,
        };
      } catch (error) {
        console.error("Failed to create webhook:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List all webhooks for the authenticated user
   */
  list: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      const params = input || { includeInactive: false };

      try {
        const conditions = [eq(userWebhooks.userId, userId)];
        if (!params.includeInactive) {
          conditions.push(eq(userWebhooks.isActive, true));
        }

        const webhooks = await db
          .select({
            id: userWebhooks.id,
            webhookToken: userWebhooks.webhookToken,
            webhookUrl: userWebhooks.webhookUrl,
            channelType: userWebhooks.channelType,
            channelName: userWebhooks.channelName,
            channelOrder: userWebhooks.channelOrder,
            outboundEnabled: userWebhooks.outboundEnabled,
            isActive: userWebhooks.isActive,
            isPrimary: userWebhooks.isPrimary,
            isVerified: userWebhooks.isVerified,
            verifiedAt: userWebhooks.verifiedAt,
            rateLimitPerMinute: userWebhooks.rateLimitPerMinute,
            rateLimitPerHour: userWebhooks.rateLimitPerHour,
            totalMessagesReceived: userWebhooks.totalMessagesReceived,
            totalMessagesSent: userWebhooks.totalMessagesSent,
            lastMessageAt: userWebhooks.lastMessageAt,
            tags: userWebhooks.tags,
            createdAt: userWebhooks.createdAt,
            updatedAt: userWebhooks.updatedAt,
          })
          .from(userWebhooks)
          .where(and(...conditions))
          .orderBy(userWebhooks.channelOrder);

        return webhooks;
      } catch (error) {
        console.error("Failed to list webhooks:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list webhooks: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get a single webhook by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        const [webhook] = await db
          .select()
          .from(userWebhooks)
          .where(and(
            eq(userWebhooks.id, input.id),
            eq(userWebhooks.userId, userId)
          ))
          .limit(1);

        if (!webhook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        return {
          ...webhook,
          // Mask sensitive data
          providerConfig: webhook.providerConfig ? { configured: true } : null,
          outboundConfig: webhook.outboundConfig ? { configured: true } : null,
        };
      } catch (error) {
        console.error("Failed to get webhook:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Update a webhook
   */
  update: protectedProcedure
    .input(updateWebhookSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        // Verify ownership
        const [existing] = await db
          .select()
          .from(userWebhooks)
          .where(and(
            eq(userWebhooks.id, input.id),
            eq(userWebhooks.userId, userId)
          ))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        // If setting as primary, unset other primaries
        if (input.isPrimary) {
          await db
            .update(userWebhooks)
            .set({ isPrimary: false, updatedAt: new Date() })
            .where(and(
              eq(userWebhooks.userId, userId),
              eq(userWebhooks.isPrimary, true)
            ));
        }

        // Build update object
        const updateData: Partial<typeof userWebhooks.$inferInsert> = {
          updatedAt: new Date(),
        };

        if (input.channelName !== undefined) updateData.channelName = input.channelName;
        if (input.providerConfig !== undefined) updateData.providerConfig = input.providerConfig;
        if (input.outboundEnabled !== undefined) updateData.outboundEnabled = input.outboundEnabled;
        if (input.outboundConfig !== undefined) updateData.outboundConfig = input.outboundConfig;
        if (input.isPrimary !== undefined) updateData.isPrimary = input.isPrimary;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.rateLimitPerMinute !== undefined) updateData.rateLimitPerMinute = input.rateLimitPerMinute;
        if (input.rateLimitPerHour !== undefined) updateData.rateLimitPerHour = input.rateLimitPerHour;
        if (input.tags !== undefined) updateData.tags = input.tags;
        if (input.metadata !== undefined) updateData.metadata = input.metadata;

        const [updated] = await db
          .update(userWebhooks)
          .set(updateData)
          .where(eq(userWebhooks.id, input.id))
          .returning();

        return {
          ...updated,
          providerConfig: undefined,
          outboundConfig: undefined,
        };
      } catch (error) {
        console.error("Failed to update webhook:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Delete a webhook
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        // Verify ownership
        const [existing] = await db
          .select()
          .from(userWebhooks)
          .where(and(
            eq(userWebhooks.id, input.id),
            eq(userWebhooks.userId, userId)
          ))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        // Soft delete by setting inactive
        await db
          .update(userWebhooks)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(userWebhooks.id, input.id));

        // If this was primary, set another one as primary
        if (existing.isPrimary) {
          const [nextPrimary] = await db
            .select()
            .from(userWebhooks)
            .where(and(
              eq(userWebhooks.userId, userId),
              eq(userWebhooks.isActive, true)
            ))
            .orderBy(userWebhooks.channelOrder)
            .limit(1);

          if (nextPrimary) {
            await db
              .update(userWebhooks)
              .set({ isPrimary: true, updatedAt: new Date() })
              .where(eq(userWebhooks.id, nextPrimary.id));
          }
        }

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Failed to delete webhook:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Verify a webhook channel
   */
  verify: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      verificationCode: z.string().min(1).max(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        const [webhook] = await db
          .select()
          .from(userWebhooks)
          .where(and(
            eq(userWebhooks.id, input.id),
            eq(userWebhooks.userId, userId)
          ))
          .limit(1);

        if (!webhook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        if (webhook.isVerified) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Webhook is already verified",
          });
        }

        if (webhook.verificationCode !== input.verificationCode.toUpperCase()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid verification code",
          });
        }

        await db
          .update(userWebhooks)
          .set({
            isVerified: true,
            verifiedAt: new Date(),
            verificationCode: null,
            updatedAt: new Date(),
          })
          .where(eq(userWebhooks.id, input.id));

        return { success: true, verified: true };
      } catch (error) {
        console.error("Failed to verify webhook:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to verify webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Regenerate webhook token
   */
  regenerateToken: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        const [webhook] = await db
          .select()
          .from(userWebhooks)
          .where(and(
            eq(userWebhooks.id, input.id),
            eq(userWebhooks.userId, userId)
          ))
          .limit(1);

        if (!webhook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        // Generate new token - use crypto.randomUUID for UUID format
        const newToken = crypto.randomUUID();
        const newUrl = `/api/webhooks/inbound/${newToken}`;

        await db
          .update(userWebhooks)
          .set({
            webhookToken: newToken,
            webhookUrl: newUrl,
            updatedAt: new Date(),
          })
          .where(eq(userWebhooks.id, input.id));

        return {
          success: true,
          webhookToken: newToken,
          webhookUrl: newUrl,
        };
      } catch (error) {
        console.error("Failed to regenerate token:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to regenerate token: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get message history for a webhook
   */
  getMessages: protectedProcedure
    .input(z.object({
      webhookId: z.number().int().positive(),
      direction: z.enum(["inbound", "outbound", "all"]).default("all"),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        // Verify ownership
        const [webhook] = await db
          .select()
          .from(userWebhooks)
          .where(and(
            eq(userWebhooks.id, input.webhookId),
            eq(userWebhooks.userId, userId)
          ))
          .limit(1);

        if (!webhook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        const messages: any[] = [];

        if (input.direction === "inbound" || input.direction === "all") {
          const inbound = await db
            .select()
            .from(inboundMessages)
            .where(eq(inboundMessages.webhookId, input.webhookId))
            .orderBy(desc(inboundMessages.receivedAt))
            .limit(input.limit)
            .offset(input.offset);

          messages.push(...inbound.map(m => ({ ...m, direction: "inbound" })));
        }

        if (input.direction === "outbound" || input.direction === "all") {
          const outbound = await db
            .select()
            .from(outboundMessages)
            .where(eq(outboundMessages.webhookId, input.webhookId))
            .orderBy(desc(outboundMessages.createdAt))
            .limit(input.limit)
            .offset(input.offset);

          messages.push(...outbound.map(m => ({ ...m, direction: "outbound" })));
        }

        // Sort by date if getting all
        if (input.direction === "all") {
          messages.sort((a, b) => {
            const dateA = a.receivedAt || a.createdAt;
            const dateB = b.receivedAt || b.createdAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });
        }

        return messages.slice(0, input.limit);
      } catch (error) {
        console.error("Failed to get messages:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get messages: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get conversations for a webhook
   */
  getConversations: protectedProcedure
    .input(z.object({
      webhookId: z.number().int().positive().optional(),
      status: z.enum(["active", "paused", "resolved", "archived"]).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        const conditions = [eq(botConversations.userId, userId)];

        if (input.webhookId) {
          // Verify ownership
          const [webhook] = await db
            .select()
            .from(userWebhooks)
            .where(and(
              eq(userWebhooks.id, input.webhookId),
              eq(userWebhooks.userId, userId)
            ))
            .limit(1);

          if (!webhook) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Webhook not found",
            });
          }

          conditions.push(eq(botConversations.webhookId, input.webhookId));
        }

        if (input.status) {
          conditions.push(eq(botConversations.status, input.status));
        }

        const conversations = await db
          .select()
          .from(botConversations)
          .where(and(...conditions))
          .orderBy(desc(botConversations.lastMessageAt))
          .limit(input.limit)
          .offset(input.offset);

        return conversations;
      } catch (error) {
        console.error("Failed to get conversations:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get conversations: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Regenerate HMAC secret key for a webhook
   */
  regenerateSecretKey: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        const [webhook] = await db
          .select()
          .from(userWebhooks)
          .where(and(
            eq(userWebhooks.id, input.id),
            eq(userWebhooks.userId, userId)
          ))
          .limit(1);

        if (!webhook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        // Generate new secret key
        const newSecretKey = generateSecretKey();

        await db
          .update(userWebhooks)
          .set({
            secretKey: newSecretKey,
            updatedAt: new Date(),
          })
          .where(eq(userWebhooks.id, input.id));

        return {
          success: true,
          secretKey: newSecretKey,
          message: "Secret key regenerated. Update your webhook integration with the new key.",
        };
      } catch (error) {
        console.error("Failed to regenerate secret key:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to regenerate secret key: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get the secret key for a webhook (for display to user)
   */
  getSecretKey: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        const [webhook] = await db
          .select({ secretKey: userWebhooks.secretKey })
          .from(userWebhooks)
          .where(and(
            eq(userWebhooks.id, input.id),
            eq(userWebhooks.userId, userId)
          ))
          .limit(1);

        if (!webhook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        return {
          secretKey: webhook.secretKey,
          usage: "Use this key to sign outbound requests with HMAC-SHA256. Include signature in X-Webhook-Signature header.",
        };
      } catch (error) {
        console.error("Failed to get secret key:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get secret key: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Test webhook connectivity by sending a test payload
   */
  test: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        const [webhook] = await db
          .select()
          .from(userWebhooks)
          .where(and(
            eq(userWebhooks.id, input.id),
            eq(userWebhooks.userId, userId)
          ))
          .limit(1);

        if (!webhook) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Webhook not found",
          });
        }

        // For custom webhooks with outbound config, test the outbound URL
        const outboundConfig = webhook.outboundConfig as Record<string, any> | null;
        if (webhook.channelType === "custom_webhook" && outboundConfig?.outboundWebhookUrl) {
          const testPayload = {
            type: "test",
            timestamp: new Date().toISOString(),
            webhookId: webhook.id,
            message: "This is a test message from GHL Agency AI",
          };

          // Sign the payload with HMAC
          const payloadString = JSON.stringify(testPayload);
          const signature = webhook.secretKey
            ? crypto.createHmac("sha256", webhook.secretKey).update(payloadString).digest("hex")
            : null;

          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              ...(outboundConfig.outboundHeaders || {}),
            };

            if (signature) {
              headers["X-Webhook-Signature"] = signature;
            }

            // Add auth headers if configured
            if (outboundConfig.authType === "bearer" && outboundConfig.authToken) {
              headers["Authorization"] = `Bearer ${outboundConfig.authToken}`;
            } else if (outboundConfig.authType === "api_key" && outboundConfig.authToken) {
              headers[outboundConfig.authHeader || "X-API-Key"] = outboundConfig.authToken;
            }

            const response = await fetch(outboundConfig.outboundWebhookUrl, {
              method: outboundConfig.outboundMethod || "POST",
              headers,
              body: payloadString,
            });

            return {
              success: response.ok,
              statusCode: response.status,
              statusText: response.statusText,
              message: response.ok
                ? "Webhook test successful! Your endpoint received the test payload."
                : `Webhook returned status ${response.status}: ${response.statusText}`,
            };
          } catch (fetchError) {
            return {
              success: false,
              statusCode: null,
              statusText: null,
              message: `Failed to reach webhook endpoint: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
            };
          }
        }

        // For SMS/email channels, just return the webhook info
        return {
          success: true,
          statusCode: null,
          statusText: null,
          message: `Webhook is configured. Inbound URL: ${webhook.webhookUrl}`,
          webhookUrl: webhook.webhookUrl,
          channelType: webhook.channelType,
          isVerified: webhook.isVerified,
        };
      } catch (error) {
        console.error("Failed to test webhook:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to test webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
