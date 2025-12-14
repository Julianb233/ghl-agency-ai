import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { eq, and, desc, asc, or, sql, inArray } from "drizzle-orm";

import {
  sopCategories,
  sopDocuments,
  sopSteps,
  sopVersions,
  sopExecutions,
  type SopCategory,
  type SopDocument,
  type SopStep,
  type SopVersion,
  type SopExecution,
} from "../../../drizzle/schema-sop";

// ========================================
// VALIDATION SCHEMAS
// ========================================

// Category Schemas
const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

const updateCategorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// SOP Document Schemas
const sopStatusEnum = z.enum(["draft", "published", "archived"]);
const priorityEnum = z.enum(["low", "medium", "high", "critical"]);
const automationLevelEnum = z.enum(["full", "semi", "manual"]);

const createSopSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  objective: z.string().max(5000).optional(),
  applicableTo: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  triggers: z.array(z.string()).optional(),
  estimatedDuration: z.number().int().min(0).optional(),
  priority: priorityEnum.default("medium"),
  tags: z.array(z.string()).optional(),
  aiEnabled: z.boolean().default(true),
  humanApprovalRequired: z.boolean().default(false),
  automationLevel: automationLevelEnum.default("semi"),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateSopSchema = z.object({
  id: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable().optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  objective: z.string().max(5000).optional(),
  applicableTo: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  triggers: z.array(z.string()).optional(),
  estimatedDuration: z.number().int().min(0).optional(),
  priority: priorityEnum.optional(),
  tags: z.array(z.string()).optional(),
  aiEnabled: z.boolean().optional(),
  humanApprovalRequired: z.boolean().optional(),
  automationLevel: automationLevelEnum.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const listSopsSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  status: sopStatusEnum.optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["title", "createdAt", "updatedAt", "lastExecutedAt", "executionCount"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// Step Schemas
const actionTypeEnum = z.enum(["manual", "browser", "api", "webhook", "ai_decision"]);

const stepSchema = z.object({
  stepNumber: z.number().int().min(1),
  title: z.string().min(1).max(255),
  instructions: z.string().min(1),
  actionType: actionTypeEnum.default("manual"),
  actionConfig: z.record(z.string(), z.any()).optional(),
  conditions: z.record(z.string(), z.any()).optional(),
  alternatives: z.record(z.string(), z.any()).optional(),
  expectedOutcome: z.string().max(2000).optional(),
  validationCriteria: z.record(z.string(), z.any()).optional(),
  errorHandling: z.record(z.string(), z.any()).optional(),
  resources: z.record(z.string(), z.any()).optional(),
  examples: z.record(z.string(), z.any()).optional(),
  tips: z.string().max(2000).optional(),
  estimatedDuration: z.number().int().min(0).optional(),
  timeout: z.number().int().min(0).optional(),
  dependsOn: z.array(z.number().int()).optional(),
});

const addStepSchema = z.object({
  sopId: z.number().int().positive(),
}).merge(stepSchema);

const updateStepSchema = z.object({
  id: z.number().int().positive(),
  stepNumber: z.number().int().min(1).optional(),
  title: z.string().min(1).max(255).optional(),
  instructions: z.string().min(1).optional(),
  actionType: actionTypeEnum.optional(),
  actionConfig: z.record(z.string(), z.any()).optional(),
  conditions: z.record(z.string(), z.any()).optional(),
  alternatives: z.record(z.string(), z.any()).optional(),
  expectedOutcome: z.string().max(2000).optional(),
  validationCriteria: z.record(z.string(), z.any()).optional(),
  errorHandling: z.record(z.string(), z.any()).optional(),
  resources: z.record(z.string(), z.any()).optional(),
  examples: z.record(z.string(), z.any()).optional(),
  tips: z.string().max(2000).optional(),
  estimatedDuration: z.number().int().min(0).optional(),
  timeout: z.number().int().min(0).optional(),
  dependsOn: z.array(z.number().int()).optional(),
});

const reorderStepsSchema = z.object({
  sopId: z.number().int().positive(),
  stepOrders: z.array(
    z.object({
      id: z.number().int().positive(),
      stepNumber: z.number().int().min(1),
    })
  ),
});

// Version Schemas
const changeTypeEnum = z.enum(["created", "updated", "published", "archived"]);

const createVersionSchema = z.object({
  sopId: z.number().int().positive(),
  changeType: changeTypeEnum,
  changeSummary: z.string().max(5000).optional(),
});

// Execution Schemas
const executorTypeEnum = z.enum(["human", "ai_agent", "hybrid"]);
const executionStatusEnum = z.enum(["in_progress", "completed", "failed", "aborted"]);

const startExecutionSchema = z.object({
  sopId: z.number().int().positive(),
  executorType: executorTypeEnum.default("human"),
  agentSessionId: z.number().int().positive().optional(),
  context: z.record(z.string(), z.any()).optional(),
});

const updateExecutionProgressSchema = z.object({
  id: z.number().int().positive(),
  currentStepIndex: z.number().int().min(0),
  stepResults: z.array(z.record(z.string(), z.any())),
});

const completeExecutionSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["completed", "failed", "aborted"]),
  result: z.record(z.string(), z.any()).optional(),
  feedback: z.string().max(5000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  issues: z.array(z.record(z.string(), z.any())).optional(),
});

const listExecutionsSchema = z.object({
  sopId: z.number().int().positive().optional(),
  status: executionStatusEnum.optional(),
  executorType: executorTypeEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// ========================================
// SOP ROUTER
// ========================================

export const sopRouter = router({
  // ========================================
  // CATEGORY CRUD
  // ========================================

  /**
   * Create a new SOP category
   */
  createCategory: protectedProcedure
    .input(createCategorySchema)
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
        const [category] = await db
          .insert(sopCategories)
          .values({
            userId,
            name: input.name,
            description: input.description,
            icon: input.icon,
            color: input.color,
            sortOrder: input.sortOrder,
            isActive: true,
          })
          .returning();

        return category;
      } catch (error) {
        console.error("Failed to create category:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create category: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List all categories for the authenticated user
   */
  getCategories: protectedProcedure
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

      try {
        const params = input || { includeInactive: false };
        const conditions = [eq(sopCategories.userId, userId)];

        if (!params.includeInactive) {
          conditions.push(eq(sopCategories.isActive, true));
        }

        const categories = await db
          .select()
          .from(sopCategories)
          .where(and(...conditions))
          .orderBy(asc(sopCategories.sortOrder), asc(sopCategories.name));

        return categories;
      } catch (error) {
        console.error("Failed to get categories:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get categories: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Update a category
   */
  updateCategory: protectedProcedure
    .input(updateCategorySchema)
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
          .from(sopCategories)
          .where(and(
            eq(sopCategories.id, input.id),
            eq(sopCategories.userId, userId)
          ))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found",
          });
        }

        const updateData: Partial<typeof sopCategories.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.icon !== undefined) updateData.icon = input.icon;
        if (input.color !== undefined) updateData.color = input.color;
        if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        const [updated] = await db
          .update(sopCategories)
          .set(updateData)
          .where(eq(sopCategories.id, input.id))
          .returning();

        return updated;
      } catch (error) {
        console.error("Failed to update category:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update category: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Soft delete a category
   */
  deleteCategory: protectedProcedure
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
          .from(sopCategories)
          .where(and(
            eq(sopCategories.id, input.id),
            eq(sopCategories.userId, userId)
          ))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found",
          });
        }

        // Soft delete
        await db
          .update(sopCategories)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(sopCategories.id, input.id));

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Failed to delete category:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete category: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // SOP DOCUMENT CRUD
  // ========================================

  /**
   * Create a new SOP document
   */
  createSop: protectedProcedure
    .input(createSopSchema)
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
        // Verify category ownership if categoryId provided
        if (input.categoryId) {
          const [category] = await db
            .select()
            .from(sopCategories)
            .where(and(
              eq(sopCategories.id, input.categoryId),
              eq(sopCategories.userId, userId)
            ))
            .limit(1);

          if (!category) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Category not found",
            });
          }
        }

        const [sop] = await db
          .insert(sopDocuments)
          .values({
            userId,
            categoryId: input.categoryId,
            title: input.title,
            description: input.description,
            objective: input.objective,
            applicableTo: input.applicableTo,
            prerequisites: input.prerequisites,
            triggers: input.triggers,
            estimatedDuration: input.estimatedDuration,
            priority: input.priority,
            tags: input.tags,
            aiEnabled: input.aiEnabled,
            humanApprovalRequired: input.humanApprovalRequired,
            automationLevel: input.automationLevel,
            metadata: input.metadata,
            version: 1,
            status: "draft",
            executionCount: 0,
          })
          .returning();

        // Create initial version
        await db.insert(sopVersions).values({
          sopId: sop.id,
          userId,
          version: 1,
          title: sop.title,
          description: sop.description || null,
          snapshot: {
            sop,
            steps: [],
          },
          changeType: "created",
          changeSummary: "Initial version created",
        });

        return sop;
      } catch (error) {
        console.error("Failed to create SOP:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create SOP: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List SOPs with filtering
   */
  getSops: protectedProcedure
    .input(listSopsSchema)
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
        const conditions: any[] = [eq(sopDocuments.userId, userId)];

        // Category filter
        if (input.categoryId) {
          conditions.push(eq(sopDocuments.categoryId, input.categoryId));
        }

        // Status filter
        if (input.status) {
          conditions.push(eq(sopDocuments.status, input.status));
        }

        // Search filter
        if (input.search) {
          conditions.push(
            or(
              sql`${sopDocuments.title} ILIKE ${`%${input.search}%`}`,
              sql`${sopDocuments.description} ILIKE ${`%${input.search}%`}`
            )
          );
        }

        // Tags filter
        if (input.tags && input.tags.length > 0) {
          conditions.push(
            sql`${sopDocuments.tags} ?| array[${sql.join(input.tags.map(t => sql`${t}`), sql`, `)}]`
          );
        }

        // Determine sort column
        let orderByColumn;
        switch (input.sortBy) {
          case "title":
            orderByColumn = sopDocuments.title;
            break;
          case "createdAt":
            orderByColumn = sopDocuments.createdAt;
            break;
          case "lastExecutedAt":
            orderByColumn = sopDocuments.lastExecutedAt;
            break;
          case "executionCount":
            orderByColumn = sopDocuments.executionCount;
            break;
          default:
            orderByColumn = sopDocuments.updatedAt;
        }

        const orderFn = input.sortOrder === "asc" ? asc : desc;

        const sops = await db
          .select()
          .from(sopDocuments)
          .where(and(...conditions))
          .orderBy(orderFn(orderByColumn))
          .limit(input.limit)
          .offset(input.offset);

        return sops;
      } catch (error) {
        console.error("Failed to list SOPs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list SOPs: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get a single SOP by ID with all steps
   */
  getSopById: protectedProcedure
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
        const [sop] = await db
          .select()
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, input.id),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!sop) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        // Get all steps for this SOP
        const steps = await db
          .select()
          .from(sopSteps)
          .where(eq(sopSteps.sopId, input.id))
          .orderBy(asc(sopSteps.stepNumber));

        return {
          ...sop,
          steps,
        };
      } catch (error) {
        console.error("Failed to get SOP:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get SOP: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Update an SOP document
   */
  updateSop: protectedProcedure
    .input(updateSopSchema)
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
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, input.id),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        // Verify category ownership if changing category
        if (input.categoryId !== undefined && input.categoryId !== null) {
          const [category] = await db
            .select()
            .from(sopCategories)
            .where(and(
              eq(sopCategories.id, input.categoryId),
              eq(sopCategories.userId, userId)
            ))
            .limit(1);

          if (!category) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Category not found",
            });
          }
        }

        const updateData: Partial<typeof sopDocuments.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.objective !== undefined) updateData.objective = input.objective;
        if (input.applicableTo !== undefined) updateData.applicableTo = input.applicableTo;
        if (input.prerequisites !== undefined) updateData.prerequisites = input.prerequisites;
        if (input.triggers !== undefined) updateData.triggers = input.triggers;
        if (input.estimatedDuration !== undefined) updateData.estimatedDuration = input.estimatedDuration;
        if (input.priority !== undefined) updateData.priority = input.priority;
        if (input.tags !== undefined) updateData.tags = input.tags;
        if (input.aiEnabled !== undefined) updateData.aiEnabled = input.aiEnabled;
        if (input.humanApprovalRequired !== undefined) updateData.humanApprovalRequired = input.humanApprovalRequired;
        if (input.automationLevel !== undefined) updateData.automationLevel = input.automationLevel;
        if (input.metadata !== undefined) updateData.metadata = input.metadata;

        const [updated] = await db
          .update(sopDocuments)
          .set(updateData)
          .where(eq(sopDocuments.id, input.id))
          .returning();

        return updated;
      } catch (error) {
        console.error("Failed to update SOP:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update SOP: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Publish an SOP (change status to published)
   */
  publishSop: protectedProcedure
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
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, input.id),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        // Get all steps for snapshot
        const steps = await db
          .select()
          .from(sopSteps)
          .where(eq(sopSteps.sopId, input.id))
          .orderBy(asc(sopSteps.stepNumber));

        // Increment version
        const newVersion = existing.version + 1;

        const [updated] = await db
          .update(sopDocuments)
          .set({
            status: "published",
            publishedAt: new Date(),
            version: newVersion,
            updatedAt: new Date(),
          })
          .where(eq(sopDocuments.id, input.id))
          .returning();

        // Create version snapshot
        await db.insert(sopVersions).values({
          sopId: input.id,
          userId,
          version: newVersion,
          title: updated.title,
          description: updated.description || null,
          snapshot: {
            sop: updated,
            steps,
          },
          changeType: "published",
          changeSummary: "SOP published",
        });

        return updated;
      } catch (error) {
        console.error("Failed to publish SOP:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to publish SOP: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Archive an SOP
   */
  archiveSop: protectedProcedure
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
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, input.id),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        const [updated] = await db
          .update(sopDocuments)
          .set({
            status: "archived",
            updatedAt: new Date(),
          })
          .where(eq(sopDocuments.id, input.id))
          .returning();

        // Create version snapshot
        const steps = await db
          .select()
          .from(sopSteps)
          .where(eq(sopSteps.sopId, input.id))
          .orderBy(asc(sopSteps.stepNumber));

        await db.insert(sopVersions).values({
          sopId: input.id,
          userId,
          version: existing.version,
          title: updated.title,
          description: updated.description || null,
          snapshot: {
            sop: updated,
            steps,
          },
          changeType: "archived",
          changeSummary: "SOP archived",
        });

        return updated;
      } catch (error) {
        console.error("Failed to archive SOP:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to archive SOP: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Soft delete an SOP
   */
  deleteSop: protectedProcedure
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
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, input.id),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        // Archive instead of hard delete (soft delete)
        await db
          .update(sopDocuments)
          .set({
            status: "archived",
            updatedAt: new Date(),
          })
          .where(eq(sopDocuments.id, input.id));

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Failed to delete SOP:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete SOP: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // STEP MANAGEMENT
  // ========================================

  /**
   * Add a step to an SOP
   */
  addStep: protectedProcedure
    .input(addStepSchema)
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
        // Verify SOP ownership
        const [sop] = await db
          .select()
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, input.sopId),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!sop) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        const [step] = await db
          .insert(sopSteps)
          .values({
            sopId: input.sopId,
            stepNumber: input.stepNumber,
            title: input.title,
            instructions: input.instructions,
            actionType: input.actionType,
            actionConfig: input.actionConfig,
            conditions: input.conditions,
            alternatives: input.alternatives,
            expectedOutcome: input.expectedOutcome,
            validationCriteria: input.validationCriteria,
            errorHandling: input.errorHandling,
            resources: input.resources,
            examples: input.examples,
            tips: input.tips,
            estimatedDuration: input.estimatedDuration,
            timeout: input.timeout,
            dependsOn: input.dependsOn,
          })
          .returning();

        // Update SOP's updatedAt timestamp
        await db
          .update(sopDocuments)
          .set({ updatedAt: new Date() })
          .where(eq(sopDocuments.id, input.sopId));

        return step;
      } catch (error) {
        console.error("Failed to add step:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to add step: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Update a step
   */
  updateStep: protectedProcedure
    .input(updateStepSchema)
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
        // Get the step to verify ownership via SOP
        const [existingStep] = await db
          .select()
          .from(sopSteps)
          .where(eq(sopSteps.id, input.id))
          .limit(1);

        if (!existingStep) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Step not found",
          });
        }

        // Verify SOP ownership
        const [sop] = await db
          .select()
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, existingStep.sopId),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!sop) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        const updateData: Partial<typeof sopSteps.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (input.stepNumber !== undefined) updateData.stepNumber = input.stepNumber;
        if (input.title !== undefined) updateData.title = input.title;
        if (input.instructions !== undefined) updateData.instructions = input.instructions;
        if (input.actionType !== undefined) updateData.actionType = input.actionType;
        if (input.actionConfig !== undefined) updateData.actionConfig = input.actionConfig;
        if (input.conditions !== undefined) updateData.conditions = input.conditions;
        if (input.alternatives !== undefined) updateData.alternatives = input.alternatives;
        if (input.expectedOutcome !== undefined) updateData.expectedOutcome = input.expectedOutcome;
        if (input.validationCriteria !== undefined) updateData.validationCriteria = input.validationCriteria;
        if (input.errorHandling !== undefined) updateData.errorHandling = input.errorHandling;
        if (input.resources !== undefined) updateData.resources = input.resources;
        if (input.examples !== undefined) updateData.examples = input.examples;
        if (input.tips !== undefined) updateData.tips = input.tips;
        if (input.estimatedDuration !== undefined) updateData.estimatedDuration = input.estimatedDuration;
        if (input.timeout !== undefined) updateData.timeout = input.timeout;
        if (input.dependsOn !== undefined) updateData.dependsOn = input.dependsOn;

        const [updated] = await db
          .update(sopSteps)
          .set(updateData)
          .where(eq(sopSteps.id, input.id))
          .returning();

        // Update SOP's updatedAt timestamp
        await db
          .update(sopDocuments)
          .set({ updatedAt: new Date() })
          .where(eq(sopDocuments.id, existingStep.sopId));

        return updated;
      } catch (error) {
        console.error("Failed to update step:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update step: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Reorder steps in an SOP
   */
  reorderSteps: protectedProcedure
    .input(reorderStepsSchema)
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
        // Verify SOP ownership
        const [sop] = await db
          .select()
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, input.sopId),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!sop) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        // Update each step's stepNumber
        for (const stepOrder of input.stepOrders) {
          await db
            .update(sopSteps)
            .set({
              stepNumber: stepOrder.stepNumber,
              updatedAt: new Date(),
            })
            .where(and(
              eq(sopSteps.id, stepOrder.id),
              eq(sopSteps.sopId, input.sopId)
            ));
        }

        // Update SOP's updatedAt timestamp
        await db
          .update(sopDocuments)
          .set({ updatedAt: new Date() })
          .where(eq(sopDocuments.id, input.sopId));

        return { success: true, sopId: input.sopId };
      } catch (error) {
        console.error("Failed to reorder steps:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to reorder steps: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Delete a step
   */
  deleteStep: protectedProcedure
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
        // Get the step to verify ownership via SOP
        const [existingStep] = await db
          .select()
          .from(sopSteps)
          .where(eq(sopSteps.id, input.id))
          .limit(1);

        if (!existingStep) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Step not found",
          });
        }

        // Verify SOP ownership
        const [sop] = await db
          .select()
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, existingStep.sopId),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!sop) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        // Delete the step (cascade will handle this)
        await db
          .delete(sopSteps)
          .where(eq(sopSteps.id, input.id));

        // Update SOP's updatedAt timestamp
        await db
          .update(sopDocuments)
          .set({ updatedAt: new Date() })
          .where(eq(sopDocuments.id, existingStep.sopId));

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Failed to delete step:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete step: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // VERSION MANAGEMENT
  // ========================================

  /**
   * Create a version snapshot
   */
  createVersion: protectedProcedure
    .input(createVersionSchema)
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
        // Verify SOP ownership
        const [sop] = await db
          .select()
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, input.sopId),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!sop) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        // Get all steps
        const steps = await db
          .select()
          .from(sopSteps)
          .where(eq(sopSteps.sopId, input.sopId))
          .orderBy(asc(sopSteps.stepNumber));

        // Increment version
        const newVersion = sop.version + 1;

        // Update SOP version
        await db
          .update(sopDocuments)
          .set({
            version: newVersion,
            updatedAt: new Date(),
          })
          .where(eq(sopDocuments.id, input.sopId));

        // Create version record
        const [version] = await db
          .insert(sopVersions)
          .values({
            sopId: input.sopId,
            userId,
            version: newVersion,
            title: sop.title,
            description: sop.description || null,
            snapshot: {
              sop,
              steps,
            },
            changeType: input.changeType,
            changeSummary: input.changeSummary,
          })
          .returning();

        return version;
      } catch (error) {
        console.error("Failed to create version:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create version: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get version history for an SOP
   */
  getVersions: protectedProcedure
    .input(
      z.object({
        sopId: z.number().int().positive(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
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

      try {
        // Verify SOP ownership
        const [sop] = await db
          .select()
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, input.sopId),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!sop) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        const versions = await db
          .select()
          .from(sopVersions)
          .where(eq(sopVersions.sopId, input.sopId))
          .orderBy(desc(sopVersions.version))
          .limit(input.limit)
          .offset(input.offset);

        return versions;
      } catch (error) {
        console.error("Failed to get versions:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get versions: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Restore to a previous version
   */
  restoreVersion: protectedProcedure
    .input(z.object({ versionId: z.number().int().positive() }))
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
        // Get the version
        const [version] = await db
          .select()
          .from(sopVersions)
          .where(and(
            eq(sopVersions.id, input.versionId),
            eq(sopVersions.userId, userId)
          ))
          .limit(1);

        if (!version) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Version not found",
          });
        }

        // Verify SOP ownership
        const [sop] = await db
          .select()
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, version.sopId),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!sop) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        const snapshot = version.snapshot as any;
        if (!snapshot || !snapshot.sop) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid version snapshot",
          });
        }

        // Delete existing steps
        await db
          .delete(sopSteps)
          .where(eq(sopSteps.sopId, version.sopId));

        // Restore SOP data
        const restoredSopData = snapshot.sop;
        await db
          .update(sopDocuments)
          .set({
            title: restoredSopData.title,
            description: restoredSopData.description,
            objective: restoredSopData.objective,
            applicableTo: restoredSopData.applicableTo,
            prerequisites: restoredSopData.prerequisites,
            triggers: restoredSopData.triggers,
            estimatedDuration: restoredSopData.estimatedDuration,
            priority: restoredSopData.priority,
            tags: restoredSopData.tags,
            aiEnabled: restoredSopData.aiEnabled,
            humanApprovalRequired: restoredSopData.humanApprovalRequired,
            automationLevel: restoredSopData.automationLevel,
            metadata: restoredSopData.metadata,
            version: sop.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(sopDocuments.id, version.sopId));

        // Restore steps
        if (snapshot.steps && Array.isArray(snapshot.steps)) {
          for (const step of snapshot.steps) {
            await db.insert(sopSteps).values({
              sopId: version.sopId,
              stepNumber: step.stepNumber,
              title: step.title,
              instructions: step.instructions,
              actionType: step.actionType,
              actionConfig: step.actionConfig,
              conditions: step.conditions,
              alternatives: step.alternatives,
              expectedOutcome: step.expectedOutcome,
              validationCriteria: step.validationCriteria,
              errorHandling: step.errorHandling,
              resources: step.resources,
              examples: step.examples,
              tips: step.tips,
              estimatedDuration: step.estimatedDuration,
              timeout: step.timeout,
              dependsOn: step.dependsOn,
            });
          }
        }

        // Create a new version record for the restore
        await db.insert(sopVersions).values({
          sopId: version.sopId,
          userId,
          version: sop.version + 1,
          title: restoredSopData.title,
          description: restoredSopData.description || null,
          snapshot: {
            sop: restoredSopData,
            steps: snapshot.steps,
          },
          changeType: "updated",
          changeSummary: `Restored to version ${version.version}`,
        });

        return { success: true, sopId: version.sopId };
      } catch (error) {
        console.error("Failed to restore version:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to restore version: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // EXECUTION TRACKING
  // ========================================

  /**
   * Start an SOP execution
   */
  startExecution: protectedProcedure
    .input(startExecutionSchema)
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
        // Verify SOP ownership
        const [sop] = await db
          .select()
          .from(sopDocuments)
          .where(and(
            eq(sopDocuments.id, input.sopId),
            eq(sopDocuments.userId, userId)
          ))
          .limit(1);

        if (!sop) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "SOP not found",
          });
        }

        // Create execution record
        const [execution] = await db
          .insert(sopExecutions)
          .values({
            sopId: input.sopId,
            userId,
            executorType: input.executorType,
            agentSessionId: input.agentSessionId,
            status: "in_progress",
            currentStepIndex: 0,
            stepResults: [],
            context: input.context,
          })
          .returning();

        // Update SOP execution stats
        await db
          .update(sopDocuments)
          .set({
            lastExecutedAt: new Date(),
            executionCount: sop.executionCount + 1,
          })
          .where(eq(sopDocuments.id, input.sopId));

        return execution;
      } catch (error) {
        console.error("Failed to start execution:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to start execution: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Update execution progress (current step)
   */
  updateExecutionProgress: protectedProcedure
    .input(updateExecutionProgressSchema)
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
        // Verify execution ownership
        const [execution] = await db
          .select()
          .from(sopExecutions)
          .where(and(
            eq(sopExecutions.id, input.id),
            eq(sopExecutions.userId, userId)
          ))
          .limit(1);

        if (!execution) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Execution not found",
          });
        }

        const [updated] = await db
          .update(sopExecutions)
          .set({
            currentStepIndex: input.currentStepIndex,
            stepResults: input.stepResults,
          })
          .where(eq(sopExecutions.id, input.id))
          .returning();

        return updated;
      } catch (error) {
        console.error("Failed to update execution progress:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update execution progress: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Complete an execution
   */
  completeExecution: protectedProcedure
    .input(completeExecutionSchema)
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
        // Verify execution ownership
        const [execution] = await db
          .select()
          .from(sopExecutions)
          .where(and(
            eq(sopExecutions.id, input.id),
            eq(sopExecutions.userId, userId)
          ))
          .limit(1);

        if (!execution) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Execution not found",
          });
        }

        const completedAt = new Date();
        const durationMs = completedAt.getTime() - execution.startedAt.getTime();

        const [updated] = await db
          .update(sopExecutions)
          .set({
            status: input.status,
            result: input.result,
            feedback: input.feedback,
            rating: input.rating,
            issues: input.issues,
            completedAt,
            durationMs,
          })
          .where(eq(sopExecutions.id, input.id))
          .returning();

        // Update SOP success rate if completed successfully
        if (input.status === "completed") {
          const [sop] = await db
            .select()
            .from(sopDocuments)
            .where(eq(sopDocuments.id, execution.sopId))
            .limit(1);

          if (sop) {
            // Calculate success rate based on completed executions
            const allExecutions = await db
              .select()
              .from(sopExecutions)
              .where(and(
                eq(sopExecutions.sopId, execution.sopId),
                or(
                  eq(sopExecutions.status, "completed"),
                  eq(sopExecutions.status, "failed")
                )
              ));

            const successCount = allExecutions.filter(e => e.status === "completed").length;
            const totalCount = allExecutions.length;
            const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

            await db
              .update(sopDocuments)
              .set({
                successRate: successRate.toFixed(2),
              })
              .where(eq(sopDocuments.id, execution.sopId));
          }
        }

        return updated;
      } catch (error) {
        console.error("Failed to complete execution:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to complete execution: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get execution history
   */
  getExecutionHistory: protectedProcedure
    .input(listExecutionsSchema)
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
        const conditions: any[] = [eq(sopExecutions.userId, userId)];

        // SOP filter
        if (input.sopId) {
          // Verify SOP ownership
          const [sop] = await db
            .select()
            .from(sopDocuments)
            .where(and(
              eq(sopDocuments.id, input.sopId),
              eq(sopDocuments.userId, userId)
            ))
            .limit(1);

          if (!sop) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "SOP not found",
            });
          }

          conditions.push(eq(sopExecutions.sopId, input.sopId));
        }

        // Status filter
        if (input.status) {
          conditions.push(eq(sopExecutions.status, input.status));
        }

        // Executor type filter
        if (input.executorType) {
          conditions.push(eq(sopExecutions.executorType, input.executorType));
        }

        // Date range filters
        if (input.startDate) {
          conditions.push(sql`${sopExecutions.startedAt} >= ${new Date(input.startDate)}`);
        }
        if (input.endDate) {
          conditions.push(sql`${sopExecutions.startedAt} <= ${new Date(input.endDate)}`);
        }

        const executions = await db
          .select()
          .from(sopExecutions)
          .where(and(...conditions))
          .orderBy(desc(sopExecutions.startedAt))
          .limit(input.limit)
          .offset(input.offset);

        return executions;
      } catch (error) {
        console.error("Failed to get execution history:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get execution history: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
