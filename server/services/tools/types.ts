/**
 * Base Tool Types and Interfaces
 * Defines the contract for all agent tools
 */

export interface ToolExecutionContext {
  userId: number;
  sessionId: string;
  executionId?: number;
  workingDirectory?: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      default?: unknown;
    }>;
    required: string[];
  };
}

/**
 * Base Tool Interface
 * All tools must implement this interface
 */
export interface ITool {
  /** Unique tool name */
  name: string;

  /** Human-readable description */
  description: string;

  /** Tool category for organization */
  category: 'shell' | 'file' | 'browser' | 'database' | 'api' | 'custom' | 'collection';

  /** Whether tool is currently enabled */
  enabled: boolean;

  /** Get tool definition for AI model */
  getDefinition(): ToolDefinition;

  /** Execute the tool with given parameters */
  execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult>;

  /** Validate parameters before execution */
  validate?(params: Record<string, unknown>): { valid: boolean; errors?: string[] };
}

/**
 * Tool execution log entry
 */
export interface ToolExecutionLog {
  id?: number;
  executionId: number;
  toolName: string;
  parameters: Record<string, unknown>;
  result: ToolResult;
  startedAt: Date;
  completedAt: Date;
  duration: number;
}

/**
 * Shell command options
 */
export interface ShellCommandOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

/**
 * File operation options
 */
export interface FileOperationOptions {
  encoding?: BufferEncoding;
  createDirectories?: boolean;
  backup?: boolean;
}
