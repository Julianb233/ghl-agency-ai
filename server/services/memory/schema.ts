/**
 * Memory System Database Schema
 * Using Drizzle ORM for PostgreSQL
 */

import { pgTable, text, integer, timestamp, jsonb, real, index, varchar, serial } from "drizzle-orm/pg-core";

/**
 * Memory entries table - stores agent context and data
 */
export const memoryEntries = pgTable("memory_entries", {
  id: serial("id").primaryKey(),
  entryId: varchar("entry_id", { length: 255 }).notNull().unique(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  agentId: varchar("agent_id", { length: 255 }),
  userId: integer("user_id"),
  key: text("key").notNull(),
  value: jsonb("value").notNull(),
  embedding: jsonb("embedding"), // Stored as JSON array for PostgreSQL compatibility
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
}, (table) => ({
  sessionIdIdx: index("memory_session_id_idx").on(table.sessionId),
  agentIdIdx: index("memory_agent_id_idx").on(table.agentId),
  userIdIdx: index("memory_user_id_idx").on(table.userId),
  keyIdx: index("memory_key_idx").on(table.key),
  createdAtIdx: index("memory_created_at_idx").on(table.createdAt),
}));

/**
 * Reasoning patterns table - stores agent reasoning for reuse
 */
export const reasoningPatterns = pgTable("reasoning_patterns", {
  id: serial("id").primaryKey(),
  patternId: varchar("pattern_id", { length: 255 }).notNull().unique(),
  pattern: text("pattern").notNull(),
  result: jsonb("result").notNull(),
  context: jsonb("context"),
  confidence: real("confidence").notNull().default(0.8),
  usageCount: integer("usage_count").notNull().default(0),
  successRate: real("success_rate").notNull().default(1.0),
  domain: varchar("domain", { length: 255 }),
  tags: jsonb("tags").default([]),
  metadata: jsonb("metadata").default({}),
  embedding: jsonb("embedding"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
}, (table) => ({
  domainIdx: index("reasoning_domain_idx").on(table.domain),
  confidenceIdx: index("reasoning_confidence_idx").on(table.confidence),
  usageCountIdx: index("reasoning_usage_count_idx").on(table.usageCount),
}));

/**
 * Session contexts table - stores session-level context
 */
export const sessionContexts = pgTable("session_contexts", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  userId: integer("user_id"),
  agentId: varchar("agent_id", { length: 255 }),
  context: jsonb("context").notNull().default({}),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index("session_context_id_idx").on(table.sessionId),
  userIdIdx: index("session_user_id_idx").on(table.userId),
}));

// Export types
export type InsertMemoryEntry = typeof memoryEntries.$inferInsert;
export type SelectMemoryEntry = typeof memoryEntries.$inferSelect;
export type InsertReasoningPattern = typeof reasoningPatterns.$inferInsert;
export type SelectReasoningPattern = typeof reasoningPatterns.$inferSelect;
export type InsertSessionContext = typeof sessionContexts.$inferInsert;
export type SelectSessionContext = typeof sessionContexts.$inferSelect;
