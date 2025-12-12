/**
 * Memory System Integration Examples
 * Shows how to integrate the memory system with the agent orchestrator
 */

import { getMemorySystem } from "./index";
import { AgentOrchestratorService } from "../agentOrchestrator.service";

/**
 * Example 1: Enhanced Agent with Memory
 * This shows how to extend the agent orchestrator to use memory
 */
export class MemoryEnhancedAgent extends AgentOrchestratorService {
  private memory = getMemorySystem();

  /**
   * Execute task with memory support
   */
  async executeTaskWithMemory(options: {
    userId: number;
    taskDescription: string;
    sessionId: string;
    context?: Record<string, any>;
  }) {
    const { sessionId, userId, taskDescription, context = {} } = options;

    try {
      // 1. Store initial context
      await this.memory.storeContext(sessionId, {
        userId,
        taskDescription,
        startedAt: new Date().toISOString(),
        ...context,
      });

      // 2. Check for similar past reasoning
      const similarPatterns = await this.memory.findSimilarReasoning(
        taskDescription,
        {
          limit: 5,
          minConfidence: 0.7,
        }
      );

      console.log(`Found ${similarPatterns.length} similar reasoning patterns`);

      // Add similar patterns to context
      if (similarPatterns.length > 0) {
        await this.memory.updateContext(sessionId, {
          similarApproaches: similarPatterns.map(p => ({
            pattern: p.data.pattern,
            result: p.data.result,
            confidence: p.data.confidence,
            similarity: p.similarity,
          })),
        });
      }

      // 3. Execute the task
      const result = await this.executeTask({
        userId,
        taskDescription,
        context: await this.getEnrichedContext(sessionId),
      });

      // 4. Store the reasoning pattern if successful
      if (result.status === 'completed') {
        await this.memory.storeReasoning(
          taskDescription,
          result.output,
          {
            context: result.plan ? {
              phases: result.plan.phases.map(p => p.name),
              iterations: result.iterations,
            } : undefined,
            confidence: 0.8,
            domain: 'task-execution',
            tags: ['agent-orchestrator', 'successful'],
          }
        );

        console.log('Stored successful reasoning pattern for future use');
      }

      // 5. Update session context with result
      await this.memory.updateContext(sessionId, {
        completedAt: new Date().toISOString(),
        status: result.status,
        iterations: result.iterations,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      // Store failed attempt for learning
      await this.memory.storeReasoning(
        taskDescription,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        {
          confidence: 0.2,
          domain: 'task-execution',
          tags: ['agent-orchestrator', 'failed'],
        }
      );

      throw error;
    }
  }

  /**
   * Get enriched context from memory
   */
  private async getEnrichedContext(sessionId: string): Promise<Record<string, any>> {
    const sessionContext = await this.memory.retrieveContext(sessionId);
    return sessionContext?.context || {};
  }
}

/**
 * Example 2: Multi-Agent Coordination with Shared Memory
 */
export async function multiAgentCoordination(
  sessionId: string,
  userId: number,
  tasks: string[]
) {
  const memory = getMemorySystem();

  // Initialize shared session context
  await memory.storeContext(sessionId, {
    userId,
    agentCount: tasks.length,
    startedAt: new Date().toISOString(),
    tasks,
  });

  const results = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const agentId = `agent-${i + 1}`;

    // Each agent stores its own context
    await memory.storeContext(
      sessionId,
      `agent-${agentId}-task`,
      {
        task,
        status: 'started',
        startedAt: new Date().toISOString(),
      },
      {
        agentId,
        userId,
        metadata: {
          type: 'agent-task',
          agentId,
        },
      }
    );

    // Agent can access shared context
    const sharedContext = await memory.retrieveContext(sessionId);

    // Execute task (placeholder)
    const result = await executeAgentTask(task, sharedContext);

    // Store result
    await memory.storeContext(
      sessionId,
      `agent-${agentId}-result`,
      result,
      {
        agentId,
        userId,
        metadata: {
          type: 'agent-result',
          agentId,
        },
      }
    );

    results.push(result);
  }

  // Update final context
  await memory.updateContext(sessionId, {
    completedAt: new Date().toISOString(),
    results,
  });

  return results;
}

async function executeAgentTask(task: string, context: any): Promise<any> {
  // Placeholder implementation
  return {
    task,
    status: 'completed',
    output: `Completed: ${task}`,
  };
}

/**
 * Example 3: Learning from Past Executions
 */
export async function executeWithLearning(
  sessionId: string,
  userId: number,
  taskDescription: string
) {
  const memory = getMemorySystem();

  // Find similar successful patterns
  const successfulPatterns = await memory.findSimilarReasoning(
    taskDescription,
    {
      domain: 'task-execution',
      minConfidence: 0.7,
      limit: 3,
    }
  );

  // Find what didn't work
  const failedPatterns = await memory.findSimilarReasoning(
    taskDescription,
    {
      domain: 'task-execution',
      minConfidence: 0,
      limit: 3,
    }
  );

  // Store learning insights in context
  await memory.storeContext(sessionId, {
    taskDescription,
    learningInsights: {
      successfulApproaches: successfulPatterns.map(p => ({
        pattern: p.data.pattern,
        confidence: p.data.confidence,
        usageCount: p.data.usageCount,
        successRate: p.data.successRate,
      })),
      failedApproaches: failedPatterns
        .filter(p => p.data.successRate < 0.5)
        .map(p => ({
          pattern: p.data.pattern,
          reason: p.data.result?.error,
        })),
    },
  }, { userId });

  return {
    sessionId,
    insights: {
      successfulCount: successfulPatterns.length,
      failedCount: failedPatterns.filter(p => p.data.successRate < 0.5).length,
    },
  };
}

/**
 * Example 4: Periodic Memory Cleanup
 */
export async function scheduleMemoryCleanup() {
  const memory = getMemorySystem();

  // Run cleanup every hour
  setInterval(async () => {
    try {
      console.log('[Memory Cleanup] Starting cleanup...');

      const result = await memory.cleanup({
        cleanupExpired: true,
        cleanupLowPerformance: true,
        minSuccessRate: 0.3,
        minUsageCount: 5,
      });

      console.log('[Memory Cleanup] Complete:', result);

      // Get stats after cleanup
      const stats = await memory.getStats();
      console.log('[Memory Stats]:', stats);
    } catch (error) {
      console.error('[Memory Cleanup] Failed:', error);
    }
  }, 3600000); // 1 hour
}

/**
 * Example 5: Agent Tool Integration
 * Shows how to add memory tools to the agent orchestrator
 */
export function getMemoryTools() {
  const memory = getMemorySystem();

  return {
    store_memory: async (params: {
      sessionId: string;
      key: string;
      value: any;
      metadata?: Record<string, any>;
    }) => {
      await memory.storeContext(
        params.sessionId,
        { [params.key]: params.value },
        { metadata: params.metadata }
      );

      return {
        success: true,
        key: params.key,
        stored: true,
      };
    },

    retrieve_memory: async (params: {
      sessionId: string;
      key?: string;
    }) => {
      if (params.key) {
        const value = await memory.retrieveContextValue(params.sessionId, params.key);
        return {
          success: true,
          key: params.key,
          value,
          found: value !== undefined,
        };
      } else {
        const context = await memory.retrieveContext(params.sessionId);
        return {
          success: true,
          context: context?.context,
          found: context !== null,
        };
      }
    },

    search_reasoning: async (params: {
      pattern: string;
      domain?: string;
      limit?: number;
    }) => {
      const results = await memory.findSimilarReasoning(params.pattern, {
        domain: params.domain,
        limit: params.limit || 5,
        minConfidence: 0.5,
      });

      return {
        success: true,
        results: results.map(r => ({
          pattern: r.data.pattern,
          result: r.data.result,
          confidence: r.data.confidence,
          similarity: r.similarity,
        })),
      };
    },

    store_reasoning: async (params: {
      pattern: string;
      result: any;
      confidence?: number;
      domain?: string;
    }) => {
      const patternId = await memory.storeReasoning(
        params.pattern,
        params.result,
        {
          confidence: params.confidence,
          domain: params.domain,
        }
      );

      return {
        success: true,
        patternId,
      };
    },
  };
}
