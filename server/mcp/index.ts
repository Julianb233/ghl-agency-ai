/**
 * MCP (Model Context Protocol) Module
 * Main export for MCP server and tools
 */

export * from './types';
export * from './errors';
export * from './transport';
export * from './registry';
export * from './server';

// Tool exports
export { getFileTools } from './tools/file';
export { getShellTools } from './tools/shell';
export { getWebTools } from './tools/web';
export { getDatabaseTools } from './tools/database';

import { MCPServer } from './server';
import type { MCPConfig } from './types';
import { getFileTools } from './tools/file';
import { getShellTools } from './tools/shell';
import { getWebTools } from './tools/web';
import { getDatabaseTools } from './tools/database';

/**
 * Create and configure MCP server with all tools
 */
export async function createMCPServer(config: Partial<MCPConfig> = {}): Promise<MCPServer> {
  const defaultConfig: MCPConfig = {
    transport: 'http',
    host: '0.0.0.0',
    port: 3001,
    tlsEnabled: false,
    enableMetrics: true,
    auth: {
      enabled: false,
      method: 'token',
    },
  };

  const mergedConfig = { ...defaultConfig, ...config };
  const server = new MCPServer(mergedConfig);

  // Register all tools
  const allTools = [
    ...getFileTools(),
    ...getShellTools(),
    ...getWebTools(),
    ...getDatabaseTools(),
  ];

  for (const tool of allTools) {
    const category = tool.name.split('/')[0] as any;
    server.registerTool(tool, {
      name: tool.name,
      category,
      description: tool.description,
      version: '1.0.0',
      tags: [category],
    });
  }

  return server;
}

/**
 * Initialize MCP server for production
 */
export async function initializeMCP(): Promise<MCPServer> {
  console.log('[MCP] Initializing MCP server...');

  const server = await createMCPServer({
    transport: 'http',
    host: process.env.MCP_HOST || '0.0.0.0',
    port: parseInt(process.env.MCP_PORT || '3001', 10),
    enableMetrics: true,
  });

  await server.start();

  console.log('[MCP] MCP server initialized and running');

  return server;
}

// Singleton instance
let mcpServerInstance: MCPServer | null = null;

/**
 * Get or create MCP server instance
 */
export async function getMCPServer(): Promise<MCPServer> {
  if (!mcpServerInstance) {
    mcpServerInstance = await initializeMCP();
  }
  return mcpServerInstance;
}

/**
 * Shutdown MCP server
 */
export async function shutdownMCP(): Promise<void> {
  if (mcpServerInstance) {
    await mcpServerInstance.stop();
    mcpServerInstance = null;
  }
}
