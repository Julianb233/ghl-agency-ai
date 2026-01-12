/**
 * Agent/AI Tools for MCP
 * Provides agent execution and memory operations
 */

import type { MCPTool, MCPContext } from '../types';

// In-memory storage for agent tasks and memory (can be replaced with persistent storage)
const agentTasks = new Map<string, {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  task: string;
  context?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}>();

const agentMemory = new Map<string, {
  key: string;
  value: unknown;
  namespace: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}>();

/**
 * Execute agent task tool
 */
export const agentExecuteTool: MCPTool = {
  name: 'agent/execute',
  description: 'Execute an agent task with optional context. Returns a task ID for tracking.',
  inputSchema: {
    type: 'object',
    properties: {
      task: {
        type: 'string',
        description: 'The task description or prompt for the agent to execute',
      },
      context: {
        type: 'object',
        description: 'Optional context data for the task execution',
      },
      async: {
        type: 'boolean',
        default: true,
        description: 'Whether to run the task asynchronously (returns immediately with task ID)',
      },
      timeout: {
        type: 'number',
        default: 30000,
        description: 'Timeout in milliseconds for synchronous execution',
      },
    },
    required: ['task'],
  },
  handler: async (input: any, context?: MCPContext) => {
    const { task, context: taskContext, async: isAsync = true, timeout = 30000 } = input;

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const taskRecord: {
      id: string;
      status: 'pending' | 'running' | 'completed' | 'failed';
      task: string;
      context?: Record<string, unknown>;
      result?: unknown;
      error?: string;
      startedAt?: Date;
      completedAt?: Date;
      createdAt: Date;
    } = {
      id: taskId,
      status: 'pending',
      task,
      context: taskContext,
      createdAt: new Date(),
    };

    agentTasks.set(taskId, taskRecord);

    if (isAsync) {
      // Start async execution
      setTimeout(() => {
        const record = agentTasks.get(taskId);
        if (record) {
          record.status = 'running';
          record.startedAt = new Date();
          
          // Simulate task execution
          setTimeout(() => {
            const r = agentTasks.get(taskId);
            if (r) {
              r.status = 'completed';
              r.completedAt = new Date();
              r.result = {
                message: `Task "${task}" completed successfully`,
                executionTime: Date.now() - r.startedAt!.getTime(),
              };
            }
          }, 1000);
        }
      }, 0);

      return {
        taskId,
        status: 'pending',
        message: 'Task queued for execution',
      };
    } else {
      // Synchronous execution
      taskRecord.status = 'running';
      taskRecord.startedAt = new Date();
      
      // Simulate synchronous task execution
      await new Promise(resolve => setTimeout(resolve, 500));
      
      taskRecord.status = 'completed';
      taskRecord.completedAt = new Date();
      taskRecord.result = {
        message: `Task "${task}" completed successfully`,
        executionTime: Date.now() - taskRecord.startedAt.getTime(),
      };

      return {
        taskId,
        status: 'completed',
        result: taskRecord.result,
      };
    }
  },
};

/**
 * Get agent task status tool
 */
export const agentStatusTool: MCPTool = {
  name: 'agent/status',
  description: 'Get the current status of an agent task by its ID',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID returned from agent/execute',
      },
    },
    required: ['taskId'],
  },
  handler: async (input: any) => {
    const { taskId } = input;

    const task = agentTasks.get(taskId);

    if (!task) {
      return {
        error: 'Task not found',
        taskId,
      };
    }

    return {
      taskId: task.id,
      status: task.status,
      task: task.task,
      context: task.context,
      result: task.result,
      error: task.error,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      duration: task.completedAt && task.startedAt
        ? task.completedAt.getTime() - task.startedAt.getTime()
        : null,
    };
  },
};

/**
 * Store to agent memory tool
 */
export const memoryStoreTool: MCPTool = {
  name: 'memory/store',
  description: 'Store a value in agent memory with a key and optional namespace',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'The key to store the value under',
      },
      value: {
        type: ['string', 'number', 'boolean', 'object', 'array'],
        description: 'The value to store (can be any JSON-serializable type)',
      },
      namespace: {
        type: 'string',
        default: 'default',
        description: 'Optional namespace for organizing memory entries',
      },
      metadata: {
        type: 'object',
        description: 'Optional metadata to associate with the entry',
      },
      ttl: {
        type: 'number',
        description: 'Time-to-live in milliseconds (optional)',
      },
    },
    required: ['key', 'value'],
  },
  handler: async (input: any, context?: MCPContext) => {
    const { key, value, namespace = 'default', metadata, ttl } = input;

    const memoryKey = `${namespace}:${key}`;
    const now = new Date();
    
    const existing = agentMemory.get(memoryKey);
    
    const entry = {
      key,
      value,
      namespace,
      metadata,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      expiresAt: ttl ? new Date(now.getTime() + ttl) : undefined,
    };

    agentMemory.set(memoryKey, entry);

    return {
      success: true,
      key,
      namespace,
      created: !existing,
      expiresAt: entry.expiresAt,
    };
  },
};

/**
 * Retrieve from agent memory tool
 */
export const memoryRetrieveTool: MCPTool = {
  name: 'memory/retrieve',
  description: 'Retrieve a value from agent memory by key and optional namespace',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'The key to retrieve the value for',
      },
      namespace: {
        type: 'string',
        default: 'default',
        description: 'The namespace to search in',
      },
      includeMetadata: {
        type: 'boolean',
        default: false,
        description: 'Whether to include metadata in the response',
      },
    },
    required: ['key'],
  },
  handler: async (input: any) => {
    const { key, namespace = 'default', includeMetadata = false } = input;

    const memoryKey = `${namespace}:${key}`;
    const entry = agentMemory.get(memoryKey);

    if (!entry) {
      return {
        found: false,
        key,
        namespace,
        value: null,
      };
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      agentMemory.delete(memoryKey);
      return {
        found: false,
        key,
        namespace,
        value: null,
        expired: true,
      };
    }

    const response: any = {
      found: true,
      key,
      namespace,
      value: entry.value,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };

    if (includeMetadata) {
      response.metadata = entry.metadata;
    }

    if (entry.expiresAt) {
      response.expiresAt = entry.expiresAt;
      response.ttlRemaining = entry.expiresAt.getTime() - Date.now();
    }

    return response;
  },
};

/**
 * List agent memory keys tool
 */
export const memoryListTool: MCPTool = {
  name: 'memory/list',
  description: 'List all keys in agent memory, optionally filtered by namespace',
  inputSchema: {
    type: 'object',
    properties: {
      namespace: {
        type: 'string',
        description: 'Filter by namespace (optional, returns all if not specified)',
      },
      pattern: {
        type: 'string',
        description: 'Filter keys by pattern (simple substring match)',
      },
      limit: {
        type: 'number',
        default: 100,
        description: 'Maximum number of keys to return',
      },
    },
  },
  handler: async (input: any) => {
    const { namespace, pattern, limit = 100 } = input;

    const entries: Array<{
      key: string;
      namespace: string;
      createdAt: Date;
      updatedAt: Date;
      hasExpiry: boolean;
    }> = [];

    for (const [memoryKey, entry] of agentMemory.entries()) {
      // Check expiry
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        agentMemory.delete(memoryKey);
        continue;
      }

      // Filter by namespace
      if (namespace && entry.namespace !== namespace) {
        continue;
      }

      // Filter by pattern
      if (pattern && !entry.key.includes(pattern)) {
        continue;
      }

      entries.push({
        key: entry.key,
        namespace: entry.namespace,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        hasExpiry: !!entry.expiresAt,
      });

      if (entries.length >= limit) {
        break;
      }
    }

    return {
      count: entries.length,
      entries,
      hasMore: entries.length >= limit,
    };
  },
};

/**
 * Delete from agent memory tool
 */
export const memoryDeleteTool: MCPTool = {
  name: 'memory/delete',
  description: 'Delete a value from agent memory by key and namespace',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'The key to delete',
      },
      namespace: {
        type: 'string',
        default: 'default',
        description: 'The namespace of the key',
      },
    },
    required: ['key'],
  },
  handler: async (input: any) => {
    const { key, namespace = 'default' } = input;

    const memoryKey = `${namespace}:${key}`;
    const existed = agentMemory.has(memoryKey);
    
    agentMemory.delete(memoryKey);

    return {
      deleted: existed,
      key,
      namespace,
    };
  },
};

/**
 * Get all agent tools
 */
export function getAgentTools(): MCPTool[] {
  return [
    agentExecuteTool,
    agentStatusTool,
    memoryStoreTool,
    memoryRetrieveTool,
    memoryListTool,
    memoryDeleteTool,
  ];
}
