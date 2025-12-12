/**
 * Memory System Tests
 * Basic tests to validate memory system functionality
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { getMemorySystem } from './index';
import { v4 as uuidv4 } from 'uuid';

describe('Memory System', () => {
  let memory: ReturnType<typeof getMemorySystem>;
  let sessionId: string;

  beforeAll(async () => {
    memory = getMemorySystem();
    sessionId = `test-session-${uuidv4()}`;
  });

  afterAll(async () => {
    // Cleanup test data
    await memory.deleteContext(sessionId);
  });

  describe('Context Management', () => {
    it('should store and retrieve context', async () => {
      await memory.storeContext(sessionId, {
        testKey: 'testValue',
        userId: 999,
        startedAt: new Date().toISOString(),
      });

      const context = await memory.retrieveContext(sessionId);

      expect(context).toBeDefined();
      expect(context?.context.testKey).toBe('testValue');
      expect(context?.context.userId).toBe(999);
    });

    it('should retrieve specific context value by key', async () => {
      await memory.storeContext(sessionId, {
        specificKey: 'specificValue',
      });

      const value = await memory.retrieveContextValue(sessionId, 'specificKey');

      expect(value).toBe('specificValue');
    });

    it('should update existing context', async () => {
      await memory.storeContext(sessionId, {
        updateTest: 'initial',
      });

      await memory.updateContext(sessionId, {
        updateTest: 'updated',
        newField: 'added',
      });

      const context = await memory.retrieveContext(sessionId);

      expect(context?.context.updateTest).toBe('updated');
      expect(context?.context.newField).toBe('added');
    });

    it('should delete specific context key', async () => {
      await memory.storeContext(sessionId, {
        deleteMe: 'toBeDeleted',
      });

      await memory.deleteContext(sessionId, 'deleteMe');

      const value = await memory.retrieveContextValue(sessionId, 'deleteMe');

      expect(value).toBeNull();
    });
  });

  describe('Reasoning Patterns', () => {
    it('should store reasoning pattern', async () => {
      const patternId = await memory.storeReasoning(
        'Test pattern for unit testing',
        { success: true, approach: 'test-driven' },
        {
          confidence: 0.9,
          domain: 'testing',
          tags: ['unit-test', 'pattern'],
        }
      );

      expect(patternId).toBeDefined();
      expect(typeof patternId).toBe('string');
    });

    it('should find similar reasoning patterns', async () => {
      // Store a few patterns
      await memory.storeReasoning(
        'For testing, always write tests first',
        { approach: 'tdd' },
        { domain: 'testing', confidence: 0.9 }
      );

      await memory.storeReasoning(
        'Testing should cover edge cases',
        { approach: 'comprehensive' },
        { domain: 'testing', confidence: 0.85 }
      );

      // Search for similar patterns
      const similar = await memory.findSimilarReasoning(
        'testing best practices',
        {
          domain: 'testing',
          limit: 10,
          minConfidence: 0.7,
        }
      );

      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0]).toHaveProperty('id');
      expect(similar[0]).toHaveProperty('data');
      expect(similar[0]).toHaveProperty('similarity');
    });

    it('should update reasoning usage', async () => {
      const patternId = await memory.storeReasoning(
        'Usage tracking test pattern',
        { result: 'success' },
        { confidence: 0.8 }
      );

      // Update usage (success)
      await memory.updateReasoningUsage(patternId, true);

      // Update usage (failure)
      await memory.updateReasoningUsage(patternId, false);

      // Pattern should have usage_count = 2 now
      // (Verify by checking in database or implementing a get method)
    });

    it('should get top reasoning patterns', async () => {
      const topPatterns = await memory.getTopReasoningPatterns(5);

      expect(Array.isArray(topPatterns)).toBe(true);
      // May be empty if no patterns with usage yet
    });
  });

  describe('Search and Query', () => {
    it('should search memory entries by session', async () => {
      const testSessionId = `search-test-${uuidv4()}`;

      await memory.storeContext(testSessionId, {
        searchTest: 'findMe',
      });

      const results = await memory.searchMemory({
        sessionId: testSessionId,
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].sessionId).toBe(testSessionId);

      // Cleanup
      await memory.deleteContext(testSessionId);
    });

    it('should get session memories with options', async () => {
      const memories = await memory.getSessionMemories(sessionId, {
        limit: 5,
      });

      expect(Array.isArray(memories)).toBe(true);
    });
  });

  describe('Statistics and Maintenance', () => {
    it('should get memory stats', async () => {
      const stats = await memory.getStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalReasoningPatterns');
      expect(stats).toHaveProperty('avgConfidence');
      expect(typeof stats.totalEntries).toBe('number');
    });

    it('should get session-specific stats', async () => {
      const stats = await memory.getStats(sessionId);

      expect(stats).toHaveProperty('totalEntries');
      expect(typeof stats.totalEntries).toBe('number');
    });

    it('should clear caches without errors', () => {
      expect(() => {
        memory.clearCaches();
      }).not.toThrow();
    });

    it('should cleanup expired and low-performance data', async () => {
      const result = await memory.cleanup({
        cleanupExpired: true,
        cleanupLowPerformance: true,
      });

      expect(result).toHaveProperty('expiredCleaned');
      expect(result).toHaveProperty('lowPerformanceCleaned');
      expect(typeof result.expiredCleaned).toBe('number');
      expect(typeof result.lowPerformanceCleaned).toBe('number');
    });
  });

  describe('TTL and Expiration', () => {
    it('should handle TTL-based expiration', async () => {
      const ttlSessionId = `ttl-test-${uuidv4()}`;

      // Store with 1 second TTL
      await memory.storeContext(
        ttlSessionId,
        { expiringData: 'will expire soon' },
        { ttl: 1 }
      );

      // Should be retrievable immediately
      const immediate = await memory.retrieveContextValue(
        ttlSessionId,
        'expiringData'
      );
      expect(immediate).toBe('will expire soon');

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should be expired now (after cleanup)
      await memory.cleanup({ cleanupExpired: true });

      const afterExpiry = await memory.retrieveContextValue(
        ttlSessionId,
        'expiringData'
      );
      expect(afterExpiry).toBeNull();
    }, 10000); // Increase timeout for this test
  });

  describe('Multi-Agent Coordination', () => {
    it('should support multi-agent shared context', async () => {
      const sharedSessionId = `shared-${uuidv4()}`;

      // Agent 1 stores data
      await memory.storeContext(
        sharedSessionId,
        { agent1Data: 'from agent 1' },
        { agentId: 'agent-1' }
      );

      // Agent 2 stores data
      await memory.storeContext(
        sharedSessionId,
        { agent2Data: 'from agent 2' },
        { agentId: 'agent-2' }
      );

      // Both can access shared context
      const context = await memory.retrieveContext(sharedSessionId);

      expect(context?.context.agent1Data).toBe('from agent 1');
      expect(context?.context.agent2Data).toBe('from agent 2');

      // Cleanup
      await memory.deleteContext(sharedSessionId);
    });
  });
});

describe('Integration Tests', () => {
  it('should work with realistic agent workflow', async () => {
    const memory = getMemorySystem();
    const sessionId = `workflow-${uuidv4()}`;
    const userId = 999;

    // Step 1: Initialize task
    await memory.storeContext(sessionId, {
      userId,
      taskDescription: 'Create marketing campaign',
      startedAt: new Date().toISOString(),
    });

    // Step 2: Store reasoning pattern
    const patternId = await memory.storeReasoning(
      'For marketing campaigns, research target audience first',
      { success: true, approach: 'research-first' },
      {
        domain: 'marketing',
        confidence: 0.9,
        tags: ['best-practice'],
      }
    );

    // Step 3: Find similar patterns
    const similar = await memory.findSimilarReasoning(
      'marketing campaign strategy',
      {
        domain: 'marketing',
        limit: 5,
      }
    );

    expect(similar.length).toBeGreaterThan(0);

    // Step 4: Update context with progress
    await memory.updateContext(sessionId, {
      phase: 'research',
      similarApproaches: similar.length,
    });

    // Step 5: Complete and update pattern usage
    await memory.updateReasoningUsage(patternId, true);

    await memory.updateContext(sessionId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    // Verify final state
    const finalContext = await memory.retrieveContext(sessionId);
    expect(finalContext?.context.status).toBe('completed');
    expect(finalContext?.context.phase).toBe('research');

    // Cleanup
    await memory.deleteContext(sessionId);
  });
});
