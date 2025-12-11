import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { lead_lists, leads } from "../../../drizzle/schema";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";
import { AppifyService } from "../../services/appify.service";
import { CreditService } from "../../services/credit.service";

/**
 * Lead Enrichment Router
 * Handles CSV upload, lead enrichment via Appify, and lead management
 *
 * Features:
 * - Upload CSV files with leads
 * - Batch enrichment with credit tracking
 * - Lead list management
 * - Individual lead enrichment
 * - Export enriched data
 *
 * PLACEHOLDER: userId is hardcoded to 1 until authentication is implemented
 */

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createLeadListSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
});

const uploadLeadsSchema = z.object({
  listId: z.number().int(),
  leads: z.array(
    z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      website: z.string().url().optional(),
      linkedIn: z.string().url().optional(),
      jobTitle: z.string().optional(),
      // Any additional fields
    }).passthrough()
  ),
});

const enrichLeadSchema = z.object({
  leadId: z.number().int(),
});

const enrichListSchema = z.object({
  listId: z.number().int(),
  batchSize: z.number().int().positive().default(5),
});

// ========================================
// LEAD ENRICHMENT ROUTER
// ========================================

export const leadEnrichmentRouter = router({
  /**
   * Create a new lead list
   */
  createList: publicProcedure
    .input(createLeadListSchema)
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

      const result = await db
        .insert(lead_lists)
        .values({
          userId,
          name: input.name,
          description: input.description,
          fileName: input.fileName,
          fileSize: input.fileSize,
          status: "uploading",
          totalLeads: 0,
          enrichedLeads: 0,
          failedLeads: 0,
          costInCredits: 0,
          metadata: input.metadata,
          uploadedAt: new Date(),
        })
        .returning();

      return result[0];
    }),

  /**
   * Get all lead lists for user
   */
  getLists: publicProcedure
    .input(
      z.object({
        limit: z.number().int().positive().default(50),
        offset: z.number().int().nonnegative().default(0),
        status: z.enum(["uploading", "processing", "completed", "failed"]).optional(),
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

      let query = db
        .select()
        .from(lead_lists)
        .where(eq(lead_lists.userId, userId))
        .orderBy(desc(lead_lists.uploadedAt))
        .limit(input.limit)
        .offset(input.offset);

      if (input.status) {
        query = db
          .select()
          .from(lead_lists)
          .where(and(eq(lead_lists.userId, userId), eq(lead_lists.status, input.status)))
          .orderBy(desc(lead_lists.uploadedAt))
          .limit(input.limit)
          .offset(input.offset);
      }

      const lists = await query;

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(lead_lists)
        .where(eq(lead_lists.userId, userId));

      return {
        lists,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get a single lead list by ID
   */
  getList: publicProcedure
    .input(z.object({ listId: z.number().int() }))
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

      const result = await db
        .select()
        .from(lead_lists)
        .where(and(eq(lead_lists.id, input.listId), eq(lead_lists.userId, userId)))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead list not found",
        });
      }

      return result[0];
    }),

  /**
   * Upload leads to a list
   */
  uploadLeads: publicProcedure
    .input(uploadLeadsSchema)
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

      // Verify list exists and belongs to user
      const listResult = await db
        .select()
        .from(lead_lists)
        .where(and(eq(lead_lists.id, input.listId), eq(lead_lists.userId, userId)))
        .limit(1);

      if (listResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead list not found",
        });
      }

      // Insert leads
      const leadValues = input.leads.map((lead) => ({
        listId: input.listId,
        userId,
        rawData: lead,
        enrichmentStatus: "pending" as const,
        creditsUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(leads).values(leadValues);

      // Update list total
      await db
        .update(lead_lists)
        .set({
          totalLeads: sql`${lead_lists.totalLeads} + ${input.leads.length}`,
          status: "processing",
        })
        .where(eq(lead_lists.id, input.listId));

      return {
        success: true,
        count: input.leads.length,
      };
    }),

  /**
   * Get leads in a list
   */
  getLeads: publicProcedure
    .input(
      z.object({
        listId: z.number().int(),
        limit: z.number().int().positive().default(50),
        offset: z.number().int().nonnegative().default(0),
        enrichmentStatus: z.enum(["pending", "enriched", "failed", "skipped"]).optional(),
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

      // Verify list exists and belongs to user
      const listResult = await db
        .select()
        .from(lead_lists)
        .where(and(eq(lead_lists.id, input.listId), eq(lead_lists.userId, userId)))
        .limit(1);

      if (listResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead list not found",
        });
      }

      let query = db
        .select()
        .from(leads)
        .where(eq(leads.listId, input.listId))
        .orderBy(desc(leads.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      if (input.enrichmentStatus) {
        query = db
          .select()
          .from(leads)
          .where(
            and(eq(leads.listId, input.listId), eq(leads.enrichmentStatus, input.enrichmentStatus))
          )
          .orderBy(desc(leads.createdAt))
          .limit(input.limit)
          .offset(input.offset);
      }

      const leadList = await query;

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(leads)
        .where(eq(leads.listId, input.listId));

      return {
        leads: leadList,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Enrich a single lead
   */
  enrichLead: publicProcedure
    .input(enrichLeadSchema)
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

      // Get lead
      const leadResult = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, userId)))
        .limit(1);

      if (leadResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead not found",
        });
      }

      const lead = leadResult[0];

      // Check if already enriched
      if (lead.enrichmentStatus === "enriched") {
        return {
          success: true,
          message: "Lead already enriched",
          data: lead.enrichedData,
        };
      }

      // Check credits
      const creditService = new CreditService();
      const hasCredits = await creditService.checkBalance(userId, "enrichment", 1);

      if (!hasCredits) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Insufficient enrichment credits",
        });
      }

      // Enrich lead
      const appifyService = new AppifyService();

      try {
        const enrichedData = await appifyService.enrichLead(lead.rawData as any);

        // Deduct credits
        await creditService.deductCredits(
          userId,
          1,
          "enrichment",
          `Lead enrichment for lead ${input.leadId}`,
          input.leadId.toString(),
          "lead"
        );

        // Update lead
        await db
          .update(leads)
          .set({
            enrichedData,
            enrichmentStatus: "enriched",
            creditsUsed: 1,
            enrichedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(leads.id, input.leadId));

        // Update list stats
        await db
          .update(lead_lists)
          .set({
            enrichedLeads: sql`${lead_lists.enrichedLeads} + 1`,
            costInCredits: sql`${lead_lists.costInCredits} + 1`,
          })
          .where(eq(lead_lists.id, lead.listId));

        return {
          success: true,
          data: enrichedData,
        };
      } catch (error: any) {
        // Mark as failed
        await db
          .update(leads)
          .set({
            enrichmentStatus: "failed",
            error: error.message,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, input.leadId));

        // Update list stats
        await db
          .update(lead_lists)
          .set({
            failedLeads: sql`${lead_lists.failedLeads} + 1`,
          })
          .where(eq(lead_lists.id, lead.listId));

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Enrichment failed: ${error.message}`,
        });
      }
    }),

  /**
   * Batch enrich all pending leads in a list
   */
  enrichList: publicProcedure
    .input(enrichListSchema)
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

      // Verify list exists
      const listResult = await db
        .select()
        .from(lead_lists)
        .where(and(eq(lead_lists.id, input.listId), eq(lead_lists.userId, userId)))
        .limit(1);

      if (listResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead list not found",
        });
      }

      // Get pending leads
      const pendingLeads = await db
        .select()
        .from(leads)
        .where(and(eq(leads.listId, input.listId), eq(leads.enrichmentStatus, "pending")));

      if (pendingLeads.length === 0) {
        return {
          success: true,
          message: "No pending leads to enrich",
          enriched: 0,
          failed: 0,
        };
      }

      // Check credits
      const creditService = new CreditService();
      const hasCredits = await creditService.checkBalance(userId, "enrichment", pendingLeads.length);

      if (!hasCredits) {
        const balance = await creditService.getBalance(userId, "enrichment");
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Insufficient credits. Need ${pendingLeads.length}, have ${balance}`,
        });
      }

      // Update list status
      await db
        .update(lead_lists)
        .set({
          status: "processing",
          processingStartedAt: new Date(),
        })
        .where(eq(lead_lists.id, input.listId));

      // Enrich leads in batches
      const appifyService = new AppifyService();
      const results = await appifyService.batchEnrichLeads(
        pendingLeads.map((l) => l.rawData as any),
        input.batchSize
      );

      let enrichedCount = 0;
      let failedCount = 0;

      // Process results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const lead = pendingLeads[i];

        if (result.success && result.data) {
          // Update lead
          await db
            .update(leads)
            .set({
              enrichedData: result.data,
              enrichmentStatus: "enriched",
              creditsUsed: 1,
              enrichedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.id));

          // Deduct credits
          await creditService.deductCredits(
            userId,
            1,
            "enrichment",
            `Lead enrichment for lead ${lead.id}`,
            lead.id.toString(),
            "lead"
          );

          enrichedCount++;
        } else {
          // Mark as failed
          await db
            .update(leads)
            .set({
              enrichmentStatus: "failed",
              error: result.error || "Unknown error",
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.id));

          failedCount++;
        }
      }

      // Update list stats
      await db
        .update(lead_lists)
        .set({
          enrichedLeads: sql`${lead_lists.enrichedLeads} + ${enrichedCount}`,
          failedLeads: sql`${lead_lists.failedLeads} + ${failedCount}`,
          costInCredits: sql`${lead_lists.costInCredits} + ${enrichedCount}`,
          status: "completed",
          processedAt: new Date(),
        })
        .where(eq(lead_lists.id, input.listId));

      return {
        success: true,
        enriched: enrichedCount,
        failed: failedCount,
        total: pendingLeads.length,
      };
    }),

  /**
   * Delete a lead list
   */
  deleteList: publicProcedure
    .input(z.object({ listId: z.number().int() }))
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

      // Verify ownership
      const listResult = await db
        .select()
        .from(lead_lists)
        .where(and(eq(lead_lists.id, input.listId), eq(lead_lists.userId, userId)))
        .limit(1);

      if (listResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead list not found",
        });
      }

      // Delete list (cascade will delete leads)
      await db.delete(lead_lists).where(eq(lead_lists.id, input.listId));

      return { success: true };
    }),

  /**
   * Export enriched leads as JSON
   */
  exportLeads: publicProcedure
    .input(z.object({ listId: z.number().int() }))
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

      // Verify list exists
      const listResult = await db
        .select()
        .from(lead_lists)
        .where(and(eq(lead_lists.id, input.listId), eq(lead_lists.userId, userId)))
        .limit(1);

      if (listResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead list not found",
        });
      }

      // Get all enriched leads
      const enrichedLeads = await db
        .select()
        .from(leads)
        .where(and(eq(leads.listId, input.listId), eq(leads.enrichmentStatus, "enriched")));

      return {
        list: listResult[0],
        leads: enrichedLeads.map((lead) => ({
          id: lead.id,
          rawData: lead.rawData,
          enrichedData: lead.enrichedData,
          enrichedAt: lead.enrichedAt,
        })),
      };
    }),
});
