/**
 * MCP Error Classes
 */

import { MCPErrorCode } from './types';

export class MCPError extends Error {
  public readonly code: number;
  public readonly details?: unknown;

  constructor(message: string, code?: number, details?: unknown) {
    super(message);
    this.name = 'MCPError';
    this.code = code ?? MCPErrorCode.INTERNAL_ERROR;
    this.details = details;
  }
}

export class MCPMethodNotFoundError extends MCPError {
  constructor(method: string) {
    super(`Method not found: ${method}`, MCPErrorCode.METHOD_NOT_FOUND, { method });
    this.name = 'MCPMethodNotFoundError';
  }
}

export class MCPInvalidParamsError extends MCPError {
  constructor(message: string, details?: unknown) {
    super(message, MCPErrorCode.INVALID_PARAMS, details);
    this.name = 'MCPInvalidParamsError';
  }
}

export class MCPNotInitializedError extends MCPError {
  constructor() {
    super('Server not initialized', MCPErrorCode.SERVER_NOT_INITIALIZED);
    this.name = 'MCPNotInitializedError';
  }
}

export class MCPParseError extends MCPError {
  constructor(message: string) {
    super(message, MCPErrorCode.PARSE_ERROR);
    this.name = 'MCPParseError';
  }
}
