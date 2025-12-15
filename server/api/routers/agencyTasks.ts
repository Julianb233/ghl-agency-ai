import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { eq, and, or, desc, asc, inArray, gte, lte, isNull, sql, count } from "drizzle-orm";

import {
  agencyTasks,
  taskExecutions,
  inboundMessages,
  botConversations,
  userWebhooks,
} from "../../../drizzle/schema-webhooks";

import { taskExecutionService } from "../../services/taskExecution.service";

// ========================================
// VALIDATION SCHEMAS
// ========================================

const priorityEnum = z.enum(["low", "medium", "high", "critical"]);
const urgencyEnum = z.enum(["normal", "soon", "urgent", "immediate"]);
const statusEnum = z.enum([
  "pending",
  "queued",
  "in_progress",
  "waiting_input",
  "completed",
  "failed",
  "cancelled",
  "deferred",
]);
const taskTypeEnum = z.enum([
  "browser_automation",
  "api_call",
  "notification",
  "reminder",
  "ghl_action",
  "data_extraction",
  "report_generation",
  "custom",
]);
const sourceTypeEnum = z.enum([
  "webhook_sms",
  "webhook_email",
  "webhook_custom",
  "manual",
  "scheduled",
  "conversation",
]);

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).default("general"),
  taskType: taskTypeEnum,
  priority: priorityEnum.default("medium"),
  urgency: urgencyEnum.default("normal"),
  assignedToBot: z.boolean().default(true),
  requiresHumanReview: z.boolean().default(false),
  executionType: z.enum(["automatic", "manual_trigger", "scheduled"]).default("automatic"),
  executionConfig: z.record(z.string(), z.any()).optional(),
  scheduledFor: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  dependsOn: z.array(z.number().int().positive()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateTaskSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  priority: priorityEnum.optional(),
  urgency: urgencyEnum.optional(),
  status: statusEnum.optional(),
  statusReason: z.string().max(500).optional(),
  assignedToBot: z.boolean().optional(),
  requiresHumanReview: z.boolean().optional(),
  executionType: z.enum(["automatic", "manual_trigger", "scheduled"]).optional(),
  executionConfig: z.record(z.string(), z.any()).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const listTasksSchema = z.object({
  status: statusEnum.optional(),
  statuses: z.array(statusEnum).optional(),
  priority: priorityEnum.optional(),
  category: z.string().optional(),
  taskType: taskTypeEnum.optional(),
  assignedToBot: z.boolean().optional(),
  requiresHumanReview: z.boolean().optional(),
  scheduledBefore: z.string().datetime().optional(),
  scheduledAfter: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "priority", "scheduledFor", "deadline"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// ========================================
// TASK BOARD ROUTER
// ========================================

export const agencyTasksRouter = router({
  /**
   * Create a new task
   */
  create: protectedProcedure
    .input(createTaskSchema)
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
        const [task] = await db
          .insert(agencyTasks)
          .values({
            userId,
            sourceType: "manual",
            title: input.title,
            description: input.description,
            category: input.category,
            taskType: input.taskType,
            priority: input.priority,
            urgency: input.urgency,
            status: "pending",
            assignedToBot: input.assignedToBot,
            requiresHumanReview: input.requiresHumanReview,
            executionType: input.executionType,
            executionConfig: input.executionConfig,
            scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
            deadline: input.deadline ? new Date(input.deadline) : null,
            dependsOn: input.dependsOn,
            tags: input.tags,
            metadata: input.metadata,
            notifyOnComplete: true,
            notifyOnFailure: true,
          })
          .returning();

        // Auto-execute if conditions are met
        if (
          input.executionType === "automatic" &&
          input.assignedToBot &&
          !input.requiresHumanReview &&
          !input.scheduledFor
        ) {
          // Execute task asynchronously (don't await to avoid blocking the response)
          taskExecutionService
            .executeTask(task.id, "automatic")
            .catch((error) => {
              console.error("Auto-execution failed:", error);
            });
        }

        return task;
      } catch (error) {
        console.error("Failed to create task:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List tasks with filtering
   */
  list: protectedProcedure
    .input(listTasksSchema)
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
        const conditions: any[] = [eq(agencyTasks.userId, userId)];

        // Status filters
        if (input.status) {
          conditions.push(eq(agencyTasks.status, input.status));
        } else if (input.statuses && input.statuses.length > 0) {
          conditions.push(inArray(agencyTasks.status, input.statuses));
        }

        // Other filters
        if (input.priority) {
          conditions.push(eq(agencyTasks.priority, input.priority));
        }
        if (input.category) {
          conditions.push(eq(agencyTasks.category, input.category));
        }
        if (input.taskType) {
          conditions.push(eq(agencyTasks.taskType, input.taskType));
        }
        if (input.assignedToBot !== undefined) {
          conditions.push(eq(agencyTasks.assignedToBot, input.assignedToBot));
        }
        if (input.requiresHumanReview !== undefined) {
          conditions.push(eq(agencyTasks.requiresHumanReview, input.requiresHumanReview));
        }
        if (input.scheduledBefore) {
          conditions.push(lte(agencyTasks.scheduledFor, new Date(input.scheduledBefore)));
        }
        if (input.scheduledAfter) {
          conditions.push(gte(agencyTasks.scheduledFor, new Date(input.scheduledAfter)));
        }

        // Sorting
        const sortColumnMap = {
          createdAt: agencyTasks.createdAt,
          updatedAt: agencyTasks.updatedAt,
          priority: agencyTasks.priority,
          scheduledFor: agencyTasks.scheduledFor,
          deadline: agencyTasks.deadline,
        } as const;
        const sortColumn = sortColumnMap[input.sortBy];
        const orderBy = input.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

        const tasks = await db
          .select()
          .from(agencyTasks)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(input.limit)
          .offset(input.offset);

        // Get total count
        const [countResult] = await db
          .select({ count: count() })
          .from(agencyTasks)
          .where(and(...conditions));

        return {
          tasks,
          total: countResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error("Failed to list tasks:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list tasks: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get a single task by ID
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
        const [task] = await db
          .select()
          .from(agencyTasks)
          .where(and(
            eq(agencyTasks.id, input.id),
            eq(agencyTasks.userId, userId)
          ))
          .limit(1);

        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // Get executions
        const executions = await db
          .select()
          .from(taskExecutions)
          .where(eq(taskExecutions.taskId, input.id))
          .orderBy(desc(taskExecutions.startedAt))
          .limit(10);

        // Get source message if exists
        let sourceMessage = null;
        if (task.sourceMessageId) {
          const [msg] = await db
            .select()
            .from(inboundMessages)
            .where(eq(inboundMessages.id, task.sourceMessageId))
            .limit(1);
          sourceMessage = msg;
        }

        return {
          ...task,
          executions,
          sourceMessage,
        };
      } catch (error) {
        console.error("Failed to get task:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get task: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Update a task
   */
  update: protectedProcedure
    .input(updateTaskSchema)
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
          .from(agencyTasks)
          .where(and(
            eq(agencyTasks.id, input.id),
            eq(agencyTasks.userId, userId)
          ))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // Build update object
        const updateData: Partial<typeof agencyTasks.$inferInsert> = {
          updatedAt: new Date(),
        };

        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.priority !== undefined) updateData.priority = input.priority;
        if (input.urgency !== undefined) updateData.urgency = input.urgency;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.statusReason !== undefined) updateData.statusReason = input.statusReason;
        if (input.assignedToBot !== undefined) updateData.assignedToBot = input.assignedToBot;
        if (input.requiresHumanReview !== undefined) updateData.requiresHumanReview = input.requiresHumanReview;
        if (input.executionType !== undefined) updateData.executionType = input.executionType;
        if (input.executionConfig !== undefined) updateData.executionConfig = input.executionConfig;
        if (input.scheduledFor !== undefined) {
          updateData.scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
        }
        if (input.deadline !== undefined) {
          updateData.deadline = input.deadline ? new Date(input.deadline) : null;
        }
        if (input.tags !== undefined) updateData.tags = input.tags;
        if (input.metadata !== undefined) updateData.metadata = input.metadata;

        // Handle status transitions
        if (input.status === "completed" && existing.status !== "completed") {
          updateData.completedAt = new Date();
        }
        if (input.status === "in_progress" && existing.status !== "in_progress") {
          updateData.startedAt = new Date();
        }
        if (input.status === "queued" && existing.status !== "queued") {
          updateData.queuedAt = new Date();
        }

        const [updated] = await db
          .update(agencyTasks)
          .set(updateData)
          .where(eq(agencyTasks.id, input.id))
          .returning();

        return updated;
      } catch (error) {
        console.error("Failed to update task:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update task: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Delete/cancel a task
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
          .from(agencyTasks)
          .where(and(
            eq(agencyTasks.id, input.id),
            eq(agencyTasks.userId, userId)
          ))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        // Cancel instead of delete to preserve history
        await db
          .update(agencyTasks)
          .set({
            status: "cancelled",
            statusReason: "Cancelled by user",
            updatedAt: new Date(),
          })
          .where(eq(agencyTasks.id, input.id));

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Failed to delete task:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete task: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Approve task for execution (human review)
   */
  approve: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      notes: z.string().max(1000).optional(),
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
        const [task] = await db
          .select()
          .from(agencyTasks)
          .where(and(
            eq(agencyTasks.id, input.id),
            eq(agencyTasks.userId, userId)
          ))
          .limit(1);

        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        if (!task.requiresHumanReview) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Task does not require human review",
          });
        }

        await db
          .update(agencyTasks)
          .set({
            requiresHumanReview: false,
            humanReviewedBy: userId,
            humanReviewedAt: new Date(),
            status: "queued",
            queuedAt: new Date(),
            statusReason: input.notes || "Approved for execution",
            updatedAt: new Date(),
          })
          .where(eq(agencyTasks.id, input.id));

        // Auto-execute approved task if it's assigned to bot and not scheduled
        if (task.assignedToBot && !task.scheduledFor) {
          taskExecutionService
            .executeTask(input.id, "automatic")
            .catch((error) => {
              console.error("Post-approval execution failed:", error);
            });
        }

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Failed to approve task:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to approve task: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Reject task (human review)
   */
  reject: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      reason: z.string().min(1).max(1000),
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
        const [task] = await db
          .select()
          .from(agencyTasks)
          .where(and(
            eq(agencyTasks.id, input.id),
            eq(agencyTasks.userId, userId)
          ))
          .limit(1);

        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        await db
          .update(agencyTasks)
          .set({
            humanReviewedBy: userId,
            humanReviewedAt: new Date(),
            status: "cancelled",
            statusReason: `Rejected: ${input.reason}`,
            updatedAt: new Date(),
          })
          .where(eq(agencyTasks.id, input.id));

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Failed to reject task:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to reject task: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Trigger manual execution of a task
   */
  execute: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
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
        const [task] = await db
          .select()
          .from(agencyTasks)
          .where(and(
            eq(agencyTasks.id, input.id),
            eq(agencyTasks.userId, userId)
          ))
          .limit(1);

        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        if (task.status === "in_progress") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Task is already in progress",
          });
        }

        if (task.status === "completed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Task is already completed",
          });
        }

        if (task.requiresHumanReview) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Task requires human review before execution",
          });
        }

        // Execute the task using the execution service
        // Execute asynchronously to avoid blocking the API response
        taskExecutionService
          .executeTask(input.id, "manual")
          .catch((error) => {
            console.error("Manual execution failed:", error);
          });

        return {
          success: true,
          taskId: input.id,
          message: "Task execution started",
        };
      } catch (error) {
        console.error("Failed to execute task:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to execute task: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get task statistics/dashboard
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      try {
        // Get counts by status
        const statusCounts = await db
          .select({
            status: agencyTasks.status,
            count: count(),
          })
          .from(agencyTasks)
          .where(eq(agencyTasks.userId, userId))
          .groupBy(agencyTasks.status);

        // Get counts by priority
        const priorityCounts = await db
          .select({
            priority: agencyTasks.priority,
            count: count(),
          })
          .from(agencyTasks)
          .where(eq(agencyTasks.userId, userId))
          .groupBy(agencyTasks.priority);

        // Get pending review count
        const [pendingReview] = await db
          .select({ count: count() })
          .from(agencyTasks)
          .where(and(
            eq(agencyTasks.userId, userId),
            eq(agencyTasks.requiresHumanReview, true),
            eq(agencyTasks.status, "pending")
          ));

        // Get overdue tasks
        const [overdue] = await db
          .select({ count: count() })
          .from(agencyTasks)
          .where(and(
            eq(agencyTasks.userId, userId),
            lte(agencyTasks.deadline, new Date()),
            or(
              eq(agencyTasks.status, "pending"),
              eq(agencyTasks.status, "queued"),
              eq(agencyTasks.status, "in_progress")
            )
          ));

        // Get tasks scheduled for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [scheduledToday] = await db
          .select({ count: count() })
          .from(agencyTasks)
          .where(and(
            eq(agencyTasks.userId, userId),
            gte(agencyTasks.scheduledFor, today),
            lte(agencyTasks.scheduledFor, tomorrow)
          ));

        return {
          byStatus: Object.fromEntries(
            statusCounts.map(s => [s.status, s.count])
          ),
          byPriority: Object.fromEntries(
            priorityCounts.map(p => [p.priority, p.count])
          ),
          pendingReview: pendingReview?.count || 0,
          overdue: overdue?.count || 0,
          scheduledToday: scheduledToday?.count || 0,
        };
      } catch (error) {
        console.error("Failed to get stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get stats: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get execution history for a task
   */
  getExecutions: protectedProcedure
    .input(z.object({
      taskId: z.number().int().positive(),
      limit: z.number().int().min(1).max(100).default(20),
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
        // Verify task ownership
        const [task] = await db
          .select()
          .from(agencyTasks)
          .where(and(
            eq(agencyTasks.id, input.taskId),
            eq(agencyTasks.userId, userId)
          ))
          .limit(1);

        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found",
          });
        }

        const executions = await db
          .select()
          .from(taskExecutions)
          .where(eq(taskExecutions.taskId, input.taskId))
          .orderBy(desc(taskExecutions.startedAt))
          .limit(input.limit)
          .offset(input.offset);

        return executions;
      } catch (error) {
        console.error("Failed to get executions:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get executions: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get task queue with filtering
   */
  getTaskQueue: protectedProcedure
    .input(z.object({
      filter: z.enum(['all', 'running', 'pending', 'scheduled']).optional(),
      limit: z.number().int().min(1).max(100).default(50),
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
        const conditions: any[] = [eq(agencyTasks.userId, userId)];

        // Apply filter
        if (input.filter === 'running') {
          conditions.push(eq(agencyTasks.status, 'in_progress'));
        } else if (input.filter === 'pending') {
          conditions.push(inArray(agencyTasks.status, ['pending', 'queued']));
        } else if (input.filter === 'scheduled') {
          conditions.push(eq(agencyTasks.status, 'deferred'));
        }

        const tasks = await db
          .select()
          .from(agencyTasks)
          .where(and(...conditions))
          .orderBy(desc(agencyTasks.priority), desc(agencyTasks.createdAt))
          .limit(input.limit);

        // Get counts
        const [runningCount] = await db
          .select({ count: count() })
          .from(agencyTasks)
          .where(and(eq(agencyTasks.userId, userId), eq(agencyTasks.status, 'in_progress')));

        const [pendingCount] = await db
          .select({ count: count() })
          .from(agencyTasks)
          .where(and(eq(agencyTasks.userId, userId), inArray(agencyTasks.status, ['pending', 'queued'])));

        const [scheduledCount] = await db
          .select({ count: count() })
          .from(agencyTasks)
          .where(and(eq(agencyTasks.userId, userId), eq(agencyTasks.status, 'deferred')));

        return {
          tasks: tasks.map((task, index) => ({
            ...task,
            isRunning: task.status === 'in_progress',
            queuePosition: task.status === 'pending' || task.status === 'queued' ? index + 1 : undefined,
          })),
          counts: {
            running: Number(runningCount?.count || 0),
            pending: Number(pendingCount?.count || 0),
            scheduled: Number(scheduledCount?.count || 0),
          },
        };
      } catch (error) {
        console.error("Failed to get task queue:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get task queue: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
