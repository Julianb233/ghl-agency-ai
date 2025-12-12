# Quick Start - Multi-Provider LLM System

## 🚀 Get Started in 60 Seconds

### 1. Set Environment Variables

Create or update `.env`:
```bash
# Choose your primary provider
DEFAULT_LLM_PROVIDER=anthropic

# Add API keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
```

### 2. Import and Initialize

```typescript
import { createProviderManager } from './server/providers';

// Initialize (auto-configures from .env)
const manager = await createProviderManager();
```

### 3. Make Your First Request

```typescript
const response = await manager.complete({
  messages: [
    { role: 'user', content: 'Hello! What can you help me with?' }
  ],
  maxTokens: 500,
});

console.log(response.content);
console.log(`Cost: $${response.cost?.totalCost.toFixed(4)}`);
```

## 📝 Common Patterns

### Simple Completion
```typescript
const response = await manager.complete({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing.' }
  ],
  temperature: 0.7,
  maxTokens: 500,
});
```

### Streaming
```typescript
for await (const event of manager.streamComplete({
  messages: [{ role: 'user', content: 'Write a story...' }],
  maxTokens: 1000,
})) {
  if (event.type === 'content') {
    process.stdout.write(event.delta?.content || '');
  }
}
```

### Tool Calling
```typescript
const response = await manager.complete({
  messages: [
    { role: 'user', content: 'What is the weather in NYC?' }
  ],
  tools: [{
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' }
        },
        required: ['location']
      }
    }
  }],
});

if (response.toolCalls) {
  // Handle tool execution
}
```

### Specific Provider
```typescript
const response = await manager.complete({
  messages: [{ role: 'user', content: 'Generate code...' }],
  model: 'claude-opus-4-5-20251101',
  providerOptions: {
    preferredProvider: 'anthropic'
  }
});
```

### Cost Optimization
```typescript
const response = await manager.complete({
  messages: [{ role: 'user', content: 'Summarize this...' }],
  costConstraints: {
    maxCost: 0.01,
    preferredModels: ['gpt-4o-mini', 'gemini-2.0-flash']
  }
});
```

## 🔧 Configuration

### Custom Configuration
```typescript
const manager = await createProviderManager({
  defaultProvider: 'openai',
  loadBalancing: {
    enabled: true,
    strategy: 'cost-based',
  },
  costOptimization: {
    enabled: true,
    maxCostPerRequest: 0.50,
  },
  caching: {
    enabled: true,
    ttl: 7200,
  },
});
```

### Environment Variables
```bash
# Provider Selection
DEFAULT_LLM_PROVIDER=anthropic|openai|google|ollama

# API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Models
ANTHROPIC_MODEL=claude-opus-4-5-20251101
OPENAI_MODEL=gpt-4o
GOOGLE_MODEL=gemini-2.0-flash
OLLAMA_MODEL=llama-3.2

# Features
ENABLE_LOAD_BALANCING=false
LOAD_BALANCING_STRATEGY=round-robin
ENABLE_COST_OPTIMIZATION=true
MAX_COST_PER_REQUEST=1.0
ENABLE_LLM_CACHING=true
LLM_CACHE_TTL=3600
```

## 📊 Supported Models

### Anthropic Claude
- `claude-opus-4-5-20251101` - Most capable
- `claude-sonnet-4-5-20250929` - Balanced
- `claude-3-5-sonnet-20241022` - Fast & smart
- `claude-3-5-haiku-20241022` - Ultra fast

### OpenAI
- `gpt-4o` - Multimodal flagship
- `gpt-4o-mini` - Fast & cheap
- `gpt-4-turbo` - Legacy flagship
- `o1-preview` - Advanced reasoning
- `o1-mini` - Fast reasoning

### Google Gemini
- `gemini-2.0-flash` - Ultra cheap & fast
- `gemini-1.5-pro` - Most capable (2M context)
- `gemini-1.5-flash` - Fast & efficient

### Ollama (Local)
- `llama-3.2` - Free, local
- `qwen-2.5` - Fast local model
- `mixtral-8x7b` - Powerful local model

## 🛠️ Utilities

### Check Available Providers
```typescript
const providers = manager.getAvailableProviders();
console.log('Available:', providers);
```

### Get Provider Stats
```typescript
const stats = manager.getStats();
console.log(stats);
// { anthropic: { requests: 10, status: {...} }, ... }
```

### Estimate Costs
```typescript
const provider = manager.getProvider('anthropic');
const estimate = await provider.estimateCost({
  messages: [/* ... */],
  maxTokens: 500,
});
console.log(`Est. cost: $${estimate.estimatedCost.total}`);
```

### Cleanup
```typescript
manager.destroy();
```

## ⚡ Quick Test

Run the test script:
```bash
npx tsx server/providers/test-providers.ts
```

## 📚 Learn More

- **Full Documentation**: [README.md](./README.md)
- **Integration Guide**: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Examples**: [integration.example.ts](./integration.example.ts)
- **Implementation**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## 🆘 Troubleshooting

### "No providers available"
→ Set at least one API key in `.env`

### "Provider not found"
→ Check provider name spelling: `anthropic`, `openai`, `google`, `ollama`

### "Model not supported"
→ Check model name matches exactly (see supported models above)

### Ollama not working
→ Start Ollama server: `ollama serve`
→ Check URL: `http://localhost:11434`

## 💡 Pro Tips

1. **Development**: Use Ollama for free local testing
2. **Production**: Enable cost optimization and caching
3. **Reliability**: Enable automatic fallback
4. **Performance**: Use streaming for long responses
5. **Cost**: Use smaller models for simple tasks
6. **Testing**: Test with multiple providers in parallel

## 🎯 Model Selection Guide

| Use Case | Best Model | Budget Option |
|----------|-----------|---------------|
| Code Generation | `claude-opus-4-5-20251101` | `gpt-4o-mini` |
| Chat/Conversation | `claude-sonnet-4-5-20250929` | `gemini-2.0-flash` |
| Analysis/Reasoning | `o1-preview` | `claude-3-5-sonnet-20241022` |
| Vision/Multimodal | `gpt-4o` | `gemini-1.5-flash` |
| Local/Free | `llama-3.2` | `qwen-2.5` |

---

**Ready to go!** 🚀 The system is production-ready and fully documented.
