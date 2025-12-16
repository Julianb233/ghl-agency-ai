/**
 * Checkpoint Service
 * Handles execution checkpointing and resumption for browser agent executions
 * Enables recovery from errors and continuation of long-running tasks
 */

import { getDb } from "../../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { executionCheckpoints } from "../../../drizzle/schema-memory";
import type {
  ExecutionCheckpoint,
  InsertExecutionCheckpoint,
} from "../../../drizzle/schema-memory";
import { v4 as uuidv4 } from "uuid";

export interface CheckpointOptions {
  executionId: number;
  userId: number;
  phaseId?: number;
  phaseName?: string;
  stepIndex?: number;
  completedSteps?: string[];
  completedPhases?: number[];
  partialResults?: Record<string, any>;
  extractedData?: Record<string, any>;
  sessionState?: SessionState;
  browserContext?: BrowserContext;
  errorInfo?: ErrorInfo;
  checkpointReason?: 'error' | 'manual' | 'auto' | 'phase_complete';
  ttlSeconds?: number; // Time to live in seconds
}

export interface SessionState {
  url?: string | null;
  cookies?: any[];
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
  authenticatedAs?: string | null;
}

export interface BrowserContext {
  pageState?: any;
  domSnapshot?: any;
  screenshotUrl?: string | null;
}

export interface ErrorInfo {
  error: string;
  message: string;
  stack?: string;
  timestamp: Date;
  retryable: boolean;
}

export interface ResumeResult {
  checkpoint: ExecutionCheckpoint;
  canResume: boolean;
  resumeFromStep: number;
  nextPhaseId?: number;
  context: {
    partialResults: Record<string, any>;
    extractedData: Record<string, any>;
    sessionState: SessionState;
  };
}

/**
 * Checkpoint Service for execution state management
 */
export class CheckpointService {
  private checkpointCache: Map<string, ExecutionCheckpoint>;
  private cacheMaxSize: number;

  constructor(options: { cacheMaxSize?: number } = {}) {
    this.checkpointCache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || 100;
  }

  /**
   * Create a checkpoint for an execution
   */
  async createCheckpoint(options: CheckpointOptions): Promise<string> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const checkpointId = uuidv4();
    const now = new Date();
    const expiresAt = options.ttlSeconds
      ? new Date(now.getTime() + options.ttlSeconds * 1000)
      : new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default 24 hours

    const checkpoint: InsertExecutionCheckpoint = {
      checkpointId,
      executionId: options.executionId,
      userId: options.userId,
      phaseId: options.phaseId ?? null,
      phaseName: options.phaseName ?? null,
      stepIndex: options.stepIndex ?? 0,
      completedSteps: (options.completedSteps ?? []) as any,
      completedPhases: (options.completedPhases ?? []) as any,
      partialResults: (options.partialResults ?? {}) as any,
      extractedData: (options.extractedData ?? {}) as any,
      sessionState: (options.sessionState ?? {
        url: null,
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        authenticatedAs: null,
      }) as any,
      browserContext: (options.browserContext ?? {
        pageState: null,
        domSnapshot: null,
        screenshotUrl: null,
      }) as any,
      errorInfo: options.errorInfo ? (options.errorInfo as any) : null,
      checkpointReason: options.checkpointReason ?? 'auto',
      canResume: true,
      resumeCount: 0,
      createdAt: now,
      expiresAt,
    };

    await db.insert(executionCheckpoints).values(checkpoint);

    // Cache the checkpoint
    const fullCheckpoint = { ...checkpoint, id: 0 } as ExecutionCheckpoint; // ID will be set by DB
    this.addToCache(checkpointId, fullCheckpoint);

    console.log(`[Checkpoint] Created checkpoint ${checkpointId} for execution ${options.executionId}`);

    return checkpointId;
  }

  /**
   * Load a checkpoint by ID
   */
  async loadCheckpoint(checkpointId: string): Promise<ExecutionCheckpoint | null> {
    // Check cache first
    const cached = this.checkpointCache.get(checkpointId);
    if (cached) {
      return cached;
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const results = await db
      .select()
      .from(executionCheckpoints)
      .where(
        and(
          eq(executionCheckpoints.checkpointId, checkpointId),
          eq(executionCheckpoints.canResume, true)
        )
      )
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const checkpoint = results[0] as ExecutionCheckpoint;

    // Check if expired
    if (checkpoint.expiresAt && checkpoint.expiresAt.getTime() < Date.now()) {
      console.warn(`[Checkpoint] Checkpoint ${checkpointId} has expired`);
      return null;
    }

    this.addToCache(checkpointId, checkpoint);
    return checkpoint;
  }

  /**
   * Get latest checkpoint for an execution
   */
  async getLatestCheckpoint(executionId: number): Promise<ExecutionCheckpoint | null> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const results = await db
      .select()
      .from(executionCheckpoints)
      .where(
        and(
          eq(executionCheckpoints.executionId, executionId),
          eq(executionCheckpoints.canResume, true)
        )
      )
      .orderBy(desc(executionCheckpoints.createdAt))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return results[0] as ExecutionCheckpoint;
  }

  /**
   * Get all checkpoints for an execution
   */
  async getCheckpointsForExecution(executionId: number): Promise<ExecutionCheckpoint[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const results = await db
      .select()
      .from(executionCheckpoints)
      .where(eq(executionCheckpoints.executionId, executionId))
      .orderBy(desc(executionCheckpoints.createdAt));

    return results as ExecutionCheckpoint[];
  }

  /**
   * Get checkpoints for a user
   */
  async getCheckpointsForUser(
    userId: number,
    options: { limit?: number; includeExpired?: boolean } = {}
  ): Promise<ExecutionCheckpoint[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const conditions = [eq(executionCheckpoints.userId, userId)];

    if (!options.includeExpired) {
      conditions.push(
        sql`(${executionCheckpoints.expiresAt} IS NULL OR ${executionCheckpoints.expiresAt} > NOW())`
      );
    }

    const results = await db
      .select()
      .from(executionCheckpoints)
      .where(and(...conditions))
      .orderBy(desc(executionCheckpoints.createdAt))
      .limit(options.limit ?? 50);

    return results as ExecutionCheckpoint[];
  }

  /**
   * Resume from checkpoint
   * Increments resume count and returns resume context
   */
  async resumeFromCheckpoint(checkpointId: string): Promise<ResumeResult | null> {
    const checkpoint = await this.loadCheckpoint(checkpointId);

    if (!checkpoint || !checkpoint.canResume) {
      return null;
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Increment resume count
    await db
      .update(executionCheckpoints)
      .set({
        resumeCount: checkpoint.resumeCount + 1,
      })
      .where(eq(executionCheckpoints.checkpointId, checkpointId));

    // Prepare resume context
    const resumeResult: ResumeResult = {
      checkpoint,
      canResume: true,
      resumeFromStep: checkpoint.stepIndex,
      nextPhaseId: checkpoint.phaseId ?? undefined,
      context: {
        partialResults: (checkpoint.partialResults as Record<string, any>) ?? {},
        extractedData: (checkpoint.extractedData as Record<string, any>) ?? {},
        sessionState: (checkpoint.sessionState as SessionState) ?? {
          url: null,
          cookies: [],
          localStorage: {},
          sessionStorage: {},
          authenticatedAs: null,
        },
      },
    };

    console.log(
      `[Checkpoint] Resuming from checkpoint ${checkpointId} (resume count: ${checkpoint.resumeCount + 1})`
    );

    return resumeResult;
  }

  /**
   * Mark checkpoint as non-resumable
   */
  async invalidateCheckpoint(checkpointId: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    await db
      .update(executionCheckpoints)
      .set({ canResume: false })
      .where(eq(executionCheckpoints.checkpointId, checkpointId));

    this.checkpointCache.delete(checkpointId);
  }

  /**
   * Invalidate all checkpoints for an execution
   * Called when execution completes successfully
   */
  async invalidateExecutionCheckpoints(executionId: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    await db
      .update(executionCheckpoints)
      .set({ canResume: false })
      .where(eq(executionCheckpoints.executionId, executionId));

    // Clear from cache
    const entries = Array.from(this.checkpointCache.entries());
    for (const [key, checkpoint] of entries) {
      if (checkpoint.executionId === executionId) {
        this.checkpointCache.delete(key);
      }
    }
  }

  /**
   * Update checkpoint with new state
   * Useful for updating partial results during execution
   */
  async updateCheckpoint(
    checkpointId: string,
    updates: {
      stepIndex?: number;
      completedSteps?: string[];
      partialResults?: Record<string, any>;
      extractedData?: Record<string, any>;
      sessionState?: SessionState;
      browserContext?: BrowserContext;
    }
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const updateData: any = {};

    if (updates.stepIndex !== undefined) {
      updateData.stepIndex = updates.stepIndex;
    }
    if (updates.completedSteps) {
      updateData.completedSteps = updates.completedSteps as any;
    }
    if (updates.partialResults) {
      updateData.partialResults = updates.partialResults as any;
    }
    if (updates.extractedData) {
      updateData.extractedData = updates.extractedData as any;
    }
    if (updates.sessionState) {
      updateData.sessionState = updates.sessionState as any;
    }
    if (updates.browserContext) {
      updateData.browserContext = updates.browserContext as any;
    }

    await db
      .update(executionCheckpoints)
      .set(updateData)
      .where(eq(executionCheckpoints.checkpointId, checkpointId));

    // Invalidate cache
    this.checkpointCache.delete(checkpointId);
  }

  /**
   * Clean up expired checkpoints
   */
  async cleanupExpiredCheckpoints(): Promise<number> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .delete(executionCheckpoints)
      .where(
        and(
          sql`${executionCheckpoints.expiresAt} IS NOT NULL`,
          sql`${executionCheckpoints.expiresAt} <= NOW()`
        )
      );

    // Clear cache
    this.checkpointCache.clear();

    const deletedCount = result.rowCount ?? 0;
    console.log(`[Checkpoint] Cleaned up ${deletedCount} expired checkpoints`);

    return deletedCount;
  }

  /**
   * Get checkpoint statistics for a user
   */
  async getCheckpointStats(userId: number): Promise<{
    totalCheckpoints: number;
    resumableCheckpoints: number;
    avgResumeCount: number;
    errorCheckpoints: number;
  }> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(executionCheckpoints)
      .where(eq(executionCheckpoints.userId, userId));

    const resumableResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(executionCheckpoints)
      .where(
        and(
          eq(executionCheckpoints.userId, userId),
          eq(executionCheckpoints.canResume, true)
        )
      );

    const avgResumeResult = await db
      .select({ avg: sql<number>`avg(${executionCheckpoints.resumeCount})` })
      .from(executionCheckpoints)
      .where(eq(executionCheckpoints.userId, userId));

    const errorResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(executionCheckpoints)
      .where(
        and(
          eq(executionCheckpoints.userId, userId),
          eq(executionCheckpoints.checkpointReason, 'error')
        )
      );

    return {
      totalCheckpoints: totalResult[0]?.count ?? 0,
      resumableCheckpoints: resumableResult[0]?.count ?? 0,
      avgResumeCount: avgResumeResult[0]?.avg ?? 0,
      errorCheckpoints: errorResult[0]?.count ?? 0,
    };
  }

  /**
   * Add checkpoint to cache with LRU eviction
   */
  private addToCache(checkpointId: string, checkpoint: ExecutionCheckpoint): void {
    if (this.checkpointCache.size >= this.cacheMaxSize) {
      const firstKey = this.checkpointCache.keys().next().value;
      if (firstKey) {
        this.checkpointCache.delete(firstKey);
      }
    }

    this.checkpointCache.set(checkpointId, checkpoint);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.checkpointCache.clear();
  }
}

// Export singleton instance
let checkpointServiceInstance: CheckpointService | null = null;

export function getCheckpointService(): CheckpointService {
  if (!checkpointServiceInstance) {
    checkpointServiceInstance = new CheckpointService();
  }
  return checkpointServiceInstance;
}
