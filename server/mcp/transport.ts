/**
 * MCP Transport Layer
 * Supports HTTP and stdio transports for MCP protocol
 */

import type { MCPRequest, MCPResponse, ITransport } from './types';

/**
 * Base transport class
 */
export abstract class BaseTransport implements ITransport {
  protected requestHandler?: (request: MCPRequest) => Promise<MCPResponse>;
  protected running = false;

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  onRequest(handler: (request: MCPRequest) => Promise<MCPResponse>): void {
    this.requestHandler = handler;
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    error?: string;
    metrics?: Record<string, number>;
  }> {
    return {
      healthy: this.running,
      metrics: {
        running: this.running ? 1 : 0,
      },
    };
  }
}

/**
 * HTTP Transport for MCP
 * Handles HTTP-based MCP communication
 */
export class HttpTransport extends BaseTransport {
  private server?: any;

  constructor(
    private host: string,
    private port: number,
    private tlsEnabled: boolean,
  ) {
    super();
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new Error('HTTP transport already running');
    }

    // HTTP transport would typically integrate with existing Express server
    // For now, we'll mark it as running
    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    if (this.server) {
      // Close server
    }

    this.running = false;
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    if (!this.requestHandler) {
      throw new Error('Request handler not set');
    }

    return await this.requestHandler(request);
  }
}

/**
 * Stdio Transport for MCP
 * Handles stdin/stdout based MCP communication
 */
export class StdioTransport extends BaseTransport {
  private buffer = '';

  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Stdio transport already running');
    }

    // Set up stdin/stdout handlers
    if (process.stdin) {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', this.handleStdinData.bind(this));
    }

    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    if (process.stdin) {
      process.stdin.removeAllListeners('data');
    }

    this.running = false;
  }

  private async handleStdinData(chunk: string): Promise<void> {
    this.buffer += chunk;

    // Process complete JSON-RPC messages
    let newlineIndex: number;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line) {
        try {
          const request = JSON.parse(line) as MCPRequest;
          if (this.requestHandler) {
            const response = await this.requestHandler(request);
            this.sendResponse(response);
          }
        } catch (error) {
          console.error('Error processing MCP request:', error);
        }
      }
    }
  }

  private sendResponse(response: MCPResponse): void {
    if (process.stdout) {
      process.stdout.write(JSON.stringify(response) + '\n');
    }
  }
}
