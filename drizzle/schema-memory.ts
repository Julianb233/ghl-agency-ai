/**
 * Memory & Learning System Database Schema
 * Provides long-term user memory, checkpointing, and learning capabilities
 */

import { pgTable, serial, text, integer, timestamp, jsonb, real, index, varchar, boolean } from "drizzle-orm/pg-core";
import { users } from "./schema";

/**
 * User Memory Table - Long-term storage of user preferences and learned patterns
 * Stores persistent user-specific information across sessions
 */
export const userMemory = pgTable("user_memory", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),

  // User Preferences
  preferences: jsonb("preferences").default({
    actionSpeed: 'normal',
    approvalRequired: true,
    favoriteStrategies: [],
    autoApprovePatterns: [], // Patterns that user consistently approves
    defaultTimeout: 30000,
    maxRetries: 3,
  }).notNull(),

  // Task History and Success Metrics
  taskHistory: jsonb("taskHistory").default([]).notNull(), // Array of task execution summaries

  // Learned Patterns (GHL selectors, workflows, etc.)
  learnedPatterns: jsonb("learnedPatterns").default({
    ghlSelectors: {}, // Cached selectors by element type
    commonWorkflows: [], // Workflow patterns that work well
    errorRecovery: [], // Successful error recovery strategies
    customCommands: [], // User-defined command shortcuts
  }).notNull(),

  // Feedback and Corrections
  userCorrections: jsonb("userCorrections").default([]).notNull(), // Array of user corrections

  // Statistics
  stats: jsonb("stats").default({
    totalExecutions: 0,
    successfulExecutions: 0,
    avgExecutionTime: 0,
    mostUsedTasks: {},
    preferredApproaches: {},
  }).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_memory_user_id_idx").on(table.userId),
}));

/**
 * Execution Checkpoints Table - For resuming failed or interrupted executions
 * Stores execution state at various points for recovery
 */
export const executionCheckpoints = pgTable("execution_checkpoints", {
  id: serial("id").primaryKey(),
  checkpointId: varchar("checkpointId", { length: 255 }).notNull().unique(),

  // Execution Context
  executionId: integer("executionId").notNull(), // Reference to execution
  userId: integer("userId").references(() => users.id).notNull(),

  // Phase Information
  phaseId: integer("phaseId"), // Current phase ID
  phaseName: text("phaseName"), // Current phase name
  stepIndex: integer("stepIndex").default(0).notNull(), // Current step index within phase

  // Completed Work
  completedSteps: jsonb("completedSteps").default([]).notNull(), // Array of completed step IDs/names
  completedPhases: jsonb("completedPhases").default([]).notNull(), // Array of completed phase IDs

  // Partial Results
  partialResults: jsonb("partialResults").default({}).notNull(), // Intermediate results
  extractedData: jsonb("extractedData").default({}).notNull(), // Data extracted so far

  // Session State (for browser-based executions)
  sessionState: jsonb("sessionState").default({
    url: null,
    cookies: [],
    localStorage: {},
    sessionStorage: {},
    authenticatedAs: null,
  }),

  // Browser Context (for Stagehand/Playwright)
  browserContext: jsonb("browserContext").default({
    pageState: null,
    domSnapshot: null, // Optional: lightweight DOM snapshot
    screenshotUrl: null, // S3 URL to checkpoint screenshot
  }),

  // Error Context (if checkpoint was due to error)
  errorInfo: jsonb("errorInfo"),

  // Checkpoint Metadata
  checkpointReason: varchar("checkpointReason", { length: 100 }), // 'error', 'manual', 'auto', 'phase_complete'
  canResume: boolean("canResume").default(true).notNull(),
  resumeCount: integer("resumeCount").default(0).notNull(), // How many times resumed from this checkpoint

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // Checkpoint expiration (auto-cleanup old checkpoints)
}, (table) => ({
  checkpointIdIdx: index("execution_checkpoint_id_idx").on(table.checkpointId),
  executionIdIdx: index("execution_checkpoint_execution_id_idx").on(table.executionId),
  userIdIdx: index("execution_checkpoint_user_id_idx").on(table.userId),
  createdAtIdx: index("execution_checkpoint_created_at_idx").on(table.createdAt),
  expiresAtIdx: index("execution_checkpoint_expires_at_idx").on(table.expiresAt),
}));

/**
 * Task Success Patterns Table - Stores successful task execution patterns for reuse
 * Links to reasoning patterns for intelligent pattern matching
 */
export const taskSuccessPatterns = pgTable("task_success_patterns", {
  id: serial("id").primaryKey(),
  patternId: varchar("patternId", { length: 255 }).notNull().unique(),

  userId: integer("userId").references(() => users.id).notNull(),

  // Task Identification
  taskType: varchar("taskType", { length: 100 }).notNull(), // e.g., 'ghl_contact_create', 'ghl_opportunity_update'
  taskName: text("taskName"), // Human-readable task name

  // Success Pattern
  successfulApproach: jsonb("successfulApproach").notNull(), // The approach that worked
  selectors: jsonb("selectors").default({}), // Successful CSS/XPath selectors
  workflow: jsonb("workflow").default([]), // Step-by-step workflow that succeeded

  // Context & Conditions
  contextConditions: jsonb("contextConditions").default({}), // When this pattern applies
  requiredState: jsonb("requiredState").default({}), // Required state for pattern to work

  // Performance Metrics
  avgExecutionTime: real("avgExecutionTime"), // Average execution time in ms
  successRate: real("successRate").default(1.0).notNull(),
  usageCount: integer("usageCount").default(1).notNull(),

  // Learning & Adaptation
  confidence: real("confidence").default(0.8).notNull(),
  adaptations: jsonb("adaptations").default([]), // How pattern was adapted over time

  // Links to reasoning patterns
  reasoningPatternId: varchar("reasoningPatternId", { length: 255 }), // Link to reasoning_patterns table

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
}, (table) => ({
  userIdIdx: index("task_success_user_id_idx").on(table.userId),
  taskTypeIdx: index("task_success_task_type_idx").on(table.taskType),
  successRateIdx: index("task_success_success_rate_idx").on(table.successRate),
  confidenceIdx: index("task_success_confidence_idx").on(table.confidence),
}));

/**
 * User Feedback Table - Stores explicit user feedback for learning
 */
export const userFeedback = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  feedbackId: varchar("feedbackId", { length: 255 }).notNull().unique(),

  userId: integer("userId").references(() => users.id).notNull(),
  executionId: integer("executionId"), // Related execution

  // Feedback Type
  feedbackType: varchar("feedbackType", { length: 50 }).notNull(), // 'correction', 'approval', 'rejection', 'suggestion'

  // What was wrong/right
  originalAction: jsonb("originalAction").notNull(),
  correctedAction: jsonb("correctedAction"), // User's correction (if applicable)

  // Context
  context: jsonb("context").default({}),

  // Sentiment & Impact
  sentiment: varchar("sentiment", { length: 20 }), // 'positive', 'negative', 'neutral'
  impact: varchar("impact", { length: 20 }), // 'critical', 'important', 'minor'

  // Processing
  processed: boolean("processed").default(false).notNull(),
  appliedToPattern: boolean("appliedToPattern").default(false).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("user_feedback_user_id_idx").on(table.userId),
  executionIdIdx: index("user_feedback_execution_id_idx").on(table.executionId),
  processedIdx: index("user_feedback_processed_idx").on(table.processed),
  feedbackTypeIdx: index("user_feedback_type_idx").on(table.feedbackType),
}));

/**
 * Workflow Pattern Library - Pre-built and learned workflow patterns
 */
export const workflowPatterns = pgTable("workflow_patterns", {
  id: serial("id").primaryKey(),
  patternId: varchar("patternId", { length: 255 }).notNull().unique(),

  // Pattern Identification
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // e.g., 'ghl', 'sales', 'automation'

  // Pattern Definition
  pattern: jsonb("pattern").notNull(), // The workflow pattern definition
  variables: jsonb("variables").default([]), // Required variables
  conditions: jsonb("conditions").default({}), // When to use this pattern

  // Ownership & Visibility
  userId: integer("userId").references(() => users.id), // null = system pattern
  isPublic: boolean("isPublic").default(false).notNull(), // Can other users use it?
  isSystemPattern: boolean("isSystemPattern").default(false).notNull(),

  // Performance Metrics
  usageCount: integer("usageCount").default(0).notNull(),
  successRate: real("successRate").default(1.0).notNull(),
  avgExecutionTime: real("avgExecutionTime"),

  // Metadata
  tags: jsonb("tags").default([]),
  metadata: jsonb("metadata").default({}),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
}, (table) => ({
  userIdIdx: index("workflow_pattern_user_id_idx").on(table.userId),
  categoryIdx: index("workflow_pattern_category_idx").on(table.category),
  isPublicIdx: index("workflow_pattern_public_idx").on(table.isPublic),
  isSystemIdx: index("workflow_pattern_system_idx").on(table.isSystemPattern),
}));

// Export types
export type UserMemory = typeof userMemory.$inferSelect;
export type InsertUserMemory = typeof userMemory.$inferInsert;

export type ExecutionCheckpoint = typeof executionCheckpoints.$inferSelect;
export type InsertExecutionCheckpoint = typeof executionCheckpoints.$inferInsert;

export type TaskSuccessPattern = typeof taskSuccessPatterns.$inferSelect;
export type InsertTaskSuccessPattern = typeof taskSuccessPatterns.$inferInsert;

export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = typeof userFeedback.$inferInsert;

export type WorkflowPattern = typeof workflowPatterns.$inferSelect;
export type InsertWorkflowPattern = typeof workflowPatterns.$inferInsert;
