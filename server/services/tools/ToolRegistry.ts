/**
 * ToolRegistry - Central registry for managing agent tools
 * Handles tool registration, execution, and logging
 */

import { ITool, ToolDefinition, ToolResult, ToolExecutionContext, ToolExecutionLog } from './types';
import { ShellTool } from './ShellTool';
import { FileTool } from './FileTool';
import { MapTool } from './MapTool';

interface ToolExecutionOptions {
  timeout?: number;
  retries?: number;
  logExecution?: boolean;
}

interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
  averageDuration: number;
  byTool: Record<string, {
    executions: number;
    successes: number;
    failures: number;
    avgDuration: number;
  }>;
}

export class ToolRegistry {
  private tools: Map<string, ITool> = new Map();
  private executionLogs: ToolExecutionLog[] = [];
  private maxLogEntries = 1000;
  private onLogCallback?: (log: ToolExecutionLog) => Promise<void>;

  constructor() {
    // Register default tools
    this.registerDefaults();
  }

  /**
   * Register default tools
   */
  private registerDefaults(): void {
    this.register(new ShellTool());
    this.register(new FileTool());
    this.register(new MapTool());
  }

  /**
   * Register a tool
   */
  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool '${tool.name}' is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all enabled tools
   */
  getEnabled(): ITool[] {
    return this.getAll().filter(tool => tool.enabled);
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ITool['category']): ITool[] {
    return this.getAll().filter(tool => tool.category === category);
  }

  /**
   * Get tool definitions for AI model
   */
  getDefinitions(): ToolDefinition[] {
    return this.getEnabled().map(tool => tool.getDefinition());
  }

  /**
   * Enable or disable a tool
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const tool = this.tools.get(name);
    if (tool) {
      tool.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Execute a tool by name
   */
  async execute(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult> {
    const { timeout = 60000, retries = 0, logExecution = true } = options;

    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
      };
    }

    if (!tool.enabled) {
      return {
        success: false,
        error: `Tool is disabled: ${toolName}`,
      };
    }

    const startedAt = new Date();
    let result: ToolResult;
    let attempts = 0;

    // Execute with retries
    while (attempts <= retries) {
      attempts++;

      try {
        // Execute with timeout
        result = await this.executeWithTimeout(tool, params, context, timeout);

        // Success - break retry loop
        if (result.success) {
          break;
        }

        // Failed but retries remain
        if (attempts <= retries) {
          console.log(`Tool ${toolName} failed, retrying (${attempts}/${retries})...`);
          await this.delay(1000 * attempts); // Exponential backoff
        }
      } catch (error) {
        result = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };

        if (attempts <= retries) {
          await this.delay(1000 * attempts);
        }
      }
    }

    const completedAt = new Date();
    const duration = completedAt.getTime() - startedAt.getTime();

    // Add duration to result
    result!.duration = duration;

    // Log execution
    if (logExecution) {
      const log: ToolExecutionLog = {
        executionId: context.executionId || 0,
        toolName,
        parameters: params,
        result: result!,
        startedAt,
        completedAt,
        duration,
      };

      this.addLog(log);

      // Callback for external logging
      if (this.onLogCallback) {
        await this.onLogCallback(log).catch(console.error);
      }
    }

    return result!;
  }

  /**
   * Execute tool with timeout
   */
  private async executeWithTimeout(
    tool: ITool,
    params: Record<string, unknown>,
    context: ToolExecutionContext,
    timeout: number
  ): Promise<ToolResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeout}ms`));
      }, timeout);

      tool.execute(params, context)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Execute multiple tools in sequence
   */
  async executeSequence(
    calls: Array<{ tool: string; params: Record<string, unknown> }>,
    context: ToolExecutionContext,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of calls) {
      const result = await this.execute(call.tool, call.params, context, options);
      results.push(result);

      // Stop on failure unless configured otherwise
      if (!result.success && !options.retries) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeParallel(
    calls: Array<{ tool: string; params: Record<string, unknown> }>,
    context: ToolExecutionContext,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult[]> {
    const promises = calls.map(call =>
      this.execute(call.tool, call.params, context, options)
    );

    return Promise.all(promises);
  }

  /**
   * Set callback for execution logging
   */
  onLog(callback: (log: ToolExecutionLog) => Promise<void>): void {
    this.onLogCallback = callback;
  }

  /**
   * Add log entry
   */
  private addLog(log: ToolExecutionLog): void {
    this.executionLogs.push(log);

    // Trim old logs
    if (this.executionLogs.length > this.maxLogEntries) {
      this.executionLogs = this.executionLogs.slice(-this.maxLogEntries);
    }
  }

  /**
   * Get execution logs
   */
  getLogs(options?: {
    toolName?: string;
    executionId?: number;
    limit?: number;
    since?: Date;
  }): ToolExecutionLog[] {
    let logs = [...this.executionLogs];

    if (options?.toolName) {
      logs = logs.filter(l => l.toolName === options.toolName);
    }

    if (options?.executionId) {
      logs = logs.filter(l => l.executionId === options.executionId);
    }

    if (options?.since) {
      logs = logs.filter(l => l.startedAt >= options.since!);
    }

    if (options?.limit) {
      logs = logs.slice(-options.limit);
    }

    return logs;
  }

  /**
   * Clear execution logs
   */
  clearLogs(): void {
    this.executionLogs = [];
  }

  /**
   * Get execution statistics
   */
  getStats(): ExecutionStats {
    const stats: ExecutionStats = {
      totalExecutions: this.executionLogs.length,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      averageDuration: 0,
      byTool: {},
    };

    for (const log of this.executionLogs) {
      if (log.result.success) {
        stats.successfulExecutions++;
      } else {
        stats.failedExecutions++;
      }

      stats.totalDuration += log.duration;

      // Per-tool stats
      if (!stats.byTool[log.toolName]) {
        stats.byTool[log.toolName] = {
          executions: 0,
          successes: 0,
          failures: 0,
          avgDuration: 0,
        };
      }

      const toolStats = stats.byTool[log.toolName];
      toolStats.executions++;
      if (log.result.success) {
        toolStats.successes++;
      } else {
        toolStats.failures++;
      }
    }

    // Calculate averages
    if (stats.totalExecutions > 0) {
      stats.averageDuration = stats.totalDuration / stats.totalExecutions;

      for (const toolName of Object.keys(stats.byTool)) {
        const toolLogs = this.executionLogs.filter(l => l.toolName === toolName);
        const totalDuration = toolLogs.reduce((sum, l) => sum + l.duration, 0);
        stats.byTool[toolName].avgDuration = totalDuration / toolLogs.length;
      }
    }

    return stats;
  }

  /**
   * Get tool info
   */
  getToolInfo(): Array<{
    name: string;
    description: string;
    category: string;
    enabled: boolean;
  }> {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      enabled: tool.enabled,
    }));
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let registryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
  }
  return registryInstance;
}

export function resetToolRegistry(): void {
  registryInstance = null;
}

export default ToolRegistry;
