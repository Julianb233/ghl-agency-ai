/**
 * Webhooks REST API Routes
 * Endpoint for n8n and external integrations to trigger browser automations
 */

import { Router, type Request, Response } from "express";
import { z } from "zod";
import { Stagehand } from "@browserbasehq/stagehand";
import { getDb } from "../../../db";
import { browserSessions } from "../../../../drizzle/schema";
import { asyncHandler, ApiError } from "../middleware/errorMiddleware";
import {
  ghlLogin,
  extractContacts,
  extractWorkflows,
  extractPipelines,
  extractDashboardMetrics,
  type GHLWorkflowType,
} from "../../../workflows/ghl";

const router = Router();

// ========================================
// VALIDATION SCHEMAS
// ========================================

const webhookPayloadSchema = z.object({
  // Client/tenant identification
  clientId: z.string().min(1),

  // Task type - what automation to run
  taskType: z.enum([
    "ghl-login",
    "ghl-extract-contacts",
    "ghl-extract-workflows",
    "ghl-extract-pipelines",
    "ghl-extract-dashboard",
    "browser-navigate",
    "browser-act",
    "browser-extract",
    "custom",
  ]),

  // Task-specific data
  taskData: z.object({
    // GHL credentials (for login-based tasks)
    email: z.string().email().optional(),
    password: z.string().optional(),
    locationId: z.string().optional(),
    twoFactorCode: z.string().optional(),

    // Browser navigation
    url: z.string().url().optional(),
    instruction: z.string().optional(),

    // Extraction options
    extractionSchema: z.any().optional(),
    limit: z.number().optional(),
    searchTerm: z.string().optional(),

    // Custom action
    customActions: z.array(z.string()).optional(),
  }),

  // Webhook options
  callbackUrl: z.string().url().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  timeout: z.number().min(30000).max(600000).default(300000), // 5 min default
});

// Webhook secret for authentication (simpler than full API key for n8n)
const validateWebhookSecret = (req: Request): boolean => {
  const secret = req.headers["x-webhook-secret"] || req.query.secret;
  const expectedSecret = process.env.WEBHOOK_SECRET || process.env.JWT_SECRET;

  if (!expectedSecret) {
    console.warn("[Webhook] No WEBHOOK_SECRET configured - allowing request");
    return true;
  }

  return secret === expectedSecret;
};

// ========================================
// ROUTES
// ========================================

/**
 * POST /api/v1/webhooks/automation
 * Main webhook endpoint for n8n and external integrations
 * Triggers browser automation based on taskType
 */
router.post(
  "/automation",
  asyncHandler(async (req: Request, res: Response) => {
    // Validate webhook secret
    if (!validateWebhookSecret(req)) {
      throw ApiError.unauthorized("Invalid webhook secret");
    }

    // Parse and validate payload
    const payload = webhookPayloadSchema.parse(req.body);
    const startTime = Date.now();

    console.log(`[Webhook] Received automation request:`, {
      clientId: payload.clientId,
      taskType: payload.taskType,
      priority: payload.priority,
    });

    // Initialize Stagehand with Browserbase
    let stagehand: Stagehand | null = null;
    let sessionId: string | undefined;

    try {
      // Create Stagehand instance - matching existing codebase pattern
      stagehand = new Stagehand({
        env: "BROWSERBASE",
        verbose: 1,
        disablePino: true,
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        browserbaseSessionCreateParams: {
          projectId: process.env.BROWSERBASE_PROJECT_ID!,
          proxies: true,
          timeout: Math.floor(payload.timeout / 1000),
          keepAlive: true,
          browserSettings: {
            blockAds: true,
            solveCaptchas: true,
            recordSession: true,
            viewport: { width: 1920, height: 1080 },
          },
          userMetadata: {
            clientId: payload.clientId,
            taskType: payload.taskType,
            source: "webhook",
          },
        },
      });

      await stagehand.init();
      sessionId = stagehand.browserbaseSessionID;

      console.log(`[Webhook] Session created: ${sessionId}`);

      // Execute task based on type
      let result: any = null;

      switch (payload.taskType) {
        case "ghl-login": {
          if (!payload.taskData.email || !payload.taskData.password) {
            throw ApiError.badRequest("GHL login requires email and password");
          }
          result = await ghlLogin(stagehand, {
            email: payload.taskData.email,
            password: payload.taskData.password,
            locationId: payload.taskData.locationId,
            twoFactorCode: payload.taskData.twoFactorCode,
          });
          break;
        }

        case "ghl-extract-contacts": {
          // Login first if credentials provided
          if (payload.taskData.email && payload.taskData.password) {
            const loginResult = await ghlLogin(stagehand, {
              email: payload.taskData.email,
              password: payload.taskData.password,
              locationId: payload.taskData.locationId,
            });
            if (!loginResult.success) {
              throw ApiError.badRequest(`GHL login failed: ${loginResult.error}`);
            }
          }
          result = await extractContacts(stagehand, {
            limit: payload.taskData.limit,
            searchTerm: payload.taskData.searchTerm,
          });
          break;
        }

        case "ghl-extract-workflows": {
          if (payload.taskData.email && payload.taskData.password) {
            const loginResult = await ghlLogin(stagehand, {
              email: payload.taskData.email,
              password: payload.taskData.password,
              locationId: payload.taskData.locationId,
            });
            if (!loginResult.success) {
              throw ApiError.badRequest(`GHL login failed: ${loginResult.error}`);
            }
          }
          result = await extractWorkflows(stagehand);
          break;
        }

        case "ghl-extract-pipelines": {
          if (payload.taskData.email && payload.taskData.password) {
            const loginResult = await ghlLogin(stagehand, {
              email: payload.taskData.email,
              password: payload.taskData.password,
              locationId: payload.taskData.locationId,
            });
            if (!loginResult.success) {
              throw ApiError.badRequest(`GHL login failed: ${loginResult.error}`);
            }
          }
          result = await extractPipelines(stagehand);
          break;
        }

        case "ghl-extract-dashboard": {
          if (payload.taskData.email && payload.taskData.password) {
            const loginResult = await ghlLogin(stagehand, {
              email: payload.taskData.email,
              password: payload.taskData.password,
              locationId: payload.taskData.locationId,
            });
            if (!loginResult.success) {
              throw ApiError.badRequest(`GHL login failed: ${loginResult.error}`);
            }
          }
          result = await extractDashboardMetrics(stagehand);
          break;
        }

        case "browser-navigate": {
          if (!payload.taskData.url) {
            throw ApiError.badRequest("browser-navigate requires url");
          }
          const page = stagehand.context.pages()[0];
          await page.goto(payload.taskData.url, { waitUntil: "domcontentloaded" });
          result = { navigatedTo: payload.taskData.url, title: await page.title() };
          break;
        }

        case "browser-act": {
          if (!payload.taskData.instruction) {
            throw ApiError.badRequest("browser-act requires instruction");
          }
          if (payload.taskData.url) {
            const page = stagehand.context.pages()[0];
            await page.goto(payload.taskData.url, { waitUntil: "domcontentloaded" });
          }
          await stagehand.act(payload.taskData.instruction);
          result = { executed: payload.taskData.instruction };
          break;
        }

        case "browser-extract": {
          if (!payload.taskData.url || !payload.taskData.instruction) {
            throw ApiError.badRequest("browser-extract requires url and instruction");
          }
          const extractPage = stagehand.context.pages()[0];
          await extractPage.goto(payload.taskData.url, { waitUntil: "domcontentloaded" });
          // Use correct Stagehand extract API - pass schema directly with 'as any'
          if (payload.taskData.extractionSchema) {
            result = await stagehand.extract(
              payload.taskData.instruction,
              payload.taskData.extractionSchema as any
            );
          } else {
            result = await stagehand.extract(payload.taskData.instruction);
          }
          break;
        }

        case "custom": {
          if (!payload.taskData.customActions || payload.taskData.customActions.length === 0) {
            throw ApiError.badRequest("custom task requires customActions array");
          }
          const page = stagehand.context.pages()[0];
          if (payload.taskData.url) {
            await page.goto(payload.taskData.url, { waitUntil: "domcontentloaded" });
          }
          const actionResults: string[] = [];
          for (const action of payload.taskData.customActions) {
            await stagehand.act(action);
            actionResults.push(action);
          }
          result = { executedActions: actionResults };
          break;
        }

        default:
          throw ApiError.badRequest(`Unknown task type: ${payload.taskType}`);
      }

      // Close session
      await stagehand.close();

      const executionTime = Date.now() - startTime;

      // Log to database - userId expects integer, clientId might be string ID
      try {
        const db = await getDb();
        if (db && sessionId) {
          // Parse clientId as integer if numeric, otherwise skip DB logging
          const userIdNum = parseInt(payload.clientId, 10);
          if (!isNaN(userIdNum)) {
            await db.insert(browserSessions).values({
              userId: userIdNum,
              sessionId: sessionId,
              status: "completed",
              url: payload.taskData.url || "webhook-automation",
              metadata: {
                taskType: payload.taskType,
                clientId: payload.clientId,
                source: "webhook",
                executionTime,
                result: typeof result === "object" ? JSON.stringify(result).slice(0, 1000) : result,
              },
            });
          } else {
            console.log("[Webhook] Skipping DB log - clientId is not a numeric user ID");
          }
        }
      } catch (dbError) {
        console.error("[Webhook] Failed to log session:", dbError);
      }

      // Send callback if URL provided
      if (payload.callbackUrl) {
        try {
          await fetch(payload.callbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              success: true,
              clientId: payload.clientId,
              taskType: payload.taskType,
              sessionId,
              result,
              executionTime,
            }),
          });
        } catch (callbackError) {
          console.error("[Webhook] Callback failed:", callbackError);
        }
      }

      // Return result
      res.json({
        success: true,
        clientId: payload.clientId,
        taskType: payload.taskType,
        sessionId,
        result,
        executionTime,
        sessionUrl: `https://www.browserbase.com/sessions/${sessionId}`,
      });

    } catch (error) {
      // Cleanup on error
      if (stagehand) {
        try {
          await stagehand.close();
        } catch {
          // Ignore cleanup errors
        }
      }

      // Log failed session - userId expects integer
      try {
        const db = await getDb();
        const userIdNum = parseInt(payload.clientId, 10);
        if (db && sessionId && !isNaN(userIdNum)) {
          await db.insert(browserSessions).values({
            userId: userIdNum,
            sessionId,
            status: "failed",
            metadata: {
              taskType: payload.taskType,
              error: error instanceof Error ? error.message : "Unknown error",
              source: "webhook",
            },
          });
        }
      } catch (dbError) {
        console.error("[Webhook] Failed to log error session:", dbError);
      }

      throw error;
    }
  })
);

/**
 * GET /api/v1/webhooks/health
 * Health check for webhook endpoint
 */
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    endpoint: "/api/v1/webhooks/automation",
    supportedTasks: [
      "ghl-login",
      "ghl-extract-contacts",
      "ghl-extract-workflows",
      "ghl-extract-pipelines",
      "ghl-extract-dashboard",
      "browser-navigate",
      "browser-act",
      "browser-extract",
      "custom",
    ],
    authentication: "x-webhook-secret header or ?secret= query param",
  });
});

export default router;
