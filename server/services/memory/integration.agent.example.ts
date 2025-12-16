/**
 * Memory & Learning System Integration Example
 * Shows how to integrate the memory system with the agent orchestrator
 */

import {
  getUserMemoryService,
  getCheckpointService,
  getLearningEngine,
  getPatternReuseService,
} from './index';

/**
 * Example: Execute task with memory and learning
 */
export async function executeTaskWithMemory(
  userId: number,
  executionId: number,
  task: {
    type: string;
    name: string;
    parameters: Record<string, any>;
  }
) {
  const userMemory = getUserMemoryService();
  const checkpoint = getCheckpointService();
  const learningEngine = getLearningEngine();
  const patternReuse = getPatternReuseService();

  try {
    // 1. Get user preferences
    const preferences = await learningEngine.getUserPreferences(userId);
    console.log('[Memory] User preferences:', preferences);

    // 2. Check if we should request approval
    const needsApproval = await learningEngine.shouldRequestApproval(userId, task.type);
    if (needsApproval) {
      console.log('[Memory] Requesting user approval for:', task.type);
      // TODO: Request approval from user
      const approved = await requestUserApproval(task);
      if (!approved) {
        return { status: 'rejected', reason: 'User rejected task' };
      }

      // Record approval feedback
      await learningEngine.processFeedback({
        userId,
        executionId,
        taskType: task.type,
        success: true,
        approach: 'user-approved',
        executionTime: 0,
        feedback: {
          type: 'approval',
          originalAction: task,
        },
      });
    } else {
      console.log('[Memory] Auto-approved based on learned preference');
    }

    // 3. Get recommended strategy
    const strategy = await learningEngine.getRecommendedStrategy({
      userId,
      executionId,
      taskType: task.type,
    });

    console.log('[Memory] Recommended strategy:', strategy);
    console.log('[Memory] Confidence:', strategy.confidence);
    console.log('[Memory] Source:', strategy.source);

    // 4. Find best matching pattern
    const pattern = await patternReuse.findBestPattern({
      userId,
      taskType: task.type,
      taskName: task.name,
      parameters: task.parameters,
    });

    if (pattern) {
      console.log('[Memory] Found pattern:', pattern.pattern.taskName);
      console.log('[Memory] Similarity:', pattern.similarity);
      console.log('[Memory] Needs adaptation:', pattern.adaptationRequired);
    }

    // 5. Execute task with checkpointing
    const startTime = Date.now();
    let result;
    let checkpointId: string | undefined;

    try {
      // Create initial checkpoint
      checkpointId = await checkpoint.createCheckpoint({
        executionId,
        userId,
        stepIndex: 0,
        completedSteps: [],
        partialResults: {},
        checkpointReason: 'auto',
        ttlSeconds: 24 * 60 * 60, // 24 hours
      });

      // Execute task (mock execution)
      result = await executeTask(task, {
        strategy: strategy.approach,
        pattern: pattern?.pattern,
      });

      // Update checkpoint with results
      await checkpoint.updateCheckpoint(checkpointId, {
        stepIndex: 100, // Completed
        completedSteps: ['all'],
        partialResults: result,
      });

      // Invalidate checkpoint on success
      await checkpoint.invalidateCheckpoint(checkpointId);

      const executionTime = Date.now() - startTime;

      // 6. Record success in learning system
      await learningEngine.processFeedback({
        userId,
        executionId,
        taskType: task.type,
        success: true,
        approach: strategy.approach,
        executionTime,
      });

      // 7. Update pattern usage if pattern was used
      if (pattern) {
        await patternReuse.recordPatternUsage(
          pattern.pattern.patternId,
          true,
          executionTime
        );
      }

      // 8. Record task history
      await userMemory.addTaskHistory(userId, {
        taskType: task.type,
        executionId,
        timestamp: new Date(),
        success: true,
        executionTime,
        approach: strategy.approach,
      });

      return {
        status: 'completed',
        result,
        executionTime,
        strategy: strategy.approach,
        usedPattern: pattern ? true : false,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Create error checkpoint
      if (checkpointId) {
        await checkpoint.updateCheckpoint(checkpointId, {
          partialResults: { error: error.message },
        });
      } else {
        checkpointId = await checkpoint.createCheckpoint({
          executionId,
          userId,
          stepIndex: 0,
          partialResults: {},
          errorInfo: {
            error: error.name,
            message: error.message,
            stack: error.stack,
            timestamp: new Date(),
            retryable: true,
          },
          checkpointReason: 'error',
        });
      }

      // Record failure
      await learningEngine.processFeedback({
        userId,
        executionId,
        taskType: task.type,
        success: false,
        approach: strategy.approach,
        executionTime,
      });

      // Analyze failure
      const analysis = await learningEngine.analyzeFailure({
        userId,
        taskType: task.type,
        error: error.message,
        errorContext: { checkpoint: checkpointId },
      });

      console.log('[Memory] Failure analysis:', analysis);

      return {
        status: 'failed',
        error: error.message,
        checkpoint: checkpointId,
        suggestedRecovery: analysis.suggestedRecovery,
      };
    }
  } catch (error) {
    console.error('[Memory] Error in executeTaskWithMemory:', error);
    throw error;
  }
}

/**
 * Example: Resume from checkpoint
 */
export async function resumeFromCheckpoint(
  checkpointId: string,
  userId: number
) {
  const checkpoint = getCheckpointService();

  // Load checkpoint
  const resumeResult = await checkpoint.resumeFromCheckpoint(checkpointId);

  if (!resumeResult) {
    throw new Error('Cannot resume from checkpoint');
  }

  console.log('[Memory] Resuming from checkpoint:', checkpointId);
  console.log('[Memory] Resume from step:', resumeResult.resumeFromStep);
  console.log('[Memory] Partial results:', resumeResult.context.partialResults);

  // TODO: Resume execution from saved state
  // - Restore browser session
  // - Continue from saved step
  // - Use partial results

  return resumeResult;
}

/**
 * Example: Handle user correction
 */
export async function handleUserCorrection(
  userId: number,
  executionId: number,
  correction: {
    originalAction: any;
    correctedAction: any;
  }
) {
  const userMemory = getUserMemoryService();

  // Record correction
  await userMemory.recordCorrection(userId, {
    executionId,
    originalAction: correction.originalAction,
    correctedAction: correction.correctedAction,
    context: { timestamp: new Date() },
  });

  console.log('[Memory] User correction recorded');

  // TODO: Apply correction to improve future executions
  // - Update selectors
  // - Update approach
  // - Update patterns
}

/**
 * Example: Get user insights dashboard
 */
export async function getUserInsightsDashboard(userId: number) {
  const learningEngine = getLearningEngine();
  const patternReuse = getPatternReuseService();
  const checkpoint = getCheckpointService();

  // Get insights
  const insights = await learningEngine.getUserInsights(userId);

  // Get pattern stats
  const patternStats = await patternReuse.getPatternReuseStats(userId);

  // Get checkpoint stats
  const checkpointStats = await checkpoint.getCheckpointStats(userId);

  return {
    // User insights
    totalExecutions: insights.stats.totalExecutions,
    successRate: insights.successRate,
    avgExecutionTime: insights.averageExecutionTime,
    topTasks: insights.topTasks,

    // Learning progress
    learnedPatterns: insights.learnedPatterns,
    autoApprovedTasks: insights.autoApprovedTasks,

    // Pattern reuse
    totalPatterns: patternStats.totalPatterns,
    totalReuses: patternStats.totalReuses,
    avgPatternConfidence: patternStats.avgConfidence,
    topPatterns: patternStats.topPatterns,

    // Checkpointing
    totalCheckpoints: checkpointStats.totalCheckpoints,
    resumableCheckpoints: checkpointStats.resumableCheckpoints,
    avgResumeCount: checkpointStats.avgResumeCount,
    errorCheckpoints: checkpointStats.errorCheckpoints,
  };
}

/**
 * Example: Learn from GHL selector
 */
export async function learnGHLSelector(
  userId: number,
  elementType: string,
  selector: string
) {
  const userMemory = getUserMemoryService();
  const learningEngine = getLearningEngine();

  // Cache selector
  await learningEngine.cacheSelector(userId, elementType, selector);

  console.log(`[Memory] Learned GHL selector for ${elementType}: ${selector}`);

  return { success: true };
}

/**
 * Example: Get cached GHL selector
 */
export async function getCachedGHLSelector(
  userId: number,
  elementType: string
): Promise<string | null> {
  const learningEngine = getLearningEngine();

  const selector = await learningEngine.getCachedSelector(userId, elementType);

  if (selector) {
    console.log(`[Memory] Using cached selector for ${elementType}: ${selector}`);
  } else {
    console.log(`[Memory] No cached selector for ${elementType}`);
  }

  return selector;
}

// ========================================
// MOCK FUNCTIONS (Replace with actual implementations)
// ========================================

async function requestUserApproval(task: any): Promise<boolean> {
  // TODO: Implement user approval UI
  return true;
}

async function executeTask(
  task: any,
  options: { strategy: string; pattern?: any }
): Promise<any> {
  // TODO: Implement actual task execution
  return { status: 'completed', data: {} };
}
