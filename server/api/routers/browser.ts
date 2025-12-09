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
import { persistentSessionManager } from "../../services/persistentSession.service";

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

// ========================================
// STAGEHAND INSTANCE MANAGEMENT
// Uses persistent session manager for session reuse
// ========================================

/**
 * Get or create Stagehand instance for a session
 * This uses the persistent session manager to handle session lifecycle
 *
 * @param sessionId - Optional session ID. If provided, will try to use that session.
 *                   If not provided, will use/create user's persistent session.
 * @param userId - User ID for session tracking
 * @param browserSettings - Optional browser configuration
 */
async function getStagehandInstance(
  sessionId: string | undefined,
  userId: number,
  browserSettings?: any
): Promise<{ stagehand: Stagehand; isNew: boolean; sessionId: string }> {
  // If specific sessionId provided, try to get it from persistent manager
  if (sessionId) {
    const existingSession = persistentSessionManager.getSession(sessionId);
    if (existingSession) {
      console.log(`[Browser] Reusing existing session from persistent manager: ${sessionId}`);
      await persistentSessionManager.updateActivity(sessionId);
      return {
        stagehand: existingSession.stagehand,
        isNew: false,
        sessionId,
      };
    }
  }

  // Use persistent session manager to get or create a session
  console.log(`[Browser] Getting/creating persistent session for user ${userId}`);

  const persistentSession = await persistentSessionManager.getOrCreateSession(userId, {
    browserSettings: {
      viewport: browserSettings?.viewport || { width: 1920, height: 1080 },
      blockAds: browserSettings?.blockAds !== false,
      solveCaptchas: browserSettings?.solveCaptchas !== false,
      advancedStealth: browserSettings?.advancedStealth || false,
    },
    timeout: (browserSettings?.timeout || 3600) * 1000, // Convert to milliseconds
    keepAlive: browserSettings?.keepAlive !== false,
    recordSession: browserSettings?.recordSession !== false,
  });

  return {
    stagehand: persistentSession.stagehand,
    isNew: persistentSession.isNew,
    sessionId: persistentSession.sessionId,
  };
}

/**
 * Close and cleanup Stagehand instance via persistent session manager
 */
async function closeStagehandInstance(sessionId: string): Promise<void> {
  try {
    await persistentSessionManager.closeSession(sessionId);
    console.log(`[Browser] Session ${sessionId} closed via persistent session manager`);
  } catch (error) {
    console.error(`[Browser] Error closing session ${sessionId}:`, error);
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
        const sessionOptions: any = {
          browserSettings: {
            viewport: input.browserSettings?.viewport,
          },
          recordSession: input.recordSession,
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
        // Get or create Stagehand instance (uses persistent session if no sessionId provided)
        const { stagehand, sessionId } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Navigating to ${input.url} in session ${sessionId}`);

        // Navigate to URL
        await page.goto(input.url, {
          waitUntil: input.waitUntil,
          timeout: input.timeout,
        });

        // Update session URL in database
        const db = await getDb();
        if (db) {
          await db.update(browserSessions)
            .set({ url: input.url, updatedAt: new Date() })
            .where(eq(browserSessions.sessionId, sessionId));
        }

        // Track navigation metric
        await sessionMetricsService.trackOperation(sessionId, "navigate", {
          url: input.url,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:navigation", {
          sessionId,
          url: input.url,
          timestamp: new Date(),
        });

        return {
          success: true,
          url: input.url,
          sessionId,
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
        const { stagehand, sessionId } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Clicking element: ${input.selector || input.instruction}`);

        let success = false;
        let method = "selector";

        // Try selector first if provided
        if (input.selector) {
          try {
            await page.click(input.selector, { timeout: input.timeout });
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
        await sessionMetricsService.trackOperation(sessionId, "click", {
          selector: input.selector,
          method,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:action", {
          sessionId,
          action: "click",
          selector: input.selector,
          method,
          timestamp: new Date(),
        });

        return {
          success: true,
          method,
          sessionId,
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
        const { stagehand, sessionId } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Typing text into: ${input.selector || input.instruction}`);

        let success = false;
        let method = "selector";

        // Try selector first
        if (input.selector) {
          try {
            if (input.clearFirst) {
              await page.fill(input.selector, "");
            }
            await page.type(input.selector, input.text, { delay: input.delay });
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
        await sessionMetricsService.trackOperation(sessionId, "type", {
          selector: input.selector,
          method,
          textLength: input.text.length,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:action", {
          sessionId,
          action: "type",
          selector: input.selector,
          method,
          timestamp: new Date(),
        });

        return {
          success: true,
          method,
          sessionId,
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
        const { stagehand, sessionId } = await getStagehandInstance(input.sessionId, userId);
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
        await sessionMetricsService.trackOperation(sessionId, "scroll", {
          position: input.position,
        });

        return {
          success: true,
          position: input.position,
          sessionId,
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
        const { stagehand, sessionId } = await getStagehandInstance(input.sessionId, userId);
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
            })
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
            })
          );
        } else if (input.schemaType === "tableData") {
          extractedData = await stagehand.extract(
            input.instruction,
            z.object({
              tableData: z.array(z.record(z.string(), z.any())),
            })
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
            .where(eq(browserSessions.sessionId, sessionId))
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
        await sessionMetricsService.trackOperation(sessionId, "extract", {
          schemaType: input.schemaType,
          dataSize: JSON.stringify(extractedData).length,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:data:extracted", {
          sessionId,
          url: currentUrl,
          dataType: input.schemaType,
          recordId: dbRecord?.id,
          timestamp: new Date(),
        });

        return {
          success: true,
          data: extractedData,
          url: currentUrl,
          sessionId,
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
        const { stagehand, sessionId } = await getStagehandInstance(input.sessionId, userId);
        const page = stagehand.context.pages()[0];

        console.log(`[Browser] Taking screenshot for session ${sessionId}`);

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
        await sessionMetricsService.trackOperation(sessionId, "screenshot", {
          fullPage: input.fullPage,
          size: screenshotBuffer.length,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:screenshot:captured", {
          sessionId,
          size: screenshotBuffer.length,
          timestamp: new Date(),
        });

        return {
          success: true,
          screenshot: dataUrl,
          sessionId,
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
        const { stagehand, sessionId } = await getStagehandInstance(input.sessionId, userId);

        console.log(`[Browser] Performing AI action: ${input.instruction}`);

        await stagehand.act(input.instruction);

        // Track operation
        await sessionMetricsService.trackOperation(sessionId, "act", {
          instruction: input.instruction,
        });

        // Emit WebSocket event
        websocketService.broadcastToUser(userId, "browser:action", {
          sessionId,
          action: "act",
          instruction: input.instruction,
          timestamp: new Date(),
        });

        return {
          success: true,
          instruction: input.instruction,
          sessionId,
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
        const { stagehand, sessionId } = await getStagehandInstance(input.sessionId, userId);

        console.log(`[Browser] Observing page: ${input.instruction}`);

        const actions = await stagehand.observe(input.instruction);

        // Track operation
        await sessionMetricsService.trackOperation(sessionId, "observe", {
          instruction: input.instruction,
          actionsFound: actions.length,
        });

        return {
          success: true,
          actions,
          sessionId,
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
          status: debugInfo.status || "RUNNING",
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
});
