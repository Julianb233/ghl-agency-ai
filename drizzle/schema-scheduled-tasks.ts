/**
 * Scheduled Tasks Schema
 * Database tables for scheduled browser automation tasks
 *
 * TODO: Review and adjust schema based on actual requirements
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
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ========================================
// SCHEDULED BROWSER TASKS TABLES
// ========================================

/**
 * Scheduled browser automation tasks
 * Defines recurring browser automation workflows
 */
export const scheduledBrowserTasks = pgTable("scheduled_browser_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Automation configuration
  automationType: varchar("automationType", { length: 50 }).notNull(), // chat, observe, extract, workflow, custom
  automationConfig: jsonb("automationConfig").notNull(), // Browser automation configuration

  // Scheduling configuration
  scheduleType: varchar("scheduleType", { length: 50 }).notNull(), // daily, weekly, monthly, cron, once
  cronExpression: varchar("cronExpression", { length: 255 }).notNull(),
  timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),

  // Status and execution tracking
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, paused, failed, completed, archived
  nextRun: timestamp("nextRun"),
  lastRun: timestamp("lastRun"),
  lastRunStatus: varchar("lastRunStatus", { length: 50 }), // success, failed, timeout, cancelled
  lastRunError: text("lastRunError"),
  lastRunDuration: integer("lastRunDuration"), // Duration in milliseconds

  // Execution statistics
  executionCount: integer("executionCount").default(0).notNull(),
  successCount: integer("successCount").default(0).notNull(),
  failureCount: integer("failureCount").default(0).notNull(),
  averageDuration: integer("averageDuration").default(0).notNull(), // In milliseconds

  // Retry configuration
  retryOnFailure: boolean("retryOnFailure").default(true).notNull(),
  maxRetries: integer("maxRetries").default(3).notNull(),
  retryDelay: integer("retryDelay").default(60).notNull(), // Delay in seconds

  // Timeout configuration
  timeout: integer("timeout").default(300).notNull(), // Timeout in seconds

  // Notification configuration
  notifyOnSuccess: boolean("notifyOnSuccess").default(false).notNull(),
  notifyOnFailure: boolean("notifyOnFailure").default(true).notNull(),
  notificationChannels: jsonb("notificationChannels"), // Array of notification channel configs

  // History and metadata
  keepExecutionHistory: boolean("keepExecutionHistory").default(true).notNull(),
  maxHistoryRecords: integer("maxHistoryRecords").default(100).notNull(),
  tags: jsonb("tags"), // Array of tags
  metadata: jsonb("metadata"), // Additional task metadata

  // Audit fields
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: integer("createdBy").references(() => users.id).notNull(),
  lastModifiedBy: integer("lastModifiedBy").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Task execution history
 * Records individual executions of scheduled tasks
 */
export const scheduledTaskExecutions = pgTable("scheduled_task_executions", {
  id: serial("id").primaryKey(),
  taskId: integer("taskId")
    .references(() => scheduledBrowserTasks.id, { onDelete: "cascade" })
    .notNull(),

  // Execution details
  status: varchar("status", { length: 50 }).default("queued").notNull(), // queued, running, success, failed, timeout, cancelled
  triggerType: varchar("triggerType", { length: 50 }).notNull(), // scheduled, manual, retry
  attemptNumber: integer("attemptNumber").default(1).notNull(),

  // Timing
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  duration: integer("duration"), // Duration in milliseconds

  // Results
  output: jsonb("output"), // Execution output/results
  error: text("error"), // Error message if failed
  logs: jsonb("logs"), // Execution logs

  // Browser session info
  sessionId: varchar("sessionId", { length: 255 }), // Browserbase session ID
  debugUrl: text("debugUrl"), // Browser debug URL
  recordingUrl: text("recordingUrl"), // Session recording URL

  // Metadata
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ========================================
// TYPE EXPORTS
// ========================================

export type ScheduledBrowserTask = typeof scheduledBrowserTasks.$inferSelect;
export type InsertScheduledBrowserTask = typeof scheduledBrowserTasks.$inferInsert;

export type ScheduledTaskExecution = typeof scheduledTaskExecutions.$inferSelect;
export type InsertScheduledTaskExecution = typeof scheduledTaskExecutions.$inferInsert;

// ========================================
// CRON JOB REGISTRY TABLE
// ========================================

/**
 * Cron job registry
 * Tracks registered cron jobs and their execution status
 */
export const cronJobRegistry = pgTable("cron_job_registry", {
  id: serial("id").primaryKey(),
  taskId: integer("taskId")
    .references(() => scheduledBrowserTasks.id, { onDelete: "cascade" })
    .notNull()
    .unique(),

  // Job identification
  jobId: varchar("jobId", { length: 255 }).notNull().unique(), // Internal cron job ID
  jobName: varchar("jobName", { length: 255 }).notNull(),

  // Schedule info
  cronExpression: varchar("cronExpression", { length: 255 }).notNull(),
  timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),

  // Status
  isRunning: boolean("isRunning").default(false).notNull(),
  lastStartedAt: timestamp("lastStartedAt"),
  lastCompletedAt: timestamp("lastCompletedAt"),
  nextRunAt: timestamp("nextRunAt"),

  // Metadata
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CronJobRegistry = typeof cronJobRegistry.$inferSelect;
export type InsertCronJobRegistry = typeof cronJobRegistry.$inferInsert;
