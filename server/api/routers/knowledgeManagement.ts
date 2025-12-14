/**
 * Knowledge Management Router - tRPC API for AI Agent Knowledge Base
 *
 * Provides comprehensive CRUD operations for:
 * - Knowledge Entries (workflows, brand_voice, preferences, processes, technical docs)
 * - Edit History (audit trail and version control)
 * - Suggestions (AI-generated knowledge proposals)
 * - Feedback (quality improvement and validation)
 * - Analytics (usage metrics and insights)
 *
 * Database Schema:
 * - knowledge_entries (schema-agent.ts)
 * - knowledge_edit_history (schema-sop.ts)
 * - knowledge_suggestions (schema-sop.ts)
 * - knowledge_feedback (schema-sop.ts)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import {
  eq,
  and,
  or,
  desc,
  asc,
  inArray,
  sql,
  count,
  avg,
  sum,
  gte,
  lte,
} from "drizzle-orm";

// Import schema tables
import { knowledgeEntries } from "../../../drizzle/schema-agent";
import {
  knowledgeEditHistory,
  knowledgeSuggestions,
  knowledgeFeedback,
} from "../../../drizzle/schema-sop";

// ========================================
// VALIDATION SCHEMAS
// ========================================

// Category enum
const knowledgeCategoryEnum = z.enum([
  "workflow",
  "brand_voice",
  "preference",
  "process",
  "technical",
]);

// Feedback types
const feedbackTypeEnum = z.enum([
  "helpful",
  "outdated",
  "incorrect",
  "unclear",
  "incomplete",
]);

// Suggestion status
const suggestionStatusEnum = z.enum([
  "pending",
  "approved",
  "rejected",
  "merged",
]);

// Suggestion source types
const sourceTypeEnum = z.enum([
  "conversation",
  "task_execution",
  "feedback",
  "observation",
]);

// Change types for edit history
const changeTypeEnum = z.enum([
  "created",
  "updated",
  "deleted",
  "restored",
]);

// Feedback status
const feedbackStatusEnum = z.enum([
  "pending",
  "reviewed",
  "applied",
  "dismissed",
]);

// ========================================
// KNOWLEDGE ENTRY SCHEMAS
// ========================================

const createEntrySchema = z.object({
  category: knowledgeCategoryEnum,
  context: z.string().min(1).max(5000),
  content: z.string().min(1).max(50000),
  examples: z.array(z.record(z.string(), z.unknown())).optional(),
  confidence: z.number().min(0).max(1).optional().default(1.0),
});

const updateEntrySchema = z.object({
  id: z.number().int().positive(),
  category: knowledgeCategoryEnum.optional(),
  context: z.string().min(1).max(5000).optional(),
  content: z.string().min(1).max(50000).optional(),
  examples: z.array(z.record(z.string(), z.unknown())).optional(),
  confidence: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
  reason: z.string().max(1000).optional(), // For edit history
});

const listEntriesSchema = z.object({
  category: knowledgeCategoryEnum.optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  sortBy: z
    .enum(["createdAt", "usageCount", "confidence", "category"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// ========================================
// EDIT HISTORY SCHEMAS
// ========================================

const getEditHistorySchema = z.object({
  knowledgeEntryId: z.number().int().positive(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const revertToVersionSchema = z.object({
  knowledgeEntryId: z.number().int().positive(),
  historyId: z.number().int().positive(),
  reason: z.string().max(1000).optional(),
});

// ========================================
// SUGGESTION SCHEMAS
// ========================================

const createSuggestionSchema = z.object({
  category: knowledgeCategoryEnum,
  context: z.string().min(1).max(5000),
  suggestedContent: z.string().min(1).max(50000),
  sourceType: sourceTypeEnum,
  sourceId: z.string().max(100).optional(),
  sourceContext: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional().default(0.75),
  reasoning: z.string().max(5000).optional(),
});

const listSuggestionsSchema = z.object({
  status: suggestionStatusEnum.optional(),
  category: knowledgeCategoryEnum.optional(),
  sourceType: sourceTypeEnum.optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  sortBy: z.enum(["createdAt", "confidence", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const approveSuggestionSchema = z.object({
  suggestionId: z.number().int().positive(),
  reviewNotes: z.string().max(1000).optional(),
  modifyContent: z.string().optional(), // Allow modifications before approval
});

const rejectSuggestionSchema = z.object({
  suggestionId: z.number().int().positive(),
  reviewNotes: z.string().min(1).max(1000),
});

const mergeSuggestionSchema = z.object({
  suggestionId: z.number().int().positive(),
  targetKnowledgeEntryId: z.number().int().positive(),
  reviewNotes: z.string().max(1000).optional(),
});

// ========================================
// FEEDBACK SCHEMAS
// ========================================

const submitFeedbackSchema = z.object({
  knowledgeEntryId: z.number().int().positive(),
  feedbackType: feedbackTypeEnum,
  comment: z.string().max(5000).optional(),
  suggestedCorrection: z.string().max(50000).optional(),
  executionContext: z.record(z.string(), z.unknown()).optional(),
});

const getFeedbackSchema = z.object({
  knowledgeEntryId: z.number().int().positive().optional(),
  feedbackType: feedbackTypeEnum.optional(),
  status: feedbackStatusEnum.optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const resolveFeedbackSchema = z.object({
  feedbackId: z.number().int().positive(),
  resolution: z.string().min(1).max(1000),
});

// ========================================
// ANALYTICS SCHEMAS
// ========================================

const getUsageStatsSchema = z.object({
  category: knowledgeCategoryEnum.optional(),
  limit: z.number().int().min(1).max(100).default(10),
});

const getCategoryBreakdownSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

const getQualityMetricsSchema = z.object({
  category: knowledgeCategoryEnum.optional(),
});

// ========================================
// KNOWLEDGE MANAGEMENT ROUTER
// ========================================

export const knowledgeManagementRouter = router({
  // ========================================
  // KNOWLEDGE ENTRY CRUD
  // ========================================

  /**
   * Create a new knowledge entry
   * Creates entry and records creation in edit history
   */
  createEntry: protectedProcedure
    .input(createEntrySchema)
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
        // Create knowledge entry
        const [entry] = await db
          .insert(knowledgeEntries)
          .values({
            userId,
            category: input.category,
            context: input.context,
            content: input.content,
            examples: input.examples,
            confidence: input.confidence?.toString() || "1.0",
            usageCount: 0,
            isActive: true,
          })
          .returning();

        // Record creation in edit history
        await db.insert(knowledgeEditHistory).values({
          knowledgeEntryId: entry.id,
          userId,
          changeType: "created",
          newContent: input.content,
          newCategory: input.category,
          newSnapshot: {
            category: input.category,
            context: input.context,
            content: input.content,
            examples: input.examples,
            confidence: input.confidence,
          },
          reason: "Initial creation",
          source: "manual",
        });

        return {
          success: true,
          entry,
        };
      } catch (error) {
        console.error("Failed to create knowledge entry:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create entry: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get all knowledge entries with filtering
   */
  getEntries: protectedProcedure
    .input(listEntriesSchema)
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
        const conditions: any[] = [eq(knowledgeEntries.userId, userId)];

        // Apply filters
        if (input.category) {
          conditions.push(eq(knowledgeEntries.category, input.category));
        }

        if (input.isActive !== undefined) {
          conditions.push(eq(knowledgeEntries.isActive, input.isActive));
        }

        if (input.minConfidence !== undefined) {
          conditions.push(
            sql`${knowledgeEntries.confidence}::decimal >= ${input.minConfidence}`
          );
        }

        // Search in context and content
        if (input.search) {
          conditions.push(
            or(
              sql`${knowledgeEntries.context} ILIKE ${`%${input.search}%`}`,
              sql`${knowledgeEntries.content} ILIKE ${`%${input.search}%`}`
            )!
          );
        }

        // Sorting
        const sortColumnMap = {
          createdAt: knowledgeEntries.createdAt,
          usageCount: knowledgeEntries.usageCount,
          confidence: knowledgeEntries.confidence,
          category: knowledgeEntries.category,
        } as const;

        const sortColumn = sortColumnMap[input.sortBy];
        const orderBy = input.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

        // Fetch entries
        const entries = await db
          .select()
          .from(knowledgeEntries)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(input.limit)
          .offset(input.offset);

        // Get total count
        const [countResult] = await db
          .select({ count: count() })
          .from(knowledgeEntries)
          .where(and(...conditions));

        return {
          entries,
          total: countResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("Failed to list knowledge entries:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list entries: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get a single knowledge entry with edit history
   */
  getEntryById: protectedProcedure
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
        // Get entry
        const [entry] = await db
          .select()
          .from(knowledgeEntries)
          .where(
            and(
              eq(knowledgeEntries.id, input.id),
              eq(knowledgeEntries.userId, userId)
            )
          )
          .limit(1);

        if (!entry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Knowledge entry not found",
          });
        }

        // Get recent edit history
        const editHistory = await db
          .select()
          .from(knowledgeEditHistory)
          .where(eq(knowledgeEditHistory.knowledgeEntryId, input.id))
          .orderBy(desc(knowledgeEditHistory.createdAt))
          .limit(10);

        // Get feedback summary
        const feedbackCounts = await db
          .select({
            feedbackType: knowledgeFeedback.feedbackType,
            count: count(),
          })
          .from(knowledgeFeedback)
          .where(eq(knowledgeFeedback.knowledgeEntryId, input.id))
          .groupBy(knowledgeFeedback.feedbackType);

        return {
          entry,
          editHistory,
          feedbackSummary: Object.fromEntries(
            feedbackCounts.map((f) => [f.feedbackType, f.count])
          ),
        };
      } catch (error) {
        console.error("Failed to get knowledge entry:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get entry: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Update a knowledge entry
   * Creates edit history record automatically
   */
  updateEntry: protectedProcedure
    .input(updateEntrySchema)
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
        // Get existing entry
        const [existing] = await db
          .select()
          .from(knowledgeEntries)
          .where(
            and(
              eq(knowledgeEntries.id, input.id),
              eq(knowledgeEntries.userId, userId)
            )
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Knowledge entry not found",
          });
        }

        // Build update object
        const updateData: any = {};

        if (input.category !== undefined) updateData.category = input.category;
        if (input.context !== undefined) updateData.context = input.context;
        if (input.content !== undefined) updateData.content = input.content;
        if (input.examples !== undefined) updateData.examples = input.examples;
        if (input.confidence !== undefined)
          updateData.confidence = input.confidence.toString();
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        // Update entry
        const [updated] = await db
          .update(knowledgeEntries)
          .set(updateData)
          .where(eq(knowledgeEntries.id, input.id))
          .returning();

        // Record edit history
        await db.insert(knowledgeEditHistory).values({
          knowledgeEntryId: input.id,
          userId,
          changeType: "updated",
          previousContent: existing.content,
          newContent: input.content || existing.content,
          previousCategory: existing.category,
          newCategory: input.category || existing.category,
          previousSnapshot: {
            category: existing.category,
            context: existing.context,
            content: existing.content,
            examples: existing.examples,
            confidence: existing.confidence,
            isActive: existing.isActive,
          },
          newSnapshot: {
            category: updated.category,
            context: updated.context,
            content: updated.content,
            examples: updated.examples,
            confidence: updated.confidence,
            isActive: updated.isActive,
          },
          reason: input.reason || "Manual update",
          source: "manual",
        });

        return {
          success: true,
          entry: updated,
        };
      } catch (error) {
        console.error("Failed to update knowledge entry:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update entry: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Soft delete a knowledge entry
   */
  deleteEntry: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        reason: z.string().max(1000).optional(),
      })
    )
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
        // Get existing entry
        const [existing] = await db
          .select()
          .from(knowledgeEntries)
          .where(
            and(
              eq(knowledgeEntries.id, input.id),
              eq(knowledgeEntries.userId, userId)
            )
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Knowledge entry not found",
          });
        }

        // Soft delete by setting isActive to false
        await db
          .update(knowledgeEntries)
          .set({ isActive: false })
          .where(eq(knowledgeEntries.id, input.id));

        // Record deletion in edit history
        await db.insert(knowledgeEditHistory).values({
          knowledgeEntryId: input.id,
          userId,
          changeType: "deleted",
          previousSnapshot: {
            category: existing.category,
            context: existing.context,
            content: existing.content,
            examples: existing.examples,
            confidence: existing.confidence,
            isActive: existing.isActive,
          },
          newSnapshot: {
            category: existing.category,
            context: existing.context,
            content: existing.content,
            examples: existing.examples,
            confidence: existing.confidence,
            isActive: false,
          },
          reason: input.reason || "Deleted by user",
          source: "manual",
        });

        return {
          success: true,
          id: input.id,
        };
      } catch (error) {
        console.error("Failed to delete knowledge entry:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete entry: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Restore a deleted knowledge entry
   */
  restoreEntry: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        reason: z.string().max(1000).optional(),
      })
    )
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
        // Get existing entry
        const [existing] = await db
          .select()
          .from(knowledgeEntries)
          .where(
            and(
              eq(knowledgeEntries.id, input.id),
              eq(knowledgeEntries.userId, userId)
            )
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Knowledge entry not found",
          });
        }

        if (existing.isActive) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Entry is already active",
          });
        }

        // Restore by setting isActive to true
        await db
          .update(knowledgeEntries)
          .set({ isActive: true })
          .where(eq(knowledgeEntries.id, input.id));

        // Record restoration in edit history
        await db.insert(knowledgeEditHistory).values({
          knowledgeEntryId: input.id,
          userId,
          changeType: "restored",
          previousSnapshot: {
            category: existing.category,
            context: existing.context,
            content: existing.content,
            examples: existing.examples,
            confidence: existing.confidence,
            isActive: false,
          },
          newSnapshot: {
            category: existing.category,
            context: existing.context,
            content: existing.content,
            examples: existing.examples,
            confidence: existing.confidence,
            isActive: true,
          },
          reason: input.reason || "Restored by user",
          source: "manual",
        });

        return {
          success: true,
          id: input.id,
        };
      } catch (error) {
        console.error("Failed to restore knowledge entry:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to restore entry: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // EDIT HISTORY
  // ========================================

  /**
   * Get edit history for a knowledge entry
   */
  getEditHistory: protectedProcedure
    .input(getEditHistorySchema)
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
        // Verify entry ownership
        const [entry] = await db
          .select()
          .from(knowledgeEntries)
          .where(
            and(
              eq(knowledgeEntries.id, input.knowledgeEntryId),
              eq(knowledgeEntries.userId, userId)
            )
          )
          .limit(1);

        if (!entry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Knowledge entry not found",
          });
        }

        // Get edit history
        const history = await db
          .select()
          .from(knowledgeEditHistory)
          .where(eq(knowledgeEditHistory.knowledgeEntryId, input.knowledgeEntryId))
          .orderBy(desc(knowledgeEditHistory.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Get total count
        const [countResult] = await db
          .select({ count: count() })
          .from(knowledgeEditHistory)
          .where(eq(knowledgeEditHistory.knowledgeEntryId, input.knowledgeEntryId));

        return {
          history,
          total: countResult?.count || 0,
        };
      } catch (error) {
        console.error("Failed to get edit history:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get edit history: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Revert knowledge entry to a previous version
   */
  revertToVersion: protectedProcedure
    .input(revertToVersionSchema)
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
        // Verify entry ownership
        const [entry] = await db
          .select()
          .from(knowledgeEntries)
          .where(
            and(
              eq(knowledgeEntries.id, input.knowledgeEntryId),
              eq(knowledgeEntries.userId, userId)
            )
          )
          .limit(1);

        if (!entry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Knowledge entry not found",
          });
        }

        // Get historical version
        const [historyRecord] = await db
          .select()
          .from(knowledgeEditHistory)
          .where(eq(knowledgeEditHistory.id, input.historyId))
          .limit(1);

        if (!historyRecord) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "History version not found",
          });
        }

        if (historyRecord.knowledgeEntryId !== input.knowledgeEntryId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "History record does not belong to this entry",
          });
        }

        // Get snapshot to revert to
        const snapshot = historyRecord.previousSnapshot as any;
        if (!snapshot) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No snapshot available for this version",
          });
        }

        // Update entry to previous snapshot
        const [updated] = await db
          .update(knowledgeEntries)
          .set({
            category: snapshot.category,
            context: snapshot.context,
            content: snapshot.content,
            examples: snapshot.examples,
            confidence: snapshot.confidence?.toString(),
            isActive: snapshot.isActive ?? true,
          })
          .where(eq(knowledgeEntries.id, input.knowledgeEntryId))
          .returning();

        // Record reversion in edit history
        await db.insert(knowledgeEditHistory).values({
          knowledgeEntryId: input.knowledgeEntryId,
          userId,
          changeType: "updated",
          previousContent: entry.content,
          newContent: snapshot.content,
          previousCategory: entry.category,
          newCategory: snapshot.category,
          previousSnapshot: {
            category: entry.category,
            context: entry.context,
            content: entry.content,
            examples: entry.examples,
            confidence: entry.confidence,
            isActive: entry.isActive,
          },
          newSnapshot: snapshot,
          reason: input.reason || `Reverted to version from ${historyRecord.createdAt}`,
          source: "manual",
        });

        return {
          success: true,
          entry: updated,
        };
      } catch (error) {
        console.error("Failed to revert to version:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to revert: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // SUGGESTIONS
  // ========================================

  /**
   * Create a knowledge suggestion (typically called by AI)
   */
  createSuggestion: protectedProcedure
    .input(createSuggestionSchema)
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
        // Check for similar existing knowledge entries
        const similarEntries = await db
          .select()
          .from(knowledgeEntries)
          .where(
            and(
              eq(knowledgeEntries.userId, userId),
              eq(knowledgeEntries.category, input.category),
              eq(knowledgeEntries.isActive, true)
            )
          )
          .limit(5);

        const similarIds = similarEntries
          .filter((e) => {
            // Simple similarity check - can be enhanced with vector similarity
            const contextSimilar =
              e.context.toLowerCase().includes(input.context.toLowerCase()) ||
              input.context.toLowerCase().includes(e.context.toLowerCase());
            const contentSimilar =
              e.content.toLowerCase().includes(input.suggestedContent.toLowerCase()) ||
              input.suggestedContent.toLowerCase().includes(e.content.toLowerCase());
            return contextSimilar || contentSimilar;
          })
          .map((e) => e.id);

        // Create suggestion
        const [suggestion] = await db
          .insert(knowledgeSuggestions)
          .values({
            userId,
            category: input.category,
            context: input.context,
            suggestedContent: input.suggestedContent,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            sourceContext: input.sourceContext,
            confidence: input.confidence?.toString() || "0.75",
            reasoning: input.reasoning,
            status: "pending",
            similarTo: similarIds.length > 0 ? similarIds : null,
          })
          .returning();

        return {
          success: true,
          suggestion,
          hasSimilar: similarIds.length > 0,
          similarEntries: similarIds.length > 0 ? similarEntries : [],
        };
      } catch (error) {
        console.error("Failed to create suggestion:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create suggestion: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get pending suggestions
   */
  getSuggestions: protectedProcedure
    .input(listSuggestionsSchema)
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
        const conditions: any[] = [eq(knowledgeSuggestions.userId, userId)];

        // Apply filters
        if (input.status) {
          conditions.push(eq(knowledgeSuggestions.status, input.status));
        }

        if (input.category) {
          conditions.push(eq(knowledgeSuggestions.category, input.category));
        }

        if (input.sourceType) {
          conditions.push(eq(knowledgeSuggestions.sourceType, input.sourceType));
        }

        if (input.minConfidence !== undefined) {
          conditions.push(
            sql`${knowledgeSuggestions.confidence}::decimal >= ${input.minConfidence}`
          );
        }

        // Sorting
        const sortColumnMap = {
          createdAt: knowledgeSuggestions.createdAt,
          confidence: knowledgeSuggestions.confidence,
          status: knowledgeSuggestions.status,
        } as const;

        const sortColumn = sortColumnMap[input.sortBy];
        const orderBy = input.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

        // Fetch suggestions
        const suggestions = await db
          .select()
          .from(knowledgeSuggestions)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(input.limit)
          .offset(input.offset);

        // Get total count
        const [countResult] = await db
          .select({ count: count() })
          .from(knowledgeSuggestions)
          .where(and(...conditions));

        return {
          suggestions,
          total: countResult?.count || 0,
        };
      } catch (error) {
        console.error("Failed to list suggestions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list suggestions: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Approve a suggestion and create knowledge entry
   */
  approveSuggestion: protectedProcedure
    .input(approveSuggestionSchema)
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
        // Get suggestion
        const [suggestion] = await db
          .select()
          .from(knowledgeSuggestions)
          .where(
            and(
              eq(knowledgeSuggestions.id, input.suggestionId),
              eq(knowledgeSuggestions.userId, userId)
            )
          )
          .limit(1);

        if (!suggestion) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Suggestion not found",
          });
        }

        if (suggestion.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Suggestion is already ${suggestion.status}`,
          });
        }

        // Use modified content if provided, otherwise use suggested content
        const finalContent = input.modifyContent || suggestion.suggestedContent;

        // Create knowledge entry from suggestion
        const [entry] = await db
          .insert(knowledgeEntries)
          .values({
            userId,
            category: suggestion.category,
            context: suggestion.context,
            content: finalContent,
            examples: [],
            confidence: suggestion.confidence,
            usageCount: 0,
            isActive: true,
          })
          .returning();

        // Update suggestion status
        await db
          .update(knowledgeSuggestions)
          .set({
            status: "approved",
            reviewedBy: userId,
            reviewedAt: new Date(),
            reviewNotes: input.reviewNotes,
            knowledgeEntryId: entry.id,
          })
          .where(eq(knowledgeSuggestions.id, input.suggestionId));

        // Record creation in edit history
        await db.insert(knowledgeEditHistory).values({
          knowledgeEntryId: entry.id,
          userId,
          changeType: "created",
          newContent: finalContent,
          newCategory: suggestion.category,
          newSnapshot: {
            category: suggestion.category,
            context: suggestion.context,
            content: finalContent,
            confidence: suggestion.confidence,
          },
          reason: `Created from AI suggestion (ID: ${input.suggestionId})`,
          source: "ai_suggestion",
        });

        return {
          success: true,
          entry,
          suggestionId: input.suggestionId,
        };
      } catch (error) {
        console.error("Failed to approve suggestion:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to approve suggestion: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Reject a suggestion
   */
  rejectSuggestion: protectedProcedure
    .input(rejectSuggestionSchema)
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
        // Get suggestion
        const [suggestion] = await db
          .select()
          .from(knowledgeSuggestions)
          .where(
            and(
              eq(knowledgeSuggestions.id, input.suggestionId),
              eq(knowledgeSuggestions.userId, userId)
            )
          )
          .limit(1);

        if (!suggestion) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Suggestion not found",
          });
        }

        if (suggestion.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Suggestion is already ${suggestion.status}`,
          });
        }

        // Update suggestion status
        await db
          .update(knowledgeSuggestions)
          .set({
            status: "rejected",
            reviewedBy: userId,
            reviewedAt: new Date(),
            reviewNotes: input.reviewNotes,
          })
          .where(eq(knowledgeSuggestions.id, input.suggestionId));

        return {
          success: true,
          suggestionId: input.suggestionId,
        };
      } catch (error) {
        console.error("Failed to reject suggestion:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to reject suggestion: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Merge suggestion into existing knowledge entry
   */
  mergeSuggestion: protectedProcedure
    .input(mergeSuggestionSchema)
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
        // Get suggestion
        const [suggestion] = await db
          .select()
          .from(knowledgeSuggestions)
          .where(
            and(
              eq(knowledgeSuggestions.id, input.suggestionId),
              eq(knowledgeSuggestions.userId, userId)
            )
          )
          .limit(1);

        if (!suggestion) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Suggestion not found",
          });
        }

        if (suggestion.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Suggestion is already ${suggestion.status}`,
          });
        }

        // Get target knowledge entry
        const [targetEntry] = await db
          .select()
          .from(knowledgeEntries)
          .where(
            and(
              eq(knowledgeEntries.id, input.targetKnowledgeEntryId),
              eq(knowledgeEntries.userId, userId)
            )
          )
          .limit(1);

        if (!targetEntry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Target knowledge entry not found",
          });
        }

        // Merge content (append suggestion to existing content)
        const mergedContent = `${targetEntry.content}\n\n---\n\n${suggestion.suggestedContent}`;

        // Update knowledge entry
        const [updated] = await db
          .update(knowledgeEntries)
          .set({
            content: mergedContent,
          })
          .where(eq(knowledgeEntries.id, input.targetKnowledgeEntryId))
          .returning();

        // Update suggestion status
        await db
          .update(knowledgeSuggestions)
          .set({
            status: "merged",
            reviewedBy: userId,
            reviewedAt: new Date(),
            reviewNotes: input.reviewNotes,
            knowledgeEntryId: input.targetKnowledgeEntryId,
          })
          .where(eq(knowledgeSuggestions.id, input.suggestionId));

        // Record merge in edit history
        await db.insert(knowledgeEditHistory).values({
          knowledgeEntryId: input.targetKnowledgeEntryId,
          userId,
          changeType: "updated",
          previousContent: targetEntry.content,
          newContent: mergedContent,
          previousCategory: targetEntry.category,
          newCategory: targetEntry.category,
          previousSnapshot: {
            category: targetEntry.category,
            context: targetEntry.context,
            content: targetEntry.content,
            examples: targetEntry.examples,
            confidence: targetEntry.confidence,
          },
          newSnapshot: {
            category: updated.category,
            context: updated.context,
            content: updated.content,
            examples: updated.examples,
            confidence: updated.confidence,
          },
          reason: `Merged with AI suggestion (ID: ${input.suggestionId})`,
          source: "ai_suggestion",
        });

        return {
          success: true,
          entry: updated,
          suggestionId: input.suggestionId,
        };
      } catch (error) {
        console.error("Failed to merge suggestion:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to merge suggestion: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // FEEDBACK
  // ========================================

  /**
   * Submit feedback on a knowledge entry
   */
  submitFeedback: protectedProcedure
    .input(submitFeedbackSchema)
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
        // Verify entry exists
        const [entry] = await db
          .select()
          .from(knowledgeEntries)
          .where(
            and(
              eq(knowledgeEntries.id, input.knowledgeEntryId),
              eq(knowledgeEntries.userId, userId)
            )
          )
          .limit(1);

        if (!entry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Knowledge entry not found",
          });
        }

        // Create feedback
        const [feedback] = await db
          .insert(knowledgeFeedback)
          .values({
            knowledgeEntryId: input.knowledgeEntryId,
            userId,
            feedbackType: input.feedbackType,
            comment: input.comment,
            suggestedCorrection: input.suggestedCorrection,
            executionContext: input.executionContext,
            status: "pending",
          })
          .returning();

        return {
          success: true,
          feedback,
        };
      } catch (error) {
        console.error("Failed to submit feedback:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to submit feedback: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get feedback for knowledge entries
   */
  getFeedback: protectedProcedure
    .input(getFeedbackSchema)
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
        const conditions: any[] = [eq(knowledgeFeedback.userId, userId)];

        // Apply filters
        if (input.knowledgeEntryId) {
          conditions.push(
            eq(knowledgeFeedback.knowledgeEntryId, input.knowledgeEntryId)
          );
        }

        if (input.feedbackType) {
          conditions.push(eq(knowledgeFeedback.feedbackType, input.feedbackType));
        }

        if (input.status) {
          conditions.push(eq(knowledgeFeedback.status, input.status));
        }

        // Fetch feedback
        const feedback = await db
          .select()
          .from(knowledgeFeedback)
          .where(and(...conditions))
          .orderBy(desc(knowledgeFeedback.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Get total count
        const [countResult] = await db
          .select({ count: count() })
          .from(knowledgeFeedback)
          .where(and(...conditions));

        return {
          feedback,
          total: countResult?.count || 0,
        };
      } catch (error) {
        console.error("Failed to get feedback:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get feedback: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Resolve feedback
   */
  resolveFeedback: protectedProcedure
    .input(resolveFeedbackSchema)
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
        // Get feedback
        const [feedback] = await db
          .select()
          .from(knowledgeFeedback)
          .where(
            and(
              eq(knowledgeFeedback.id, input.feedbackId),
              eq(knowledgeFeedback.userId, userId)
            )
          )
          .limit(1);

        if (!feedback) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Feedback not found",
          });
        }

        // Update feedback status
        await db
          .update(knowledgeFeedback)
          .set({
            status: "reviewed",
            resolvedBy: userId,
            resolvedAt: new Date(),
            resolution: input.resolution,
          })
          .where(eq(knowledgeFeedback.id, input.feedbackId));

        return {
          success: true,
          feedbackId: input.feedbackId,
        };
      } catch (error) {
        console.error("Failed to resolve feedback:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to resolve feedback: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // ANALYTICS
  // ========================================

  /**
   * Get most used knowledge entries
   */
  getUsageStats: protectedProcedure
    .input(getUsageStatsSchema)
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
        const conditions: any[] = [
          eq(knowledgeEntries.userId, userId),
          eq(knowledgeEntries.isActive, true),
        ];

        if (input.category) {
          conditions.push(eq(knowledgeEntries.category, input.category));
        }

        const topEntries = await db
          .select()
          .from(knowledgeEntries)
          .where(and(...conditions))
          .orderBy(desc(knowledgeEntries.usageCount))
          .limit(input.limit);

        return {
          topEntries,
        };
      } catch (error) {
        console.error("Failed to get usage stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get usage stats: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get entries breakdown by category
   */
  getCategoryBreakdown: protectedProcedure
    .input(getCategoryBreakdownSchema)
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
        const conditions: any[] = [eq(knowledgeEntries.userId, userId)];

        if (!input.includeInactive) {
          conditions.push(eq(knowledgeEntries.isActive, true));
        }

        const breakdown = await db
          .select({
            category: knowledgeEntries.category,
            count: count(),
            totalUsage: sum(knowledgeEntries.usageCount),
          })
          .from(knowledgeEntries)
          .where(and(...conditions))
          .groupBy(knowledgeEntries.category);

        return {
          breakdown,
        };
      } catch (error) {
        console.error("Failed to get category breakdown:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get category breakdown: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get quality metrics (confidence and success rates)
   */
  getQualityMetrics: protectedProcedure
    .input(getQualityMetricsSchema)
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
        const conditions: any[] = [
          eq(knowledgeEntries.userId, userId),
          eq(knowledgeEntries.isActive, true),
        ];

        if (input.category) {
          conditions.push(eq(knowledgeEntries.category, input.category));
        }

        // Get average confidence
        const [confidenceResult] = await db
          .select({
            avgConfidence: sql<number>`AVG(${knowledgeEntries.confidence}::decimal)`,
            totalEntries: count(),
          })
          .from(knowledgeEntries)
          .where(and(...conditions));

        // Get feedback statistics
        const feedbackStats = await db
          .select({
            feedbackType: knowledgeFeedback.feedbackType,
            count: count(),
          })
          .from(knowledgeFeedback)
          .innerJoin(
            knowledgeEntries,
            eq(knowledgeFeedback.knowledgeEntryId, knowledgeEntries.id)
          )
          .where(and(...conditions))
          .groupBy(knowledgeFeedback.feedbackType);

        // Get suggestion stats
        const suggestionConditions: any[] = [
          eq(knowledgeSuggestions.userId, userId),
        ];

        if (input.category) {
          suggestionConditions.push(
            eq(knowledgeSuggestions.category, input.category)
          );
        }

        const [suggestionStats] = await db
          .select({
            total: count(),
            avgConfidence: sql<number>`AVG(${knowledgeSuggestions.confidence}::decimal)`,
          })
          .from(knowledgeSuggestions)
          .where(and(...suggestionConditions));

        const suggestionStatusBreakdown = await db
          .select({
            status: knowledgeSuggestions.status,
            count: count(),
          })
          .from(knowledgeSuggestions)
          .where(and(...suggestionConditions))
          .groupBy(knowledgeSuggestions.status);

        return {
          entries: {
            total: confidenceResult?.totalEntries || 0,
            avgConfidence: Number(confidenceResult?.avgConfidence || 0),
          },
          feedback: {
            breakdown: Object.fromEntries(
              feedbackStats.map((f) => [f.feedbackType, f.count])
            ),
            total: feedbackStats.reduce((sum, f) => sum + Number(f.count), 0),
          },
          suggestions: {
            total: suggestionStats?.total || 0,
            avgConfidence: Number(suggestionStats?.avgConfidence || 0),
            byStatus: Object.fromEntries(
              suggestionStatusBreakdown.map((s) => [s.status, s.count])
            ),
          },
        };
      } catch (error) {
        console.error("Failed to get quality metrics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get quality metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Increment usage count for a knowledge entry
   * Called when the entry is used by the agent
   */
  incrementUsage: protectedProcedure
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
        // Verify entry ownership
        const [entry] = await db
          .select()
          .from(knowledgeEntries)
          .where(
            and(
              eq(knowledgeEntries.id, input.id),
              eq(knowledgeEntries.userId, userId)
            )
          )
          .limit(1);

        if (!entry) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Knowledge entry not found",
          });
        }

        // Increment usage count
        await db
          .update(knowledgeEntries)
          .set({
            usageCount: sql`${knowledgeEntries.usageCount} + 1`,
          })
          .where(eq(knowledgeEntries.id, input.id));

        return {
          success: true,
          id: input.id,
          newCount: entry.usageCount + 1,
        };
      } catch (error) {
        console.error("Failed to increment usage:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to increment usage: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
