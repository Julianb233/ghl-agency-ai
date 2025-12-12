/**
 * Database Tools for MCP
 * Provides database query capabilities
 */

import type { MCPTool } from '../types';
import { getPool } from '../../db';

/**
 * Execute database query tool
 */
export const queryDatabaseTool: MCPTool = {
  name: 'database/query',
  description: 'Execute a read-only database query',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'SQL query to execute (SELECT only)',
      },
      params: {
        type: 'array',
        items: {},
        description: 'Query parameters',
      },
      limit: {
        type: 'number',
        default: 100,
        description: 'Maximum number of rows to return',
      },
    },
    required: ['query'],
  },
  handler: async (input: any) => {
    const { query, params = [], limit = 100 } = input;

    // Security: Only allow SELECT queries
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed');
    }

    // Prevent multiple statements
    if (query.includes(';') && query.trim().lastIndexOf(';') !== query.trim().length - 1) {
      throw new Error('Multiple statements are not allowed');
    }

    try {
      const pool = await getPool();
      if (!pool) {
        throw new Error('Database not initialized');
      }

      const startTime = Date.now();

      // Add LIMIT to query if not present
      let finalQuery = query.trim();
      if (!finalQuery.toUpperCase().includes('LIMIT')) {
        finalQuery = `${finalQuery} LIMIT ${limit}`;
      }

      // Execute query using pool
      const result = await pool.query(finalQuery, params);

      const executionTime = Date.now() - startTime;

      return {
        rows: result.rows,
        rowCount: result.rows.length,
        executionTime,
        query: finalQuery,
      };
    } catch (error: any) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  },
};

/**
 * List database tables tool
 */
export const listTablesTool: MCPTool = {
  name: 'database/tables',
  description: 'List all tables in the database',
  inputSchema: {
    type: 'object',
    properties: {
      schema: {
        type: 'string',
        default: 'public',
        description: 'Database schema name',
      },
    },
  },
  handler: async (input: any) => {
    const { schema = 'public' } = input;

    try {
      const pool = await getPool();
      if (!pool) {
        throw new Error('Database not initialized');
      }

      const result = await pool.query(
        `
        SELECT
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_schema = $1
        ORDER BY table_name
        `,
        [schema]
      );

      return {
        schema,
        tables: result.rows,
        count: result.rows.length,
      };
    } catch (error: any) {
      throw new Error(`Failed to list tables: ${error.message}`);
    }
  },
};

/**
 * Get table schema tool
 */
export const getTableSchemaTool: MCPTool = {
  name: 'database/schema',
  description: 'Get schema information for a table',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'Table name',
      },
      schema: {
        type: 'string',
        default: 'public',
        description: 'Database schema name',
      },
    },
    required: ['table'],
  },
  handler: async (input: any) => {
    const { table, schema = 'public' } = input;

    try {
      const pool = await getPool();
      if (!pool) {
        throw new Error('Database not initialized');
      }

      const result = await pool.query(
        `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
        `,
        [schema, table]
      );

      return {
        table,
        schema,
        columns: result.rows,
        columnCount: result.rows.length,
      };
    } catch (error: any) {
      throw new Error(`Failed to get table schema: ${error.message}`);
    }
  },
};

/**
 * Get database tools
 */
export function getDatabaseTools(): MCPTool[] {
  return [
    queryDatabaseTool,
    listTablesTool,
    getTableSchemaTool,
  ];
}
