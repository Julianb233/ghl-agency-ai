/**
 * API Key Authentication Middleware
 * Validates API keys and attaches user context to requests
 */

import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getDb } from "../../../db";
import { apiKeys, users } from "../../../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Extended Request type with authenticated user context
 */
export interface AuthenticatedRequest extends Request {
  apiKey?: {
    id: number;
    userId: number;
    scopes: string[];
    name: string;
  };
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Hash API key for database lookup
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * API Key Authentication Middleware
 *
 * Expects API key in Authorization header: "Bearer ghl_..."
 *
 * Usage:
 * ```typescript
 * router.get('/api/v1/tasks', requireApiKey, handler);
 * ```
 */
export async function requireApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Missing Authorization header. Include 'Authorization: Bearer <your-api-key>'",
        code: "MISSING_API_KEY",
      });
      return;
    }

    // Extract API key from "Bearer <key>" format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid Authorization header format. Use 'Bearer <your-api-key>'",
        code: "INVALID_AUTH_FORMAT",
      });
      return;
    }

    const apiKeyValue = parts[1];

    // Validate API key format (should start with "ghl_")
    if (!apiKeyValue.startsWith("ghl_")) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid API key format. Keys must start with 'ghl_'",
        code: "INVALID_KEY_FORMAT",
      });
      return;
    }

    // Hash the API key for database lookup
    const keyHash = hashApiKey(apiKeyValue);

    const db = await getDb();
    if (!db) {
      res.status(503).json({
        error: "Service Unavailable",
        message: "Database connection unavailable",
        code: "DB_UNAVAILABLE",
      });
      return;
    }

    // Lookup API key in database
    const [apiKeyRecord] = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        name: apiKeys.name,
        scopes: apiKeys.scopes,
        isActive: apiKeys.isActive,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        lastUsedAt: apiKeys.lastUsedAt,
        totalRequests: apiKeys.totalRequests,
      })
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (!apiKeyRecord) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid API key",
        code: "INVALID_API_KEY",
      });
      return;
    }

    // Check if key is active
    if (!apiKeyRecord.isActive) {
      res.status(401).json({
        error: "Unauthorized",
        message: "API key is inactive",
        code: "KEY_INACTIVE",
      });
      return;
    }

    // Check if key is revoked
    if (apiKeyRecord.revokedAt) {
      res.status(401).json({
        error: "Unauthorized",
        message: "API key has been revoked",
        code: "KEY_REVOKED",
      });
      return;
    }

    // Check if key is expired
    if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
      res.status(401).json({
        error: "Unauthorized",
        message: "API key has expired",
        code: "KEY_EXPIRED",
      });
      return;
    }

    // Fetch user details
    const [userRecord] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, apiKeyRecord.userId))
      .limit(1);

    if (!userRecord) {
      res.status(401).json({
        error: "Unauthorized",
        message: "User associated with API key not found",
        code: "USER_NOT_FOUND",
      });
      return;
    }

    // Attach API key and user context to request
    req.apiKey = {
      id: apiKeyRecord.id,
      userId: apiKeyRecord.userId,
      scopes: apiKeyRecord.scopes as string[],
      name: apiKeyRecord.name,
    };

    req.user = {
      id: userRecord.id,
      email: userRecord.email || "",
      role: userRecord.role,
    };

    // Update last used timestamp (async, don't wait)
    db.update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        totalRequests: (apiKeyRecord.totalRequests || 0) + 1,
      })
      .where(eq(apiKeys.id, apiKeyRecord.id))
      .then(() => {})
      .catch((error) => {
        console.error("Failed to update API key usage:", error);
      });

    next();
  } catch (error) {
    console.error("API key authentication error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
}

/**
 * Scope validation middleware
 *
 * Validates that the API key has required scopes for the operation
 *
 * Usage:
 * ```typescript
 * router.post('/api/v1/tasks', requireApiKey, requireScopes(['tasks:write']), handler);
 * ```
 */
export function requireScopes(requiredScopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({
        error: "Unauthorized",
        message: "API key required",
        code: "API_KEY_REQUIRED",
      });
      return;
    }

    const apiKeyScopes = req.apiKey.scopes || [];
    const missingScopes = requiredScopes.filter(
      (scope) => !apiKeyScopes.includes(scope) && !apiKeyScopes.includes("*")
    );

    if (missingScopes.length > 0) {
      res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions",
        code: "INSUFFICIENT_SCOPES",
        details: {
          required: requiredScopes,
          missing: missingScopes,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Optional API key middleware
 * Attaches user context if valid API key is present, but doesn't require it
 */
export async function optionalApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No API key provided, continue without authentication
    next();
    return;
  }

  // If API key is provided, validate it
  await requireApiKey(req, res, next);
}
