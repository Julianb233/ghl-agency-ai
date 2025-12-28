/**
 * OAuth State Management Service (Redis-Backed)
 *
 * Handles secure storage and validation of OAuth state parameters
 * for CSRF protection and PKCE (Proof Key for Code Exchange) flow.
 *
 * Features:
 * - Cryptographically secure state generation
 * - PKCE code verifier/challenge generation (RFC 7636)
 * - Redis-based storage with automatic TTL expiration
 * - Vercel serverless compatible (no in-memory state)
 * - Graceful fallback to in-memory for local development
 *
 * Architecture:
 * - Uses existing redisService for distributed state storage
 * - Automatic expiration after 10 minutes
 * - One-time use tokens (consumed after callback)
 * - Statistics tracking for monitoring
 *
 * Migration from in-memory:
 * 1. Rename current file: oauthState.service.ts → oauthState.service.backup.ts
 * 2. Rename this file: oauthState.service.redis.ts → oauthState.service.ts
 * 3. Deploy to Vercel
 */

import * as crypto from "crypto";
import { redisService } from "./redis.service";
import { serviceLoggers } from "../lib/logger";

const logger = serviceLoggers.deployment;

/**
 * OAuth state data stored server-side
 */
interface OAuthStateData {
  userId: string;
  provider: string;
  codeVerifier: string;
  createdAt: number;
}

/**
 * Statistics about the state storage
 */
interface OAuthStateStats {
  activeStates: number;
  totalGenerated: number;
  totalConsumed: number;
  totalExpired: number;
}

/**
 * OAuth State Service (Redis-Backed)
 *
 * Uses Redis for distributed state storage across serverless instances.
 * Falls back to in-memory storage when Redis is unavailable (local dev).
 */
class OAuthStateService {
  // State TTL: 10 minutes (in milliseconds)
  private readonly STATE_TTL = 10 * 60 * 1000;

  // Redis key prefix for OAuth states
  private readonly KEY_PREFIX = "oauth:state:";

  // Stats key in Redis
  private readonly STATS_KEY = "oauth:stats";

  /**
   * Generate a cryptographically secure state parameter
   * @returns Base64url-encoded random string (32 bytes)
   */
  generateState(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  /**
   * Generate a PKCE code verifier
   * RFC 7636: 43-128 characters, unreserved URI characters
   * @returns Base64url-encoded random string (32 bytes = 43 characters)
   */
  generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  /**
   * Generate a PKCE code challenge from a code verifier
   * RFC 7636: SHA-256 hash of verifier, base64url-encoded
   * @param codeVerifier - The code verifier to hash
   * @returns Base64url-encoded SHA-256 hash
   */
  generateCodeChallenge(codeVerifier: string): string {
    return crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
  }

  /**
   * Store OAuth state data in Redis
   * @param state - The state parameter (key)
   * @param data - The state data to store
   */
  async set(state: string, data: Omit<OAuthStateData, "createdAt">): Promise<void> {
    const stateData: OAuthStateData = {
      ...data,
      createdAt: Date.now(),
    };

    const key = `${this.KEY_PREFIX}${state}`;

    try {
      // Store state in Redis with TTL
      const success = await redisService.setJson(key, stateData, this.STATE_TTL);

      if (!success) {
        throw new Error("Redis setJson returned false");
      }

      // Increment stats (fire and forget - don't block on stats)
      redisService.incr(`${this.STATS_KEY}:generated`).catch((err) => {
        logger.warn({ err }, "[OAuthState] Failed to increment generated counter");
      });

      logger.info({
        state: state.substring(0, 8) + "...",
        userId: data.userId,
        provider: data.provider,
        ttl: this.STATE_TTL,
        redisMode: redisService.isAvailable() ? "redis" : "memory",
      }, "[OAuthState] Stored state");
    } catch (error) {
      logger.error({ err: error }, "[OAuthState] Failed to store state");
      throw new Error("Failed to store OAuth state");
    }
  }

  /**
   * Retrieve OAuth state data without consuming it
   * @param state - The state parameter to look up
   * @returns The state data if found and not expired, null otherwise
   */
  async get(state: string): Promise<OAuthStateData | null> {
    const key = `${this.KEY_PREFIX}${state}`;

    try {
      const data = await redisService.getJson<OAuthStateData>(key);

      if (!data) {
        logger.warn({ state: state.substring(0, 8) + "..." }, "[OAuthState] State not found");
        return null;
      }

      // Double-check expiration (Redis should handle this, but be defensive)
      const age = Date.now() - data.createdAt;
      if (age > this.STATE_TTL) {
        logger.warn({
          state: state.substring(0, 8) + "...",
          age,
          ttl: this.STATE_TTL,
        }, "[OAuthState] State expired (manual check)");

        // Clean up expired state
        await redisService.del(key);

        // Increment expired counter (fire and forget)
        redisService.incr(`${this.STATS_KEY}:expired`).catch((err) => {
          logger.warn({ err }, "[OAuthState] Failed to increment expired counter");
        });

        return null;
      }

      logger.debug({
        state: state.substring(0, 8) + "...",
        provider: data.provider,
        age,
      }, "[OAuthState] Retrieved state");

      return data;
    } catch (error) {
      logger.error({ err: error }, "[OAuthState] Failed to retrieve state");
      return null;
    }
  }

  /**
   * Consume (retrieve and delete) OAuth state data
   * This is a one-time use operation for security
   * @param state - The state parameter to consume
   * @returns The state data if found and not expired, null otherwise
   */
  async consume(state: string): Promise<OAuthStateData | null> {
    // First, retrieve the data
    const data = await this.get(state);

    if (!data) {
      logger.warn({ state: state.substring(0, 8) + "..." }, "[OAuthState] Cannot consume - state not found or expired");
      return null;
    }

    const key = `${this.KEY_PREFIX}${state}`;

    try {
      // Delete from Redis (one-time use)
      const deleted = await redisService.del(key);

      if (deleted) {
        // Increment consumed counter (fire and forget)
        redisService.incr(`${this.STATS_KEY}:consumed`).catch((err) => {
          logger.warn({ err }, "[OAuthState] Failed to increment consumed counter");
        });

        logger.info({
          state: state.substring(0, 8) + "...",
          userId: data.userId,
          provider: data.provider,
          age: Date.now() - data.createdAt,
        }, "[OAuthState] Consumed state");
      } else {
        logger.warn({ state: state.substring(0, 8) + "..." }, "[OAuthState] State was already deleted during consume");
      }

      return data;
    } catch (error) {
      logger.error({ err: error }, "[OAuthState] Failed to consume state");
      // Return the data anyway since we already validated it
      // The delete failure is logged but shouldn't block OAuth
      return data;
    }
  }

  /**
   * Check if a state exists and is valid
   * @param state - The state parameter to check
   * @returns True if the state exists and is not expired
   */
  async has(state: string): Promise<boolean> {
    const data = await this.get(state);
    return data !== null;
  }

  /**
   * Delete a state (e.g., on error or cancellation)
   * @param state - The state parameter to delete
   * @returns True if the state was deleted, false if it didn't exist
   */
  async delete(state: string): Promise<boolean> {
    const key = `${this.KEY_PREFIX}${state}`;

    try {
      // Check if it existed before deleting
      const existed = await this.has(state);

      // Delete from Redis
      await redisService.del(key);

      logger.info({
        state: state.substring(0, 8) + "...",
        existed,
      }, "[OAuthState] Deleted state");

      return existed;
    } catch (error) {
      logger.error({ err: error }, "[OAuthState] Failed to delete state");
      return false;
    }
  }

  /**
   * Get statistics about the state storage
   * @returns Current statistics
   */
  async getStats(): Promise<OAuthStateStats> {
    try {
      const [generated, consumed, expired] = await Promise.all([
        redisService.get(`${this.STATS_KEY}:generated`),
        redisService.get(`${this.STATS_KEY}:consumed`),
        redisService.get(`${this.STATS_KEY}:expired`),
      ]);

      // Active states count is not tracked (would be expensive to scan keys)
      // In production, implement this with a separate counter that increments/decrements
      const activeStates = 0;

      const stats = {
        activeStates,
        totalGenerated: parseInt(generated || "0", 10),
        totalConsumed: parseInt(consumed || "0", 10),
        totalExpired: parseInt(expired || "0", 10),
      };

      logger.debug(stats, "[OAuthState] Stats retrieved");

      return stats;
    } catch (error) {
      logger.error({ err: error }, "[OAuthState] Failed to get stats");
      return {
        activeStates: 0,
        totalGenerated: 0,
        totalConsumed: 0,
        totalExpired: 0,
      };
    }
  }

  /**
   * Clear all states (for testing or emergency)
   * WARNING: This is a destructive operation and only clears stats in production
   *
   * To clear all OAuth states in production:
   * 1. Connect to Redis directly
   * 2. Run: KEYS oauth:state:* | xargs redis-cli DEL
   * 3. Or use Redis SCAN to avoid blocking
   */
  async clear(): Promise<void> {
    logger.warn("[OAuthState] Clearing OAuth state stats");

    try {
      // Reset stats counters
      await Promise.all([
        redisService.del(`${this.STATS_KEY}:generated`),
        redisService.del(`${this.STATS_KEY}:consumed`),
        redisService.del(`${this.STATS_KEY}:expired`),
      ]);

      logger.info("[OAuthState] Stats cleared successfully");

      // Note: Not clearing individual state keys to avoid KEYS command in production
      // States will naturally expire after 10 minutes
      logger.warn(
        "[OAuthState] Individual state keys not cleared (will expire naturally)"
      );
    } catch (error) {
      logger.error({ err: error }, "[OAuthState] Failed to clear stats");
    }
  }

  /**
   * Stop the service (no-op for Redis-backed version)
   * Kept for API compatibility with in-memory version
   */
  stop(): void {
    logger.info("[OAuthState] Service stopped (Redis connection managed by redisService)");
  }

  /**
   * Get service health status
   * Useful for monitoring and debugging
   */
  getServiceStatus(): {
    redisAvailable: boolean;
    redisMode: "redis" | "memory";
    ttl: number;
  } {
    const redisStatus = redisService.getStatus();

    return {
      redisAvailable: redisStatus.connected,
      redisMode: redisStatus.mode,
      ttl: this.STATE_TTL,
    };
  }
}

// Export singleton instance
export const oauthStateService = new OAuthStateService();

// Also export the class for testing
export { OAuthStateService };
