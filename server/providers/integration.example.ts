/**
 * Integration Examples
 * Shows how to integrate the multi-provider LLM system with the agent orchestrator
 */

import { createProviderManager, LLMRequest, LLMResponse } from './index';

// ========================================
// EXAMPLE 1: Basic Provider Manager Usage
// ========================================

export async function basicUsageExample() {
  console.log('\n=== Basic Usage Example ===\n');

  // Create and initialize provider manager
  const manager = await createProviderManager();

  // Simple request
  const response = await manager.complete({
    messages: [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: 'Explain machine learning in simple terms.' },
    ],
    temperature: 0.7,
    maxTokens: 500,
  });

  console.log('Response:', response.content);
  console.log('Provider:', response.provider);
  console.log('Model:', response.model);
  console.log('Tokens:', response.usage.totalTokens);
  console.log('Cost: $', response.cost?.totalCost.toFixed(4));

  manager.destroy();
}

// ========================================
// EXAMPLE 2: Streaming Response
// ========================================

export async function streamingExample() {
  console.log('\n=== Streaming Example ===\n');

  const manager = await createProviderManager();

  process.stdout.write('Streaming: ');

  for await (const event of manager.streamComplete({
    messages: [
      { role: 'user', content: 'Write a haiku about artificial intelligence.' },
    ],
    maxTokens: 100,
  })) {
    if (event.type === 'content') {
      process.stdout.write(event.delta?.content || '');
    } else if (event.type === 'done') {
      console.log('\n\nStream complete!');
      console.log('Tokens:', event.usage?.totalTokens);
      console.log('Cost: $', event.cost?.totalCost.toFixed(4));
    }
  }

  manager.destroy();
}

// ========================================
// EXAMPLE 3: Tool/Function Calling
// ========================================

export async function toolCallingExample() {
  console.log('\n=== Tool Calling Example ===\n');

  const manager = await createProviderManager();

  const response = await manager.complete({
    messages: [
      { role: 'user', content: 'What is the weather like in San Francisco?' },
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
              location: {
                type: 'string',
                description: 'The city name',
              },
              unit: {
                type: 'string',
                enum: ['celsius', 'fahrenheit'],
                description: 'Temperature unit',
              },
            },
            required: ['location'],
          },
        },
      },
    ],
    toolChoice: 'auto',
  });

  if (response.toolCalls) {
    console.log('Tool calls requested:');
    for (const toolCall of response.toolCalls) {
      console.log(`- ${toolCall.function.name}(${toolCall.function.arguments})`);
    }
  } else {
    console.log('No tool calls, text response:', response.content);
  }

  manager.destroy();
}

// ========================================
// EXAMPLE 4: Cost Optimization
// ========================================

export async function costOptimizationExample() {
  console.log('\n=== Cost Optimization Example ===\n');

  const manager = await createProviderManager({
    costOptimization: {
      enabled: true,
      maxCostPerRequest: 0.01, // Max $0.01 per request
    },
  });

  const tasks = [
    'Summarize: Artificial intelligence is...',
    'Translate to French: Hello world',
    'Generate a list of 5 creative business names',
  ];

  for (const task of tasks) {
    const response = await manager.complete({
      messages: [{ role: 'user', content: task }],
      maxTokens: 200,
    });

    console.log(`\nTask: ${task.substring(0, 50)}...`);
    console.log(`Provider: ${response.provider}`);
    console.log(`Model: ${response.model}`);
    console.log(`Cost: $${response.cost?.totalCost.toFixed(6)}`);
  }

  manager.destroy();
}

// ========================================
// EXAMPLE 5: Provider Selection
// ========================================

export async function providerSelectionExample() {
  console.log('\n=== Provider Selection Example ===\n');

  const manager = await createProviderManager();

  // Test different providers
  const providers = manager.getAvailableProviders();
  console.log('Available providers:', providers);

  for (const providerName of providers.slice(0, 2)) {
    try {
      const response = await manager.complete({
        messages: [
          { role: 'user', content: 'Say hello in exactly 5 words.' },
        ],
        providerOptions: {
          preferredProvider: providerName,
        },
        maxTokens: 50,
      });

      console.log(`\n${providerName}:`, response.content);
      console.log(`Cost: $${response.cost?.totalCost.toFixed(6)}`);
    } catch (error) {
      console.error(`${providerName} failed:`, error);
    }
  }

  manager.destroy();
}

// ========================================
// EXAMPLE 6: Load Balancing
// ========================================

export async function loadBalancingExample() {
  console.log('\n=== Load Balancing Example ===\n');

  const manager = await createProviderManager({
    loadBalancing: {
      enabled: true,
      strategy: 'round-robin',
    },
  });

  console.log('Making 5 requests with round-robin load balancing...\n');

  for (let i = 1; i <= 5; i++) {
    const response = await manager.complete({
      messages: [{ role: 'user', content: `Request ${i}: Count to 3` }],
      maxTokens: 50,
    });

    console.log(`Request ${i} -> ${response.provider} (${response.model})`);
  }

  // Show stats
  console.log('\nProvider stats:');
  const stats = manager.getStats();
  for (const [provider, data] of Object.entries(stats)) {
    console.log(`${provider}: ${data.requests} requests`);
  }

  manager.destroy();
}

// ========================================
// EXAMPLE 7: Agent Orchestrator Integration
// ========================================

export async function agentIntegrationExample() {
  console.log('\n=== Agent Integration Example ===\n');

  const manager = await createProviderManager();

  // Simulate agent orchestrator multi-step reasoning
  const planningResponse = await manager.complete({
    messages: [
      {
        role: 'system',
        content: 'You are a task planning AI. Break down complex tasks into steps.',
      },
      {
        role: 'user',
        content: 'Plan how to create a simple web app with user authentication.',
      },
    ],
    temperature: 0.3,
    maxTokens: 500,
  });

  console.log('Planning phase:');
  console.log(planningResponse.content);
  console.log(`\nCost: $${planningResponse.cost?.totalCost.toFixed(4)}`);

  // Execute first step
  const executionResponse = await manager.complete({
    messages: [
      {
        role: 'system',
        content: 'You are a code generation AI. Generate production-ready code.',
      },
      {
        role: 'user',
        content: 'Generate the user registration endpoint code in TypeScript.',
      },
    ],
    temperature: 0.1,
    maxTokens: 1000,
  });

  console.log('\n\nExecution phase:');
  console.log(executionResponse.content.substring(0, 500) + '...');
  console.log(`\nCost: $${executionResponse.cost?.totalCost.toFixed(4)}`);

  console.log(
    '\n\nTotal cost: $',
    (
      (planningResponse.cost?.totalCost || 0) +
      (executionResponse.cost?.totalCost || 0)
    ).toFixed(4)
  );

  manager.destroy();
}

// ========================================
// EXAMPLE 8: Error Handling and Fallback
// ========================================

export async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===\n');

  const manager = await createProviderManager({
    fallbackStrategy: {
      name: 'resilient',
      enabled: true,
      maxAttempts: 3,
      rules: [
        {
          condition: 'error',
          fallbackProviders: ['openai', 'google', 'ollama'],
          retryOriginal: false,
        },
      ],
    },
  });

  try {
    // This will automatically fallback if the primary provider fails
    const response = await manager.complete({
      messages: [
        { role: 'user', content: 'Generate a creative story about space exploration.' },
      ],
      maxTokens: 500,
    });

    console.log('Success with provider:', response.provider);
    console.log('Response length:', response.content.length);
  } catch (error) {
    console.error('All providers failed:', error);
  }

  manager.destroy();
}

// ========================================
// EXAMPLE 9: Custom Configuration
// ========================================

export async function customConfigExample() {
  console.log('\n=== Custom Configuration Example ===\n');

  const manager = await createProviderManager({
    defaultProvider: 'openai',
    providers: {
      anthropic: {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.5,
        maxTokens: 2048,
        enableStreaming: true,
        enableCaching: true,
        timeout: 60000,
        retryAttempts: 3,
      },
      openai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 1024,
        enableStreaming: true,
        enableCaching: true,
        timeout: 30000,
        retryAttempts: 2,
      },
      google: {
        provider: 'google',
        apiKey: process.env.GOOGLE_AI_API_KEY,
        model: 'gemini-2.0-flash',
        temperature: 0.8,
        maxTokens: 2048,
        enableStreaming: true,
        enableCaching: true,
        timeout: 45000,
        retryAttempts: 2,
      },
      cohere: {
        provider: 'cohere',
        apiKey: process.env.COHERE_API_KEY,
        model: 'command-r-plus',
        temperature: 0.7,
        maxTokens: 2048,
        enableStreaming: true,
        enableCaching: true,
        timeout: 60000,
        retryAttempts: 3,
      },
      ollama: {
        provider: 'ollama',
        apiUrl: 'http://localhost:11434',
        model: 'llama-3.2',
        temperature: 0.7,
        maxTokens: 1024,
        enableStreaming: true,
        enableCaching: false,
        timeout: 120000,
        retryAttempts: 1,
      },
    },
    caching: {
      enabled: true,
      ttl: 7200, // 2 hours
    },
  });

  const response = await manager.complete({
    messages: [{ role: 'user', content: 'What is TypeScript?' }],
    maxTokens: 200,
  });

  console.log('Response from:', response.provider);
  console.log(response.content);

  manager.destroy();
}

// ========================================
// RUN ALL EXAMPLES
// ========================================

export async function runAllExamples() {
  try {
    await basicUsageExample();
    await streamingExample();
    await toolCallingExample();
    await costOptimizationExample();
    await providerSelectionExample();
    await loadBalancingExample();
    await agentIntegrationExample();
    await errorHandlingExample();
    await customConfigExample();

    console.log('\n\n=== All examples completed successfully! ===\n');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Uncomment to run examples
// runAllExamples();
