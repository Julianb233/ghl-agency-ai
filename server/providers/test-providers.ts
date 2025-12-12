#!/usr/bin/env node
/**
 * Quick test script for the multi-provider LLM system
 * Run: npx tsx server/providers/test-providers.ts
 */

import { createProviderManager } from './index';

async function testProviderSystem() {
  console.log('🚀 Testing Multi-Provider LLM System\n');

  try {
    // Create provider manager
    console.log('1️⃣  Initializing provider manager...');
    const manager = await createProviderManager();
    console.log('✅ Provider manager initialized\n');

    // Check available providers
    const availableProviders = manager.getAvailableProviders();
    console.log('2️⃣  Available providers:', availableProviders.join(', '));

    if (availableProviders.length === 0) {
      console.error('\n❌ No providers available. Please set API keys in .env file:');
      console.error('   - ANTHROPIC_API_KEY');
      console.error('   - OPENAI_API_KEY');
      console.error('   - GOOGLE_AI_API_KEY');
      console.error('   - Or start Ollama for local models');
      return;
    }

    // Test basic completion
    console.log('\n3️⃣  Testing basic completion...');
    const response = await manager.complete({
      messages: [
        { role: 'user', content: 'Say "Hello World" in exactly 2 words.' },
      ],
      maxTokens: 10,
    });

    console.log('✅ Response received:');
    console.log('   Provider:', response.provider);
    console.log('   Model:', response.model);
    console.log('   Content:', response.content);
    console.log('   Tokens:', response.usage.totalTokens);
    console.log('   Cost: $' + response.cost?.totalCost.toFixed(6));

    // Test with specific provider (if available)
    if (availableProviders.length > 1) {
      console.log('\n4️⃣  Testing provider selection...');
      const secondProvider = availableProviders[1];

      const response2 = await manager.complete({
        messages: [
          { role: 'user', content: 'Count from 1 to 3.' },
        ],
        maxTokens: 20,
        providerOptions: {
          preferredProvider: secondProvider,
        },
      });

      console.log('✅ Response from', secondProvider);
      console.log('   Content:', response2.content);
      console.log('   Cost: $' + response2.cost?.totalCost.toFixed(6));
    }

    // Show stats
    console.log('\n5️⃣  Provider statistics:');
    const stats = manager.getStats();
    for (const [provider, data] of Object.entries(stats)) {
      console.log(`   ${provider}:`, {
        requests: data.requests,
        available: data.status.available,
      });
    }

    console.log('\n✅ All tests passed! Multi-provider system is working.\n');

    // Cleanup
    manager.destroy();
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testProviderSystem();
