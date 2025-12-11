/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm for API rate limiting
 */

import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authMiddleware";

/**
 * Rate limit bucket for tracking API usage
 */
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * In-memory rate limit storage
 * PLACEHOLDER: Replace with Redis for production multi-instance deployments
 */
class RateLimitStore {
  private buckets: Map<string, RateLimitBucket> = new Map();

  /**
   * Get current token count for a key
   */
  getTokens(
    key: string,
    maxTokens: number,
    refillRate: number,
    refillInterval: number
  ): number {
    const bucket = this.buckets.get(key);
    const now = Date.now();

    if (!bucket) {
      // Initialize new bucket
      this.buckets.set(key, {
        tokens: maxTokens - 1, // Consume 1 token for current request
        lastRefill: now,
      });
      return maxTokens - 1;
    }

    // Calculate tokens to add based on time elapsed
    const timeSinceRefill = now - bucket.lastRefill;
    const intervalsElapsed = Math.floor(timeSinceRefill / refillInterval);
    const tokensToAdd = intervalsElapsed * refillRate;

    // Refill tokens (capped at maxTokens)
    const newTokens = Math.min(bucket.tokens + tokensToAdd, maxTokens);

    // Update bucket
    bucket.tokens = newTokens - 1; // Consume 1 token for current request
    bucket.lastRefill = now;

    this.buckets.set(key, bucket);

    return bucket.tokens;
  }

  /**
   * Check if request should be rate limited
   */
  isRateLimited(
    key: string,
    maxTokens: number,
    refillRate: number,
    refillInterval: number
  ): boolean {
    const remainingTokens = this.getTokens(key, maxTokens, refillRate, refillInterval);
    return remainingTokens < 0;
  }

  /**
   * Get remaining tokens for a key
   */
  getRemainingTokens(
    key: string,
    maxTokens: number,
    refillRate: number,
    refillInterval: number
  ): number {
    const bucket = this.buckets.get(key);
    if (!bucket) return maxTokens;

    const now = Date.now();
    const timeSinceRefill = now - bucket.lastRefill;
    const intervalsElapsed = Math.floor(timeSinceRefill / refillInterval);
    const tokensToAdd = intervalsElapsed * refillRate;

    return Math.min(bucket.tokens + tokensToAdd, maxTokens);
  }

  /**
   * Clear old buckets (cleanup)
   */
  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [key, bucket] of Array.from(this.buckets.entries())) {
      if (now - bucket.lastRefill > maxAge) {
        this.buckets.delete(key);
      }
    }
  }
}

// Singleton rate limit store
const rateLimitStore = new RateLimitStore();

// Cleanup old buckets every hour
setInterval(() => rateLimitStore.cleanup(), 3600000);

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
}

/**
 * Default rate limit: 100 requests per minute per API key
 */
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  message: "Too many requests, please try again later",
};

/**
 * Create rate limit middleware
 *
 * Usage:
 * ```typescript
 * router.use(rateLimit({ windowMs: 60000, maxRequests: 100 }));
 * ```
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const options = { ...DEFAULT_RATE_LIMIT, ...config };

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Generate rate limit key
      const key = options.keyGenerator
        ? options.keyGenerator(req)
        : req.apiKey
        ? `apikey:${req.apiKey.id}`
        : `ip:${req.ip}`;

      // Check if rate limited
      const isLimited = rateLimitStore.isRateLimited(
        key,
        options.maxRequests,
        1, // Refill 1 token per interval
        options.windowMs / options.maxRequests // Interval between refills
      );

      // Get remaining tokens for headers
      const remaining = rateLimitStore.getRemainingTokens(
        key,
        options.maxRequests,
        1,
        options.windowMs / options.maxRequests
      );

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", options.maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", Math.max(0, remaining).toString());
      res.setHeader(
        "X-RateLimit-Reset",
        new Date(Date.now() + options.windowMs).toISOString()
      );

      if (isLimited) {
        res.status(429).json({
          error: "Too Many Requests",
          message: options.message,
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: Math.ceil(options.windowMs / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Rate limit error:", error);
      // Don't fail the request on rate limit errors
      next();
    }
  };
}

/**
 * Per-API-key rate limiter based on plan limits
 *
 * Uses rate limits from the API key record
 */
export async function apiKeyRateLimit(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.apiKey) {
    // No API key, skip rate limiting
    next();
    return;
  }

  try {
    const db = await import("../../../db").then((m) => m.getDb());
    if (!db) {
      next();
      return;
    }

    const { apiKeys } = await import("../../../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    // Fetch API key rate limits from database
    const [apiKeyRecord] = await db
      .select({
        rateLimitPerMinute: apiKeys.rateLimitPerMinute,
        rateLimitPerHour: apiKeys.rateLimitPerHour,
        rateLimitPerDay: apiKeys.rateLimitPerDay,
      })
      .from(apiKeys)
      .where(eq(apiKeys.id, req.apiKey.id))
      .limit(1);

    if (!apiKeyRecord) {
      next();
      return;
    }

    // Check per-minute rate limit
    const minuteKey = `apikey:${req.apiKey.id}:minute`;
    const isMinuteLimited = rateLimitStore.isRateLimited(
      minuteKey,
      apiKeyRecord.rateLimitPerMinute,
      1,
      60000 / apiKeyRecord.rateLimitPerMinute
    );

    if (isMinuteLimited) {
      res.status(429).json({
        error: "Too Many Requests",
        message: "Per-minute rate limit exceeded",
        code: "RATE_LIMIT_MINUTE_EXCEEDED",
        limit: apiKeyRecord.rateLimitPerMinute,
        window: "1 minute",
      });
      return;
    }

    // Check per-hour rate limit
    const hourKey = `apikey:${req.apiKey.id}:hour`;
    const isHourLimited = rateLimitStore.isRateLimited(
      hourKey,
      apiKeyRecord.rateLimitPerHour,
      1,
      3600000 / apiKeyRecord.rateLimitPerHour
    );

    if (isHourLimited) {
      res.status(429).json({
        error: "Too Many Requests",
        message: "Per-hour rate limit exceeded",
        code: "RATE_LIMIT_HOUR_EXCEEDED",
        limit: apiKeyRecord.rateLimitPerHour,
        window: "1 hour",
      });
      return;
    }

    // Check per-day rate limit
    const dayKey = `apikey:${req.apiKey.id}:day`;
    const isDayLimited = rateLimitStore.isRateLimited(
      dayKey,
      apiKeyRecord.rateLimitPerDay,
      1,
      86400000 / apiKeyRecord.rateLimitPerDay
    );

    if (isDayLimited) {
      res.status(429).json({
        error: "Too Many Requests",
        message: "Per-day rate limit exceeded",
        code: "RATE_LIMIT_DAY_EXCEEDED",
        limit: apiKeyRecord.rateLimitPerDay,
        window: "1 day",
      });
      return;
    }

    // Add rate limit info to headers
    const minuteRemaining = rateLimitStore.getRemainingTokens(
      minuteKey,
      apiKeyRecord.rateLimitPerMinute,
      1,
      60000 / apiKeyRecord.rateLimitPerMinute
    );

    res.setHeader("X-RateLimit-Limit-Minute", apiKeyRecord.rateLimitPerMinute.toString());
    res.setHeader("X-RateLimit-Remaining-Minute", Math.max(0, minuteRemaining).toString());

    next();
  } catch (error) {
    console.error("API key rate limit error:", error);
    next();
  }
}

/**
 * Global rate limit for unauthenticated requests
 * 60 requests per minute per IP
 */
export const globalRateLimit = rateLimit({
  windowMs: 60000,
  maxRequests: 60,
  message: "Too many requests from this IP, please try again later",
  keyGenerator: (req) => `ip:${req.ip}`,
});
