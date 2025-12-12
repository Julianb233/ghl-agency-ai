/**
 * Agent SSE Event Emitter Utilities
 *
 * Helper functions for emitting real-time agent execution events to connected clients.
 * These functions should be called from the agent orchestrator service during execution.
 */

import { sendAgentEvent, type AgentSSEEvent } from "./sse-manager";

// ========================================
// EVENT EMITTER FUNCTIONS
// ========================================

/**
 * Emit execution started event
 */
export function emitExecutionStarted(
  userId: number,
  executionId: string,
  data: {
    task: string;
    startedAt?: Date;
  }
) {
  const event: AgentSSEEvent = {
    type: 'execution:started',
    executionId,
    data: {
      task: data.task,
      startedAt: data.startedAt?.toISOString() || new Date().toISOString(),
    },
  };

  sendAgentEvent(userId, executionId, event);
}

/**
 * Emit plan created event
 */
export function emitPlanCreated(
  userId: number,
  executionId: string,
  data: {
    planId?: string;
    plan: {
      goal: string;
      phases: Array<{
        id?: string;
        name: string;
        description: string;
        steps?: string[];
      }>;
      estimatedDuration?: string;
    };
  }
) {
  const event: AgentSSEEvent = {
    type: 'plan:created',
    executionId,
    data: {
      planId: data.planId || `plan-${Date.now()}`,
      plan: data.plan,
    },
  };

  sendAgentEvent(userId, executionId, event);
}

/**
 * Emit phase start event
 */
export function emitPhaseStart(
  userId: number,
  executionId: string,
  data: {
    phaseId: string;
    phaseName: string;
    phaseIndex?: number;
  }
) {
  const event: AgentSSEEvent = {
    type: 'phase:start',
    executionId,
    data: {
      phaseId: data.phaseId,
      phaseName: data.phaseName,
      phaseIndex: data.phaseIndex,
      timestamp: new Date().toISOString(),
    },
  };

  sendAgentEvent(userId, executionId, event);
}

/**
 * Emit thinking event
 */
export function emitThinking(
  userId: number,
  executionId: string,
  data: {
    thought: string;
    iteration?: number;
  }
) {
  const event: AgentSSEEvent = {
    type: 'thinking',
    executionId,
    data: {
      thought: data.thought,
      content: data.thought, // Alias for compatibility
      iteration: data.iteration,
      timestamp: new Date().toISOString(),
    },
  };

  sendAgentEvent(userId, executionId, event);
}

/**
 * Emit tool start event
 */
export function emitToolStart(
  userId: number,
  executionId: string,
  data: {
    toolName: string;
    params: any;
  }
) {
  const event: AgentSSEEvent = {
    type: 'tool:start',
    executionId,
    data: {
      toolName: data.toolName,
      params: data.params,
      timestamp: new Date().toISOString(),
    },
  };

  sendAgentEvent(userId, executionId, event);
}

/**
 * Emit tool complete event
 */
export function emitToolComplete(
  userId: number,
  executionId: string,
  data: {
    toolName: string;
    result: any;
    duration?: number;
  }
) {
  const event: AgentSSEEvent = {
    type: 'tool:complete',
    executionId,
    data: {
      toolName: data.toolName,
      result: data.result,
      duration: data.duration,
      timestamp: new Date().toISOString(),
    },
  };

  sendAgentEvent(userId, executionId, event);
}

/**
 * Emit phase complete event
 */
export function emitPhaseComplete(
  userId: number,
  executionId: string,
  data: {
    phaseId: string;
    phaseName: string;
    phaseIndex?: number;
  }
) {
  const event: AgentSSEEvent = {
    type: 'phase:complete',
    executionId,
    data: {
      phaseId: data.phaseId,
      phaseName: data.phaseName,
      phaseIndex: data.phaseIndex,
      timestamp: new Date().toISOString(),
    },
  };

  sendAgentEvent(userId, executionId, event);
}

/**
 * Emit execution complete event
 */
export function emitExecutionComplete(
  userId: number,
  executionId: string,
  data: {
    result: any;
    duration?: number;
    tokensUsed?: number;
  }
) {
  const event: AgentSSEEvent = {
    type: 'execution:complete',
    executionId,
    data: {
      result: data.result,
      duration: data.duration,
      tokensUsed: data.tokensUsed,
      timestamp: new Date().toISOString(),
    },
  };

  sendAgentEvent(userId, executionId, event);
}

/**
 * Emit execution error event
 */
export function emitExecutionError(
  userId: number,
  executionId: string,
  data: {
    error: string;
    stack?: string;
  }
) {
  const event: AgentSSEEvent = {
    type: 'execution:error',
    executionId,
    data: {
      error: data.error,
      stack: data.stack,
      timestamp: new Date().toISOString(),
    },
  };

  sendAgentEvent(userId, executionId, event);
}

// ========================================
// CONVENIENCE WRAPPER CLASS
// ========================================

/**
 * Agent SSE Emitter Class
 *
 * Provides a convenient interface for emitting agent events.
 * Create one instance per execution.
 *
 * @example
 * ```typescript
 * const emitter = new AgentSSEEmitter(userId, executionId);
 *
 * emitter.executionStarted({ task: 'Create landing page' });
 * emitter.thinking({ thought: 'Planning the page structure...' });
 * emitter.toolStart({ toolName: 'create_file', params: { path: 'index.html' } });
 * emitter.executionComplete({ result: { success: true } });
 * ```
 */
export class AgentSSEEmitter {
  constructor(
    private userId: number,
    private executionId: string
  ) {}

  executionStarted(data: Parameters<typeof emitExecutionStarted>[2]) {
    emitExecutionStarted(this.userId, this.executionId, data);
  }

  planCreated(data: Parameters<typeof emitPlanCreated>[2]) {
    emitPlanCreated(this.userId, this.executionId, data);
  }

  phaseStart(data: Parameters<typeof emitPhaseStart>[2]) {
    emitPhaseStart(this.userId, this.executionId, data);
  }

  thinking(data: Parameters<typeof emitThinking>[2]) {
    emitThinking(this.userId, this.executionId, data);
  }

  toolStart(data: Parameters<typeof emitToolStart>[2]) {
    emitToolStart(this.userId, this.executionId, data);
  }

  toolComplete(data: Parameters<typeof emitToolComplete>[2]) {
    emitToolComplete(this.userId, this.executionId, data);
  }

  phaseComplete(data: Parameters<typeof emitPhaseComplete>[2]) {
    emitPhaseComplete(this.userId, this.executionId, data);
  }

  executionComplete(data: Parameters<typeof emitExecutionComplete>[2]) {
    emitExecutionComplete(this.userId, this.executionId, data);
  }

  executionError(data: Parameters<typeof emitExecutionError>[2]) {
    emitExecutionError(this.userId, this.executionId, data);
  }
}
