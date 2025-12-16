/**
 * Database helper utilities for TRPC procedures
 *
 * Provides centralized DB initialization and error handling to eliminate
 * the repetitive pattern of checking DB availability across 245+ procedures.
 *
 * Usage:
 *   // Instead of:
 *   const db = await getDb();
 *   if (!db) {
 *     throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });
 *   }
 *
 *   // Use:
 *   const db = await requireDb();
 *
 *   // Or for wrapper pattern:
 *   return withDb(async (db) => {
 *     // your logic here
 *   });
 */

import { TRPCError } from "@trpc/server";
import { getDb } from "../db";

// Re-export the DB type for convenience
export type DbInstance = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/**
 * Get database instance or throw TRPCError
 * Use this when you need the db instance directly
 */
export async function requireDb(): Promise<DbInstance> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not initialized",
    });
  }
  return db;
}

/**
 * Wrapper that provides db instance and handles errors
 * Use this for cleaner procedure implementations
 */
export async function withDb<T>(
  fn: (db: DbInstance) => Promise<T>
): Promise<T> {
  const db = await requireDb();
  return fn(db);
}

/**
 * Wrap an async operation with standardized TRPC error handling
 * Converts unknown errors to TRPCError with consistent messaging
 */
export async function withTrpcErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  errorCode: TRPCError["code"] = "INTERNAL_SERVER_ERROR"
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: errorCode,
      message: `${errorMessage}: ${error instanceof Error ? error.message : "Unknown error"}`,
      cause: error,
    });
  }
}

/**
 * Combined helper: get DB and wrap with error handling
 * Most common pattern for TRPC procedures
 */
export async function withDbAndErrorHandling<T>(
  fn: (db: DbInstance) => Promise<T>,
  errorMessage: string
): Promise<T> {
  return withTrpcErrorHandling(
    async () => withDb(fn),
    errorMessage
  );
}

/**
 * Create a not found error
 */
export function notFoundError(resource: string, identifier?: string | number): TRPCError {
  const message = identifier
    ? `${resource} not found: ${identifier}`
    : `${resource} not found`;
  return new TRPCError({
    code: "NOT_FOUND",
    message,
  });
}

/**
 * Create a validation error
 */
export function validationError(message: string): TRPCError {
  return new TRPCError({
    code: "BAD_REQUEST",
    message,
  });
}

/**
 * Create an unauthorized error
 */
export function unauthorizedError(message = "Unauthorized"): TRPCError {
  return new TRPCError({
    code: "UNAUTHORIZED",
    message,
  });
}

/**
 * Create a forbidden error
 */
export function forbiddenError(message = "Forbidden"): TRPCError {
  return new TRPCError({
    code: "FORBIDDEN",
    message,
  });
}
