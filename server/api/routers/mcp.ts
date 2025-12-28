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
        arguments: z.record(z.string(), z.unknown()).optional().describe('Tool arguments'),
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
          input.arguments || {}
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

          const result = await registry.executeTool('file/read', input);

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

          const result = await registry.executeTool('file/write', input);

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

          const result = await registry.executeTool('file/list', input);

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
          env: z.record(z.string(), z.string()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('shell/execute', input);

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
          headers: z.record(z.string(), z.string()).optional(),
          body: z.unknown().optional(),
          timeout: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).toolRegistry;

          const result = await registry.executeTool('web/request', input);

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

          const result = await registry.executeTool('web/fetch', input);

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
   * Resources operations
   */
  resources: router({
    /**
     * List all available resources
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        const server = await getMCPServer();
        const registry = (server as any).resourceRegistry;

        if (!registry) {
          throw new Error('Resource registry not initialized');
        }

        const resources = await registry.listResources({
          sessionId: ctx.user?.id,
          userId: ctx.user?.id,
        });

        return {
          resources,
          count: resources.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list resources',
        });
      }
    }),

    /**
     * Read a resource
     */
    read: protectedProcedure
      .input(
        z.object({
          uri: z.string().describe('Resource URI to read'),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).resourceRegistry;

          if (!registry) {
            throw new Error('Resource registry not initialized');
          }

          const content = await registry.readResource(input.uri, {
            sessionId: ctx.user?.id,
            userId: ctx.user?.id,
          });

          return content;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to read resource',
          });
        }
      }),

    /**
     * Check if resource exists
     */
    exists: protectedProcedure
      .input(
        z.object({
          uri: z.string().describe('Resource URI to check'),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).resourceRegistry;

          if (!registry) {
            throw new Error('Resource registry not initialized');
          }

          const exists = await registry.hasResource(input.uri, {
            sessionId: ctx.user?.id,
            userId: ctx.user?.id,
          });

          return { exists };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to check resource',
          });
        }
      }),
  }),

  /**
   * Prompts operations
   */
  prompts: router({
    /**
     * List all available prompts
     */
    list: protectedProcedure.query(async () => {
      try {
        const server = await getMCPServer();
        const registry = (server as any).promptRegistry;

        if (!registry) {
          throw new Error('Prompt registry not initialized');
        }

        const prompts = registry.listPrompts();

        return {
          prompts,
          count: prompts.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list prompts',
        });
      }
    }),

    /**
     * Get a prompt with arguments
     */
    get: protectedProcedure
      .input(
        z.object({
          name: z.string().describe('Prompt name'),
          arguments: z.record(z.string(), z.string()).optional().describe('Prompt arguments'),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const server = await getMCPServer();
          const registry = (server as any).promptRegistry;

          if (!registry) {
            throw new Error('Prompt registry not initialized');
          }

          const result = await registry.getPromptWithArguments(
            input.name,
            input.arguments || {},
            {
              sessionId: ctx.user?.id,
              userId: ctx.user?.id,
            }
          );

          return result;
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get prompt',
          });
        }
      }),
  }),

  /**
   * Tenant Memory operations
   */
  memory: router({
    /**
     * Set a value in tenant memory
     */
    set: protectedProcedure
      .input(
        z.object({
          namespace: z.string().describe('Memory namespace'),
          key: z.string().describe('Memory key'),
          value: z.unknown().describe('Value to store'),
          ttl: z.number().optional().describe('Time to live in seconds'),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const { getTenantMemoryService } = await import('../../../server/mcp/tenant-memory');
          const memoryService = getTenantMemoryService();

          await memoryService.set(input.namespace, input.key, input.value, {
            ttl: input.ttl,
            metadata: input.metadata,
          });

          return {
            success: true,
            namespace: input.namespace,
            key: input.key,
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to set memory value',
          });
        }
      }),

    /**
     * Get a value from tenant memory
     */
    get: protectedProcedure
      .input(
        z.object({
          namespace: z.string().describe('Memory namespace'),
          key: z.string().describe('Memory key'),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const { getTenantMemoryService } = await import('../../../server/mcp/tenant-memory');
          const memoryService = getTenantMemoryService();

          const value = await memoryService.get(input.namespace, input.key);

          return {
            value,
            found: value !== null,
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get memory value',
          });
        }
      }),

    /**
     * Delete a value from tenant memory
     */
    delete: protectedProcedure
      .input(
        z.object({
          namespace: z.string().describe('Memory namespace'),
          key: z.string().describe('Memory key'),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const { getTenantMemoryService } = await import('../../../server/mcp/tenant-memory');
          const memoryService = getTenantMemoryService();

          const deleted = await memoryService.delete(input.namespace, input.key);

          return {
            success: deleted,
            namespace: input.namespace,
            key: input.key,
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to delete memory value',
          });
        }
      }),

    /**
     * List keys in a namespace
     */
    list: protectedProcedure
      .input(
        z.object({
          namespace: z.string().describe('Memory namespace'),
          limit: z.number().optional().describe('Maximum number of keys to return'),
          offset: z.number().optional().describe('Offset for pagination'),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const { getTenantMemoryService } = await import('../../../server/mcp/tenant-memory');
          const memoryService = getTenantMemoryService();

          const keys = await memoryService.list(input.namespace, {
            limit: input.limit,
            offset: input.offset,
          });

          return {
            keys,
            count: keys.length,
            namespace: input.namespace,
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to list memory keys',
          });
        }
      }),

    /**
     * Clear all keys in a namespace
     */
    clear: protectedProcedure
      .input(
        z.object({
          namespace: z.string().describe('Memory namespace to clear'),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const { getTenantMemoryService } = await import('../../../server/mcp/tenant-memory');
          const memoryService = getTenantMemoryService();

          const deletedCount = await memoryService.clear(input.namespace);

          return {
            success: true,
            namespace: input.namespace,
            deletedCount,
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to clear namespace',
          });
        }
      }),

    /**
     * Get usage statistics
     */
    usage: protectedProcedure.query(async ({ ctx }) => {
      try {
        const { getTenantMemoryService } = await import('../../../server/mcp/tenant-memory');
        const memoryService = getTenantMemoryService();

        const usage = await memoryService.getUsage();

        return usage;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get usage statistics',
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

          const result = await registry.executeTool('database/query', input);

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

          const result = await registry.executeTool('database/tables', input);

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

          const result = await registry.executeTool('database/schema', input);

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
