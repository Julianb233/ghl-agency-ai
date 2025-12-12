/**
 * Web Tools for MCP
 * Provides HTTP requests and web scraping capabilities
 */

import type { MCPTool } from '../types';
import axios from 'axios';

/**
 * HTTP request tool
 */
export const httpRequestTool: MCPTool = {
  name: 'web/request',
  description: 'Make HTTP request to a URL',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to request',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: 'GET',
        description: 'HTTP method',
      },
      headers: {
        type: 'object',
        description: 'HTTP headers',
      },
      body: {
        type: 'object',
        description: 'Request body (for POST/PUT/PATCH)',
      },
      timeout: {
        type: 'number',
        default: 30000,
        description: 'Request timeout in milliseconds',
      },
    },
    required: ['url'],
  },
  handler: async (input: any) => {
    const { url, method = 'GET', headers = {}, body, timeout = 30000 } = input;

    try {
      const startTime = Date.now();

      const response = await axios({
        url,
        method,
        headers: {
          'User-Agent': 'GHL-Agency-AI-MCP/1.0',
          ...headers,
        },
        data: body,
        timeout,
        validateStatus: () => true, // Don't throw on any status code
      });

      const executionTime = Date.now() - startTime;

      return {
        url,
        method,
        statusCode: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        executionTime,
      };
    } catch (error: any) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  },
};

/**
 * Fetch webpage content tool
 */
export const fetchPageTool: MCPTool = {
  name: 'web/fetch',
  description: 'Fetch and extract content from a webpage',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to fetch',
      },
      extractText: {
        type: 'boolean',
        default: true,
        description: 'Extract text content from HTML',
      },
      timeout: {
        type: 'number',
        default: 30000,
        description: 'Request timeout in milliseconds',
      },
    },
    required: ['url'],
  },
  handler: async (input: any) => {
    const { url, extractText = true, timeout = 30000 } = input;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'GHL-Agency-AI-MCP/1.0',
        },
        timeout,
      });

      let content = response.data;

      // Basic HTML text extraction
      if (extractText && typeof content === 'string' && content.includes('<html')) {
        // Remove script and style tags
        content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // Remove HTML tags
        content = content.replace(/<[^>]+>/g, ' ');

        // Clean up whitespace
        content = content.replace(/\s+/g, ' ').trim();
      }

      return {
        url,
        statusCode: response.status,
        contentType: response.headers['content-type'],
        content,
        size: content.length,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch page: ${error.message}`);
    }
  },
};

/**
 * Get web tools
 */
export function getWebTools(): MCPTool[] {
  return [httpRequestTool, fetchPageTool];
}
