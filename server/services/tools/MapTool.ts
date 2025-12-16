/**
 * MapTool - Parallel function execution over collections
 *
 * Provides map/reduce operations for processing collections with:
 * - Configurable concurrency limits
 * - Progress tracking with SSE events
 * - Error handling and retry logic
 * - Timeout management per item
 * - Multiple execution strategies (parallel, sequential, batched)
 *
 * @example
 * ```typescript
 * // Parallel execution with concurrency limit
 * const result = await mapTool.execute({
 *   action: 'map',
 *   items: ['task1', 'task2', 'task3'],
 *   fn: 'processTask',
 *   options: { concurrency: 2, timeout: 5000 }
 * }, context);
 *
 * // Batched execution
 * const result = await mapTool.execute({
 *   action: 'mapBatched',
 *   items: [1, 2, 3, 4, 5],
 *   fn: 'processBatch',
 *   batchSize: 2
 * }, context);
 * ```
 */

import { EventEmitter } from 'events';
import {
  ITool,
  ToolDefinition,
  ToolResult,
  ToolExecutionContext,
} from './types';

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Options for map operations
 */
export interface MapOptions {
  /** Maximum number of parallel executions (default: 3) */
  concurrency?: number;

  /** Timeout per item in milliseconds (default: 30000) */
  timeout?: number;

  /** Number of retries for failed items (default: 0) */
  retries?: number;

  /** Progress callback function */
  onProgress?: (progress: MapProgress) => void;

  /** Stop all executions on first error (default: false) */
  stopOnError?: boolean;

  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
}

/**
 * Progress information for map operations
 */
export interface MapProgress {
  /** Total number of items */
  total: number;

  /** Number of completed items */
  completed: number;

  /** Number of successful items */
  successful: number;

  /** Number of failed items */
  failed: number;

  /** Number of items in progress */
  inProgress: number;

  /** Percentage complete (0-100) */
  percentComplete: number;

  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;

  /** Current item being processed */
  currentItem?: unknown;
}

/**
 * Result of a map operation
 */
export interface MapResult<T = unknown> {
  /** Whether all items succeeded */
  success: boolean;

  /** Array of results (same order as input) */
  results: Array<T | null>;

  /** Array of errors (null for successful items) */
  errors: Array<string | null>;

  /** Number of successful items */
  successCount: number;

  /** Number of failed items */
  failureCount: number;

  /** Total execution time in milliseconds */
  duration: number;

  /** Progress information */
  progress: MapProgress;
}

/**
 * Function executor type
 */
type MapFunction<T, R> = (item: T, index: number, items: T[]) => Promise<R> | R;

/**
 * Predicate function type for filter operations
 */
type PredicateFunction<T> = (item: T, index: number, items: T[]) => Promise<boolean> | boolean;

/**
 * Reducer function type for reduce operations
 */
type ReducerFunction<T, R> = (accumulator: R, item: T, index: number, items: T[]) => Promise<R> | R;

/**
 * Parameters for map action
 */
interface MapParams {
  action: 'map';
  items: unknown[];
  fn: string;
  options?: MapOptions;
}

/**
 * Parameters for mapSequential action
 */
interface MapSequentialParams {
  action: 'mapSequential';
  items: unknown[];
  fn: string;
  options?: Omit<MapOptions, 'concurrency'>;
}

/**
 * Parameters for mapBatched action
 */
interface MapBatchedParams {
  action: 'mapBatched';
  items: unknown[];
  fn: string;
  batchSize: number;
  options?: MapOptions;
}

/**
 * Parameters for filter action
 */
interface FilterParams {
  action: 'filter';
  items: unknown[];
  predicate: string;
  options?: Omit<MapOptions, 'stopOnError'>;
}

/**
 * Parameters for reduce action
 */
interface ReduceParams {
  action: 'reduce';
  items: unknown[];
  fn: string;
  initial: unknown;
  options?: Omit<MapOptions, 'concurrency' | 'stopOnError'>;
}

type MapToolParams = MapParams | MapSequentialParams | MapBatchedParams | FilterParams | ReduceParams;

// ========================================
// MAP TOOL IMPLEMENTATION
// ========================================

export class MapTool extends EventEmitter implements ITool {
  name = 'map';
  description = 'Execute functions in parallel over collections with concurrency control, error handling, and progress tracking';
  category = 'custom' as const;
  enabled = true;

  // Default options
  private defaultConcurrency = 3;
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetries = 0;
  private defaultRetryDelay = 1000;

  // Function registry for custom map functions
  private functionRegistry: Map<string, MapFunction<any, any>> = new Map();

  constructor() {
    super();
    this.setMaxListeners(100); // Support many concurrent operations
  }

  /**
   * Get tool definition for AI agent
   */
  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Operation to perform: map (parallel), mapSequential, mapBatched, filter, reduce',
            enum: ['map', 'mapSequential', 'mapBatched', 'filter', 'reduce'],
          },
          items: {
            type: 'string',
            description: 'Array of items to process (JSON string)',
          },
          fn: {
            type: 'string',
            description: 'Name of the function to execute on each item',
          },
          predicate: {
            type: 'string',
            description: 'Name of the predicate function for filter operation',
          },
          initial: {
            type: 'string',
            description: 'Initial value for reduce operation (JSON string)',
          },
          batchSize: {
            type: 'string',
            description: 'Batch size for mapBatched operation',
          },
          options: {
            type: 'string',
            description: 'Map options as JSON string: { concurrency, timeout, retries, stopOnError, retryDelay }',
          },
        },
        required: ['action', 'items'],
      },
    };
  }

  /**
   * Register a custom map function
   */
  registerFunction<T = any, R = any>(name: string, fn: MapFunction<T, R>): void {
    this.functionRegistry.set(name, fn);
  }

  /**
   * Unregister a custom map function
   */
  unregisterFunction(name: string): boolean {
    return this.functionRegistry.delete(name);
  }

  /**
   * Execute the map tool
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      const action = params.action as string;

      // Parse items
      const items = this.parseItems(params.items);

      // Execute based on action
      switch (action) {
        case 'map':
          return await this.executeMap(params as unknown as MapParams, context);

        case 'mapSequential':
          return await this.executeMapSequential(params as unknown as MapSequentialParams, context);

        case 'mapBatched':
          return await this.executeMapBatched(params as unknown as MapBatchedParams, context);

        case 'filter':
          return await this.executeFilter(params as unknown as FilterParams, context);

        case 'reduce':
          return await this.executeReduce(params as unknown as ReduceParams, context);

        default:
          return {
            success: false,
            error: `Unknown action: ${action}. Supported: map, mapSequential, mapBatched, filter, reduce`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute map operation (parallel with concurrency limit)
   */
  async map<T, R>(
    items: T[],
    fn: MapFunction<T, R>,
    options: MapOptions = {}
  ): Promise<MapResult<R>> {
    const {
      concurrency = this.defaultConcurrency,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      stopOnError = false,
      onProgress,
      retryDelay = this.defaultRetryDelay,
    } = options;

    const startTime = Date.now();
    const results: Array<R | null> = new Array(items.length).fill(null);
    const errors: Array<string | null> = new Array(items.length).fill(null);

    let completed = 0;
    let successful = 0;
    let failed = 0;
    let shouldStop = false;

    const progress: MapProgress = {
      total: items.length,
      completed: 0,
      successful: 0,
      failed: 0,
      inProgress: 0,
      percentComplete: 0,
    };

    // Track execution times for ETA calculation
    const executionTimes: number[] = [];

    const updateProgress = () => {
      progress.completed = completed;
      progress.successful = successful;
      progress.failed = failed;
      progress.percentComplete = items.length > 0 ? (completed / items.length) * 100 : 100;

      // Calculate estimated time remaining
      if (executionTimes.length > 0 && completed < items.length) {
        const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
        const remaining = items.length - completed;
        progress.estimatedTimeRemaining = avgTime * remaining;
      }

      if (onProgress) {
        onProgress({ ...progress });
      }

      this.emit('progress', progress);
    };

    // Process a single item with retries
    const processItem = async (item: T, index: number): Promise<void> => {
      if (shouldStop) return;

      const itemStartTime = Date.now();
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Execute with timeout
          const result = await this.executeWithTimeout(
            () => fn(item, index, items),
            timeout
          );

          results[index] = result;
          successful++;
          executionTimes.push(Date.now() - itemStartTime);
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // Retry if not last attempt
          if (attempt < retries) {
            await this.delay(retryDelay * (attempt + 1)); // Exponential backoff
          }
        }
      }

      // All retries exhausted
      errors[index] = lastError?.message || 'Unknown error';
      failed++;

      if (stopOnError) {
        shouldStop = true;
      }
    };

    // Process items with concurrency control
    const queue = [...items];
    const workers: Promise<void>[] = [];

    for (let i = 0; i < Math.min(concurrency, items.length); i++) {
      workers.push(this.worker(queue, processItem, () => {
        completed++;
        progress.inProgress = Math.max(0, workers.length - (items.length - queue.length));
        updateProgress();
      }));
    }

    await Promise.all(workers);

    const duration = Date.now() - startTime;

    return {
      success: failed === 0,
      results,
      errors,
      successCount: successful,
      failureCount: failed,
      duration,
      progress,
    };
  }

  /**
   * Execute map operation sequentially (one at a time)
   */
  async mapSequential<T, R>(
    items: T[],
    fn: MapFunction<T, R>,
    options: Omit<MapOptions, 'concurrency'> = {}
  ): Promise<MapResult<R>> {
    return this.map(items, fn, { ...options, concurrency: 1 });
  }

  /**
   * Execute map operation in batches
   */
  async mapBatched<T, R>(
    items: T[],
    fn: MapFunction<T, R>,
    batchSize: number,
    options: MapOptions = {}
  ): Promise<MapResult<R>> {
    const batches: T[][] = [];

    // Split items into batches
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    const startTime = Date.now();
    const allResults: Array<R | null> = [];
    const allErrors: Array<string | null> = [];
    let totalSuccessful = 0;
    let totalFailed = 0;

    // Process each batch sequentially
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchOffset = batchIndex * batchSize;

      // Process items within batch in parallel
      const batchResult = await this.map(
        batch,
        (item, index) => fn(item, batchOffset + index, items),
        options
      );

      allResults.push(...batchResult.results);
      allErrors.push(...batchResult.errors);
      totalSuccessful += batchResult.successCount;
      totalFailed += batchResult.failureCount;

      // Stop on error if configured
      if (options.stopOnError && batchResult.failureCount > 0) {
        // Fill remaining with nulls
        while (allResults.length < items.length) {
          allResults.push(null);
          allErrors.push('Stopped due to previous error');
        }
        break;
      }
    }

    return {
      success: totalFailed === 0,
      results: allResults,
      errors: allErrors,
      successCount: totalSuccessful,
      failureCount: totalFailed,
      duration: Date.now() - startTime,
      progress: {
        total: items.length,
        completed: allResults.length,
        successful: totalSuccessful,
        failed: totalFailed,
        inProgress: 0,
        percentComplete: (allResults.length / items.length) * 100,
      },
    };
  }

  /**
   * Filter items based on predicate
   */
  async filter<T>(
    items: T[],
    predicate: PredicateFunction<T>,
    options: Omit<MapOptions, 'stopOnError'> = {}
  ): Promise<ToolResult<T[]>> {
    const startTime = Date.now();

    const mapResult = await this.map(items, predicate, options);

    if (!mapResult.success) {
      return {
        success: false,
        error: `Filter failed: ${mapResult.failureCount} items had errors`,
        duration: Date.now() - startTime,
      };
    }

    const filtered = items.filter((_, index) => mapResult.results[index] === true);

    return {
      success: true,
      data: filtered,
      duration: Date.now() - startTime,
      metadata: {
        originalCount: items.length,
        filteredCount: filtered.length,
        removedCount: items.length - filtered.length,
      },
    };
  }

  /**
   * Reduce items to a single value
   */
  async reduce<T, R>(
    items: T[],
    fn: ReducerFunction<T, R>,
    initial: R,
    options: Omit<MapOptions, 'concurrency' | 'stopOnError'> = {}
  ): Promise<ToolResult<R>> {
    const startTime = Date.now();
    let accumulator = initial;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        accumulator = await this.executeWithTimeout(
          () => fn(accumulator, item, i, items),
          options.timeout || this.defaultTimeout
        );
      } catch (error) {
        return {
          success: false,
          error: `Reduce failed at index ${i}: ${error instanceof Error ? error.message : String(error)}`,
          duration: Date.now() - startTime,
        };
      }
    }

    return {
      success: true,
      data: accumulator,
      duration: Date.now() - startTime,
    };
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Execute map action
   */
  private async executeMap(
    params: MapParams,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const items = this.parseItems(params.items);
    const fn = this.getFunction(params.fn);
    const options = this.parseOptions(params.options);

    const result = await this.map(items, fn, options);

    return {
      success: result.success,
      data: result,
      metadata: {
        action: 'map',
        itemCount: items.length,
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    };
  }

  /**
   * Execute mapSequential action
   */
  private async executeMapSequential(
    params: MapSequentialParams,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const items = this.parseItems(params.items);
    const fn = this.getFunction(params.fn);
    const options = this.parseOptions(params.options);

    const result = await this.mapSequential(items, fn, options);

    return {
      success: result.success,
      data: result,
      metadata: {
        action: 'mapSequential',
        itemCount: items.length,
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    };
  }

  /**
   * Execute mapBatched action
   */
  private async executeMapBatched(
    params: MapBatchedParams,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const items = this.parseItems(params.items);
    const fn = this.getFunction(params.fn);
    const batchSize = typeof params.batchSize === 'string'
      ? parseInt(params.batchSize, 10)
      : params.batchSize;
    const options = this.parseOptions(params.options);

    if (batchSize < 1) {
      return {
        success: false,
        error: 'Batch size must be at least 1',
      };
    }

    const result = await this.mapBatched(items, fn, batchSize, options);

    return {
      success: result.success,
      data: result,
      metadata: {
        action: 'mapBatched',
        itemCount: items.length,
        batchSize,
        batchCount: Math.ceil(items.length / batchSize),
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    };
  }

  /**
   * Execute filter action
   */
  private async executeFilter(
    params: FilterParams,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const items = this.parseItems(params.items);
    const predicate = this.getFunction(params.predicate) as PredicateFunction<any>;
    const options = this.parseOptions(params.options);

    return await this.filter(items, predicate, options);
  }

  /**
   * Execute reduce action
   */
  private async executeReduce(
    params: ReduceParams,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const items = this.parseItems(params.items);
    const fn = this.getFunction(params.fn);
    const initial = this.parseJSON(params.initial);
    const options = this.parseOptions(params.options);

    return await this.reduce(items, fn as unknown as ReducerFunction<any, any>, initial, options);
  }

  /**
   * Worker for processing queue items
   */
  private async worker<T>(
    queue: T[],
    processor: (item: T, index: number) => Promise<void>,
    onComplete: () => void
  ): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const index = queue.length; // Original index
      await processor(item, index);
      onComplete();
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn())
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse items from various input formats
   */
  private parseItems(items: unknown): unknown[] {
    if (Array.isArray(items)) {
      return items;
    }

    if (typeof items === 'string') {
      try {
        const parsed = JSON.parse(items);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Not JSON, treat as single item
      }
    }

    throw new Error('Items must be an array or JSON array string');
  }

  /**
   * Parse options from various input formats
   */
  private parseOptions(options: unknown): MapOptions {
    if (!options) {
      return {};
    }

    if (typeof options === 'object') {
      return options as MapOptions;
    }

    if (typeof options === 'string') {
      try {
        return JSON.parse(options) as MapOptions;
      } catch {
        throw new Error('Options must be a valid JSON string');
      }
    }

    return {};
  }

  /**
   * Parse JSON value
   */
  private parseJSON(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Get function from registry
   */
  private getFunction(name: string): MapFunction<any, any> {
    const fn = this.functionRegistry.get(name);

    if (!fn) {
      throw new Error(
        `Function '${name}' not found. Available functions: ${Array.from(this.functionRegistry.keys()).join(', ')}`
      );
    }

    return fn;
  }
}

// ========================================
// SINGLETON EXPORT
// ========================================

let mapToolInstance: MapTool | null = null;

export function getMapTool(): MapTool {
  if (!mapToolInstance) {
    mapToolInstance = new MapTool();
  }
  return mapToolInstance;
}

export function resetMapTool(): void {
  mapToolInstance = null;
}

export default MapTool;
