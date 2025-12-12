/**
 * Google Gemini Provider Implementation
 * Supports Gemini 2.0 Flash, Gemini 1.5 Pro, and Gemini 1.5 Flash
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
} from './types';

export class GeminiProvider extends BaseProvider {
  readonly name: LLMProvider = 'google';
  readonly capabilities: ProviderCapabilities = {
    supportedModels: [
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
    maxContextLength: {
      'gemini-2.0-flash': 1000000,
      'gemini-1.5-pro': 2000000,
      'gemini-1.5-flash': 1000000,
    },
    maxOutputTokens: {
      'gemini-2.0-flash': 8192,
      'gemini-1.5-pro': 8192,
      'gemini-1.5-flash': 8192,
    },
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsSystemMessages: true,
    supportsVision: true,
    supportsAudio: true,
    supportsTools: true,
    supportsFineTuning: false,
    supportsEmbeddings: true,
    supportsLogprobs: false,
    supportsBatching: false,
    pricing: {
      'gemini-2.0-flash': {
        promptCostPer1k: 0.0001,
        completionCostPer1k: 0.0004,
        currency: 'USD',
      },
      'gemini-1.5-pro': {
        promptCostPer1k: 0.00125,
        completionCostPer1k: 0.005,
        currency: 'USD',
      },
      'gemini-1.5-flash': {
        promptCostPer1k: 0.000075,
        completionCostPer1k: 0.0003,
        currency: 'USD',
      },
    },
  };

  private baseUrl: string;
  private apiKey: string;

  constructor(options: BaseProviderOptions) {
    super(options);
    this.baseUrl = '';
    this.apiKey = '';
  }

  protected async doInitialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new AuthenticationError('Google AI API key is required', 'google');
    }

    this.apiKey = this.config.apiKey;
    this.baseUrl = this.config.apiUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  protected async doComplete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.model;
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

    // Convert messages to Gemini format
    const contents = request.messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? this.config.temperature,
        maxOutputTokens: request.maxTokens ?? this.config.maxTokens,
        topP: request.topP ?? this.config.topP,
        topK: request.topK ?? this.config.topK,
        stopSequences: request.stopSequences ?? this.config.stopSequences,
      },
    };

    // Add tools if present
    if (request.tools && request.tools.length > 0) {
      requestBody.tools = [{
        functionDeclarations: request.tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        })),
      }];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout || 60000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API error');
      }

      const data = await response.json();
      const candidate = data.candidates[0];
      const content = candidate.content.parts.map((p: any) => p.text).join('');

      // Extract tool calls if present
      const toolCalls = candidate.content.parts
        .filter((p: any) => p.functionCall)
        .map((p: any, index: number) => ({
          id: `call_${index}`,
          type: 'function' as const,
          function: {
            name: p.functionCall.name,
            arguments: JSON.stringify(p.functionCall.args),
          },
        }));

      // Estimate tokens and cost
      const promptTokens = this.estimateTokens(JSON.stringify(request.messages));
      const completionTokens = this.estimateTokens(content);
      const totalTokens = promptTokens + completionTokens;

      const pricing = this.capabilities.pricing![model];
      const promptCost = (promptTokens / 1000) * pricing.promptCostPer1k;
      const completionCost = (completionTokens / 1000) * pricing.completionCostPer1k;

      return {
        id: `gemini-${Date.now()}`,
        model: model as LLMModel,
        provider: 'google',
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        cost: {
          promptCost,
          completionCost,
          totalCost: promptCost + completionCost,
          currency: 'USD',
        },
        finishReason: candidate.finishReason === 'STOP' ? 'stop' : 'length',
      };
    } catch (error) {
      clearTimeout(timeout);
      throw this.transformError(error);
    }
  }

  protected async *doStreamComplete(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
    // Simplified streaming implementation
    const response = await this.doComplete(request);

    yield {
      type: 'content',
      delta: { content: response.content },
    };

    yield {
      type: 'done',
      usage: response.usage,
      cost: response.cost,
    };
  }

  async listModels(): Promise<LLMModel[]> {
    return this.capabilities.supportedModels;
  }

  async getModelInfo(model: LLMModel): Promise<ModelInfo> {
    return {
      model,
      name: model,
      description: 'Google Gemini model',
      contextLength: this.capabilities.maxContextLength[model] || 1000000,
      maxOutputTokens: this.capabilities.maxOutputTokens[model] || 8192,
      supportedFeatures: ['chat', 'completion', 'tools', 'vision', 'audio'],
      pricing: this.capabilities.pricing![model],
    };
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    try {
      const url = `${this.baseUrl}/models?key=${this.apiKey}`;
      const response = await fetch(url);

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
