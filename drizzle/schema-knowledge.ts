/**
 * Knowledge System Database Schema
 * Migrated from in-memory storage to PostgreSQL for persistence
 */

import { pgTable, serial, text, integer, timestamp, jsonb, real, index, varchar, boolean } from "drizzle-orm/pg-core";
import { users } from "./schema";

/**
 * Action patterns - stores learned automation patterns for tasks
 */
export const actionPatterns = pgTable("action_patterns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  taskType: varchar("task_type", { length: 255 }).notNull(),
  taskName: text("task_name").notNull(),
  pageUrl: text("page_url"),
  steps: jsonb("steps").notNull().default([]),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  lastExecuted: timestamp("last_executed"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  taskTypeIdx: index("action_patterns_task_type_idx").on(table.taskType),
  userIdIdx: index("action_patterns_user_id_idx").on(table.userId),
}));

/**
 * Element selectors - stores UI element selectors with fallbacks
 */
export const elementSelectors = pgTable("element_selectors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  pagePath: varchar("page_path", { length: 500 }).notNull(),
  elementName: varchar("element_name", { length: 255 }).notNull(),
  primarySelector: text("primary_selector").notNull(),
  fallbackSelectors: jsonb("fallback_selectors").notNull().default([]),
  successRate: real("success_rate").notNull().default(1.0),
  totalAttempts: integer("total_attempts").notNull().default(0),
  lastVerified: timestamp("last_verified"),
  screenshotRef: text("screenshot_ref"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  pagePathIdx: index("element_selectors_page_path_idx").on(table.pagePath),
  elementNameIdx: index("element_selectors_element_name_idx").on(table.elementName),
  userIdIdx: index("element_selectors_user_id_idx").on(table.userId),
}));

/**
 * Error patterns - stores error recovery strategies
 */
export const errorPatterns = pgTable("error_patterns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  errorType: varchar("error_type", { length: 255 }).notNull(),
  errorMessage: text("error_message"),
  context: text("context"),
  recoveryStrategies: jsonb("recovery_strategies").notNull().default([]),
  occurrenceCount: integer("occurrence_count").notNull().default(0),
  resolvedCount: integer("resolved_count").notNull().default(0),
  lastOccurred: timestamp("last_occurred"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  errorTypeIdx: index("error_patterns_error_type_idx").on(table.errorType),
  contextIdx: index("error_patterns_context_idx").on(table.context),
  userIdIdx: index("error_patterns_user_id_idx").on(table.userId),
}));

/**
 * Agent feedback - stores user feedback on agent executions
 */
export const agentFeedback = pgTable("agent_feedback", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id"),
  userId: integer("user_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  feedbackType: varchar("feedback_type", { length: 50 }).notNull(), // success, partial, failure, suggestion
  comment: text("comment"),
  taskType: varchar("task_type", { length: 255 }),
  actionsTaken: jsonb("actions_taken").default([]),
  corrections: text("corrections"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("agent_feedback_user_id_idx").on(table.userId),
  taskTypeIdx: index("agent_feedback_task_type_idx").on(table.taskType),
  ratingIdx: index("agent_feedback_rating_idx").on(table.rating),
}));

/**
 * Brand voices - stores client brand voice configurations
 */
export const brandVoices = pgTable("brand_voices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  tone: jsonb("tone").notNull().default([]), // Array of tone descriptors
  vocabulary: jsonb("vocabulary").notNull().default([]), // Preferred words
  avoidWords: jsonb("avoid_words").notNull().default([]), // Words to avoid
  examples: jsonb("examples").notNull().default([]), // Brand voice examples
  industry: varchar("industry", { length: 100 }),
  targetAudience: text("target_audience"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: index("brand_voices_client_id_idx").on(table.clientId),
  userIdIdx: index("brand_voices_user_id_idx").on(table.userId),
}));

/**
 * Client contexts - stores business context for AI personalization
 */
export const clientContexts = pgTable("client_contexts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  businessType: varchar("business_type", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }).notNull(),
  targetMarket: text("target_market"),
  products: jsonb("products").notNull().default([]),
  services: jsonb("services").notNull().default([]),
  keyValues: jsonb("key_values").notNull().default([]),
  competitors: jsonb("competitors").notNull().default([]),
  uniqueSellingPoints: jsonb("unique_selling_points").notNull().default([]),
  customerPersonas: jsonb("customer_personas").notNull().default([]),
  customFields: jsonb("custom_fields").default({}),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: index("client_contexts_client_id_idx").on(table.clientId),
  userIdIdx: index("client_contexts_user_id_idx").on(table.userId),
  industryIdx: index("client_contexts_industry_idx").on(table.industry),
}));

// Export types
export type ActionPattern = typeof actionPatterns.$inferSelect;
export type InsertActionPattern = typeof actionPatterns.$inferInsert;
export type ElementSelector = typeof elementSelectors.$inferSelect;
export type InsertElementSelector = typeof elementSelectors.$inferInsert;
export type ErrorPattern = typeof errorPatterns.$inferSelect;
export type InsertErrorPattern = typeof errorPatterns.$inferInsert;
export type AgentFeedback = typeof agentFeedback.$inferSelect;
export type InsertAgentFeedback = typeof agentFeedback.$inferInsert;
export type BrandVoice = typeof brandVoices.$inferSelect;
export type InsertBrandVoice = typeof brandVoices.$inferInsert;
export type ClientContext = typeof clientContexts.$inferSelect;
export type InsertClientContext = typeof clientContexts.$inferInsert;
