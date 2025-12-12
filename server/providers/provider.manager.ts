/**
 * Provider Manager
 * Central orchestration for multi-LLM providers with fallback, load balancing, and cost optimization
 */

import {
  ILLMProvider,
  LLMProvider,
  LLMProviderConfig,
  LLMRequest,
  LLMResponse,
  LLMStreamEvent,
  FallbackStrategy,
  FallbackRule,
  isRateLimitError,
  LLMProviderError,
} from './types';
import { ProviderFactory } from './provider.factory';

export interface ProviderManagerConfig {
  providers: Record<LLMProvider, LLMProviderConfig>;
  defaultProvider: LLMProvider;
  fallbackStrategy?: FallbackStrategy;
  loadBalancing?: {
    enabled: boolean;
    strategy: 'round-robin' | 'least-loaded' | 'latency-based' | 'cost-based';
  };
  costOptimization?: {
    enabled: boolean;
    maxCostPerRequest?: number;
    preferredProviders?: LLMProvider[];
  };
  caching?: {
    enabled: boolean;
    ttl: number;
  };
}

export class ProviderManager {
  private providers: Map<LLMProvider, ILLMProvider> = new Map();
  private config: ProviderManagerConfig;
  private requestCount: Map<LLMProvider, number> = new Map();
  private currentProviderIndex = 0;
  private cache: Map<string, { response: LLMResponse; timestamp: Date }> = new Map();

  constructor(config: ProviderManagerConfig) {
    this.config = config;
  }

  /**
   * Initialize all configured providers
   */
  async initialize(): Promise<void> {
    console.log('[ProviderManager] Initializing providers...');

    this.providers = await ProviderFactory.createProviders(this.config.providers);

    // Initialize request counts
    for (const providerName of this.providers.keys()) {
      this.requestCount.set(providerName, 0);
    }

    console.log(`[ProviderManager] Initialized ${this.providers.size} provider(s):`,
      Array.from(this.providers.keys()).join(', '));
  }

  /**
   * Complete a request using the appropriate provider
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Check cache first
    if (this.config.caching?.enabled) {
      const cached = this.checkCache(request);
      if (cached) {
        console.log('[ProviderManager] Returning cached response');
        return cached;
      }
    }

    // Select provider based on strategy
    const provider = await this.selectProvider(request);

    try {
      console.log(`[ProviderManager] Using ${provider.name} provider with model ${request.model || provider.config.model}`);

      const response = await provider.complete(request);

      // Cache successful response
      if (this.config.caching?.enabled) {
        this.cacheResponse(request, response);
      }

      // Update request count
      const count = this.requestCount.get(provider.name) || 0;
      this.requestCount.set(provider.name, count + 1);

      return response;
    } catch (error) {
      console.error(`[ProviderManager] Provider ${provider.name} failed:`, error);

      // Handle error and potentially fallback
      return this.handleRequestError(error, request, provider);
    }
  }

  /**
   * Stream complete a request
   */
  async *streamComplete(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
    const provider = await this.selectProvider(request);

    try {
      console.log(`[ProviderManager] Streaming with ${provider.name} provider`);

      yield* provider.streamComplete(request);

      // Update request count
      const count = this.requestCount.get(provider.name) || 0;
      this.requestCount.set(provider.name, count + 1);

    } catch (error) {
      console.error(`[ProviderManager] Stream failed with ${provider.name}:`, error);

      // Try fallback
      const fallbackProvider = await this.getFallbackProvider(error, provider);
      if (fallbackProvider) {
        console.log(`[ProviderManager] Falling back to ${fallbackProvider.name}`);
        yield* fallbackProvider.streamComplete(request);
      } else {
        throw error;
      }
    }
  }

  /**
   * Select the best provider for a request
   */
  private async selectProvider(request: LLMRequest): Promise<ILLMProvider> {
    // If specific provider requested
    if (request.providerOptions?.preferredProvider) {
      const provider = this.providers.get(request.providerOptions.preferredProvider);
      if (provider && this.isProviderAvailable(provider)) {
        return provider;
      }
    }

    // Cost optimization
    if (this.config.costOptimization?.enabled && request.costConstraints) {
      const optimized = await this.selectOptimalProvider(request);
      if (optimized) {
        return optimized;
      }
    }

    // Load balancing
    if (this.config.loadBalancing?.enabled) {
      return this.selectLoadBalancedProvider();
    }

    // Default provider
    const defaultProvider = this.providers.get(this.config.defaultProvider);
    if (defaultProvider && this.isProviderAvailable(defaultProvider)) {
      return defaultProvider;
    }

    // First available provider
    for (const provider of this.providers.values()) {
      if (this.isProviderAvailable(provider)) {
        return provider;
      }
    }

    throw new Error('No available providers');
  }

  /**
   * Select provider based on cost optimization
   */
  private async selectOptimalProvider(request: LLMRequest): Promise<ILLMProvider | null> {
    let bestProvider: ILLMProvider | null = null;
    let bestCost = Infinity;

    for (const provider of this.providers.values()) {
      if (!this.isProviderAvailable(provider)) continue;

      try {
        const estimate = await provider.estimateCost(request);

        if (
          estimate.estimatedCost.total < bestCost &&
          (!request.costConstraints?.maxCost || estimate.estimatedCost.total <= request.costConstraints.maxCost)
        ) {
          bestCost = estimate.estimatedCost.total;
          bestProvider = provider;
        }
      } catch (error) {
        console.warn(`[ProviderManager] Failed to estimate cost for ${provider.name}:`, error);
      }
    }

    return bestProvider;
  }

  /**
   * Select provider using load balancing
   */
  private selectLoadBalancedProvider(): ILLMProvider {
    const availableProviders = Array.from(this.providers.values()).filter((p) =>
      this.isProviderAvailable(p)
    );

    if (availableProviders.length === 0) {
      throw new Error('No available providers');
    }

    switch (this.config.loadBalancing?.strategy) {
      case 'round-robin':
        return this.roundRobinSelect(availableProviders);

      case 'least-loaded':
        return this.leastLoadedSelect(availableProviders);

      default:
        return availableProviders[0];
    }
  }

  /**
   * Round-robin provider selection
   */
  private roundRobinSelect(providers: ILLMProvider[]): ILLMProvider {
    const provider = providers[this.currentProviderIndex % providers.length];
    this.currentProviderIndex++;
    return provider;
  }

  /**
   * Select least loaded provider
   */
  private leastLoadedSelect(providers: ILLMProvider[]): ILLMProvider {
    let minLoad = Infinity;
    let selectedProvider = providers[0];

    for (const provider of providers) {
      const status = provider.getStatus();
      if (status.currentLoad < minLoad) {
        minLoad = status.currentLoad;
        selectedProvider = provider;
      }
    }

    return selectedProvider;
  }

  /**
   * Check if provider is available
   */
  private isProviderAvailable(provider: ILLMProvider): boolean {
    const status = provider.getStatus();
    return status.available;
  }

  /**
   * Handle request error with fallback
   */
  private async handleRequestError(
    error: unknown,
    request: LLMRequest,
    failedProvider: ILLMProvider
  ): Promise<LLMResponse> {
    // Try fallback
    const fallbackProvider = await this.getFallbackProvider(error, failedProvider);

    if (fallbackProvider) {
      console.log(`[ProviderManager] Falling back to ${fallbackProvider.name} provider`);
      return fallbackProvider.complete(request);
    }

    throw error;
  }

  /**
   * Get fallback provider based on error
   */
  private async getFallbackProvider(
    error: unknown,
    failedProvider: ILLMProvider
  ): Promise<ILLMProvider | null> {
    if (!this.config.fallbackStrategy?.enabled) {
      return null;
    }

    const errorCondition = this.getErrorCondition(error);
    const fallbackRule = this.config.fallbackStrategy.rules.find(
      (rule) => rule.condition === errorCondition
    );

    if (!fallbackRule) {
      return null;
    }

    // Find first available fallback provider
    for (const providerName of fallbackRule.fallbackProviders) {
      const provider = this.providers.get(providerName);
      if (provider && provider !== failedProvider && this.isProviderAvailable(provider)) {
        return provider;
      }
    }

    return null;
  }

  /**
   * Determine error condition for fallback
   */
  private getErrorCondition(error: unknown): FallbackRule['condition'] {
    if (isRateLimitError(error)) {
      return 'rate_limit';
    }

    if (error instanceof LLMProviderError) {
      if (error.statusCode === 503) {
        return 'unavailable';
      }
      if (error.code === 'TIMEOUT') {
        return 'timeout';
      }
    }

    return 'error';
  }

  /**
   * Cache management
   */
  private checkCache(request: LLMRequest): LLMResponse | null {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      const age = Date.now() - cached.timestamp.getTime();
      if (age < (this.config.caching?.ttl || 3600) * 1000) {
        return cached.response;
      }
      // Remove expired entry
      this.cache.delete(cacheKey);
    }

    return null;
  }

  private cacheResponse(request: LLMRequest, response: LLMResponse): void {
    const cacheKey = this.generateCacheKey(request);
    this.cache.set(cacheKey, {
      response,
      timestamp: new Date(),
    });

    // Cleanup old cache entries
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private generateCacheKey(request: LLMRequest): string {
    return JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.keys()).filter((name) => {
      const provider = this.providers.get(name);
      return provider && this.isProviderAvailable(provider);
    });
  }

  /**
   * Get provider by name
   */
  getProvider(name: LLMProvider): ILLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get provider stats
   */
  getStats() {
    const stats: Record<string, any> = {};

    for (const [name, provider] of this.providers.entries()) {
      stats[name] = {
        requests: this.requestCount.get(name) || 0,
        status: provider.getStatus(),
      };
    }

    return stats;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    for (const provider of this.providers.values()) {
      provider.destroy();
    }

    this.providers.clear();
    this.cache.clear();
    this.requestCount.clear();
  }
}
