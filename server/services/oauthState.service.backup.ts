/**
 * OAuth State Management Service
 *
 * Handles secure storage and validation of OAuth state parameters
 * for CSRF protection and PKCE (Proof Key for Code Exchange) flow.
 *
 * Features:
 * - Cryptographically secure state generation
 * - PKCE code verifier/challenge generation (RFC 7636)
 * - Time-limited state storage with automatic cleanup
 * - Memory-based storage (suitable for single-instance deployments)
 */

import crypto from "crypto";

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
 * OAuth State Service
 *
 * Manages OAuth state parameters with automatic expiration.
 * Uses in-memory storage - for multi-instance deployments,
 * replace with Redis or database storage.
 */
class OAuthStateService {
  private states: Map<string, OAuthStateData> = new Map();
  private stats: OAuthStateStats = {
    activeStates: 0,
    totalGenerated: 0,
    totalConsumed: 0,
    totalExpired: 0,
  };

  // State TTL: 10 minutes (in milliseconds)
  private readonly STATE_TTL = 10 * 60 * 1000;

  // Cleanup interval: 1 minute
  private readonly CLEANUP_INTERVAL = 60 * 1000;

  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Start the automatic cleanup timer
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);

    // Don't prevent Node from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Remove expired states
   */
  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [state, data] of Array.from(this.states.entries())) {
      if (now - data.createdAt > this.STATE_TTL) {
        this.states.delete(state);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.stats.totalExpired += expiredCount;
      this.stats.activeStates = this.states.size;
      console.log(`[OAuthState] Cleaned up ${expiredCount} expired states`);
    }
  }

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
   * Store OAuth state data
   * @param state - The state parameter (key)
   * @param data - The state data to store
   */
  set(state: string, data: Omit<OAuthStateData, "createdAt">): void {
    this.states.set(state, {
      ...data,
      createdAt: Date.now(),
    });

    this.stats.totalGenerated++;
    this.stats.activeStates = this.states.size;

    console.log(`[OAuthState] Stored state for provider ${data.provider}`, {
      state: state.substring(0, 8) + "...",
      userId: data.userId,
      activeStates: this.stats.activeStates,
    });
  }

  /**
   * Retrieve OAuth state data without consuming it
   * @param state - The state parameter to look up
   * @returns The state data if found and not expired, null otherwise
   */
  get(state: string): OAuthStateData | null {
    const data = this.states.get(state);

    if (!data) {
      return null;
    }

    // Check if expired
    if (Date.now() - data.createdAt > this.STATE_TTL) {
      this.states.delete(state);
      this.stats.totalExpired++;
      this.stats.activeStates = this.states.size;
      return null;
    }

    return data;
  }

  /**
   * Consume (retrieve and delete) OAuth state data
   * This is a one-time use operation for security
   * @param state - The state parameter to consume
   * @returns The state data if found and not expired, null otherwise
   */
  consume(state: string): OAuthStateData | null {
    const data = this.get(state);

    if (data) {
      this.states.delete(state);
      this.stats.totalConsumed++;
      this.stats.activeStates = this.states.size;

      console.log(`[OAuthState] Consumed state for provider ${data.provider}`, {
        state: state.substring(0, 8) + "...",
        userId: data.userId,
        age: Date.now() - data.createdAt,
      });
    }

    return data;
  }

  /**
   * Check if a state exists and is valid
   * @param state - The state parameter to check
   * @returns True if the state exists and is not expired
   */
  has(state: string): boolean {
    return this.get(state) !== null;
  }

  /**
   * Delete a state (e.g., on error or cancellation)
   * @param state - The state parameter to delete
   * @returns True if the state was deleted, false if it didn't exist
   */
  delete(state: string): boolean {
    const existed = this.states.has(state);
    this.states.delete(state);

    if (existed) {
      this.stats.activeStates = this.states.size;
    }

    return existed;
  }

  /**
   * Get statistics about the state storage
   * @returns Current statistics
   */
  getStats(): OAuthStateStats {
    return {
      ...this.stats,
      activeStates: this.states.size,
    };
  }

  /**
   * Clear all states (for testing or shutdown)
   */
  clear(): void {
    this.states.clear();
    this.stats.activeStates = 0;
    console.log("[OAuthState] Cleared all states");
  }

  /**
   * Stop the cleanup timer (for graceful shutdown)
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Export singleton instance
export const oauthStateService = new OAuthStateService();

// Also export the class for testing
export { OAuthStateService };
