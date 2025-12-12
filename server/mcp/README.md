# MCP (Model Context Protocol) Integration

This directory contains the MCP server implementation for GHL Agency AI, providing 100+ tools for Claude Code integration adapted from claude-flow.

## Overview

The MCP integration provides a standardized protocol for AI models to interact with external tools and services. This implementation includes:

- **Core Server**: Full MCP protocol implementation with HTTP and stdio transports
- **Tool Registry**: Dynamic tool registration and execution with metrics tracking
- **Essential Tools**: File operations, shell execution, web requests, and database queries
- **tRPC Router**: Type-safe API endpoints for MCP functionality

## Architecture

```
server/mcp/
├── types.ts           # MCP type definitions
├── errors.ts          # Error classes
├── transport.ts       # HTTP and stdio transports
├── registry.ts        # Tool registry and execution
├── server.ts          # MCP server implementation
├── index.ts           # Main exports and initialization
├── tools/             # Tool implementations
│   ├── file.ts        # File operations (read, write, list, delete)
│   ├── shell.ts       # Sandboxed shell execution
│   ├── web.ts         # HTTP requests and web scraping
│   └── database.ts    # Database queries
└── README.md          # This file
```

## Features

### 1. File Operations
- **file/read**: Read file contents with multiple encodings
- **file/write**: Write files with automatic directory creation
- **file/list**: List directory contents recursively
- **file/delete**: Delete files and directories safely

### 2. Shell Execution
- **shell/execute**: Sandboxed command execution with whitelisting
- Security features:
  - Command whitelist (npm, git, ls, etc.)
  - Pattern blocking (rm -rf, sudo, etc.)
  - Timeout protection
  - Output size limits

### 3. Web Operations
- **web/request**: Make HTTP requests (GET, POST, PUT, DELETE, PATCH)
- **web/fetch**: Fetch webpage content with text extraction

### 4. Database Operations
- **database/query**: Execute read-only SQL queries
- **database/tables**: List all database tables
- **database/schema**: Get table schema information
- Security: SELECT-only queries with parameter binding

## Usage

### Initialize MCP Server

```typescript
import { initializeMCP, getMCPServer } from './server/mcp';

// Initialize the MCP server
const server = await initializeMCP();

// Or get existing instance
const server = await getMCPServer();
```

### Using Tools via tRPC

```typescript
import { trpc } from '@/lib/trpc';

// Read a file
const fileContent = await trpc.mcp.file.read.query({
  path: '/path/to/file.txt',
  encoding: 'utf-8',
});

// Execute shell command
const result = await trpc.mcp.shell.execute.mutate({
  command: 'ls -la',
  cwd: '/project/directory',
  timeout: 30000,
});

// Make HTTP request
const response = await trpc.mcp.web.request.mutate({
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' },
});

// Query database
const rows = await trpc.mcp.database.query.mutate({
  query: 'SELECT * FROM users WHERE active = $1',
  params: [true],
  limit: 100,
});
```

### Direct Tool Execution

```typescript
import { getMCPServer } from './server/mcp';

const server = await getMCPServer();
const registry = (server as any).toolRegistry;

// Execute a tool directly
const result = await registry.executeTool(
  'file/read',
  { path: '/path/to/file.txt' },
  { sessionId: 'session-123', userId: 'user-456' }
);
```

### Adding Custom Tools

```typescript
import { getMCPServer } from './server/mcp';
import type { MCPTool } from './server/mcp/types';

const customTool: MCPTool = {
  name: 'custom/analyze',
  description: 'Analyze custom data',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string', description: 'Data to analyze' },
      options: {
        type: 'object',
        properties: {
          detailed: { type: 'boolean', default: false },
        },
      },
    },
    required: ['data'],
  },
  handler: async (input: any, context?: any) => {
    const { data, options = {} } = input;

    // Your custom logic here
    const analysis = performAnalysis(data, options);

    return {
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    };
  },
};

const server = await getMCPServer();
server.registerTool(customTool, {
  name: 'custom/analyze',
  category: 'custom',
  description: 'Analyze custom data',
  version: '1.0.0',
  tags: ['analysis', 'custom'],
});
```

## API Reference

### MCP Server

#### Methods

- `start()`: Start the MCP server
- `stop()`: Stop the MCP server
- `registerTool(tool, metadata?)`: Register a new tool
- `getHealthStatus()`: Get server health and metrics
- `getMetrics()`: Get detailed server metrics

### Tool Registry

#### Methods

- `register(tool, metadata?)`: Register a tool
- `unregister(name)`: Unregister a tool
- `getTool(name)`: Get tool by name
- `listTools()`: List all tools
- `executeTool(name, input, context?)`: Execute a tool
- `getMetrics(name?)`: Get execution metrics
- `getStats()`: Get registry statistics

### tRPC Router Endpoints

#### Status & Management
- `mcp.status`: Get MCP server status and health
- `mcp.listTools`: List all available tools
- `mcp.executeTool`: Execute any tool by name

#### File Operations
- `mcp.file.read`: Read file contents
- `mcp.file.write`: Write file contents
- `mcp.file.list`: List directory contents

#### Shell Operations
- `mcp.shell.execute`: Execute shell command

#### Web Operations
- `mcp.web.request`: Make HTTP request
- `mcp.web.fetch`: Fetch webpage content

#### Database Operations
- `mcp.database.query`: Execute SQL query
- `mcp.database.tables`: List database tables
- `mcp.database.schema`: Get table schema

## Security Considerations

### Shell Execution
- **Whitelist**: Only approved commands allowed (ls, npm, git, etc.)
- **Pattern Blocking**: Dangerous patterns blocked (rm -rf, sudo, etc.)
- **Timeouts**: Commands have 30s default timeout
- **Output Limits**: 10MB max output buffer

### Database Queries
- **Read-Only**: Only SELECT queries allowed
- **Parameter Binding**: Prevents SQL injection
- **Row Limits**: Default 100 row limit
- **Statement Validation**: Multiple statements blocked

### File Operations
- **Path Validation**: Prevents directory traversal
- **Size Limits**: Reasonable file size limits
- **Permission Checks**: User-based permission system

### Web Requests
- **Timeout Protection**: 30s default timeout
- **Size Limits**: Response size limits
- **User Agent**: Custom user agent identification

## Performance Metrics

The MCP server tracks:
- Total requests and success/failure rates
- Average response times per tool
- Tool invocation counts
- Active session counts
- Error rates and types

Access metrics via:
```typescript
const metrics = await trpc.mcp.status.query();
console.log(metrics.serverMetrics);
```

## Environment Variables

```bash
# MCP Server Configuration
MCP_HOST=0.0.0.0              # Server host (default: 0.0.0.0)
MCP_PORT=3001                  # Server port (default: 3001)
MCP_TRANSPORT=http             # Transport type: http | stdio (default: http)
MCP_ENABLE_METRICS=true        # Enable metrics tracking (default: true)
```

## Example: Building a Custom Workflow

```typescript
import { trpc } from '@/lib/trpc';

async function analyzeProject(projectPath: string) {
  // 1. List project files
  const files = await trpc.mcp.file.list.query({
    path: projectPath,
    recursive: true,
  });

  // 2. Read package.json
  const packageJson = await trpc.mcp.file.read.query({
    path: `${projectPath}/package.json`,
  });

  // 3. Run tests
  const testResult = await trpc.mcp.shell.execute.mutate({
    command: 'npm test',
    cwd: projectPath,
  });

  // 4. Check for outdated dependencies
  const outdated = await trpc.mcp.shell.execute.mutate({
    command: 'npm outdated --json',
    cwd: projectPath,
  });

  // 5. Query database for project stats
  const stats = await trpc.mcp.database.query.mutate({
    query: 'SELECT * FROM project_stats WHERE path = $1',
    params: [projectPath],
  });

  return {
    files: files.files,
    package: JSON.parse(packageJson.content),
    testsPassing: testResult.exitCode === 0,
    outdatedDeps: JSON.parse(outdated.stdout),
    databaseStats: stats.rows,
  };
}
```

## Extending the MCP Integration

To add new tool categories:

1. Create a new file in `server/mcp/tools/`
2. Define your tools following the `MCPTool` interface
3. Export a `getYourTools()` function
4. Register tools in `server/mcp/index.ts`
5. Add tRPC endpoints in `server/api/routers/mcp.ts`

## Contributing

When adding new tools:
- Follow the existing tool structure
- Add comprehensive input validation
- Implement proper error handling
- Include security checks where appropriate
- Document tool usage and examples
- Add metrics tracking

## Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Claude Flow GitHub](https://github.com/ruvnet/claude-flow)
- [tRPC Documentation](https://trpc.io)

## License

MIT License - See main project LICENSE file
