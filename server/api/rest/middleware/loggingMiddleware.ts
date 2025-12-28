/**
 * Request Logging Middleware
 * Logs API requests and tracks usage metrics
 */

import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authMiddleware";
import { getDb } from "../../../db";
import { apiRequestLogs } from "../../../../drizzle/schema";
import { serviceLoggers } from "../../../lib/logger";

/**
 * Request with timing information
 */
interface TimedRequest extends AuthenticatedRequest {
  startTime?: number;
}

/**
 * Request logger middleware
 * Logs all API requests with timing information
 */
export function requestLogger(
  req: TimedRequest,
  res: Response,
  next: NextFunction
): void {
  // Record start time
  req.startTime = Date.now();

  // Log request
  serviceLoggers.api.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    apiKeyName: req.apiKey?.name,
  }, 'API request received');

  // Capture response finish event
  const originalSend = res.send;
  res.send = function (body?: any): Response {
    res.send = originalSend; // Restore original method

    const responseTime = Date.now() - (req.startTime || Date.now());

    // Log response
    serviceLoggers.api.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      apiKeyName: req.apiKey?.name,
    }, 'API request completed');

    // Store request log asynchronously (don't block response)
    storeRequestLog(req, res, responseTime).catch((error) => {
      serviceLoggers.api.error({ error: error.message }, 'Failed to store request log');
    });

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Store request log in database
 */
async function storeRequestLog(
  req: TimedRequest,
  res: Response,
  responseTime: number
): Promise<void> {
  // Only log authenticated requests with API keys
  if (!req.apiKey) {
    return;
  }

  try {
    const db = await getDb();
    if (!db) return;

    // Prepare log entry
    const logEntry = {
      apiKeyId: req.apiKey.id,
      userId: req.apiKey.userId,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      responseTime,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      referer: req.headers.referer,
      requestBody: sanitizeRequestBody(req.body),
      createdAt: new Date(),
    };

    // Store in database
    await db.insert(apiRequestLogs).values(logEntry);
  } catch (error) {
    // Silent fail - don't break API functionality
    serviceLoggers.api.error({ error }, 'Failed to store request log in database');
  }
}

/**
 * Sanitize request body for logging
 * Remove sensitive data before storing
 */
function sanitizeRequestBody(body: any): any {
  if (!body) return null;

  // List of sensitive field names to redact
  const sensitiveFields = [
    "password",
    "apiKey",
    "secret",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "creditCard",
    "ssn",
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Performance monitoring middleware
 * Adds performance headers to responses
 */
export function performanceMonitor(
  req: TimedRequest,
  res: Response,
  next: NextFunction
): void {
  req.startTime = Date.now();

  // Add timing header before response is sent
  const originalEnd = res.end.bind(res);
  res.end = function (...args: any[]) {
    if (!res.headersSent) {
      const duration = Date.now() - (req.startTime || Date.now());
      res.setHeader("X-Response-Time", `${duration}ms`);
    }
    return originalEnd(...args);
  } as typeof res.end;

  next();
}

/**
 * Request ID middleware
 * Adds unique request ID to each request for tracing
 */
export function requestId(
  req: Request & { id?: string },
  res: Response,
  next: NextFunction
): void {
  const id = req.headers["x-request-id"] || generateRequestId();
  req.id = id as string;
  res.setHeader("X-Request-ID", id as string);
  next();
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * CORS middleware for API
 */
export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Allow all origins for public API (can be restricted per API key)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Request-ID"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Response-Time, X-Request-ID"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
}
