/**
 * Templates REST API Routes
 * Read-only access to workflow templates and template execution
 */

import { Router, type Response } from "express";
import { z } from "zod";
import { getDb } from "../../../db";
import { automationTemplates } from "../../../../drizzle/schema";
import { scheduledBrowserTasks } from "../../../../drizzle/schema-scheduled-tasks";
import { eq, desc, count } from "drizzle-orm";
import { requireApiKey, requireScopes, type AuthenticatedRequest } from "../middleware/authMiddleware";
import { asyncHandler, ApiError } from "../middleware/errorMiddleware";

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const listTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  search: z.string().optional(),
});

const useTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  scheduleType: z.enum(["daily", "weekly", "monthly", "cron", "once"]).optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().default("UTC"),
  customInputs: z.record(z.any()).optional(), // Custom values to override template defaults
});

// ========================================
// ROUTES
// ========================================

/**
 * GET /api/v1/templates
 * List all available workflow templates
 */
router.get(
  "/",
  requireApiKey,
  requireScopes(["templates:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = listTemplatesQuerySchema.parse(req.query);
    const db = await getDb();

    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Fetch templates with pagination
    // PLACEHOLDER: Add filtering by category and search
    const offset = (query.page - 1) * query.limit;
    const templates = await db
      .select()
      .from(automationTemplates)
      .orderBy(desc(automationTemplates.createdAt))
      .limit(query.limit)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(automationTemplates);

    res.json({
      data: templates,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: Number(total),
        pages: Math.ceil(Number(total) / query.limit),
      },
    });
  })
);

/**
 * GET /api/v1/templates/:id
 * Get a specific template by ID
 */
router.get(
  "/:id",
  requireApiKey,
  requireScopes(["templates:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      throw ApiError.badRequest("Invalid template ID");
    }

    const db = await getDb();
    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    const [template] = await db
      .select()
      .from(automationTemplates)
      .where(eq(automationTemplates.id, templateId))
      .limit(1);

    if (!template) {
      throw ApiError.notFound("Template not found");
    }

    res.json({ data: template });
  })
);

/**
 * POST /api/v1/templates/:id/use
 * Create a new task from a template
 */
router.post(
  "/:id/use",
  requireApiKey,
  requireScopes(["tasks:write", "templates:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const templateId = parseInt(req.params.id);
    if (isNaN(templateId)) {
      throw ApiError.badRequest("Invalid template ID");
    }

    const data = useTemplateSchema.parse(req.body);
    const db = await getDb();

    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // Fetch template
    const [template] = await db
      .select()
      .from(automationTemplates)
      .where(eq(automationTemplates.id, templateId))
      .limit(1);

    if (!template) {
      throw ApiError.notFound("Template not found");
    }

    // Parse template steps as configuration
    const templateSteps =
      typeof template.steps === "string"
        ? JSON.parse(template.steps)
        : template.steps;

    // Merge custom inputs with template defaults
    const automationConfig = {
      steps: templateSteps,
      ...(data.customInputs || {}),
    };

    // Calculate next run time
    // PLACEHOLDER: Use cron-parser to calculate next run
    const nextRun = new Date(Date.now() + 60000); // 1 minute from now

    // Create task from template
    const [task] = await db
      .insert(scheduledBrowserTasks)
      .values({
        userId: req.user!.id,
        name: data.name || `${template.name} (from template)`,
        description: data.description || template.description,
        automationType: "workflow", // Templates are always workflows
        automationConfig: automationConfig as any,
        scheduleType: data.scheduleType || "once",
        cronExpression: data.cronExpression || "0 0 * * *",
        timezone: data.timezone,
        nextRun,
        retryOnFailure: true,
        maxRetries: 3,
        notifyOnSuccess: false,
        notifyOnFailure: true,
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
      message: `Task created from template "${template.name}"`,
    });
  })
);

/**
 * GET /api/v1/templates/categories
 * Get list of template categories
 */
router.get(
  "/meta/categories",
  requireApiKey,
  requireScopes(["templates:read"]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const db = await getDb();

    if (!db) {
      throw ApiError.serviceUnavailable("Database unavailable");
    }

    // PLACEHOLDER: Get unique categories from templates
    // For now, returning mock categories
    const categories = [
      {
        id: "web-scraping",
        name: "Web Scraping",
        description: "Extract data from websites",
        count: 15,
      },
      {
        id: "form-filling",
        name: "Form Filling",
        description: "Automate form submissions",
        count: 8,
      },
      {
        id: "testing",
        name: "Testing",
        description: "Automated testing workflows",
        count: 12,
      },
      {
        id: "monitoring",
        name: "Monitoring",
        description: "Website and app monitoring",
        count: 10,
      },
    ];

    res.json({ data: categories });
  })
);

export default router;
