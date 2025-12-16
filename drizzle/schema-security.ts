/**
 * Security & Control Schema
 * Database tables for credential management and execution control
 */

import { pgTable, serial, text, timestamp, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./schema";

/**
 * Encrypted credential vault
 * Stores user credentials securely with encryption at rest
 *
 * Security considerations:
 * - All credential data is encrypted using AES-256-GCM
 * - Encryption keys are stored in environment variables (not in database)
 * - Credentials are never logged or exposed in API responses
 * - Access is strictly controlled by userId
 */
export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),

  /** User-friendly name for this credential (e.g., "Gmail Account", "AWS Production") */
  name: text("name").notNull(),

  /** Service identifier (e.g., "gmail", "ghl", "aws", "stripe") */
  service: varchar("service", { length: 100 }).notNull(),

  /** Credential type */
  type: varchar("type", { length: 50 }).notNull(), // 'password', 'api_key', 'oauth_token', 'ssh_key'

  /** Encrypted credential data (username, password, token, etc.) */
  encryptedData: text("encryptedData").notNull(),

  /** Initialization vector for AES-GCM encryption */
  iv: text("iv").notNull(),

  /** Authentication tag for AES-GCM encryption */
  authTag: text("authTag").notNull(),

  /** Optional metadata (non-sensitive) */
  metadata: jsonb("metadata"), // { url, description, lastUsed, etc. }

  /** Track usage */
  lastUsedAt: timestamp("lastUsedAt"),
  useCount: integer("useCount").default(0).notNull(),

  /** Soft delete for audit trail */
  isActive: boolean("isActive").default(true).notNull(),
  deletedAt: timestamp("deletedAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = typeof credentials.$inferInsert;

/**
 * Execution control state
 * Manages pause/resume/cancel state for agent executions
 */
export const executionControls = pgTable("execution_controls", {
  id: serial("id").primaryKey(),

  /** Reference to task execution */
  executionId: integer("executionId").notNull().unique(),

  /** User who owns this execution */
  userId: integer("userId").references(() => users.id).notNull(),

  /** Current control state */
  controlState: varchar("controlState", { length: 20 }).notNull(), // 'running', 'paused', 'cancelled', 'awaiting_approval'

  /** Reason for state change (user-provided or system-generated) */
  stateReason: text("stateReason"),

  /** User instruction injected mid-execution */
  injectedInstruction: text("injectedInstruction"),
  injectedAt: timestamp("injectedAt"),

  /** Checkpoint data for resuming execution */
  checkpointData: jsonb("checkpointData"), // Serialized agent state for resume

  /** Last state change timestamp */
  lastStateChange: timestamp("lastStateChange").defaultNow().notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ExecutionControl = typeof executionControls.$inferSelect;
export type InsertExecutionControl = typeof executionControls.$inferInsert;

/**
 * Action approval queue
 * High-risk actions that require user approval before execution
 */
export const actionApprovals = pgTable("action_approvals", {
  id: serial("id").primaryKey(),

  /** Reference to execution */
  executionId: integer("executionId").notNull(),
  userId: integer("userId").references(() => users.id).notNull(),

  /** Action details */
  actionType: varchar("actionType", { length: 100 }).notNull(), // 'delete', 'purchase', 'send_email', 'modify_data'
  actionDescription: text("actionDescription").notNull(),
  actionParams: jsonb("actionParams").notNull(),

  /** Risk assessment */
  riskLevel: varchar("riskLevel", { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  riskFactors: jsonb("riskFactors"), // Array of risk indicators

  /** Screenshot evidence */
  screenshotUrl: text("screenshotUrl"),

  /** Approval state */
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'approved', 'rejected', 'timeout'

  /** User response */
  approvedAt: timestamp("approvedAt"),
  rejectedAt: timestamp("rejectedAt"),
  rejectionReason: text("rejectionReason"),

  /** Timeout configuration */
  expiresAt: timestamp("expiresAt").notNull(), // Auto-reject after this time
  timeoutAction: varchar("timeoutAction", { length: 20 }).default("reject").notNull(), // 'reject' or 'approve'

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ActionApproval = typeof actionApprovals.$inferSelect;
export type InsertActionApproval = typeof actionApprovals.$inferInsert;

/**
 * Browser context isolation
 * Tracks Browserbase contexts for multi-tenant isolation
 */
export const browserContexts = pgTable("browser_contexts", {
  id: serial("id").primaryKey(),

  /** Client/tenant identifier */
  clientId: integer("clientId").notNull(), // Could reference clientProfiles
  userId: integer("userId").references(() => users.id).notNull(),

  /** Browserbase context ID */
  contextId: varchar("contextId", { length: 128 }).notNull().unique(),

  /** Context configuration */
  isolationLevel: varchar("isolationLevel", { length: 20 }).default("strict").notNull(), // 'strict', 'standard'

  /** Stored cookies and local storage (encrypted) */
  encryptedStorage: text("encryptedStorage"),
  storageIv: text("storageIv"),
  storageAuthTag: text("storageAuthTag"),

  /** Context metadata */
  metadata: jsonb("metadata"),

  /** Active sessions using this context */
  activeSessionCount: integer("activeSessionCount").default(0).notNull(),

  /** Last usage */
  lastUsedAt: timestamp("lastUsedAt"),

  /** Context lifecycle */
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BrowserContext = typeof browserContexts.$inferSelect;
export type InsertBrowserContext = typeof browserContexts.$inferInsert;

/**
 * Audit log for sensitive operations
 * Tracks all credential access and high-risk actions
 */
export const securityAuditLog = pgTable("security_audit_log", {
  id: serial("id").primaryKey(),

  /** Who performed the action */
  userId: integer("userId").references(() => users.id).notNull(),

  /** What action was performed */
  action: varchar("action", { length: 100 }).notNull(), // 'credential_access', 'credential_create', 'execution_pause', etc.
  resourceType: varchar("resourceType", { length: 50 }).notNull(), // 'credential', 'execution', 'context'
  resourceId: integer("resourceId"),

  /** Action details */
  details: jsonb("details"),

  /** IP address and user agent */
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),

  /** Success/failure */
  success: boolean("success").notNull(),
  errorMessage: text("errorMessage"),

  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type InsertSecurityAuditLog = typeof securityAuditLog.$inferInsert;
