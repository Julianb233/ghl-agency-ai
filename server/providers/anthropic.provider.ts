/**
 * Anthropic (Claude) Provider Implementation
 * Supports Claude Opus 4.5, Sonnet 4.5, and other Claude models
 */

import Anthropic from "@anthropic-ai/sdk";
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
} from './types';

export class AnthropicProvider extends BaseProvider {
  readonly name: LLMProvider = 'anthropic';
  readonly capabilities: ProviderCapabilities = {
    supportedModels: [
      'claude-opus-4-5-20251101',
      'claude-sonnet-4-5-20250929',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    maxContextLength: {
      'claude-opus-4-5-20251101': 200000,
      'claude-sonnet-4-5-20250929': 200000,
      'claude-3-5-sonnet-20241022': 200000,
      'claude-3-5-haiku-20241022': 200000,
      'claude-3-opus-20240229': 200000,
      'claude-3-sonnet-20240229': 200000,
      'claude-3-haiku-20240307': 200000,
    },
    maxOutputTokens: {
      'claude-opus-4-5-20251101': 8192,
      'claude-sonnet-4-5-20250929': 8192,
      'claude-3-5-sonnet-20241022': 8192,
      'claude-3-5-haiku-20241022': 8192,
      'claude-3-opus-20240229': 4096,
      'claude-3-sonnet-20240229': 4096,
      'claude-3-haiku-20240307': 4096,
    },
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsSystemMessages: true,
    supportsVision: true,
    supportsAudio: false,
    supportsTools: true,
    supportsFineTuning: false,
    supportsEmbeddings: false,
    supportsLogprobs: false,
    supportsBatching: false,
    pricing: {
      'claude-opus-4-5-20251101': {
        promptCostPer1k: 0.015,
        completionCostPer1k: 0.075,
        currency: 'USD',
      },
      'claude-sonnet-4-5-20250929': {
        promptCostPer1k: 0.003,
        completionCostPer1k: 0.015,
        currency: 'USD',
      },
      'claude-3-5-sonnet-20241022': {
        promptCostPer1k: 0.003,
        completionCostPer1k: 0.015,
        currency: 'USD',
      },
      'claude-3-5-haiku-20241022': {
        promptCostPer1k: 0.0008,
        completionCostPer1k: 0.004,
        currency: 'USD',
      },
      'claude-3-opus-20240229': {
        promptCostPer1k: 0.015,
        completionCostPer1k: 0.075,
        currency: 'USD',
      },
      'claude-3-sonnet-20240229': {
        promptCostPer1k: 0.003,
        completionCostPer1k: 0.015,
        currency: 'USD',
      },
      'claude-3-haiku-20240307': {
        promptCostPer1k: 0.00025,
        completionCostPer1k: 0.00125,
        currency: 'USD',
      },
    },
  };

  private client!: Anthropic;

  constructor(options: BaseProviderOptions) {
    super(options);
  }

  protected async doInitialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new AuthenticationError('Anthropic API key is required', 'anthropic');
    }

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });
  }

  protected async doComplete(request: LLMRequest): Promise<LLMResponse> {
    // Extract system message
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Build request params
    const params: Anthropic.MessageCreateParams = {
      model: request.model || this.config.model,
      messages,
      max_tokens: request.maxTokens || this.config.maxTokens || 4096,
      temperature: request.temperature ?? this.config.temperature,
      top_p: request.topP ?? this.config.topP,
      top_k: request.topK ?? this.config.topK,
      stop_sequences: request.stopSequences ?? this.config.stopSequences,
      stream: false,
    };

    if (systemMessage) {
      params.system = systemMessage.content;
    }

    // Add tools if present
    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));

      if (request.toolChoice) {
        if (typeof request.toolChoice === 'string') {
          params.tool_choice = { type: request.toolChoice };
        } else {
          params.tool_choice = {
            type: 'tool',
            name: request.toolChoice.name,
          };
        }
      }
    }

    // Call Anthropic API
    const response = await this.client.messages.create(params);

    // Extract content
    let content = '';
    let toolCalls: LLMResponse['toolCalls'] = undefined;

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        if (!toolCalls) toolCalls = [];
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        });
      }
    }

    // Calculate cost
    const pricing = this.capabilities.pricing![response.model];
    const promptCost = (response.usage.input_tokens / 1000) * pricing.promptCostPer1k;
    const completionCost = (response.usage.output_tokens / 1000) * pricing.completionCostPer1k;

    return {
      id: response.id,
      model: response.model as LLMModel,
      provider: 'anthropic',
      content,
      toolCalls,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      cost: {
        promptCost,
        completionCost,
        totalCost: promptCost + completionCost,
        currency: 'USD',
      },
      finishReason: response.stop_reason === 'end_turn' ? 'stop' :
                    response.stop_reason === 'max_tokens' ? 'length' :
                    response.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
    };
  }

  protected async *doStreamComplete(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
    // Extract system message
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Build request params
    const params: Anthropic.MessageCreateParams = {
      model: request.model || this.config.model,
      messages,
      max_tokens: request.maxTokens || this.config.maxTokens || 4096,
      temperature: request.temperature ?? this.config.temperature,
      top_p: request.topP ?? this.config.topP,
      top_k: request.topK ?? this.config.topK,
      stop_sequences: request.stopSequences ?? this.config.stopSequences,
      stream: true,
    };

    if (systemMessage) {
      params.system = systemMessage.content;
    }

    // Add tools if present
    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));
    }

    // Get stream from Anthropic API
    const stream = await this.client.messages.create(params);

    let inputTokens = 0;
    let outputTokens = 0;

    // Process stream events
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield {
            type: 'content',
            delta: {
              content: event.delta.text,
            },
          };
        } else if (event.delta.type === 'input_json_delta') {
          yield {
            type: 'tool_calls',
            delta: {
              toolCalls: [{
                index: event.index,
                function: {
                  arguments: event.delta.partial_json,
                },
              }],
            },
          };
        }
      } else if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens;
      } else if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens;
      } else if (event.type === 'message_stop') {
        // Calculate final cost
        const model = request.model || this.config.model;
        const pricing = this.capabilities.pricing![model];

        const promptCost = (inputTokens / 1000) * pricing.promptCostPer1k;
        const completionCost = (outputTokens / 1000) * pricing.completionCostPer1k;

        yield {
          type: 'done',
          usage: {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens: inputTokens + outputTokens,
          },
          cost: {
            promptCost,
            completionCost,
            totalCost: promptCost + completionCost,
            currency: 'USD',
          },
        };
      }
    }
  }

  async listModels(): Promise<LLMModel[]> {
    return this.capabilities.supportedModels;
  }

  async getModelInfo(model: LLMModel): Promise<ModelInfo> {
    const modelDescriptions: Record<string, string> = {
      'claude-opus-4-5-20251101': 'Most capable Claude model for complex tasks and analysis',
      'claude-sonnet-4-5-20250929': 'Balanced performance and speed for most applications',
      'claude-3-5-sonnet-20241022': 'Improved Claude 3.5 Sonnet with enhanced capabilities',
      'claude-3-5-haiku-20241022': 'Fast and efficient Claude 3.5 for simple tasks',
      'claude-3-opus-20240229': 'Previous generation flagship model',
      'claude-3-sonnet-20240229': 'Previous generation balanced model',
      'claude-3-haiku-20240307': 'Previous generation fast model',
    };

    return {
      model,
      name: model,
      description: modelDescriptions[model] || 'Claude model',
      contextLength: this.capabilities.maxContextLength[model] || 200000,
      maxOutputTokens: this.capabilities.maxOutputTokens[model] || 4096,
      supportedFeatures: [
        'chat',
        'completion',
        'tools',
        'vision',
        'system_messages',
        'streaming',
      ],
      pricing: this.capabilities.pricing![model],
    };
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    try {
      // Use a minimal request to check API availability
      await this.client.messages.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      });

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

  destroy(): void {
    super.destroy();
    // Anthropic client doesn't need explicit cleanup
  }
}
