/**
 * Executions REST API Routes
 * Read-only access to task execution details and logs
 */

import { Router, type Response } from "express";
import { z } from "zod";
import { getDb } from "../../../db";
import { scheduledTaskExecutions, scheduledBrowserTasks } from "../../../../drizzle/schema-scheduled-tasks";
import { eq, and, desc } from "drizzle-orm";
import { requireApiKey, requireScopes, type AuthenticatedRequest } from "../middleware/authMiddleware";
import { asyncHandler, ApiError } from "../middleware/errorMiddleware";

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const listExecutionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["queued", "running", "success", "failed", "timeout", "cancelled"]).optional(),
  taskId: z.coerce.number().int().positive().optional(),
});

// ========================================
// ROUTES
// ========================================

/**
 * GET /api/v1/executions
 * List all executions for the authenticated user
 */
router.get(
  "/",
  requireApiKey,
  requireScopes(["executions:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = listExecutionsQuerySchema.parse(req.query);
    const db = await getDb();

    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Build query conditions
    // First, get all task IDs for this user
    const userTasks = await db
      .select({ id: scheduledBrowserTasks.id })
      .from(scheduledBrowserTasks)
      .where(eq(scheduledBrowserTasks.userId, req.user!.id));

    const userTaskIds = userTasks.map((t) => t.id);

    if (userTaskIds.length === 0) {
      // No tasks, return empty result
      return res.json({
        data: [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: 0,
          pages: 0,
        },
      });
    }

    const conditions: any[] = [];

    // Filter by user's tasks
    if (query.taskId) {
      // Verify task belongs to user
      if (!userTaskIds.includes(query.taskId)) {
        throw ApiError.forbidden("Access denied to this task");
      }
      conditions.push(eq(scheduledTaskExecutions.taskId, query.taskId));
    } else {
      // All user's tasks
      conditions.push(
        ...userTaskIds.map((id) => eq(scheduledTaskExecutions.taskId, id))
      );
    }

    if (query.status) {
      conditions.push(eq(scheduledTaskExecutions.status, query.status));
    }

    // Fetch executions with pagination
    const offset = (query.page - 1) * query.limit;
    const executions = await db
      .select()
      .from(scheduledTaskExecutions)
      .where(and(...conditions))
      .orderBy(desc(scheduledTaskExecutions.startedAt))
      .limit(query.limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: scheduledTaskExecutions.id })
      .from(scheduledTaskExecutions)
      .where(and(...conditions));

    res.json({
      data: executions,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: Number(count),
        pages: Math.ceil(Number(count) / query.limit),
      },
    });
  })
);

/**
 * GET /api/v1/executions/:id
 * Get detailed information about a specific execution
 */
router.get(
  "/:id",
  requireApiKey,
  requireScopes(["executions:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const executionId = parseInt(req.params.id);
    if (isNaN(executionId)) {
      throw ApiError.badRequest("Invalid execution ID");
    }

    const db = await getDb();
    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Fetch execution
    const [execution] = await db
      .select()
      .from(scheduledTaskExecutions)
      .where(eq(scheduledTaskExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      throw ApiError.notFound("Execution not found");
    }

    // Verify the execution belongs to a task owned by the user
    const [task] = await db
      .select()
      .from(scheduledBrowserTasks)
      .where(
        and(
          eq(scheduledBrowserTasks.id, execution.taskId),
          eq(scheduledBrowserTasks.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!task) {
      throw ApiError.forbidden("Access denied to this execution");
    }

    res.json({ data: execution });
  })
);

/**
 * GET /api/v1/executions/:id/logs
 * Get logs for a specific execution
 */
router.get(
  "/:id/logs",
  requireApiKey,
  requireScopes(["executions:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const executionId = parseInt(req.params.id);
    if (isNaN(executionId)) {
      throw ApiError.badRequest("Invalid execution ID");
    }

    const db = await getDb();
    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Fetch execution
    const [execution] = await db
      .select()
      .from(scheduledTaskExecutions)
      .where(eq(scheduledTaskExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      throw ApiError.notFound("Execution not found");
    }

    // Verify ownership
    const [task] = await db
      .select()
      .from(scheduledBrowserTasks)
      .where(
        and(
          eq(scheduledBrowserTasks.id, execution.taskId),
          eq(scheduledBrowserTasks.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!task) {
      throw ApiError.forbidden("Access denied to this execution");
    }

    // Return logs from execution record
    const logs = execution.logs || [];

    res.json({
      data: {
        executionId: execution.id,
        taskId: execution.taskId,
        logs,
        screenshots: execution.screenshots || [],
        recordingUrl: execution.recordingUrl,
      },
    });
  })
);

/**
 * GET /api/v1/executions/:id/output
 * Get output/results from an execution
 */
router.get(
  "/:id/output",
  requireApiKey,
  requireScopes(["executions:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const executionId = parseInt(req.params.id);
    if (isNaN(executionId)) {
      throw ApiError.badRequest("Invalid execution ID");
    }

    const db = await getDb();
    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Fetch execution
    const [execution] = await db
      .select()
      .from(scheduledTaskExecutions)
      .where(eq(scheduledTaskExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      throw ApiError.notFound("Execution not found");
    }

    // Verify ownership
    const [task] = await db
      .select()
      .from(scheduledBrowserTasks)
      .where(
        and(
          eq(scheduledBrowserTasks.id, execution.taskId),
          eq(scheduledBrowserTasks.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!task) {
      throw ApiError.forbidden("Access denied to this execution");
    }

    // Return execution output
    res.json({
      data: {
        executionId: execution.id,
        taskId: execution.taskId,
        status: execution.status,
        output: execution.output || null,
        error: execution.error || null,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        duration: execution.duration,
      },
    });
  })
);

export default router;
