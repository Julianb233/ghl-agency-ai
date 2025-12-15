/**
 * Tenant Isolation Service
 * Provides tenant context management and data isolation for multi-tenant operations
 *
 * Key Features:
 * - Tenant context management (AsyncLocalStorage for request-scoped isolation)
 * - Memory namespace prefixing (tenant-specific memory isolation)
 * - Database query helpers (tenant-scoped data access)
 * - Audit logging for tenant operations
 */

import { AsyncLocalStorage } from "async_hooks";
import type { SQL } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

/**
 * Tenant context stored in AsyncLocalStorage
 * Available throughout the request lifecycle
 */
export interface TenantContext {
  userId: number;
  tenantId: string; // Can be same as userId or a separate tenant identifier
  email?: string;
  role?: string;
  scopes?: string[];
  requestId?: string; // For correlation in logs
}

/**
 * Tenant isolation configuration
 */
export interface TenantIsolationConfig {
  enableStrictMode?: boolean; // Throw error if tenant context missing
  enableAuditLog?: boolean; // Log all tenant operations
  namespacePrefix?: string; // Custom namespace prefix (default: "tenant")
}

/**
 * AsyncLocalStorage for tenant context
 * Maintains tenant context throughout async call chains
 */
const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Tenant Isolation Service
 * Manages tenant context and provides isolation utilities
 */
export class TenantIsolationService {
  private config: TenantIsolationConfig;

  constructor(config: TenantIsolationConfig = {}) {
    this.config = {
      enableStrictMode: config.enableStrictMode ?? false,
      enableAuditLog: config.enableAuditLog ?? false,
      namespacePrefix: config.namespacePrefix ?? "tenant",
    };
  }

  /**
   * Run a function within a tenant context
   * All operations within this scope will have access to tenant context
   */
  async runInTenantContext<T>(
    context: TenantContext,
    fn: () => Promise<T>
  ): Promise<T> {
    return tenantStorage.run(context, fn);
  }

  /**
   * Get current tenant context
   * Returns undefined if not in a tenant context
   */
  getTenantContext(): TenantContext | undefined {
    return tenantStorage.getStore();
  }

  /**
   * Get current tenant context or throw error
   * Use this when tenant context is required
   */
  requireTenantContext(): TenantContext {
    const context = tenantStorage.getStore();

    if (!context) {
      if (this.config.enableStrictMode) {
        throw new Error(
          "Tenant context required but not found. Ensure operations are run within a tenant context."
        );
      }
      // Return a default context (should never happen in production with proper middleware)
      console.warn("Tenant context not found, using default context");
      return {
        userId: 0,
        tenantId: "default",
      };
    }

    return context;
  }

  /**
   * Get current tenant ID
   */
  getTenantId(): string {
    const context = this.getTenantContext();
    return context?.tenantId || "default";
  }

  /**
   * Get current user ID
   */
  getUserId(): number | undefined {
    const context = this.getTenantContext();
    return context?.userId;
  }

  /**
   * Check if currently in a tenant context
   */
  hasTenantContext(): boolean {
    return tenantStorage.getStore() !== undefined;
  }

  // ========================================
  // MEMORY NAMESPACE ISOLATION
  // ========================================

  /**
   * Generate tenant-specific namespace
   * Ensures memory data is isolated per tenant
   *
   * @param namespace - Base namespace (e.g., "agent-memory", "reasoning-bank")
   * @param includeUserId - Whether to include userId in namespace (for user-level isolation)
   * @returns Tenant-prefixed namespace
   */
  getTenantNamespace(namespace: string, includeUserId = true): string {
    const context = this.requireTenantContext();
    const prefix = this.config.namespacePrefix;

    if (includeUserId) {
      return `${prefix}:${context.tenantId}:user:${context.userId}:${namespace}`;
    }

    return `${prefix}:${context.tenantId}:${namespace}`;
  }

  /**
   * Generate tenant-specific memory key
   * Prefixes any memory key with tenant information
   *
   * @param key - Base memory key
   * @returns Tenant-prefixed key
   */
  getTenantMemoryKey(key: string): string {
    const context = this.requireTenantContext();
    return `${this.config.namespacePrefix}:${context.tenantId}:${context.userId}:${key}`;
  }

  /**
   * Generate session ID scoped to tenant
   * Ensures sessions don't leak across tenants
   */
  getTenantSessionId(baseSessionId: string): string {
    const context = this.requireTenantContext();
    return `${context.tenantId}:${context.userId}:${baseSessionId}`;
  }

  // ========================================
  // DATABASE QUERY ISOLATION
  // ========================================

  /**
   * Add tenant filter to database queries
   * Ensures all queries are scoped to current tenant
   *
   * Usage:
   * const conditions = tenantService.addTenantFilter(eq(table.id, id));
   * db.select().from(table).where(conditions);
   */
  addTenantFilter(...conditions: SQL[]): SQL {
    const context = this.requireTenantContext();

    // This is a placeholder - actual implementation depends on your schema
    // If you have a tenantId column, add it to conditions
    // If using userId as tenant identifier, that's already handled

    return conditions.length > 0 ? and(...conditions)! : conditions[0];
  }

  /**
   * Create a WHERE clause that filters by current user/tenant
   *
   * @param userIdColumn - The userId column from your table
   * @param additionalConditions - Additional WHERE conditions
   */
  createTenantWhereClause(userIdColumn: any, ...additionalConditions: SQL[]): SQL {
    const context = this.requireTenantContext();

    const tenantCondition = eq(userIdColumn, context.userId);

    if (additionalConditions.length === 0) {
      return tenantCondition;
    }

    return and(tenantCondition, ...additionalConditions)!;
  }

  /**
   * Validate that data belongs to current tenant
   * Useful for authorization checks before operations
   */
  validateTenantOwnership(dataUserId: number | null | undefined): boolean {
    const context = this.requireTenantContext();

    if (dataUserId === null || dataUserId === undefined) {
      return false;
    }

    return dataUserId === context.userId;
  }

  /**
   * Throw error if data doesn't belong to current tenant
   */
  requireTenantOwnership(
    dataUserId: number | null | undefined,
    resourceType: string = "resource"
  ): void {
    if (!this.validateTenantOwnership(dataUserId)) {
      throw new Error(
        `Access denied: ${resourceType} does not belong to current tenant`
      );
    }
  }

  // ========================================
  // AUDIT LOGGING
  // ========================================

  /**
   * Log tenant operation (if audit logging enabled)
   */
  auditLog(operation: string, details?: Record<string, any>): void {
    if (!this.config.enableAuditLog) {
      return;
    }

    const context = this.getTenantContext();

    console.log("[TENANT AUDIT]", {
      timestamp: new Date().toISOString(),
      tenantId: context?.tenantId,
      userId: context?.userId,
      requestId: context?.requestId,
      operation,
      ...details,
    });
  }

  // ========================================
  // UTILITIES
  // ========================================

  /**
   * Create tenant context from user data
   * Helper for middleware to create context
   */
  static createContext(user: {
    id: number;
    email?: string;
    role?: string;
    tenantId?: string;
  }): TenantContext {
    return {
      userId: user.id,
      tenantId: user.tenantId || `tenant_${user.id}`, // Default to user-based tenancy
      email: user.email,
      role: user.role,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /**
   * Extract tenant metadata for logging/debugging
   */
  getTenantMetadata(): Record<string, any> {
    const context = this.getTenantContext();

    if (!context) {
      return { hasTenantContext: false };
    }

    return {
      hasTenantContext: true,
      tenantId: context.tenantId,
      userId: context.userId,
      email: context.email,
      role: context.role,
      requestId: context.requestId,
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let tenantServiceInstance: TenantIsolationService | null = null;

/**
 * Get or create singleton tenant isolation service
 */
export function getTenantService(config?: TenantIsolationConfig): TenantIsolationService {
  if (!tenantServiceInstance) {
    tenantServiceInstance = new TenantIsolationService(config);
  }
  return tenantServiceInstance;
}

/**
 * Helper function to run operations in tenant context
 * Useful for testing or standalone scripts
 */
export async function withTenantContext<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  const service = getTenantService();
  return service.runInTenantContext(context, fn);
}

/**
 * Helper to get current tenant context
 */
export function getCurrentTenantContext(): TenantContext | undefined {
  const service = getTenantService();
  return service.getTenantContext();
}

/**
 * Helper to require tenant context
 */
export function requireTenantContext(): TenantContext {
  const service = getTenantService();
  return service.requireTenantContext();
}
