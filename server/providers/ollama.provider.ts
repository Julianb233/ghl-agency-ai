/**
 * Ollama Provider Implementation
 * Supports local LLM models including Llama 3.2, Qwen 2.5, DeepSeek-V2, Mixtral
 */

import { BaseProvider, BaseProviderOptions } from './base.provider';
import {
  LLMProvider,
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMStreamEvent,
  ModelInfo,
  ProviderCapabilities,
  HealthCheckResult,
  ProviderUnavailableError,
} from './types';

export class OllamaProvider extends BaseProvider {
  readonly name: LLMProvider = 'ollama';
  readonly capabilities: ProviderCapabilities = {
    supportedModels: [
      'llama-3.2',
      'llama-3.1',
      'qwen-2.5',
      'deepseek-v2',
      'mixtral-8x7b',
      'mixtral-8x22b',
    ],
    maxContextLength: {
      'llama-3.2': 128000,
      'llama-3.1': 128000,
      'qwen-2.5': 32768,
      'deepseek-v2': 64000,
      'mixtral-8x7b': 32768,
      'mixtral-8x22b': 65536,
    },
    maxOutputTokens: {
      'llama-3.2': 8192,
      'llama-3.1': 8192,
      'qwen-2.5': 8192,
      'deepseek-v2': 8192,
      'mixtral-8x7b': 8192,
      'mixtral-8x22b': 8192,
    },
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsSystemMessages: true,
    supportsVision: false,
    supportsAudio: false,
    supportsTools: false,
    supportsFineTuning: true,
    supportsEmbeddings: true,
    supportsLogprobs: false,
    supportsBatching: false,
    pricing: {
      // Ollama is free (local)
      'llama-3.2': { promptCostPer1k: 0, completionCostPer1k: 0, currency: 'USD' },
      'llama-3.1': { promptCostPer1k: 0, completionCostPer1k: 0, currency: 'USD' },
      'qwen-2.5': { promptCostPer1k: 0, completionCostPer1k: 0, currency: 'USD' },
      'deepseek-v2': { promptCostPer1k: 0, completionCostPer1k: 0, currency: 'USD' },
      'mixtral-8x7b': { promptCostPer1k: 0, completionCostPer1k: 0, currency: 'USD' },
      'mixtral-8x22b': { promptCostPer1k: 0, completionCostPer1k: 0, currency: 'USD' },
    },
  };

  private baseUrl: string;

  constructor(options: BaseProviderOptions) {
    super(options);
    this.baseUrl = '';
  }

  protected async doInitialize(): Promise<void> {
    this.baseUrl = this.config.apiUrl || 'http://localhost:11434';

    // Test connection
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Ollama server not accessible');
      }
    } catch (error) {
      throw new ProviderUnavailableError('ollama', {
        message: 'Ollama server is not running. Please start Ollama.',
        error,
      });
    }
  }

  protected async doComplete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.model;

    // Convert messages to Ollama format
    const messages = request.messages.map((msg) => ({
      role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const requestBody = {
      model,
      messages,
      options: {
        temperature: request.temperature ?? this.config.temperature,
        num_predict: request.maxTokens ?? this.config.maxTokens,
        top_p: request.topP ?? this.config.topP,
        top_k: request.topK ?? this.config.topK,
        stop: request.stopSequences ?? this.config.stopSequences,
      },
      stream: false,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout || 120000);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama error: ${error}`);
      }

      const data = await response.json();

      // Estimate tokens
      const promptTokens = this.estimateTokens(JSON.stringify(request.messages));
      const completionTokens = this.estimateTokens(data.message.content);
      const totalTokens = promptTokens + completionTokens;

      return {
        id: `ollama-${Date.now()}`,
        model: model as LLMModel,
        provider: 'ollama',
        content: data.message.content,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        cost: {
          promptCost: 0,
          completionCost: 0,
          totalCost: 0,
          currency: 'USD',
        },
        finishReason: data.done ? 'stop' : 'length',
      };
    } catch (error) {
      clearTimeout(timeout);
      throw this.transformError(error);
    }
  }

  protected async *doStreamComplete(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
    const model = request.model || this.config.model;

    const messages = request.messages.map((msg) => ({
      role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const requestBody = {
      model,
      messages,
      options: {
        temperature: request.temperature ?? this.config.temperature,
        num_predict: request.maxTokens ?? this.config.maxTokens,
        top_p: request.topP ?? this.config.topP,
        top_k: request.topK ?? this.config.topK,
      },
      stream: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), (this.config.timeout || 120000) * 2);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Ollama streaming error');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.message?.content) {
              yield {
                type: 'content',
                delta: { content: data.message.content },
              };
            }

            if (data.done) {
              const promptTokens = this.estimateTokens(JSON.stringify(request.messages));
              const completionTokens = 100; // Estimate

              yield {
                type: 'done',
                usage: {
                  promptTokens,
                  completionTokens,
                  totalTokens: promptTokens + completionTokens,
                },
                cost: {
                  promptCost: 0,
                  completionCost: 0,
                  totalCost: 0,
                  currency: 'USD',
                },
              };
            }
          } catch (e) {
            console.warn('[Ollama] Failed to parse stream chunk', { line, error: e });
          }
        }
      }
    } catch (error) {
      clearTimeout(timeout);
      throw this.transformError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  async listModels(): Promise<LLMModel[]> {
    return this.capabilities.supportedModels;
  }

  async getModelInfo(model: LLMModel): Promise<ModelInfo> {
    return {
      model,
      name: model,
      description: 'Ollama local model',
      contextLength: this.capabilities.maxContextLength[model] || 32768,
      maxOutputTokens: this.capabilities.maxOutputTokens[model] || 8192,
      supportedFeatures: ['chat', 'completion', 'embeddings'],
      pricing: this.capabilities.pricing![model],
    };
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return {
        healthy: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }
}
