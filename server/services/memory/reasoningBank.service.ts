/**
 * Reasoning Bank Service
 * Stores and retrieves reasoning patterns for agent learning
 * Adapted from claude-flow's ReasoningBank system
 */

import { getDb } from "../../db";
import { eq, and, desc, sql, gte, type SQL } from "drizzle-orm";
import { reasoningPatterns } from "./schema";
import type {
  ReasoningPattern,
  SearchResult,
  VectorSearchOptions,
  MemoryStats
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { getTenantService } from "../tenantIsolation.service";

/**
 * Reasoning Bank Service - Manages reasoning patterns and learning
 * Now with multi-tenant isolation support
 */
export class ReasoningBankService {
  private cache: Map<string, ReasoningPattern>;
  private cacheMaxSize: number;
  private tenantService = getTenantService();

  constructor(options: { cacheMaxSize?: number } = {}) {
    this.cache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || 500;
  }

  /**
   * Get tenant-scoped domain
   * Ensures reasoning patterns are isolated per tenant
   */
  private getTenantDomain(domain?: string): string {
    if (!this.tenantService.hasTenantContext()) {
      return domain || 'default';
    }

    const tenantId = this.tenantService.getTenantId();
    const baseDomain = domain || 'general';
    return `tenant:${tenantId}:${baseDomain}`;
  }

  /**
   * Add tenant filter to query conditions
   */
  private addTenantDomainFilter(conditions: any[], domain?: string): void {
    if (!this.tenantService.hasTenantContext()) {
      // No tenant context - filter by original domain if provided
      if (domain) {
        conditions.push(eq(reasoningPatterns.domain, domain));
      }
      return;
    }

    // With tenant context - filter by tenant-scoped domain
    const tenantDomain = this.getTenantDomain(domain);
    conditions.push(eq(reasoningPatterns.domain, tenantDomain));
  }

  /**
   * Store a reasoning pattern
   * Now with tenant isolation - automatically scopes to current tenant
   */
  async storeReasoning(
    pattern: string,
    result: any,
    options: {
      context?: Record<string, any>;
      confidence?: number;
      domain?: string;
      tags?: string[];
      metadata?: Record<string, any>;
      embedding?: number[];
    } = {}
  ): Promise<string> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Apply tenant isolation to domain
    const tenantDomain = this.getTenantDomain(options.domain);

    // Add tenant metadata
    const tenantMetadata = this.tenantService.hasTenantContext()
      ? {
          tenantId: this.tenantService.getTenantId(),
          userId: this.tenantService.getUserId(),
          namespace: this.tenantService.getTenantNamespace('reasoning-bank'),
        }
      : {};

    const patternId = uuidv4();
    const now = new Date();

    const reasoningPattern: ReasoningPattern = {
      id: patternId,
      pattern,
      result,
      context: options.context,
      confidence: options.confidence || 0.8,
      usageCount: 0,
      successRate: 1.0,
      domain: tenantDomain,
      tags: options.tags,
      metadata: {
        ...tenantMetadata,
        ...options.metadata,
      },
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(reasoningPatterns).values({
      patternId,
      pattern,
      result: result as any,
      context: (options.context || null) as any,
      confidence: options.confidence || 0.8,
      usageCount: 0,
      successRate: 1.0,
      domain: tenantDomain,
      tags: (options.tags || []) as any,
      metadata: reasoningPattern.metadata as any,
      embedding: options.embedding ? (options.embedding as any) : null,
      createdAt: now,
      updatedAt: now,
    });

    // Add to cache
    this.cache.set(patternId, reasoningPattern);

    // Audit log
    this.tenantService.auditLog('reasoning.store', {
      patternId,
      domain: tenantDomain,
      confidence: options.confidence || 0.8,
    });

    return patternId;
  }

  /**
   * Find similar reasoning patterns
   * Now with tenant isolation - only searches within tenant's patterns
   */
  async findSimilarReasoning(
    query: string,
    options: {
      domain?: string;
      minConfidence?: number;
      limit?: number;
      tags?: string[];
    } = {}
  ): Promise<SearchResult<ReasoningPattern>[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const conditions: SQL<unknown>[] = [];

    // Add tenant domain filter
    this.addTenantDomainFilter(conditions, options.domain);

    if (options.minConfidence !== undefined) {
      conditions.push(gte(reasoningPatterns.confidence, options.minConfidence));
    }

    // Simple text matching for now (can be enhanced with vector search later)
    conditions.push(sql`${reasoningPatterns.pattern} ILIKE ${`%${query}%`}`);

    const dbQuery = db
      .select()
      .from(reasoningPatterns)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reasoningPatterns.usageCount), desc(reasoningPatterns.confidence))
      .limit(options.limit || 10);

    const results = await dbQuery;

    return results.map(row => ({
      id: row.patternId,
      data: this.rowToReasoningPattern(row),
      similarity: this.calculateSimilarity(query, row.pattern),
      metadata: row.metadata as Record<string, any>,
    }));
  }

  /**
   * Retrieve a reasoning pattern by ID
   */
  async getReasoningPattern(patternId: string): Promise<ReasoningPattern | null> {
    // Check cache first
    const cached = this.cache.get(patternId);
    if (cached) {
      return cached;
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const results = await db
      .select()
      .from(reasoningPatterns)
      .where(eq(reasoningPatterns.patternId, patternId))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const pattern = this.rowToReasoningPattern(results[0]);
    this.cache.set(patternId, pattern);
    return pattern;
  }

  /**
   * Update reasoning pattern usage and success
   */
  async updateReasoningUsage(
    patternId: string,
    success: boolean
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Get current pattern
    const current = await this.getReasoningPattern(patternId);
    if (!current) {
      throw new Error(`Reasoning pattern not found: ${patternId}`);
    }

    // Calculate new success rate
    const newUsageCount = current.usageCount + 1;
    const successCount = Math.round(current.successRate * current.usageCount) + (success ? 1 : 0);
    const newSuccessRate = successCount / newUsageCount;

    // Update confidence based on success rate
    const newConfidence = Math.min(1.0, Math.max(0.1, newSuccessRate));

    await db
      .update(reasoningPatterns)
      .set({
        usageCount: newUsageCount,
        successRate: newSuccessRate,
        confidence: newConfidence,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reasoningPatterns.patternId, patternId));

    // Update cache
    this.cache.delete(patternId);
  }

  /**
   * Get reasoning patterns by domain
   */
  async getReasoningByDomain(
    domain: string,
    options: {
      minConfidence?: number;
      limit?: number;
    } = {}
  ): Promise<ReasoningPattern[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const conditions = [eq(reasoningPatterns.domain, domain)];

    if (options.minConfidence !== undefined) {
      conditions.push(gte(reasoningPatterns.confidence, options.minConfidence));
    }

    const dbQuery = db
      .select()
      .from(reasoningPatterns)
      .where(and(...conditions))
      .orderBy(desc(reasoningPatterns.usageCount), desc(reasoningPatterns.confidence))
      .limit(options.limit || 10);

    const results = await dbQuery;
    return results.map(row => this.rowToReasoningPattern(row));
  }

  /**
   * Get top performing reasoning patterns
   */
  async getTopPatterns(limit: number = 10): Promise<ReasoningPattern[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const results = await db
      .select()
      .from(reasoningPatterns)
      .orderBy(
        desc(reasoningPatterns.successRate),
        desc(reasoningPatterns.usageCount),
        desc(reasoningPatterns.confidence)
      )
      .limit(limit);

    return results.map(row => this.rowToReasoningPattern(row));
  }

  /**
   * Delete reasoning pattern
   */
  async deleteReasoningPattern(patternId: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    await db
      .delete(reasoningPatterns)
      .where(eq(reasoningPatterns.patternId, patternId));

    this.cache.delete(patternId);
  }

  /**
   * Get reasoning bank statistics
   */
  async getStats(domain?: string): Promise<MemoryStats> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const conditions = domain ? [eq(reasoningPatterns.domain, domain)] : [];

    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reasoningPatterns)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const avgConfidenceResult = await db
      .select({ avg: sql<number>`avg(${reasoningPatterns.confidence})` })
      .from(reasoningPatterns)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const domainsResult = await db
      .select({ domain: reasoningPatterns.domain })
      .from(reasoningPatterns)
      .groupBy(reasoningPatterns.domain);

    return {
      totalEntries: 0, // Handled by AgentMemory service
      totalReasoningPatterns: totalResult[0]?.count || 0,
      avgConfidence: avgConfidenceResult[0]?.avg || 0,
      domains: domainsResult
        .map(r => r.domain)
        .filter((d): d is string => d !== null),
    };
  }

  /**
   * Clean up low-performing patterns
   */
  async cleanupLowPerformance(
    minSuccessRate: number = 0.3,
    minUsageCount: number = 5
  ): Promise<number> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .delete(reasoningPatterns)
      .where(
        and(
          sql`${reasoningPatterns.usageCount} >= ${minUsageCount}`,
          sql`${reasoningPatterns.successRate} < ${minSuccessRate}`
        )
      );

    // Clear cache
    this.cache.clear();

    return result.rowCount || 0;
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  private calculateSimilarity(query: string, pattern: string): number {
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const patternWords = new Set(pattern.toLowerCase().split(/\s+/));

    let intersection = 0;
    for (const word of Array.from(queryWords)) {
      if (patternWords.has(word)) {
        intersection++;
      }
    }

    const union = queryWords.size + patternWords.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Convert database row to ReasoningPattern
   */
  private rowToReasoningPattern(row: any): ReasoningPattern {
    return {
      id: row.patternId,
      pattern: row.pattern,
      result: row.result,
      context: row.context || undefined,
      confidence: row.confidence,
      usageCount: row.usageCount,
      successRate: row.successRate,
      domain: row.domain || undefined,
      tags: row.tags || [],
      metadata: row.metadata || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastUsedAt: row.lastUsedAt || undefined,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
let reasoningBankInstance: ReasoningBankService | null = null;

export function getReasoningBank(): ReasoningBankService {
  if (!reasoningBankInstance) {
    reasoningBankInstance = new ReasoningBankService();
  }
  return reasoningBankInstance;
}
