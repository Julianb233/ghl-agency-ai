/**
 * Common validation schemas for TRPC routers
 *
 * Provides reusable Zod schemas to eliminate duplication across 30+ routers.
 * Import these schemas and extend them as needed.
 *
 * Usage:
 *   import { paginationSchema, sortOrderSchema, priorityEnum } from "../schemas/common";
 *
 *   const listTasksSchema = z.object({
 *     ...paginationSchema.shape,
 *     ...sortOrderSchema.shape,
 *     priority: priorityEnum.optional(),
 *   });
 */

import { z } from "zod";

// ========================================
// PAGINATION SCHEMAS
// ========================================

/**
 * Standard pagination schema with limit and offset
 */
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Small page pagination (for dropdowns, etc)
 */
export const smallPaginationSchema = z.object({
  limit: z.number().int().min(1).max(20).default(10),
  offset: z.number().int().min(0).default(0),
});

/**
 * Large page pagination (for bulk operations)
 */
export const largePaginationSchema = z.object({
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

// ========================================
// SORT SCHEMAS
// ========================================

/**
 * Basic sort order
 */
export const sortOrderSchema = z.object({
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Common sort fields for timestamped entities
 */
export const timestampSortSchema = z.object({
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ========================================
// COMMON ENUMS
// ========================================

/**
 * Priority levels used across tasks, tickets, etc.
 */
export const priorityEnum = z.enum(["low", "medium", "high", "critical"]);
export type Priority = z.infer<typeof priorityEnum>;

/**
 * Urgency levels
 */
export const urgencyEnum = z.enum(["normal", "soon", "urgent", "immediate"]);
export type Urgency = z.infer<typeof urgencyEnum>;

/**
 * Generic status for async operations
 */
export const asyncStatusEnum = z.enum(["pending", "running", "completed", "failed", "cancelled"]);
export type AsyncStatus = z.infer<typeof asyncStatusEnum>;

/**
 * Task status (more detailed)
 */
export const taskStatusEnum = z.enum([
  "pending",
  "queued",
  "in_progress",
  "waiting_input",
  "completed",
  "failed",
  "cancelled",
  "deferred",
]);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

/**
 * Webhook delivery status
 */
export const webhookStatusEnum = z.enum([
  "pending",
  "success",
  "failed",
  "retrying",
  "permanently_failed",
]);
export type WebhookStatus = z.infer<typeof webhookStatusEnum>;

/**
 * Call status for voice/calling features
 */
export const callStatusEnum = z.enum([
  "pending",
  "calling",
  "answered",
  "no_answer",
  "failed",
  "completed",
]);
export type CallStatus = z.infer<typeof callStatusEnum>;

/**
 * Enrichment status
 */
export const enrichmentStatusEnum = z.enum(["pending", "enriched", "failed", "skipped"]);
export type EnrichmentStatus = z.infer<typeof enrichmentStatusEnum>;

/**
 * Draft/approval status
 */
export const draftStatusEnum = z.enum(["pending", "approved", "sent", "discarded"]);
export type DraftStatus = z.infer<typeof draftStatusEnum>;

/**
 * Task types
 */
export const taskTypeEnum = z.enum([
  "browser_automation",
  "api_call",
  "notification",
  "reminder",
  "ghl_action",
  "data_extraction",
  "report_generation",
  "custom",
]);
export type TaskType = z.infer<typeof taskTypeEnum>;

/**
 * Source types for tasks/messages
 */
export const sourceTypeEnum = z.enum([
  "webhook_sms",
  "webhook_email",
  "webhook_custom",
  "manual",
  "scheduled",
  "conversation",
]);
export type SourceType = z.infer<typeof sourceTypeEnum>;

/**
 * Execution types
 */
export const executionTypeEnum = z.enum(["automatic", "manual_trigger", "scheduled"]);
export type ExecutionType = z.infer<typeof executionTypeEnum>;

// ========================================
// COMMON FIELD SCHEMAS
// ========================================

/**
 * Standard ID field (positive integer)
 */
export const idSchema = z.number().int().positive();

/**
 * UUID string
 */
export const uuidSchema = z.string().uuid();

/**
 * Optional search string
 */
export const searchSchema = z.object({
  search: z.string().max(500).optional(),
});

/**
 * Date range filter
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Common metadata field (JSON object)
 */
export const metadataSchema = z.record(z.string(), z.any()).optional();

/**
 * Tags array
 */
export const tagsSchema = z.array(z.string().max(100)).max(50).optional();

// ========================================
// COMPOSITE SCHEMAS
// ========================================

/**
 * Standard list query with pagination and search
 */
export const listQuerySchema = z.object({
  ...paginationSchema.shape,
  ...searchSchema.shape,
});

/**
 * Full list query with pagination, search, and timestamp sorting
 */
export const fullListQuerySchema = z.object({
  ...paginationSchema.shape,
  ...searchSchema.shape,
  ...timestampSortSchema.shape,
});

/**
 * Create base schema with common fields
 */
export const createBaseSchema = z.object({
  tags: tagsSchema,
  metadata: metadataSchema,
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Create a list query schema with custom sort fields
 */
export function createListQuerySchema<T extends readonly [string, ...string[]]>(sortFields: T) {
  return z.object({
    ...paginationSchema.shape,
    ...searchSchema.shape,
    sortBy: z.enum(sortFields).default(sortFields[0]),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  });
}

/**
 * Create a status filter schema with custom status enum
 */
export function createStatusFilterSchema<T extends readonly [string, ...string[]]>(statuses: T) {
  const statusEnum = z.enum(statuses);
  return z.object({
    status: statusEnum.optional(),
    statuses: z.array(statusEnum).optional(),
  });
}
