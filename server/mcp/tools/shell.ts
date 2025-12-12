/**
 * Shell Execution Tools for MCP
 * Provides sandboxed shell command execution
 */

import type { MCPTool } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Security: Allowed commands (whitelist)
const ALLOWED_COMMANDS = [
  'ls',
  'pwd',
  'echo',
  'cat',
  'grep',
  'find',
  'wc',
  'sort',
  'uniq',
  'head',
  'tail',
  'git',
  'npm',
  'node',
  'pnpm',
  'yarn',
];

// Security: Blocked patterns
const BLOCKED_PATTERNS = [
  /rm\s+-rf/,
  /sudo/,
  /chmod/,
  /chown/,
  /kill/,
  /pkill/,
  />\s*\/dev\//,
  /&\s*$/,
  /;\s*$/,
  /\|\|/,
  /&&/,
];

/**
 * Validate command for security
 */
function validateCommand(command: string): void {
  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      throw new Error(`Command contains blocked pattern: ${pattern.toString()}`);
    }
  }

  // Extract base command
  const baseCommand = command.trim().split(/\s+/)[0];

  // Check if command is in whitelist
  if (!ALLOWED_COMMANDS.includes(baseCommand)) {
    throw new Error(`Command not allowed: ${baseCommand}. Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`);
  }
}

/**
 * Execute shell command tool
 */
export const executeCommandTool: MCPTool = {
  name: 'shell/execute',
  description: 'Execute a sandboxed shell command',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute',
      },
      cwd: {
        type: 'string',
        description: 'Working directory for the command',
      },
      timeout: {
        type: 'number',
        default: 30000,
        description: 'Timeout in milliseconds (default: 30s)',
      },
      env: {
        type: 'object',
        description: 'Additional environment variables',
      },
    },
    required: ['command'],
  },
  handler: async (input: any) => {
    const { command, cwd, timeout = 30000, env = {} } = input;

    // Validate command for security
    validateCommand(command);

    try {
      const startTime = Date.now();

      const result = await execAsync(command, {
        cwd: cwd || process.cwd(),
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB
        env: {
          ...process.env,
          ...env,
        },
      });

      const executionTime = Date.now() - startTime;

      return {
        command,
        exitCode: 0,
        stdout: result.stdout,
        stderr: result.stderr,
        executionTime,
        cwd: cwd || process.cwd(),
      };
    } catch (error: any) {
      return {
        command,
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        error: error.message,
        cwd: cwd || process.cwd(),
      };
    }
  },
};

/**
 * Get shell tools
 */
export function getShellTools(): MCPTool[] {
  return [executeCommandTool];
}
