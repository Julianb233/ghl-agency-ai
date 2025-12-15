/**
 * Agent Memory Service
 * Provides context storage and retrieval for multi-agent coordination
 * Adapted from claude-flow's AgentDB system
 */

import { getDb } from "../../db";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { memoryEntries, sessionContexts } from "./schema";
import type {
  MemoryEntry,
  MemoryQueryOptions,
  VectorSearchOptions,
  SearchResult,
  SessionContext,
  MemoryStats
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { getTenantService } from "../tenantIsolation.service";

/**
 * Agent Memory Service - Manages agent context and session data
 * Now with multi-tenant isolation support
 */
export class AgentMemoryService {
  private cache: Map<string, MemoryEntry>;
  private cacheMaxSize: number;
  private cacheHits: number;
  private cacheMisses: number;
  private tenantService = getTenantService();

  constructor(options: { cacheMaxSize?: number } = {}) {
    this.cache = new Map();
    this.cacheMaxSize = options.cacheMaxSize || 1000;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get tenant-scoped session ID
   * Ensures sessions are isolated per tenant
   */
  private getTenantSessionId(sessionId: string): string {
    if (!this.tenantService.hasTenantContext()) {
      // No tenant context - return as-is (backward compatibility)
      return sessionId;
    }
    return this.tenantService.getTenantSessionId(sessionId);
  }

  /**
   * Get tenant-scoped memory key
   * Ensures memory keys are isolated per tenant
   */
  private getTenantMemoryKey(key: string): string {
    if (!this.tenantService.hasTenantContext()) {
      // No tenant context - return as-is (backward compatibility)
      return key;
    }
    return this.tenantService.getTenantMemoryKey(key);
  }

  /**
   * Add tenant filter to query conditions
   * Ensures queries are scoped to current tenant's userId
   */
  private addTenantFilter(conditions: any[]): any[] {
    if (!this.tenantService.hasTenantContext()) {
      // No tenant context - return conditions as-is
      return conditions;
    }

    const userId = this.tenantService.getUserId();
    if (userId !== undefined) {
      conditions.push(eq(memoryEntries.userId, userId));
    }

    return conditions;
  }

  /**
   * Validate tenant ownership of memory entry
   */
  private validateTenantOwnership(entry: MemoryEntry): void {
    if (!this.tenantService.hasTenantContext()) {
      return; // No tenant context - skip validation
    }

    if (!this.tenantService.validateTenantOwnership(entry.userId)) {
      throw new Error("Access denied: Memory entry does not belong to current tenant");
    }
  }

  /**
   * Store context for a session
   * Now with tenant isolation - automatically scopes to current tenant
   */
  async storeContext(
    sessionId: string,
    key: string,
    value: any,
    options: {
      agentId?: string;
      userId?: number;
      metadata?: Record<string, any>;
      ttl?: number; // Time to live in seconds
      embedding?: number[];
    } = {}
  ): Promise<string> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Apply tenant isolation
    const tenantSessionId = this.getTenantSessionId(sessionId);
    const tenantKey = this.getTenantMemoryKey(key);

    // Auto-inject userId from tenant context if not provided
    const tenantUserId = this.tenantService.getUserId();
    const userId = options.userId ?? tenantUserId;

    // Add tenant metadata
    const tenantMetadata = this.tenantService.hasTenantContext()
      ? {
          tenantId: this.tenantService.getTenantId(),
          namespace: this.tenantService.getTenantNamespace('agent-memory'),
        }
      : {};

    const entryId = uuidv4();
    const now = new Date();
    const expiresAt = options.ttl ? new Date(now.getTime() + options.ttl * 1000) : undefined;

    const entry: MemoryEntry = {
      id: entryId,
      sessionId: tenantSessionId,
      agentId: options.agentId,
      userId,
      key: tenantKey,
      value,
      embedding: options.embedding,
      metadata: {
        type: 'context',
        ...tenantMetadata,
        ...options.metadata,
      },
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    await db.insert(memoryEntries).values({
      entryId,
      sessionId: tenantSessionId,
      agentId: options.agentId || null,
      userId: userId || null,
      key: tenantKey,
      value: value as any,
      embedding: options.embedding ? (options.embedding as any) : null,
      metadata: entry.metadata as any,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    // Add to cache with tenant-scoped key
    this.addToCache(entry);

    // Audit log
    this.tenantService.auditLog('memory.store', {
      sessionId: tenantSessionId,
      key: tenantKey,
      entryId,
    });

    return entryId;
  }

  /**
   * Retrieve context by session ID
   * Now with tenant isolation - automatically filters by tenant
   */
  async retrieveContext(sessionId: string, options: MemoryQueryOptions = {}): Promise<MemoryEntry[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Apply tenant scoping
    const tenantSessionId = this.getTenantSessionId(sessionId);

    const conditions = [eq(memoryEntries.sessionId, tenantSessionId)];

    if (options.agentId) {
      conditions.push(eq(memoryEntries.agentId, options.agentId));
    }

    if (options.userId) {
      conditions.push(eq(memoryEntries.userId, options.userId));
    }

    // Add tenant filter to ensure data isolation
    this.addTenantFilter(conditions);

    if (!options.includeExpired) {
      conditions.push(
        or(
          sql`${memoryEntries.expiresAt} IS NULL`,
          sql`${memoryEntries.expiresAt} > NOW()`
        )!
      );
    }

    const results = await db
      .select()
      .from(memoryEntries)
      .where(and(...conditions))
      .orderBy(desc(memoryEntries.createdAt))
      .limit(options.limit || 1000)
      .offset(options.offset || 0);

    const entries = results.map(row => this.rowToMemoryEntry(row));

    // Validate tenant ownership of retrieved entries
    entries.forEach(entry => this.validateTenantOwnership(entry));

    return entries;
  }

  /**
   * Retrieve a specific context entry by key
   * Now with tenant isolation
   */
  async retrieveByKey(sessionId: string, key: string): Promise<MemoryEntry | null> {
    // Apply tenant scoping
    const tenantSessionId = this.getTenantSessionId(sessionId);
    const tenantKey = this.getTenantMemoryKey(key);

    // Check cache first with tenant-scoped key
    const cacheKey = `${tenantSessionId}:${tenantKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      this.validateTenantOwnership(cached);
      return cached;
    }
    this.cacheMisses++;

    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const conditions = [
      eq(memoryEntries.sessionId, tenantSessionId),
      eq(memoryEntries.key, tenantKey),
      or(
        sql`${memoryEntries.expiresAt} IS NULL`,
        sql`${memoryEntries.expiresAt} > NOW()`
      )!
    ];

    // Add tenant filter
    this.addTenantFilter(conditions);

    const results = await db
      .select()
      .from(memoryEntries)
      .where(and(...conditions))
      .orderBy(desc(memoryEntries.createdAt))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const entry = this.rowToMemoryEntry(results[0]);
    this.validateTenantOwnership(entry);
    this.addToCache(entry);
    return entry;
  }

  /**
   * Update context entry
   */
  async updateContext(
    sessionId: string,
    key: string,
    value: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const updates: any = {
      value,
      updatedAt: new Date(),
    };

    if (metadata) {
      updates.metadata = metadata;
    }

    await db
      .update(memoryEntries)
      .set(updates)
      .where(
        and(
          eq(memoryEntries.sessionId, sessionId),
          eq(memoryEntries.key, key)
        )
      );

    // Invalidate cache
    const cacheKey = `${sessionId}:${key}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Delete context entries for a session
   */
  async deleteContext(sessionId: string, key?: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const conditions = [eq(memoryEntries.sessionId, sessionId)];

    if (key) {
      conditions.push(eq(memoryEntries.key, key));
      const cacheKey = `${sessionId}:${key}`;
      this.cache.delete(cacheKey);
    } else {
      // Clear all cache entries for this session
      const keysToDelete = Array.from(this.cache.keys()).filter(k => k.startsWith(`${sessionId}:`));
      for (const k of keysToDelete) {
        this.cache.delete(k);
      }
    }

    await db
      .delete(memoryEntries)
      .where(and(...conditions));
  }

  /**
   * Store session-level context
   */
  async storeSessionContext(
    sessionId: string,
    context: Record<string, any>,
    options: {
      userId?: number;
      agentId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const now = new Date();

    await db
      .insert(sessionContexts)
      .values({
        sessionId,
        userId: options.userId || null,
        agentId: options.agentId || null,
        context: context as any,
        metadata: (options.metadata || {}) as any,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sessionContexts.sessionId,
        set: {
          context: context as any,
          metadata: (options.metadata || {}) as any,
          updatedAt: now,
        },
      });
  }

  /**
   * Retrieve session-level context
   */
  async retrieveSessionContext(sessionId: string): Promise<SessionContext | null> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const results = await db
      .select()
      .from(sessionContexts)
      .where(eq(sessionContexts.sessionId, sessionId))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const row = results[0];
    return {
      sessionId: row.sessionId,
      userId: row.userId || undefined,
      agentId: row.agentId || undefined,
      context: row.context as Record<string, any>,
      metadata: row.metadata as Record<string, any>,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Search context entries with filters
   * Now with tenant isolation
   */
  async searchContext(query: MemoryQueryOptions): Promise<MemoryEntry[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const conditions = [];

    if (query.sessionId) {
      const tenantSessionId = this.getTenantSessionId(query.sessionId);
      conditions.push(eq(memoryEntries.sessionId, tenantSessionId));
    }

    if (query.agentId) {
      conditions.push(eq(memoryEntries.agentId, query.agentId));
    }

    if (query.userId) {
      conditions.push(eq(memoryEntries.userId, query.userId));
    }

    // Add tenant filter to ensure data isolation
    this.addTenantFilter(conditions);

    if (query.namespace) {
      conditions.push(sql`${memoryEntries.metadata}->>'namespace' = ${query.namespace}`);
    }

    if (query.domain) {
      conditions.push(sql`${memoryEntries.metadata}->>'domain' = ${query.domain}`);
    }

    if (query.type) {
      conditions.push(sql`${memoryEntries.metadata}->>'type' = ${query.type}`);
    }

    if (!query.includeExpired) {
      conditions.push(
        or(
          sql`${memoryEntries.expiresAt} IS NULL`,
          sql`${memoryEntries.expiresAt} > NOW()`
        )!
      );
    }

    const results = await db
      .select()
      .from(memoryEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(memoryEntries.createdAt))
      .limit(query.limit || 1000)
      .offset(query.offset || 0);

    const entries = results.map(row => this.rowToMemoryEntry(row));

    // Validate tenant ownership
    entries.forEach(entry => this.validateTenantOwnership(entry));

    return entries;
  }

  /**
   * Get memory statistics
   */
  async getStats(sessionId?: string): Promise<MemoryStats> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const conditions = sessionId ? [eq(memoryEntries.sessionId, sessionId)] : [];

    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(memoryEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult[0]?.count || 0;

    const hitRate = this.cacheHits + this.cacheMisses > 0
      ? this.cacheHits / (this.cacheHits + this.cacheMisses)
      : 0;

    return {
      totalEntries: total,
      totalReasoningPatterns: 0, // Handled by ReasoningBank service
      avgConfidence: 0,
      hitRate,
      storageSize: this.cache.size,
    };
  }

  /**
   * Clean up expired entries
   */
  async cleanupExpired(): Promise<number> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const result = await db
      .delete(memoryEntries)
      .where(
        and(
          sql`${memoryEntries.expiresAt} IS NOT NULL`,
          sql`${memoryEntries.expiresAt} <= NOW()`
        )
      );

    // Clear expired entries from cache
    const now = Date.now();
    const entriesToDelete = Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.expiresAt && entry.expiresAt.getTime() <= now)
      .map(([key]) => key);
    for (const key of entriesToDelete) {
      this.cache.delete(key);
    }

    return result.rowCount || 0;
  }

  /**
   * Convert database row to MemoryEntry
   */
  private rowToMemoryEntry(row: any): MemoryEntry {
    return {
      id: row.entryId,
      sessionId: row.sessionId,
      agentId: row.agentId || undefined,
      userId: row.userId || undefined,
      key: row.key,
      value: row.value,
      embedding: row.embedding || undefined,
      metadata: row.metadata || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt || undefined,
    };
  }

  /**
   * Add entry to cache with LRU eviction
   */
  private addToCache(entry: MemoryEntry): void {
    const cacheKey = `${entry.sessionId}:${entry.key}`;

    // LRU eviction
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(cacheKey, entry);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Export singleton instance
let agentMemoryInstance: AgentMemoryService | null = null;

export function getAgentMemory(): AgentMemoryService {
  if (!agentMemoryInstance) {
    agentMemoryInstance = new AgentMemoryService();
  }
  return agentMemoryInstance;
}
