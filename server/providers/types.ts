/**
 * Multi-LLM Provider Types and Interfaces
 * Unified type system for all LLM providers in GHL Agency AI
 */

// ===== PROVIDER TYPES =====

export type LLMProvider =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'cohere'
  | 'ollama';

export type LLMModel =
  // OpenAI Models
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'gpt-4'
  | 'gpt-3.5-turbo'
  | 'o1-preview'
  | 'o1-mini'
  // Anthropic Models
  | 'claude-opus-4-5-20251101'
  | 'claude-sonnet-4-5-20250929'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-haiku-20241022'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307'
  // Google Models
  | 'gemini-2.0-flash'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  // Cohere Models
  | 'command-r-plus'
  | 'command-r'
  | 'command'
  | 'command-light'
  // Ollama Models
  | 'llama-3.2'
  | 'llama-3.1'
  | 'qwen-2.5'
  | 'deepseek-v2'
  | 'mixtral-8x7b'
  | 'mixtral-8x22b';

// ===== BASE INTERFACES =====

export interface LLMProviderConfig {
  provider: LLMProvider;
  apiKey?: string;
  apiUrl?: string;
  model: LLMModel;

  // Common parameters
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];

  // Provider-specific settings
  providerOptions?: Record<string, any>;

  // Performance settings
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;

  // Advanced features
  enableStreaming?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;

  // Cost optimization
  enableCostOptimization?: boolean;
  maxCostPerRequest?: number;
  fallbackModels?: LLMModel[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: LLMModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;

  // Function calling
  functions?: LLMFunction[];
  functionCall?: 'auto' | 'none' | { name: string };

  // Tools (Anthropic/OpenAI)
  tools?: LLMTool[];
  toolChoice?: 'auto' | 'none' | { type: 'tool'; name: string };

  // Provider-specific options
  providerOptions?: Record<string, any>;

  // Cost optimization
  costConstraints?: {
    maxCost?: number;
    preferredModels?: LLMModel[];
  };
}

export interface LLMFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface LLMTool {
  type: 'function';
  function: LLMFunction;
}

export interface LLMResponse {
  id: string;
  model: LLMModel;
  provider: LLMProvider;

  // Content
  content: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;

  // Metadata
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  // Cost tracking
  cost?: {
    promptCost: number;
    completionCost: number;
    totalCost: number;
    currency: string;
  };

  // Performance metrics
  latency?: number;

  // Additional info
  finishReason?: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter';
  metadata?: Record<string, any>;
}

export interface LLMStreamEvent {
  type: 'content' | 'function_call' | 'tool_calls' | 'error' | 'done';
  delta?: {
    content?: string;
    functionCall?: {
      name?: string;
      arguments?: string;
    };
    toolCalls?: Array<{
      index: number;
      id?: string;
      type?: 'function';
      function?: {
        name?: string;
        arguments?: string;
      };
    }>;
  };
  error?: Error;
  usage?: LLMResponse['usage'];
  cost?: LLMResponse['cost'];
}

// ===== PROVIDER CAPABILITIES =====

export interface ProviderCapabilities {
  // Model features
  supportedModels: LLMModel[];
  maxContextLength: Partial<Record<LLMModel, number>>;
  maxOutputTokens: Partial<Record<LLMModel, number>>;

  // Feature support
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsSystemMessages: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsTools: boolean;

  // Advanced features
  supportsFineTuning: boolean;
  supportsEmbeddings: boolean;
  supportsLogprobs: boolean;
  supportsBatching: boolean;

  // Constraints
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    concurrentRequests: number;
  };

  // Cost information
  pricing?: {
    [model: string]: {
      promptCostPer1k: number;
      completionCostPer1k: number;
      currency: string;
    };
  };
}

// ===== ERROR HANDLING =====

export class LLMProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: LLMProvider,
    public statusCode?: number,
    public retryable: boolean = true,
    public details?: any
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }
}

export class RateLimitError extends LLMProviderError {
  constructor(
    message: string,
    provider: LLMProvider,
    public retryAfter?: number,
    details?: any
  ) {
    super(message, 'RATE_LIMIT', provider, 429, true, details);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends LLMProviderError {
  constructor(message: string, provider: LLMProvider, details?: any) {
    super(message, 'AUTHENTICATION', provider, 401, false, details);
    this.name = 'AuthenticationError';
  }
}

export class ModelNotFoundError extends LLMProviderError {
  constructor(model: string, provider: LLMProvider, details?: any) {
    super(`Model ${model} not found`, 'MODEL_NOT_FOUND', provider, 404, false, details);
    this.name = 'ModelNotFoundError';
  }
}

export class ProviderUnavailableError extends LLMProviderError {
  constructor(provider: LLMProvider, details?: any) {
    super(`Provider ${provider} is unavailable`, 'PROVIDER_UNAVAILABLE', provider, 503, true, details);
    this.name = 'ProviderUnavailableError';
  }
}

// ===== ABSTRACT PROVIDER INTERFACE =====

export interface ILLMProvider {
  // Properties
  readonly name: LLMProvider;
  readonly capabilities: ProviderCapabilities;
  config: LLMProviderConfig;

  // Core methods
  initialize(): Promise<void>;
  complete(request: LLMRequest): Promise<LLMResponse>;
  streamComplete(request: LLMRequest): AsyncIterable<LLMStreamEvent>;

  // Model management
  listModels(): Promise<LLMModel[]>;
  getModelInfo(model: LLMModel): Promise<ModelInfo>;
  validateModel(model: LLMModel): boolean;

  // Health and status
  healthCheck(): Promise<HealthCheckResult>;
  getStatus(): ProviderStatus;

  // Cost management
  estimateCost(request: LLMRequest): Promise<CostEstimate>;

  // Cleanup
  destroy(): void;
}

export interface ModelInfo {
  model: LLMModel;
  name: string;
  description: string;
  contextLength: number;
  maxOutputTokens: number;
  supportedFeatures: string[];
  pricing?: {
    promptCostPer1k: number;
    completionCostPer1k: number;
    currency: string;
  };
  deprecated?: boolean;
  deprecationDate?: Date;
  recommendedReplacement?: LLMModel;
}

export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  error?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface ProviderStatus {
  available: boolean;
  currentLoad: number;
  queueLength: number;
  activeRequests: number;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
}

export interface CostEstimate {
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  estimatedTotalTokens: number;
  estimatedCost: {
    prompt: number;
    completion: number;
    total: number;
    currency: string;
  };
  confidence: number; // 0-1
}

// ===== FALLBACK AND RETRY STRATEGIES =====

export interface FallbackStrategy {
  name: string;
  enabled: boolean;
  rules: FallbackRule[];
  maxAttempts: number;
}

export interface FallbackRule {
  condition: 'error' | 'rate_limit' | 'timeout' | 'cost' | 'unavailable';
  errorCodes?: string[];
  fallbackProviders: LLMProvider[];
  fallbackModels?: LLMModel[];
  retryOriginal: boolean;
  retryDelay?: number;
}

// ===== TYPE GUARDS =====

export function isLLMResponse(obj: any): obj is LLMResponse {
  return obj && typeof obj.id === 'string' && typeof obj.content === 'string';
}

export function isLLMStreamEvent(obj: any): obj is LLMStreamEvent {
  return obj && typeof obj.type === 'string';
}

export function isLLMProviderError(error: any): error is LLMProviderError {
  return error instanceof LLMProviderError;
}

export function isRateLimitError(error: any): error is RateLimitError {
  return error instanceof RateLimitError;
}
