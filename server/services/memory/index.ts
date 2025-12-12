/**
 * Memory System - Unified Interface
 * Provides a clean API for agent memory and reasoning pattern management
 * Adapted from claude-flow's memory system for GHL Agency AI
 */

import { AgentMemoryService, getAgentMemory } from "./agentMemory.service";
import { ReasoningBankService, getReasoningBank } from "./reasoningBank.service";
import type {
  MemoryEntry,
  ReasoningPattern,
  SessionContext,
  MemoryQueryOptions,
  SearchResult,
  MemoryStats
} from "./types";

/**
 * Unified Memory System Interface
 * Combines AgentMemory and ReasoningBank for easy integration
 */
export class MemorySystem {
  private agentMemory: AgentMemoryService;
  private reasoningBank: ReasoningBankService;

  constructor() {
    this.agentMemory = getAgentMemory();
    this.reasoningBank = getReasoningBank();
  }

  // ========================================
  // CONTEXT MANAGEMENT
  // ========================================

  /**
   * Store context for a session
   * @param sessionId - Unique session identifier
   * @param context - Context data to store
   * @param options - Additional options
   */
  async storeContext(
    sessionId: string,
    context: Record<string, any>,
    options?: {
      agentId?: string;
      userId?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    // Store as session context
    await this.agentMemory.storeSessionContext(sessionId, context, options);

    // Also store individual keys for quick access
    for (const [key, value] of Object.entries(context)) {
      await this.agentMemory.storeContext(sessionId, key, value, {
        ...options,
        metadata: {
          ...options?.metadata,
          type: 'context',
        },
      });
    }
  }

  /**
   * Retrieve context for a session
   * @param sessionId - Unique session identifier
   */
  async retrieveContext(sessionId: string): Promise<SessionContext | null> {
    return await this.agentMemory.retrieveSessionContext(sessionId);
  }

  /**
   * Retrieve a specific context value by key
   */
  async retrieveContextValue(sessionId: string, key: string): Promise<any> {
    const entry = await this.agentMemory.retrieveByKey(sessionId, key);
    return entry?.value;
  }

  /**
   * Update context for a session
   */
  async updateContext(
    sessionId: string,
    updates: Record<string, any>,
    options?: {
      agentId?: string;
      userId?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    // Get existing context
    const existing = await this.retrieveContext(sessionId);
    const mergedContext = {
      ...(existing?.context || {}),
      ...updates,
    };

    // Store updated context
    await this.storeContext(sessionId, mergedContext, options);
  }

  /**
   * Delete context for a session
   */
  async deleteContext(sessionId: string, key?: string): Promise<void> {
    await this.agentMemory.deleteContext(sessionId, key);
  }

  // ========================================
  // REASONING PATTERNS
  // ========================================

  /**
   * Store a reasoning pattern
   * @param pattern - The reasoning pattern or approach
   * @param result - The result or outcome
   * @param options - Additional metadata
   */
  async storeReasoning(
    pattern: string,
    result: any,
    options?: {
      context?: Record<string, any>;
      confidence?: number;
      domain?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    return await this.reasoningBank.storeReasoning(pattern, result, options);
  }

  /**
   * Find similar reasoning patterns
   * @param pattern - Query pattern to find similar reasoning
   * @param options - Search options
   */
  async findSimilarReasoning(
    pattern: string,
    options?: {
      domain?: string;
      minConfidence?: number;
      limit?: number;
      tags?: string[];
    }
  ): Promise<SearchResult<ReasoningPattern>[]> {
    return await this.reasoningBank.findSimilarReasoning(pattern, options);
  }

  /**
   * Update reasoning pattern usage
   */
  async updateReasoningUsage(patternId: string, success: boolean): Promise<void> {
    await this.reasoningBank.updateReasoningUsage(patternId, success);
  }

  /**
   * Get top performing reasoning patterns
   */
  async getTopReasoningPatterns(limit: number = 10): Promise<ReasoningPattern[]> {
    return await this.reasoningBank.getTopPatterns(limit);
  }

  // ========================================
  // SEARCH & QUERY
  // ========================================

  /**
   * Search memory entries
   */
  async searchMemory(query: MemoryQueryOptions): Promise<MemoryEntry[]> {
    return await this.agentMemory.searchContext(query);
  }

  /**
   * Get memory entries for a session
   */
  async getSessionMemories(
    sessionId: string,
    options?: MemoryQueryOptions
  ): Promise<MemoryEntry[]> {
    return await this.agentMemory.retrieveContext(sessionId, options);
  }

  // ========================================
  // STATISTICS & MAINTENANCE
  // ========================================

  /**
   * Get memory system statistics
   */
  async getStats(sessionId?: string, domain?: string): Promise<MemoryStats> {
    const [memoryStats, reasoningStats] = await Promise.all([
      this.agentMemory.getStats(sessionId),
      this.reasoningBank.getStats(domain),
    ]);

    return {
      totalEntries: memoryStats.totalEntries,
      totalReasoningPatterns: reasoningStats.totalReasoningPatterns,
      avgConfidence: reasoningStats.avgConfidence,
      hitRate: memoryStats.hitRate,
      storageSize: memoryStats.storageSize,
      domains: reasoningStats.domains,
    };
  }

  /**
   * Clean up expired and low-performing data
   */
  async cleanup(options?: {
    cleanupExpired?: boolean;
    cleanupLowPerformance?: boolean;
    minSuccessRate?: number;
    minUsageCount?: number;
  }): Promise<{
    expiredCleaned: number;
    lowPerformanceCleaned: number;
  }> {
    const opts = {
      cleanupExpired: true,
      cleanupLowPerformance: true,
      minSuccessRate: 0.3,
      minUsageCount: 5,
      ...options,
    };

    let expiredCleaned = 0;
    let lowPerformanceCleaned = 0;

    if (opts.cleanupExpired) {
      expiredCleaned = await this.agentMemory.cleanupExpired();
    }

    if (opts.cleanupLowPerformance) {
      lowPerformanceCleaned = await this.reasoningBank.cleanupLowPerformance(
        opts.minSuccessRate,
        opts.minUsageCount
      );
    }

    return {
      expiredCleaned,
      lowPerformanceCleaned,
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.agentMemory.clearCache();
    this.reasoningBank.clearCache();
  }
}

// ========================================
// EXPORTS
// ========================================

// Export singleton instance
let memorySystemInstance: MemorySystem | null = null;

export function getMemorySystem(): MemorySystem {
  if (!memorySystemInstance) {
    memorySystemInstance = new MemorySystem();
  }
  return memorySystemInstance;
}

// Re-export services for direct access if needed
export { AgentMemoryService, getAgentMemory } from "./agentMemory.service";
export { ReasoningBankService, getReasoningBank } from "./reasoningBank.service";

// Re-export types
export type {
  MemoryEntry,
  ReasoningPattern,
  SessionContext,
  MemoryQueryOptions,
  VectorSearchOptions,
  SearchResult,
  MemoryStats,
} from "./types";

// Re-export schema for migrations
export * from "./schema";
