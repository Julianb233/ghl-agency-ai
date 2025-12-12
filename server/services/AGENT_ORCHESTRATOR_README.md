# Agent Orchestrator Service

## Overview

The Agent Orchestrator Service implements an autonomous AI agent (Manus 1.5) using Claude Opus 4.5 with function calling. The agent operates in a continuous loop, analyzing context, planning tasks, executing tools, and iterating until tasks are complete.

## Architecture

### The 7-Step Agent Loop

```
1. ANALYZE CONTEXT
   - Review task description and current state
   - Examine plan progress and tool history
   - Identify available information and gaps

2. UPDATE/ADVANCE PLAN
   - Create structured plan with phases on first iteration
   - Advance to next phase when current phase completes
   - Update plan based on new information

3. THINK & REASON
   - Explain current understanding
   - Identify specific next action needed
   - Consider obstacles and alternatives
   - Articulate WHY this action advances the goal

4. SELECT TOOL (via Claude function calling)
   - Choose ONE specific tool for next action
   - Prepare exact parameters
   - Respond with function call

5. EXECUTE ACTION
   - System executes the selected tool
   - Tool returns result or error

6. OBSERVE RESULT
   - Analyze tool output carefully
   - Determine success or failure
   - Extract relevant information
   - Note any errors or unexpected outcomes

7. ITERATE
   - Return to step 1 with new information
   - Continue until task complete or max iterations
   - After 3 consecutive failures, ask user for help
```

## Files

### `/server/services/agentOrchestrator.service.ts`

Main orchestrator service with:
- `AgentOrchestratorService` class
- Tool registry and execution
- Agent loop implementation
- State management
- Database integration

**Key Methods:**
- `executeTask(options)` - Main entry point for task execution
- `runAgentLoop(state)` - Single iteration of the agent loop
- `executeTool(toolName, params, state)` - Execute a registered tool
- `updateExecutionRecord(state)` - Persist state to database

### `/server/services/agentPrompts.ts`

System prompts and prompt builders:
- `MANUS_SYSTEM_PROMPT` - Core agent system prompt
- `buildSystemPrompt(context)` - Add dynamic context
- `buildTaskPrompt(description)` - Initial task prompt
- `buildObservationPrompt(result, toolName)` - Post-tool execution
- `buildErrorRecoveryPrompt(error, attempt)` - Error handling

## Core Types

### AgentState
```typescript
interface AgentState {
  executionId: number;           // Database execution record ID
  userId: number;                // User who initiated task
  taskDescription: string;       // Original task description
  plan: AgentPlan | null;        // Current execution plan
  currentPhaseId: number;        // Active phase in plan
  thinkingSteps: ThinkingStep[]; // Agent's reasoning history
  iterations: number;            // Loop iteration count
  errorCount: number;            // Total errors encountered
  consecutiveErrors: number;     // Sequential errors (resets on success)
  toolHistory: ToolHistoryEntry[]; // Complete tool execution log
  context: Record<string, unknown>; // Stored data
  conversationHistory: Anthropic.MessageParam[]; // Claude conversation
  status: 'initializing' | 'planning' | 'executing' | 'completed' | 'failed' | 'needs_input';
}
```

### AgentPlan
```typescript
interface AgentPlan {
  goal: string;                  // Overall task goal
  phases: AgentPhase[];          // Ordered list of phases
  currentPhaseId: number;        // Active phase (1-indexed)
  createdAt: Date;
  updatedAt: Date;
}
```

### AgentPhase
```typescript
interface AgentPhase {
  id: number;
  name: string;
  description: string;
  successCriteria: string[];     // How to know phase is complete
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
}
```

## Registered Tools

The agent has access to these core tools via Claude function calling:

### 1. update_plan
Create or update the task execution plan.

```typescript
{
  goal: string;
  phases: Array<{
    name: string;
    description: string;
    successCriteria: string[];
  }>;
  currentPhaseId: number;
}
```

**Usage:** First iteration after receiving task, or when plan needs revision.

### 2. advance_phase
Mark current phase complete and move to next phase.

```typescript
{
  phaseId: number;
  outcome: string;
}
```

**Usage:** When all success criteria for current phase are met.

### 3. ask_user
Request input, clarification, or approval from user.

```typescript
{
  question: string;
  context?: string;
}
```

**Usage:** When stuck, need more info, or require user approval.

### 4. store_data
Save data for later retrieval.

```typescript
{
  key: string;
  value: any;
  description?: string;
}
```

**Usage:** Store extracted information, intermediate results, or any data needed in future phases.

### 5. retrieve_data
Get previously stored data.

```typescript
{
  key: string;
}
```

**Usage:** Access information saved in earlier phases.

### 6. http_request
Make HTTP request to external API.

```typescript
{
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}
```

**Usage:** Fetch data from web services, post data to APIs, interact with external systems.

## Usage Examples

### Basic Task Execution

```typescript
import { executeAgentTask } from './services/agentOrchestrator.service';

const result = await executeAgentTask({
  userId: 123,
  taskDescription: "Research the top 5 competitors in the SaaS CRM space and create a comparison table",
  context: {
    industry: "SaaS",
    category: "CRM"
  },
  maxIterations: 30
});

console.log('Status:', result.status);
console.log('Plan:', result.plan);
console.log('Output:', result.output);
console.log('Iterations:', result.iterations);
```

### With Task ID (Link to Agency Task)

```typescript
const result = await executeAgentTask({
  userId: 123,
  taskId: 456, // Links to agencyTasks table
  taskDescription: "Send follow-up email to leads who haven't responded in 3 days",
  context: {
    leadListId: 789,
    emailTemplateId: 101
  }
});
```

### Check Execution Status

```typescript
import { getAgentOrchestrator } from './services/agentOrchestrator.service';

const orchestrator = getAgentOrchestrator();
const status = await orchestrator.getExecutionStatus(executionId);

console.log('Current status:', status.status);
console.log('Steps completed:', status.stepsCompleted, '/', status.stepsTotal);
console.log('Current step:', status.currentStep);
```

## Error Handling

The agent has built-in error recovery:

1. **Consecutive Error Limit**: After 3 consecutive tool failures, the agent will either:
   - Try a fundamentally different approach
   - Use `ask_user` tool to request guidance
   - Mark execution as failed

2. **Max Iterations**: Default 50 iterations. If reached, execution status is `max_iterations`.

3. **Tool-Level Errors**: Each tool execution captures errors and includes them in the result. Agent can observe errors and adjust strategy.

4. **Fatal Errors**: Database connection issues or critical system errors are thrown and execution is marked as failed.

## Database Integration

The service integrates with the `taskExecutions` table:

```sql
task_executions (
  id SERIAL PRIMARY KEY,
  taskId INTEGER (optional),
  status VARCHAR(50),
  triggeredBy VARCHAR(50),
  triggeredByUserId INTEGER,
  stepsTotal INTEGER,
  stepsCompleted INTEGER,
  currentStep VARCHAR(255),
  stepResults JSONB,  -- toolHistory
  output JSONB,       -- state.context
  logs JSONB,         -- thinkingSteps
  error TEXT,
  startedAt TIMESTAMP,
  completedAt TIMESTAMP
)
```

The service:
- Creates execution record on start
- Updates progress every 5 iterations
- Saves final state on completion/failure

## Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional (for database)
DATABASE_URL=postgresql://...
```

### Constants (in service)

```typescript
const MAX_ITERATIONS = 50;              // Max loop iterations
const MAX_CONSECUTIVE_ERRORS = 3;       // Error threshold
const CLAUDE_MODEL = "claude-opus-4-5-20251101"; // Claude model
const MAX_TOKENS = 4096;                // Response token limit
```

## Extending with New Tools

To add new tools to the agent:

1. **Register tool function** in `registerCoreTools()`:

```typescript
this.toolRegistry.set("my_new_tool", async (params: {
  param1: string;
  param2: number;
}) => {
  // Tool implementation
  return {
    success: true,
    result: { /* tool output */ }
  };
});
```

2. **Add Claude tool definition** in `getClaudeTools()`:

```typescript
{
  name: "my_new_tool",
  description: "Clear description of what this tool does",
  input_schema: {
    type: "object" as const,
    properties: {
      param1: {
        type: "string",
        description: "Description of param1"
      },
      param2: {
        type: "number",
        description: "Description of param2"
      }
    },
    required: ["param1", "param2"]
  }
}
```

3. **Handle tool-specific state updates** in `executeTool()` if needed.

## Planned Tool Extensions

Future tools to be added:

- **Browser Automation Tools**
  - `navigate_browser` - Navigate to URL
  - `extract_page_data` - Extract structured data from page
  - `interact_with_element` - Click, type, etc.

- **GHL Integration Tools**
  - `ghl_get_contacts` - Fetch contacts from GHL
  - `ghl_send_message` - Send SMS/email via GHL
  - `ghl_create_opportunity` - Create opportunity in pipeline

- **Data Analysis Tools**
  - `analyze_data` - Perform data analysis with AI
  - `create_chart` - Generate visualizations
  - `export_csv` - Export data to CSV

- **Communication Tools**
  - `send_email` - Send email notification
  - `send_sms` - Send SMS message
  - `create_notification` - Create in-app notification

## Testing

### Manual Testing

```typescript
// Test basic execution
const result = await executeAgentTask({
  userId: 1,
  taskDescription: "List the prime numbers between 1 and 20",
  maxIterations: 10
});

// Test planning capability
const result = await executeAgentTask({
  userId: 1,
  taskDescription: "Research Tesla's latest earnings report and extract key financial metrics",
  maxIterations: 30
});

// Test error recovery
const result = await executeAgentTask({
  userId: 1,
  taskDescription: "Make an API call to an endpoint that doesn't exist",
  maxIterations: 10
});
```

### Unit Tests (TODO)

Create tests for:
- Tool registration and execution
- Error handling and recovery
- Plan creation and phase advancement
- State persistence
- Max iterations handling

## Monitoring & Observability

The service provides detailed logging:

```typescript
// Tool execution logs
console.log(`[Agent] Executing tool: ${toolName}`, toolParams);

// Loop warnings
console.warn("Agent response without tool use:", response);

// Fatal errors
console.error("[Agent Execution] Fatal error:", error);
```

**Key metrics to monitor:**
- Average iterations per task
- Success rate (completed vs failed)
- Error rate and types
- Average execution duration
- Tool usage frequency

## Performance Considerations

- **Token Usage**: Each iteration consumes tokens for system prompt, conversation history, and tools. Monitor usage closely.
- **Rate Limits**: Claude API has rate limits. Implement request queuing if needed.
- **Database Writes**: State is saved every 5 iterations to minimize DB load.
- **Long-Running Tasks**: Tasks with >30 iterations should be reviewed for optimization.

## Security Considerations

1. **API Key Protection**: Never expose `ANTHROPIC_API_KEY` in responses or logs.
2. **User Authorization**: Always verify `userId` has permission for the task.
3. **Tool Access Control**: Validate tool parameters before execution.
4. **Rate Limiting**: Implement per-user rate limits to prevent abuse.
5. **Sensitive Data**: Be careful storing sensitive information in `context` or `output`.

## Troubleshooting

### Agent Loops Without Progress
- Check if plan has clear success criteria
- Review tool results in `toolHistory`
- Agent may need additional tools to proceed

### Frequent Errors
- Verify API credentials and permissions
- Check tool parameter validation
- Review error messages in execution logs

### Max Iterations Reached
- Task may be too complex for current tool set
- Break into smaller subtasks
- Add specialized tools for the domain

### Agent Asks for User Input
- Check `ask_user` tool calls in history
- Provide additional context in initial task description
- May need clarification or approval

## Contributing

When adding features:
1. Update tool registry with new capabilities
2. Document new tools in this README
3. Add corresponding Claude tool definitions
4. Write unit tests for new functionality
5. Update type definitions as needed

## License

MIT
