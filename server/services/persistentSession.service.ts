import { Stagehand } from "@browserbasehq/stagehand";
import { getDb } from "../db";
import { browserSessions } from "../../drizzle/schema";
import { eq, and, desc, isNull, gt } from "drizzle-orm";
import { browserbaseSDK } from "../_core/browserbaseSDK";

/**
 * Persistent Session Manager Service
 *
 * Manages browser sessions that persist across multiple requests/conversations.
 * Key features:
 * - Automatically reuses active sessions for users
 * - Maintains Stagehand instances in memory for quick reconnection
 * - Handles session lifecycle (create, resume, extend, close)
 * - Tracks session activity and extends timeouts
 */

interface StagehandInstance {
  stagehand: Stagehand;
  sessionId: string;
  userId: number;
  lastActivity: Date;
  expiresAt: Date;
}

interface SessionConfig {
  modelName?: string;
  modelApiKey?: string;
  geolocation?: {
    city?: string;
    state?: string;
    country?: string;
  };
  browserSettings?: {
    viewport?: { width: number; height: number };
    blockAds?: boolean;
    solveCaptchas?: boolean;
    advancedStealth?: boolean;
  };
  timeout?: number;
  keepAlive?: boolean;
  recordSession?: boolean;
}

interface PersistentSession {
  sessionId: string;
  stagehand: Stagehand;
  debugUrl?: string;
  liveViewUrl?: string;
  wsUrl?: string;
  isNew: boolean;
  expiresAt: Date;
}

class PersistentSessionManager {
  private static instance: PersistentSessionManager;

  // In-memory cache of active Stagehand instances
  private instances: Map<string, StagehandInstance> = new Map();

  // Map of userId -> sessionId for quick lookup of user's active session
  private userSessions: Map<number, string> = new Map();

  // Default session timeout (15 minutes)
  private defaultTimeout = 15 * 60 * 1000;

  // Session cleanup interval (check every 2 minutes)
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup interval
    this.startCleanupInterval();
  }

  public static getInstance(): PersistentSessionManager {
    if (!PersistentSessionManager.instance) {
      PersistentSessionManager.instance = new PersistentSessionManager();
    }
    return PersistentSessionManager.instance;
  }

  /**
   * Get or create a persistent session for a user
   * This is the main entry point for obtaining a browser session
   */
  public async getOrCreateSession(
    userId: number,
    config: SessionConfig = {}
  ): Promise<PersistentSession> {
    console.log(`[PersistentSession] Getting or creating session for user ${userId}`);

    // First, try to get existing active session from memory
    const existingSessionId = this.userSessions.get(userId);
    if (existingSessionId) {
      const instance = this.instances.get(existingSessionId);
      if (instance && instance.expiresAt > new Date()) {
        console.log(`[PersistentSession] Reusing in-memory session: ${existingSessionId}`);

        // Update last activity
        instance.lastActivity = new Date();

        // Get debug URLs
        let debugUrl: string | undefined;
        let liveViewUrl: string | undefined;
        let wsUrl: string | undefined;

        try {
          const debugInfo = await browserbaseSDK.getSessionDebug(existingSessionId);
          debugUrl = debugInfo.debuggerUrl;
          liveViewUrl = debugInfo.debuggerFullscreenUrl;
          wsUrl = debugInfo.wsUrl;
        } catch (error) {
          console.warn(`[PersistentSession] Failed to get debug info for session ${existingSessionId}:`, error);
        }

        return {
          sessionId: existingSessionId,
          stagehand: instance.stagehand,
          debugUrl,
          liveViewUrl,
          wsUrl,
          isNew: false,
          expiresAt: instance.expiresAt,
        };
      } else {
        // Session expired, clean it up
        console.log(`[PersistentSession] Session ${existingSessionId} expired, cleaning up`);
        await this.cleanupSession(existingSessionId);
      }
    }

    // Try to find active session in database
    const db = await getDb();
    if (db) {
      const activeSession = await db.query.browserSessions.findFirst({
        where: and(
          eq(browserSessions.userId, userId),
          eq(browserSessions.status, "active"),
          gt(browserSessions.expiresAt, new Date())
        ),
        orderBy: desc(browserSessions.createdAt),
      });

      if (activeSession) {
        console.log(`[PersistentSession] Found active session in database: ${activeSession.sessionId}`);

        // Try to resume the session
        try {
          const resumed = await this.resumeSession(activeSession.sessionId, userId, config);
          if (resumed) {
            return resumed;
          }
        } catch (error) {
          console.warn(`[PersistentSession] Failed to resume session ${activeSession.sessionId}:`, error);
          // Mark as failed and create new session
          await db.update(browserSessions)
            .set({ status: "failed", completedAt: new Date() })
            .where(eq(browserSessions.sessionId, activeSession.sessionId));
        }
      }
    }

    // Create new session
    console.log(`[PersistentSession] Creating new session for user ${userId}`);
    return this.createNewSession(userId, config);
  }

  /**
   * Resume an existing Browserbase session
   */
  private async resumeSession(
    sessionId: string,
    userId: number,
    config: SessionConfig
  ): Promise<PersistentSession | null> {
    console.log(`[PersistentSession] Attempting to resume session: ${sessionId}`);

    try {
      // Check if session is still active on Browserbase
      const debugInfo = await browserbaseSDK.getSessionDebug(sessionId);

      // Create Stagehand instance with existing session ID
      const stagehand = await this.createStagehandForSession(sessionId, config);

      const timeout = config.timeout || this.defaultTimeout;
      const expiresAt = new Date(Date.now() + timeout);

      // Store in memory
      this.instances.set(sessionId, {
        stagehand,
        sessionId,
        userId,
        lastActivity: new Date(),
        expiresAt,
      });
      this.userSessions.set(userId, sessionId);

      // Update database
      const db = await getDb();
      if (db) {
        await db.update(browserSessions)
          .set({
            status: "active",
            expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(browserSessions.sessionId, sessionId));
      }

      console.log(`[PersistentSession] Successfully resumed session: ${sessionId}`);

      return {
        sessionId,
        stagehand,
        debugUrl: debugInfo.debuggerUrl,
        liveViewUrl: debugInfo.debuggerFullscreenUrl,
        wsUrl: debugInfo.wsUrl,
        isNew: false,
        expiresAt,
      };
    } catch (error) {
      console.error(`[PersistentSession] Failed to resume session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Create a new browser session
   */
  private async createNewSession(
    userId: number,
    config: SessionConfig
  ): Promise<PersistentSession> {
    const timeout = config.timeout || this.defaultTimeout;

    // Normalize model name
    let modelId = config.modelName || "claude-3-7-sonnet-latest";
    if (!modelId.includes("/")) {
      if (modelId.includes("claude") || modelId.includes("anthropic")) {
        modelId = `anthropic/${modelId}`;
      } else if (modelId.includes("gemini") || modelId.includes("google")) {
        modelId = `google/${modelId}`;
      } else {
        modelId = `openai/${modelId}`;
      }
    }

    // Resolve model API key
    const modelApiKey = config.modelApiKey || this.resolveModelApiKey(modelId);

    // Create Stagehand with new session
    const stagehandConfig: any = {
      env: "BROWSERBASE",
      verbose: 1,
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      model: modelId,
      modelApiKey,
      browserbaseSessionCreateParams: {
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        proxies: config.geolocation ? true : false,
        region: "us-west-2",
        timeout: Math.ceil(timeout / 1000), // Convert to seconds
        keepAlive: config.keepAlive !== false,
        browserSettings: {
          advancedStealth: config.browserSettings?.advancedStealth || false,
          blockAds: config.browserSettings?.blockAds !== false,
          solveCaptchas: config.browserSettings?.solveCaptchas !== false,
          recordSession: config.recordSession !== false,
          viewport: config.browserSettings?.viewport || { width: 1920, height: 1080 },
        },
        userMetadata: {
          userId: `user-${userId}`,
          persistent: true,
          environment: process.env.NODE_ENV || "development",
        },
      },
    };

    console.log("[PersistentSession] Creating new Stagehand instance...");
    const stagehand = new Stagehand(stagehandConfig);
    await stagehand.init();

    const sessionId = stagehand.browserbaseSessionID!;
    console.log(`[PersistentSession] Created new session: ${sessionId}`);

    const expiresAt = new Date(Date.now() + timeout);

    // Store in memory
    this.instances.set(sessionId, {
      stagehand,
      sessionId,
      userId,
      lastActivity: new Date(),
      expiresAt,
    });
    this.userSessions.set(userId, sessionId);

    // Get debug URLs
    let debugUrl: string | undefined;
    let liveViewUrl: string | undefined;
    let wsUrl: string | undefined;

    try {
      const debugInfo = await browserbaseSDK.getSessionDebug(sessionId);
      debugUrl = debugInfo.debuggerUrl;
      liveViewUrl = debugInfo.debuggerFullscreenUrl;
      wsUrl = debugInfo.wsUrl;
    } catch (error) {
      console.warn(`[PersistentSession] Failed to get debug info:`, error);
    }

    // Store in database
    const db = await getDb();
    if (db) {
      await db.insert(browserSessions).values({
        userId,
        sessionId,
        status: "active",
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        debugUrl: liveViewUrl,
        expiresAt,
        metadata: {
          persistent: true,
          modelName: modelId,
          geolocation: config.geolocation || null,
          browserSettings: config.browserSettings || null,
          createdVia: "persistent-session-manager",
        },
      });
    }

    return {
      sessionId,
      stagehand,
      debugUrl,
      liveViewUrl,
      wsUrl,
      isNew: true,
      expiresAt,
    };
  }

  /**
   * Create a Stagehand instance for an existing session
   */
  private async createStagehandForSession(
    sessionId: string,
    config: SessionConfig
  ): Promise<Stagehand> {
    let modelId = config.modelName || "claude-3-7-sonnet-latest";
    if (!modelId.includes("/")) {
      if (modelId.includes("claude") || modelId.includes("anthropic")) {
        modelId = `anthropic/${modelId}`;
      } else if (modelId.includes("gemini") || modelId.includes("google")) {
        modelId = `google/${modelId}`;
      } else {
        modelId = `openai/${modelId}`;
      }
    }

    const modelApiKey = config.modelApiKey || this.resolveModelApiKey(modelId);

    const stagehand = new Stagehand({
      env: "BROWSERBASE",
      verbose: 1,
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      model: modelId,
      modelApiKey,
      browserbaseSessionID: sessionId,
    });

    await stagehand.init();
    return stagehand;
  }

  /**
   * Extend session timeout
   */
  public async extendSession(sessionId: string, additionalTime?: number): Promise<boolean> {
    const instance = this.instances.get(sessionId);
    if (!instance) {
      console.warn(`[PersistentSession] Session ${sessionId} not found in memory`);
      return false;
    }

    const extension = additionalTime || this.defaultTimeout;
    instance.expiresAt = new Date(Date.now() + extension);
    instance.lastActivity = new Date();

    // Update database
    const db = await getDb();
    if (db) {
      await db.update(browserSessions)
        .set({
          expiresAt: instance.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(browserSessions.sessionId, sessionId));
    }

    console.log(`[PersistentSession] Extended session ${sessionId} until ${instance.expiresAt.toISOString()}`);
    return true;
  }

  /**
   * Update session activity (call this on each operation)
   */
  public async updateActivity(sessionId: string): Promise<void> {
    const instance = this.instances.get(sessionId);
    if (instance) {
      instance.lastActivity = new Date();

      // Auto-extend if less than 5 minutes remaining
      const timeRemaining = instance.expiresAt.getTime() - Date.now();
      if (timeRemaining < 5 * 60 * 1000) {
        await this.extendSession(sessionId);
      }
    }
  }

  /**
   * Get active session for a user (without creating a new one)
   */
  public getActiveSession(userId: number): StagehandInstance | null {
    const sessionId = this.userSessions.get(userId);
    if (!sessionId) return null;

    const instance = this.instances.get(sessionId);
    if (!instance || instance.expiresAt <= new Date()) {
      return null;
    }

    return instance;
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): StagehandInstance | null {
    return this.instances.get(sessionId) || null;
  }

  /**
   * Close a specific session
   */
  public async closeSession(sessionId: string): Promise<void> {
    await this.cleanupSession(sessionId, "completed");
  }

  /**
   * Close all sessions for a user
   */
  public async closeUserSessions(userId: number): Promise<void> {
    const sessionId = this.userSessions.get(userId);
    if (sessionId) {
      await this.cleanupSession(sessionId, "completed");
    }
  }

  /**
   * Cleanup a session
   */
  private async cleanupSession(sessionId: string, status: string = "expired"): Promise<void> {
    console.log(`[PersistentSession] Cleaning up session: ${sessionId}`);

    const instance = this.instances.get(sessionId);
    if (instance) {
      // Close Stagehand
      try {
        await instance.stagehand.close();
      } catch (error) {
        console.error(`[PersistentSession] Error closing Stagehand for session ${sessionId}:`, error);
      }

      // Remove from memory
      this.instances.delete(sessionId);
      this.userSessions.delete(instance.userId);
    }

    // Update database
    const db = await getDb();
    if (db) {
      await db.update(browserSessions)
        .set({
          status,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(browserSessions.sessionId, sessionId));
    }
  }

  /**
   * Start the cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(async () => {
      const now = new Date();
      const expiredSessions: string[] = [];

      for (const [sessionId, instance] of this.instances) {
        if (instance.expiresAt <= now) {
          expiredSessions.push(sessionId);
        }
      }

      for (const sessionId of expiredSessions) {
        await this.cleanupSession(sessionId, "expired");
      }

      if (expiredSessions.length > 0) {
        console.log(`[PersistentSession] Cleaned up ${expiredSessions.length} expired sessions`);
      }
    }, 2 * 60 * 1000); // Check every 2 minutes
  }

  /**
   * Stop the cleanup interval
   */
  public stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get stats about active sessions
   */
  public getStats(): { totalSessions: number; activeUsers: number } {
    return {
      totalSessions: this.instances.size,
      activeUsers: this.userSessions.size,
    };
  }

  /**
   * Resolve model API key
   */
  private resolveModelApiKey(modelName: string): string {
    const isGoogleModel = modelName.includes("google") || modelName.includes("gemini");
    const isAnthropicModel = modelName.includes("anthropic") || modelName.includes("claude");

    if (isAnthropicModel) {
      return process.env.ANTHROPIC_API_KEY || "";
    } else if (isGoogleModel) {
      return process.env.GEMINI_API_KEY || "";
    }
    return process.env.OPENAI_API_KEY || "";
  }
}

// Export singleton instance
export const persistentSessionManager = PersistentSessionManager.getInstance();

// Export class for testing
export { PersistentSessionManager };
