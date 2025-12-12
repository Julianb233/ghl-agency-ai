# Memory System - Quick Start Guide

Get up and running with the Memory System in 5 minutes.

## Step 1: Run Database Migration

```bash
# Option 1: Using psql
psql -d your_database -f server/services/memory/migration.sql

# Option 2: Using Drizzle ORM (if configured)
npm run db:migrate

# Option 3: Copy migration content to your migration tool
# Copy the contents of migration.sql to your preferred migration system
```

Verify tables were created:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('memory_entries', 'reasoning_patterns', 'session_contexts');
```

## Step 2: Install Dependencies

```bash
npm install uuid
npm install --save-dev @types/uuid
```

## Step 3: Basic Usage

### Store and Retrieve Context

```typescript
import { getMemorySystem } from "./server/services/memory";

const memory = getMemorySystem();

// Store context for a session
const sessionId = "session-" + Date.now();

await memory.storeContext(sessionId, {
  userId: 1,
  taskName: "Create marketing campaign",
  preferences: {
    style: "professional",
    tone: "friendly"
  },
  startedAt: new Date().toISOString(),
});

// Retrieve context
const context = await memory.retrieveContext(sessionId);
console.log(context?.context);
// Output: { userId: 1, taskName: "Create marketing campaign", ... }

// Retrieve specific value
const taskName = await memory.retrieveContextValue(sessionId, "taskName");
console.log(taskName);
// Output: "Create marketing campaign"
```

### Store and Find Reasoning Patterns

```typescript
// Store a successful approach
const patternId = await memory.storeReasoning(
  "For email campaigns, always test subject lines with A/B testing first",
  {
    approach: "A/B testing",
    openRate: 0.42,
    clickRate: 0.18,
  },
  {
    confidence: 0.9,
    domain: "email-marketing",
    tags: ["best-practice", "testing", "optimization"],
  }
);

// Find similar patterns later
const similar = await memory.findSimilarReasoning(
  "How to improve email open rates",
  {
    domain: "email-marketing",
    limit: 5,
    minConfidence: 0.7,
  }
);

console.log(`Found ${similar.length} similar patterns`);
similar.forEach(result => {
  console.log(`Pattern: ${result.data.pattern}`);
  console.log(`Confidence: ${result.data.confidence}`);
  console.log(`Similarity: ${result.similarity}`);
});
```

## Step 4: Integrate with Agent Orchestrator

### Option A: Simple Integration

```typescript
import { getMemorySystem } from "./server/services/memory";
import { getAgentOrchestrator } from "./server/services/agentOrchestrator.service";

async function executeTaskWithMemory(
  userId: number,
  taskDescription: string
) {
  const memory = getMemorySystem();
  const agent = getAgentOrchestrator();
  const sessionId = `session-${userId}-${Date.now()}`;

  // Store initial context
  await memory.storeContext(sessionId, {
    userId,
    taskDescription,
    startedAt: new Date().toISOString(),
  });

  // Check for similar approaches
  const similarPatterns = await memory.findSimilarReasoning(
    taskDescription,
    { limit: 3, minConfidence: 0.7 }
  );

  // Execute task
  const result = await agent.executeTask({
    userId,
    taskDescription,
    context: {
      sessionId,
      similarApproaches: similarPatterns.map(p => ({
        pattern: p.data.pattern,
        result: p.data.result,
        confidence: p.data.confidence,
      })),
    },
  });

  // Store successful reasoning
  if (result.status === "completed") {
    await memory.storeReasoning(
      taskDescription,
      result.output,
      {
        confidence: 0.8,
        domain: "task-execution",
        tags: ["successful", "automated"],
      }
    );
  }

  // Update final context
  await memory.updateContext(sessionId, {
    status: result.status,
    completedAt: new Date().toISOString(),
    iterations: result.iterations,
  });

  return result;
}

// Use it
const result = await executeTaskWithMemory(
  1,
  "Create a social media content calendar for Q1"
);
```

### Option B: Extended Agent Class

```typescript
import { getMemorySystem } from "./server/services/memory";
import {
  AgentOrchestratorService,
  ExecuteTaskOptions,
  AgentExecutionResult
} from "./server/services/agentOrchestrator.service";

class MemoryEnhancedAgent extends AgentOrchestratorService {
  private memory = getMemorySystem();

  async executeTask(
    options: ExecuteTaskOptions & { sessionId?: string }
  ): Promise<AgentExecutionResult> {
    const sessionId = options.sessionId || `session-${options.userId}-${Date.now()}`;

    // Store context before execution
    await this.memory.storeContext(sessionId, {
      userId: options.userId,
      taskDescription: options.taskDescription,
      startedAt: new Date().toISOString(),
    }, { userId: options.userId });

    // Find similar reasoning
    const similar = await this.memory.findSimilarReasoning(
      options.taskDescription,
      { limit: 5, minConfidence: 0.7 }
    );

    // Execute with enriched context
    const result = await super.executeTask({
      ...options,
      context: {
        ...options.context,
        sessionId,
        similarPatterns: similar,
      },
    });

    // Store pattern if successful
    if (result.status === "completed") {
      await this.memory.storeReasoning(
        options.taskDescription,
        result.output,
        {
          confidence: 0.8,
          domain: "task-execution",
        }
      );
    }

    return result;
  }
}

// Use the enhanced agent
const enhancedAgent = new MemoryEnhancedAgent();
const result = await enhancedAgent.executeTask({
  userId: 1,
  taskDescription: "Analyze website traffic and suggest improvements",
});
```

## Step 5: Multi-Agent Coordination

```typescript
import { getMemorySystem } from "./server/services/memory";

const memory = getMemorySystem();
const sessionId = "shared-session-" + Date.now();

// Initialize shared session
await memory.storeContext(sessionId, {
  projectName: "Website Redesign",
  deadline: "2024-03-31",
  team: ["agent-1", "agent-2", "agent-3"],
});

// Agent 1: Store its work
await memory.storeContext(
  sessionId,
  "design-mockups",
  {
    status: "completed",
    files: ["homepage.fig", "about.fig"],
    completedAt: new Date().toISOString(),
  },
  { agentId: "agent-1" }
);

// Agent 2: Read Agent 1's work
const mockups = await memory.retrieveContextValue(
  sessionId,
  "design-mockups"
);
console.log("Mockups ready:", mockups.status);

// Agent 2: Add its work
await memory.storeContext(
  sessionId,
  "frontend-code",
  {
    status: "in-progress",
    components: ["Header", "Footer", "Hero"],
  },
  { agentId: "agent-2" }
);

// Get full session context
const fullContext = await memory.retrieveContext(sessionId);
console.log("All agents' work:", fullContext?.context);
```

## Step 6: Maintenance

### Automatic Cleanup

```typescript
import { getMemorySystem } from "./server/services/memory";

const memory = getMemorySystem();

// Schedule cleanup every hour
setInterval(async () => {
  const result = await memory.cleanup({
    cleanupExpired: true,
    cleanupLowPerformance: true,
    minSuccessRate: 0.3,
    minUsageCount: 5,
  });

  console.log("Cleanup complete:", result);
  // Output: { expiredCleaned: 42, lowPerformanceCleaned: 7 }
}, 3600000);
```

### Get Statistics

```typescript
const stats = await memory.getStats();
console.log(stats);
// Output: {
//   totalEntries: 1523,
//   totalReasoningPatterns: 87,
//   avgConfidence: 0.82,
//   hitRate: 0.73,
//   storageSize: 856,
//   domains: ["email-marketing", "task-execution", "web-dev"]
// }
```

## Common Patterns

### Pattern 1: Session with TTL

```typescript
// Store context that expires in 1 hour
await memory.storeContext(
  sessionId,
  {
    tempData: "This will expire",
  },
  {
    userId: 1,
    ttl: 3600, // 1 hour in seconds
  }
);
```

### Pattern 2: Learning from Success/Failure

```typescript
const patternId = await memory.storeReasoning(
  "Approach X for problem Y",
  { outcome: "success" },
  { confidence: 0.8 }
);

// Later, after using the pattern
await memory.updateReasoningUsage(patternId, true); // success
// or
await memory.updateReasoningUsage(patternId, false); // failure

// This automatically adjusts confidence and success rate
```

### Pattern 3: Domain-Specific Reasoning

```typescript
// Store patterns by domain
await memory.storeReasoning(
  "For WordPress sites, always check PHP version first",
  { success: true },
  { domain: "web-hosting", tags: ["wordpress", "troubleshooting"] }
);

// Retrieve domain-specific patterns
const hostingPatterns = await memory.findSimilarReasoning(
  "WordPress site issues",
  { domain: "web-hosting", limit: 10 }
);
```

## Troubleshooting

### Issue: Tables not created
```bash
# Check if tables exist
psql -d your_database -c "\dt *memory*"
psql -d your_database -c "\dt *reasoning*"
psql -d your_database -c "\dt *session_contexts*"
```

### Issue: Database connection errors
```typescript
import { getDb } from "./server/db";

const db = await getDb();
if (!db) {
  console.error("Database not initialized. Check DATABASE_URL env var.");
}
```

### Issue: Cache not working
```typescript
// Clear and reset cache
const memory = getMemorySystem();
memory.clearCaches();
```

## Next Steps

- Read the full [README.md](./README.md) for complete API reference
- Check [integration.example.ts](./integration.example.ts) for advanced patterns
- Review [migration.sql](./migration.sql) for database schema details
- Integrate memory tools into your agent's tool registry

## Performance Tips

1. **Use TTL for temporary data**: Set expiration times to auto-cleanup
2. **Enable caching**: Default caches improve performance significantly
3. **Schedule cleanup**: Run periodic cleanup to maintain performance
4. **Use domains**: Organize reasoning patterns by domain for better retrieval
5. **Index appropriately**: The migration includes optimized indexes

## Support

For issues or questions:
1. Check the full [README.md](./README.md)
2. Review [integration.example.ts](./integration.example.ts)
3. Check database logs for connection issues
4. Verify migrations ran successfully

## Credits

Adapted from [claude-flow](https://github.com/ruvnet/claude-flow)'s AgentDB and ReasoningBank systems.
