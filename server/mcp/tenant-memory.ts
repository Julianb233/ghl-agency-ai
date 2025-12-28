/**
 * Tenant-Specific Memory Namespace Service
 * Provides isolated memory storage per tenant with resource quotas
 *
 * Features:
 * - Tenant-scoped memory namespaces
 * - Resource quotas (storage, operations, rate limits)
 * - Usage tracking and analytics
 * - Automatic cleanup and eviction
 */

import { getTenantService, type TenantContext } from '../services/tenantIsolation.service';
import { EventEmitter } from 'events';

/**
 * Memory Entry
 * Represents a single key-value pair in memory
 */
export interface MemoryEntry {
  key: string;
  value: any;
  namespace: string;
  tenantId: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  size: number; // bytes
  metadata?: Record<string, unknown>;
}

/**
 * Tenant Quota Configuration
 * Defines resource limits per tenant
 */
export interface TenantQuota {
  // Storage limits
  maxStorageBytes: number; // Max total storage per tenant
  maxEntriesPerNamespace: number; // Max entries per namespace
  maxEntrySize: number; // Max size of single entry

  // Operation limits (rate limiting)
  maxOperationsPerMinute: number;
  maxOperationsPerHour: number;
  maxOperationsPerDay: number;

  // Namespace limits
  maxNamespaces: number;

  // Time-to-live defaults
  defaultTTL: number; // seconds
  maxTTL: number; // seconds
}

/**
 * Default quota for standard tier
 */
const DEFAULT_QUOTA: TenantQuota = {
  maxStorageBytes: 100 * 1024 * 1024, // 100 MB
  maxEntriesPerNamespace: 10000,
  maxEntrySize: 1 * 1024 * 1024, // 1 MB per entry
  maxOperationsPerMinute: 100,
  maxOperationsPerHour: 5000,
  maxOperationsPerDay: 50000,
  maxNamespaces: 50,
  defaultTTL: 3600, // 1 hour
  maxTTL: 86400 * 30, // 30 days
};

/**
 * Premium quota for premium tier
 */
const PREMIUM_QUOTA: TenantQuota = {
  maxStorageBytes: 1024 * 1024 * 1024, // 1 GB
  maxEntriesPerNamespace: 100000,
  maxEntrySize: 10 * 1024 * 1024, // 10 MB per entry
  maxOperationsPerMinute: 500,
  maxOperationsPerHour: 25000,
  maxOperationsPerDay: 250000,
  maxNamespaces: 200,
  defaultTTL: 3600,
  maxTTL: 86400 * 90, // 90 days
};

/**
 * Usage Statistics
 * Tracks resource usage for a tenant
 */
export interface UsageStats {
  tenantId: string;
  currentStorageBytes: number;
  totalEntries: number;
  namespaceCount: number;
  operationsToday: number;
  operationsThisHour: number;
  operationsThisMinute: number;
  lastOperation: Date;
  quota: TenantQuota;
}

/**
 * Tenant Memory Service
 * Manages tenant-isolated memory with quotas and rate limiting
 */
export class TenantMemoryService extends EventEmitter {
  private storage = new Map<string, MemoryEntry>();
  private quotas = new Map<string, TenantQuota>();
  private usage = new Map<string, UsageStats>();
  private operationLog = new Map<string, number[]>(); // tenantId -> timestamps

  private cleanupInterval?: NodeJS.Timeout;
  private usageTrackingInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.startCleanupTimer();
    this.startUsageTracking();
  }

  /**
   * Set quota for a tenant
   */
  setQuota(tenantId: string, quota: Partial<TenantQuota>): void {
    const currentQuota = this.quotas.get(tenantId) || DEFAULT_QUOTA;
    this.quotas.set(tenantId, { ...currentQuota, ...quota });
  }

  /**
   * Set tenant to premium tier
   */
  setPremiumTier(tenantId: string): void {
    this.quotas.set(tenantId, { ...PREMIUM_QUOTA });
  }

  /**
   * Get quota for a tenant
   */
  getQuota(tenantId: string): TenantQuota {
    return this.quotas.get(tenantId) || DEFAULT_QUOTA;
  }

  /**
   * Store a value in tenant memory
   */
  async set(
    namespace: string,
    key: string,
    value: any,
    options?: {
      ttl?: number; // seconds
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const tenantService = getTenantService();
    const context = tenantService.requireTenantContext();

    // Check rate limits
    await this.checkRateLimit(context.tenantId);

    // Generate full key
    const fullKey = this.generateKey(context.tenantId, context.userId, namespace, key);

    // Calculate size
    const size = this.calculateSize(value);

    // Check quotas
    await this.checkQuotas(context.tenantId, namespace, size);

    const quota = this.getQuota(context.tenantId);
    const ttl = options?.ttl || quota.defaultTTL;

    // Enforce max TTL
    const finalTTL = Math.min(ttl, quota.maxTTL);

    const entry: MemoryEntry = {
      key: fullKey,
      value,
      namespace,
      tenantId: context.tenantId,
      userId: context.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + finalTTL * 1000),
      size,
      metadata: options?.metadata,
    };

    // Remove old entry from stats if it exists
    const oldEntry = this.storage.get(fullKey);
    if (oldEntry) {
      this.updateUsageStats(context.tenantId, -oldEntry.size, 0);
    }

    // Store entry
    this.storage.set(fullKey, entry);

    // Update usage stats
    this.updateUsageStats(context.tenantId, size, oldEntry ? 0 : 1);

    // Log operation
    this.logOperation(context.tenantId);

    this.emit('set', { tenantId: context.tenantId, namespace, key, size });
  }

  /**
   * Get a value from tenant memory
   */
  async get(namespace: string, key: string): Promise<any | null> {
    const tenantService = getTenantService();
    const context = tenantService.requireTenantContext();

    // Check rate limits
    await this.checkRateLimit(context.tenantId);

    const fullKey = this.generateKey(context.tenantId, context.userId, namespace, key);
    const entry = this.storage.get(fullKey);

    if (!entry) {
      // Log operation
      this.logOperation(context.tenantId);
      return null;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.storage.delete(fullKey);
      this.updateUsageStats(context.tenantId, -entry.size, -1);
      this.logOperation(context.tenantId);
      return null;
    }

    // Log operation
    this.logOperation(context.tenantId);

    return entry.value;
  }

  /**
   * Delete a value from tenant memory
   */
  async delete(namespace: string, key: string): Promise<boolean> {
    const tenantService = getTenantService();
    const context = tenantService.requireTenantContext();

    // Check rate limits
    await this.checkRateLimit(context.tenantId);

    const fullKey = this.generateKey(context.tenantId, context.userId, namespace, key);
    const entry = this.storage.get(fullKey);

    if (!entry) {
      this.logOperation(context.tenantId);
      return false;
    }

    this.storage.delete(fullKey);
    this.updateUsageStats(context.tenantId, -entry.size, -1);
    this.logOperation(context.tenantId);

    this.emit('delete', { tenantId: context.tenantId, namespace, key });

    return true;
  }

  /**
   * List all keys in a namespace
   */
  async list(namespace: string, options?: { limit?: number; offset?: number }): Promise<string[]> {
    const tenantService = getTenantService();
    const context = tenantService.requireTenantContext();

    // Check rate limits
    await this.checkRateLimit(context.tenantId);

    const prefix = this.generateKeyPrefix(context.tenantId, context.userId, namespace);
    const keys: string[] = [];

    for (const [fullKey, entry] of this.storage.entries()) {
      if (fullKey.startsWith(prefix)) {
        // Check expiration
        if (!entry.expiresAt || entry.expiresAt >= new Date()) {
          // Extract the original key (last part after namespace)
          const parts = fullKey.split(':');
          keys.push(parts[parts.length - 1]);
        }
      }
    }

    // Log operation
    this.logOperation(context.tenantId);

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || keys.length;

    return keys.slice(offset, offset + limit);
  }

  /**
   * Clear all entries in a namespace
   */
  async clear(namespace: string): Promise<number> {
    const tenantService = getTenantService();
    const context = tenantService.requireTenantContext();

    // Check rate limits
    await this.checkRateLimit(context.tenantId);

    const prefix = this.generateKeyPrefix(context.tenantId, context.userId, namespace);
    let deletedCount = 0;
    let freedBytes = 0;

    const keysToDelete: string[] = [];

    for (const [fullKey, entry] of this.storage.entries()) {
      if (fullKey.startsWith(prefix)) {
        keysToDelete.push(fullKey);
        freedBytes += entry.size;
        deletedCount++;
      }
    }

    for (const key of keysToDelete) {
      this.storage.delete(key);
    }

    this.updateUsageStats(context.tenantId, -freedBytes, -deletedCount);
    this.logOperation(context.tenantId);

    this.emit('clear', { tenantId: context.tenantId, namespace, deletedCount });

    return deletedCount;
  }

  /**
   * Get usage statistics for current tenant
   */
  async getUsage(): Promise<UsageStats> {
    const tenantService = getTenantService();
    const context = tenantService.requireTenantContext();

    return this.getUsageForTenant(context.tenantId);
  }

  /**
   * Get usage statistics for a specific tenant
   */
  getUsageForTenant(tenantId: string): UsageStats {
    if (!this.usage.has(tenantId)) {
      this.usage.set(tenantId, {
        tenantId,
        currentStorageBytes: 0,
        totalEntries: 0,
        namespaceCount: 0,
        operationsToday: 0,
        operationsThisHour: 0,
        operationsThisMinute: 0,
        lastOperation: new Date(),
        quota: this.getQuota(tenantId),
      });
    }

    return this.usage.get(tenantId)!;
  }

  /**
   * Generate storage key
   */
  private generateKey(tenantId: string, userId: number, namespace: string, key: string): string {
    return `mcp:tenant:${tenantId}:user:${userId}:ns:${namespace}:${key}`;
  }

  /**
   * Generate key prefix for listing
   */
  private generateKeyPrefix(tenantId: string, userId: number, namespace: string): string {
    return `mcp:tenant:${tenantId}:user:${userId}:ns:${namespace}:`;
  }

  /**
   * Calculate size of value in bytes
   */
  private calculateSize(value: any): number {
    const json = JSON.stringify(value);
    return Buffer.byteLength(json, 'utf8');
  }

  /**
   * Check if operation would exceed quotas
   */
  private async checkQuotas(tenantId: string, namespace: string, additionalSize: number): Promise<void> {
    const quota = this.getQuota(tenantId);
    const usage = this.getUsageForTenant(tenantId);

    // Check storage quota
    if (usage.currentStorageBytes + additionalSize > quota.maxStorageBytes) {
      throw new Error(
        `Storage quota exceeded. Current: ${usage.currentStorageBytes}, Limit: ${quota.maxStorageBytes}`
      );
    }

    // Check entry size
    if (additionalSize > quota.maxEntrySize) {
      throw new Error(`Entry size ${additionalSize} exceeds maximum ${quota.maxEntrySize}`);
    }

    // Count entries in namespace
    const prefix = this.generateKeyPrefix(tenantId, 0, namespace); // Use 0 for tenant-level check
    let namespaceEntries = 0;

    for (const key of this.storage.keys()) {
      if (key.includes(`:ns:${namespace}:`)) {
        namespaceEntries++;
      }
    }

    if (namespaceEntries >= quota.maxEntriesPerNamespace) {
      throw new Error(
        `Namespace entry limit exceeded. Current: ${namespaceEntries}, Limit: ${quota.maxEntriesPerNamespace}`
      );
    }
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(tenantId: string): Promise<void> {
    const quota = this.getQuota(tenantId);
    const usage = this.getUsageForTenant(tenantId);

    if (usage.operationsThisMinute >= quota.maxOperationsPerMinute) {
      throw new Error(`Rate limit exceeded: ${quota.maxOperationsPerMinute} operations per minute`);
    }

    if (usage.operationsThisHour >= quota.maxOperationsPerHour) {
      throw new Error(`Rate limit exceeded: ${quota.maxOperationsPerHour} operations per hour`);
    }

    if (usage.operationsToday >= quota.maxOperationsPerDay) {
      throw new Error(`Rate limit exceeded: ${quota.maxOperationsPerDay} operations per day`);
    }
  }

  /**
   * Log an operation for rate limiting
   */
  private logOperation(tenantId: string): void {
    const now = Date.now();

    if (!this.operationLog.has(tenantId)) {
      this.operationLog.set(tenantId, []);
    }

    const timestamps = this.operationLog.get(tenantId)!;
    timestamps.push(now);

    // Keep only last day of timestamps
    const oneDayAgo = now - 86400 * 1000;
    const filtered = timestamps.filter(ts => ts > oneDayAgo);
    this.operationLog.set(tenantId, filtered);

    // Update usage stats
    const usage = this.getUsageForTenant(tenantId);
    usage.lastOperation = new Date(now);

    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 3600 * 1000;

    usage.operationsThisMinute = filtered.filter(ts => ts > oneMinuteAgo).length;
    usage.operationsThisHour = filtered.filter(ts => ts > oneHourAgo).length;
    usage.operationsToday = filtered.length;
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(tenantId: string, sizeDelta: number, entryDelta: number): void {
    const usage = this.getUsageForTenant(tenantId);

    usage.currentStorageBytes += sizeDelta;
    usage.totalEntries += entryDelta;

    // Recalculate namespace count
    const namespaces = new Set<string>();
    for (const entry of this.storage.values()) {
      if (entry.tenantId === tenantId) {
        namespaces.add(entry.namespace);
      }
    }
    usage.namespaceCount = namespaces.size;
  }

  /**
   * Start cleanup timer to remove expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Run every minute
  }

  /**
   * Start usage tracking reset timer
   */
  private startUsageTracking(): void {
    this.usageTrackingInterval = setInterval(() => {
      // Reset minute counters every minute
      for (const usage of this.usage.values()) {
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;
        const timestamps = this.operationLog.get(usage.tenantId) || [];
        usage.operationsThisMinute = timestamps.filter(ts => ts > oneMinuteAgo).length;
      }
    }, 60 * 1000); // Run every minute
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.storage.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const entry = this.storage.get(key)!;
      this.storage.delete(key);
      this.updateUsageStats(entry.tenantId, -entry.size, -1);
      this.emit('expired', { tenantId: entry.tenantId, namespace: entry.namespace, key });
    }

    if (keysToDelete.length > 0) {
      console.log(`[TenantMemory] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Stop cleanup timers
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.usageTrackingInterval) {
      clearInterval(this.usageTrackingInterval);
    }
  }
}

// Singleton instance
let tenantMemoryInstance: TenantMemoryService | null = null;

/**
 * Get singleton tenant memory service
 */
export function getTenantMemoryService(): TenantMemoryService {
  if (!tenantMemoryInstance) {
    tenantMemoryInstance = new TenantMemoryService();
  }
  return tenantMemoryInstance;
}
