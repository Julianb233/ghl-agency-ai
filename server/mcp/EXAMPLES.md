# MCP Integration Examples

This document provides practical examples for using the MCP integration in GHL Agency AI.

## Table of Contents
- [Basic Usage](#basic-usage)
- [File Operations](#file-operations)
- [Shell Execution](#shell-execution)
- [Web Operations](#web-operations)
- [Database Operations](#database-operations)
- [Advanced Workflows](#advanced-workflows)
- [Custom Tools](#custom-tools)

## Basic Usage

### Get MCP Status

```typescript
import { trpc } from '@/lib/trpc';

// Check MCP server health
const status = await trpc.mcp.status.query();

console.log('Server Healthy:', status.healthy);
console.log('Registered Tools:', status.metrics?.registeredTools);
console.log('Total Requests:', status.serverMetrics.totalRequests);
console.log('Average Response Time:', status.serverMetrics.averageResponseTime);
```

### List Available Tools

```typescript
// Get all available MCP tools
const { tools, count } = await trpc.mcp.listTools.query();

tools.forEach(tool => {
  console.log(`${tool.name}: ${tool.description}`);
  console.log('Schema:', tool.inputSchema);
});
```

### Execute Generic Tool

```typescript
// Execute any tool by name
const result = await trpc.mcp.executeTool.mutate({
  name: 'file/read',
  arguments: {
    path: '/path/to/file.txt',
    encoding: 'utf-8',
  },
});

console.log('Tool Result:', result.result);
```

## File Operations

### Read Files

```typescript
// Read text file
const textFile = await trpc.mcp.file.read.query({
  path: '/project/README.md',
  encoding: 'utf-8',
});
console.log('File Content:', textFile.content);

// Read binary file as base64
const imageFile = await trpc.mcp.file.read.query({
  path: '/assets/logo.png',
  encoding: 'base64',
});
console.log('Base64 Image:', imageFile.content);
```

### Write Files

```typescript
// Write text file
const writeResult = await trpc.mcp.file.write.mutate({
  path: '/output/report.txt',
  content: 'Analysis Report\n\nResults: Success',
  encoding: 'utf-8',
  createDirectories: true, // Create /output if it doesn't exist
});

console.log('File written:', writeResult.path);
console.log('Size:', writeResult.size);

// Write JSON file
const data = { users: 100, active: 75 };
await trpc.mcp.file.write.mutate({
  path: '/data/stats.json',
  content: JSON.stringify(data, null, 2),
});
```

### List Directory Contents

```typescript
// List files in directory
const files = await trpc.mcp.file.list.query({
  path: '/project/src',
  recursive: false,
  includeHidden: false,
});

files.files.forEach(file => {
  console.log(`${file.type}: ${file.name} (${file.size} bytes)`);
});

// Recursive listing
const allFiles = await trpc.mcp.file.list.query({
  path: '/project',
  recursive: true,
  includeHidden: true,
});

console.log(`Total files: ${allFiles.count}`);
```

## Shell Execution

### Run Commands

```typescript
// List directory
const lsResult = await trpc.mcp.shell.execute.mutate({
  command: 'ls -la',
  cwd: '/project',
});

console.log('Output:', lsResult.stdout);
console.log('Exit Code:', lsResult.exitCode);

// Git operations
const gitStatus = await trpc.mcp.shell.execute.mutate({
  command: 'git status --short',
  cwd: '/project',
});

console.log('Git Status:', gitStatus.stdout);
```

### NPM/Package Manager Operations

```typescript
// Install dependencies
const npmInstall = await trpc.mcp.shell.execute.mutate({
  command: 'npm install',
  cwd: '/project',
  timeout: 120000, // 2 minutes
});

// Run tests
const testResult = await trpc.mcp.shell.execute.mutate({
  command: 'npm test',
  cwd: '/project',
  env: {
    NODE_ENV: 'test',
  },
});

console.log('Tests passed:', testResult.exitCode === 0);

// Check for outdated packages
const outdated = await trpc.mcp.shell.execute.mutate({
  command: 'npm outdated --json',
  cwd: '/project',
});

const outdatedPackages = JSON.parse(outdated.stdout || '{}');
console.log('Outdated packages:', outdatedPackages);
```

## Web Operations

### HTTP Requests

```typescript
// GET request
const getResponse = await trpc.mcp.web.request.mutate({
  url: 'https://api.example.com/users',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your-token',
    'Accept': 'application/json',
  },
});

console.log('Status:', getResponse.statusCode);
console.log('Data:', getResponse.data);

// POST request
const postResponse = await trpc.mcp.web.request.mutate({
  url: 'https://api.example.com/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: {
    name: 'John Doe',
    email: 'john@example.com',
  },
});

console.log('Created User:', postResponse.data);
```

### Fetch Web Pages

```typescript
// Fetch and extract text
const webpage = await trpc.mcp.web.fetch.query({
  url: 'https://example.com/blog/article',
  extractText: true,
  timeout: 30000,
});

console.log('Page Content:', webpage.content);
console.log('Content Type:', webpage.contentType);

// Fetch raw HTML
const rawHtml = await trpc.mcp.web.fetch.query({
  url: 'https://example.com',
  extractText: false,
});

console.log('HTML:', rawHtml.content);
```

## Database Operations

### Query Database

```typescript
// Simple SELECT query
const users = await trpc.mcp.database.query.mutate({
  query: 'SELECT id, name, email FROM users WHERE active = $1',
  params: [true],
  limit: 100,
});

console.log('Active users:', users.rows);
console.log('Row count:', users.rowCount);

// Complex query with joins
const ordersWithUsers = await trpc.mcp.database.query.mutate({
  query: `
    SELECT
      o.id,
      o.total,
      u.name as user_name,
      u.email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.created_at > $1
    ORDER BY o.created_at DESC
  `,
  params: [new Date('2024-01-01')],
  limit: 50,
});

console.log('Recent orders:', ordersWithUsers.rows);
```

### List Tables

```typescript
// List all tables
const tables = await trpc.mcp.database.tables.query({
  schema: 'public',
});

console.log('Database tables:');
tables.tables.forEach(table => {
  console.log(`- ${table.table_name} (${table.table_type})`);
});
```

### Get Table Schema

```typescript
// Get table structure
const schema = await trpc.mcp.database.schema.query({
  table: 'users',
  schema: 'public',
});

console.log(`Table: ${schema.table}`);
console.log('Columns:');
schema.columns.forEach(col => {
  console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
});
```

## Advanced Workflows

### Automated Project Analysis

```typescript
async function analyzeProject(projectPath: string) {
  console.log('Starting project analysis...');

  // 1. Check git status
  const gitStatus = await trpc.mcp.shell.execute.mutate({
    command: 'git status --porcelain',
    cwd: projectPath,
  });

  const hasUncommittedChanges = gitStatus.stdout.trim().length > 0;

  // 2. List all TypeScript files
  const tsFiles = await trpc.mcp.file.list.query({
    path: `${projectPath}/src`,
    recursive: true,
  });

  const typescriptFiles = tsFiles.files.filter(f =>
    f.name.endsWith('.ts') || f.name.endsWith('.tsx')
  );

  // 3. Read package.json
  const packageJson = await trpc.mcp.file.read.query({
    path: `${projectPath}/package.json`,
  });

  const pkg = JSON.parse(packageJson.content);

  // 4. Run linter
  const lintResult = await trpc.mcp.shell.execute.mutate({
    command: 'npm run lint',
    cwd: projectPath,
  });

  // 5. Run tests
  const testResult = await trpc.mcp.shell.execute.mutate({
    command: 'npm test -- --coverage',
    cwd: projectPath,
  });

  // 6. Generate report
  const report = {
    project: pkg.name,
    version: pkg.version,
    typescript: {
      files: typescriptFiles.length,
      totalLines: typescriptFiles.reduce((sum, f) => sum + f.size, 0),
    },
    git: {
      uncommittedChanges: hasUncommittedChanges,
    },
    quality: {
      lintPassed: lintResult.exitCode === 0,
      testsPassed: testResult.exitCode === 0,
    },
    timestamp: new Date().toISOString(),
  };

  // Save report
  await trpc.mcp.file.write.mutate({
    path: `${projectPath}/analysis-report.json`,
    content: JSON.stringify(report, null, 2),
  });

  return report;
}

// Use the workflow
const report = await analyzeProject('/path/to/project');
console.log('Analysis complete:', report);
```

### API Testing Workflow

```typescript
async function testAPI(baseUrl: string) {
  const results = [];

  // Test endpoints
  const endpoints = [
    { method: 'GET', path: '/api/health' },
    { method: 'GET', path: '/api/users' },
    { method: 'GET', path: '/api/stats' },
  ];

  for (const endpoint of endpoints) {
    const startTime = Date.now();

    const response = await trpc.mcp.web.request.mutate({
      url: `${baseUrl}${endpoint.path}`,
      method: endpoint.method as any,
      timeout: 10000,
    });

    const duration = Date.now() - startTime;

    results.push({
      endpoint: endpoint.path,
      status: response.statusCode,
      success: response.statusCode >= 200 && response.statusCode < 300,
      duration,
      data: response.data,
    });
  }

  // Generate test report
  const report = {
    baseUrl,
    totalTests: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    results,
    timestamp: new Date().toISOString(),
  };

  // Save report
  await trpc.mcp.file.write.mutate({
    path: '/reports/api-test-report.json',
    content: JSON.stringify(report, null, 2),
  });

  return report;
}

// Run API tests
const testReport = await testAPI('https://api.example.com');
console.log(`Tests: ${testReport.passed}/${testReport.totalTests} passed`);
```

### Data Migration Workflow

```typescript
async function migrateData() {
  // 1. Query old data
  const oldData = await trpc.mcp.database.query.mutate({
    query: 'SELECT * FROM legacy_users WHERE migrated = false',
    limit: 1000,
  });

  console.log(`Found ${oldData.rowCount} users to migrate`);

  // 2. Transform data
  const transformedUsers = oldData.rows.map(user => ({
    email: user.email,
    name: `${user.first_name} ${user.last_name}`,
    status: user.active ? 'active' : 'inactive',
    created_at: user.registration_date,
  }));

  // 3. Save transformed data
  await trpc.mcp.file.write.mutate({
    path: '/migration/users-transformed.json',
    content: JSON.stringify(transformedUsers, null, 2),
  });

  // 4. Post to new API
  const batchSize = 100;
  for (let i = 0; i < transformedUsers.length; i += batchSize) {
    const batch = transformedUsers.slice(i, i + batchSize);

    await trpc.mcp.web.request.mutate({
      url: 'https://new-system.example.com/api/users/batch',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer migration-token',
      },
      body: { users: batch },
    });

    console.log(`Migrated batch ${Math.floor(i / batchSize) + 1}`);
  }

  return {
    totalMigrated: transformedUsers.length,
    completedAt: new Date().toISOString(),
  };
}

// Run migration
const migrationResult = await migrateData();
console.log('Migration complete:', migrationResult);
```

## Custom Tools

### Creating a Custom Tool

```typescript
import { getMCPServer } from './server/mcp';
import type { MCPTool } from './server/mcp/types';

// Define custom tool
const analyzeCodeTool: MCPTool = {
  name: 'code/analyze',
  description: 'Analyze code quality and complexity',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to file to analyze',
      },
      metrics: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['complexity', 'coverage', 'duplicates', 'security'],
        },
        description: 'Metrics to calculate',
      },
    },
    required: ['filePath'],
  },
  handler: async (input: any, context?: any) => {
    const { filePath, metrics = ['complexity'] } = input;

    // Read file
    const server = await getMCPServer();
    const registry = (server as any).toolRegistry;

    const fileContent = await registry.executeTool(
      'file/read',
      { path: filePath },
      context
    );

    // Analyze code (simplified)
    const lines = fileContent.content.split('\n');
    const analysis = {
      file: filePath,
      totalLines: lines.length,
      codeLines: lines.filter(l => l.trim() && !l.trim().startsWith('//')).length,
      commentLines: lines.filter(l => l.trim().startsWith('//')).length,
      blankLines: lines.filter(l => !l.trim()).length,
      complexity: calculateComplexity(fileContent.content),
      timestamp: new Date().toISOString(),
    };

    return analysis;
  },
};

function calculateComplexity(code: string): number {
  // Simplified complexity calculation
  const complexityKeywords = [
    'if', 'else', 'for', 'while', 'switch', 'case', '&&', '||', '?',
  ];

  let complexity = 1; // Base complexity

  for (const keyword of complexityKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = code.match(regex);
    complexity += matches ? matches.length : 0;
  }

  return complexity;
}

// Register the custom tool
const server = await getMCPServer();
server.registerTool(analyzeCodeTool, {
  name: 'code/analyze',
  category: 'code',
  description: 'Code analysis tool',
  version: '1.0.0',
  tags: ['analysis', 'quality', 'metrics'],
});

// Use the custom tool
const analysis = await trpc.mcp.executeTool.mutate({
  name: 'code/analyze',
  arguments: {
    filePath: '/project/src/main.ts',
    metrics: ['complexity'],
  },
});

console.log('Code Analysis:', analysis);
```

## Error Handling

```typescript
try {
  const result = await trpc.mcp.file.read.query({
    path: '/nonexistent/file.txt',
  });
} catch (error) {
  if (error instanceof TRPCError) {
    console.error('MCP Error:', error.message);
    console.error('Code:', error.code);
  }
}

// With proper error handling
async function safeFileRead(path: string) {
  try {
    return await trpc.mcp.file.read.query({ path });
  } catch (error) {
    console.error(`Failed to read ${path}:`, error);
    return null;
  }
}
```

## Best Practices

1. **Always use timeouts** for shell and web operations
2. **Validate inputs** before executing tools
3. **Handle errors gracefully** with try-catch blocks
4. **Use appropriate limits** for database queries
5. **Check permissions** before file operations
6. **Monitor metrics** to track performance
7. **Clean up resources** after workflows complete
8. **Log operations** for debugging and auditing

## More Examples

For more examples and use cases, see:
- `/server/mcp/tools/` - Tool implementations
- `/server/api/routers/mcp.ts` - tRPC router with type definitions
- `/server/mcp/README.md` - Full documentation
