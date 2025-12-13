import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { eq, and, desc, or } from "drizzle-orm";
import { taskExecutions, agencyTasks } from "../../../drizzle/schema-webhooks";
import { getAgentOrchestrator } from "../../services/agentOrchestrator.service";
import { getSubscriptionService } from "../../services/subscription.service";

/**
 * Agent tRPC Router
 * Provides API endpoints for autonomous agent task execution
 *
 * Features:
 * - Execute agent tasks with Claude function calling
 * - Track execution status and progress
 * - View execution history and results
 * - Respond to agent questions
 * - Cancel running executions
 */

// ========================================
// INPUT SCHEMAS
// ========================================

const executeTaskSchema = z.object({
  taskDescription: z.string().min(1).max(10000),
  context: z.record(z.string(), z.unknown()).optional(),
  maxIterations: z.number().min(1).max(100).optional().default(50),
  taskId: z.number().int().positive().optional(), // Link to existing agency task
});

const getExecutionSchema = z.object({
  executionId: z.number().int().positive(),
});

const listExecutionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  status: z.enum([
    'started',
    'running',
    'success',
    'failed',
    'timeout',
    'cancelled',
    'needs_input',
  ]).optional(),
  taskId: z.number().int().positive().optional(), // Filter by specific task
});

const respondToAgentSchema = z.object({
  executionId: z.number().int().positive(),
  response: z.string().min(1).max(5000),
});

const cancelExecutionSchema = z.object({
  executionId: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

// ========================================
// AGENT ROUTER
// ========================================

export const agentRouter = router({
  /**
   * Execute a new agent task
   * Starts an autonomous agent to complete the specified task
   */
  executeTask: protectedProcedure
    .input(executeTaskSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        // Check subscription limits before executing
        const subscriptionService = getSubscriptionService();
        const limitCheck = await subscriptionService.canExecuteTask(userId);

        if (!limitCheck.allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: limitCheck.reason || "Subscription limit reached",
            cause: {
              upgradeRequired: limitCheck.upgradeRequired,
              suggestedAction: limitCheck.suggestedAction,
              currentUsage: limitCheck.currentUsage,
              limit: limitCheck.limit,
            },
          });
        }

        // Verify task ownership if taskId is provided
        if (input.taskId) {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database not initialized",
            });
          }

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

          // Update task status to in_progress
          await db
            .update(agencyTasks)
            .set({
              status: "in_progress",
              startedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(agencyTasks.id, input.taskId));
        }

        // Execute the task
        const orchestrator = getAgentOrchestrator();
        const result = await orchestrator.executeTask({
          userId,
          taskDescription: input.taskDescription,
          context: input.context || {},
          maxIterations: input.maxIterations,
          taskId: input.taskId,
        });

        // Increment execution usage after successful execution
        try {
          await subscriptionService.incrementExecutionUsage(userId);
        } catch (usageError) {
          console.error("Failed to increment execution usage:", usageError);
          // Don't fail the request if usage tracking fails
        }

        return {
          success: true,
          executionId: result.executionId,
          status: result.status,
          plan: result.plan,
          thinkingSteps: result.thinkingSteps,
          toolHistory: result.toolHistory,
          output: result.output,
          iterations: result.iterations,
          duration: result.duration,
        };
      } catch (error) {
        console.error("Agent task execution failed:", error);

        // Update task status if applicable
        if (input.taskId) {
          const db = await getDb();
          if (db) {
            await db
              .update(agencyTasks)
              .set({
                status: "failed",
                lastError: error instanceof Error ? error.message : "Unknown error",
                errorCount: 1,
                updatedAt: new Date(),
              })
              .where(eq(agencyTasks.id, input.taskId));
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Agent execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get execution status and details
   * Returns full execution information including plan, thinking steps, and results
   */
  getExecution: protectedProcedure
    .input(getExecutionSchema)
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
        // Fetch execution with task join to verify ownership
        const [execution] = await db
          .select({
            execution: taskExecutions,
            task: agencyTasks,
          })
          .from(taskExecutions)
          .leftJoin(agencyTasks, eq(taskExecutions.taskId, agencyTasks.id))
          .where(
            and(
              eq(taskExecutions.id, input.executionId),
              or(
                eq(taskExecutions.triggeredByUserId, userId),
                eq(agencyTasks.userId, userId)
              )
            )
          )
          .limit(1);

        if (!execution) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Execution not found",
          });
        }

        // Get latest status from orchestrator if still running
        const orchestrator = getAgentOrchestrator();
        let latestStatus = execution.execution;

        if (
          execution.execution.status === 'started' ||
          execution.execution.status === 'running'
        ) {
          try {
            latestStatus = await orchestrator.getExecutionStatus(input.executionId);
          } catch (error) {
            console.warn("Failed to get live execution status:", error);
          }
        }

        return {
          id: latestStatus.id,
          taskId: latestStatus.taskId,
          status: latestStatus.status,
          plan: latestStatus.logs, // Plan stored in logs
          thinkingSteps: latestStatus.logs || [],
          toolHistory: latestStatus.stepResults || [],
          output: latestStatus.output,
          error: latestStatus.error,
          currentStep: latestStatus.currentStep,
          stepsTotal: latestStatus.stepsTotal,
          stepsCompleted: latestStatus.stepsCompleted,
          duration: latestStatus.duration,
          attemptNumber: latestStatus.attemptNumber,
          startedAt: latestStatus.startedAt,
          completedAt: latestStatus.completedAt,
          task: execution.task,
        };
      } catch (error) {
        console.error("Failed to get execution:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get execution: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List user's task executions
   * Returns paginated list with optional filtering by status and task
   */
  listExecutions: protectedProcedure
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
        // Build conditions
        const conditions = [eq(taskExecutions.triggeredByUserId, userId)];

        if (input.status) {
          conditions.push(eq(taskExecutions.status, input.status));
        }

        if (input.taskId) {
          conditions.push(eq(taskExecutions.taskId, input.taskId));
        }

        // Fetch executions with task details
        const executions = await db
          .select({
            execution: taskExecutions,
            task: agencyTasks,
          })
          .from(taskExecutions)
          .leftJoin(agencyTasks, eq(taskExecutions.taskId, agencyTasks.id))
          .where(and(...conditions))
          .orderBy(desc(taskExecutions.startedAt))
          .limit(input.limit)
          .offset(input.offset);

        return executions.map(({ execution, task }) => ({
          id: execution.id,
          taskId: execution.taskId,
          executionUuid: execution.executionUuid,
          status: execution.status,
          currentStep: execution.currentStep,
          stepsTotal: execution.stepsTotal,
          stepsCompleted: execution.stepsCompleted,
          duration: execution.duration,
          attemptNumber: execution.attemptNumber,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          error: execution.error,
          task: task ? {
            id: task.id,
            title: task.title,
            description: task.description,
            category: task.category,
            priority: task.priority,
          } : null,
        }));
      } catch (error) {
        console.error("Failed to list executions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list executions: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Respond to agent question
   * Provides user input when agent uses 'ask_user' tool and enters 'needs_input' state
   *
   * Note: This is a placeholder. Full implementation requires:
   * - Persistent agent state management
   * - Execution resumption from needs_input state
   * - User response integration into conversation history
   */
  respondToAgent: protectedProcedure
    .input(respondToAgentSchema)
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
        // Verify execution ownership and status
        const [execution] = await db
          .select()
          .from(taskExecutions)
          .where(and(
            eq(taskExecutions.id, input.executionId),
            eq(taskExecutions.triggeredByUserId, userId)
          ))
          .limit(1);

        if (!execution) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Execution not found",
          });
        }

        if (execution.status !== 'needs_input') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Execution is not waiting for user input",
          });
        }

        // TODO: Implement agent resumption with user response
        // This requires:
        // 1. Restoring agent state from database
        // 2. Adding user response to conversation history
        // 3. Resuming agent loop from where it paused
        // 4. Updating execution status

        throw new TRPCError({
          code: "NOT_IMPLEMENTED",
          message: "Agent resumption not yet implemented. This feature requires persistent agent state management.",
        });

      } catch (error) {
        console.error("Failed to respond to agent:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to respond to agent: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Cancel a running execution
   * Stops agent execution and marks as cancelled
   */
  cancelExecution: protectedProcedure
    .input(cancelExecutionSchema)
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
        const [execution] = await db
          .select()
          .from(taskExecutions)
          .where(and(
            eq(taskExecutions.id, input.executionId),
            eq(taskExecutions.triggeredByUserId, userId)
          ))
          .limit(1);

        if (!execution) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Execution not found",
          });
        }

        // Check if cancellable
        if (
          execution.status !== 'started' &&
          execution.status !== 'running' &&
          execution.status !== 'needs_input'
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot cancel execution with status: ${execution.status}`,
          });
        }

        // Update execution status
        await db
          .update(taskExecutions)
          .set({
            status: 'cancelled',
            error: input.reason || "Cancelled by user",
            completedAt: new Date(),
          })
          .where(eq(taskExecutions.id, input.executionId));

        // Update linked task if exists
        if (execution.taskId) {
          await db
            .update(agencyTasks)
            .set({
              status: 'cancelled',
              statusReason: input.reason || "Execution cancelled by user",
              updatedAt: new Date(),
            })
            .where(eq(agencyTasks.id, execution.taskId));
        }

        return {
          success: true,
          executionId: input.executionId,
          status: 'cancelled',
        };
      } catch (error) {
        console.error("Failed to cancel execution:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to cancel execution: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get or create agent session
   * Placeholder for future session-based agent interaction
   *
   * Note: Current implementation executes tasks immediately.
   * Session-based interaction would allow:
   * - Persistent conversation with agent
   * - Multiple tasks in same context
   * - Interactive debugging and guidance
   */
  getSession: protectedProcedure
    .input(z.object({
      sessionId: z.number().int().positive().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // TODO: Implement session management
      // This would store:
      // - Conversation history
      // - Shared context across tasks
      // - User preferences
      // - Active executions

      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Session management not yet implemented. Each task execution is currently independent.",
      });
    }),

  /**
   * Get execution statistics
   * Returns aggregated stats for user's agent executions
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
        // Get all executions for user
        const executions = await db
          .select()
          .from(taskExecutions)
          .where(eq(taskExecutions.triggeredByUserId, userId));

        // Calculate statistics
        const stats = {
          total: executions.length,
          byStatus: {
            started: 0,
            running: 0,
            success: 0,
            failed: 0,
            timeout: 0,
            cancelled: 0,
            needs_input: 0,
          } as Record<string, number>,
          averageDuration: 0,
          totalDuration: 0,
          successRate: 0,
        };

        let totalDuration = 0;
        let completedCount = 0;
        let successCount = 0;

        for (const execution of executions) {
          // Count by status
          if (execution.status) {
            stats.byStatus[execution.status] = (stats.byStatus[execution.status] || 0) + 1;
          }

          // Calculate durations
          if (execution.duration) {
            totalDuration += execution.duration;
            completedCount++;
          }

          // Count successes
          if (execution.status === 'success') {
            successCount++;
          }
        }

        stats.totalDuration = totalDuration;
        stats.averageDuration = completedCount > 0 ? totalDuration / completedCount : 0;
        stats.successRate = executions.length > 0 ? (successCount / executions.length) * 100 : 0;

        return stats;
      } catch (error) {
        console.error("Failed to get stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get stats: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
