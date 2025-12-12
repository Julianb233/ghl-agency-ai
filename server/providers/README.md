# Multi-Provider LLM System

Production-grade multi-provider LLM system with automatic fallback, load balancing, cost optimization, and caching.

## Features

- **Multiple LLM Providers**: Anthropic Claude, OpenAI GPT-4o, Google Gemini, Ollama (local)
- **Automatic Fallback**: Gracefully handle provider failures and rate limits
- **Load Balancing**: Distribute requests across providers (round-robin, least-loaded)
- **Cost Optimization**: Automatically select the most cost-effective provider
- **Semantic Caching**: Cache responses to reduce costs and latency
- **Unified Interface**: Consistent API across all providers
- **Streaming Support**: Real-time token streaming for all providers
- **Tool/Function Calling**: Support for Claude tools and OpenAI functions
- **Health Monitoring**: Automatic health checks and availability tracking

## Supported Providers

### Anthropic Claude
- Claude Opus 4.5 (claude-opus-4-5-20251101)
- Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
- Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)
- Claude 3.5 Haiku (claude-3-5-haiku-20241022)

### OpenAI
- GPT-4o (gpt-4o)
- GPT-4o-mini (gpt-4o-mini)
- GPT-4 Turbo (gpt-4-turbo)
- o1-preview (advanced reasoning)
- o1-mini (fast reasoning)

### Google Gemini
- Gemini 2.0 Flash (gemini-2.0-flash)
- Gemini 1.5 Pro (gemini-1.5-pro)
- Gemini 1.5 Flash (gemini-1.5-flash)

### Ollama (Local)
- Llama 3.2 (llama-3.2)
- Llama 3.1 (llama-3.1)
- Qwen 2.5 (qwen-2.5)
- DeepSeek V2 (deepseek-v2)
- Mixtral 8x7B (mixtral-8x7b)
- Mixtral 8x22B (mixtral-8x22b)

## Quick Start

### 1. Configuration

Set environment variables for your providers:

```bash
# Default provider
DEFAULT_LLM_PROVIDER=anthropic

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-5-20251101

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Google AI
GOOGLE_AI_API_KEY=...
GOOGLE_MODEL=gemini-2.0-flash

# Ollama (local)
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama-3.2

# Features
ENABLE_LOAD_BALANCING=false
LOAD_BALANCING_STRATEGY=round-robin
ENABLE_COST_OPTIMIZATION=true
MAX_COST_PER_REQUEST=1.0
ENABLE_LLM_CACHING=true
LLM_CACHE_TTL=3600
```

### 2. Basic Usage

```typescript
import { createProviderManager } from './providers';

// Create and initialize the provider manager
const providerManager = await createProviderManager();

// Simple completion
const response = await providerManager.complete({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing in simple terms.' }
  ],
  temperature: 0.7,
  maxTokens: 500,
});

console.log(response.content);
console.log(`Cost: $${response.cost?.totalCost.toFixed(4)}`);
console.log(`Tokens: ${response.usage.totalTokens}`);
```

### 3. Streaming

```typescript
// Stream tokens as they arrive
for await (const event of providerManager.streamComplete({
  messages: [
    { role: 'user', content: 'Write a short story about AI.' }
  ],
  maxTokens: 1000,
})) {
  if (event.type === 'content') {
    process.stdout.write(event.delta?.content || '');
  } else if (event.type === 'done') {
    console.log(`\n\nTokens: ${event.usage?.totalTokens}`);
    console.log(`Cost: $${event.cost?.totalCost.toFixed(4)}`);
  }
}
```

### 4. Tool/Function Calling

```typescript
// With Claude tools
const response = await providerManager.complete({
  messages: [
    { role: 'user', content: 'What is the weather in San Francisco?' }
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get the current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name' },
            unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
          },
          required: ['location']
        }
      }
    }
  ],
  toolChoice: 'auto'
});

if (response.toolCalls) {
  console.log('Tool calls:', response.toolCalls);
}
```

### 5. Cost Optimization

```typescript
// Automatically select cheapest provider that meets constraints
const response = await providerManager.complete({
  messages: [
    { role: 'user', content: 'Summarize this article...' }
  ],
  costConstraints: {
    maxCost: 0.01, // Max $0.01 per request
    preferredModels: ['gpt-4o-mini', 'gemini-2.0-flash']
  }
});
```

### 6. Specific Provider Selection

```typescript
// Force a specific provider
const response = await providerManager.complete({
  messages: [
    { role: 'user', content: 'Generate complex code...' }
  ],
  model: 'claude-opus-4-5-20251101',
  providerOptions: {
    preferredProvider: 'anthropic'
  }
});
```

## Advanced Features

### Fallback Strategy

The system automatically falls back to alternative providers when errors occur:

```typescript
const config = {
  fallbackStrategy: {
    name: 'production',
    enabled: true,
    maxAttempts: 3,
    rules: [
      {
        condition: 'rate_limit',
        fallbackProviders: ['openai', 'google', 'ollama'],
        retryOriginal: true,
        retryDelay: 60000
      },
      {
        condition: 'unavailable',
        fallbackProviders: ['openai', 'google'],
        retryOriginal: true,
        retryDelay: 30000
      }
    ]
  }
};

const manager = await createProviderManager(config);
```

### Load Balancing

Distribute requests across multiple providers:

```typescript
const config = {
  loadBalancing: {
    enabled: true,
    strategy: 'round-robin' // or 'least-loaded', 'latency-based', 'cost-based'
  }
};
```

### Monitoring

Track provider usage and health:

```typescript
// Get provider stats
const stats = providerManager.getStats();
console.log(stats);
// {
//   anthropic: { requests: 150, status: { available: true, ... } },
//   openai: { requests: 75, status: { available: true, ... } }
// }

// Get available providers
const available = providerManager.getAvailableProviders();
console.log(available); // ['anthropic', 'openai', 'google']

// Get specific provider
const anthropicProvider = providerManager.getProvider('anthropic');
const status = anthropicProvider?.getStatus();
```

### Cost Estimation

Estimate costs before making requests:

```typescript
const provider = providerManager.getProvider('anthropic');
const estimate = await provider.estimateCost({
  messages: [
    { role: 'user', content: 'Long article to summarize...' }
  ],
  maxTokens: 500
});

console.log(`Estimated cost: $${estimate.estimatedCost.total.toFixed(4)}`);
console.log(`Estimated tokens: ${estimate.estimatedTotalTokens}`);
console.log(`Confidence: ${(estimate.confidence * 100).toFixed(0)}%`);
```

## Integration with Agent Orchestrator

```typescript
import { createProviderManager } from './providers';
import { AgentOrchestratorService } from './services/agentOrchestrator.service';

// Initialize provider manager
const providerManager = await createProviderManager();

// Pass to agent orchestrator
const orchestrator = new AgentOrchestratorService(providerManager);

// Execute agent task
const result = await orchestrator.executeTask({
  userId: 123,
  taskDescription: 'Create a marketing campaign for a new product',
  context: { product: 'AI Assistant', target: 'developers' }
});
```

## Model Selection Guide

### For Code Generation
- **Best**: Claude Opus 4.5 (`claude-opus-4-5-20251101`)
- **Fast**: GPT-4o (`gpt-4o`)
- **Budget**: GPT-4o-mini (`gpt-4o-mini`)
- **Local**: Llama 3.2 (`llama-3.2`)

### For Chat/Conversation
- **Best**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- **Fast**: GPT-4o-mini (`gpt-4o-mini`)
- **Budget**: Gemini 2.0 Flash (`gemini-2.0-flash`)
- **Local**: Qwen 2.5 (`qwen-2.5`)

### For Analysis/Reasoning
- **Best**: Claude Opus 4.5 (`claude-opus-4-5-20251101`)
- **Advanced**: o1-preview (`o1-preview`)
- **Fast**: o1-mini (`o1-mini`)

### For Multimodal (Vision)
- **Best**: GPT-4o (`gpt-4o`)
- **Good**: Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
- **Budget**: Gemini 1.5 Flash (`gemini-1.5-flash`)

## Error Handling

```typescript
try {
  const response = await providerManager.complete(request);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${error.retryAfter}s`);
  } else if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof ProviderUnavailableError) {
    console.log(`Provider ${error.provider} is unavailable`);
  } else {
    console.log('Unknown error:', error);
  }
}
```

## Cleanup

Always destroy the manager when done:

```typescript
providerManager.destroy();
```

## Architecture

```
providers/
├── types.ts                 # Type definitions
├── base.provider.ts         # Abstract base provider
├── anthropic.provider.ts    # Claude implementation
├── openai.provider.ts       # OpenAI implementation
├── gemini.provider.ts       # Google Gemini implementation
├── ollama.provider.ts       # Ollama local models
├── provider.factory.ts      # Provider creation
├── provider.manager.ts      # Central orchestration
├── utils.ts                 # Utilities and defaults
└── index.ts                 # Public API
```

## Performance Tips

1. **Enable Caching**: Cache identical requests to save costs
2. **Use Streaming**: For long responses, streaming improves UX
3. **Cost Optimization**: Let the system select the cheapest provider
4. **Load Balancing**: Distribute load across multiple providers
5. **Model Selection**: Use smaller models for simple tasks
6. **Local Models**: Use Ollama for development and testing

## License

Part of the GHL Agency AI project.
