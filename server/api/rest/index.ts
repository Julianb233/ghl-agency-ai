/**
 * REST API Server
 * Production-ready public REST API with authentication, rate limiting, and documentation
 */

import express, { type Express } from "express";
import helmet from "helmet";
import { requireApiKey, requireScopes } from "./middleware/authMiddleware";
import { apiKeyRateLimit, globalRateLimit } from "./middleware/rateLimitMiddleware";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware";
import {
  requestLogger,
  performanceMonitor,
  requestId,
  corsMiddleware,
} from "./middleware/loggingMiddleware";

// Import route handlers
import tasksRouter from "./routes/tasks";
import executionsRouter from "./routes/executions";
import templatesRouter from "./routes/templates";
import webhooksRouter from "./routes/webhooks";

/**
 * Create and configure REST API Express app
 */
export function createRestApi(): Express {
  const app = express();

  // ========================================
  // GLOBAL MIDDLEWARE
  // ========================================

  // Security headers with helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: "deny",
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },
    })
  );

  // Request ID for tracing
  app.use(requestId);

  // CORS configuration
  app.use(corsMiddleware);

  // Parse JSON bodies
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Request logging and performance monitoring
  app.use(requestLogger);
  app.use(performanceMonitor);

  // Global rate limiting (before authentication)
  app.use("/api/v1", globalRateLimit);

  // ========================================
  // API VERSION 1 ROUTES
  // ========================================

  // Health check endpoint (no authentication required)
  app.get("/api/v1/health", (req, res) => {
    res.json({
      status: "healthy",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  // API information endpoint (no authentication required)
  app.get("/api/v1", (req, res) => {
    res.json({
      name: "GHL Agency AI API",
      version: "1.0.0",
      description: "Production-ready REST API for browser automation and workflow management",
      documentation: "/api/docs",
      endpoints: {
        tasks: "/api/v1/tasks",
        executions: "/api/v1/executions",
        templates: "/api/v1/templates",
      },
      authentication: {
        type: "Bearer Token",
        header: "Authorization",
        format: "Bearer ghl_...",
      },
      rateLimit: {
        default: "100 requests per minute",
        authenticated: "Based on API key plan",
      },
    });
  });

  // Mount authenticated routes with API key rate limiting
  app.use("/api/v1/tasks", apiKeyRateLimit, tasksRouter);
  app.use("/api/v1/executions", apiKeyRateLimit, executionsRouter);
  app.use("/api/v1/templates", apiKeyRateLimit, templatesRouter);

  // Webhooks route (uses simpler secret-based auth for n8n compatibility)
  app.use("/api/v1/webhooks", webhooksRouter);

  // ========================================
  // ERROR HANDLING
  // ========================================

  // 404 handler for undefined /api/v1/* routes only
  app.use("/api/v1", notFoundHandler);

  // Global error handler (must be last)
  app.use("/api/v1", errorHandler);

  return app;
}

/**
 * Start REST API server
 */
export function startRestApiServer(port: number = 3001): void {
  const app = createRestApi();

  app.listen(port, () => {
    console.log(`[REST API] Server listening on port ${port}`);
    console.log(`[REST API] API documentation: http://localhost:${port}/api/docs`);
    console.log(`[REST API] Health check: http://localhost:${port}/api/v1/health`);
  });
}

// Export for use in existing server
export { createRestApi as default };
