/**
 * Tools tRPC Router
 * Provides comprehensive tool execution capabilities for the GHL Agency AI project
 *
 * Features:
 * - List available tools by category (browser, file, shell, web, database)
 * - Execute tools with parameters and timeout support
 * - Track tool execution status and history
 * - Cancel running tool executions
 * - Get tool execution metrics and statistics
 * - Rate limiting consideration
 */

import { router, protectedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getMCPServer } from '../../mcp';
import { TRPCError } from '@trpc/server';
import type { ToolCategory } from '../../mcp/types';
import { getAgentPermissionsService, PermissionDeniedError } from '../../services/agentPermissions.service';

// ========================================
// VALIDATION SCHEMAS
// ========================================

const listToolsSchema = z.object({
  category: z.enum(['browser', 'file', 'shell', 'web', 'database', 'ai', 'system', 'workflow', 'memory', 'agent']).optional(),
  tags: z.array(z.string()).optional(),
  includeDeprecated: z.boolean().default(false),
  search: z.string().optional().describe('Search tools by name or description'),
});

const executeToolSchema = z.object({
  name: z.string().min(1).describe('Tool name in format: category/name'),
  arguments: z.record(z.string(), z.unknown()).optional().describe('Tool arguments'),
  timeout: z.number().int().min(1000).max(300000).optional().describe('Execution timeout in milliseconds (1s - 5min)'),
  context: z.object({
    sessionId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

const getToolStatusSchema = z.object({
  executionId: z.string().min(1).describe('Tool execution ID'),
});

const cancelToolExecutionSchema = z.object({
  executionId: z.string().min(1).describe('Tool execution ID to cancel'),
});

const getToolHistorySchema = z.object({
  toolName: z.string().optional().describe('Filter by specific tool name'),
  category: z.enum(['browser', 'file', 'shell', 'web', 'database', 'ai', 'system', 'workflow', 'memory', 'agent']).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  status: z.enum(['success', 'failed', 'running', 'cancelled']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const getToolMetricsSchema = z.object({
  toolName: z.string().optional().describe('Get metrics for specific tool, or all tools if omitted'),
});

// ========================================
// TOOL EXECUTION STATE MANAGEMENT
// ========================================

interface ToolExecution {
  id: string;
  toolName: string;
  category: ToolCategory;
  arguments: Record<string, unknown>;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  result?: unknown;
  error?: string;
  userId: string;
  sessionId?: string;
  executionTime?: number;
  metadata?: Record<string, unknown>;
}

// In-memory execution tracking (consider moving to Redis for production)
const activeExecutions = new Map<string, ToolExecution>();
const executionHistory: ToolExecution[] = [];
const MAX_HISTORY_SIZE = 1000;

// Abort controllers for cancellation
const abortControllers = new Map<string, AbortController>();

/**
 * Generate unique execution ID
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Add execution to history with size limit
 */
function addToHistory(execution: ToolExecution): void {
  executionHistory.unshift(execution);

  // Trim history if exceeds max size
  if (executionHistory.length > MAX_HISTORY_SIZE) {
    executionHistory.pop();
  }
}

/**
 * Extract category from tool name
 */
function extractCategory(toolName: string): ToolCategory {
  const parts = toolName.split('/');
  return parts[0] as ToolCategory;
}

// ========================================
// ROUTER DEFINITION
// ========================================

export const toolsRouter = router({
  /**
   * List all available tools with optional filtering
   */
  listTools: protectedProcedure
    .input(listToolsSchema.optional())
    .query(async ({ input, ctx }) => {
      try {
        const server = await getMCPServer();
        const registry = (server as any).toolRegistry;

        if (!registry) {
          throw new Error('Tool registry not initialized');
        }

        // Get all tools
        let tools = await registry.listTools();

        // Apply category filter
        if (input?.category) {
          const categoryTools = await registry.getToolsByCategory(input.category);
          tools = categoryTools.map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          }));
        }

        // Apply search filter
        if (input?.search) {
          const searchLower = input.search.toLowerCase();
          tools = tools.filter((tool: any) =>
            tool.name.toLowerCase().includes(searchLower) ||
            tool.description.toLowerCase().includes(searchLower)
          );
        }

        // Group tools by category
        const categorizedTools: Record<string, any[]> = {
          browser: [],
          file: [],
          shell: [],
          web: [],
          database: [],
          ai: [],
          system: [],
          workflow: [],
          memory: [],
          agent: [],
        };

        tools.forEach((tool: any) => {
          const category = extractCategory(tool.name);
          if (categorizedTools[category]) {
            categorizedTools[category].push(tool);
          }
        });

        return {
          success: true,
          tools,
          categorizedTools,
          totalCount: tools.length,
          categories: Object.keys(categorizedTools).filter(
            (cat) => categorizedTools[cat].length > 0
          ),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list tools',
        });
      }
    }),

  /**
   * Execute a tool with parameters and optional timeout
   */
  executeTool: protectedProcedure
    .input(executeToolSchema)
    .mutation(async ({ input, ctx }) => {
      const executionId = generateExecutionId();
      const userId = ctx.user.id.toString();
      const category = extractCategory(input.name);

      // Create abort controller for cancellation support
      const abortController = new AbortController();
      abortControllers.set(executionId, abortController);

      // Initialize execution record
      const execution: ToolExecution = {
        id: executionId,
        toolName: input.name,
        category,
        arguments: input.arguments || {},
        status: 'running',
        startTime: new Date(),
        userId,
        sessionId: input.context?.sessionId,
        metadata: input.context?.metadata,
      };

      activeExecutions.set(executionId, execution);

      try {
        // SECURITY: Check permission before executing tool
        const permissionsService = getAgentPermissionsService();
        try {
          await permissionsService.requirePermission(ctx.user.id, input.name);
        } catch (error) {
          if (error instanceof PermissionDeniedError) {
            // Update execution record with permission error
            const endTime = new Date();
            execution.status = 'failed';
            execution.endTime = endTime;
            execution.error = error.message;
            execution.executionTime = endTime.getTime() - execution.startTime.getTime();

            activeExecutions.delete(executionId);
            abortControllers.delete(executionId);
            addToHistory(execution);

            throw new TRPCError({
              code: 'FORBIDDEN',
              message: error.message,
              cause: error,
            });
          }
          throw error;
        }

        const server = await getMCPServer();
        const registry = (server as any).toolRegistry;

        if (!registry) {
          throw new Error('Tool registry not initialized');
        }

        // Execute tool with timeout
        const executionPromise = registry.executeTool(
          input.name,
          input.arguments || {},
          {
            sessionId: input.context?.sessionId || `session_${Date.now()}`,
            userId: ctx.user.id,
            ...input.context,
          }
        );

        let result: unknown;

        if (input.timeout) {
          // Execute with timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              abortController.abort();
              reject(new Error(`Tool execution timed out after ${input.timeout}ms`));
            }, input.timeout);
          });

          // Race between execution and timeout
          result = await Promise.race([executionPromise, timeoutPromise]);
        } else {
          result = await executionPromise;
        }

        // Update execution record
        const endTime = new Date();
        const executionTime = endTime.getTime() - execution.startTime.getTime();

        execution.status = 'success';
        execution.endTime = endTime;
        execution.result = result;
        execution.executionTime = executionTime;

        // Move to history
        activeExecutions.delete(executionId);
        abortControllers.delete(executionId);
        addToHistory(execution);

        return {
          success: true,
          executionId,
          result,
          toolName: input.name,
          executionTime,
          timestamp: endTime,
        };
      } catch (error) {
        // Update execution record with error
        const endTime = new Date();
        const executionTime = endTime.getTime() - execution.startTime.getTime();

        execution.status = abortController.signal.aborted ? 'cancelled' : 'failed';
        execution.endTime = endTime;
        execution.error = error instanceof Error ? error.message : 'Unknown error';
        execution.executionTime = executionTime;

        // Move to history
        activeExecutions.delete(executionId);
        abortControllers.delete(executionId);
        addToHistory(execution);

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Tool execution failed',
          cause: error,
        });
      }
    }),

  /**
   * Get the status of a tool execution
   */
  getToolStatus: protectedProcedure
    .input(getToolStatusSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id.toString();

      // Check active executions first
      const activeExecution = activeExecutions.get(input.executionId);
      if (activeExecution) {
        // Verify user owns this execution
        if (activeExecution.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this execution',
          });
        }

        return {
          success: true,
          execution: {
            id: activeExecution.id,
            toolName: activeExecution.toolName,
            category: activeExecution.category,
            status: activeExecution.status,
            startTime: activeExecution.startTime,
            executionTime: Date.now() - activeExecution.startTime.getTime(),
          },
        };
      }

      // Check history
      const historicalExecution = executionHistory.find((e) => e.id === input.executionId);
      if (historicalExecution) {
        // Verify user owns this execution
        if (historicalExecution.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this execution',
          });
        }

        return {
          success: true,
          execution: {
            id: historicalExecution.id,
            toolName: historicalExecution.toolName,
            category: historicalExecution.category,
            status: historicalExecution.status,
            startTime: historicalExecution.startTime,
            endTime: historicalExecution.endTime,
            executionTime: historicalExecution.executionTime,
            result: historicalExecution.result,
            error: historicalExecution.error,
          },
        };
      }

      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tool execution not found',
      });
    }),

  /**
   * Cancel a running tool execution
   */
  cancelToolExecution: protectedProcedure
    .input(cancelToolExecutionSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id.toString();

      const execution = activeExecutions.get(input.executionId);
      if (!execution) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tool execution not found or already completed',
        });
      }

      // Verify user owns this execution
      if (execution.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to cancel this execution',
        });
      }

      // Abort the execution
      const abortController = abortControllers.get(input.executionId);
      if (abortController) {
        abortController.abort();
      }

      // Update execution status
      const endTime = new Date();
      execution.status = 'cancelled';
      execution.endTime = endTime;
      execution.executionTime = endTime.getTime() - execution.startTime.getTime();
      execution.error = 'Execution cancelled by user';

      // Move to history
      activeExecutions.delete(input.executionId);
      abortControllers.delete(input.executionId);
      addToHistory(execution);

      return {
        success: true,
        executionId: input.executionId,
        message: 'Tool execution cancelled',
        timestamp: endTime,
      };
    }),

  /**
   * Get tool execution history with filtering
   */
  getToolHistory: protectedProcedure
    .input(getToolHistorySchema.optional())
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id.toString();
      const params = input || { limit: 50, offset: 0 };

      // Filter history for current user
      let filteredHistory = executionHistory.filter((e) => e.userId === userId);

      // Apply filters
      if (params.toolName) {
        filteredHistory = filteredHistory.filter((e) => e.toolName === params.toolName);
      }

      if (params.category) {
        filteredHistory = filteredHistory.filter((e) => e.category === params.category);
      }

      if (params.status) {
        filteredHistory = filteredHistory.filter((e) => e.status === params.status);
      }

      if (params.startDate) {
        filteredHistory = filteredHistory.filter(
          (e) => e.startTime >= params.startDate!
        );
      }

      if (params.endDate) {
        filteredHistory = filteredHistory.filter(
          (e) => e.startTime <= params.endDate!
        );
      }

      // Apply pagination
      const totalCount = filteredHistory.length;
      const paginatedHistory = filteredHistory.slice(
        params.offset,
        params.offset + params.limit
      );

      // Calculate statistics
      const stats = {
        total: totalCount,
        success: filteredHistory.filter((e) => e.status === 'success').length,
        failed: filteredHistory.filter((e) => e.status === 'failed').length,
        cancelled: filteredHistory.filter((e) => e.status === 'cancelled').length,
        averageExecutionTime:
          filteredHistory.reduce((sum, e) => sum + (e.executionTime || 0), 0) /
          (filteredHistory.length || 1),
      };

      return {
        success: true,
        executions: paginatedHistory,
        totalCount,
        limit: params.limit,
        offset: params.offset,
        stats,
      };
    }),

  /**
   * Get tool execution metrics and statistics
   */
  getToolMetrics: protectedProcedure
    .input(getToolMetricsSchema.optional())
    .query(async ({ input, ctx }) => {
      try {
        const server = await getMCPServer();
        const registry = (server as any).toolRegistry;

        if (!registry) {
          throw new Error('Tool registry not initialized');
        }

        // Get metrics from registry
        const registryMetrics = registry.getMetrics(input?.toolName);

        // Get active executions count
        const activeExecutionsCount = activeExecutions.size;

        // Get user-specific history stats
        const userId = ctx.user.id.toString();
        const userHistory = executionHistory.filter((e) => e.userId === userId);

        const userStats = {
          totalExecutions: userHistory.length,
          successfulExecutions: userHistory.filter((e) => e.status === 'success').length,
          failedExecutions: userHistory.filter((e) => e.status === 'failed').length,
          cancelledExecutions: userHistory.filter((e) => e.status === 'cancelled').length,
          averageExecutionTime:
            userHistory.reduce((sum, e) => sum + (e.executionTime || 0), 0) /
            (userHistory.length || 1),
        };

        // Get category breakdown
        const categoryStats: Record<string, number> = {};
        userHistory.forEach((e) => {
          categoryStats[e.category] = (categoryStats[e.category] || 0) + 1;
        });

        // Get tool usage breakdown
        const toolUsageStats: Record<string, number> = {};
        userHistory.forEach((e) => {
          toolUsageStats[e.toolName] = (toolUsageStats[e.toolName] || 0) + 1;
        });

        // Get most used tools
        const mostUsedTools = Object.entries(toolUsageStats)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([tool, count]) => ({ tool, count }));

        return {
          success: true,
          registryMetrics: input?.toolName ? registryMetrics : {
            totalTools: (registryMetrics as Map<string, any>).size,
          },
          activeExecutions: activeExecutionsCount,
          userStats,
          categoryStats,
          toolUsageStats,
          mostUsedTools,
          timestamp: new Date(),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get metrics',
        });
      }
    }),

  /**
   * Get currently active tool executions
   */
  getActiveExecutions: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id.toString();

      // Filter active executions for current user
      const userActiveExecutions = Array.from(activeExecutions.values())
        .filter((e) => e.userId === userId)
        .map((e) => ({
          id: e.id,
          toolName: e.toolName,
          category: e.category,
          status: e.status,
          startTime: e.startTime,
          runningTime: Date.now() - e.startTime.getTime(),
        }));

      return {
        success: true,
        executions: userActiveExecutions,
        count: userActiveExecutions.length,
      };
    }),

  /**
   * Get tool details by name
   */
  getToolDetails: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        const server = await getMCPServer();
        const registry = (server as any).toolRegistry;

        if (!registry) {
          throw new Error('Tool registry not initialized');
        }

        const tool = registry.getTool(input.name);
        if (!tool) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Tool not found: ${input.name}`,
          });
        }

        // Get tool metrics
        const metrics = registry.getMetrics(input.name);

        // Get user-specific usage stats
        const userId = ctx.user.id.toString();
        const userExecutions = executionHistory.filter(
          (e) => e.userId === userId && e.toolName === input.name
        );

        const userStats = {
          totalExecutions: userExecutions.length,
          successfulExecutions: userExecutions.filter((e) => e.status === 'success').length,
          failedExecutions: userExecutions.filter((e) => e.status === 'failed').length,
          lastExecuted: userExecutions[0]?.startTime,
          averageExecutionTime:
            userExecutions.reduce((sum, e) => sum + (e.executionTime || 0), 0) /
            (userExecutions.length || 1),
        };

        return {
          success: true,
          tool: {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            category: extractCategory(tool.name),
          },
          metrics,
          userStats,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get tool details',
        });
      }
    }),
});
