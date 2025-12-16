/**
 * Retry Utility
 * Implements exponential backoff retry logic with context-aware error recovery
 */

import {
  ErrorType,
  classifyError,
  getErrorMetadata,
  isErrorRetryable,
} from './errorTypes';

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number, nextDelayMs: number) => void;
  // Context-aware options
  errorContext?: Record<string, unknown>;
  useIntelligentRetry?: boolean;
  onErrorClassified?: (errorType: ErrorType, attempt: number) => void;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Check if an error is retryable (enhanced with intelligent classification)
 * Network errors, timeouts, 5xx responses are retryable
 * NOT: 4xx client errors, validation errors
 */
export function isRetryableError(
  error: Error,
  retryableErrors?: string[],
  useIntelligentRetry: boolean = false
): boolean {
  const errorMessage = error.message.toLowerCase();

  // Custom retryable error patterns
  if (retryableErrors) {
    return retryableErrors.some(pattern =>
      errorMessage.includes(pattern.toLowerCase())
    );
  }

  // Use intelligent classification if enabled
  if (useIntelligentRetry) {
    const errorType = classifyError(error);
    return isErrorRetryable(errorType);
  }

  // Legacy pattern matching (kept for backwards compatibility)
  // Network errors
  const networkErrors = [
    'network',
    'econnreset',
    'econnrefused',
    'etimedout',
    'enotfound',
    'socket hang up',
    'fetch failed',
    'request timeout',
    'connection timeout',
    'getaddrinfo',
  ];

  if (networkErrors.some(err => errorMessage.includes(err))) {
    return true;
  }

  // 5xx server errors (but not 4xx client errors)
  if (errorMessage.match(/status\s*:?\s*5\d{2}/)) {
    return true;
  }

  // 429 Rate limit errors
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return true;
  }

  // Timeout errors
  if (errorMessage.includes('timeout')) {
    return true;
  }

  // Service unavailable
  if (errorMessage.includes('unavailable')) {
    return true;
  }

  // Do NOT retry 4xx client errors (except 429)
  if (errorMessage.match(/status\s*:?\s*4\d{2}/) && !errorMessage.includes('429')) {
    return false;
  }

  // Validation errors are not retryable
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return false;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 * Enhanced with error-type-specific backoff multipliers
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  errorType?: ErrorType
): number {
  // Use error-specific backoff multiplier if available
  let effectiveMultiplier = backoffMultiplier;
  if (errorType) {
    const metadata = getErrorMetadata(errorType);
    effectiveMultiplier = metadata.backoffMultiplier;
  }

  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = initialDelayMs * Math.pow(effectiveMultiplier, attempt - 1);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter (randomize +/- 20% to prevent thundering herd)
  const jitter = cappedDelay * 0.2 * (Math.random() - 0.5);

  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     if (!response.ok) throw new Error(`Status: ${response.status}`);
 *     return response.json();
 *   },
 *   {
 *     maxAttempts: 3,
 *     initialDelayMs: 1000,
 *     maxDelayMs: 10000,
 *     backoffMultiplier: 2,
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  const errors: Error[] = [];
  let lastError: Error | null = null;
  let lastErrorType: ErrorType | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      // Execute the function
      const result = await fn();

      // Success - log if this was a retry
      if (attempt > 1) {
        console.log(`[Retry] Success after ${attempt} attempts`);
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      errors.push(err);

      // Classify error if intelligent retry is enabled
      let errorType: ErrorType | undefined;
      if (config.useIntelligentRetry) {
        errorType = classifyError(err, config.errorContext);
        lastErrorType = errorType;

        // Notify about error classification
        if (config.onErrorClassified) {
          config.onErrorClassified(errorType, attempt);
        }

        // Get error-specific max retries
        const metadata = getErrorMetadata(errorType);
        if (attempt > metadata.maxRetries && metadata.maxRetries > 0) {
          console.warn(
            `[Retry] Error type ${errorType} max retries (${metadata.maxRetries}) exceeded`
          );
          throw err;
        }
      }

      // Check if error is retryable
      const shouldRetry = isRetryableError(
        err,
        config.retryableErrors,
        config.useIntelligentRetry
      );

      if (!shouldRetry) {
        const errorTypeMsg = errorType ? ` (${errorType})` : '';
        console.warn(
          `[Retry] Non-retryable error${errorTypeMsg} on attempt ${attempt}/${config.maxAttempts}:`,
          err.message
        );
        throw err;
      }

      // Don't retry if this was the last attempt
      if (attempt >= config.maxAttempts) {
        const errorTypeMsg = errorType ? ` (${errorType})` : '';
        console.error(`[Retry] All ${config.maxAttempts} attempts failed${errorTypeMsg}`);
        break;
      }

      // Calculate delay for next retry
      const delayMs = calculateDelay(
        attempt,
        config.initialDelayMs,
        config.maxDelayMs,
        config.backoffMultiplier,
        errorType
      );

      const errorTypeMsg = errorType ? ` [${errorType}]` : '';
      console.warn(
        `[Retry]${errorTypeMsg} Attempt ${attempt}/${config.maxAttempts} failed: ${err.message}. ` +
        `Retrying in ${delayMs}ms...`
      );

      // Call onRetry callback if provided
      if (config.onRetry) {
        config.onRetry(err, attempt, delayMs);
      }

      // Wait before next attempt
      await sleep(delayMs);
    }
  }

  // All retries exhausted - throw error with all attempts
  const errorTypeMsg = lastErrorType ? ` (${lastErrorType})` : '';
  const errorMessage = errors.length > 0
    ? `Failed after ${config.maxAttempts} attempts${errorTypeMsg}. Errors: ${errors.map((e, i) => `\n  Attempt ${i + 1}: ${e.message}`).join('')}`
    : `Failed after ${config.maxAttempts} attempts${errorTypeMsg}`;

  const finalError = new Error(errorMessage);
  (finalError as any).attempts = errors;
  (finalError as any).lastError = lastError;
  (finalError as any).errorType = lastErrorType;

  throw finalError;
}

/**
 * Retry decorator for class methods
 *
 * @example
 * ```ts
 * class MyService {
 *   @Retry({ maxAttempts: 3 })
 *   async fetchData() {
 *     // ... implementation
 *   }
 * }
 * ```
 */
export function Retry(options: Partial<RetryOptions> = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Specialized retry for HTTP fetch requests
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  options: Partial<RetryOptions> = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, init);

    // Throw error for non-ok responses to trigger retry logic
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }, options);
}
