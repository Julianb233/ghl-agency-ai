/**
 * Agent Loop Service
 * Implements Think-Act-Observe cycle with real-time Socket.IO updates
 *
 * This service orchestrates the agent execution loop:
 * 1. THINK: Analyze context and determine next action
 * 2. ACT: Execute the chosen tool/action
 * 3. OBSERVE: Process results and update context
 * 4. Repeat until goal is achieved or max iterations
 */

import { socketIOService } from "./socketio.service";
import { nanoid } from "nanoid";

// Agent loop configuration
export interface AgentLoopConfig {
  maxIterations: number;
  thinkingTimeout: number;
  actionTimeout: number;
  enableStreaming: boolean;
}

// Agent context for loop execution
export interface AgentContext {
  sessionId: string;
  agentId: string;
  userId: number;
  goal: string;
  history: LoopStep[];
  currentIteration: number;
  status: "idle" | "thinking" | "acting" | "observing" | "complete" | "error" | "paused" | "stopped";
  startedAt: Date;
  endedAt?: Date;
}

// Individual step in the loop
export interface LoopStep {
  iteration: number;
  phase: "think" | "act" | "observe";
  thought?: string;
  action?: {
    tool: string;
    input: unknown;
  };
  observation?: unknown;
  timestamp: Date;
  duration?: number;
}

// Result of agent execution
export interface AgentResult {
  success: boolean;
  output: unknown;
  iterations: number;
  totalDuration: number;
  steps: LoopStep[];
  error?: string;
}

// Tool interface for agent actions
export interface AgentTool {
  name: string;
  description: string;
  execute: (input: unknown, context: AgentContext) => Promise<unknown>;
}

const DEFAULT_CONFIG: AgentLoopConfig = {
  maxIterations: 25,
  thinkingTimeout: 30000, // 30s
  actionTimeout: 60000, // 60s
  enableStreaming: true,
};

class AgentLoopService {
  private activeSessions: Map<string, AgentContext> = new Map();
  private tools: Map<string, AgentTool> = new Map();
  private stopSignals: Set<string> = new Set();
  private pauseSignals: Set<string> = new Set();

  /**
   * Register a tool for agent use
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    console.log(`[AgentLoop] Registered tool: ${tool.name}`);
  }

  /**
   * Start agent loop execution
   */
  async executeLoop(
    userId: number,
    goal: string,
    config: Partial<AgentLoopConfig> = {}
  ): Promise<AgentResult> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const sessionId = `session_${nanoid(12)}`;
    const agentId = `agent_${nanoid(8)}`;

    // Initialize context
    const context: AgentContext = {
      sessionId,
      agentId,
      userId,
      goal,
      history: [],
      currentIteration: 0,
      status: "idle",
      startedAt: new Date(),
    };

    this.activeSessions.set(sessionId, context);

    console.log(`[AgentLoop] Starting session ${sessionId} for user ${userId}`);
    console.log(`[AgentLoop] Goal: ${goal}`);

    try {
      const result = await this.runLoop(context, mergedConfig);
      return result;
    } finally {
      this.activeSessions.delete(sessionId);
      this.stopSignals.delete(sessionId);
      this.pauseSignals.delete(sessionId);
    }
  }

  /**
   * Main loop execution
   */
  private async runLoop(
    context: AgentContext,
    config: AgentLoopConfig
  ): Promise<AgentResult> {
    const startTime = Date.now();

    while (context.currentIteration < config.maxIterations) {
      // Check for stop signal
      if (this.stopSignals.has(context.sessionId)) {
        context.status = "stopped";
        socketIOService.emitAgentComplete(context.sessionId, context.agentId, {
          stopped: true,
          reason: "User requested stop",
        });
        break;
      }

      // Check for pause signal
      while (this.pauseSignals.has(context.sessionId)) {
        context.status = "paused";
        await this.sleep(500);
      }

      context.currentIteration++;

      // ============ THINK PHASE ============
      const thinkStep = await this.think(context, config);
      context.history.push(thinkStep);

      // Check if agent decided to complete
      if (thinkStep.thought?.includes("[COMPLETE]")) {
        context.status = "complete";
        socketIOService.emitAgentComplete(context.sessionId, context.agentId, {
          completed: true,
          output: thinkStep.thought,
        });
        break;
      }

      // ============ ACT PHASE ============
      if (thinkStep.action) {
        const actStep = await this.act(context, thinkStep.action, config);
        context.history.push(actStep);

        // ============ OBSERVE PHASE ============
        const observeStep = await this.observe(context, actStep.observation, config);
        context.history.push(observeStep);
      }
    }

    context.endedAt = new Date();

    return {
      success: context.status === "complete",
      output: this.extractFinalOutput(context),
      iterations: context.currentIteration,
      totalDuration: Date.now() - startTime,
      steps: context.history,
      error: context.status === "error" ? "Execution failed" : undefined,
    };
  }

  /**
   * THINK phase - analyze and decide next action
   */
  private async think(
    context: AgentContext,
    _config: AgentLoopConfig
  ): Promise<LoopStep> {
    const stepStart = Date.now();
    context.status = "thinking";

    socketIOService.emitAgentThinking(
      context.sessionId,
      context.agentId,
      `Analyzing context for iteration ${context.currentIteration}...`
    );

    // Build prompt with history
    const prompt = this.buildThinkingPrompt(context);

    // In production, this would call the LLM
    // For now, simulate thinking
    await this.sleep(100);

    const thought = `Analyzed goal: "${context.goal}". Iteration ${context.currentIteration}.`;
    const action = this.determineAction(context);

    const step: LoopStep = {
      iteration: context.currentIteration,
      phase: "think",
      thought,
      action,
      timestamp: new Date(),
      duration: Date.now() - stepStart,
    };

    socketIOService.emitAgentThinking(
      context.sessionId,
      context.agentId,
      thought
    );

    return step;
  }

  /**
   * ACT phase - execute the chosen action
   */
  private async act(
    context: AgentContext,
    action: { tool: string; input: unknown },
    _config: AgentLoopConfig
  ): Promise<LoopStep> {
    const stepStart = Date.now();
    context.status = "acting";

    socketIOService.emitAgentActing(
      context.sessionId,
      context.agentId,
      action.tool,
      `Executing ${action.tool}...`
    );

    let observation: unknown;

    try {
      const tool = this.tools.get(action.tool);
      if (tool) {
        observation = await tool.execute(action.input, context);
      } else {
        observation = { error: `Tool not found: ${action.tool}` };
      }
    } catch (error) {
      observation = { error: error instanceof Error ? error.message : "Unknown error" };
    }

    const step: LoopStep = {
      iteration: context.currentIteration,
      phase: "act",
      action,
      observation,
      timestamp: new Date(),
      duration: Date.now() - stepStart,
    };

    return step;
  }

  /**
   * OBSERVE phase - process action results
   */
  private async observe(
    context: AgentContext,
    observation: unknown,
    _config: AgentLoopConfig
  ): Promise<LoopStep> {
    const stepStart = Date.now();
    context.status = "observing";

    socketIOService.emitAgentObserving(
      context.sessionId,
      context.agentId,
      observation
    );

    const step: LoopStep = {
      iteration: context.currentIteration,
      phase: "observe",
      observation,
      timestamp: new Date(),
      duration: Date.now() - stepStart,
    };

    return step;
  }

  /**
   * Build prompt for thinking phase
   */
  private buildThinkingPrompt(context: AgentContext): string {
    const availableTools = Array.from(this.tools.values())
      .map((t) => `- ${t.name}: ${t.description}`)
      .join("\n");

    const historyStr = context.history
      .slice(-10)
      .map((s) => `[${s.phase}] ${JSON.stringify(s)}`)
      .join("\n");

    return `
Goal: ${context.goal}

Available Tools:
${availableTools}

Recent History:
${historyStr}

Iteration: ${context.currentIteration}

Based on the goal and history, determine the next action.
If the goal is complete, respond with [COMPLETE].
Otherwise, specify which tool to use and with what input.
    `.trim();
  }

  /**
   * Determine next action (placeholder - would use LLM in production)
   */
  private determineAction(context: AgentContext): { tool: string; input: unknown } | undefined {
    // In production, this would be LLM-driven
    // For demo, return a simple action or complete after a few iterations
    if (context.currentIteration >= 3) {
      return undefined; // Will trigger [COMPLETE]
    }

    const tools = Array.from(this.tools.keys());
    if (tools.length === 0) {
      return undefined;
    }

    return {
      tool: tools[0],
      input: { query: context.goal },
    };
  }

  /**
   * Extract final output from context
   */
  private extractFinalOutput(context: AgentContext): unknown {
    const lastObserve = context.history
      .filter((s) => s.phase === "observe")
      .pop();

    return lastObserve?.observation || { message: "No output generated" };
  }

  // ============================================
  // Session Control
  // ============================================

  /**
   * Stop an agent session
   */
  stopSession(sessionId: string): boolean {
    if (!this.activeSessions.has(sessionId)) {
      return false;
    }
    this.stopSignals.add(sessionId);
    console.log(`[AgentLoop] Stop signal sent to session ${sessionId}`);
    return true;
  }

  /**
   * Pause an agent session
   */
  pauseSession(sessionId: string): boolean {
    if (!this.activeSessions.has(sessionId)) {
      return false;
    }
    this.pauseSignals.add(sessionId);
    console.log(`[AgentLoop] Pause signal sent to session ${sessionId}`);
    return true;
  }

  /**
   * Resume a paused session
   */
  resumeSession(sessionId: string): boolean {
    if (!this.activeSessions.has(sessionId)) {
      return false;
    }
    this.pauseSignals.delete(sessionId);
    console.log(`[AgentLoop] Resume signal sent to session ${sessionId}`);
    return true;
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): AgentContext | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: number): AgentContext[] {
    return Array.from(this.activeSessions.values()).filter(
      (s) => s.userId === userId
    );
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  // ============================================
  // Utilities
  // ============================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton
export const agentLoopService = new AgentLoopService();
