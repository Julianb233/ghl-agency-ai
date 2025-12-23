import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  emailConnections,
  syncedEmails,
  emailDrafts,
  emailSyncHistory,
  type EmailConnection,
  type SyncedEmail,
  type EmailDraft,
} from "../../../drizzle/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { emailService } from "../../services/email.service";
import { oauthStateService } from "../../services/oauthState.service";
import { addEmailSyncJob, addEmailDraftJob } from "../../_core/queue";

/**
 * Email Integration Router
 * Handles Gmail/Outlook OAuth, email syncing, AI draft generation, and email sending
 *
 * Features:
 * - OAuth 2.0 authentication for Gmail and Outlook
 * - Background email synchronization
 * - AI-powered sentiment analysis
 * - AI-powered draft response generation
 * - Email sending via provider APIs
 *
 * PLACEHOLDER: userId is hardcoded to 1 until authentication is implemented
 */

// ========================================
// VALIDATION SCHEMAS
// ========================================

const providerEnum = z.enum(["gmail", "outlook"]);
const draftStatusEnum = z.enum(["pending", "approved", "sent", "discarded"]);
const sentimentEnum = z.enum(["positive", "negative", "neutral", "mixed"]);
const importanceEnum = z.enum(["high", "medium", "low"]);
const toneEnum = z.enum(["professional", "casual", "friendly"]);

// ========================================
// EMAIL ROUTER
// ========================================

export const emailRouter = router({
  // ========================================
  // OAUTH ENDPOINTS
  // ========================================

  /**
   * Generate OAuth authorization URL
   * Returns URL to redirect user to provider's consent screen
   */
  getAuthUrl: publicProcedure
    .input(
      z.object({
        provider: providerEnum,
      })
    )
    .mutation(async ({ input }) => {
      // PLACEHOLDER: Replace with actual userId from auth context
      const userId = 1;

      // Generate secure state parameter
      const state = oauthStateService.generateState();
      const codeVerifier = oauthStateService.generateCodeVerifier();

      // Store state for validation
      await oauthStateService.set(state, {
        userId: userId.toString(),
        provider: input.provider,
        codeVerifier,
      });

      // Get OAuth URL from service
      const authUrl = emailService.getAuthUrl(input.provider, state);

      return {
        authUrl,
        state,
      };
    }),

  /**
   * Handle OAuth callback
   * Exchanges authorization code for tokens and stores connection
   */
  handleCallback: publicProcedure
    .input(
      z.object({
        provider: providerEnum,
        code: z.string(),
        state: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Validate state
      const stateData = await oauthStateService.consume(input.state);
      if (!stateData) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired state parameter",
        });
      }

      if (stateData.provider !== input.provider) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider mismatch",
        });
      }

      const userId = parseInt(stateData.userId);

      // Exchange code for tokens
      const result = await emailService.handleCallback(input.provider, input.code);

      // Check if connection already exists for this email
      const existingConnection = await db
        .select()
        .from(emailConnections)
        .where(
          and(
            eq(emailConnections.userId, userId),
            eq(emailConnections.provider, input.provider),
            eq(emailConnections.email, result.accountInfo.email)
          )
        )
        .limit(1);

      let connection: EmailConnection;

      if (existingConnection.length > 0) {
        // Update existing connection
        const updated = await db
          .update(emailConnections)
          .set({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresAt: result.expiresAt,
            scope: result.scope,
            metadata: result.accountInfo.metadata,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(emailConnections.id, existingConnection[0].id))
          .returning();

        connection = updated[0];
      } else {
        // Create new connection
        const created = await db
          .insert(emailConnections)
          .values({
            userId,
            provider: input.provider,
            email: result.accountInfo.email,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresAt: result.expiresAt,
            scope: result.scope,
            metadata: result.accountInfo.metadata,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        connection = created[0];
      }

      // Queue initial sync job
      await addEmailSyncJob({
        userId: userId.toString(),
        accountId: connection.id.toString(),
        emailProvider: input.provider,
      });

      return {
        success: true,
        connection: {
          id: connection.id,
          provider: connection.provider,
          email: connection.email,
          isActive: connection.isActive,
        },
      };
    }),

  /**
   * List user's connected email accounts
   */
  listConnections: publicProcedure.query(async () => {
    // PLACEHOLDER: Replace with actual userId from auth context
    const userId = 1;

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const connections = await db
      .select({
        id: emailConnections.id,
        provider: emailConnections.provider,
        email: emailConnections.email,
        isActive: emailConnections.isActive,
        lastSyncedAt: emailConnections.lastSyncedAt,
        createdAt: emailConnections.createdAt,
      })
      .from(emailConnections)
      .where(eq(emailConnections.userId, userId))
      .orderBy(desc(emailConnections.createdAt));

    return {
      connections,
    };
  }),

  /**
   * Disconnect (remove) email account
   */
  disconnectAccount: publicProcedure
    .input(
      z.object({
        connectionId: z.number().int(),
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

      // Verify ownership and soft delete
      const result = await db
        .update(emailConnections)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(eq(emailConnections.id, input.connectionId), eq(emailConnections.userId, userId)))
        .returning();

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email connection not found",
        });
      }

      return {
        success: true,
      };
    }),

  // ========================================
  // EMAIL OPERATIONS
  // ========================================

  /**
   * Trigger email sync for a connection (queues background job)
   */
  syncEmails: publicProcedure
    .input(
      z.object({
        connectionId: z.number().int(),
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

      // Get connection
      const connection = await db
        .select()
        .from(emailConnections)
        .where(and(eq(emailConnections.id, input.connectionId), eq(emailConnections.userId, userId)))
        .limit(1);

      if (connection.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email connection not found",
        });
      }

      if (!connection[0].isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email connection is inactive",
        });
      }

      // Queue sync job
      const job = await addEmailSyncJob({
        userId: userId.toString(),
        accountId: connection[0].id.toString(),
        emailProvider: connection[0].provider as "gmail" | "outlook",
        syncSince: connection[0].lastSyncedAt || undefined,
      });

      return {
        success: true,
        jobId: job?.id || '',
      };
    }),

  /**
   * Get synced emails with pagination and filters
   */
  getEmails: publicProcedure
    .input(
      z.object({
        connectionId: z.number().int().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        unreadOnly: z.boolean().optional(),
        sentiment: sentimentEnum.optional(),
        requiresResponse: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      // PLACEHOLDER: Replace with actual userId from auth context
      const userId = 1;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Build where conditions
      const conditions = [eq(syncedEmails.userId, userId)];

      if (input.connectionId) {
        conditions.push(eq(syncedEmails.connectionId, input.connectionId));
      }

      if (input.unreadOnly) {
        conditions.push(eq(syncedEmails.isRead, false));
      }

      if (input.sentiment) {
        conditions.push(eq(syncedEmails.sentiment, input.sentiment));
      }

      if (input.requiresResponse !== undefined) {
        conditions.push(eq(syncedEmails.requiresResponse, input.requiresResponse));
      }

      // Get emails
      const emails = await db
        .select()
        .from(syncedEmails)
        .where(and(...conditions))
        .orderBy(desc(syncedEmails.date))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(syncedEmails)
        .where(and(...conditions));

      return {
        emails,
        total: totalResult[0]?.count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get AI-generated drafts
   */
  getDrafts: publicProcedure
    .input(
      z.object({
        status: draftStatusEnum.optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      // PLACEHOLDER: Replace with actual userId from auth context
      const userId = 1;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Build where conditions
      const conditions = [eq(emailDrafts.userId, userId)];

      if (input.status) {
        conditions.push(eq(emailDrafts.status, input.status));
      }

      // Get drafts with associated email info
      const drafts = await db
        .select({
          draft: emailDrafts,
          email: syncedEmails,
        })
        .from(emailDrafts)
        .innerJoin(syncedEmails, eq(emailDrafts.emailId, syncedEmails.id))
        .where(and(...conditions))
        .orderBy(desc(emailDrafts.generatedAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(emailDrafts)
        .where(and(...conditions));

      return {
        drafts,
        total: totalResult[0]?.count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Send approved draft
   */
  sendDraft: publicProcedure
    .input(
      z.object({
        draftId: z.number().int(),
        customizations: z
          .object({
            subject: z.string().optional(),
            body: z.string().optional(),
          })
          .optional(),
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

      // Get draft with connection info
      const draftResult = await db
        .select({
          draft: emailDrafts,
          email: syncedEmails,
          connection: emailConnections,
        })
        .from(emailDrafts)
        .innerJoin(syncedEmails, eq(emailDrafts.emailId, syncedEmails.id))
        .innerJoin(emailConnections, eq(emailDrafts.connectionId, emailConnections.id))
        .where(and(eq(emailDrafts.id, input.draftId), eq(emailDrafts.userId, userId)))
        .limit(1);

      if (draftResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Draft not found",
        });
      }

      const { draft, email, connection } = draftResult[0];

      if (draft.status === "sent") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Draft has already been sent",
        });
      }

      if (!connection.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Email connection is inactive",
        });
      }

      // Apply customizations
      const subject = input.customizations?.subject || draft.subject;
      const body = input.customizations?.body || draft.body;

      // Check token expiration and refresh if needed
      let accessToken = connection.accessToken;
      if (new Date() >= connection.expiresAt) {
        const refreshed = await emailService.refreshToken(connection.provider as "gmail" | "outlook", connection.refreshToken);

        await db
          .update(emailConnections)
          .set({
            accessToken: refreshed.accessToken,
            expiresAt: refreshed.expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(emailConnections.id, connection.id));

        accessToken = refreshed.accessToken;
      }

      // Send email
      const result = await emailService.sendEmail(connection.provider as "gmail" | "outlook", accessToken, {
        to: [email.from as any],
        subject,
        body,
        bodyType: draft.bodyType as "html" | "text",
        replyTo: email.messageId,
      });

      // Update draft status
      await db
        .update(emailDrafts)
        .set({
          status: "sent",
          sentAt: new Date(),
          providerId: result.messageId,
          subject: input.customizations?.subject ? subject : draft.subject,
          body: input.customizations?.body ? body : draft.body,
          updatedAt: new Date(),
        })
        .where(eq(emailDrafts.id, input.draftId));

      return {
        success: true,
        messageId: result.messageId,
      };
    }),

  /**
   * Delete/discard draft
   */
  deleteDraft: publicProcedure
    .input(
      z.object({
        draftId: z.number().int(),
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

      // Update draft status to discarded
      const result = await db
        .update(emailDrafts)
        .set({
          status: "discarded",
          updatedAt: new Date(),
        })
        .where(and(eq(emailDrafts.id, input.draftId), eq(emailDrafts.userId, userId)))
        .returning();

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Draft not found",
        });
      }

      return {
        success: true,
      };
    }),

  // ========================================
  // AI FEATURES
  // ========================================

  /**
   * Generate AI draft response for an email
   */
  generateDraft: publicProcedure
    .input(
      z.object({
        emailId: z.number().int(),
        tone: toneEnum.optional(),
        model: z.enum(["gpt-4", "gpt-4-turbo", "claude-3-opus", "claude-3-sonnet"]).optional(),
        context: z.string().optional(),
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

      // Get email
      const emailResult = await db
        .select()
        .from(syncedEmails)
        .where(and(eq(syncedEmails.id, input.emailId), eq(syncedEmails.userId, userId)))
        .limit(1);

      if (emailResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }

      const email = emailResult[0];

      // Generate draft
      const draft = await emailService.generateDraft(
        {
          subject: email.subject || undefined,
          body: email.body || email.snippet || undefined,
          from: (email.from as any).email,
        },
        {
          tone: input.tone,
          model: input.model,
          context: input.context,
        }
      );

      // Save draft to database
      const created = await db
        .insert(emailDrafts)
        .values({
          userId,
          emailId: email.id,
          connectionId: email.connectionId,
          subject: draft.subject,
          body: draft.body,
          bodyType: draft.bodyType,
          tone: input.tone || "professional",
          status: "pending",
          model: input.model || "claude-3-sonnet",
          metadata: {
            context: input.context,
            generatedFrom: "user_request",
          },
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return {
        draft: created[0],
      };
    }),

  /**
   * Analyze email sentiment using AI
   */
  analyzeSentiment: publicProcedure
    .input(
      z.object({
        emailId: z.number().int(),
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

      // Get email
      const emailResult = await db
        .select()
        .from(syncedEmails)
        .where(and(eq(syncedEmails.id, input.emailId), eq(syncedEmails.userId, userId)))
        .limit(1);

      if (emailResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }

      const email = emailResult[0];

      // Analyze sentiment
      const sentiment = await emailService.analyzeSentiment({
        subject: email.subject || undefined,
        body: email.body || email.snippet || undefined,
        from: (email.from as any).email,
      });

      // Update email with sentiment data
      await db
        .update(syncedEmails)
        .set({
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          importance: sentiment.importance,
          category: sentiment.category,
          requiresResponse: sentiment.requiresResponse,
          updatedAt: new Date(),
        })
        .where(eq(syncedEmails.id, input.emailId));

      return {
        sentiment,
      };
    }),

  /**
   * Get email monitoring status and stats
   */
  getStatus: publicProcedure.query(async () => {
    // PLACEHOLDER: Replace with actual userId from auth context
    const userId = 1;

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    // Get active connections
    const connections = await db
      .select()
      .from(emailConnections)
      .where(and(eq(emailConnections.userId, userId), eq(emailConnections.isActive, true)));

    // Get stats
    const [unreadCount, draftsCount, sentCount, lastSync] = await Promise.all([
      db
        .select({ count: count() })
        .from(syncedEmails)
        .where(and(eq(syncedEmails.userId, userId), eq(syncedEmails.isRead, false))),

      db
        .select({ count: count() })
        .from(emailDrafts)
        .where(and(eq(emailDrafts.userId, userId), eq(emailDrafts.status, "pending"))),

      db
        .select({ count: count() })
        .from(emailDrafts)
        .where(and(eq(emailDrafts.userId, userId), eq(emailDrafts.status, "sent"))),

      db
        .select({ lastSyncedAt: emailConnections.lastSyncedAt })
        .from(emailConnections)
        .where(and(eq(emailConnections.userId, userId), eq(emailConnections.isActive, true)))
        .orderBy(desc(emailConnections.lastSyncedAt))
        .limit(1),
    ]);

    return {
      isConnected: connections.length > 0,
      connectedAccounts: connections.length,
      stats: {
        unreadCount: unreadCount[0]?.count || 0,
        draftsGenerated: draftsCount[0]?.count || 0,
        emailsSent: sentCount[0]?.count || 0,
      },
      lastSync: lastSync[0]?.lastSyncedAt || null,
    };
  }),
});
