/**
 * User Memory Service
 * Manages long-term user memory, preferences, and learned patterns
 * Extends the agent memory system with persistent user-specific learning
 */

import { getDb } from "../../db";
import { eq, and, sql } from "drizzle-orm";
import { userMemory, taskSuccessPatterns, userFeedback, workflowPatterns } from "../../../drizzle/schema-memory";
import type {
  UserMemory,
  InsertUserMemory,
  TaskSuccessPattern,
  InsertTaskSuccessPattern,
  UserFeedback as UserFeedbackType,
  InsertUserFeedback,
} from "../../../drizzle/schema-memory";
import { v4 as uuidv4 } from "uuid";

export interface UserPreferences {
  actionSpeed: 'fast' | 'normal' | 'careful';
  approvalRequired: boolean;
  favoriteStrategies: string[];
  autoApprovePatterns: string[]; // Task patterns that user consistently approves
  defaultTimeout: number;
  maxRetries: number;
}

export interface TaskHistoryEntry {
  taskType: string;
  executionId: number;
  timestamp: Date;
  success: boolean;
  executionTime: number;
  approach: string;
}

export interface LearnedPatterns {
  ghlSelectors: Record<string, string>; // Cached selectors by element type
  commonWorkflows: WorkflowPattern[];
  errorRecovery: ErrorRecoveryPattern[];
  customCommands: CustomCommand[];
}

export interface WorkflowPattern {
  name: string;
  steps: any[];
  successRate: number;
  avgTime: number;
}

export interface ErrorRecoveryPattern {
  errorType: string;
  recoverySteps: any[];
  successRate: number;
}

export interface CustomCommand {
  trigger: string;
  description: string;
  workflow: any[];
}

export interface UserStats {
  totalExecutions: number;
  successfulExecutions: number;
  avgExecutionTime: number;
  mostUsedTasks: Record<string, number>;
  preferredApproaches: Record<string, string>;
}

/**
 * User Memory Service - Persistent user learning and preferences
 */
export class UserMemoryService {
  private memoryCache: Map<number, UserMemory>;
  private cacheMaxSize: number;

  constructor(options: { cacheMaxSize?: number } = {}) {
    this.memoryCache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || 1000;
  }

  /**
   * Get or create user memory
   */
  async getUserMemory(userId: number): Promise<UserMemory> {
    // Check cache first
    const cached = this.memoryCache.get(userId);
    if (cached) {
      return cached;
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Try to get existing memory
    const results = await db
      .select()
      .from(userMemory)
      .where(eq(userMemory.userId, userId))
      .limit(1);

    if (results.length > 0) {
      const memory = results[0] as UserMemory;
      this.addToCache(userId, memory);
      return memory;
    }

    // Create new memory
    const now = new Date();
    const defaultMemory: InsertUserMemory = {
      userId,
      preferences: {
        actionSpeed: 'normal',
        approvalRequired: true,
        favoriteStrategies: [],
        autoApprovePatterns: [],
        defaultTimeout: 30000,
        maxRetries: 3,
      } as any,
      taskHistory: [] as any,
      learnedPatterns: {
        ghlSelectors: {},
        commonWorkflows: [],
        errorRecovery: [],
        customCommands: [],
      } as any,
      userCorrections: [] as any,
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        avgExecutionTime: 0,
        mostUsedTasks: {},
        preferredApproaches: {},
      } as any,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
    };

    const inserted = await db.insert(userMemory).values(defaultMemory).returning();
    const memory = inserted[0] as UserMemory;
    this.addToCache(userId, memory);

    return memory;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: number,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const currentMemory = await this.getUserMemory(userId);
    const currentPrefs = (currentMemory.preferences as any) ?? {};

    const updatedPrefs = {
      ...currentPrefs,
      ...preferences,
    };

    await db
      .update(userMemory)
      .set({
        preferences: updatedPrefs as any,
        updatedAt: new Date(),
      })
      .where(eq(userMemory.userId, userId));

    // Invalidate cache
    this.memoryCache.delete(userId);
  }

  /**
   * Add task to history
   */
  async addTaskHistory(
    userId: number,
    historyEntry: TaskHistoryEntry
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const currentMemory = await this.getUserMemory(userId);
    const history = (currentMemory.taskHistory as any[]) ?? [];

    // Keep last 100 entries
    const updatedHistory = [historyEntry, ...history].slice(0, 100);

    // Update stats
    const stats = (currentMemory.stats as any) ?? {};
    const totalExecutions = (stats.totalExecutions ?? 0) + 1;
    const successfulExecutions = historyEntry.success
      ? (stats.successfulExecutions ?? 0) + 1
      : (stats.successfulExecutions ?? 0);

    const mostUsedTasks = stats.mostUsedTasks ?? {};
    mostUsedTasks[historyEntry.taskType] = (mostUsedTasks[historyEntry.taskType] ?? 0) + 1;

    const preferredApproaches = stats.preferredApproaches ?? {};
    if (historyEntry.success) {
      preferredApproaches[historyEntry.taskType] = historyEntry.approach;
    }

    // Calculate new average execution time
    const currentAvg = stats.avgExecutionTime ?? 0;
    const newAvg = ((currentAvg * (totalExecutions - 1)) + historyEntry.executionTime) / totalExecutions;

    const updatedStats = {
      totalExecutions,
      successfulExecutions,
      avgExecutionTime: newAvg,
      mostUsedTasks,
      preferredApproaches,
    };

    await db
      .update(userMemory)
      .set({
        taskHistory: updatedHistory as any,
        stats: updatedStats as any,
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
      })
      .where(eq(userMemory.userId, userId));

    // Invalidate cache
    this.memoryCache.delete(userId);
  }

  /**
   * Learn a GHL selector
   */
  async learnSelector(
    userId: number,
    elementType: string,
    selector: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const currentMemory = await this.getUserMemory(userId);
    const patterns = (currentMemory.learnedPatterns as any) ?? {};
    const selectors = patterns.ghlSelectors ?? {};

    selectors[elementType] = selector;

    const updatedPatterns = {
      ...patterns,
      ghlSelectors: selectors,
    };

    await db
      .update(userMemory)
      .set({
        learnedPatterns: updatedPatterns as any,
        updatedAt: new Date(),
      })
      .where(eq(userMemory.userId, userId));

    // Invalidate cache
    this.memoryCache.delete(userId);
  }

  /**
   * Get learned selector
   */
  async getSelector(userId: number, elementType: string): Promise<string | null> {
    const memory = await this.getUserMemory(userId);
    const patterns = (memory.learnedPatterns as any) ?? {};
    const selectors = patterns.ghlSelectors ?? {};
    return selectors[elementType] ?? null;
  }

  /**
   * Record user correction
   */
  async recordCorrection(
    userId: number,
    correction: {
      executionId: number;
      originalAction: any;
      correctedAction: any;
      context: any;
    }
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const currentMemory = await this.getUserMemory(userId);
    const corrections = (currentMemory.userCorrections as any[]) ?? [];

    // Keep last 50 corrections
    const updatedCorrections = [
      {
        ...correction,
        timestamp: new Date(),
      },
      ...corrections,
    ].slice(0, 50);

    await db
      .update(userMemory)
      .set({
        userCorrections: updatedCorrections as any,
        updatedAt: new Date(),
      })
      .where(eq(userMemory.userId, userId));

    // Invalidate cache
    this.memoryCache.delete(userId);

    // Also store in user_feedback table
    await this.recordUserFeedback({
      userId,
      executionId: correction.executionId,
      feedbackType: 'correction',
      originalAction: correction.originalAction,
      correctedAction: correction.correctedAction,
      context: correction.context,
      sentiment: 'negative',
      impact: 'important',
    });
  }

  /**
   * Record user feedback
   */
  async recordUserFeedback(feedback: {
    userId: number;
    executionId?: number;
    feedbackType: 'correction' | 'approval' | 'rejection' | 'suggestion';
    originalAction: any;
    correctedAction?: any;
    context?: any;
    sentiment?: 'positive' | 'negative' | 'neutral';
    impact?: 'critical' | 'important' | 'minor';
  }): Promise<string> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const feedbackId = uuidv4();
    const now = new Date();

    const feedbackEntry: InsertUserFeedback = {
      feedbackId,
      userId: feedback.userId,
      executionId: feedback.executionId ?? null,
      feedbackType: feedback.feedbackType,
      originalAction: feedback.originalAction as any,
      correctedAction: feedback.correctedAction ? (feedback.correctedAction as any) : null,
      context: (feedback.context ?? {}) as any,
      sentiment: feedback.sentiment ?? 'neutral',
      impact: feedback.impact ?? 'minor',
      processed: false,
      appliedToPattern: false,
      createdAt: now,
    };

    await db.insert(userFeedback).values(feedbackEntry);

    console.log(`[UserMemory] Recorded feedback ${feedbackId} for user ${feedback.userId}`);

    return feedbackId;
  }

  /**
   * Get unprocessed feedback
   */
  async getUnprocessedFeedback(userId?: number): Promise<UserFeedbackType[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const conditions = [eq(userFeedback.processed, false)];

    if (userId) {
      conditions.push(eq(userFeedback.userId, userId));
    }

    const results = await db
      .select()
      .from(userFeedback)
      .where(and(...conditions))
      .limit(100);

    return results as UserFeedbackType[];
  }

  /**
   * Mark feedback as processed
   */
  async markFeedbackProcessed(
    feedbackId: string,
    appliedToPattern: boolean = false
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    await db
      .update(userFeedback)
      .set({
        processed: true,
        appliedToPattern,
      })
      .where(eq(userFeedback.feedbackId, feedbackId));
  }

  /**
   * Store successful task pattern
   */
  async storeTaskPattern(
    userId: number,
    pattern: {
      taskType: string;
      taskName?: string;
      successfulApproach: any;
      selectors?: Record<string, string>;
      workflow?: any[];
      contextConditions?: any;
      avgExecutionTime?: number;
      reasoningPatternId?: string;
    }
  ): Promise<string> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const patternId = uuidv4();
    const now = new Date();

    const taskPattern: InsertTaskSuccessPattern = {
      patternId,
      userId,
      taskType: pattern.taskType,
      taskName: pattern.taskName ?? null,
      successfulApproach: pattern.successfulApproach as any,
      selectors: (pattern.selectors ?? {}) as any,
      workflow: (pattern.workflow ?? []) as any,
      contextConditions: (pattern.contextConditions ?? {}) as any,
      requiredState: {} as any,
      avgExecutionTime: pattern.avgExecutionTime ?? null,
      successRate: 1.0,
      usageCount: 1,
      confidence: 0.8,
      adaptations: [] as any,
      reasoningPatternId: pattern.reasoningPatternId ?? null,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
    };

    await db.insert(taskSuccessPatterns).values(taskPattern);

    console.log(`[UserMemory] Stored task pattern ${patternId} for task type: ${pattern.taskType}`);

    return patternId;
  }

  /**
   * Find similar task patterns
   */
  async findSimilarTaskPatterns(
    userId: number,
    taskType: string,
    options: { minConfidence?: number; limit?: number } = {}
  ): Promise<TaskSuccessPattern[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const conditions = [
      eq(taskSuccessPatterns.userId, userId),
      eq(taskSuccessPatterns.taskType, taskType),
    ];

    if (options.minConfidence) {
      conditions.push(sql`${taskSuccessPatterns.confidence} >= ${options.minConfidence}`);
    }

    const results = await db
      .select()
      .from(taskSuccessPatterns)
      .where(and(...conditions))
      .orderBy(sql`${taskSuccessPatterns.successRate} DESC, ${taskSuccessPatterns.usageCount} DESC`)
      .limit(options.limit ?? 5);

    return results as TaskSuccessPattern[];
  }

  /**
   * Update task pattern usage
   */
  async updateTaskPatternUsage(
    patternId: string,
    success: boolean,
    executionTime?: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Get current pattern
    const patterns = await db
      .select()
      .from(taskSuccessPatterns)
      .where(eq(taskSuccessPatterns.patternId, patternId))
      .limit(1);

    if (patterns.length === 0) {
      return;
    }

    const pattern = patterns[0];
    const newUsageCount = pattern.usageCount + 1;

    // Calculate new success rate
    const successCount = Math.round(pattern.successRate * pattern.usageCount) + (success ? 1 : 0);
    const newSuccessRate = successCount / newUsageCount;

    // Calculate new confidence
    const newConfidence = Math.min(1.0, Math.max(0.1, newSuccessRate * 0.9 + pattern.confidence * 0.1));

    // Calculate new avg execution time
    let newAvgTime = pattern.avgExecutionTime;
    if (executionTime && pattern.avgExecutionTime) {
      newAvgTime = ((pattern.avgExecutionTime * pattern.usageCount) + executionTime) / newUsageCount;
    } else if (executionTime) {
      newAvgTime = executionTime;
    }

    await db
      .update(taskSuccessPatterns)
      .set({
        usageCount: newUsageCount,
        successRate: newSuccessRate,
        confidence: newConfidence,
        avgExecutionTime: newAvgTime,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(taskSuccessPatterns.patternId, patternId));

    console.log(
      `[UserMemory] Updated pattern ${patternId}: usage=${newUsageCount}, success=${newSuccessRate.toFixed(2)}, confidence=${newConfidence.toFixed(2)}`
    );
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: number): Promise<UserStats> {
    const memory = await this.getUserMemory(userId);
    return (memory.stats as any) ?? {
      totalExecutions: 0,
      successfulExecutions: 0,
      avgExecutionTime: 0,
      mostUsedTasks: {},
      preferredApproaches: {},
    };
  }

  /**
   * Check if task should auto-approve
   * Based on user's approval patterns
   */
  async shouldAutoApprove(userId: number, taskType: string): Promise<boolean> {
    const memory = await this.getUserMemory(userId);
    const prefs = (memory.preferences as any) ?? {};

    if (!prefs.approvalRequired) {
      return true; // User disabled approval globally
    }

    const autoApprovePatterns = prefs.autoApprovePatterns ?? [];
    return autoApprovePatterns.includes(taskType);
  }

  /**
   * Learn auto-approval pattern
   * If user approves same task type N times, add to auto-approve list
   */
  async learnAutoApproval(userId: number, taskType: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Count recent approvals for this task type
    const recentFeedback = await db
      .select()
      .from(userFeedback)
      .where(
        and(
          eq(userFeedback.userId, userId),
          eq(userFeedback.feedbackType, 'approval')
        )
      )
      .limit(20);

    const taskTypeApprovals = recentFeedback.filter(f => {
      const action = f.originalAction as any;
      return action?.taskType === taskType;
    });

    // If user approved this task type 5+ times, add to auto-approve
    if (taskTypeApprovals.length >= 5) {
      const memory = await this.getUserMemory(userId);
      const prefs = (memory.preferences as any) ?? {};
      const autoApprovePatterns = new Set(prefs.autoApprovePatterns ?? []);

      if (!autoApprovePatterns.has(taskType)) {
        autoApprovePatterns.add(taskType);

        await db
          .update(userMemory)
          .set({
            preferences: {
              ...prefs,
              autoApprovePatterns: Array.from(autoApprovePatterns),
            } as any,
            updatedAt: new Date(),
          })
          .where(eq(userMemory.userId, userId));

        // Invalidate cache
        this.memoryCache.delete(userId);

        console.log(`[UserMemory] Learned auto-approval for task type: ${taskType}`);
      }
    }
  }

  /**
   * Add to cache with LRU eviction
   */
  private addToCache(userId: number, memory: UserMemory): void {
    if (this.memoryCache.size >= this.cacheMaxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(userId, memory);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.memoryCache.clear();
  }
}

// Export singleton instance
let userMemoryServiceInstance: UserMemoryService | null = null;

export function getUserMemoryService(): UserMemoryService {
  if (!userMemoryServiceInstance) {
    userMemoryServiceInstance = new UserMemoryService();
  }
  return userMemoryServiceInstance;
}
