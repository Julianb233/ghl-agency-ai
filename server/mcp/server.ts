/**
 * MCP Server Implementation
 * Core server for Model Context Protocol
 */

import type {
  MCPConfig,
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPSession,
  MCPProtocolVersion,
  MCPCapabilities,
  MCPMetrics,
  ITransport,
} from './types';
import { MCPError as MCPErrorClass, MCPMethodNotFoundError, MCPNotInitializedError } from './errors';
import { ToolRegistry } from './registry';
import { HttpTransport, StdioTransport } from './transport';
import { platform, arch } from 'node:os';
import { performance } from 'node:perf_hooks';

export interface IMCPServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  registerTool(tool: any, metadata?: any): void;
  getHealthStatus(): Promise<{ healthy: boolean; error?: string; metrics?: Record<string, number> }>;
  getMetrics(): MCPMetrics;
}

/**
 * MCP Server
 * Implements the Model Context Protocol server
 */
export class MCPServer implements IMCPServer {
  private transport: ITransport;
  private toolRegistry: ToolRegistry;
  private running = false;
  private currentSession?: MCPSession;
  private sessions = new Map<string, MCPSession>();

  private readonly serverInfo = {
    name: 'GHL Agency AI MCP Server',
    version: '1.0.0',
  };

  private readonly supportedProtocolVersion: MCPProtocolVersion = {
    major: 2024,
    minor: 11,
    patch: 5,
  };

  private readonly serverCapabilities: MCPCapabilities = {
    logging: {
      level: 'info',
    },
    tools: {
      listChanged: true,
    },
    resources: {
      listChanged: false,
      subscribe: false,
    },
    prompts: {
      listChanged: false,
    },
  };

  private requestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
  };

  constructor(private config: MCPConfig) {
    // Initialize transport
    this.transport = this.createTransport();

    // Initialize tool registry
    this.toolRegistry = new ToolRegistry();
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new MCPErrorClass('MCP server already running');
    }

    console.log('[MCP] Starting MCP server...', { transport: this.config.transport });

    try {
      // Set up request handler
      this.transport.onRequest(async (request) => {
        return await this.handleRequest(request);
      });

      // Start transport
      await this.transport.start();

      // Register built-in tools
      await this.registerBuiltInTools();

      this.running = true;
      console.log('[MCP] MCP server started successfully');
    } catch (error) {
      console.error('[MCP] Failed to start MCP server', error);
      throw new MCPErrorClass('Failed to start MCP server', undefined, { error });
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    console.log('[MCP] Stopping MCP server...');

    try {
      // Stop transport
      await this.transport.stop();

      // Clean up all sessions
      this.sessions.clear();
      this.currentSession = undefined;

      this.running = false;
      console.log('[MCP] MCP server stopped');
    } catch (error) {
      console.error('[MCP] Error stopping MCP server', error);
      throw error;
    }
  }

  registerTool(tool: any, metadata?: any): void {
    this.toolRegistry.register(tool, metadata);
    console.log('[MCP] Tool registered', { name: tool.name });
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    error?: string;
    metrics?: Record<string, number>;
  }> {
    try {
      const transportHealth = await this.transport.getHealthStatus();
      const stats = this.toolRegistry.getStats();

      const metrics: Record<string, number> = {
        registeredTools: stats.totalTools,
        totalRequests: this.requestMetrics.totalRequests,
        successfulRequests: this.requestMetrics.successfulRequests,
        failedRequests: this.requestMetrics.failedRequests,
        averageResponseTime:
          this.requestMetrics.totalRequests > 0
            ? this.requestMetrics.totalResponseTime / this.requestMetrics.totalRequests
            : 0,
        activeSessions: this.sessions.size,
        toolInvocations: stats.totalInvocations,
        ...transportHealth.metrics,
      };

      return {
        healthy: this.running && transportHealth.healthy,
        metrics,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getMetrics(): MCPMetrics {
    const stats = this.toolRegistry.getStats();

    return {
      totalRequests: this.requestMetrics.totalRequests,
      successfulRequests: this.requestMetrics.successfulRequests,
      failedRequests: this.requestMetrics.failedRequests,
      averageResponseTime:
        this.requestMetrics.totalRequests > 0
          ? this.requestMetrics.totalResponseTime / this.requestMetrics.totalRequests
          : 0,
      activeSessions: this.sessions.size,
      toolInvocations: {},
      errors: {},
      lastReset: new Date(),
    };
  }

  private async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const startTime = performance.now();

    console.log('[MCP] Handling request', {
      id: request.id,
      method: request.method,
    });

    try {
      this.requestMetrics.totalRequests++;

      // Handle initialization request separately
      if (request.method === 'initialize') {
        const response = await this.handleInitialize(request);
        this.requestMetrics.successfulRequests++;
        this.requestMetrics.totalResponseTime += performance.now() - startTime;
        return response;
      }

      // Get or create session
      const session = this.getOrCreateSession();

      // Check if session is initialized
      if (!session.isInitialized) {
        throw new MCPNotInitializedError();
      }

      // Route request based on method
      let result: unknown;

      switch (request.method) {
        case 'tools/list':
          result = { tools: this.toolRegistry.listTools() };
          break;

        case 'tools/call':
          result = await this.handleToolCall(request);
          break;

        case 'ping':
          result = { status: 'pong' };
          break;

        default:
          throw new MCPMethodNotFoundError(request.method);
      }

      this.requestMetrics.successfulRequests++;
      this.requestMetrics.totalResponseTime += performance.now() - startTime;

      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      this.requestMetrics.failedRequests++;
      this.requestMetrics.totalResponseTime += performance.now() - startTime;

      console.error('[MCP] Error handling request', {
        id: request.id,
        method: request.method,
        error,
      });

      return {
        jsonrpc: '2.0',
        id: request.id,
        error: this.errorToMCPError(error),
      };
    }
  }

  private async handleInitialize(request: MCPRequest): Promise<MCPResponse> {
    try {
      const params = request.params as MCPInitializeParams;

      if (!params) {
        throw new MCPErrorClass('Invalid params', -32602);
      }

      // Create session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session: MCPSession = {
        id: sessionId,
        transport: this.config.transport,
        isInitialized: true,
        clientInfo: params.clientInfo,
        protocolVersion: params.protocolVersion,
        capabilities: params.capabilities,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      this.sessions.set(sessionId, session);
      this.currentSession = session;

      // Prepare response
      const result: MCPInitializeResult = {
        protocolVersion: this.supportedProtocolVersion,
        capabilities: this.serverCapabilities,
        serverInfo: this.serverInfo,
        instructions: 'GHL Agency AI MCP Server ready for tool execution',
      };

      console.log('[MCP] Session initialized', {
        sessionId,
        clientInfo: params.clientInfo,
      });

      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      console.error('[MCP] Error during initialization', error);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: this.errorToMCPError(error),
      };
    }
  }

  private async handleToolCall(request: MCPRequest): Promise<unknown> {
    const params = request.params as any;

    if (!params || !params.name) {
      throw new MCPErrorClass('Tool name is required', -32602);
    }

    const result = await this.toolRegistry.executeTool(
      params.name,
      params.arguments || {},
      {
        sessionId: this.currentSession?.id,
      }
    );

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private getOrCreateSession(): MCPSession {
    if (this.currentSession) {
      return this.currentSession;
    }

    // For stdio transport, create a default session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: MCPSession = {
      id: sessionId,
      transport: this.config.transport,
      isInitialized: false,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.currentSession = session;

    return session;
  }

  private createTransport(): ITransport {
    switch (this.config.transport) {
      case 'stdio':
        return new StdioTransport();

      case 'http':
        return new HttpTransport(
          this.config.host || 'localhost',
          this.config.port || 3000,
          this.config.tlsEnabled || false
        );

      default:
        throw new MCPErrorClass(`Unknown transport type: ${this.config.transport}`);
    }
  }

  private async registerBuiltInTools(): Promise<void> {
    // System information tool
    this.registerTool({
      name: 'system/info',
      description: 'Get system information',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return {
          version: '1.0.0',
          platform: platform(),
          arch: arch(),
          runtime: 'Node.js',
          uptime: performance.now(),
        };
      },
    });

    // Health check tool
    this.registerTool({
      name: 'system/health',
      description: 'Get system health status',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return await this.getHealthStatus();
      },
    });

    // List tools
    this.registerTool({
      name: 'system/tools',
      description: 'List all available tools',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return this.toolRegistry.listTools();
      },
    });
  }

  private errorToMCPError(error: unknown): MCPError {
    if (error instanceof MCPMethodNotFoundError) {
      return {
        code: -32601,
        message: error.message,
        data: error.details,
      };
    }

    if (error instanceof MCPNotInitializedError) {
      return {
        code: -32002,
        message: error.message,
      };
    }

    if (error instanceof MCPErrorClass) {
      return {
        code: error.code,
        message: error.message,
        data: error.details,
      };
    }

    if (error instanceof Error) {
      return {
        code: -32603,
        message: error.message,
      };
    }

    return {
      code: -32603,
      message: 'Internal error',
      data: error,
    };
  }
}
