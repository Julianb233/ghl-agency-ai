/**
 * Provider Factory
 * Creates and initializes LLM provider instances
 */

import { ILLMProvider, LLMProvider, LLMProviderConfig } from './types';
import { AnthropicProvider } from './anthropic.provider';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { OllamaProvider } from './ollama.provider';

export class ProviderFactory {
  /**
   * Create a provider instance
   */
  static async createProvider(
    name: LLMProvider,
    config: LLMProviderConfig
  ): Promise<ILLMProvider> {
    const providerOptions = { config };

    let provider: ILLMProvider;

    switch (name) {
      case 'anthropic':
        provider = new AnthropicProvider(providerOptions);
        break;

      case 'openai':
        provider = new OpenAIProvider(providerOptions);
        break;

      case 'google':
        provider = new GeminiProvider(providerOptions);
        break;

      case 'ollama':
        provider = new OllamaProvider(providerOptions);
        break;

      case 'cohere':
        throw new Error('Cohere provider not yet implemented');

      default:
        throw new Error(`Unknown provider: ${name}`);
    }

    // Initialize the provider
    await provider.initialize();

    return provider;
  }

  /**
   * Create multiple providers from configs
   */
  static async createProviders(
    configs: Record<LLMProvider, LLMProviderConfig>
  ): Promise<Map<LLMProvider, ILLMProvider>> {
    const providers = new Map<LLMProvider, ILLMProvider>();
    const errors: Array<{ provider: LLMProvider; error: Error }> = [];

    for (const [providerName, providerConfig] of Object.entries(configs)) {
      try {
        const provider = await this.createProvider(
          providerName as LLMProvider,
          providerConfig
        );
        providers.set(providerName as LLMProvider, provider);
        console.log(`[ProviderFactory] Initialized ${providerName} provider`);
      } catch (error) {
        console.error(`[ProviderFactory] Failed to initialize ${providerName}:`, error);
        errors.push({
          provider: providerName as LLMProvider,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    if (providers.size === 0) {
      throw new Error(
        `No providers could be initialized. Errors: ${errors.map((e) => `${e.provider}: ${e.error.message}`).join(', ')}`
      );
    }

    return providers;
  }

  /**
   * Validate provider configuration
   */
  static validateConfig(config: LLMProviderConfig): string[] {
    const errors: string[] = [];

    if (!config.provider) {
      errors.push('Provider name is required');
    }

    if (!config.model) {
      errors.push('Model is required');
    }

    // Provider-specific validation
    if (config.provider === 'anthropic' && !config.apiKey) {
      errors.push('Anthropic API key is required');
    }

    if (config.provider === 'openai' && !config.apiKey) {
      errors.push('OpenAI API key is required');
    }

    if (config.provider === 'google' && !config.apiKey) {
      errors.push('Google AI API key is required');
    }

    // Validate parameters
    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
      }
    }

    if (config.maxTokens !== undefined) {
      if (config.maxTokens < 1 || config.maxTokens > 100000) {
        errors.push('Max tokens must be between 1 and 100000');
      }
    }

    if (config.topP !== undefined) {
      if (config.topP < 0 || config.topP > 1) {
        errors.push('Top-p must be between 0 and 1');
      }
    }

    return errors;
  }
}
