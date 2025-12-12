/**
 * MCP (Model Context Protocol) Type Definitions
 * Adapted from claude-flow for GHL Agency AI integration
 */

import type { z } from 'zod';

// ============================================================================
// Core Protocol Types
// ============================================================================

export interface MCPProtocolVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface MCPServerInfo {
  name: string;
  version: string;
}

export interface MCPClientInfo {
  name: string;
  version: string;
}

export interface MCPCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    listChanged?: boolean;
    subscribe?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
  };
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// ============================================================================
// Initialize Types
// ============================================================================

export interface MCPInitializeParams {
  protocolVersion: MCPProtocolVersion;
  capabilities: MCPCapabilities;
  clientInfo: MCPClientInfo;
}

export interface MCPInitializeResult {
  protocolVersion: MCPProtocolVersion;
  capabilities: MCPCapabilities;
  serverInfo: MCPServerInfo;
  instructions?: string;
}

// ============================================================================
// Tool Types
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: unknown, context?: MCPContext) => Promise<unknown>;
}

export interface ToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// ============================================================================
// Session Types
// ============================================================================

export interface MCPSession {
  id: string;
  transport: 'stdio' | 'http' | 'websocket';
  isInitialized: boolean;
  clientInfo?: MCPClientInfo;
  protocolVersion?: MCPProtocolVersion;
  capabilities?: MCPCapabilities;
  createdAt: Date;
  lastActivity: Date;
  isAuthenticated?: boolean;
}

// ============================================================================
// Context Types
// ============================================================================

export interface MCPContext {
  sessionId?: string;
  userId?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Config Types
// ============================================================================

export interface MCPConfig {
  transport: 'stdio' | 'http' | 'websocket';
  host?: string;
  port?: number;
  tlsEnabled?: boolean;
  enableMetrics?: boolean;
  auth?: {
    enabled: boolean;
    method: 'token' | 'jwt' | 'oauth';
    secretKey?: string;
  };
  loadBalancer?: {
    enabled: boolean;
    maxRequestsPerSecond?: number;
    maxConcurrentRequests?: number;
  };
  sessionTimeout?: number;
  maxSessions?: number;
}

// ============================================================================
// Metrics Types
// ============================================================================

export interface MCPMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeSessions: number;
  toolInvocations: Record<string, number>;
  errors: Record<string, number>;
  lastReset: Date;
}

// ============================================================================
// Tool Categories
// ============================================================================

export type ToolCategory =
  | 'file'
  | 'shell'
  | 'web'
  | 'database'
  | 'ai'
  | 'system'
  | 'workflow'
  | 'memory'
  | 'agent';

export interface ToolMetadata {
  name: string;
  category: ToolCategory;
  description: string;
  version: string;
  tags: string[];
  requiredPermissions?: string[];
  deprecated?: boolean;
}

// ============================================================================
// Transport Types
// ============================================================================

export interface ITransport {
  start(): Promise<void>;
  stop(): Promise<void>;
  onRequest(handler: (request: MCPRequest) => Promise<MCPResponse>): void;
  getHealthStatus(): Promise<{
    healthy: boolean;
    error?: string;
    metrics?: Record<string, number>;
  }>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = Array<JSONValue>;

// ============================================================================
// Error Codes
// ============================================================================

export enum MCPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  SERVER_NOT_INITIALIZED = -32002,
  UNKNOWN_ERROR_CODE = -32001,
}
