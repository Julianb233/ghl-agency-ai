/**
 * Tasks REST API Routes
 * CRUD operations for scheduled browser automation tasks
 */

import { Router, type Request, Response } from "express";
import { z } from "zod";
import { getDb } from "../../../db";
import { scheduledBrowserTasks, scheduledTaskExecutions } from "../../../../drizzle/schema-scheduled-tasks";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requireApiKey, requireScopes, type AuthenticatedRequest } from "../middleware/authMiddleware";
import { asyncHandler, ApiError } from "../middleware/errorMiddleware";

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createTaskSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  automationType: z.enum(["chat", "observe", "extract", "workflow", "custom"]),
  automationConfig: z.object({
    url: z.string().url(),
    instruction: z.string().optional(),
    actions: z.array(z.any()).optional(),
    browserConfig: z.object({
      headless: z.boolean().default(true),
      timeout: z.number().default(30000),
      viewport: z.object({
        width: z.number().default(1920),
        height: z.number().default(1080),
      }).optional(),
    }).optional(),
  }),
  scheduleType: z.enum(["daily", "weekly", "monthly", "cron", "once"]),
  cronExpression: z.string(),
  timezone: z.string().default("UTC"),
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(10).default(3),
  notifyOnSuccess: z.boolean().default(false),
  notifyOnFailure: z.boolean().default(true),
});

const updateTaskSchema = createTaskSchema.partial();

const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["active", "paused", "failed", "completed", "archived"]).optional(),
  automationType: z.enum(["chat", "observe", "extract", "workflow", "custom"]).optional(),
});

// ========================================
// ROUTES
// ========================================

/**
 * GET /api/v1/tasks
 * List all tasks for the authenticated user
 */
router.get(
  "/",
  requireApiKey,
  requireScopes(["tasks:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = listTasksQuerySchema.parse(req.query);
    const db = await getDb();

    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Build query conditions
    const conditions = [eq(scheduledBrowserTasks.userId, req.user!.id)];

    if (query.status) {
      conditions.push(eq(scheduledBrowserTasks.status, query.status));
    }

    if (query.automationType) {
      conditions.push(eq(scheduledBrowserTasks.automationType, query.automationType));
    }

    // Fetch tasks with pagination
    const offset = (query.page - 1) * query.limit;
    const tasks = await db
      .select()
      .from(scheduledBrowserTasks)
      .where(and(...conditions))
      .orderBy(desc(scheduledBrowserTasks.createdAt))
      .limit(query.limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: scheduledBrowserTasks.id })
      .from(scheduledBrowserTasks)
      .where(and(...conditions));

    res.json({
      data: tasks,
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
 * POST /api/v1/tasks
 * Create a new task
 */
router.post(
  "/",
  requireApiKey,
  requireScopes(["tasks:write"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = createTaskSchema.parse(req.body);
    const db = await getDb();

    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Calculate next run time based on cron expression
    // PLACEHOLDER: Use cron-parser to calculate next run
    const nextRun = new Date(Date.now() + 60000); // 1 minute from now

    const [task] = await db
      .insert(scheduledBrowserTasks)
      .values({
        userId: req.user!.id,
        name: data.name,
        description: data.description,
        automationType: data.automationType,
        automationConfig: data.automationConfig as any,
        scheduleType: data.scheduleType,
        cronExpression: data.cronExpression,
        timezone: data.timezone,
        nextRun,
        retryOnFailure: data.retryOnFailure,
        maxRetries: data.maxRetries,
        notifyOnSuccess: data.notifyOnSuccess,
        notifyOnFailure: data.notifyOnFailure,
        status: "active",
        isActive: true,
        createdBy: req.user!.id,
        lastModifiedBy: req.user!.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json({
      data: task,
      message: "Task created successfully",
    });
  })
);

/**
 * GET /api/v1/tasks/:id
 * Get a specific task by ID
 */
router.get(
  "/:id",
  requireApiKey,
  requireScopes(["tasks:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const db = await getDb();
    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    const [task] = await db
      .select()
      .from(scheduledBrowserTasks)
      .where(
        and(
          eq(scheduledBrowserTasks.id, taskId),
          eq(scheduledBrowserTasks.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!task) {
      throw ApiError.notFound("Task not found");
    }

    res.json({ data: task });
  })
);

/**
 * PUT /api/v1/tasks/:id
 * Update a task
 */
router.put(
  "/:id",
  requireApiKey,
  requireScopes(["tasks:write"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const data = updateTaskSchema.parse(req.body);
    const db = await getDb();

    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Check if task exists and belongs to user
    const [existing] = await db
      .select()
      .from(scheduledBrowserTasks)
      .where(
        and(
          eq(scheduledBrowserTasks.id, taskId),
          eq(scheduledBrowserTasks.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!existing) {
      throw ApiError.notFound("Task not found");
    }

    // Update task
    const [updated] = await db
      .update(scheduledBrowserTasks)
      .set({
        ...data,
        automationConfig: data.automationConfig as any,
        updatedAt: new Date(),
      })
      .where(eq(scheduledBrowserTasks.id, taskId))
      .returning();

    res.json({
      data: updated,
      message: "Task updated successfully",
    });
  })
);

/**
 * DELETE /api/v1/tasks/:id
 * Delete a task
 */
router.delete(
  "/:id",
  requireApiKey,
  requireScopes(["tasks:write"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const db = await getDb();
    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Check if task exists and belongs to user
    const [existing] = await db
      .select()
      .from(scheduledBrowserTasks)
      .where(
        and(
          eq(scheduledBrowserTasks.id, taskId),
          eq(scheduledBrowserTasks.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!existing) {
      throw ApiError.notFound("Task not found");
    }

    // Soft delete - archive the task
    await db
      .update(scheduledBrowserTasks)
      .set({
        status: "archived",
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(scheduledBrowserTasks.id, taskId));

    res.json({ message: "Task deleted successfully" });
  })
);

/**
 * POST /api/v1/tasks/:id/execute
 * Trigger immediate execution of a task
 */
router.post(
  "/:id/execute",
  requireApiKey,
  requireScopes(["tasks:execute"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const db = await getDb();
    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Check if task exists and belongs to user
    const [task] = await db
      .select()
      .from(scheduledBrowserTasks)
      .where(
        and(
          eq(scheduledBrowserTasks.id, taskId),
          eq(scheduledBrowserTasks.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!task) {
      throw ApiError.notFound("Task not found");
    }

    // Create execution record
    const [execution] = await db
      .insert(scheduledTaskExecutions)
      .values({
        taskId: task.id,
        status: "queued",
        triggerType: "manual",
        attemptNumber: 1,
        startedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();

    // PLACEHOLDER: Trigger actual task execution via queue/worker
    // For now, just return the execution record

    res.status(202).json({
      data: execution,
      message: "Task execution queued successfully",
    });
  })
);

/**
 * GET /api/v1/tasks/:id/executions
 * Get execution history for a task
 */
router.get(
  "/:id/executions",
  requireApiKey,
  requireScopes(["tasks:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      throw ApiError.badRequest("Invalid task ID");
    }

    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        status: z.enum(["queued", "running", "success", "failed", "timeout", "cancelled"]).optional(),
      })
      .parse(req.query);

    const db = await getDb();
    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Verify task ownership
    const [task] = await db
      .select()
      .from(scheduledBrowserTasks)
      .where(
        and(
          eq(scheduledBrowserTasks.id, taskId),
          eq(scheduledBrowserTasks.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!task) {
      throw ApiError.notFound("Task not found");
    }

    // Build query conditions
    const conditions = [eq(scheduledTaskExecutions.taskId, taskId)];
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

export default router;
