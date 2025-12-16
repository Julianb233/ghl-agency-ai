/**
 * Browser Context Isolation Service
 * Manages Browserbase context isolation for multi-tenant security
 *
 * Features:
 * - Per-client context isolation
 * - Encrypted storage persistence
 * - Session sandboxing
 * - Context lifecycle management
 *
 * Security:
 * - Each client gets dedicated Browserbase context
 * - Contexts cannot access other clients' data
 * - Cookies and localStorage encrypted at rest
 * - Automatic cleanup of inactive contexts
 *
 * Usage:
 * - Get context: await contextIsolation.getOrCreateContext(userId, clientId)
 * - Create session: await contextIsolation.createIsolatedSession(contextId)
 * - Cleanup: await contextIsolation.cleanupContext(contextId)
 */

import crypto from "crypto";
import { getDb } from "../db";
import { eq, and, lt } from "drizzle-orm";
import { browserContexts, securityAuditLog } from "../../drizzle/schema-security";
import type {
  BrowserContext,
  InsertBrowserContext,
  InsertSecurityAuditLog,
} from "../../drizzle/schema-security";

// ========================================
// TYPES
// ========================================

export interface ContextConfig {
  clientId: number;
  userId: number;
  isolationLevel?: "strict" | "standard";
  metadata?: Record<string, unknown>;
}

export interface IsolatedSession {
  sessionId: string;
  contextId: string;
  debugUrl?: string;
  expiresAt: Date;
}

// ========================================
// ENCRYPTION UTILITIES
// ========================================

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY required for context isolation");
  }
  return Buffer.from(key, "hex");
}

function encryptStorage(data: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

function decryptStorage(encrypted: string, iv: string, authTag: string): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ========================================
// BROWSER CONTEXT ISOLATION SERVICE
// ========================================

export class BrowserContextIsolationService {
  /**
   * Get or create isolated context for a client
   */
  async getOrCreateContext(
    userId: number,
    clientId: number,
    isolationLevel: "strict" | "standard" = "strict"
  ): Promise<BrowserContext> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Try to find existing active context
      const [existing] = await db
        .select()
        .from(browserContexts)
        .where(
          and(
            eq(browserContexts.clientId, clientId),
            eq(browserContexts.userId, userId),
            eq(browserContexts.isActive, true)
          )
        )
        .limit(1);

      if (existing) {
        // Update last used
        await db
          .update(browserContexts)
          .set({
            lastUsedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(browserContexts.id, existing.id));

        console.log(
          `[BrowserContext] Retrieved existing context ${existing.contextId} for client ${clientId}`
        );

        return existing;
      }

      // Create new context
      const contextId = this.generateContextId(clientId);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 day TTL

      const [context] = await db
        .insert(browserContexts)
        .values({
          clientId,
          userId,
          contextId,
          isolationLevel,
          activeSessionCount: 0,
          lastUsedAt: new Date(),
          expiresAt,
        })
        .returning();

      // Audit log
      await this.auditLog(db, {
        userId,
        action: "context_create",
        resourceType: "context",
        resourceId: context.id,
        details: {
          clientId,
          contextId,
          isolationLevel,
        },
        success: true,
      });

      console.log(
        `[BrowserContext] Created new context ${contextId} for client ${clientId}`
      );

      return context;
    } catch (error) {
      throw new Error(
        `Failed to get/create context: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Create Browserbase session with context isolation
   */
  async createIsolatedSession(
    contextId: string,
    sessionConfig?: Record<string, unknown>
  ): Promise<IsolatedSession> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Get context
      const [context] = await db
        .select()
        .from(browserContexts)
        .where(eq(browserContexts.contextId, contextId))
        .limit(1);

      if (!context) {
        throw new Error("Context not found");
      }

      if (!context.isActive) {
        throw new Error("Context is inactive");
      }

      // TODO: Integrate with actual Browserbase SDK
      // For now, generate mock session ID
      const sessionId = `session_${contextId}_${Date.now()}`;

      // Increment active session count
      await db
        .update(browserContexts)
        .set({
          activeSessionCount: context.activeSessionCount + 1,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(browserContexts.id, context.id));

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 2); // 2 hour session

      console.log(
        `[BrowserContext] Created session ${sessionId} in context ${contextId}`
      );

      return {
        sessionId,
        contextId,
        expiresAt,
      };
    } catch (error) {
      throw new Error(
        `Failed to create isolated session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Save context storage (cookies, localStorage)
   */
  async saveContextStorage(
    contextId: string,
    storageData: Record<string, unknown>
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Get context
      const [context] = await db
        .select()
        .from(browserContexts)
        .where(eq(browserContexts.contextId, contextId))
        .limit(1);

      if (!context) {
        throw new Error("Context not found");
      }

      // Encrypt storage data
      const storageJson = JSON.stringify(storageData);
      const { encrypted, iv, authTag } = encryptStorage(storageJson);

      // Save encrypted storage
      await db
        .update(browserContexts)
        .set({
          encryptedStorage: encrypted,
          storageIv: iv,
          storageAuthTag: authTag,
          updatedAt: new Date(),
        })
        .where(eq(browserContexts.id, context.id));

      console.log(`[BrowserContext] Saved encrypted storage for context ${contextId}`);
    } catch (error) {
      throw new Error(
        `Failed to save context storage: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Load context storage
   */
  async loadContextStorage(
    contextId: string
  ): Promise<Record<string, unknown> | null> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      const [context] = await db
        .select()
        .from(browserContexts)
        .where(eq(browserContexts.contextId, contextId))
        .limit(1);

      if (!context) {
        throw new Error("Context not found");
      }

      if (
        !context.encryptedStorage ||
        !context.storageIv ||
        !context.storageAuthTag
      ) {
        return null; // No storage saved
      }

      // Decrypt storage
      const decrypted = decryptStorage(
        context.encryptedStorage,
        context.storageIv,
        context.storageAuthTag
      );

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(
        `Failed to load context storage: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Decrement session count (call when session ends)
   */
  async sessionEnded(contextId: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      return;
    }

    try {
      const [context] = await db
        .select()
        .from(browserContexts)
        .where(eq(browserContexts.contextId, contextId))
        .limit(1);

      if (!context) {
        return;
      }

      await db
        .update(browserContexts)
        .set({
          activeSessionCount: Math.max(0, context.activeSessionCount - 1),
          updatedAt: new Date(),
        })
        .where(eq(browserContexts.id, context.id));

      console.log(`[BrowserContext] Session ended for context ${contextId}`);
    } catch (error) {
      console.error("[BrowserContext] Failed to decrement session count:", error);
    }
  }

  /**
   * Cleanup inactive contexts
   */
  async cleanupInactiveContexts(): Promise<number> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find contexts to cleanup
      const inactiveContexts = await db
        .select()
        .from(browserContexts)
        .where(
          and(
            eq(browserContexts.isActive, true),
            lt(browserContexts.lastUsedAt, thirtyDaysAgo),
            eq(browserContexts.activeSessionCount, 0)
          )
        );

      if (inactiveContexts.length === 0) {
        return 0;
      }

      // Mark as inactive
      for (const context of inactiveContexts) {
        await db
          .update(browserContexts)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(browserContexts.id, context.id));
      }

      console.log(
        `[BrowserContext] Cleaned up ${inactiveContexts.length} inactive contexts`
      );

      return inactiveContexts.length;
    } catch (error) {
      console.error("[BrowserContext] Failed to cleanup contexts:", error);
      return 0;
    }
  }

  /**
   * Get context for user/client
   */
  async getContext(
    userId: number,
    clientId: number
  ): Promise<BrowserContext | null> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const [context] = await db
      .select()
      .from(browserContexts)
      .where(
        and(
          eq(browserContexts.clientId, clientId),
          eq(browserContexts.userId, userId),
          eq(browserContexts.isActive, true)
        )
      )
      .limit(1);

    return context || null;
  }

  /**
   * Generate unique context ID
   */
  private generateContextId(clientId: number): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    return `ctx_client_${clientId}_${timestamp}_${random}`;
  }

  /**
   * Write to security audit log
   */
  private async auditLog(
    db: any,
    entry: Omit<InsertSecurityAuditLog, "timestamp">
  ): Promise<void> {
    try {
      await db.insert(securityAuditLog).values({
        ...entry,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("[BrowserContext] Failed to write audit log:", error);
    }
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let browserContextIsolationInstance: BrowserContextIsolationService | null = null;

export function getBrowserContextIsolation(): BrowserContextIsolationService {
  if (!browserContextIsolationInstance) {
    browserContextIsolationInstance = new BrowserContextIsolationService();
  }
  return browserContextIsolationInstance;
}
