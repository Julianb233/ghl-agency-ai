/**
 * OpenAI Provider Implementation
 * Supports GPT-4o, GPT-4o-mini, o1-preview, o1-mini, and other OpenAI models
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
  AuthenticationError,
  RateLimitError,
  ModelNotFoundError,
} from './types';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
}

export class OpenAIProvider extends BaseProvider {
  readonly name: LLMProvider = 'openai';
  readonly capabilities: ProviderCapabilities = {
    supportedModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'o1-preview',
      'o1-mini',
    ],
    maxContextLength: {
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'gpt-4-turbo': 128000,
      'gpt-4': 8192,
      'gpt-3.5-turbo': 16385,
      'o1-preview': 128000,
      'o1-mini': 128000,
    },
    maxOutputTokens: {
      'gpt-4o': 16384,
      'gpt-4o-mini': 16384,
      'gpt-4-turbo': 4096,
      'gpt-4': 4096,
      'gpt-3.5-turbo': 4096,
      'o1-preview': 32768,
      'o1-mini': 65536,
    },
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsSystemMessages: true,
    supportsVision: true,
    supportsAudio: false,
    supportsTools: true,
    supportsFineTuning: true,
    supportsEmbeddings: true,
    supportsLogprobs: true,
    supportsBatching: true,
    rateLimit: {
      requestsPerMinute: 5000,
      tokensPerMinute: 800000,
      concurrentRequests: 500,
    },
    pricing: {
      'gpt-4o': {
        promptCostPer1k: 0.0025,
        completionCostPer1k: 0.01,
        currency: 'USD',
      },
      'gpt-4o-mini': {
        promptCostPer1k: 0.00015,
        completionCostPer1k: 0.0006,
        currency: 'USD',
      },
      'gpt-4-turbo': {
        promptCostPer1k: 0.01,
        completionCostPer1k: 0.03,
        currency: 'USD',
      },
      'gpt-4': {
        promptCostPer1k: 0.03,
        completionCostPer1k: 0.06,
        currency: 'USD',
      },
      'gpt-3.5-turbo': {
        promptCostPer1k: 0.0005,
        completionCostPer1k: 0.0015,
        currency: 'USD',
      },
      'o1-preview': {
        promptCostPer1k: 0.015,
        completionCostPer1k: 0.06,
        currency: 'USD',
      },
      'o1-mini': {
        promptCostPer1k: 0.003,
        completionCostPer1k: 0.012,
        currency: 'USD',
      },
    },
  };

  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: BaseProviderOptions) {
    super(options);
    this.baseUrl = '';
    this.headers = {};
  }

  protected async doInitialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new AuthenticationError('OpenAI API key is required', 'openai');
    }

    this.baseUrl = this.config.apiUrl || 'https://api.openai.com/v1';
    this.headers = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };

    // Add organization header if provided
    if (this.config.providerOptions?.organization) {
      this.headers['OpenAI-Organization'] = this.config.providerOptions.organization;
    }
  }

  protected async doComplete(request: LLMRequest): Promise<LLMResponse> {
    const requestBody: any = {
      model: request.model || this.config.model,
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
        ...(msg.functionCall && { function_call: msg.functionCall }),
      })),
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      top_p: request.topP ?? this.config.topP,
      frequency_penalty: request.frequencyPenalty ?? this.config.frequencyPenalty,
      presence_penalty: request.presencePenalty ?? this.config.presencePenalty,
      stop: request.stopSequences ?? this.config.stopSequences,
      stream: false,
    };

    // Add tools if present
    if (request.tools && request.tools.length > 0) {
      requestBody.tools = request.tools;
      if (request.toolChoice) {
        requestBody.tool_choice = request.toolChoice;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout || 60000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data: OpenAIResponse = await response.json();
      const choice = data.choices[0];

      // Calculate cost
      const model = request.model || this.config.model;
      const pricing = this.capabilities.pricing![model];
      const promptCost = (data.usage.prompt_tokens / 1000) * pricing.promptCostPer1k;
      const completionCost = (data.usage.completion_tokens / 1000) * pricing.completionCostPer1k;

      return {
        id: data.id,
        model: data.model as LLMModel,
        provider: 'openai',
        content: choice.message.content || '',
        functionCall: choice.message.function_call,
        toolCalls: choice.message.tool_calls,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        cost: {
          promptCost,
          completionCost,
          totalCost: promptCost + completionCost,
          currency: 'USD',
        },
        finishReason: choice.finish_reason,
      };
    } catch (error) {
      clearTimeout(timeout);
      throw this.transformError(error);
    }
  }

  protected async *doStreamComplete(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
    const requestBody: any = {
      model: request.model || this.config.model,
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
        ...(msg.functionCall && { function_call: msg.functionCall }),
      })),
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      top_p: request.topP ?? this.config.topP,
      frequency_penalty: request.frequencyPenalty ?? this.config.frequencyPenalty,
      presence_penalty: request.presencePenalty ?? this.config.presencePenalty,
      stop: request.stopSequences ?? this.config.stopSequences,
      stream: true,
    };

    // Add tools if present
    if (request.tools && request.tools.length > 0) {
      requestBody.tools = request.tools;
      if (request.toolChoice) {
        requestBody.tool_choice = request.toolChoice;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), (this.config.timeout || 60000) * 2);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const chunk: OpenAIStreamChunk = JSON.parse(data);
              const delta = chunk.choices[0]?.delta;

              if (!delta) continue;

              if (delta.content) {
                yield {
                  type: 'content',
                  delta: { content: delta.content },
                };
              }

              if (delta.function_call) {
                yield {
                  type: 'function_call',
                  delta: { functionCall: delta.function_call },
                };
              }

              if (delta.tool_calls) {
                yield {
                  type: 'tool_calls',
                  delta: { toolCalls: delta.tool_calls },
                };
              }

              if (chunk.choices[0]?.finish_reason) {
                // Estimate tokens for streaming
                const promptTokens = this.estimateTokens(JSON.stringify(request.messages));
                const completionTokens = 100; // Rough estimate

                const model = request.model || this.config.model;
                const pricing = this.capabilities.pricing![model];
                const promptCost = (promptTokens / 1000) * pricing.promptCostPer1k;
                const completionCost = (completionTokens / 1000) * pricing.completionCostPer1k;

                yield {
                  type: 'done',
                  usage: {
                    promptTokens,
                    completionTokens,
                    totalTokens: promptTokens + completionTokens,
                  },
                  cost: {
                    promptCost,
                    completionCost,
                    totalCost: promptCost + completionCost,
                    currency: 'USD',
                  },
                };
              }
            } catch (e) {
              console.warn('[OpenAI] Failed to parse stream chunk', { data, error: e });
            }
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
    const modelDescriptions: Record<string, string> = {
      'gpt-4o': 'Most capable multimodal model with vision and audio',
      'gpt-4o-mini': 'Smaller, faster, cheaper version of GPT-4o',
      'gpt-4-turbo': 'Enhanced GPT-4 with improved performance',
      'gpt-4': 'Most capable GPT-4 model for complex tasks',
      'gpt-3.5-turbo': 'Fast and efficient model for most tasks',
      'o1-preview': 'Advanced reasoning model (preview)',
      'o1-mini': 'Fast reasoning model optimized for STEM',
    };

    return {
      model,
      name: model,
      description: modelDescriptions[model] || 'OpenAI language model',
      contextLength: this.capabilities.maxContextLength[model] || 8192,
      maxOutputTokens: this.capabilities.maxOutputTokens[model] || 4096,
      supportedFeatures: [
        'chat',
        'completion',
        'tools',
        'function_calling',
        ...(model.includes('gpt-4') ? ['vision'] : []),
        ...(model.includes('o1') ? ['reasoning'] : []),
      ],
      pricing: this.capabilities.pricing![model],
    };
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.headers,
      });

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

  private async handleErrorResponse(response: Response): Promise<void> {
    const errorText = await response.text();
    let errorData: any;

    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: { message: errorText } };
    }

    const message = errorData.error?.message || 'Unknown error';

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message, 'openai', errorData);
      case 429:
        const retryAfter = response.headers.get('retry-after');
        throw new RateLimitError(
          message,
          'openai',
          retryAfter ? parseInt(retryAfter) : undefined,
          errorData
        );
      case 404:
        throw new ModelNotFoundError(this.config.model, 'openai', errorData);
      default:
        throw new Error(`OpenAI API error (${response.status}): ${message}`);
    }
  }
}
