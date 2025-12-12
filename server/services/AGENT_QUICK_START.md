# Agent Orchestrator - Quick Start Guide

## 5-Minute Setup

### 1. Environment Setup

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Or add to .env file
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

### 2. Basic Usage

```typescript
import { executeAgentTask } from './server/services/agentOrchestrator.service';

// Execute a task
const result = await executeAgentTask({
  userId: 1,
  taskDescription: "Research the top 3 CRM platforms and compare their features",
  maxIterations: 30
});

console.log('Status:', result.status);  // 'completed' | 'failed' | 'needs_input' | 'max_iterations'
console.log('Output:', result.output);  // Stored data
console.log('Plan:', result.plan);      // Task plan with phases
```

### 3. Run Examples

```bash
# Run all examples
tsx server/services/agentOrchestrator.example.ts all

# Run specific example
tsx server/services/agentOrchestrator.example.ts 3
```

## Common Patterns

### Pattern 1: Simple Task
```typescript
const result = await executeAgentTask({
  userId: 1,
  taskDescription: "Calculate factorial of 10"
});
```

### Pattern 2: Research Task
```typescript
const result = await executeAgentTask({
  userId: 1,
  taskDescription: "Research Tesla's Q4 2024 earnings and extract key metrics",
  maxIterations: 40
});

const metrics = result.output.earnings_metrics;
```

### Pattern 3: API Integration
```typescript
const result = await executeAgentTask({
  userId: 1,
  taskDescription: "Fetch and analyze GitHub repo data for anthropics/claude-sdk",
  context: {
    repo: "anthropics/claude-sdk",
    metrics: ["stars", "forks", "issues"]
  }
});
```

### Pattern 4: With Context
```typescript
const result = await executeAgentTask({
  userId: 1,
  taskDescription: "Create personalized workout plan",
  context: {
    fitnessLevel: "intermediate",
    goals: ["muscle gain"],
    daysPerWeek: 3
  }
});
```

### Pattern 5: Linked to Agency Task
```typescript
const result = await executeAgentTask({
  userId: 1,
  taskId: 456,  // Links to agencyTasks table
  taskDescription: "Follow up with inactive leads",
  context: {
    leadListId: 789
  }
});
```

## Available Tools

The agent has access to these tools via Claude function calling:

| Tool | Purpose | Example Use Case |
|------|---------|------------------|
| `update_plan` | Create/update task plan | Planning multi-step tasks |
| `advance_phase` | Mark phase complete | Moving to next phase |
| `ask_user` | Request input | Need clarification/approval |
| `store_data` | Save data | Store extracted information |
| `retrieve_data` | Get saved data | Access previous results |
| `http_request` | Call external APIs | Fetch web data |

## Check Execution Status

```typescript
import { getAgentOrchestrator } from './server/services/agentOrchestrator.service';

const orchestrator = getAgentOrchestrator();
const status = await orchestrator.getExecutionStatus(executionId);

console.log({
  status: status.status,
  stepsCompleted: status.stepsCompleted,
  stepsTotal: status.stepsTotal,
  currentStep: status.currentStep,
  error: status.error
});
```

## Agent Loop Flow

```
User Task → Agent Loop → Result

Agent Loop:
1. Analyze (understand current state)
2. Plan (create/update phases)
3. Think (decide next action)
4. Select Tool (function calling)
5. Execute (run tool)
6. Observe (process result)
7. Iterate (repeat until done)
```

## Status Codes

| Status | Meaning |
|--------|---------|
| `completed` | Task finished successfully |
| `failed` | Error after 3 consecutive failures |
| `needs_input` | Agent needs user clarification |
| `max_iterations` | Reached iteration limit |

## Error Handling

The agent automatically:
- Retries failed tools (max 3 consecutive)
- Adjusts strategy after errors
- Asks user for help when stuck
- Logs all errors to database

## Configuration

Edit constants in `agentOrchestrator.service.ts`:

```typescript
const MAX_ITERATIONS = 50;              // Max loop iterations
const MAX_CONSECUTIVE_ERRORS = 3;       // Error threshold
const CLAUDE_MODEL = "claude-opus-4-5-20251101";
const MAX_TOKENS = 4096;
```

## Common Issues

### "ANTHROPIC_API_KEY not set"
```bash
export ANTHROPIC_API_KEY="your-key-here"
```

### "Database not initialized"
Ensure `DATABASE_URL` is set and database is running.

### Max iterations reached
Increase `maxIterations` in task options or simplify the task.

### Agent asks for input
Provide additional context in initial task description or handle `needs_input` status.

## Next Steps

1. **Add Browser Tools** - Integrate with Stagehand for web automation
2. **Add GHL Tools** - Connect to GoHighLevel API
3. **Create API Endpoint** - Expose via Express route
4. **Add Tests** - Unit and integration tests

## Resources

- **Full Documentation**: [AGENT_ORCHESTRATOR_README.md](./AGENT_ORCHESTRATOR_README.md)
- **Implementation Details**: [AGENT_IMPLEMENTATION_COMPLETE.md](./AGENT_IMPLEMENTATION_COMPLETE.md)
- **System Prompts**: [agentPrompts.ts](./agentPrompts.ts)
- **Examples**: [agentOrchestrator.example.ts](./agentOrchestrator.example.ts)

## Getting Help

1. Check execution logs in database `taskExecutions` table
2. Review tool history: `result.toolHistory`
3. Examine thinking steps: `result.thinkingSteps`
4. Look at conversation: Save `state.conversationHistory`

## Pro Tips

- Start with simple tasks to test
- Use clear, specific task descriptions
- Provide context for better results
- Monitor token usage (costs money!)
- Set reasonable iteration limits
- Check tool history for debugging

---

**Ready to go!** Start with the examples and experiment with different tasks.
