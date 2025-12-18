import "./config";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleAuthRoutes } from "./google-auth";
import { emailAuthRouter } from "./email-auth";
import { onboardingRouter } from "./onboarding";
import { registerSSERoutes } from "./sse-routes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { webhookEndpointsRouter } from "../api/webhookEndpoints";
import { schedulerRunnerService } from "../services/schedulerRunner.service";
import { memoryCleanupScheduler } from "../services/memory";
import { getDb } from "../db";
import { scheduledBrowserTasks } from "../../drizzle/schema-scheduled-tasks";
import { eq } from "drizzle-orm";
import { cronSchedulerService } from "../services/cronScheduler.service";
import {
  initSentry,
  setupSentryMiddleware,
  sentryErrorHandler
} from "../lib/sentry";
import { createRestApi } from "../api/rest";

// Initialize Sentry as early as possible
initSentry();

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export async function createApp() {
  const app = express();

  // Sentry middleware must be the first middleware
  setupSentryMiddleware(app);

  // Security headers with helmet
  // Disable CSP in development for Vite HMR to work
  const isDevelopment = process.env.NODE_ENV === "development";
  app.use(
    helmet({
      contentSecurityPolicy: isDevelopment
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "https:", "blob:"],
              connectSrc: ["'self'", "wss:", "https:"],
              fontSrc: ["'self'", "data:"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'self'"],
              workerSrc: ["'self'", "blob:"],
            },
          },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: "sameorigin", // Allow same-origin for iframes
      },
      noSniff: true,
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },
    })
  );

  // On Vercel, the body is already parsed and attached to req.body
  // We need to skip express.json() parsing to avoid "Bad Request" errors
  const isVercel = process.env.VERCEL === "1";

  if (isVercel) {
    // For Vercel: body is already parsed, just ensure it's available
    app.use((req, _res, next) => {
      // Vercel has already parsed the body and attached it to req.body
      // We don't need to do anything special, just continue
      next();
    });
  } else {
    // For non-Vercel environments: use standard Express body parsers
    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));
  }
  // Simple health check at /api/health (no auth required)
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // OAuth callback under /api/oauth/callback (for integrations, not user auth)
  registerOAuthRoutes(app);
  // Google Auth routes
  registerGoogleAuthRoutes(app);
  // Email/Password Auth routes
  app.use("/api/auth", emailAuthRouter);
  // Onboarding routes
  app.use("/api/onboarding", onboardingRouter);
  // SSE routes for real-time streaming
  registerSSERoutes(app);
  // Webhook endpoints (public, token-authenticated)
  app.use("/api/webhooks", webhookEndpointsRouter);

  // Mount REST API v1 routes (includes /api/v1/health, /api/v1/tasks, etc.)
  const restApi = createRestApi();
  app.use(restApi);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const server = createServer(app);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Sentry error handler must be after all routes and before other error handlers
  app.use(sentryErrorHandler);

  // Generic error handler for any remaining errors
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? err.message : "An error occurred",
    });
  });

  return app;
}

/**
 * Initialize scheduled tasks on startup
 */
async function initializeScheduledTasks() {
  try {
    console.log("Initializing scheduled tasks...");

    const db = await getDb();
    if (!db) {
      console.log("Database not available, skipping scheduled tasks initialization");
      return;
    }

    // Get all active scheduled tasks
    const tasks = await db
      .select()
      .from(scheduledBrowserTasks)
      .where(eq(scheduledBrowserTasks.isActive, true));

    console.log(`Found ${tasks.length} active scheduled tasks`);

    // Update next run times for all active tasks
    for (const task of tasks) {
      try {
        if (task.status === "active") {
          const nextRun = cronSchedulerService.getNextRunTime(
            task.cronExpression,
            task.timezone
          );

          if (nextRun) {
            await db
              .update(scheduledBrowserTasks)
              .set({
                nextRun,
                updatedAt: new Date(),
              })
              .where(eq(scheduledBrowserTasks.id, task.id));

            const description = cronSchedulerService.describeCronExpression(task.cronExpression);
            console.log(`  - Task ${task.id} (${task.name}): ${description}`);
            console.log(`    Next run: ${nextRun.toISOString()}`);
          }
        }
      } catch (error) {
        console.error(`Error initializing task ${task.id}:`, error);
      }
    }

    // Start the scheduler runner
    const checkInterval = parseInt(process.env.SCHEDULER_CHECK_INTERVAL || "60000");
    schedulerRunnerService.start(checkInterval);

    console.log("Scheduled tasks initialized successfully");
  } catch (error) {
    console.error("Error initializing scheduled tasks:", error);
  }
}

/**
 * Initialize memory cleanup scheduler on startup
 */
async function initializeMemoryCleanup() {
  try {
    console.log("Initializing memory cleanup scheduler...");

    // Configuration from environment variables with sensible defaults
    const cleanupIntervalHours = parseInt(process.env.MEMORY_CLEANUP_INTERVAL_HOURS || "6");
    const consolidateIntervalHours = parseInt(process.env.MEMORY_CONSOLIDATE_INTERVAL_HOURS || "24");
    const runImmediately = process.env.MEMORY_CLEANUP_RUN_ON_STARTUP === "true";

    // Start the memory cleanup scheduler
    memoryCleanupScheduler.start({
      cleanupIntervalMs: cleanupIntervalHours * 60 * 60 * 1000,
      consolidateIntervalMs: consolidateIntervalHours * 60 * 60 * 1000,
      runImmediately,
    });

    console.log("Memory cleanup scheduler initialized successfully");
  } catch (error) {
    console.error("Error initializing memory cleanup scheduler:", error);
  }
}

async function startServer() {
  const app = await createApp();
  const server = createServer(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Initialize scheduled tasks after server starts
    initializeScheduledTasks().catch(console.error);

    // Initialize memory cleanup scheduler
    initializeMemoryCleanup().catch(console.error);

    // Optionally start workers in development mode
    if (process.env.NODE_ENV === "development" && process.env.START_WORKERS === "true") {
      console.log("\nStarting workers in development mode...");
      console.log("Note: In production, run workers separately using: tsx server/workers/index.ts\n");

      import("../workers/dev")
        .then(({ startDevelopmentWorkers }) => startDevelopmentWorkers())
        .catch((error) => {
          console.error("Failed to start development workers:", error);
          console.log("Workers will not be available. Set REDIS_URL to enable background jobs.");
        });
    }
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    schedulerRunnerService.stop();
    memoryCleanupScheduler.stop();
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, shutting down gracefully...");
    schedulerRunnerService.stop();
    memoryCleanupScheduler.stop();
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
}

// Only start the server if this file is run directly (not imported)
// For Vercel, we'll export the app creation function instead
if (import.meta.url === `file://${process.argv[1]}` || process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}

// Export the app creation function for Vercel serverless function
export default createApp;
