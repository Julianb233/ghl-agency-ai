# Memory & Learning System

Comprehensive long-term memory and learning capabilities for the GHL Agency AI browser agent, inspired by ChatGPT Operator and Manus AI.

## Overview

The Memory & Learning System provides:

1. **Long-Term User Memory** - Persistent storage of user preferences, learned patterns, and execution history
2. **Execution Checkpointing** - Save and resume execution state for error recovery and long-running tasks
3. **Pattern Learning & Reuse** - Learn from successful executions and intelligently adapt patterns to new contexts
4. **User Feedback Learning** - Process user corrections and approvals to improve future performance
5. **Reasoning Pattern Integration** - Connect to existing reasoning bank for cross-domain knowledge sharing

## Architecture

### Core Services

```
server/services/memory/
├── agentMemory.service.ts       # Session-based context storage (existing)
├── reasoningBank.service.ts     # Reasoning pattern storage (existing)
├── userMemory.service.ts        # Long-term user memory (NEW)
├── checkpoint.service.ts        # Execution checkpointing (NEW)
├── learningEngine.service.ts    # Feedback processing & learning (NEW)
├── patternReuse.service.ts      # Pattern matching & adaptation (NEW)
└── schema.ts                    # Memory system database schema (existing)
```

### Database Tables

```
drizzle/schema-memory.ts
├── user_memory              # User preferences and learned patterns
├── execution_checkpoints    # Execution state snapshots
├── task_success_patterns    # Successful task patterns
├── user_feedback           # User corrections and feedback
└── workflow_patterns       # Reusable workflow definitions
```

## Features

### 1. Long-Term User Memory

Stores persistent user-specific information across sessions:

```typescript
import { getUserMemoryService } from './server/services/memory/userMemory.service';

const userMemory = getUserMemoryService();

// Get user memory (auto-creates if doesn't exist)
const memory = await userMemory.getUserMemory(userId);

// Access preferences
console.log(memory.preferences);
// {
//   actionSpeed: 'normal',
//   approvalRequired: true,
//   favoriteStrategies: [...],
//   autoApprovePatterns: ['ghl_contact_create'],
//   defaultTimeout: 30000,
//   maxRetries: 3
// }

// Update preferences
await userMemory.updatePreferences(userId, {
  actionSpeed: 'fast',
  approvalRequired: false
});
```

#### Task History Tracking

```typescript
// Record task execution
await userMemory.addTaskHistory(userId, {
  taskType: 'ghl_contact_create',
  executionId: 123,
  timestamp: new Date(),
  success: true,
  executionTime: 5432,
  approach: 'direct-api'
});

// Get statistics
const stats = await userMemory.getUserStats(userId);
console.log(stats);
// {
//   totalExecutions: 45,
//   successfulExecutions: 42,
//   avgExecutionTime: 4821,
//   mostUsedTasks: { 'ghl_contact_create': 20, ... },
//   preferredApproaches: { 'ghl_contact_create': 'direct-api' }
// }
```

#### Learned Patterns

```typescript
// Learn a GHL selector
await userMemory.learnSelector(userId, 'contact_name_input', '#contact-name-field');

// Retrieve learned selector
const selector = await userMemory.getSelector(userId, 'contact_name_input');
// Returns: '#contact-name-field'
```

### 2. Execution Checkpointing

Save execution state for recovery and resumption:

```typescript
import { getCheckpointService } from './server/services/memory/checkpoint.service';

const checkpointService = getCheckpointService();

// Create checkpoint during execution
const checkpointId = await checkpointService.createCheckpoint({
  executionId: 123,
  userId: 456,
  phaseId: 2,
  phaseName: 'extracting_data',
  stepIndex: 5,
  completedSteps: ['login', 'navigate', 'find_contact'],
  partialResults: {
    contactId: '12345',
    contactName: 'John Doe'
  },
  sessionState: {
    url: 'https://app.gohighlevel.com/contacts',
    cookies: [...],
    localStorage: { sessionToken: '...' },
    authenticatedAs: 'user@example.com'
  },
  checkpointReason: 'phase_complete',
  ttlSeconds: 24 * 60 * 60 // 24 hours
});

// Load checkpoint for resumption
const checkpoint = await checkpointService.loadCheckpoint(checkpointId);

// Resume from checkpoint
const resumeResult = await checkpointService.resumeFromCheckpoint(checkpointId);
if (resumeResult) {
  console.log('Resuming from step:', resumeResult.resumeFromStep);
  console.log('Partial results:', resumeResult.context.partialResults);
  console.log('Session state:', resumeResult.context.sessionState);
}
```

#### Auto-Checkpoint on Errors

```typescript
// In your execution service
try {
  await executeStep(step);
} catch (error) {
  // Auto-save checkpoint on error
  const checkpointId = await checkpointService.createCheckpoint({
    executionId,
    userId,
    phaseId,
    stepIndex,
    completedSteps,
    partialResults,
    sessionState,
    errorInfo: {
      error: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      retryable: true
    },
    checkpointReason: 'error'
  });

  console.log('Checkpoint created for recovery:', checkpointId);
  throw error; // Re-throw or handle
}
```

#### Get Latest Checkpoint

```typescript
// Get latest checkpoint for an execution
const latestCheckpoint = await checkpointService.getLatestCheckpoint(executionId);

if (latestCheckpoint?.canResume) {
  // Offer user option to resume
  console.log('Would you like to resume from the last checkpoint?');
}
```

### 3. Learning Engine

Processes feedback and learns from user interactions:

```typescript
import { getLearningEngine } from './server/services/memory/learningEngine.service';

const learningEngine = getLearningEngine();

// Get recommended strategy for a task
const strategy = await learningEngine.getRecommendedStrategy({
  userId: 123,
  executionId: 456,
  taskType: 'ghl_opportunity_create'
});

console.log(strategy);
// {
//   approach: 'api-with-fallback',
//   confidence: 0.87,
//   reasoning: 'Based on 12 previous successful executions (92% success rate)',
//   source: 'task_pattern'
// }
```

#### Process Execution Feedback

```typescript
// After execution completes
await learningEngine.processFeedback({
  userId: 123,
  executionId: 456,
  taskType: 'ghl_contact_create',
  success: true,
  approach: 'direct-api',
  executionTime: 4532,
  feedback: {
    type: 'approval',
    originalAction: { method: 'POST', endpoint: '/contacts' }
  }
});
```

#### Record User Corrections

```typescript
// User corrects an action
await learningEngine.processFeedback({
  userId: 123,
  executionId: 456,
  taskType: 'ghl_contact_create',
  success: false,
  approach: 'attempted-approach',
  executionTime: 2341,
  feedback: {
    type: 'correction',
    originalAction: {
      contactData: { name: 'John', phone: '555-1234' }
    },
    correctedAction: {
      contactData: { firstName: 'John', lastName: 'Doe', phone: '+1-555-1234' }
    }
  }
});
```

#### Auto-Approval Learning

```typescript
// Check if task should auto-approve
const shouldApprove = await learningEngine.shouldRequestApproval(userId, taskType);

if (!shouldApprove) {
  // User has approved this task type 5+ times - auto-approve
  console.log('Auto-approving based on learned preference');
  await executeTask();
} else {
  // Request approval
  await requestUserApproval();
}
```

### 4. Pattern Reuse

Intelligently find and adapt successful patterns:

```typescript
import { getPatternReuseService } from './server/services/memory/patternReuse.service';

const patternReuse = getPatternReuseService();

// Find best matching pattern
const match = await patternReuse.findBestPattern({
  taskType: 'ghl_opportunity_create',
  taskName: 'Create Sales Opportunity',
  userId: 123,
  parameters: {
    pipelineId: 'abc123',
    contactId: 'def456'
  },
  context: {
    currentPage: 'opportunities',
    authenticated: true
  }
});

if (match) {
  console.log('Found pattern:', match.pattern.taskName);
  console.log('Similarity:', match.similarity);
  console.log('Confidence:', match.confidence);
  console.log('Needs adaptation:', match.adaptationRequired);

  if (match.adaptationRequired) {
    console.log('Suggestions:', match.adaptationSuggestions);
  }
}
```

#### Adapt Pattern to New Context

```typescript
// Adapt a pattern to new context
const adapted = await patternReuse.adaptPattern(match.pattern, {
  taskType: 'ghl_opportunity_create',
  userId: 123,
  parameters: {
    pipelineId: 'new-pipeline-123', // Different pipeline
    contactId: 'xyz789'
  }
});

console.log('Adaptations:', adapted.adaptations);
// [
//   {
//     field: 'contextConditions.pipelineId',
//     originalValue: 'abc123',
//     adaptedValue: 'new-pipeline-123',
//     reason: 'Context condition changed in target environment'
//   }
// ]

// Use adapted pattern
await executeWithPattern(adapted.adapted);
```

#### Record Pattern Usage

```typescript
// After using a pattern, record success/failure
await patternReuse.recordPatternUsage(
  patternId,
  true, // success
  4231, // execution time
  [ // adaptations made
    { field: 'pipelineId', value: 'new-pipeline-123' }
  ]
);
```

### 5. User Insights & Analytics

```typescript
// Get comprehensive user insights
const insights = await learningEngine.getUserInsights(userId);

console.log(insights);
// {
//   stats: { totalExecutions: 150, successfulExecutions: 142, ... },
//   topTasks: [
//     { taskType: 'ghl_contact_create', count: 45 },
//     { taskType: 'ghl_opportunity_update', count: 32 }
//   ],
//   successRate: 0.947,
//   averageExecutionTime: 4821,
//   learnedPatterns: 23,
//   autoApprovedTasks: ['ghl_contact_create', 'ghl_note_add']
// }
```

## Integration Examples

### Example 1: Execution with Checkpointing

```typescript
async function executeWithCheckpoints(execution: Execution, userId: number) {
  const checkpointService = getCheckpointService();

  try {
    for (let i = 0; i < execution.steps.length; i++) {
      const step = execution.steps[i];

      // Execute step
      const result = await executeStep(step);

      // Create checkpoint after each phase
      if (step.isPhaseEnd) {
        await checkpointService.createCheckpoint({
          executionId: execution.id,
          userId,
          phaseId: step.phaseId,
          phaseName: step.phaseName,
          stepIndex: i + 1,
          completedSteps: execution.steps.slice(0, i + 1).map(s => s.id),
          partialResults: execution.results,
          sessionState: await captureSessionState(),
          checkpointReason: 'phase_complete'
        });
      }
    }

    // Execution complete - invalidate checkpoints
    await checkpointService.invalidateExecutionCheckpoints(execution.id);

  } catch (error) {
    // Error occurred - create error checkpoint
    await checkpointService.createCheckpoint({
      executionId: execution.id,
      userId,
      stepIndex: i,
      completedSteps: execution.steps.slice(0, i).map(s => s.id),
      partialResults: execution.results,
      sessionState: await captureSessionState(),
      errorInfo: {
        error: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
        retryable: isRetryableError(error)
      },
      checkpointReason: 'error'
    });

    throw error;
  }
}
```

### Example 2: Resume from Checkpoint

```typescript
async function resumeExecution(executionId: number) {
  const checkpointService = getCheckpointService();
  const checkpoint = await checkpointService.getLatestCheckpoint(executionId);

  if (!checkpoint || !checkpoint.canResume) {
    throw new Error('No resumable checkpoint found');
  }

  // Resume from checkpoint
  const resumeResult = await checkpointService.resumeFromCheckpoint(checkpoint.checkpointId);

  // Restore session state
  await restoreSessionState(resumeResult.context.sessionState);

  // Continue execution from saved step
  const execution = await getExecution(executionId);
  const remainingSteps = execution.steps.slice(resumeResult.resumeFromStep);

  console.log(`Resuming from step ${resumeResult.resumeFromStep} of ${execution.steps.length}`);

  // Execute remaining steps
  for (const step of remainingSteps) {
    await executeStep(step, resumeResult.context.partialResults);
  }
}
```

### Example 3: Pattern-Based Execution

```typescript
async function executeWithPatterns(task: Task, userId: number) {
  const patternReuse = getPatternReuseService();
  const learningEngine = getLearningEngine();

  // Find best matching pattern
  const match = await patternReuse.findBestPattern({
    taskType: task.type,
    userId,
    parameters: task.parameters
  });

  if (match && match.confidence > 0.7) {
    console.log(`Using learned pattern (${match.confidence.toFixed(2)} confidence)`);

    // Adapt pattern if needed
    if (match.adaptationRequired) {
      const adapted = await patternReuse.adaptPattern(match.pattern, {
        taskType: task.type,
        userId,
        parameters: task.parameters
      });

      // Execute with adapted pattern
      const startTime = Date.now();
      const result = await executeWithPattern(adapted.adapted);
      const executionTime = Date.now() - startTime;

      // Record pattern usage
      await patternReuse.recordPatternUsage(
        match.pattern.patternId,
        result.success,
        executionTime,
        adapted.adaptations
      );

      return result;
    }
  }

  // No pattern found - execute normally
  console.log('No pattern found - executing with default strategy');
  return await executeTask(task);
}
```

### Example 4: Learning from Feedback

```typescript
async function handleExecutionComplete(execution: Execution, userId: number) {
  const learningEngine = getLearningEngine();

  // Process execution feedback
  await learningEngine.processFeedback({
    userId,
    executionId: execution.id,
    taskType: execution.taskType,
    success: execution.status === 'completed',
    approach: execution.approach,
    executionTime: execution.duration
  });

  // If successful, check if we should store as pattern
  if (execution.status === 'completed') {
    const userMemory = getUserMemoryService();
    const stats = await userMemory.getUserStats(userId);

    // Store as pattern after 3+ successes
    if (stats.mostUsedTasks[execution.taskType] >= 3) {
      await userMemory.storeTaskPattern(userId, {
        taskType: execution.taskType,
        taskName: execution.name,
        successfulApproach: {
          approach: execution.approach,
          steps: execution.steps
        },
        selectors: execution.usedSelectors,
        avgExecutionTime: execution.duration
      });
    }
  }
}
```

## Database Schema

### user_memory

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | User reference |
| preferences | jsonb | User preferences (action speed, approval, etc.) |
| taskHistory | jsonb | Recent task execution history (last 100) |
| learnedPatterns | jsonb | GHL selectors, workflows, error recovery |
| userCorrections | jsonb | User corrections (last 50) |
| stats | jsonb | Aggregated execution statistics |

### execution_checkpoints

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| checkpointId | varchar(255) | Unique checkpoint ID |
| executionId | integer | Execution reference |
| userId | integer | User reference |
| phaseId | integer | Current phase ID |
| stepIndex | integer | Current step index |
| completedSteps | jsonb | Array of completed steps |
| partialResults | jsonb | Intermediate results |
| sessionState | jsonb | Browser session state |
| browserContext | jsonb | Page state, screenshot, etc. |
| checkpointReason | varchar(100) | error, manual, auto, phase_complete |
| canResume | boolean | Whether resumable |
| resumeCount | integer | Times resumed |

### task_success_patterns

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| patternId | varchar(255) | Unique pattern ID |
| userId | integer | User reference |
| taskType | varchar(100) | Task type identifier |
| successfulApproach | jsonb | The approach that worked |
| selectors | jsonb | Successful selectors |
| workflow | jsonb | Step-by-step workflow |
| successRate | real | Success rate (0.0-1.0) |
| confidence | real | Confidence score (0.0-1.0) |
| usageCount | integer | Times used |

### user_feedback

| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| feedbackId | varchar(255) | Unique feedback ID |
| userId | integer | User reference |
| feedbackType | varchar(50) | correction, approval, rejection, suggestion |
| originalAction | jsonb | Original action |
| correctedAction | jsonb | User's correction |
| processed | boolean | Whether processed |

## API Endpoints (To Add)

Suggested REST API endpoints for the memory system:

```
GET    /api/memory/user/:userId                    # Get user memory
PUT    /api/memory/user/:userId/preferences        # Update preferences
GET    /api/memory/user/:userId/stats              # Get user statistics
GET    /api/memory/user/:userId/insights           # Get user insights

GET    /api/checkpoints/execution/:executionId     # Get checkpoints for execution
GET    /api/checkpoints/:checkpointId              # Get specific checkpoint
POST   /api/checkpoints/:checkpointId/resume       # Resume from checkpoint
DELETE /api/checkpoints/:checkpointId              # Delete checkpoint

GET    /api/patterns/task/:taskType                # Get patterns for task type
GET    /api/patterns/:patternId                    # Get specific pattern
POST   /api/patterns/match                         # Find matching pattern
POST   /api/patterns/adapt                         # Adapt pattern to context

POST   /api/feedback                               # Submit user feedback
GET    /api/feedback/unprocessed                   # Get unprocessed feedback
```

## Cron Jobs (To Add)

Suggested periodic maintenance tasks:

```typescript
// Clean up expired checkpoints (run daily)
async function cleanupExpiredCheckpoints() {
  const checkpointService = getCheckpointService();
  const deleted = await checkpointService.cleanupExpiredCheckpoints();
  console.log(`Cleaned up ${deleted} expired checkpoints`);
}

// Process unprocessed feedback (run hourly)
async function processFeedback() {
  const learningEngine = getLearningEngine();
  const processed = await learningEngine.processUnprocessedFeedback();
  console.log(`Processed ${processed} feedback items`);
}

// Update pattern statistics (run daily)
async function updatePatternStats() {
  // Calculate and update pattern success rates, confidence scores
}
```

## Testing

See test files:
- `server/services/memory/userMemory.service.test.ts`
- `server/services/memory/checkpoint.service.test.ts`
- `server/services/memory/learningEngine.service.test.ts`
- `server/services/memory/patternReuse.service.test.ts`

## Future Enhancements

1. **Vector Embeddings** - Use embeddings for semantic pattern matching
2. **Claude Integration** - Use Claude to analyze corrections and generate adaptations
3. **Multi-Agent Learning** - Share patterns across similar agents
4. **Confidence Decay** - Reduce confidence of unused patterns over time
5. **A/B Testing** - Test different approaches and learn optimal strategies
6. **Explainability** - Provide detailed explanations for pattern selections
7. **Pattern Versioning** - Track pattern evolution over time
8. **Cross-User Patterns** - Learn from aggregated user data (privacy-preserving)

## Migration

Run the migration:

```bash
# Using drizzle-kit
npm run db:push

# Or manually run SQL
psql -d your_database < drizzle/migrations/0007_memory_and_learning_system.sql
```

## License

Same as parent project.
