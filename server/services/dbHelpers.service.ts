/**
 * Database Query Helpers for Tenant Isolation
 * Provides utility functions for tenant-scoped database operations
 *
 * Usage:
 * import { createTenantQuery } from './dbHelpers.service';
 *
 * const results = await createTenantQuery()
 *   .select()
 *   .from(documents)
 *   .where(eq(documents.id, docId));
 */

import { getDb } from "../db";
import { getTenantService } from "./tenantIsolation.service";
import type { SQL } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

/**
 * Tenant-aware database query builder
 * Automatically adds tenant filtering to all queries
 */
export class TenantQueryBuilder {
  private tenantService = getTenantService();

  /**
   * Create a SELECT query with automatic tenant filtering
   *
   * Usage:
   * const builder = new TenantQueryBuilder();
   * const results = await builder.select(documents, documents.userId)
   *   .where(eq(documents.type, 'pdf'));
   */
  select() {
    // Return a proxy that intercepts where() calls to add tenant filter
    // This is a simplified version - full implementation would need more methods
    return {
      from: (table: any) => {
        return {
          where: (...conditions: SQL[]) => {
            return this.addTenantFilter(table, conditions);
          },
        };
      },
    };
  }

  /**
   * Add tenant filter to WHERE conditions
   */
  private addTenantFilter(table: any, conditions: SQL[]): any {
    const context = this.tenantService.getTenantContext();

    if (!context) {
      // No tenant context - return conditions as-is
      return getDb().then(db => {
        if (!db) throw new Error("Database not initialized");
        return db.select().from(table).where(and(...conditions));
      });
    }

    // Add userId filter if table has userId column
    const tenantCondition = eq(table.userId, context.userId);
    const allConditions = [tenantCondition, ...conditions];

    return getDb().then(db => {
      if (!db) throw new Error("Database not initialized");
      return db.select().from(table).where(and(...allConditions));
    });
  }
}

/**
 * Helper function to create tenant-scoped WHERE clause
 *
 * Usage:
 * const where = createTenantWhere(documents.userId, eq(documents.id, 123));
 * await db.select().from(documents).where(where);
 */
export function createTenantWhere(userIdColumn: any, ...conditions: SQL[]): SQL {
  const tenantService = getTenantService();
  const context = tenantService.getTenantContext();

  if (!context) {
    // No tenant context - return conditions as-is
    return conditions.length === 1 ? conditions[0] : and(...conditions)!;
  }

  const tenantCondition = eq(userIdColumn, context.userId);

  if (conditions.length === 0) {
    return tenantCondition;
  }

  return and(tenantCondition, ...conditions)!;
}

/**
 * Helper function to validate data belongs to current tenant before operations
 *
 * Usage:
 * const doc = await db.select().from(documents).where(eq(documents.id, docId));
 * requireTenantOwnership(doc.userId, 'document');
 */
export function requireTenantOwnership(
  dataUserId: number | null | undefined,
  resourceType: string = "resource"
): void {
  const tenantService = getTenantService();
  tenantService.requireTenantOwnership(dataUserId, resourceType);
}

/**
 * Helper function to check if data belongs to current tenant
 *
 * Usage:
 * if (validateTenantOwnership(doc.userId)) {
 *   // Process document
 * }
 */
export function validateTenantOwnership(dataUserId: number | null | undefined): boolean {
  const tenantService = getTenantService();
  return tenantService.validateTenantOwnership(dataUserId);
}

/**
 * Get current tenant's userId for manual query building
 *
 * Usage:
 * const userId = getCurrentTenantUserId();
 * await db.select().from(documents).where(eq(documents.userId, userId));
 */
export function getCurrentTenantUserId(): number | undefined {
  const tenantService = getTenantService();
  return tenantService.getUserId();
}

/**
 * Get current tenant ID
 */
export function getCurrentTenantId(): string {
  const tenantService = getTenantService();
  return tenantService.getTenantId();
}

/**
 * Create a tenant-scoped query helper
 * This is a convenience wrapper around common query patterns
 */
export class TenantDataAccess {
  private tenantService = getTenantService();

  /**
   * Find by ID with tenant ownership validation
   */
  async findById<T extends { userId: number | null }>(
    table: any,
    id: number | string,
    idColumn: any = "id"
  ): Promise<T | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const context = this.tenantService.getTenantContext();
    if (!context) {
      throw new Error("Tenant context required for this operation");
    }

    const results = await db
      .select()
      .from(table)
      .where(
        and(
          eq(idColumn, id),
          eq(table.userId, context.userId)
        )
      )
      .limit(1);

    return results.length > 0 ? (results[0] as T) : null;
  }

  /**
   * Find all for current tenant
   */
  async findAll<T extends { userId: number | null }>(
    table: any,
    options: {
      where?: SQL;
      limit?: number;
      offset?: number;
      orderBy?: any;
    } = {}
  ): Promise<T[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const context = this.tenantService.getTenantContext();
    if (!context) {
      throw new Error("Tenant context required for this operation");
    }

    const tenantCondition = eq(table.userId, context.userId);
    const whereClause = options.where
      ? and(tenantCondition, options.where)
      : tenantCondition;

    let query = db.select().from(table).where(whereClause);

    if (options.orderBy) {
      query = query.orderBy(options.orderBy) as any;
    }

    if (options.limit) {
      query = query.limit(options.limit) as any;
    }

    if (options.offset) {
      query = query.offset(options.offset) as any;
    }

    return query as Promise<T[]>;
  }

  /**
   * Count records for current tenant
   */
  async count(
    table: any,
    where?: SQL
  ): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const context = this.tenantService.getTenantContext();
    if (!context) {
      throw new Error("Tenant context required for this operation");
    }

    const tenantCondition = eq(table.userId, context.userId);
    const whereClause = where
      ? and(tenantCondition, where)
      : tenantCondition;

    const results = await db
      .select({ count: table.id })
      .from(table)
      .where(whereClause);

    return results.length;
  }

  /**
   * Delete by ID with tenant ownership validation
   */
  async deleteById(
    table: any,
    id: number | string,
    idColumn: any = "id"
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const context = this.tenantService.getTenantContext();
    if (!context) {
      throw new Error("Tenant context required for this operation");
    }

    const result = await db
      .delete(table)
      .where(
        and(
          eq(idColumn, id),
          eq(table.userId, context.userId)
        )
      );

    return (result.rowCount || 0) > 0;
  }

  /**
   * Update by ID with tenant ownership validation
   */
  async updateById(
    table: any,
    id: number | string,
    updates: any,
    idColumn: any = "id"
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const context = this.tenantService.getTenantContext();
    if (!context) {
      throw new Error("Tenant context required for this operation");
    }

    const result = await db
      .update(table)
      .set(updates)
      .where(
        and(
          eq(idColumn, id),
          eq(table.userId, context.userId)
        )
      );

    return (result.rowCount || 0) > 0;
  }
}

/**
 * Create a tenant data access helper instance
 */
export function createTenantDataAccess(): TenantDataAccess {
  return new TenantDataAccess();
}

/**
 * Example usage patterns
 */
export const examples = {
  // Using createTenantWhere
  async findDocumentWithTenantFilter(docId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // Assuming you have a documents table imported
    // const where = createTenantWhere(documents.userId, eq(documents.id, docId));
    // return db.select().from(documents).where(where);
  },

  // Using TenantDataAccess
  async findAllUserDocuments() {
    const dataAccess = createTenantDataAccess();
    // return dataAccess.findAll(documents, { limit: 100 });
  },

  // Manual validation
  async updateDocument(docId: number, updates: any) {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // First fetch the document
    // const doc = await db.select().from(documents).where(eq(documents.id, docId));

    // Validate ownership
    // requireTenantOwnership(doc.userId, 'document');

    // Proceed with update
    // return db.update(documents).set(updates).where(eq(documents.id, docId));
  },
};
