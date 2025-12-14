/**
 * SOP (Standard Operating Procedure) Schema
 * Enables teams to define, version, and manage SOPs for AI agents
 * Supports the MANUS multi-agent architecture with persistent knowledge
 */

import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
  jsonb,
  decimal,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ========================================
// SOP MANAGEMENT TABLES
// ========================================

/**
 * SOP Categories
 * Organizes SOPs by functional area
 */
export const sopCategories = pgTable("sop_categories", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // Lucide icon name
  color: varchar("color", { length: 20 }), // Hex or tailwind color
  sortOrder: integer("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SopCategory = typeof sopCategories.$inferSelect;
export type InsertSopCategory = typeof sopCategories.$inferInsert;

/**
 * SOP Documents
 * Main SOP definitions with metadata and settings
 */
export const sopDocuments = pgTable("sop_documents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  categoryId: integer("categoryId").references(() => sopCategories.id),

  // Basic info
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  objective: text("objective"), // What this SOP aims to achieve

  // Versioning
  version: integer("version").default(1).notNull(),
  status: varchar("status", { length: 30 }).default("draft").notNull(), // draft, published, archived

  // Applicability
  applicableTo: jsonb("applicableTo"), // Array of roles/scenarios where this applies
  prerequisites: jsonb("prerequisites"), // Required conditions before executing
  triggers: jsonb("triggers"), // Events that should trigger this SOP

  // Configuration
  estimatedDuration: integer("estimatedDuration"), // Minutes to complete
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, critical
  tags: jsonb("tags"), // Array of tags for searchability

  // AI Agent settings
  aiEnabled: boolean("aiEnabled").default(true).notNull(), // Can AI agent execute this?
  humanApprovalRequired: boolean("humanApprovalRequired").default(false).notNull(),
  automationLevel: varchar("automationLevel", { length: 20 }).default("semi"), // full, semi, manual

  // Metadata
  metadata: jsonb("metadata"),
  lastExecutedAt: timestamp("lastExecutedAt"),
  executionCount: integer("executionCount").default(0).notNull(),
  successRate: decimal("successRate", { precision: 5, scale: 2 }),

  // Timestamps
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SopDocument = typeof sopDocuments.$inferSelect;
export type InsertSopDocument = typeof sopDocuments.$inferInsert;

/**
 * SOP Steps
 * Individual steps within an SOP
 */
export const sopSteps = pgTable("sop_steps", {
  id: serial("id").primaryKey(),
  sopId: integer("sopId").references(() => sopDocuments.id, { onDelete: "cascade" }).notNull(),

  // Step details
  stepNumber: integer("stepNumber").notNull(), // Order within SOP
  title: varchar("title", { length: 255 }).notNull(),
  instructions: text("instructions").notNull(), // Detailed step instructions

  // Action type
  actionType: varchar("actionType", { length: 30 }).default("manual").notNull(), // manual, browser, api, webhook, ai_decision
  actionConfig: jsonb("actionConfig"), // Configuration for automated actions

  // Conditional logic
  conditions: jsonb("conditions"), // Conditions that must be met to execute
  alternatives: jsonb("alternatives"), // Alternative actions based on conditions

  // Validation
  expectedOutcome: text("expectedOutcome"), // What should happen if step succeeds
  validationCriteria: jsonb("validationCriteria"), // How to verify success
  errorHandling: jsonb("errorHandling"), // What to do on failure

  // Resources
  resources: jsonb("resources"), // Links, tools, templates needed
  examples: jsonb("examples"), // Example scenarios
  tips: text("tips"), // Best practices and tips

  // Timing
  estimatedDuration: integer("estimatedDuration"), // Minutes
  timeout: integer("timeout"), // Max seconds before timeout

  // Dependencies
  dependsOn: jsonb("dependsOn"), // Array of step IDs this depends on

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SopStep = typeof sopSteps.$inferSelect;
export type InsertSopStep = typeof sopSteps.$inferInsert;

/**
 * SOP Versions
 * Version history for SOP documents
 */
export const sopVersions = pgTable("sop_versions", {
  id: serial("id").primaryKey(),
  sopId: integer("sopId").references(() => sopDocuments.id, { onDelete: "cascade" }).notNull(),
  userId: integer("userId").references(() => users.id).notNull(), // Who made the change

  version: integer("version").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),

  // Full snapshot of the SOP at this version
  snapshot: jsonb("snapshot").notNull(), // Complete SOP data including steps

  // Change tracking
  changeType: varchar("changeType", { length: 20 }).notNull(), // created, updated, published, archived
  changeSummary: text("changeSummary"),
  changes: jsonb("changes"), // Detailed diff from previous version

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SopVersion = typeof sopVersions.$inferSelect;
export type InsertSopVersion = typeof sopVersions.$inferInsert;

/**
 * SOP Executions
 * Track each time an SOP is executed (by human or AI)
 */
export const sopExecutions = pgTable("sop_executions", {
  id: serial("id").primaryKey(),
  sopId: integer("sopId").references(() => sopDocuments.id).notNull(),
  userId: integer("userId").references(() => users.id).notNull(),

  // Execution context
  executorType: varchar("executorType", { length: 20 }).notNull(), // human, ai_agent, hybrid
  agentSessionId: integer("agentSessionId"), // Link to agent session if AI executed

  // Status tracking
  status: varchar("status", { length: 20 }).default("in_progress").notNull(), // in_progress, completed, failed, aborted
  currentStepIndex: integer("currentStepIndex").default(0).notNull(),

  // Step results
  stepResults: jsonb("stepResults").default("[]").notNull(), // Array of step execution results

  // Context and results
  context: jsonb("context"), // Input context for this execution
  result: jsonb("result"), // Final result/output

  // Feedback
  feedback: text("feedback"), // Human feedback on execution
  rating: integer("rating"), // 1-5 star rating
  issues: jsonb("issues"), // Any issues encountered

  // Timing
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  durationMs: integer("durationMs"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SopExecution = typeof sopExecutions.$inferSelect;
export type InsertSopExecution = typeof sopExecutions.$inferInsert;

// ========================================
// KNOWLEDGE EDIT HISTORY
// ========================================

/**
 * Knowledge Edit History
 * Tracks all changes to knowledge entries for auditability and rollback
 */
export const knowledgeEditHistory = pgTable("knowledge_edit_history", {
  id: serial("id").primaryKey(),
  knowledgeEntryId: integer("knowledgeEntryId").notNull(), // References knowledge_entries.id
  userId: integer("userId").references(() => users.id).notNull(), // Who made the change

  // Change details
  changeType: varchar("changeType", { length: 20 }).notNull(), // created, updated, deleted, restored

  // Previous and new values
  previousContent: text("previousContent"),
  newContent: text("newContent"),
  previousCategory: varchar("previousCategory", { length: 50 }),
  newCategory: varchar("newCategory", { length: 50 }),

  // Full snapshot for rollback
  previousSnapshot: jsonb("previousSnapshot"),
  newSnapshot: jsonb("newSnapshot"),

  // Change reason
  reason: text("reason"), // Why the change was made
  source: varchar("source", { length: 30 }), // manual, ai_suggestion, import, correction

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KnowledgeEditHistory = typeof knowledgeEditHistory.$inferSelect;
export type InsertKnowledgeEditHistory = typeof knowledgeEditHistory.$inferInsert;

// ========================================
// KNOWLEDGE SUGGESTIONS
// ========================================

/**
 * Knowledge Suggestions
 * AI-generated suggestions for adding to the knowledge base
 */
export const knowledgeSuggestions = pgTable("knowledge_suggestions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),

  // Suggestion details
  category: varchar("category", { length: 50 }).notNull(), // workflow, brand_voice, preference, process, technical
  context: text("context").notNull(), // When/where this knowledge applies
  suggestedContent: text("suggestedContent").notNull(), // The suggested knowledge

  // Source information
  sourceType: varchar("sourceType", { length: 30 }).notNull(), // conversation, task_execution, feedback, observation
  sourceId: varchar("sourceId", { length: 100 }), // ID of the source (execution ID, conversation ID, etc.)
  sourceContext: jsonb("sourceContext"), // Additional context from source

  // Confidence and reasoning
  confidence: decimal("confidence", { precision: 3, scale: 2 }).default("0.75").notNull(),
  reasoning: text("reasoning"), // Why this was suggested

  // Review status
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, approved, rejected, merged
  reviewedBy: integer("reviewedBy").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),

  // If approved, link to created knowledge entry
  knowledgeEntryId: integer("knowledgeEntryId"),

  // Duplicate detection
  similarTo: jsonb("similarTo"), // Array of similar existing knowledge entry IDs

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type KnowledgeSuggestion = typeof knowledgeSuggestions.$inferSelect;
export type InsertKnowledgeSuggestion = typeof knowledgeSuggestions.$inferInsert;

/**
 * Knowledge Feedback
 * User feedback on knowledge entries to improve quality
 */
export const knowledgeFeedback = pgTable("knowledge_feedback", {
  id: serial("id").primaryKey(),
  knowledgeEntryId: integer("knowledgeEntryId").notNull(), // References knowledge_entries.id
  userId: integer("userId").references(() => users.id).notNull(),

  // Feedback type
  feedbackType: varchar("feedbackType", { length: 30 }).notNull(), // helpful, outdated, incorrect, unclear, incomplete

  // Details
  comment: text("comment"),
  suggestedCorrection: text("suggestedCorrection"),

  // Context where feedback was given
  executionContext: jsonb("executionContext"), // Context from when this knowledge was used

  // Status
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, reviewed, applied, dismissed
  resolvedBy: integer("resolvedBy").references(() => users.id),
  resolvedAt: timestamp("resolvedAt"),
  resolution: text("resolution"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KnowledgeFeedback = typeof knowledgeFeedback.$inferSelect;
export type InsertKnowledgeFeedback = typeof knowledgeFeedback.$inferInsert;
