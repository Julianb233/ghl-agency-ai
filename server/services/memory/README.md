# Memory System

A powerful memory and learning system for multi-agent coordination, adapted from [claude-flow](https://github.com/ruvnet/claude-flow)'s AgentDB and ReasoningBank systems.

## Features

- **Agent Context Management**: Store and retrieve session-based context for multi-agent coordination
- **Reasoning Pattern Storage**: Learn from past executions to improve future performance
- **Session Management**: Track agent sessions with automatic cleanup
- **High Performance**: LRU caching with configurable size limits
- **PostgreSQL Storage**: Persistent storage using Drizzle ORM
- **Type-Safe API**: Full TypeScript support with comprehensive types

## Architecture

The memory system consists of three main components:

1. **Agent Memory Service** (`agentMemory.service.ts`)
   - Session context storage and retrieval
   - Key-value context management
   - LRU caching for fast access
   - Automatic TTL and expiration

2. **Reasoning Bank Service** (`reasoningBank.service.ts`)
   - Reasoning pattern storage and retrieval
   - Pattern similarity search
   - Success rate tracking
   - Performance-based cleanup

3. **Unified Memory System** (`index.ts`)
   - Clean, simple API combining both services
   - Simplified interface for common operations
   - Comprehensive statistics and maintenance

## Database Schema

The system uses three PostgreSQL tables:

### `memory_entries`
Stores agent context and session data:
```sql
- id: serial (primary key)
- entry_id: varchar(255) (unique)
- session_id: varchar(255) (indexed)
- agent_id: varchar(255) (indexed)
- user_id: integer (indexed)
- key: text (indexed)
- value: jsonb
- embedding: jsonb
- metadata: jsonb
- created_at: timestamp
- updated_at: timestamp
- expires_at: timestamp
```

### `reasoning_patterns`
Stores agent reasoning patterns for learning:
```sql
- id: serial (primary key)
- pattern_id: varchar(255) (unique)
- pattern: text
- result: jsonb
- context: jsonb
- confidence: real (0.0-1.0)
- usage_count: integer
- success_rate: real (0.0-1.0)
- domain: varchar(255) (indexed)
- tags: jsonb
- metadata: jsonb
- embedding: jsonb
- created_at: timestamp
- updated_at: timestamp
- last_used_at: timestamp
```

### `session_contexts`
Stores high-level session information:
```sql
- id: serial (primary key)
- session_id: varchar(255) (unique, indexed)
- user_id: integer (indexed)
- agent_id: varchar(255)
- context: jsonb
- metadata: jsonb
- created_at: timestamp
- updated_at: timestamp
```

## Installation

### 1. Create Database Migration

Create a new migration file in your `drizzle` directory:

```bash
# Generate migration
npm run db:generate

# Or manually create migration file
touch drizzle/migrations/YYYYMMDD_add_memory_system.sql
```

Add the schema:

```sql
-- Create memory_entries table
CREATE TABLE IF NOT EXISTS memory_entries (
  id SERIAL PRIMARY KEY,
  entry_id VARCHAR(255) NOT NULL UNIQUE,
  session_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(255),
  user_id INTEGER,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  embedding JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX memory_session_id_idx ON memory_entries(session_id);
CREATE INDEX memory_agent_id_idx ON memory_entries(agent_id);
CREATE INDEX memory_user_id_idx ON memory_entries(user_id);
CREATE INDEX memory_key_idx ON memory_entries(key);
CREATE INDEX memory_created_at_idx ON memory_entries(created_at);

-- Create reasoning_patterns table
CREATE TABLE IF NOT EXISTS reasoning_patterns (
  id SERIAL PRIMARY KEY,
  pattern_id VARCHAR(255) NOT NULL UNIQUE,
  pattern TEXT NOT NULL,
  result JSONB NOT NULL,
  context JSONB,
  confidence REAL NOT NULL DEFAULT 0.8,
  usage_count INTEGER NOT NULL DEFAULT 0,
  success_rate REAL NOT NULL DEFAULT 1.0,
  domain VARCHAR(255),
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  embedding JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP
);

CREATE INDEX reasoning_domain_idx ON reasoning_patterns(domain);
CREATE INDEX reasoning_confidence_idx ON reasoning_patterns(confidence);
CREATE INDEX reasoning_usage_count_idx ON reasoning_patterns(usage_count);

-- Create session_contexts table
CREATE TABLE IF NOT EXISTS session_contexts (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  user_id INTEGER,
  agent_id VARCHAR(255),
  context JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX session_context_id_idx ON session_contexts(session_id);
CREATE INDEX session_user_id_idx ON session_contexts(user_id);
```

### 2. Run Migration

```bash
npm run db:migrate
```

### 3. Install Dependencies

```bash
npm install uuid
npm install --save-dev @types/uuid
```

## Usage

### Basic Usage

```typescript
import { getMemorySystem } from "./server/services/memory";

const memory = getMemorySystem();

// Store context for a session
await memory.storeContext("session-123", {
  userId: 1,
  taskDescription: "Process user request",
  startedAt: new Date().toISOString(),
});

// Retrieve context
const context = await memory.retrieveContext("session-123");
console.log(context?.context);

// Store reasoning pattern
const patternId = await memory.storeReasoning(
  "When user requests data analysis, first validate the data format",
  { success: true, approach: "validation-first" },
  {
    confidence: 0.9,
    domain: "data-analysis",
    tags: ["validation", "best-practice"],
  }
);

// Find similar reasoning
const similar = await memory.findSimilarReasoning(
  "analyze user data",
  {
    domain: "data-analysis",
    limit: 5,
  }
);
```

### Integration with Agent Orchestrator

See `integration.example.ts` for complete examples. Here's a quick overview:

```typescript
import { getMemorySystem } from "./server/services/memory";
import { getAgentOrchestrator } from "./server/services/agentOrchestrator.service";

const memory = getMemorySystem();
const agent = getAgentOrchestrator();

// Execute task with memory support
const sessionId = "session-" + Date.now();

// Store initial context
await memory.storeContext(sessionId, {
  taskDescription: "Create marketing campaign",
  userId: 1,
});

// Check for similar past approaches
const similarPatterns = await memory.findSimilarReasoning(
  "Create marketing campaign",
  { limit: 5, minConfidence: 0.7 }
);

// Execute with enriched context
const result = await agent.executeTask({
  userId: 1,
  taskDescription: "Create marketing campaign",
  context: {
    similarApproaches: similarPatterns,
  },
});

// Store successful pattern
if (result.status === "completed") {
  await memory.storeReasoning(
    "Create marketing campaign",
    result.output,
    {
      confidence: 0.9,
      domain: "marketing",
    }
  );
}
```

### Multi-Agent Coordination

```typescript
// Agent 1 stores context
await memory.storeContext(
  "shared-session",
  "user-preferences",
  { theme: "dark", language: "en" },
  { agentId: "agent-1" }
);

// Agent 2 retrieves context
const prefs = await memory.retrieveContextValue(
  "shared-session",
  "user-preferences"
);

// Agent 3 updates context
await memory.updateContext("shared-session", {
  processedBy: ["agent-1", "agent-2", "agent-3"],
});
```

### Memory Tools for Agent

Add memory capabilities to your agent's tool registry:

```typescript
import { getMemoryTools } from "./server/services/memory/integration.example";

const memoryTools = getMemoryTools();

// Register in agent orchestrator
agent.registerTool("store_memory", memoryTools.store_memory);
agent.registerTool("retrieve_memory", memoryTools.retrieve_memory);
agent.registerTool("search_reasoning", memoryTools.search_reasoning);
agent.registerTool("store_reasoning", memoryTools.store_reasoning);
```

## API Reference

### MemorySystem

#### Context Management

- `storeContext(sessionId, context, options?)`: Store session context
- `retrieveContext(sessionId)`: Get full session context
- `retrieveContextValue(sessionId, key)`: Get specific value
- `updateContext(sessionId, updates, options?)`: Update context
- `deleteContext(sessionId, key?)`: Delete context

#### Reasoning Patterns

- `storeReasoning(pattern, result, options?)`: Store reasoning pattern
- `findSimilarReasoning(pattern, options?)`: Find similar patterns
- `updateReasoningUsage(patternId, success)`: Update usage stats
- `getTopReasoningPatterns(limit)`: Get best performing patterns

#### Search & Query

- `searchMemory(query)`: Search memory entries
- `getSessionMemories(sessionId, options?)`: Get session memories

#### Maintenance

- `getStats(sessionId?, domain?)`: Get statistics
- `cleanup(options?)`: Clean up expired/low-performing data
- `clearCaches()`: Clear in-memory caches

## Performance

### Caching

- **AgentMemory**: LRU cache with 1000 entry limit (configurable)
- **ReasoningBank**: LRU cache with 500 entry limit (configurable)
- Automatic cache invalidation on updates

### Indexes

All key columns are indexed for fast queries:
- Session ID, Agent ID, User ID
- Domain, Confidence, Usage Count
- Created/Updated timestamps

### Cleanup

Automatic cleanup removes:
- Expired context entries (based on TTL)
- Low-performing reasoning patterns (< 30% success rate after 5+ uses)

Schedule periodic cleanup:

```typescript
import { scheduleMemoryCleanup } from "./server/services/memory/integration.example";

// Run cleanup every hour
scheduleMemoryCleanup();
```

## Comparison with claude-flow

This implementation is adapted from claude-flow's memory system with key differences:

| Feature | claude-flow | This Implementation |
|---------|-------------|---------------------|
| Vector Storage | AgentDB (custom) | PostgreSQL JSONB |
| ORM | Custom SQLite | Drizzle ORM |
| Vector Search | HNSW indexing | Text similarity (extendable) |
| Embedding Support | Built-in | Stored but not used yet |
| Backend | SQLite file | PostgreSQL database |
| Performance | 150x faster semantic search | Standard SQL performance |
| Quantization | Scalar/Binary/Product | N/A (planned) |

### Future Enhancements

- Vector similarity search using pgvector extension
- Automatic embedding generation
- Distributed memory across services
- Real-time memory synchronization
- Advanced pattern matching algorithms

## Troubleshooting

### Database Connection Issues

```typescript
// Check database connection
import { getDb } from "./server/db";

const db = await getDb();
if (!db) {
  console.error("Database not initialized");
}
```

### Memory Not Persisting

- Verify migrations ran successfully
- Check database table creation
- Ensure proper permissions

### Cache Issues

```typescript
// Clear caches if needed
const memory = getMemorySystem();
memory.clearCaches();
```

## Credits

This memory system is adapted from:
- [claude-flow](https://github.com/ruvnet/claude-flow) by @ruvnet
- AgentDB v1.3.9 integration
- ReasoningBank pattern storage

## License

Same as parent project (check repository root)
