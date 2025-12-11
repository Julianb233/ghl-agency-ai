/**
 * Alerts Schema
 * Database tables for alert rules, notifications, and delivery
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
// ALERT MANAGEMENT TABLES
// ========================================

/**
 * Alert rules
 * Defines conditions for triggering alerts
 */
export const alertRules = pgTable("alert_rules", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Rule configuration
  ruleType: varchar("ruleType", { length: 50 }).notNull(), // task_failed, task_timeout, execution_slow, consecutive_failures, high_error_rate, task_not_running
  targetType: varchar("targetType", { length: 50 }).default("all_tasks").notNull(), // all_tasks, specific_task, task_group
  targetTaskIds: jsonb("targetTaskIds"), // Array of task IDs if specific_task
  targetTags: jsonb("targetTags"), // Array of tags if task_group
  conditions: jsonb("conditions").notNull(), // Rule-specific conditions

  // Notification configuration
  notificationChannels: jsonb("notificationChannels").notNull(), // Array of channel configs
  cooldownMinutes: integer("cooldownMinutes").default(5).notNull(),
  aggregationEnabled: boolean("aggregationEnabled").default(true).notNull(),
  maxAlertsPerHour: integer("maxAlertsPerHour").default(12).notNull(),

  // Priority and severity
  severity: varchar("severity", { length: 20 }).default("medium").notNull(), // low, medium, high, critical
  priority: integer("priority").default(5).notNull(),

  // Status
  isActive: boolean("isActive").default(true).notNull(),
  isPaused: boolean("isPaused").default(false).notNull(),

  // Rate limiting tracking
  lastAlertSentAt: timestamp("lastAlertSentAt"),
  alertsThisHour: integer("alertsThisHour").default(0).notNull(),
  hourlyResetAt: timestamp("hourlyResetAt"),

  // Audit fields
  createdBy: integer("createdBy").references(() => users.id).notNull(),
  lastModifiedBy: integer("lastModifiedBy").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Alert history
 * Records of triggered alerts
 */
export const alertHistory = pgTable("alert_history", {
  id: serial("id").primaryKey(),
  ruleId: integer("ruleId")
    .references(() => alertRules.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),

  // Context
  taskId: integer("taskId"),
  executionId: integer("executionId"),

  // Alert details
  alertType: varchar("alertType", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message").notNull(),
  details: jsonb("details"), // Additional context

  // Delivery tracking
  channels: jsonb("channels").notNull(), // Channels alert was sent to
  deliveryStatus: jsonb("deliveryStatus"), // Status per channel
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, sent, failed, acknowledged

  // Timestamps
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  acknowledgedBy: integer("acknowledgedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * In-app notifications
 * User notifications displayed in the UI
 */
export const inAppNotifications = pgTable("in_app_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  alertHistoryId: integer("alertHistoryId").references(() => alertHistory.id, { onDelete: "cascade" }),

  // Notification content
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 20 }).default("info").notNull(), // info, warning, error, success
  priority: integer("priority").default(5).notNull(),

  // Status
  isRead: boolean("isRead").default(false).notNull(),
  isDismissed: boolean("isDismissed").default(false).notNull(),

  // Metadata
  metadata: jsonb("metadata"),
  actionUrl: text("actionUrl"),
  actionLabel: varchar("actionLabel", { length: 100 }),

  // Timestamps
  readAt: timestamp("readAt"),
  dismissedAt: timestamp("dismissedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Alert delivery queue
 * Queue for pending alert deliveries (email, slack, etc.)
 */
export const alertDeliveryQueue = pgTable("alert_delivery_queue", {
  id: serial("id").primaryKey(),
  alertHistoryId: integer("alertHistoryId")
    .references(() => alertHistory.id, { onDelete: "cascade" })
    .notNull(),

  // Delivery details
  channel: varchar("channel", { length: 50 }).notNull(), // email, slack, discord, sms, webhook
  destination: text("destination").notNull(), // Email address, webhook URL, phone number, etc.
  payload: jsonb("payload").notNull(), // Notification payload

  // Status
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, sending, sent, failed
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("maxAttempts").default(3).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  error: text("error"),

  // Priority and scheduling
  priority: integer("priority").default(5).notNull(),
  scheduledFor: timestamp("scheduledFor"),

  // Timestamps
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ========================================
// TYPE EXPORTS
// ========================================

export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = typeof alertRules.$inferInsert;

export type AlertHistory = typeof alertHistory.$inferSelect;
export type InsertAlertHistory = typeof alertHistory.$inferInsert;

export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type InsertInAppNotification = typeof inAppNotifications.$inferInsert;

export type AlertDeliveryQueueItem = typeof alertDeliveryQueue.$inferSelect;
export type InsertAlertDeliveryQueueItem = typeof alertDeliveryQueue.$inferInsert;
