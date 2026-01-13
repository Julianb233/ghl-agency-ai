/**
 * Credential Rotation Schema
 * Database tables for credential rotation policies and audit logging
 */

import { pgTable, serial, text, timestamp, varchar, integer, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./schema";

/**
 * Credential rotation policies
 * Defines rotation schedules for different credential types
 */
export const credentialPolicies = pgTable("credential_policies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),

  /** Type of credential this policy applies to */
  credentialType: varchar("credentialType", { length: 50 }).notNull(), // 'api_key', 'oauth_token', 'webhook_secret'

  /** Rotation interval in days */
  rotationIntervalDays: integer("rotationIntervalDays").notNull(),

  /** Last rotation timestamp */
  lastRotatedAt: timestamp("lastRotatedAt"),

  /** Next scheduled rotation */
  nextRotationAt: timestamp("nextRotationAt"),

  /** Whether this policy is active */
  isEnabled: boolean("isEnabled").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("credential_policies_user_id_idx").on(table.userId),
  credentialTypeIdx: index("credential_policies_credential_type_idx").on(table.credentialType),
  nextRotationAtIdx: index("credential_policies_next_rotation_at_idx").on(table.nextRotationAt),
  userCredentialTypeIdx: index("credential_policies_user_credential_type_idx").on(table.userId, table.credentialType),
}));

export type CredentialPolicy = typeof credentialPolicies.$inferSelect;
export type InsertCredentialPolicy = typeof credentialPolicies.$inferInsert;

/**
 * Credential rotation logs
 * Audit trail of all credential rotation events
 */
export const credentialRotationLogs = pgTable("credential_rotation_logs", {
  id: serial("id").primaryKey(),

  /** Reference to the policy that triggered this rotation */
  policyId: integer("policyId").references(() => credentialPolicies.id).notNull(),

  /** User who owns the credential */
  userId: integer("userId").references(() => users.id).notNull(),

  /** Type of credential rotated */
  credentialType: varchar("credentialType", { length: 50 }).notNull(),

  /** Action taken */
  action: varchar("action", { length: 20 }).notNull(), // 'rotated', 'failed', 'skipped'

  /** Last 4 characters of old key hash (for audit without exposing full key) */
  oldKeyHash: varchar("oldKeyHash", { length: 4 }),

  /** Last 4 characters of new key hash */
  newKeyHash: varchar("newKeyHash", { length: 4 }),

  /** Reason for the action (especially for failures/skips) */
  reason: text("reason"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  policyIdIdx: index("credential_rotation_logs_policy_id_idx").on(table.policyId),
  userIdIdx: index("credential_rotation_logs_user_id_idx").on(table.userId),
  createdAtIdx: index("credential_rotation_logs_created_at_idx").on(table.createdAt),
}));

export type CredentialRotationLog = typeof credentialRotationLogs.$inferSelect;
export type InsertCredentialRotationLog = typeof credentialRotationLogs.$inferInsert;
