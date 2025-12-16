# MapTool - Parallel Function Execution for Collections

## Overview

The **MapTool** is a powerful utility for executing functions in parallel over collections with advanced features including concurrency control, progress tracking, error handling, and retry logic. It's designed for the GHL Agency AI browser agent platform to efficiently process large datasets and perform bulk operations.

## Features

- **Parallel Execution**: Process multiple items concurrently with configurable concurrency limits
- **Sequential Processing**: Execute items one at a time when order matters
- **Batched Processing**: Process items in chunks for API rate limit compliance
- **Progress Tracking**: Real-time progress updates with ETA calculations
- **Error Handling**: Graceful error handling with partial results
- **Retry Logic**: Automatic retry with exponential backoff
- **Timeout Management**: Per-item timeout configuration
- **Filter & Reduce**: Built-in filter and reduce operations
- **SSE Events**: Server-sent events for real-time progress updates

## Installation

The MapTool is automatically registered in the tool registry and available to all agents.

```typescript
import { getMapTool, MapTool } from './tools/MapTool';
import { getToolRegistry } from './tools';

// Get singleton instance
const mapTool = getMapTool();

// Or get from registry
const registry = getToolRegistry();
const mapTool = registry.get('map');
```

## API Reference

### Core Methods

#### `map<T, R>(items: T[], fn: MapFunction<T, R>, options?: MapOptions): Promise<MapResult<R>>`

Execute a function on each item in parallel with concurrency control.

**Parameters:**
- `items`: Array of items to process
- `fn`: Function to execute on each item `(item, index, items) => result | Promise<result>`
- `options`: Optional configuration object

**Returns:** `MapResult<R>` with results, errors, and statistics

**Example:**
```typescript
const result = await mapTool.map(
  [1, 2, 3, 4, 5],
  async (x) => x * 2,
  { concurrency: 3, timeout: 5000 }
);
```

---

#### `mapSequential<T, R>(items: T[], fn: MapFunction<T, R>, options?): Promise<MapResult<R>>`

Execute a function on each item sequentially (one at a time).

**Use Cases:**
- Operations that must maintain order
- Rate-limited APIs requiring sequential requests
- Stateful operations with dependencies

**Example:**
```typescript
const result = await mapTool.mapSequential(
  ['step1', 'step2', 'step3'],
  async (step) => processStep(step)
);
```

---

#### `mapBatched<T, R>(items: T[], fn: MapFunction<T, R>, batchSize: number, options?): Promise<MapResult<R>>`

Process items in batches with parallel execution within each batch.

**Parameters:**
- `batchSize`: Number of items per batch

**Use Cases:**
- Bulk API operations with batch size limits
- Memory-constrained processing
- Controlled load distribution

**Example:**
```typescript
// Process 100 items in batches of 10
const result = await mapTool.mapBatched(
  items,
  async (item) => processItem(item),
  10,
  { concurrency: 3 }
);
```

---

#### `filter<T>(items: T[], predicate: PredicateFunction<T>, options?): Promise<ToolResult<T[]>>`

Filter items based on an async predicate function.

**Example:**
```typescript
const activeContacts = await mapTool.filter(
  contacts,
  async (contact) => contact.status === 'active',
  { concurrency: 5 }
);
```

---

#### `reduce<T, R>(items: T[], fn: ReducerFunction<T, R>, initial: R, options?): Promise<ToolResult<R>>`

Reduce items to a single value using an async reducer function.

**Example:**
```typescript
const total = await mapTool.reduce(
  [1, 2, 3, 4, 5],
  async (acc, x) => acc + x,
  0
);
```

## Options

### MapOptions Interface

```typescript
interface MapOptions {
  concurrency?: number;        // Max parallel executions (default: 3)
  timeout?: number;            // Per-item timeout in ms (default: 30000)
  retries?: number;            // Number of retries for failed items (default: 0)
  onProgress?: (progress: MapProgress) => void;  // Progress callback
  stopOnError?: boolean;       // Stop all on first error (default: false)
  retryDelay?: number;         // Delay between retries in ms (default: 1000)
}
```

### MapProgress Interface

```typescript
interface MapProgress {
  total: number;                // Total number of items
  completed: number;            // Number of completed items
  successful: number;           // Number of successful items
  failed: number;               // Number of failed items
  inProgress: number;           // Number of items currently processing
  percentComplete: number;      // Percentage complete (0-100)
  estimatedTimeRemaining?: number;  // Estimated time remaining in ms
  currentItem?: unknown;        // Current item being processed
}
```

### MapResult Interface

```typescript
interface MapResult<T> {
  success: boolean;             // Whether all items succeeded
  results: Array<T | null>;     // Results in same order as input (null for failures)
  errors: Array<string | null>; // Errors in same order (null for successes)
  successCount: number;         // Number of successful items
  failureCount: number;         // Number of failed items
  duration: number;             // Total execution time in ms
  progress: MapProgress;        // Final progress state
}
```

## Usage Patterns

### 1. Basic Parallel Processing

```typescript
const contactIds = ['id-1', 'id-2', 'id-3', 'id-4', 'id-5'];

const result = await mapTool.map(
  contactIds,
  async (contactId) => {
    const contact = await fetchContact(contactId);
    return contact;
  },
  {
    concurrency: 3,
    timeout: 10000,
    retries: 2,
  }
);

console.log(`Processed ${result.successCount} of ${contactIds.length} contacts`);
```

### 2. Progress Tracking

```typescript
await mapTool.map(
  items,
  async (item) => processItem(item),
  {
    concurrency: 5,
    onProgress: (progress) => {
      console.log(
        `Progress: ${progress.percentComplete.toFixed(0)}% ` +
        `(${progress.completed}/${progress.total}) - ` +
        `ETA: ${progress.estimatedTimeRemaining ? Math.round(progress.estimatedTimeRemaining / 1000) + 's' : '...'}`
      );
    },
  }
);
```

### 3. Error Handling with Partial Results

```typescript
const result = await mapTool.map(
  items,
  async (item) => processItem(item),
  {
    stopOnError: false, // Continue processing even if some items fail
    retries: 3,
    retryDelay: 2000,
  }
);

// Handle partial success
if (!result.success) {
  console.log(`${result.failureCount} items failed`);

  // Get failed items
  const failedItems = items.filter((_, i) => result.errors[i] !== null);
  console.log('Failed items:', failedItems);

  // Get successful results
  const successfulResults = result.results.filter(r => r !== null);
  console.log('Successful results:', successfulResults);
}
```

### 4. Browser Automation - Parallel Page Processing

```typescript
// Process multiple GHL contact pages in parallel
mapTool.registerFunction('extractContactData', async (contactUrl: string) => {
  // Use browser agent to navigate and extract data
  const page = await browserSession.newPage();
  await page.goto(contactUrl);

  const data = await page.evaluate(() => {
    return {
      name: document.querySelector('.contact-name')?.textContent,
      email: document.querySelector('.contact-email')?.textContent,
      phone: document.querySelector('.contact-phone')?.textContent,
    };
  });

  await page.close();
  return data;
});

const contactUrls = [
  'https://app.gohighlevel.com/contacts/1',
  'https://app.gohighlevel.com/contacts/2',
  'https://app.gohighlevel.com/contacts/3',
];

const result = await mapTool.execute(
  {
    action: 'map',
    items: contactUrls,
    fn: 'extractContactData',
    options: JSON.stringify({
      concurrency: 2,  // Only 2 browser tabs at a time
      timeout: 15000,
    }),
  },
  context
);
```

### 5. Bulk Updates with Batching

```typescript
// Update 1000 opportunities in batches of 50
const opportunityIds = [...]; // 1000 IDs

mapTool.registerFunction('updateOpportunity', async (oppId: string) => {
  const response = await fetch(`/api/opportunities/${oppId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'updated' }),
  });
  return response.json();
});

const result = await mapTool.execute(
  {
    action: 'mapBatched',
    items: opportunityIds,
    fn: 'updateOpportunity',
    batchSize: 50,
    options: JSON.stringify({
      concurrency: 5,  // 5 concurrent requests per batch
      retries: 2,
    }),
  },
  context
);

console.log(`Updated ${result.metadata.successCount} opportunities in ${result.metadata.batchCount} batches`);
```

### 6. Custom Function Registration

```typescript
// Register reusable functions
mapTool.registerFunction('validateContact', async (contact) => {
  if (!contact.email) throw new Error('Missing email');
  if (!contact.name) throw new Error('Missing name');
  return { ...contact, validated: true };
});

mapTool.registerFunction('enrichContact', async (contact) => {
  const enrichedData = await externalAPI.enrich(contact.email);
  return { ...contact, ...enrichedData };
});

// Chain operations
const validated = await mapTool.map(contacts, (c) => validateContact(c));
const enriched = await mapTool.map(validated.results, (c) => enrichContact(c));
```

## Integration with Agent Orchestrator

The MapTool is automatically available to the Agent Orchestrator and can be invoked through Claude function calling:

```typescript
// The agent can call the map tool like this:
{
  "tool_name": "map_execute",
  "parameters": {
    "action": "map",
    "items": ["item1", "item2", "item3"],
    "fn": "registeredFunctionName",
    "options": {
      "concurrency": 3,
      "timeout": 5000,
      "retries": 2
    }
  }
}
```

## Performance Considerations

### Concurrency Tuning

- **Low concurrency (1-3)**: Use for resource-intensive operations (browser automation, heavy computation)
- **Medium concurrency (4-10)**: Use for I/O-bound operations (API calls, file processing)
- **High concurrency (10+)**: Use for lightweight operations (in-memory transformations)

### Memory Management

When processing large datasets:
1. Use `mapBatched()` to limit memory usage
2. Set appropriate `batchSize` based on available memory
3. Consider using sequential processing for very large items

### Timeout Guidelines

- **Short timeout (1-5s)**: Fast API calls, simple operations
- **Medium timeout (5-30s)**: Browser automation, complex API calls
- **Long timeout (30s+)**: Heavy computations, large file processing

## Error Scenarios

### Handling All Failures

```typescript
const result = await mapTool.map(items, fn, { stopOnError: false });

if (result.failureCount === items.length) {
  console.error('All items failed!');
  console.error('Errors:', result.errors);
}
```

### Stop on First Error

```typescript
const result = await mapTool.map(items, fn, { stopOnError: true });

if (!result.success) {
  const firstErrorIndex = result.errors.findIndex(e => e !== null);
  console.error('Failed at item', firstErrorIndex, ':', result.errors[firstErrorIndex]);
}
```

### Retry with Exponential Backoff

```typescript
const result = await mapTool.map(
  items,
  async (item) => unreliableOperation(item),
  {
    retries: 5,
    retryDelay: 1000, // Will be 1s, 2s, 3s, 4s, 5s
  }
);
```

## Testing

Run the comprehensive test suite:

```bash
npm test MapTool.test.ts
```

Run examples:

```bash
npx tsx server/services/tools/MapTool.example.ts
```

## Best Practices

1. **Always set appropriate timeouts** to prevent hanging operations
2. **Use concurrency limits** to avoid overwhelming external services
3. **Handle partial failures** gracefully with `stopOnError: false`
4. **Monitor progress** for long-running operations
5. **Register reusable functions** for common operations
6. **Use batching** for API endpoints with rate limits
7. **Test with small datasets** before scaling to production
8. **Log errors** for debugging and monitoring

## Advanced Usage

### Custom Progress Tracking with SSE

```typescript
import { AgentSSEEmitter } from '../_core/agent-sse-events';

const emitter = new AgentSSEEmitter(userId, executionId);

await mapTool.map(
  items,
  async (item) => processItem(item),
  {
    onProgress: (progress) => {
      emitter.emit('map_progress', {
        completed: progress.completed,
        total: progress.total,
        percentComplete: progress.percentComplete,
        eta: progress.estimatedTimeRemaining,
      });
    },
  }
);
```

### Combining Map Operations

```typescript
// Filter -> Map -> Reduce pipeline
const activeContacts = await mapTool.filter(
  contacts,
  async (c) => c.status === 'active'
);

const enrichedContacts = await mapTool.map(
  activeContacts.data,
  async (c) => enrichContact(c)
);

const totalRevenue = await mapTool.reduce(
  enrichedContacts.results.filter(r => r !== null),
  async (acc, c) => acc + (c.revenue || 0),
  0
);
```

## Troubleshooting

### Issue: Operations timing out

**Solution:** Increase timeout or reduce concurrency
```typescript
{ timeout: 60000, concurrency: 1 }
```

### Issue: Memory errors with large datasets

**Solution:** Use batched processing
```typescript
mapTool.mapBatched(items, fn, 100, { concurrency: 3 })
```

### Issue: Rate limiting from external API

**Solution:** Use sequential processing with delays
```typescript
await mapTool.mapSequential(items, async (item) => {
  const result = await apiCall(item);
  await new Promise(r => setTimeout(r, 1000)); // 1 second delay
  return result;
});
```

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting PRs:

```bash
npm test
npx tsc --noEmit
```
