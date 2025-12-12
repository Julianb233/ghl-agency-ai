# Migration Guide: Integrating Multi-Provider LLM System

This guide shows how to migrate the existing `agentOrchestrator.service.ts` to use the new multi-provider LLM system.

## Current Architecture

```typescript
// Current: Direct Anthropic SDK usage
import Anthropic from "@anthropic-ai/sdk";

export class AgentOrchestratorService {
  private claude: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.claude = new Anthropic({ apiKey });
  }

  private async runAgentLoop(state: AgentState): Promise<boolean> {
    const response = await this.claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: state.conversationHistory,
      tools: this.getClaudeTools(),
    });
    // ...
  }
}
```

## New Architecture

```typescript
// New: Multi-provider support
import { ProviderManager, createProviderManager, LLMRequest } from './providers';

export class AgentOrchestratorService {
  private providerManager: ProviderManager;

  constructor(providerManager?: ProviderManager) {
    if (providerManager) {
      this.providerManager = providerManager;
    }
    // Will be initialized in async method
  }

  async initialize() {
    if (!this.providerManager) {
      this.providerManager = await createProviderManager();
    }
  }

  private async runAgentLoop(state: AgentState): Promise<boolean> {
    // Convert to unified format
    const request: LLMRequest = {
      messages: state.conversationHistory,
      tools: this.getToolsInUnifiedFormat(),
      temperature: 0.7,
      maxTokens: MAX_TOKENS,
    };

    const response = await this.providerManager.complete(request);
    // Response is now in unified format
    // ...
  }
}
```

## Step-by-Step Migration

### Step 1: Update Constructor

**Before:**
```typescript
constructor() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }
  this.claude = new Anthropic({ apiKey });
  this.toolRegistry = new Map();
  this.registerCoreTools();
}
```

**After:**
```typescript
private providerManager?: ProviderManager;

constructor(providerManager?: ProviderManager) {
  // Accept optional provider manager for dependency injection
  this.providerManager = providerManager;
  this.toolRegistry = new Map();
  this.registerCoreTools();
}

async initialize(): Promise<void> {
  // Initialize provider manager if not provided
  if (!this.providerManager) {
    this.providerManager = await createProviderManager();
  }
}
```

### Step 2: Update Message Creation

**Before:**
```typescript
const response = await this.claude.messages.create({
  model: CLAUDE_MODEL,
  max_tokens: MAX_TOKENS,
  system: systemPrompt,
  messages: state.conversationHistory,
  tools: this.getClaudeTools(),
});
```

**After:**
```typescript
// Build system message
const messages = [
  { role: 'system' as const, content: systemPrompt },
  ...state.conversationHistory,
];

// Create request
const request: LLMRequest = {
  messages,
  tools: this.getToolsInUnifiedFormat(),
  temperature: 0.7,
  maxTokens: MAX_TOKENS,
};

// Call provider manager
const response = await this.providerManager!.complete(request);
```

### Step 3: Convert Tools Format

**Before (Claude-specific):**
```typescript
private getClaudeTools(): Anthropic.Tool[] {
  return [
    {
      name: "update_plan",
      description: "Create or update the task execution plan",
      input_schema: {
        type: "object" as const,
        properties: { /* ... */ },
        required: ["goal", "phases", "currentPhaseId"]
      }
    }
  ];
}
```

**After (Unified format):**
```typescript
import { LLMTool } from './providers';

private getToolsInUnifiedFormat(): LLMTool[] {
  return [
    {
      type: 'function',
      function: {
        name: "update_plan",
        description: "Create or update the task execution plan",
        parameters: {
          type: "object",
          properties: { /* ... */ },
          required: ["goal", "phases", "currentPhaseId"]
        }
      }
    }
  ];
}
```

### Step 4: Handle Tool Calls

**Before:**
```typescript
const toolUse = response.content.find(
  (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
);

if (toolUse) {
  const toolName = toolUse.name;
  const toolParams = toolUse.input as Record<string, unknown>;
  // ...
}
```

**After:**
```typescript
if (response.toolCalls && response.toolCalls.length > 0) {
  const toolCall = response.toolCalls[0];
  const toolName = toolCall.function.name;
  const toolParams = JSON.parse(toolCall.function.arguments);
  // ...
}
```

### Step 5: Update Response Handling

**Before:**
```typescript
const textBlock = response.content.find(
  (block): block is Anthropic.TextBlock => block.type === "text"
);

if (textBlock?.text.toLowerCase().includes("complete")) {
  state.status = 'completed';
}
```

**After:**
```typescript
if (response.content.toLowerCase().includes("complete")) {
  state.status = 'completed';
}
```

### Step 6: Update Streaming (if used)

**Before:**
```typescript
const stream = await this.claude.messages.create({
  model: CLAUDE_MODEL,
  messages: state.conversationHistory,
  stream: true,
});

for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    // Handle delta
  }
}
```

**After:**
```typescript
const request: LLMRequest = {
  messages: state.conversationHistory,
  maxTokens: MAX_TOKENS,
};

for await (const event of this.providerManager!.streamComplete(request)) {
  if (event.type === 'content') {
    // Handle content delta
  } else if (event.type === 'tool_calls') {
    // Handle tool calls
  } else if (event.type === 'done') {
    // Handle completion
  }
}
```

## Complete Example

Here's a complete updated version of the key method:

```typescript
private async runAgentLoop(state: AgentState): Promise<boolean> {
  try {
    // Build current prompt
    let currentPrompt = "";
    if (state.iterations === 0) {
      currentPrompt = buildTaskPrompt(state.taskDescription);
    } else {
      const lastTool = state.toolHistory[state.toolHistory.length - 1];
      if (lastTool) {
        currentPrompt = lastTool.success
          ? buildObservationPrompt(lastTool.result, lastTool.toolName)
          : buildErrorRecoveryPrompt(lastTool.error!, state.consecutiveErrors);
      }
    }

    // Build messages with system prompt
    const systemPrompt = buildSystemPrompt({
      userId: state.userId,
      taskDescription: state.taskDescription,
    });

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...state.conversationHistory,
      { role: 'user' as const, content: currentPrompt },
    ];

    // Create unified request
    const request: LLMRequest = {
      messages,
      tools: this.getToolsInUnifiedFormat(),
      temperature: 0.7,
      maxTokens: MAX_TOKENS,
    };

    // Call provider manager (works with any provider)
    const response = await this.providerManager!.complete(request);

    // Update conversation history
    state.conversationHistory.push({
      role: 'assistant',
      content: response.content,
    });

    // Handle tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolCall = response.toolCalls[0];
      const toolName = toolCall.function.name;
      const toolParams = JSON.parse(toolCall.function.arguments);

      console.log(`[Agent] Executing tool: ${toolName}`, toolParams);

      const toolResult = await this.executeTool(toolName, toolParams, state);

      // Record execution
      state.toolHistory.push({
        timestamp: new Date(),
        toolName,
        parameters: toolParams,
        result: toolResult.result,
        success: toolResult.success,
        error: toolResult.error,
        duration: toolResult.duration,
      });

      // Update error counters
      if (!toolResult.success) {
        state.errorCount++;
        state.consecutiveErrors++;
      } else {
        state.consecutiveErrors = 0;
      }

      // Check stopping conditions
      if (state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        state.status = 'failed';
        return false;
      }

      if (state.status === 'needs_input') {
        return false;
      }

      state.iterations++;
      return true;
    } else {
      // No tool use - check for completion
      if (response.content.toLowerCase().includes("complete")) {
        state.status = 'completed';
        return false;
      }

      state.errorCount++;
      state.consecutiveErrors++;
      return true;
    }
  } catch (error) {
    console.error("[Agent Loop] Error:", error);
    state.errorCount++;
    state.consecutiveErrors++;

    if (state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      state.status = 'failed';
      return false;
    }

    return true;
  }
}
```

## Benefits of Migration

1. **Multi-Provider Support**: Switch between Anthropic, OpenAI, Google, or local models
2. **Automatic Fallback**: If one provider fails, automatically try another
3. **Cost Optimization**: Automatically select the cheapest provider
4. **Load Balancing**: Distribute requests across providers
5. **Unified Interface**: Same code works with any provider
6. **Better Testing**: Easily switch to cheaper models for testing
7. **No Vendor Lock-in**: Not dependent on a single provider

## Environment Variables

Add these to your `.env`:

```bash
# Multi-Provider Configuration
DEFAULT_LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-5-20251101
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
GOOGLE_AI_API_KEY=...
GOOGLE_MODEL=gemini-2.0-flash
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama-3.2

# Features
ENABLE_LOAD_BALANCING=false
ENABLE_COST_OPTIMIZATION=true
MAX_COST_PER_REQUEST=1.0
ENABLE_LLM_CACHING=true
LLM_CACHE_TTL=3600
```

## Testing

```typescript
// Test with different providers
const testProviders = ['anthropic', 'openai', 'google'];

for (const provider of testProviders) {
  const manager = await createProviderManager({
    defaultProvider: provider as LLMProvider,
  });

  const orchestrator = new AgentOrchestratorService(manager);
  await orchestrator.initialize();

  const result = await orchestrator.executeTask({
    userId: 1,
    taskDescription: 'Test task',
  });

  console.log(`${provider}:`, result.status);
  manager.destroy();
}
```

## Backward Compatibility

To maintain backward compatibility during migration:

```typescript
export class AgentOrchestratorService {
  private providerManager?: ProviderManager;
  private claude?: Anthropic; // Keep for backward compat

  constructor(providerManager?: ProviderManager) {
    this.providerManager = providerManager;

    // Fallback to direct Anthropic SDK if no provider manager
    if (!providerManager && process.env.ANTHROPIC_API_KEY) {
      this.claude = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    this.toolRegistry = new Map();
    this.registerCoreTools();
  }

  async initialize(): Promise<void> {
    if (!this.providerManager && !this.claude) {
      this.providerManager = await createProviderManager();
    }
  }

  private async callLLM(request: any): Promise<any> {
    if (this.providerManager) {
      // Use new multi-provider system
      return this.providerManager.complete(request);
    } else {
      // Fallback to direct Anthropic SDK
      return this.claude!.messages.create(request);
    }
  }
}
```

## Next Steps

1. Update `agentOrchestrator.service.ts` with the new provider system
2. Add provider selection to the API endpoints
3. Update tests to use different providers
4. Monitor costs and performance across providers
5. Set up fallback strategies for production
6. Document provider-specific features and limitations

## Support

For issues or questions, refer to:
- `/root/github-repos/active/ghl-agency-ai/server/providers/README.md`
- `/root/github-repos/active/ghl-agency-ai/server/providers/integration.example.ts`
