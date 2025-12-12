/**
 * MCP tRPC Router
 * Provides API endpoints for MCP functionality
 */

import { router, protectedProcedure } from '../../_core/trpc';
import { z } from 'zod';
import { getMCPServer } from '../../mcp';
import { TRPCError } from '@trpc/server';

/**
 * MCP Router
 * Exposes MCP tools and server management via tRPC
 */
export const mcpRouter = router({
  /**
   * Get MCP server status and health
   */
  status: protectedProcedure.query(async () => {
    try {
      const server = await getMCPServer();
      const health = await server.getHealthStatus();
      const metrics = server.getMetrics();

      return {
        healthy: health.healthy,
        metrics: health.metrics,
        serverMetrics: metrics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get MCP status',
      });
    }
  }),

  /**
   * List all available MCP tools
   */
  listTools: protectedProcedure.query(async () => {
    try {
      const server = await getMCPServer();
      const tools = await (server as any).toolRegistry?.listTools() || [];

      return {
        tools,
        count: tools.length,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list tools',
      });
    }
  }),

  /**
   * Execute a tool
   */
  executeTool: protectedProcedure
    .input(
      z.object({
        name: z.string().describe('Tool name in format: category/name'),
        arguments: z.record(z.unknown()).optional().describe('Tool arguments'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const server = await getMCPServer();
        const registry = (server as any).toolRegistry;

        if (!registry) {
          throw new Error('Tool registry not initialized');
        }

        const result = await registry.executeTool(
          input.name,
          input.arguments || {},
          {
            sessionId: ctx.req.sessionID,
            userId: ctx.user?.id,
          }
        );

        return {
          success: true,
          result,
          toolName: input.name,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Tool execution failed',
          cause: error,
        });
      }
    }),

  /**
   * File operations
   */
  file: router({
    /**
     * Read a file
     */
    read: protectedProcedure
      .input(
        z.object({
          path: z.string(),
          encoding: z.enum(['utf-8', 'base64', 'hex']).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('file/read', input, {
            sessionId: ctx.req.sessionID,
            userId: ctx.user?.id,
          });

          return result;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to read file',
          });
        }
      }),

    /**
     * Write a file
     */
    write: protectedProcedure
      .input(
        z.object({
          path: z.string(),
          content: z.string(),
          encoding: z.enum(['utf-8', 'base64', 'hex']).optional(),
          createDirectories: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('file/write', input, {
            sessionId: ctx.req.sessionID,
            userId: ctx.user?.id,
          });

          return result;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to write file',
          });
        }
      }),

    /**
     * List directory contents
     */
    list: protectedProcedure
      .input(
        z.object({
          path: z.string(),
          recursive: z.boolean().optional(),
          includeHidden: z.boolean().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('file/list', input, {
            sessionId: ctx.req.sessionID,
            userId: ctx.user?.id,
          });

          return result;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to list directory',
          });
        }
      }),
  }),

  /**
   * Shell operations
   */
  shell: router({
    /**
     * Execute a shell command
     */
    execute: protectedProcedure
      .input(
        z.object({
          command: z.string(),
          cwd: z.string().optional(),
          timeout: z.number().optional(),
          env: z.record(z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('shell/execute', input, {
            sessionId: ctx.req.sessionID,
            userId: ctx.user?.id,
          });

          return result;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Command execution failed',
          });
        }
      }),
  }),

  /**
   * Web operations
   */
  web: router({
    /**
     * Make HTTP request
     */
    request: protectedProcedure
      .input(
        z.object({
          url: z.string().url(),
          method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
          headers: z.record(z.string()).optional(),
          body: z.unknown().optional(),
          timeout: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('web/request', input, {
            sessionId: ctx.req.sessionID,
            userId: ctx.user?.id,
          });

          return result;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'HTTP request failed',
          });
        }
      }),

    /**
     * Fetch webpage
     */
    fetch: protectedProcedure
      .input(
        z.object({
          url: z.string().url(),
          extractText: z.boolean().optional(),
          timeout: z.number().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('web/fetch', input, {
            sessionId: ctx.req.sessionID,
            userId: ctx.user?.id,
          });

          return result;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch webpage',
          });
        }
      }),
  }),

  /**
   * Database operations
   */
  database: router({
    /**
     * Execute database query
     */
    query: protectedProcedure
      .input(
        z.object({
          query: z.string(),
          params: z.array(z.unknown()).optional(),
          limit: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('database/query', input, {
            sessionId: ctx.req.sessionID,
            userId: ctx.user?.id,
          });

          return result;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Database query failed',
          });
        }
      }),

    /**
     * List database tables
     */
    tables: protectedProcedure
      .input(
        z.object({
          schema: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('database/tables', input, {
            sessionId: ctx.req.sessionID,
            userId: ctx.user?.id,
          });

          return result;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to list tables',
          });
        }
      }),

    /**
     * Get table schema
     */
    schema: protectedProcedure
      .input(
        z.object({
          table: z.string(),
          schema: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('database/schema', input, {
            sessionId: ctx.req.sessionID,
            userId: ctx.user?.id,
          });

          return result;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get table schema',
          });
        }
      }),
  }),
});
