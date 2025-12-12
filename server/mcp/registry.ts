/**
 * MCP Tool Registry
 * Manages registration, discovery, and execution of MCP tools
 */

import type { MCPTool, ToolMetadata, ToolCategory } from './types';
import { MCPError, MCPMethodNotFoundError, MCPInvalidParamsError } from './errors';
import { EventEmitter } from 'events';

export interface ToolExecutionMetrics {
  totalInvocations: number;
  successfulInvocations: number;
  failedInvocations: number;
  averageExecutionTime: number;
  lastInvoked?: Date;
}

/**
 * Tool Registry for MCP
 * Handles tool registration, validation, and execution
 */
export class ToolRegistry extends EventEmitter {
  private tools = new Map<string, MCPTool>();
  private metadata = new Map<string, ToolMetadata>();
  private metrics = new Map<string, ToolExecutionMetrics>();
  private categories = new Set<ToolCategory>();

  constructor() {
    super();
  }

  /**
   * Register a new tool
   */
  register(tool: MCPTool, metadata?: ToolMetadata): void {
    // Validate tool
    this.validateTool(tool);

    if (this.tools.has(tool.name)) {
      throw new MCPError(`Tool already registered: ${tool.name}`);
    }

    // Register tool
    this.tools.set(tool.name, tool);

    // Register metadata
    if (metadata) {
      this.metadata.set(tool.name, metadata);
      this.categories.add(metadata.category);
    }

    // Initialize metrics
    this.metrics.set(tool.name, {
      totalInvocations: 0,
      successfulInvocations: 0,
      failedInvocations: 0,
      averageExecutionTime: 0,
    });

    this.emit('toolRegistered', { name: tool.name, metadata });
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): void {
    if (!this.tools.has(name)) {
      throw new MCPMethodNotFoundError(name);
    }

    this.tools.delete(name);
    this.metadata.delete(name);
    this.metrics.delete(name);

    this.emit('toolUnregistered', { name });
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  listTools(): Array<{ name: string; description: string; inputSchema: unknown }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: ToolCategory): MCPTool[] {
    const tools: MCPTool[] = [];

    for (const [name, meta] of this.metadata) {
      if (meta.category === category) {
        const tool = this.tools.get(name);
        if (tool) {
          tools.push(tool);
        }
      }
    }

    return tools;
  }

  /**
   * Execute a tool
   */
  async executeTool(name: string, input: unknown, context?: any): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new MCPMethodNotFoundError(name);
    }

    const startTime = Date.now();
    const metrics = this.metrics.get(name)!;

    try {
      // Validate input
      this.validateInput(tool, input);

      // Execute tool handler
      const result = await tool.handler(input, context);

      // Update success metrics
      const executionTime = Date.now() - startTime;
      metrics.totalInvocations++;
      metrics.successfulInvocations++;
      metrics.averageExecutionTime =
        (metrics.averageExecutionTime * (metrics.totalInvocations - 1) + executionTime) /
        metrics.totalInvocations;
      metrics.lastInvoked = new Date();

      this.emit('toolExecuted', { name, success: true, executionTime });

      return result;
    } catch (error) {
      // Update failure metrics
      const executionTime = Date.now() - startTime;
      metrics.totalInvocations++;
      metrics.failedInvocations++;
      metrics.averageExecutionTime =
        (metrics.averageExecutionTime * (metrics.totalInvocations - 1) + executionTime) /
        metrics.totalInvocations;
      metrics.lastInvoked = new Date();

      this.emit('toolExecuted', { name, success: false, error, executionTime });

      throw error;
    }
  }

  /**
   * Get tool metrics
   */
  getMetrics(name?: string): ToolExecutionMetrics | Map<string, ToolExecutionMetrics> {
    if (name) {
      const metrics = this.metrics.get(name);
      if (!metrics) {
        throw new MCPMethodNotFoundError(name);
      }
      return metrics;
    }

    return this.metrics;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTools: number;
    categories: ToolCategory[];
    totalInvocations: number;
    successRate: number;
  } {
    let totalInvocations = 0;
    let successfulInvocations = 0;

    for (const metrics of this.metrics.values()) {
      totalInvocations += metrics.totalInvocations;
      successfulInvocations += metrics.successfulInvocations;
    }

    return {
      totalTools: this.tools.size,
      categories: Array.from(this.categories),
      totalInvocations,
      successRate: totalInvocations > 0 ? (successfulInvocations / totalInvocations) * 100 : 0,
    };
  }

  /**
   * Validate tool definition
   */
  private validateTool(tool: MCPTool): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new MCPInvalidParamsError('Tool name must be a non-empty string');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new MCPInvalidParamsError('Tool description must be a non-empty string');
    }

    if (typeof tool.handler !== 'function') {
      throw new MCPInvalidParamsError('Tool handler must be a function');
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      throw new MCPInvalidParamsError('Tool inputSchema must be an object');
    }

    // Validate namespace format (category/name)
    if (!tool.name.includes('/')) {
      throw new MCPInvalidParamsError('Tool name must be in format: category/name');
    }
  }

  /**
   * Validate input against tool schema
   */
  private validateInput(tool: MCPTool, input: unknown): void {
    const schema = tool.inputSchema as any;

    if (schema.type === 'object' && schema.properties) {
      if (typeof input !== 'object' || input === null) {
        throw new MCPInvalidParamsError('Input must be an object');
      }

      const inputObj = input as Record<string, unknown>;

      // Check required properties
      if (schema.required && Array.isArray(schema.required)) {
        for (const prop of schema.required) {
          if (!(prop in inputObj)) {
            throw new MCPInvalidParamsError(`Missing required property: ${prop}`);
          }
        }
      }
    }
  }
}
