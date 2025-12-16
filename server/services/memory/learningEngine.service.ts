/**
 * Learning Engine Service
 * Processes user feedback and adapts agent behavior
 * Integrates user memory, reasoning patterns, and task patterns
 */

import { getReasoningBank } from "./reasoningBank.service";
import { getUserMemoryService } from "./userMemory.service";
import { getAgentMemory } from "./agentMemory.service";
import type { ReasoningPattern } from "./types";

export interface LearningContext {
  userId: number;
  executionId?: number;
  taskType: string;
  sessionId?: string;
}

export interface AdaptedStrategy {
  approach: string;
  confidence: number;
  reasoning: string;
  pattern?: ReasoningPattern;
  taskPattern?: any;
  source: 'reasoning_bank' | 'task_pattern' | 'user_memory' | 'default';
}

/**
 * Learning Engine - Learns from user feedback and adapts agent behavior
 */
export class LearningEngineService {
  private reasoningBank = getReasoningBank();
  private userMemory = getUserMemoryService();
  private agentMemory = getAgentMemory();

  /**
   * Get recommended strategy for a task
   * Uses learned patterns, user preferences, and reasoning bank
   */
  async getRecommendedStrategy(context: LearningContext): Promise<AdaptedStrategy> {
    // 1. Check user's preferred approach from history
    const userStats = await this.userMemory.getUserStats(context.userId);
    const preferredApproach = userStats.preferredApproaches?.[context.taskType];

    if (preferredApproach) {
      return {
        approach: preferredApproach,
        confidence: 0.9,
        reasoning: 'Based on your previous successful executions',
        source: 'user_memory',
      };
    }

    // 2. Check task success patterns
    const taskPatterns = await this.userMemory.findSimilarTaskPatterns(
      context.userId,
      context.taskType,
      { minConfidence: 0.6, limit: 3 }
    );

    if (taskPatterns.length > 0) {
      const bestPattern = taskPatterns[0];
      return {
        approach: JSON.stringify(bestPattern.successfulApproach),
        confidence: bestPattern.confidence,
        reasoning: `Based on ${bestPattern.usageCount} previous successful executions (${(bestPattern.successRate * 100).toFixed(0)}% success rate)`,
        taskPattern: bestPattern,
        source: 'task_pattern',
      };
    }

    // 3. Check reasoning bank for similar patterns
    const reasoningPatterns = await this.reasoningBank.findSimilarReasoning(
      context.taskType,
      { minConfidence: 0.6, limit: 3 }
    );

    if (reasoningPatterns.length > 0) {
      const bestReasoning = reasoningPatterns[0];
      return {
        approach: JSON.stringify(bestReasoning.data.result),
        confidence: bestReasoning.data.confidence,
        reasoning: `Based on similar reasoning patterns (${bestReasoning.similarity.toFixed(2)} similarity)`,
        pattern: bestReasoning.data,
        source: 'reasoning_bank',
      };
    }

    // 4. Default strategy
    return {
      approach: 'standard',
      confidence: 0.5,
      reasoning: 'Using default approach (no learned patterns available)',
      source: 'default',
    };
  }

  /**
   * Process feedback and update learning
   */
  async processFeedback(feedback: {
    userId: number;
    executionId: number;
    taskType: string;
    success: boolean;
    approach: string;
    executionTime: number;
    feedback?: {
      type: 'approval' | 'correction' | 'rejection';
      originalAction?: any;
      correctedAction?: any;
    };
  }): Promise<void> {
    // 1. Update task history
    await this.userMemory.addTaskHistory(feedback.userId, {
      taskType: feedback.taskType,
      executionId: feedback.executionId,
      timestamp: new Date(),
      success: feedback.success,
      executionTime: feedback.executionTime,
      approach: feedback.approach,
    });

    // 2. If successful, potentially store as pattern
    if (feedback.success) {
      // Check if we should create a new pattern or update existing
      const existingPatterns = await this.userMemory.findSimilarTaskPatterns(
        feedback.userId,
        feedback.taskType,
        { minConfidence: 0.5, limit: 1 }
      );

      if (existingPatterns.length > 0) {
        // Update existing pattern
        await this.userMemory.updateTaskPatternUsage(
          existingPatterns[0].patternId,
          true,
          feedback.executionTime
        );
      } else {
        // Create new pattern after 2+ successful executions of same type
        const stats = await this.userMemory.getUserStats(feedback.userId);
        const taskCount = stats.mostUsedTasks?.[feedback.taskType] ?? 0;

        if (taskCount >= 2) {
          await this.userMemory.storeTaskPattern(feedback.userId, {
            taskType: feedback.taskType,
            successfulApproach: { approach: feedback.approach },
            avgExecutionTime: feedback.executionTime,
          });
        }
      }
    }

    // 3. Process user feedback if provided
    if (feedback.feedback) {
      if (feedback.feedback.type === 'approval') {
        await this.userMemory.recordUserFeedback({
          userId: feedback.userId,
          executionId: feedback.executionId,
          feedbackType: 'approval',
          originalAction: { taskType: feedback.taskType, approach: feedback.approach },
          sentiment: 'positive',
          impact: 'minor',
        });

        // Learn auto-approval pattern
        await this.userMemory.learnAutoApproval(feedback.userId, feedback.taskType);
      } else if (feedback.feedback.type === 'correction') {
        await this.userMemory.recordCorrection(feedback.userId, {
          executionId: feedback.executionId,
          originalAction: feedback.feedback.originalAction,
          correctedAction: feedback.feedback.correctedAction,
          context: { taskType: feedback.taskType },
        });
      } else if (feedback.feedback.type === 'rejection') {
        await this.userMemory.recordUserFeedback({
          userId: feedback.userId,
          executionId: feedback.executionId,
          feedbackType: 'rejection',
          originalAction: { taskType: feedback.taskType, approach: feedback.approach },
          sentiment: 'negative',
          impact: 'important',
        });
      }
    }
  }

  /**
   * Process unprocessed feedback in batch
   * Should be called periodically (e.g., via cron job)
   */
  async processUnprocessedFeedback(userId?: number): Promise<number> {
    const unprocessed = await this.userMemory.getUnprocessedFeedback(userId);
    let processedCount = 0;

    for (const feedback of unprocessed) {
      try {
        // Process correction feedback
        if (feedback.feedbackType === 'correction' && feedback.correctedAction) {
          // TODO: Use Claude to analyze the correction and update patterns
          // For now, just mark as processed
          await this.userMemory.markFeedbackProcessed(feedback.feedbackId, false);
          processedCount++;
        }

        // Process suggestion feedback
        if (feedback.feedbackType === 'suggestion') {
          // TODO: Use Claude to analyze suggestions and update workflows
          await this.userMemory.markFeedbackProcessed(feedback.feedbackId, false);
          processedCount++;
        }
      } catch (error) {
        console.error(`[LearningEngine] Error processing feedback ${feedback.feedbackId}:`, error);
      }
    }

    console.log(`[LearningEngine] Processed ${processedCount} feedback items`);
    return processedCount;
  }

  /**
   * Get cached selector for GHL element
   */
  async getCachedSelector(userId: number, elementType: string): Promise<string | null> {
    return this.userMemory.getSelector(userId, elementType);
  }

  /**
   * Cache a successful selector
   */
  async cacheSelector(userId: number, elementType: string, selector: string): Promise<void> {
    await this.userMemory.learnSelector(userId, elementType, selector);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: number) {
    const memory = await this.userMemory.getUserMemory(userId);
    return memory.preferences as any;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: number, preferences: any): Promise<void> {
    await this.userMemory.updatePreferences(userId, preferences);
  }

  /**
   * Check if user should be asked for approval
   */
  async shouldRequestApproval(userId: number, taskType: string): Promise<boolean> {
    return !(await this.userMemory.shouldAutoApprove(userId, taskType));
  }

  /**
   * Analyze execution failure and suggest recovery
   */
  async analyzeFailure(context: {
    userId: number;
    taskType: string;
    error: string;
    errorContext: any;
  }): Promise<{
    suggestedRecovery?: string;
    confidence: number;
    reasoning: string;
  }> {
    // Check if user has learned error recovery patterns
    const memory = await this.userMemory.getUserMemory(context.userId);
    const patterns = (memory.learnedPatterns as any) ?? {};
    const errorRecovery = patterns.errorRecovery ?? [];

    // Find matching error recovery pattern
    const matchingPattern = errorRecovery.find((pattern: any) =>
      pattern.errorType === context.error ||
      context.error.includes(pattern.errorType)
    );

    if (matchingPattern) {
      return {
        suggestedRecovery: JSON.stringify(matchingPattern.recoverySteps),
        confidence: matchingPattern.successRate ?? 0.7,
        reasoning: 'Based on your previous successful error recoveries',
      };
    }

    // No learned pattern found
    return {
      confidence: 0.3,
      reasoning: 'No learned recovery patterns available. Using default error handling.',
    };
  }

  /**
   * Get user statistics and insights
   */
  async getUserInsights(userId: number): Promise<{
    stats: any;
    topTasks: Array<{ taskType: string; count: number }>;
    successRate: number;
    averageExecutionTime: number;
    learnedPatterns: number;
    autoApprovedTasks: string[];
  }> {
    const stats = await this.userMemory.getUserStats(userId);
    const memory = await this.userMemory.getUserMemory(userId);

    const topTasks = Object.entries(stats.mostUsedTasks ?? {})
      .map(([taskType, count]) => ({ taskType, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const successRate = stats.totalExecutions > 0
      ? stats.successfulExecutions / stats.totalExecutions
      : 0;

    const patterns = (memory.learnedPatterns as any) ?? {};
    const learnedPatterns =
      Object.keys(patterns.ghlSelectors ?? {}).length +
      (patterns.commonWorkflows ?? []).length +
      (patterns.errorRecovery ?? []).length;

    const prefs = (memory.preferences as any) ?? {};

    return {
      stats,
      topTasks,
      successRate,
      averageExecutionTime: stats.avgExecutionTime ?? 0,
      learnedPatterns,
      autoApprovedTasks: prefs.autoApprovePatterns ?? [],
    };
  }

  /**
   * Store reasoning pattern with user context
   */
  async storeReasoningPattern(
    userId: number,
    pattern: string,
    result: any,
    options: {
      context?: Record<string, any>;
      confidence?: number;
      domain?: string;
      tags?: string[];
    } = {}
  ): Promise<string> {
    // Store in reasoning bank with user-specific domain
    const domain = options.domain ?? `user:${userId}`;

    const patternId = await this.reasoningBank.storeReasoning(pattern, result, {
      ...options,
      domain,
      metadata: {
        ...options.context,
        userId,
        userContext: true,
      },
    });

    return patternId;
  }

  /**
   * Find similar reasoning patterns for user
   */
  async findSimilarReasoning(
    userId: number,
    query: string,
    options: {
      minConfidence?: number;
      limit?: number;
      includeGlobal?: boolean; // Include non-user-specific patterns
    } = {}
  ) {
    // Search in user-specific domain
    const userDomain = `user:${userId}`;
    const userPatterns = await this.reasoningBank.findSimilarReasoning(query, {
      domain: userDomain,
      minConfidence: options.minConfidence,
      limit: options.limit,
    });

    // Optionally include global patterns
    if (options.includeGlobal && userPatterns.length < (options.limit ?? 10)) {
      const globalPatterns = await this.reasoningBank.findSimilarReasoning(query, {
        minConfidence: options.minConfidence,
        limit: (options.limit ?? 10) - userPatterns.length,
      });

      return [...userPatterns, ...globalPatterns];
    }

    return userPatterns;
  }
}

// Export singleton instance
let learningEngineInstance: LearningEngineService | null = null;

export function getLearningEngine(): LearningEngineService {
  if (!learningEngineInstance) {
    learningEngineInstance = new LearningEngineService();
  }
  return learningEngineInstance;
}
