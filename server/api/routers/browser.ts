import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import { browserSessions, extractedData } from "../../../drizzle/schema";
import { browserbaseSDK } from "../../_core/browserbaseSDK";
import { Stagehand } from "@browserbasehq/stagehand";
import { sessionMetricsService } from "../../services/sessionMetrics.service";
import { websocketService } from "../../services/websocket.service";

/**
 * Browser Control API Router
 *
 * Provides comprehensive browser automation and control capabilities via Browserbase
 * and Stagehand AI. Enables remote browser control, data extraction, screenshots,
 * recording, and real-time session management.
 *
 * Features:
 * - Session creation with geolocation support
 * - AI-powered browser actions via Stagehand
 * - Data extraction with schema validation
 * - Screenshot capture
 * - Session recording and playback
 * - Live session debugging
 * - Cost tracking and metrics
 * - Real-time WebSocket events
 */

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createSessionSchema = z.object({
  geolocation: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  browserSettings: z.object({
    viewport: z.object({
      width: z.number().int().min(320).max(3840).default(1920),
      height: z.number().int().min(240).max(2160).default(1080),
    }).optional(),
    blockAds: z.boolean().default(true),
    solveCaptchas: z.boolean().default(true),
    advancedStealth: z.boolean().default(false),
  }).optional(),
  recordSession: z.boolean().default(true),
  keepAlive: z.boolean().default(true),
  timeout: z.number().int().min(60).max(7200).default(3600), // 1 hour default, max 2 hours
  // Caching options for 10-100x faster subsequent runs
  cacheDir: z.string().optional().describe("Directory for caching agent actions. Enables 10-100x faster subsequent runs."),
  selfHeal: z.boolean().default(false).describe("Enable self-healing to adapt to minor page changes"),
});

const navigateSchema = z.object({
  sessionId: z.string().min(1),
  url: z.string().url(),
  waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).default("load"),
  timeout: z.number().int().min(1000).max(60000).default(30000),
});

const clickElementSchema = z.object({
  sessionId: z.string().min(1),
  selector: z.string().min(1),
  instruction: z.string().optional(), // AI instruction if selector fails
  waitForNavigation: z.boolean().default(false),
  timeout: z.number().int().min(1000).max(30000).default(10000),
});

const typeTextSchema = z.object({
  sessionId: z.string().min(1),
  selector: z.string().min(1),
  text: z.string(),
  instruction: z.string().optional(), // AI instruction if selector fails
  delay: z.number().int().min(0).max(1000).default(0), // Typing delay in ms
  clearFirst: z.boolean().default(false),
});

const scrollToSchema = z.object({
  sessionId: z.string().min(1),
  position: z.union([
    z.enum(["top", "bottom"]),
    z.object({
      x: z.number().int().min(0),
      y: z.number().int().min(0),
    }),
  ]),
  smooth: z.boolean().default(true),
});

const extractDataSchema = z.object({
  sessionId: z.string().min(1),
  instruction: z.string().min(1),
  schemaType: z.enum(["contactInfo", "productInfo", "tableData", "custom"]).optional(),
  selector: z.string().optional(), // Optional selector to narrow extraction scope
  saveToDatabase: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

const takeScreenshotSchema = z.object({
  sessionId: z.string().min(1),
  fullPage: z.boolean().default(false),
  selector: z.string().optional(), // Capture specific element
  quality: z.number().int().min(0).max(100).default(80),
});

const actSchema = z.object({
  sessionId: z.string().min(1),
  instruction: z.string().min(1),
  modelName: z.string().optional(),
  waitForNavigation: z.boolean().default(false),
});

const observeSchema = z.object({
  sessionId: z.string().min(1),
  instruction: z.string().min(1),
  modelName: z.string().optional(),
});

// New optimized batch actions schema (observe + act pattern for 2-3x speed)
const batchActionsSchema = z.object({
  sessionId: z.string().min(1),
  instruction: z.string().min(1).describe("What elements to find and act on"),
  actionType: z.enum(["click", "type", "select"]).default("click"),
  textToType: z.string().optional().describe("Text to type (if actionType is 'type')"),
  maxActions: z.number().int().min(1).max(20).default(10),
});

// DOM optimization schema
const optimizeDOMSchema = z.object({
  sessionId: z.string().min(1),
  removeVideos: z.boolean().default(true),
  removeIframes: z.boolean().default(true),
  disableAnimations: z.boolean().default(true),
  removeHiddenElements: z.boolean().default(false),
});

// History/metrics schema
const getHistorySchema = z.object({
  sessionId: z.string().min(1),
});

// Fast action schema with reduced timeout (for simple operations)
const fastActSchema = z.object({
  sessionId: z.string().min(1),
  instruction: z.string().min(1),
  timeout: z.number().int().min(1000).max(30000).default(5000), // Default 5s instead of 30s
});

// Navigate with speed optimization
const fastNavigateSchema = z.object({
  sessionId: z.string().min(1),
  url: z.string().url(),
  waitUntil: z.enum(["domcontentloaded", "load", "networkidle"]).default("domcontentloaded"), // Faster default
  timeout: z.number().int().min(1000).max(30000).default(15000), // Default 15s instead of 30s
  optimizeDOM: z.boolean().default(false), // Auto-optimize DOM after navigation
});

// Multi-page act schema (for targeting specific pages)
const multiPageActSchema = z.object({
  sessionId: z.string().min(1),
  instruction: z.string().min(1),
  pageIndex: z.number().int().min(0).default(0), // Which page to act on (0 = first/default)
});

// Multi-page observe schema
const multiPageObserveSchema = z.object({
  sessionId: z.string().min(1),
  instruction: z.string().min(1),
  pageIndex: z.number().int().min(0).default(0),
});

// Multi-page extract schema with selector support
const multiPageExtractSchema = z.object({
  sessionId: z.string().min(1),
  instruction: z.string().min(1),
  pageIndex: z.number().int().min(0).default(0),
  selector: z.string().optional(), // XPath or CSS selector to narrow extraction
  schemaType: z.enum(["contactInfo", "productInfo", "tableData", "links", "custom"]).optional(),
  saveToDatabase: z.boolean().default(false),
});

// New page schema
const newPageSchema = z.object({
  sessionId: z.string().min(1),
  url: z.string().url().optional(), // Optional URL to navigate to
});

// List pages schema
const listPagesSchema = z.object({
  sessionId: z.string().min(1),
});

// Agent execution schema
const agentExecuteSchema = z.object({
  sessionId: z.string().min(1),
  instruction: z.string().min(1),
  maxSteps: z.number().int().min(1).max(100).default(20),
  systemPrompt: z.string().optional(),
  model: z.string().optional(), // e.g., "google/gemini-2.0-flash", "anthropic/claude-sonnet-4-20250514"
  cua: z.boolean().default(false), // Enable Computer Use Agent mode
  integrations: z.array(z.string()).optional(), // MCP integration URLs
});

// Cache management schema
const clearCacheSchema = z.object({
  cacheDir: z.string().min(1).describe("Cache directory to clear"),
  olderThanDays: z.number().int().min(0).optional().describe("Only clear if cache is older than N days"),
});

// Deep locator schema for iframe traversal
const deepLocatorActionSchema = z.object({
  sessionId: z.string().min(1),
  selector: z.string().min(1).describe("Deep selector with optional iframe hop notation (>>). E.g., 'iframe#payment >> input#card'"),
  pageIndex: z.number().int().min(0).default(0),
  action: z.enum(["click", "fill", "type", "hover", "highlight", "getText", "getHtml", "isVisible", "isChecked", "inputValue"]),
  value: z.string().optional().describe("Value for fill/type actions"),
  options: z.object({
    delay: z.number().int().min(0).max(1000).optional().describe("Typing delay for type action"),
    durationMs: z.number().int().min(0).max(10000).default(2000).optional().describe("Highlight duration"),
  }).optional(),
});

// Deep locator selection schema
const deepLocatorSelectSchema = z.object({
  sessionId: z.string().min(1),
  selector: z.string().min(1),
  pageIndex: z.number().int().min(0).default(0),
  nth: z.number().int().min(0).optional().describe("Select by index (0-based)"),
  first: z.boolean().optional().describe("Select first element"),
});

// ========================================
// STAGEHAND INSTANCE MANAGEMENT
// ========================================

/**
 * Active Stagehand instances mapped by session ID
 * This allows reusing browser sessions across multiple operations
 */
const stagehandInstances = new Map<string, Stagehand>();

/**
 * Get or create Stagehand instance for a session
 */
async function getStagehandInstance(
  sessionId: string,
  userId: number,
  browserSettings?: any
): Promise<{ stagehand: Stagehand; isNew: boolean }> {
  // Check if instance already exists
  if (stagehandInstances.has(sessionId)) {
    return { stagehand: stagehandInstances.get(sessionId)!, isNew: false };
  }

  // Create new instance
  console.log(`[Browser] Creating new Stagehand instance for session ${sessionId}`);

  // Get model from environment variable with fallback
  const modelName = process.env.STAGEHAND_MODEL || process.env.AI_MODEL || "google/gemini-2.0-flash";
  const region = process.env.BROWSERBASE_REGION || "us-west-2";

  // Build Stagehand config with optional caching for 10-100x faster subsequent runs
  const stagehandConfig: any = {
    env: "BROWSERBASE",
    verbose: 0,
    disablePino: true,
    model: modelName,
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      proxies: true,
      region: region as any,
      timeout: browserSettings?.timeout || 3600,
      keepAlive: browserSettings?.keepAlive !== false,
      browserSettings: {
        advancedStealth: browserSettings?.advancedStealth || false,
        blockAds: browserSettings?.blockAds !== false,
        solveCaptchas: browserSettings?.solveCaptchas !== false,
        recordSession: browserSettings?.recordSession !== false,
        viewport: browserSettings?.viewport || { width: 1920, height: 1080 },
      },
      userMetadata: {
        userId: `user-${userId}`,
        sessionId,
        environment: process.env.NODE_ENV || "development",
      },
    },
  };

  // Add caching for 10-100x faster subsequent runs
  if (browserSettings?.cacheDir) {
    stagehandConfig.cacheDir = browserSettings.cacheDir;
    console.log(`[Browser] Caching enabled: ${browserSettings.cacheDir}`);
  }

  // Add self-healing for minor page changes
  if (browserSettings?.selfHeal) {
    stagehandConfig.selfHeal = true;
    console.log(`[Browser] Self-healing enabled`);
  }

  const stagehand = new Stagehand(stagehandConfig);

  await stagehand.init();
  stagehandInstances.set(sessionId, stagehand);

  return { stagehand, isNew: true };
}

/**
 * Close and cleanup Stagehand instance
 */
async function closeStagehandInstance(sessionId: string): Promise<void> {
  const stagehand = stagehandInstances.get(sessionId);
  if (stagehand) {
    try {
      await stagehand.close();
    } catch (error) {
      console.error(`[Browser] Error closing Stagehand for session ${sessionId}:`, error);
    }
    stagehandInstances.delete(sessionId);
  }
}

// ========================================
// ROUTER DEFINITION
// ========================================

export const browserRouter = router({
  /**
   * Create a new browser session
   * Initializes Browserbase session and stores metadata
   */
  createSession: protectedProcedure
    .input(createSessionSchema)
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
        // Create Browserbase session
        // Note: recordSession goes inside browserSettings per Browserbase SDK v2.6+
        const sessionOptions: any = {
          browserSettings: {
            viewport: input.browserSettings?.viewport,
            blockAds: input.browserSettings?.blockAds,
            solveCaptchas: input.browserSettings?.solveCaptchas,
            recordSession: input.recordSession,
          },
          keepAlive: input.keepAlive,
          timeout: input.timeout,
        };

        if (input.geolocation) {
          sessionOptions.proxies = [{
            type: "browserbase",
            geolocation: input.geolocation,
          }];
        }

        const bbSession = await browserbaseSDK.createSession(sessionOptions);

        // Get debug URLs for live view
        const debugInfo = await browserbaseSDK.getSessionDebug(bbSession.id);

        // Store session in database
        const [dbSession] = await db.insert(browserSessions).values({
          userId,
          sessionId: bbSession.id,
          status: "active",
          projectId: bbSession.projectId,
          debugUrl: debugInfo.debuggerFullscreenUrl,
          metadata: {
            geolocation: input.geolocation,
            browserSettings: input.browserSettings,
            createdVia: "api",
          },
          expiresAt: new Date(Date.now() + input.timeout * 1000),
        }).returning();

        // Track session start for metrics
        await sessionMetricsService.trackSessionStart(bbSession.id, userId);

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:session:created", {
          sessionId: bbSession.id,
          debugUrl: debugInfo.debuggerFullscreenUrl,
          status: "active",
        });

        console.log(`[Browser] Session created: ${bbSession.id}`);

        return {
          sessionId: bbSession.id,
          debugUrl: debugInfo.debuggerFullscreenUrl,
          wsUrl: debugInfo.wsUrl,
          status: bbSession.status,
          expiresAt: dbSession.expiresAt,
          createdAt: dbSession.createdAt,
        };
      } catch (error) {
        console.error("[Browser] Failed to create session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create browser session: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Navigate to a URL in a browser session
   */
  navigateTo: protectedProcedure
    .input(navigateSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        // Get or create Stagehand instance
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Navigating to ${input.url} in session ${input.sessionId}`);

        // Navigate to URL
        await page.goto(input.url, {
          waitUntil: input.waitUntil,
          timeout: input.timeout,
        } as any);

        // Update session URL in database
        const db = await getDb();
        if (db) {
          await db.update(browserSessions)
            .set({ url: input.url, updatedAt: new Date() })
            .where(eq(browserSessions.sessionId, input.sessionId));
        }

        // Track navigation metric
        await sessionMetricsService.trackOperation(input.sessionId, "navigate", {
          url: input.url,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:navigation", {
          sessionId: input.sessionId,
          url: input.url,
          timestamp: new Date(),
        });

        return {
          success: true,
          url: input.url,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Navigation failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Navigation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Click an element using selector or AI instruction
   */
  clickElement: protectedProcedure
    .input(clickElementSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Clicking element: ${input.selector || input.instruction}`);

        let success = false;
        let method = "selector";

        // Try selector first if provided
        if (input.selector) {
          try {
            await (page as any).click(input.selector, { timeout: input.timeout });
            success = true;
          } catch (error) {
            console.log(`[Browser] Selector click failed, trying AI instruction...`);
          }
        }

        // Fall back to AI instruction if selector failed or not provided
        if (!success && input.instruction) {
          await stagehand.act(input.instruction);
          method = "ai";
          success = true;
        }

        if (!success) {
          throw new Error("Failed to click element with both selector and AI methods");
        }

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "click", {
          selector: input.selector,
          method,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:action", {
          sessionId: input.sessionId,
          action: "click",
          selector: input.selector,
          method,
          timestamp: new Date(),
        });

        return {
          success: true,
          method,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Click failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Click failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Type text into an input field
   */
  typeText: protectedProcedure
    .input(typeTextSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Typing text into: ${input.selector || input.instruction}`);

        let success = false;
        let method = "selector";

        // Try selector first
        if (input.selector) {
          try {
            if (input.clearFirst) {
              await (page as any).evaluate((selector: string) => {
                const el = document.querySelector(selector) as any;
                if (el) el.value = '';
              }, input.selector);
            }
            await (page as any).type(input.selector, input.text, { delay: input.delay });
            success = true;
          } catch (error) {
            console.log(`[Browser] Selector type failed, trying AI instruction...`);
          }
        }

        // Fall back to AI instruction
        if (!success && input.instruction) {
          await stagehand.act(input.instruction);
          method = "ai";
          success = true;
        }

        if (!success) {
          throw new Error("Failed to type text with both selector and AI methods");
        }

        // Track operation (don't log actual text for security)
        await sessionMetricsService.trackOperation(input.sessionId, "type", {
          selector: input.selector,
          method,
          textLength: input.text.length,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:action", {
          sessionId: input.sessionId,
          action: "type",
          selector: input.selector,
          method,
          timestamp: new Date(),
        });

        return {
          success: true,
          method,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Type failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Type failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Scroll to a position on the page
   */
  scrollTo: protectedProcedure
    .input(scrollToSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Scrolling to position:`, input.position);

        // Determine scroll position
        let scrollExpression: string;
        if (typeof input.position === "string") {
          if (input.position === "top") {
            scrollExpression = `window.scrollTo({ top: 0, behavior: '${input.smooth ? "smooth" : "auto"}' })`;
          } else {
            scrollExpression = `window.scrollTo({ top: document.body.scrollHeight, behavior: '${input.smooth ? "smooth" : "auto"}' })`;
          }
        } else {
          scrollExpression = `window.scrollTo({ top: ${input.position.y}, left: ${input.position.x}, behavior: '${input.smooth ? "smooth" : "auto"}' })`;
        }

        await page.evaluate(scrollExpression);

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "scroll", {
          position: input.position,
        });

        return {
          success: true,
          position: input.position,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Scroll failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Scroll failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Extract data from the page using AI
   */
  extractData: protectedProcedure
    .input(extractDataSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Extracting data with instruction: ${input.instruction}`);

        // Get current URL
        const currentUrl = page.url();

        // Extract data based on schema type
        let extractedData: any;

        if (input.schemaType === "contactInfo") {
          extractedData = await stagehand.extract(
            input.instruction,
            z.object({
              contactInfo: z.object({
                email: z.string().optional(),
                phone: z.string().optional(),
                address: z.string().optional(),
                name: z.string().optional(),
                company: z.string().optional(),
              }),
            }) as any
          );
        } else if (input.schemaType === "productInfo") {
          extractedData = await stagehand.extract(
            input.instruction,
            z.object({
              productInfo: z.object({
                name: z.string().optional(),
                price: z.string().optional(),
                description: z.string().optional(),
                availability: z.string().optional(),
                images: z.array(z.string()).optional(),
                rating: z.string().optional(),
                reviews: z.number().optional(),
              }),
            }) as any
          );
        } else if (input.schemaType === "tableData") {
          extractedData = await stagehand.extract(
            input.instruction,
            z.object({
              tableData: z.array(z.record(z.string(), z.any())),
            }) as any
          );
        } else {
          // Custom extraction without schema
          extractedData = await stagehand.extract(input.instruction);
        }

        // Save to database if requested
        let dbRecord = null;
        if (input.saveToDatabase && db) {
          // Get session database ID
          const [session] = await db
            .select()
            .from(browserSessions)
            .where(eq(browserSessions.sessionId, input.sessionId))
            .limit(1);

          if (session) {
            [dbRecord] = await db.insert(extractedData).values({
              sessionId: session.id,
              userId,
              url: currentUrl,
              dataType: input.schemaType || "custom",
              selector: input.selector,
              data: extractedData,
              metadata: {
                instruction: input.instruction,
                timestamp: new Date(),
              },
              tags: input.tags,
            }).returning();
          }
        }

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "extract", {
          schemaType: input.schemaType,
          dataSize: JSON.stringify(extractedData).length,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:data:extracted", {
          sessionId: input.sessionId,
          url: currentUrl,
          dataType: input.schemaType,
          recordId: dbRecord?.id,
          timestamp: new Date(),
        });

        return {
          success: true,
          data: extractedData,
          url: currentUrl,
          savedToDatabase: !!dbRecord,
          recordId: dbRecord?.id,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Data extraction failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Data extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Take a screenshot of the page
   */
  takeScreenshot: protectedProcedure
    .input(takeScreenshotSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Taking screenshot for session ${input.sessionId}`);

        // Take screenshot
        const screenshotBuffer = await page.screenshot({
          fullPage: input.fullPage,
          type: "png",
          quality: input.quality,
        });

        // Convert to base64
        const screenshotBase64 = screenshotBuffer.toString("base64");
        const dataUrl = `data:image/png;base64,${screenshotBase64}`;

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "screenshot", {
          fullPage: input.fullPage,
          size: screenshotBuffer.length,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:screenshot:captured", {
          sessionId: input.sessionId,
          size: screenshotBuffer.length,
          timestamp: new Date(),
        });

        return {
          success: true,
          screenshot: dataUrl,
          size: screenshotBuffer.length,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Screenshot failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Perform an AI-powered action
   */
  act: protectedProcedure
    .input(actSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);

        console.log(`[Browser] Performing AI action: ${input.instruction}`);

        await stagehand.act(input.instruction);

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "act", {
          instruction: input.instruction,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:action", {
          sessionId: input.sessionId,
          action: "act",
          instruction: input.instruction,
          timestamp: new Date(),
        });

        return {
          success: true,
          instruction: input.instruction,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Act failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Act failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Observe page elements and get available actions
   */
  observe: protectedProcedure
    .input(observeSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);

        console.log(`[Browser] Observing page: ${input.instruction}`);

        const actions = await stagehand.observe(input.instruction);

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "observe", {
          instruction: input.instruction,
          actionsFound: actions.length,
        });

        return {
          success: true,
          actions,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Observe failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Observe failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * OPTIMIZED: Batch actions using observe + act pattern (2-3x faster!)
   *
   * Instead of multiple LLM calls, this uses a single observe() to find elements,
   * then acts on each without LLM inference. This is the recommended pattern
   * for multi-step workflows.
   */
  batchActions: protectedProcedure
    .input(batchActionsSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const startTime = Date.now();

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);

        console.log(`[Browser] Batch actions: ${input.instruction} (max: ${input.maxActions})`);

        // Single LLM call to observe all elements
        const observeStart = Date.now();
        const elements = await stagehand.observe(input.instruction);
        const observeTime = Date.now() - observeStart;

        console.log(`[Browser] Observed ${elements.length} elements in ${observeTime}ms`);

        // Limit to maxActions
        const elementsToProcess = elements.slice(0, input.maxActions);

        // Execute actions WITHOUT additional LLM calls (fast!)
        const actStart = Date.now();
        const results: Array<{ element: string; success: boolean; error?: string }> = [];

        for (const element of elementsToProcess) {
          try {
            // Acting on observe results skips LLM inference entirely
            await stagehand.act(element);
            results.push({ element: element.description || element.selector, success: true });
          } catch (error) {
            results.push({
              element: element.description || element.selector,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
        const actTime = Date.now() - actStart;

        const totalTime = Date.now() - startTime;

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "batchActions", {
          instruction: input.instruction,
          elementsFound: elements.length,
          actionsPerformed: results.length,
          successCount: results.filter(r => r.success).length,
          observeTimeMs: observeTime,
          actTimeMs: actTime,
          totalTimeMs: totalTime,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:batch:completed", {
          sessionId: input.sessionId,
          instruction: input.instruction,
          results,
          timing: { observeTimeMs: observeTime, actTimeMs: actTime, totalTimeMs: totalTime },
          timestamp: new Date(),
        });

        return {
          success: true,
          elementsFound: elements.length,
          actionsPerformed: results.length,
          results,
          timing: {
            observeTimeMs: observeTime,
            actTimeMs: actTime,
            totalTimeMs: totalTime,
          },
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Batch actions failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Batch actions failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * SPEED OPTIMIZATION: Clean up DOM for faster processing
   *
   * Removes heavy elements (videos, iframes) and disables animations
   * before Stagehand processes the page. Can improve speed by 20-40%.
   */
  optimizeDOM: protectedProcedure
    .input(optimizeDOMSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Optimizing DOM for session ${input.sessionId}`);

        const removedCounts = await page.evaluate((options: {
          removeVideos: boolean;
          removeIframes: boolean;
          disableAnimations: boolean;
          removeHiddenElements: boolean;
        }) => {
          const counts = { videos: 0, iframes: 0, animations: 0, hidden: 0 };

          // Remove video elements
          if (options.removeVideos) {
            document.querySelectorAll('video').forEach(el => {
              el.remove();
              counts.videos++;
            });
          }

          // Remove iframes
          if (options.removeIframes) {
            document.querySelectorAll('iframe').forEach(el => {
              el.remove();
              counts.iframes++;
            });
          }

          // Disable animations
          if (options.disableAnimations) {
            document.querySelectorAll('[style*="animation"]').forEach(el => {
              (el as HTMLElement).style.animation = 'none';
              counts.animations++;
            });
            // Also disable transitions
            const style = document.createElement('style');
            style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
            document.head.appendChild(style);
          }

          // Remove hidden elements
          if (options.removeHiddenElements) {
            document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], [hidden]').forEach(el => {
              el.remove();
              counts.hidden++;
            });
          }

          return counts;
        }, input);

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "optimizeDOM", {
          ...removedCounts,
        });

        return {
          success: true,
          removed: removedCounts,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] DOM optimization failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `DOM optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get Stagehand operation history for debugging and analytics
   */
  getHistory: protectedProcedure
    .input(getHistorySchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);

        // Get history from Stagehand
        const history = await stagehand.history;
        const metrics = await stagehand.metrics;

        // Analyze timing
        const timings = history.map((entry: any, i: number) => {
          if (i === 0) return null;
          const duration = new Date(entry.timestamp).getTime() -
                           new Date(history[i - 1].timestamp).getTime();
          return { operation: entry.method, duration };
        }).filter(Boolean);

        // Operation statistics
        const stats = history.reduce((acc: Record<string, number>, entry: any) => {
          acc[entry.method] = (acc[entry.method] || 0) + 1;
          return acc;
        }, {});

        // Find slowest operations
        const slowestOps = timings
          .sort((a: any, b: any) => b.duration - a.duration)
          .slice(0, 5);

        return {
          history,
          metrics,
          stats,
          slowestOperations: slowestOps,
          totalOperations: history.length,
          successCount: history.filter((e: any) => !e.result || !('error' in e.result)).length,
          failedCount: history.filter((e: any) => e.result && 'error' in e.result).length,
        };
      } catch (error) {
        console.error("[Browser] Failed to get history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get history: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * SPEED OPTIMIZATION: Fast act with reduced timeout
   *
   * For simple clicks, selections, and actions where you know the page is ready.
   * Default timeout is 5s instead of 30s. Use this for single, atomic actions.
   */
  fastAct: protectedProcedure
    .input(fastActSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const startTime = Date.now();

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);

        console.log(`[Browser] Fast act: ${input.instruction} (timeout: ${input.timeout}ms)`);

        // Execute with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Action timed out after ${input.timeout}ms`)), input.timeout);
        });

        await Promise.race([
          stagehand.act(input.instruction),
          timeoutPromise,
        ]);

        const duration = Date.now() - startTime;

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "fastAct", {
          instruction: input.instruction,
          durationMs: duration,
          timeout: input.timeout,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:action", {
          sessionId: input.sessionId,
          action: "fastAct",
          instruction: input.instruction,
          durationMs: duration,
          timestamp: new Date(),
        });

        return {
          success: true,
          instruction: input.instruction,
          durationMs: duration,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Fast act failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Fast act failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * SPEED OPTIMIZATION: Fast navigation with domcontentloaded default
   *
   * Navigates without waiting for all resources (networkidle).
   * Default waits for domcontentloaded which is much faster for SPAs.
   * Optionally auto-optimizes DOM after navigation.
   */
  fastNavigate: protectedProcedure
    .input(fastNavigateSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const startTime = Date.now();

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Fast navigate to ${input.url} (waitUntil: ${input.waitUntil}, timeout: ${input.timeout}ms)`);

        // Navigate with faster settings
        await page.goto(input.url, {
          waitUntil: input.waitUntil,
          timeout: input.timeout,
        } as any);

        const navigationTime = Date.now() - startTime;

        // Optionally optimize DOM after navigation
        let domOptimization = null;
        if (input.optimizeDOM) {
          const domStart = Date.now();
          domOptimization = await page.evaluate(() => {
            const counts = { videos: 0, iframes: 0, animations: 0 };

            // Remove heavy elements
            document.querySelectorAll('video').forEach(el => { el.remove(); counts.videos++; });
            document.querySelectorAll('iframe').forEach(el => { el.remove(); counts.iframes++; });

            // Disable animations
            document.querySelectorAll('[style*="animation"]').forEach(el => {
              (el as HTMLElement).style.animation = 'none';
              counts.animations++;
            });
            const style = document.createElement('style');
            style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
            document.head.appendChild(style);

            return counts;
          });
          domOptimization = { ...domOptimization, timeMs: Date.now() - domStart };
        }

        const totalTime = Date.now() - startTime;

        // Update session URL in database
        const db = await getDb();
        if (db) {
          await db.update(browserSessions)
            .set({ url: input.url, updatedAt: new Date() })
            .where(eq(browserSessions.sessionId, input.sessionId));
        }

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "fastNavigate", {
          url: input.url,
          waitUntil: input.waitUntil,
          navigationTimeMs: navigationTime,
          totalTimeMs: totalTime,
          optimizedDOM: input.optimizeDOM,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:navigation", {
          sessionId: input.sessionId,
          url: input.url,
          navigationTimeMs: navigationTime,
          totalTimeMs: totalTime,
          timestamp: new Date(),
        });

        return {
          success: true,
          url: input.url,
          timing: {
            navigationTimeMs: navigationTime,
            totalTimeMs: totalTime,
          },
          domOptimization,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Fast navigate failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Fast navigate failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get session debug/live view URL
   */
  getDebugUrl: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const debugInfo = await browserbaseSDK.getSessionDebug(input.sessionId);

        return {
          sessionId: input.sessionId,
          debugUrl: debugInfo.debuggerFullscreenUrl,
          wsUrl: debugInfo.wsUrl,
          status: "RUNNING" as const,
        };
      } catch (error) {
        console.error("[Browser] Failed to get debug URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get debug URL: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get session recording URL
   */
  getRecording: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const recording = await browserbaseSDK.getSessionRecording(input.sessionId);

        return {
          sessionId: input.sessionId,
          recordingUrl: recording.recordingUrl,
          status: recording.status,
        };
      } catch (error) {
        console.error("[Browser] Failed to get recording:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get recording: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Close browser session
   */
  closeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();

      try {
        // Close Stagehand instance
        await closeStagehandInstance(input.sessionId);

        // Terminate Browserbase session
        await browserbaseSDK.terminateSession(input.sessionId);

        // Update database
        if (db) {
          await db.update(browserSessions)
            .set({
              status: "completed",
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(browserSessions.sessionId, input.sessionId));
        }

        // Track session end
        await sessionMetricsService.trackSessionEnd(input.sessionId, "completed");

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:session:closed", {
          sessionId: input.sessionId,
          timestamp: new Date(),
        });

        return {
          success: true,
          sessionId: input.sessionId,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Failed to close session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to close session: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Delete a browser session from database
   */
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
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
        // First close the session if it's still active
        await closeStagehandInstance(input.sessionId);

        // Try to terminate on Browserbase side (ignore errors for already terminated sessions)
        try {
          await browserbaseSDK.terminateSession(input.sessionId);
        } catch (e) {
          console.log("[Browser] Session may already be terminated:", input.sessionId);
        }

        // First find the browser session to get its ID for related records
        const [session] = await db.select()
          .from(browserSessions)
          .where(and(
            eq(browserSessions.sessionId, input.sessionId),
            eq(browserSessions.userId, userId)
          ))
          .limit(1);

        if (session) {
          // Delete any extracted data associated with this session (using the integer ID)
          await db.delete(extractedData)
            .where(eq(extractedData.sessionId, session.id));

          // Delete the browser session
          await db.delete(browserSessions)
            .where(eq(browserSessions.id, session.id));
        }

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:session:deleted", {
          sessionId: input.sessionId,
          timestamp: new Date(),
        });

        return {
          success: true,
          sessionId: input.sessionId,
          message: "Session deleted successfully",
        };
      } catch (error) {
        console.error("[Browser] Failed to delete session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete session: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Bulk terminate multiple sessions
   */
  bulkTerminate: protectedProcedure
    .input(z.object({ sessionIds: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();

      const results = {
        success: [] as string[],
        failed: [] as { sessionId: string; error: string }[],
      };

      for (const sessionId of input.sessionIds) {
        try {
          await closeStagehandInstance(sessionId);
          try {
            await browserbaseSDK.terminateSession(sessionId);
          } catch (e) {
            // Ignore - session may already be terminated
          }

          if (db) {
            await db.update(browserSessions)
              .set({
                status: "completed",
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(and(
                eq(browserSessions.sessionId, sessionId),
                eq(browserSessions.userId, userId)
              ));
          }

          results.success.push(sessionId);
        } catch (error) {
          results.failed.push({
            sessionId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Emit WebSocket event
      websocketService.broadcastToUser(userId, "browser:sessions:bulk-terminated", {
        results,
        timestamp: new Date(),
      });

      return results;
    }),

  /**
   * Bulk delete multiple sessions
   */
  bulkDelete: protectedProcedure
    .input(z.object({ sessionIds: z.array(z.string()).min(1).max(50) }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();

      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not initialized",
        });
      }

      const results = {
        success: [] as string[],
        failed: [] as { sessionId: string; error: string }[],
      };

      for (const sessionId of input.sessionIds) {
        try {
          await closeStagehandInstance(sessionId);
          try {
            await browserbaseSDK.terminateSession(sessionId);
          } catch (e) {
            // Ignore
          }

          // Find the session first to get its integer ID
          const [session] = await db.select()
            .from(browserSessions)
            .where(and(
              eq(browserSessions.sessionId, sessionId),
              eq(browserSessions.userId, userId)
            ))
            .limit(1);

          if (session) {
            // Delete extracted data first (foreign key constraint)
            await db.delete(extractedData)
              .where(eq(extractedData.sessionId, session.id));

            // Delete the browser session
            await db.delete(browserSessions)
              .where(eq(browserSessions.id, session.id));
          }

          results.success.push(sessionId);
        } catch (error) {
          results.failed.push({
            sessionId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Emit WebSocket event
      websocketService.broadcastToUser(userId, "browser:sessions:bulk-deleted", {
        results,
        timestamp: new Date(),
      });

      return results;
    }),

  /**
   * List user's browser sessions
   */
  listSessions: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "completed", "failed", "expired"]).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
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

      const params = input || { limit: 20, offset: 0 };

      try {
        const conditions = [eq(browserSessions.userId, userId)];
        if (params.status) {
          conditions.push(eq(browserSessions.status, params.status));
        }

        const sessions = await db
          .select()
          .from(browserSessions)
          .where(and(...conditions))
          .orderBy(desc(browserSessions.createdAt))
          .limit(params.limit)
          .offset(params.offset);

        return sessions;
      } catch (error) {
        console.error("[Browser] Failed to list sessions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list sessions: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get session metrics and cost
   */
  getSessionMetrics: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const metrics = await sessionMetricsService.getSessionMetrics(input.sessionId);
        const cost = await sessionMetricsService.calculateCost(input.sessionId);

        return {
          ...metrics,
          cost,
        };
      } catch (error) {
        console.error("[Browser] Failed to get session metrics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // MULTI-PAGE WORKFLOWS
  // ========================================

  /**
   * Create a new page in the browser context
   * Useful for multi-tab workflows
   */
  newPage: protectedProcedure
    .input(newPageSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);

        console.log(`[Browser] Creating new page for session ${input.sessionId}`);

        const newPage = await stagehand.context.newPage();
        const pageIndex = stagehand.context.pages().length - 1;

        // Navigate to URL if provided
        if (input.url) {
          await newPage.goto(input.url, { waitUntil: "domcontentloaded" });
        }

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "newPage", {
          pageIndex,
          url: input.url,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:page:created", {
          sessionId: input.sessionId,
          pageIndex,
          url: input.url || null,
          timestamp: new Date(),
        });

        return {
          success: true,
          pageIndex,
          url: input.url || null,
          totalPages: stagehand.context.pages().length,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Failed to create new page:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create new page: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List all pages in the browser context
   */
  listPages: protectedProcedure
    .input(listPagesSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const pages = stagehand.context.pages();

        const pageInfos = await Promise.all(
          pages.map(async (page, index) => ({
            index,
            url: page.url(),
            title: await page.title(),
          }))
        );

        return {
          success: true,
          pages: pageInfos,
          totalPages: pages.length,
        };
      } catch (error) {
        console.error("[Browser] Failed to list pages:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list pages: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Act on a specific page (multi-page support)
   */
  actOnPage: protectedProcedure
    .input(multiPageActSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const pages = stagehand.context.pages();

        if (input.pageIndex >= pages.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Page index ${input.pageIndex} does not exist. Total pages: ${pages.length}`,
          });
        }

        const targetPage = pages[input.pageIndex];
        console.log(`[Browser] Acting on page ${input.pageIndex}: ${input.instruction}`);

        await stagehand.act(input.instruction, { page: targetPage } as any);

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "actOnPage", {
          instruction: input.instruction,
          pageIndex: input.pageIndex,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:action", {
          sessionId: input.sessionId,
          action: "actOnPage",
          instruction: input.instruction,
          pageIndex: input.pageIndex,
          timestamp: new Date(),
        });

        return {
          success: true,
          instruction: input.instruction,
          pageIndex: input.pageIndex,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Act on page failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Act on page failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Observe on a specific page (multi-page support)
   */
  observeOnPage: protectedProcedure
    .input(multiPageObserveSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const pages = stagehand.context.pages();

        if (input.pageIndex >= pages.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Page index ${input.pageIndex} does not exist. Total pages: ${pages.length}`,
          });
        }

        const targetPage = pages[input.pageIndex];
        console.log(`[Browser] Observing on page ${input.pageIndex}: ${input.instruction}`);

        const actions = await stagehand.observe(input.instruction, { page: targetPage } as any);

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "observeOnPage", {
          instruction: input.instruction,
          pageIndex: input.pageIndex,
          actionsFound: actions.length,
        });

        return {
          success: true,
          actions,
          pageIndex: input.pageIndex,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Observe on page failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Observe on page failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Extract from a specific page with optional selector (multi-page support)
   */
  extractFromPage: protectedProcedure
    .input(multiPageExtractSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const pages = stagehand.context.pages();

        if (input.pageIndex >= pages.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Page index ${input.pageIndex} does not exist. Total pages: ${pages.length}`,
          });
        }

        const targetPage = pages[input.pageIndex];
        const currentUrl = targetPage.url();
        console.log(`[Browser] Extracting from page ${input.pageIndex}: ${input.instruction}`);

        // Build options
        const options: any = { page: targetPage };
        if (input.selector) {
          options.selector = input.selector;
        }

        // Extract based on schema type
        let extractedResult: any;

        if (input.schemaType === "links") {
          extractedResult = await stagehand.extract(
            input.instruction,
            z.object({
              links: z.array(z.object({
                text: z.string(),
                url: z.string().url(),
              })),
            }) as any,
            options
          );
        } else if (input.schemaType === "contactInfo") {
          extractedResult = await stagehand.extract(
            input.instruction,
            z.object({
              contactInfo: z.object({
                email: z.string().optional(),
                phone: z.string().optional(),
                address: z.string().optional(),
                name: z.string().optional(),
                company: z.string().optional(),
              }),
            }) as any,
            options
          );
        } else if (input.schemaType === "productInfo") {
          extractedResult = await stagehand.extract(
            input.instruction,
            z.object({
              productInfo: z.object({
                name: z.string().optional(),
                price: z.string().optional(),
                description: z.string().optional(),
                availability: z.string().optional(),
                images: z.array(z.string()).optional(),
                rating: z.string().optional(),
                reviews: z.number().optional(),
              }),
            }) as any,
            options
          );
        } else if (input.schemaType === "tableData") {
          extractedResult = await stagehand.extract(
            input.instruction,
            z.object({
              tableData: z.array(z.record(z.string(), z.any())),
            }) as any,
            options
          );
        } else {
          // Schema-less extraction (returns { extraction: string })
          extractedResult = await stagehand.extract(input.instruction, options);
        }

        // Save to database if requested
        let dbRecord = null;
        if (input.saveToDatabase && db) {
          const [session] = await db
            .select()
            .from(browserSessions)
            .where(eq(browserSessions.sessionId, input.sessionId))
            .limit(1);

          if (session) {
            [dbRecord] = await db.insert(extractedData).values({
              sessionId: session.id,
              userId,
              url: currentUrl,
              dataType: input.schemaType || "custom",
              selector: input.selector,
              data: extractedResult,
              metadata: {
                instruction: input.instruction,
                pageIndex: input.pageIndex,
                timestamp: new Date(),
              },
            }).returning();
          }
        }

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "extractFromPage", {
          instruction: input.instruction,
          pageIndex: input.pageIndex,
          schemaType: input.schemaType,
          hasSelector: !!input.selector,
          dataSize: JSON.stringify(extractedResult).length,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:data:extracted", {
          sessionId: input.sessionId,
          url: currentUrl,
          pageIndex: input.pageIndex,
          dataType: input.schemaType,
          recordId: dbRecord?.id,
          timestamp: new Date(),
        });

        return {
          success: true,
          data: extractedResult,
          url: currentUrl,
          pageIndex: input.pageIndex,
          savedToDatabase: !!dbRecord,
          recordId: dbRecord?.id,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Extract from page failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Extract from page failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // AGENT WORKFLOWS
  // ========================================

  /**
   * Execute an autonomous agent task
   *
   * The agent can autonomously navigate, interact with elements, and complete
   * complex multi-step tasks. Supports Computer Use Agent (CUA) mode for
   * advanced scenarios.
   */
  agentExecute: protectedProcedure
    .input(agentExecuteSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const startTime = Date.now();

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);

        console.log(`[Browser] Agent executing: ${input.instruction} (maxSteps: ${input.maxSteps})`);

        // Build agent config
        const agentConfig: any = {};

        if (input.model) {
          agentConfig.model = input.model;
        }
        if (input.cua) {
          agentConfig.cua = true;
        }
        if (input.systemPrompt) {
          agentConfig.systemPrompt = input.systemPrompt;
        }
        if (input.integrations && input.integrations.length > 0) {
          agentConfig.integrations = input.integrations;
        }

        // Create agent
        const agent = stagehand.agent(agentConfig);

        // Execute task
        const result = await agent.execute({
          instruction: input.instruction,
          maxSteps: input.maxSteps,
        });

        const duration = Date.now() - startTime;

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "agentExecute", {
          instruction: input.instruction,
          maxSteps: input.maxSteps,
          model: input.model,
          cua: input.cua,
          hasIntegrations: !!input.integrations?.length,
          durationMs: duration,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:agent:completed", {
          sessionId: input.sessionId,
          instruction: input.instruction,
          message: result.message,
          durationMs: duration,
          timestamp: new Date(),
        });

        return {
          success: true,
          message: result.message,
          instruction: input.instruction,
          durationMs: duration,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Agent execution failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Agent execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // DEEP LOCATOR (IFRAME TRAVERSAL)
  // ========================================

  /**
   * Execute action using deepLocator for iframe traversal
   *
   * deepLocator allows targeting elements inside iframes using the >> hop notation.
   * E.g., "iframe#payment >> input#card-number" traverses into the payment iframe
   * and targets the card number input.
   *
   * Supports:
   * - CSS selectors: "iframe#widget >> button.submit"
   * - XPath: "//iframe[@id='myframe'] >> //button"
   * - Multiple hops: "iframe#outer >> iframe#inner >> div.content"
   * - Deep XPath: "//iframe//button" (auto iframe detection)
   */
  deepLocatorAction: protectedProcedure
    .input(deepLocatorActionSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const pages = stagehand.context.pages();

        if (input.pageIndex >= pages.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Page index ${input.pageIndex} does not exist. Total pages: ${pages.length}`,
          });
        }

        const page = pages[input.pageIndex];
        console.log(`[Browser] deepLocator ${input.action}: ${input.selector}`);

        // Get the deep locator
        const locator = (page as any).deepLocator(input.selector);

        let result: any = null;

        switch (input.action) {
          case "click":
            await locator.click();
            break;

          case "fill":
            if (!input.value) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Value is required for fill action",
              });
            }
            await locator.fill(input.value);
            break;

          case "type":
            if (!input.value) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Value is required for type action",
              });
            }
            await locator.type(input.value, { delay: input.options?.delay || 0 });
            break;

          case "hover":
            await locator.hover();
            break;

          case "highlight":
            await locator.highlight({ durationMs: input.options?.durationMs || 2000 });
            break;

          case "getText":
            result = await locator.textContent();
            break;

          case "getHtml":
            result = await locator.innerHtml();
            break;

          case "isVisible":
            result = await locator.isVisible();
            break;

          case "isChecked":
            result = await locator.isChecked();
            break;

          case "inputValue":
            result = await locator.inputValue();
            break;

          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unknown action: ${input.action}`,
            });
        }

        // Track operation
        await sessionMetricsService.trackOperation(input.sessionId, "deepLocatorAction", {
          selector: input.selector,
          action: input.action,
          pageIndex: input.pageIndex,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:deepLocator:action", {
          sessionId: input.sessionId,
          selector: input.selector,
          action: input.action,
          result,
          timestamp: new Date(),
        });

        return {
          success: true,
          selector: input.selector,
          action: input.action,
          result,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] deepLocator action failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `deepLocator action failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Count elements using deepLocator
   */
  deepLocatorCount: protectedProcedure
    .input(deepLocatorSelectSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const pages = stagehand.context.pages();

        if (input.pageIndex >= pages.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Page index ${input.pageIndex} does not exist. Total pages: ${pages.length}`,
          });
        }

        const page = pages[input.pageIndex];
        let locator = (page as any).deepLocator(input.selector);

        // Apply selection modifiers
        if (input.first) {
          locator = locator.first();
        } else if (input.nth !== undefined) {
          locator = locator.nth(input.nth);
        }

        const count = await locator.count();

        return {
          success: true,
          selector: input.selector,
          count,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] deepLocator count failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `deepLocator count failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get element coordinates using deepLocator (useful for debugging)
   */
  deepLocatorCentroid: protectedProcedure
    .input(deepLocatorSelectSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const { stagehand } = await getStagehandInstance(input.sessionId, userId);
        const pages = stagehand.context.pages();

        if (input.pageIndex >= pages.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Page index ${input.pageIndex} does not exist. Total pages: ${pages.length}`,
          });
        }

        const page = pages[input.pageIndex];
        let locator = (page as any).deepLocator(input.selector);

        // Apply selection modifiers
        if (input.first) {
          locator = locator.first();
        } else if (input.nth !== undefined) {
          locator = locator.nth(input.nth);
        }

        const centroid = await locator.centroid();

        return {
          success: true,
          selector: input.selector,
          centroid,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] deepLocator centroid failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `deepLocator centroid failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  // ========================================
  // CACHE MANAGEMENT
  // ========================================

  /**
   * Clear agent action cache
   *
   * Cached workflows run 10-100x faster, but may need to be cleared when:
   * - Website structure changes
   * - Workflow logic needs to be re-explored
   * - Cache is too old
   */
  clearCache: protectedProcedure
    .input(clearCacheSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const fs = await import("fs");
      const path = await import("path");

      try {
        // Sanitize cache directory to prevent directory traversal
        const sanitizedDir = path.basename(input.cacheDir);
        const cacheBasePath = path.join(process.cwd(), "cache");
        const fullCachePath = path.join(cacheBasePath, sanitizedDir);

        // Check if cache exists
        if (!fs.existsSync(fullCachePath)) {
          return {
            success: true,
            message: "Cache directory does not exist",
            cleared: false,
            timestamp: new Date(),
          };
        }

        // Check age if olderThanDays specified
        if (input.olderThanDays !== undefined) {
          const stats = fs.statSync(fullCachePath);
          const ageMs = Date.now() - stats.mtimeMs;
          const ageDays = ageMs / (1000 * 60 * 60 * 24);

          if (ageDays < input.olderThanDays) {
            return {
              success: true,
              message: `Cache is ${ageDays.toFixed(1)} days old (threshold: ${input.olderThanDays} days)`,
              cleared: false,
              ageDays: ageDays,
              timestamp: new Date(),
            };
          }
        }

        // Clear the cache
        fs.rmSync(fullCachePath, { recursive: true, force: true });
        console.log(`[Browser] Cache cleared: ${fullCachePath}`);

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:cache:cleared", {
          cacheDir: input.cacheDir,
          timestamp: new Date(),
        });

        return {
          success: true,
          message: "Cache cleared successfully",
          cleared: true,
          cacheDir: input.cacheDir,
          timestamp: new Date(),
        };
      } catch (error) {
        console.error("[Browser] Failed to clear cache:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to clear cache: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List available caches
   */
  listCaches: protectedProcedure
    .query(async ({ ctx }) => {
      const fs = await import("fs");
      const path = await import("path");

      try {
        const cacheBasePath = path.join(process.cwd(), "cache");

        if (!fs.existsSync(cacheBasePath)) {
          return {
            success: true,
            caches: [],
            totalCount: 0,
          };
        }

        const entries = fs.readdirSync(cacheBasePath, { withFileTypes: true });
        const caches = entries
          .filter(entry => entry.isDirectory())
          .map(entry => {
            const fullPath = path.join(cacheBasePath, entry.name);
            const stats = fs.statSync(fullPath);
            const ageDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);

            return {
              name: entry.name,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
              ageDays: parseFloat(ageDays.toFixed(1)),
            };
          })
          .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

        return {
          success: true,
          caches,
          totalCount: caches.length,
        };
      } catch (error) {
        console.error("[Browser] Failed to list caches:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list caches: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),
});
