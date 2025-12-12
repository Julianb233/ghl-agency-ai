/**
 * Utility functions for multi-LLM provider system
 */

import { LLMProvider, LLMProviderConfig, FallbackStrategy, LLMModel } from './types';
import { ProviderManager, ProviderManagerConfig } from './provider.manager';

/**
 * Get default provider configuration
 */
export function getDefaultProviderConfig(): ProviderManagerConfig {
  const defaultProvider = (process.env.DEFAULT_LLM_PROVIDER as LLMProvider) || 'anthropic';

  return {
    defaultProvider,
    providers: {
      anthropic: {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: (process.env.ANTHROPIC_MODEL as LLMModel) || 'claude-opus-4-5-20251101',
        temperature: 0.7,
        maxTokens: 4096,
        enableStreaming: true,
        enableCaching: true,
        timeout: 60000,
        retryAttempts: 3,
      },
      openai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: (process.env.OPENAI_MODEL as LLMModel) || 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        enableStreaming: true,
        enableCaching: true,
        timeout: 60000,
        retryAttempts: 3,
      },
      google: {
        provider: 'google',
        apiKey: process.env.GOOGLE_AI_API_KEY,
        model: (process.env.GOOGLE_MODEL as LLMModel) || 'gemini-2.0-flash',
        temperature: 0.7,
        maxTokens: 2048,
        enableStreaming: true,
        enableCaching: true,
        timeout: 60000,
        retryAttempts: 3,
      },
      cohere: {
        provider: 'cohere',
        apiKey: process.env.COHERE_API_KEY,
        model: 'command-r-plus',
        temperature: 0.7,
        maxTokens: 4096,
        enableStreaming: true,
        enableCaching: true,
        timeout: 60000,
        retryAttempts: 3,
      },
      ollama: {
        provider: 'ollama',
        apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
        model: (process.env.OLLAMA_MODEL as LLMModel) || 'llama-3.2',
        temperature: 0.7,
        maxTokens: 2048,
        enableStreaming: true,
        enableCaching: false,
        timeout: 120000,
        retryAttempts: 2,
      },
    },
    fallbackStrategy: getDefaultFallbackStrategy(),
    loadBalancing: {
      enabled: process.env.ENABLE_LOAD_BALANCING === 'true',
      strategy: (process.env.LOAD_BALANCING_STRATEGY as any) || 'round-robin',
    },
    costOptimization: {
      enabled: process.env.ENABLE_COST_OPTIMIZATION === 'true',
      maxCostPerRequest: parseFloat(process.env.MAX_COST_PER_REQUEST || '1.0'),
      preferredProviders: ['anthropic', 'openai'],
    },
    caching: {
      enabled: process.env.ENABLE_LLM_CACHING !== 'false',
      ttl: parseInt(process.env.LLM_CACHE_TTL || '3600', 10),
    },
  };
}

/**
 * Get default fallback strategy
 */
function getDefaultFallbackStrategy(): FallbackStrategy {
  return {
    name: 'default',
    enabled: true,
    maxAttempts: 3,
    rules: [
      {
        condition: 'rate_limit',
        fallbackProviders: ['openai', 'google', 'ollama'],
        retryOriginal: true,
        retryDelay: 60000,
      },
      {
        condition: 'unavailable',
        fallbackProviders: ['openai', 'google', 'anthropic'],
        retryOriginal: true,
        retryDelay: 30000,
      },
      {
        condition: 'timeout',
        fallbackProviders: ['anthropic', 'openai'],
        retryOriginal: false,
      },
      {
        condition: 'cost',
        fallbackProviders: ['ollama', 'google'],
        retryOriginal: false,
      },
      {
        condition: 'error',
        errorCodes: ['AUTHENTICATION', 'MODEL_NOT_FOUND'],
        fallbackProviders: [],
        retryOriginal: false,
      },
    ],
  };
}

/**
 * Create a provider manager with default or custom configuration
 */
export async function createProviderManager(
  customConfig?: Partial<ProviderManagerConfig>
): Promise<ProviderManager> {
  const defaultConfig = getDefaultProviderConfig();
  const config: ProviderManagerConfig = { ...defaultConfig, ...customConfig };

  // Filter out providers without API keys
  const filteredProviders: Record<string, LLMProviderConfig> = {};

  for (const [providerName, providerConfig] of Object.entries(config.providers)) {
    // Ollama doesn't need an API key
    if (providerName === 'ollama') {
      filteredProviders[providerName] = providerConfig;
      continue;
    }

    // For other providers, only include if API key is present
    if (providerConfig.apiKey) {
      filteredProviders[providerName] = providerConfig;
    } else {
      console.warn(`[ProviderManager] Skipping ${providerName} - no API key configured`);
    }
  }

  if (Object.keys(filteredProviders).length === 0) {
    throw new Error('No LLM providers configured. Please set API keys in environment variables.');
  }

  config.providers = filteredProviders as Record<LLMProvider, LLMProviderConfig>;

  // Ensure default provider is available
  if (!config.providers[config.defaultProvider]) {
    const availableProvider = Object.keys(config.providers)[0] as LLMProvider;
    console.warn(
      `[ProviderManager] Default provider ${config.defaultProvider} not available. Using ${availableProvider}`
    );
    config.defaultProvider = availableProvider;
  }

  const manager = new ProviderManager(config);
  await manager.initialize();

  return manager;
}

/**
 * Get model recommendations based on use case
 */
export function getModelRecommendations(useCase: string): Array<{
  provider: LLMProvider;
  model: LLMModel;
  reasoning: string;
}> {
  const recommendations: Record<string, any[]> = {
    'code-generation': [
      {
        provider: 'anthropic',
        model: 'claude-opus-4-5-20251101',
        reasoning: 'Best for complex code generation with high accuracy',
      },
      {
        provider: 'openai',
        model: 'gpt-4o',
        reasoning: 'Excellent code generation with multimodal support',
      },
    ],
    'chat': [
      {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        reasoning: 'Balanced performance for conversational AI',
      },
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reasoning: 'Fast and cost-effective for chat applications',
      },
    ],
    'analysis': [
      {
        provider: 'anthropic',
        model: 'claude-opus-4-5-20251101',
        reasoning: 'Excellent for deep analysis and reasoning',
      },
      {
        provider: 'openai',
        model: 'o1-preview',
        reasoning: 'Advanced reasoning capabilities',
      },
    ],
    'local': [
      {
        provider: 'ollama',
        model: 'llama-3.2',
        reasoning: 'Good balance for local deployment',
      },
      {
        provider: 'ollama',
        model: 'qwen-2.5',
        reasoning: 'Fast local model with good performance',
      },
    ],
    'budget': [
      {
        provider: 'ollama',
        model: 'llama-3.2',
        reasoning: 'Free local model with no API costs',
      },
      {
        provider: 'google',
        model: 'gemini-2.0-flash',
        reasoning: 'Very cost-effective cloud model',
      },
    ],
  };

  return recommendations[useCase] || recommendations['chat'];
}

/**
 * Calculate estimated monthly cost based on usage
 */
export function estimateMonthlyCost(
  provider: LLMProvider,
  model: LLMModel,
  estimatedRequests: number,
  avgTokensPerRequest: number
): {
  promptCost: number;
  completionCost: number;
  totalCost: number;
  currency: string;
} {
  const pricing = getPricing(provider, model);

  if (!pricing) {
    return {
      promptCost: 0,
      completionCost: 0,
      totalCost: 0,
      currency: 'USD',
    };
  }

  const promptTokens = avgTokensPerRequest * 0.7;
  const completionTokens = avgTokensPerRequest * 0.3;

  const promptCost = ((promptTokens * estimatedRequests) / 1000) * pricing.promptCostPer1k;
  const completionCost = ((completionTokens * estimatedRequests) / 1000) * pricing.completionCostPer1k;

  return {
    promptCost,
    completionCost,
    totalCost: promptCost + completionCost,
    currency: pricing.currency,
  };
}

/**
 * Get pricing for a specific provider and model
 */
function getPricing(
  provider: LLMProvider,
  model: LLMModel
): {
  promptCostPer1k: number;
  completionCostPer1k: number;
  currency: string;
} | null {
  const pricingData: Record<string, any> = {
    'anthropic:claude-opus-4-5-20251101': {
      promptCostPer1k: 0.015,
      completionCostPer1k: 0.075,
      currency: 'USD',
    },
    'anthropic:claude-sonnet-4-5-20250929': {
      promptCostPer1k: 0.003,
      completionCostPer1k: 0.015,
      currency: 'USD',
    },
    'openai:gpt-4o': {
      promptCostPer1k: 0.0025,
      completionCostPer1k: 0.01,
      currency: 'USD',
    },
    'openai:gpt-4o-mini': {
      promptCostPer1k: 0.00015,
      completionCostPer1k: 0.0006,
      currency: 'USD',
    },
    'google:gemini-2.0-flash': {
      promptCostPer1k: 0.0001,
      completionCostPer1k: 0.0004,
      currency: 'USD',
    },
    'ollama:llama-3.2': {
      promptCostPer1k: 0,
      completionCostPer1k: 0,
      currency: 'USD',
    },
  };

  return pricingData[`${provider}:${model}`] || null;
}
