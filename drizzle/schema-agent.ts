import { pgTable, serial, text, timestamp, varchar, integer, boolean, jsonb, uuid, decimal } from "drizzle-orm/pg-core";
import { users } from "./schema";

// ========================================
// AGENTIC AI TABLES
// ========================================

/**
 * Agent sessions
 * Persistent agent context and tool history for multi-turn conversations
 * Tracks the full lifecycle of an agent session with context preservation
 */
export const agentSessions = pgTable("agent_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  sessionUuid: uuid("sessionUuid").defaultRandom().notNull().unique(), // UUID for external references
  status: varchar("status", { length: 50 }).default("idle").notNull(), // idle, planning, executing, complete, error, paused
  context: jsonb("context"), // Persistent conversation context and state
  thinkingSteps: jsonb("thinkingSteps").default("[]").notNull(), // Array of agent reasoning steps
  toolHistory: jsonb("toolHistory").default("[]").notNull(), // Complete tool execution history
  plan: jsonb("plan"), // Current execution plan if in planning phase
  currentPhase: varchar("currentPhase", { length: 100 }), // Current execution phase/step
  iterationCount: integer("iterationCount").default(0).notNull(),
  maxIterations: integer("maxIterations").default(100).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgentSession = typeof agentSessions.$inferInsert;

/**
 * Agent executions
 * Task execution tracking with detailed phase and tool execution logs
 * Each execution represents a single task/goal within a session
 */
export const agentExecutions = pgTable("agent_executions", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").references(() => agentSessions.id).notNull(),
  userId: integer("userId").references(() => users.id).notNull(),
  taskDescription: text("taskDescription").notNull(), // User's original task request
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, planning, executing, completed, failed, cancelled
  plan: jsonb("plan"), // Execution plan with phases and steps
  phases: jsonb("phases").default("[]").notNull(), // Array of execution phases
  currentPhaseIndex: integer("currentPhaseIndex").default(0).notNull(),
  thinkingSteps: jsonb("thinkingSteps").default("[]").notNull(), // Agent reasoning log
  toolExecutions: jsonb("toolExecutions").default("[]").notNull(), // Tool call results
  result: jsonb("result"), // Final execution result/output
  error: text("error"), // Error message if execution failed
  iterations: integer("iterations").default(0).notNull(), // Number of iterations performed
  durationMs: integer("durationMs"), // Total execution time in milliseconds
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentExecution = typeof agentExecutions.$inferSelect;
export type InsertAgentExecution = typeof agentExecutions.$inferInsert;

/**
 * Generated projects
 * Tracks webdev projects created by the agent
 * Stores project metadata, tech stack, and deployment information
 */
export const generatedProjects = pgTable("generated_projects", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  executionId: integer("executionId").references(() => agentExecutions.id), // Optional link to execution that created it
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  techStack: varchar("techStack", { length: 50 }).default("react").notNull(), // react, vue, next, svelte, etc.
  features: jsonb("features").default("{}").notNull(), // Project features and configuration
  filesSnapshot: jsonb("filesSnapshot"), // Snapshot of generated files and structure
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, archived, deleted
  devServerPort: integer("devServerPort"), // Port for local dev server
  previewUrl: text("previewUrl"), // Preview deployment URL
  deploymentUrl: text("deploymentUrl"), // Production deployment URL
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedProject = typeof generatedProjects.$inferSelect;
export type InsertGeneratedProject = typeof generatedProjects.$inferInsert;

/**
 * Knowledge entries
 * Agent learning and feedback system
 * Stores learned patterns, preferences, and context for improved future performance
 */
export const knowledgeEntries = pgTable("knowledge_entries", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // workflow, brand_voice, preference, process, technical
  context: text("context").notNull(), // Context/scenario where this knowledge applies
  content: text("content").notNull(), // The actual knowledge/learning content
  examples: jsonb("examples"), // Array of example situations/applications
  confidence: decimal("confidence", { precision: 3, scale: 2 }).default("1.0").notNull(), // Confidence score 0.00-1.00
  usageCount: integer("usageCount").default(0).notNull(), // How many times this knowledge was used
  isActive: boolean("isActive").default(true).notNull(), // Whether this knowledge is currently active
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KnowledgeEntry = typeof knowledgeEntries.$inferSelect;
export type InsertKnowledgeEntry = typeof knowledgeEntries.$inferInsert;

/**
 * Tool executions
 * Analytics and tracking for individual tool calls
 * Provides insights into tool usage patterns and performance
 */
export const toolExecutions = pgTable("tool_executions", {
  id: serial("id").primaryKey(),
  executionId: integer("executionId").references(() => agentExecutions.id).notNull(),
  toolName: varchar("toolName", { length: 100 }).notNull(), // Name of the tool that was executed
  parameters: jsonb("parameters"), // Input parameters passed to the tool
  result: jsonb("result"), // Tool execution result/output
  success: boolean("success").default(true).notNull(), // Whether execution succeeded
  durationMs: integer("durationMs"), // Tool execution time in milliseconds
  error: text("error"), // Error message if execution failed
  executedAt: timestamp("executedAt").defaultNow().notNull(),
});

export type ToolExecution = typeof toolExecutions.$inferSelect;
export type InsertToolExecution = typeof toolExecutions.$inferInsert;
