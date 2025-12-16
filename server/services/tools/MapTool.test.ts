/**
 * MapTool Unit Tests
 *
 * Comprehensive test suite for parallel map/reduce operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapTool, MapOptions, MapProgress } from './MapTool';
import { ToolExecutionContext } from './types';

describe('MapTool', () => {
  let mapTool: MapTool;
  let context: ToolExecutionContext;

  beforeEach(() => {
    mapTool = new MapTool();
    context = {
      userId: 1,
      sessionId: 'test-session',
      executionId: 1,
    };
  });

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(mapTool.name).toBe('map');
      expect(mapTool.category).toBe('custom');
      expect(mapTool.enabled).toBe(true);
    });

    it('should provide tool definition', () => {
      const definition = mapTool.getDefinition();

      expect(definition.name).toBe('map');
      expect(definition.description).toBeTruthy();
      expect(definition.parameters.properties.action).toBeDefined();
      expect(definition.parameters.properties.items).toBeDefined();
      expect(definition.parameters.required).toContain('action');
      expect(definition.parameters.required).toContain('items');
    });

    it('should support all action types', () => {
      const definition = mapTool.getDefinition();
      const actionEnum = definition.parameters.properties.action.enum || [];

      expect(actionEnum).toContain('map');
      expect(actionEnum).toContain('mapSequential');
      expect(actionEnum).toContain('mapBatched');
      expect(actionEnum).toContain('filter');
      expect(actionEnum).toContain('reduce');
    });
  });

  describe('Function Registration', () => {
    it('should register custom functions', () => {
      const testFn = async (x: number) => x * 2;
      mapTool.registerFunction('double', testFn);

      // Should not throw
      expect(() => mapTool.registerFunction('triple', async (x: number) => x * 3)).not.toThrow();
    });

    it('should unregister functions', () => {
      const testFn = async (x: number) => x * 2;
      mapTool.registerFunction('double', testFn);

      const result = mapTool.unregisterFunction('double');
      expect(result).toBe(true);

      const result2 = mapTool.unregisterFunction('nonexistent');
      expect(result2).toBe(false);
    });
  });

  describe('map() - Parallel Execution', () => {
    it('should process items in parallel', async () => {
      const items = [1, 2, 3, 4, 5];
      const fn = async (x: number) => x * 2;

      mapTool.registerFunction('double', fn);

      const result = await mapTool.map(items, fn);

      expect(result.success).toBe(true);
      expect(result.results).toEqual([2, 4, 6, 8, 10]);
      expect(result.successCount).toBe(5);
      expect(result.failureCount).toBe(0);
      expect(result.errors.every(e => e === null)).toBe(true);
    });

    it('should respect concurrency limit', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const items = [1, 2, 3, 4, 5, 6];
      const fn = async (x: number) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrent--;
        return x * 2;
      };

      await mapTool.map(items, fn, { concurrency: 2 });

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should handle errors gracefully', async () => {
      const items = [1, 2, 3, 4, 5];
      const fn = async (x: number) => {
        if (x === 3) throw new Error('Test error');
        return x * 2;
      };

      const result = await mapTool.map(items, fn);

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(4);
      expect(result.failureCount).toBe(1);
      expect(result.results[2]).toBeNull();
      expect(result.errors[2]).toBe('Test error');
    });

    it('should stop on error when stopOnError is true', async () => {
      const items = [1, 2, 3, 4, 5];
      const processed: number[] = [];

      const fn = async (x: number) => {
        processed.push(x);
        if (x === 2) throw new Error('Stop here');
        return x * 2;
      };

      await mapTool.map(items, fn, { stopOnError: true, concurrency: 1 });

      // Should process items up to and including the error
      expect(processed.length).toBeLessThan(items.length);
    });

    it('should retry failed items', async () => {
      let attempts = 0;
      const items = [1];

      const fn = async (x: number) => {
        attempts++;
        if (attempts < 3) throw new Error('Retry me');
        return x * 2;
      };

      const result = await mapTool.map(items, fn, { retries: 3 });

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
      expect(result.results[0]).toBe(2);
    });

    it('should handle timeout per item', async () => {
      const items = [1, 2];

      const fn = async (x: number) => {
        if (x === 2) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        return x * 2;
      };

      const result = await mapTool.map(items, fn, { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors[1]).toContain('timed out');
    });

    it('should emit progress events', async () => {
      const items = [1, 2, 3, 4, 5];
      const progressUpdates: MapProgress[] = [];

      const fn = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x * 2;
      };

      await mapTool.map(items, fn, {
        concurrency: 2,
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        },
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].completed).toBe(5);
      expect(progressUpdates[progressUpdates.length - 1].percentComplete).toBe(100);
    });

    it('should calculate estimated time remaining', async () => {
      const items = [1, 2, 3, 4, 5];
      let hasETA = false;

      const fn = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return x * 2;
      };

      await mapTool.map(items, fn, {
        concurrency: 2,
        onProgress: (progress) => {
          if (progress.estimatedTimeRemaining !== undefined) {
            hasETA = true;
          }
        },
      });

      expect(hasETA).toBe(true);
    });
  });

  describe('mapSequential() - Sequential Execution', () => {
    it('should process items one at a time', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const items = [1, 2, 3, 4];
      const fn = async (x: number) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrent--;
        return x * 2;
      };

      const result = await mapTool.mapSequential(items, fn);

      expect(maxConcurrent).toBe(1);
      expect(result.success).toBe(true);
      expect(result.results).toEqual([2, 4, 6, 8]);
    });

    it('should maintain order', async () => {
      const items = [5, 4, 3, 2, 1];
      const processed: number[] = [];

      const fn = async (x: number) => {
        processed.push(x);
        return x;
      };

      await mapTool.mapSequential(items, fn);

      expect(processed).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe('mapBatched() - Batched Execution', () => {
    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const fn = async (x: number) => x * 2;

      const result = await mapTool.mapBatched(items, fn, 3);

      expect(result.success).toBe(true);
      expect(result.results).toEqual([2, 4, 6, 8, 10, 12, 14]);
      expect(result.successCount).toBe(7);
    });

    it('should handle partial last batch', async () => {
      const items = [1, 2, 3, 4, 5];
      const fn = async (x: number) => x * 2;

      const result = await mapTool.mapBatched(items, fn, 2);

      expect(result.success).toBe(true);
      expect(result.results.length).toBe(5);
    });

    it('should stop batches on error if stopOnError is true', async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const fn = async (x: number) => {
        if (x === 4) throw new Error('Batch error');
        return x * 2;
      };

      const result = await mapTool.mapBatched(items, fn, 2, { stopOnError: true });

      expect(result.success).toBe(false);
      // Should have processed batches 1-2 (items 1-4)
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBeGreaterThan(0);
    });
  });

  describe('filter() - Filter Items', () => {
    it('should filter items based on predicate', async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const predicate = async (x: number) => x % 2 === 0;

      const result = await mapTool.filter(items, predicate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([2, 4, 6]);
      expect(result.metadata?.originalCount).toBe(6);
      expect(result.metadata?.filteredCount).toBe(3);
    });

    it('should handle async predicates', async () => {
      const items = ['apple', 'banana', 'cherry'];
      const predicate = async (x: string) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x.length > 5;
      };

      const result = await mapTool.filter(items, predicate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['banana', 'cherry']);
    });

    it('should respect concurrency option', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const items = [1, 2, 3, 4, 5];
      const predicate = async (x: number) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrent--;
        return x > 2;
      };

      await mapTool.filter(items, predicate, { concurrency: 2 });

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('reduce() - Reduce Items', () => {
    it('should reduce items to single value', async () => {
      const items = [1, 2, 3, 4, 5];
      const reducer = async (acc: number, x: number) => acc + x;

      const result = await mapTool.reduce(items, reducer, 0);

      expect(result.success).toBe(true);
      expect(result.data).toBe(15);
    });

    it('should handle complex reductions', async () => {
      const items = [
        { name: 'Alice', score: 10 },
        { name: 'Bob', score: 20 },
        { name: 'Charlie', score: 15 },
      ];

      const reducer = async (acc: { total: number; count: number }, item: typeof items[0]) => ({
        total: acc.total + item.score,
        count: acc.count + 1,
      });

      const result = await mapTool.reduce(items, reducer, { total: 0, count: 0 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ total: 45, count: 3 });
    });

    it('should handle errors in reduce', async () => {
      const items = [1, 2, 3, 4, 5];
      const reducer = async (acc: number, x: number) => {
        if (x === 3) throw new Error('Reduce error');
        return acc + x;
      };

      const result = await mapTool.reduce(items, reducer, 0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reduce error');
    });

    it('should respect timeout option', async () => {
      const items = [1, 2, 3];
      const reducer = async (acc: number, x: number) => {
        if (x === 2) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        return acc + x;
      };

      const result = await mapTool.reduce(items, reducer, 0, { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('execute() - Tool Execution Interface', () => {
    beforeEach(() => {
      // Register test functions
      mapTool.registerFunction('double', async (x: number) => x * 2);
      mapTool.registerFunction('isEven', async (x: number) => x % 2 === 0);
      mapTool.registerFunction('sum', async (acc: number, x: number) => acc + x);
    });

    it('should execute map action', async () => {
      const result = await mapTool.execute(
        {
          action: 'map',
          items: [1, 2, 3, 4, 5],
          fn: 'double',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as any).results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should execute mapSequential action', async () => {
      const result = await mapTool.execute(
        {
          action: 'mapSequential',
          items: [1, 2, 3],
          fn: 'double',
        },
        context
      );

      expect(result.success).toBe(true);
      expect((result.data as any).results).toEqual([2, 4, 6]);
    });

    it('should execute mapBatched action', async () => {
      const result = await mapTool.execute(
        {
          action: 'mapBatched',
          items: [1, 2, 3, 4, 5],
          fn: 'double',
          batchSize: 2,
        },
        context
      );

      expect(result.success).toBe(true);
      expect((result.data as any).results).toEqual([2, 4, 6, 8, 10]);
      expect(result.metadata?.batchSize).toBe(2);
      expect(result.metadata?.batchCount).toBe(3);
    });

    it('should execute filter action', async () => {
      const result = await mapTool.execute(
        {
          action: 'filter',
          items: [1, 2, 3, 4, 5, 6],
          predicate: 'isEven',
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([2, 4, 6]);
    });

    it('should execute reduce action', async () => {
      const result = await mapTool.execute(
        {
          action: 'reduce',
          items: [1, 2, 3, 4, 5],
          fn: 'sum',
          initial: 0,
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(15);
    });

    it('should parse JSON string items', async () => {
      const result = await mapTool.execute(
        {
          action: 'map',
          items: JSON.stringify([1, 2, 3]),
          fn: 'double',
        },
        context
      );

      expect(result.success).toBe(true);
      expect((result.data as any).results).toEqual([2, 4, 6]);
    });

    it('should parse JSON string options', async () => {
      const result = await mapTool.execute(
        {
          action: 'map',
          items: [1, 2, 3, 4, 5],
          fn: 'double',
          options: JSON.stringify({ concurrency: 2, timeout: 5000 }),
        },
        context
      );

      expect(result.success).toBe(true);
    });

    it('should return error for unregistered function', async () => {
      const result = await mapTool.execute(
        {
          action: 'map',
          items: [1, 2, 3],
          fn: 'nonexistent',
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error for invalid action', async () => {
      const result = await mapTool.execute(
        {
          action: 'invalid',
          items: [1, 2, 3],
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should validate batch size', async () => {
      const result = await mapTool.execute(
        {
          action: 'mapBatched',
          items: [1, 2, 3],
          fn: 'double',
          batchSize: 0,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Batch size');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', async () => {
      const items: number[] = [];
      const fn = async (x: number) => x * 2;

      const result = await mapTool.map(items, fn);

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
    });

    it('should handle single item', async () => {
      const items = [42];
      const fn = async (x: number) => x * 2;

      const result = await mapTool.map(items, fn);

      expect(result.success).toBe(true);
      expect(result.results).toEqual([84]);
    });

    it('should handle synchronous functions', async () => {
      const items = [1, 2, 3];
      const fn = (x: number) => x * 2; // Not async

      const result = await mapTool.map(items, fn as any);

      expect(result.success).toBe(true);
      expect(result.results).toEqual([2, 4, 6]);
    });

    it('should handle very large concurrency', async () => {
      const items = [1, 2, 3];
      const fn = async (x: number) => x * 2;

      const result = await mapTool.map(items, fn, { concurrency: 1000 });

      expect(result.success).toBe(true);
      expect(result.results).toEqual([2, 4, 6]);
    });

    it('should handle exponential backoff on retries', async () => {
      const delays: number[] = [];
      let attempts = 0;

      const items = [1];
      const fn = async (x: number) => {
        attempts++;
        if (attempts < 4) {
          const start = Date.now();
          await new Promise(resolve => setTimeout(resolve, 0));
          delays.push(Date.now() - start);
          throw new Error('Retry');
        }
        return x * 2;
      };

      await mapTool.map(items, fn, { retries: 3, retryDelay: 50 });

      expect(attempts).toBe(4);
    });
  });

  describe('Progress Tracking', () => {
    it('should track in-progress items', async () => {
      const items = [1, 2, 3, 4, 5];
      let maxInProgress = 0;

      const fn = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return x * 2;
      };

      await mapTool.map(items, fn, {
        concurrency: 3,
        onProgress: (progress) => {
          maxInProgress = Math.max(maxInProgress, progress.inProgress);
        },
      });

      expect(maxInProgress).toBeGreaterThan(0);
    });

    it('should emit progress via EventEmitter', async () => {
      const items = [1, 2, 3];
      const progressEvents: MapProgress[] = [];

      mapTool.on('progress', (progress: MapProgress) => {
        progressEvents.push({ ...progress });
      });

      const fn = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x * 2;
      };

      await mapTool.map(items, fn);

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1].completed).toBe(3);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle all items failing', async () => {
      const items = [1, 2, 3];
      const fn = async (x: number) => {
        throw new Error('Always fail');
      };

      const result = await mapTool.map(items, fn);

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(3);
      expect(result.errors.every(e => e !== null)).toBe(true);
    });

    it('should handle mixed success and failure', async () => {
      const items = [1, 2, 3, 4, 5];
      const fn = async (x: number) => {
        if (x === 2 || x === 4) throw new Error('Even error');
        return x * 2;
      };

      const result = await mapTool.map(items, fn);

      expect(result.success).toBe(false);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(2);
      expect(result.results[0]).toBe(2);
      expect(result.results[1]).toBeNull();
      expect(result.results[2]).toBe(6);
    });
  });

  describe('Performance', () => {
    it('should complete parallel execution faster than sequential', async () => {
      const items = [1, 2, 3, 4, 5];
      const delay = 100;

      const fn = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return x * 2;
      };

      const startParallel = Date.now();
      await mapTool.map(items, fn, { concurrency: 5 });
      const parallelTime = Date.now() - startParallel;

      const startSequential = Date.now();
      await mapTool.mapSequential(items, fn);
      const sequentialTime = Date.now() - startSequential;

      // Parallel should be significantly faster
      expect(parallelTime).toBeLessThan(sequentialTime * 0.5);
    });
  });
});
