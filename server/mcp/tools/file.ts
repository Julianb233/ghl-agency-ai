/**
 * File Operation Tools for MCP
 * Provides read, write, and list file operations
 */

import type { MCPTool } from '../types';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

/**
 * Read file tool
 */
export const readFileTool: MCPTool = {
  name: 'file/read',
  description: 'Read contents of a file',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read',
      },
      encoding: {
        type: 'string',
        enum: ['utf-8', 'base64', 'hex'],
        default: 'utf-8',
        description: 'Encoding to use when reading the file',
      },
    },
    required: ['path'],
  },
  handler: async (input: any) => {
    const { path, encoding = 'utf-8' } = input;

    try {
      const content = await fs.readFile(path, encoding as BufferEncoding);

      return {
        path,
        content,
        size: content.length,
        encoding,
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

/**
 * Write file tool
 */
export const writeFileTool: MCPTool = {
  name: 'file/write',
  description: 'Write content to a file',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to write',
      },
      content: {
        type: 'string',
        description: 'Content to write to the file',
      },
      encoding: {
        type: 'string',
        enum: ['utf-8', 'base64', 'hex'],
        default: 'utf-8',
        description: 'Encoding to use when writing the file',
      },
      createDirectories: {
        type: 'boolean',
        default: true,
        description: 'Create parent directories if they don\'t exist',
      },
    },
    required: ['path', 'content'],
  },
  handler: async (input: any) => {
    const { path, content, encoding = 'utf-8', createDirectories = true } = input;

    try {
      // Create parent directories if needed
      if (createDirectories) {
        const dir = dirname(path);
        await fs.mkdir(dir, { recursive: true });
      }

      await fs.writeFile(path, content, encoding as BufferEncoding);

      const stats = await fs.stat(path);

      return {
        path,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

/**
 * List directory tool
 */
export const listDirectoryTool: MCPTool = {
  name: 'file/list',
  description: 'List contents of a directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to list',
      },
      recursive: {
        type: 'boolean',
        default: false,
        description: 'List files recursively',
      },
      includeHidden: {
        type: 'boolean',
        default: false,
        description: 'Include hidden files (starting with .)',
      },
    },
    required: ['path'],
  },
  handler: async (input: any) => {
    const { path, recursive = false, includeHidden = false } = input;

    try {
      const files: Array<{
        name: string;
        path: string;
        type: 'file' | 'directory';
        size: number;
        modified: Date;
      }> = [];

      async function listDir(dirPath: string): Promise<void> {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          // Skip hidden files if not included
          if (!includeHidden && entry.name.startsWith('.')) {
            continue;
          }

          const fullPath = join(dirPath, entry.name);
          const stats = await fs.stat(fullPath);

          files.push({
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime,
          });

          // Recurse into directories if requested
          if (recursive && entry.isDirectory()) {
            await listDir(fullPath);
          }
        }
      }

      await listDir(path);

      return {
        path,
        count: files.length,
        files,
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

/**
 * Delete file tool
 */
export const deleteFileTool: MCPTool = {
  name: 'file/delete',
  description: 'Delete a file or directory',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file or directory to delete',
      },
      recursive: {
        type: 'boolean',
        default: false,
        description: 'Delete directories recursively',
      },
    },
    required: ['path'],
  },
  handler: async (input: any) => {
    const { path, recursive = false } = input;

    try {
      const stats = await fs.stat(path);

      if (stats.isDirectory()) {
        await fs.rm(path, { recursive, force: true });
      } else {
        await fs.unlink(path);
      }

      return {
        path,
        deleted: true,
        type: stats.isDirectory() ? 'directory' : 'file',
      };
    } catch (error) {
      throw new Error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

/**
 * Get all file tools
 */
export function getFileTools(): MCPTool[] {
  return [
    readFileTool,
    writeFileTool,
    listDirectoryTool,
    deleteFileTool,
  ];
}
