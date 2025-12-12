/**
 * Webhooks & Communication Channels Schema
 * Database tables for user-configurable webhooks and communication with the bottleneck bot
 *
 * This schema supports:
 * - Up to 3 configurable webhooks per user (SMS, Email, Custom HTTP)
 * - Inbound message logging from all channels
 * - Task board for agency owner task management
 * - Bot conversation context for human-like interaction
 * - Task execution tracking
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
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ========================================
// USER COMMUNICATION WEBHOOKS
// ========================================

/**
 * User-configurable webhook endpoints
 * Each user can have up to 3 webhooks for different communication channels
 *
 * Supports:
 * - SMS/Twilio webhooks
 * - Email webhooks (for inbound email parsing)
 * - Custom HTTP webhooks (Zapier, Make, n8n, etc.)
 */
export const userWebhooks = pgTable("user_webhooks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),

  // Webhook identity - unique endpoint per user/channel
  webhookToken: uuid("webhookToken").defaultRandom().notNull().unique(), // Unique token for webhook URL
  webhookUrl: text("webhookUrl"), // Generated URL: /api/webhooks/{webhookToken}

  // Channel configuration
  channelType: varchar("channelType", { length: 50 }).notNull(), // sms, email, custom_webhook
  channelName: varchar("channelName", { length: 100 }).notNull(), // User-friendly name
  channelOrder: integer("channelOrder").default(1).notNull(), // 1, 2, or 3 (max 3 per user)

  // Provider-specific configuration (encrypted in production)
  providerConfig: jsonb("providerConfig"), // Twilio SID, email provider config, etc.
  /*
   * For SMS (Twilio): { twilioAccountSid, twilioAuthToken, twilioPhoneNumber }
   * For Email: { inboundEmailAddress, forwardingEnabled, emailProvider }
   * For Custom: { authType: 'none' | 'bearer' | 'api_key' | 'hmac', authConfig: {...} }
   */

  // Outbound configuration (for bot to respond)
  outboundEnabled: boolean("outboundEnabled").default(true).notNull(),
  outboundConfig: jsonb("outboundConfig"), // Config for sending replies
  /*
   * For SMS: { twilioMessagingServiceSid }
   * For Email: { smtpConfig, fromAddress, replyToAddress }
   * For Custom: { webhookUrl, headers, method }
   */

  // Status and activation
  isActive: boolean("isActive").default(true).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(), // Primary channel for notifications

  // Verification
  isVerified: boolean("isVerified").default(false).notNull(),
  verifiedAt: timestamp("verifiedAt"),
  verificationCode: varchar("verificationCode", { length: 10 }), // For channel verification
  verificationCodeExpiresAt: timestamp("verificationCodeExpiresAt"), // Verification code expiry

  // Token security
  tokenExpiresAt: timestamp("tokenExpiresAt"), // Optional token expiration
  tokenRotationRequired: boolean("tokenRotationRequired").default(false), // Force rotation flag

  // HMAC signing for secure webhooks
  secretKey: varchar("secretKey", { length: 64 }), // HMAC signing key for validating inbound webhooks

  // Rate limiting
  rateLimitPerMinute: integer("rateLimitPerMinute").default(30).notNull(),
  rateLimitPerHour: integer("rateLimitPerHour").default(200).notNull(),

  // Statistics
  totalMessagesReceived: integer("totalMessagesReceived").default(0).notNull(),
  totalMessagesSent: integer("totalMessagesSent").default(0).notNull(),
  lastMessageAt: timestamp("lastMessageAt"),

  // Metadata
  metadata: jsonb("metadata"), // Additional channel-specific data
  tags: jsonb("tags"), // User-defined tags

  // Audit
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  // Indexes for common queries
  userIdIdx: index("user_webhooks_user_id_idx").on(table.userId),
  webhookTokenIdx: uniqueIndex("user_webhooks_token_idx").on(table.webhookToken),
  channelTypeIdx: index("user_webhooks_channel_type_idx").on(table.channelType),
  isActiveIdx: index("user_webhooks_is_active_idx").on(table.isActive),
  userChannelIdx: index("user_webhooks_user_channel_idx").on(table.userId, table.channelType),
}));

// ========================================
// INBOUND MESSAGES
// ========================================

/**
 * Inbound messages from all communication channels
 * Logs every message received through webhooks before processing
 */
export const inboundMessages = pgTable("inbound_messages", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhookId").references(() => userWebhooks.id, { onDelete: "cascade" }).notNull(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),

  // Message identity
  externalMessageId: varchar("externalMessageId", { length: 255 }), // Provider's message ID

  // Sender information
  senderIdentifier: varchar("senderIdentifier", { length: 255 }).notNull(), // Phone number, email, webhook source
  senderName: varchar("senderName", { length: 255 }), // Display name if available

  // Message content
  messageType: varchar("messageType", { length: 50 }).notNull(), // text, image, audio, file, structured
  content: text("content").notNull(), // Raw message content
  contentParsed: jsonb("contentParsed"), // Parsed/structured content
  /*
   * Parsed content structure:
   * {
   *   text: string,           // Plain text content
   *   intent: string,         // Detected intent (task, question, update, etc.)
   *   entities: [],           // Extracted entities (dates, names, etc.)
   *   attachments: [],        // File/image references
   *   urgency: 'low' | 'medium' | 'high' | 'critical'
   * }
   */

  // Attachments
  hasAttachments: boolean("hasAttachments").default(false).notNull(),
  attachments: jsonb("attachments"), // Array of attachment URLs/references

  // Processing status
  processingStatus: varchar("processingStatus", { length: 50 }).default("received").notNull(),
  // received, parsing, parsed, creating_task, task_created, responded, failed
  processingError: text("processingError"),

  // Related task (if message created a task)
  taskId: integer("taskId"), // Will reference agencyTasks once created

  // Conversation threading
  conversationId: integer("conversationId"), // References botConversations for context
  isPartOfThread: boolean("isPartOfThread").default(false).notNull(),
  parentMessageId: integer("parentMessageId").references((): any => inboundMessages.id),

  // Provider metadata
  rawPayload: jsonb("rawPayload"), // Original webhook payload for debugging
  providerMetadata: jsonb("providerMetadata"), // Provider-specific metadata

  // Timestamps
  receivedAt: timestamp("receivedAt").defaultNow().notNull(), // When webhook received
  processedAt: timestamp("processedAt"), // When fully processed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  // Indexes for common queries
  webhookIdIdx: index("inbound_messages_webhook_id_idx").on(table.webhookId),
  userIdIdx: index("inbound_messages_user_id_idx").on(table.userId),
  senderIdx: index("inbound_messages_sender_idx").on(table.senderIdentifier),
  statusIdx: index("inbound_messages_status_idx").on(table.processingStatus),
  conversationIdx: index("inbound_messages_conversation_idx").on(table.conversationId),
  receivedAtIdx: index("inbound_messages_received_at_idx").on(table.receivedAt),
  userWebhookIdx: index("inbound_messages_user_webhook_idx").on(table.userId, table.webhookId),
}));

// ========================================
// BOT CONVERSATIONS
// ========================================

/**
 * Bot conversation contexts
 * Tracks ongoing conversations for human-like interaction
 */
export const botConversations = pgTable("bot_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  webhookId: integer("webhookId").references(() => userWebhooks.id, { onDelete: "set null" }),

  // Conversation identity
  conversationUuid: uuid("conversationUuid").defaultRandom().notNull().unique(),
  participantIdentifier: varchar("participantIdentifier", { length: 255 }).notNull(), // Who the user is talking to

  // Conversation state
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, paused, resolved, archived
  topic: varchar("topic", { length: 255 }), // Main topic/subject of conversation

  // Context for AI
  contextSummary: text("contextSummary"), // AI-generated summary of conversation so far
  contextMemory: jsonb("contextMemory"), // Key facts to remember
  /*
   * Context memory structure:
   * {
   *   userName: string,
   *   preferences: {},
   *   recentTasks: [],
   *   importantDates: [],
   *   ongoingProjects: []
   * }
   */

  // Conversation settings
  aiPersonality: varchar("aiPersonality", { length: 50 }).default("professional"), // professional, friendly, concise
  autoCreateTasks: boolean("autoCreateTasks").default(true).notNull(),
  requireConfirmation: boolean("requireConfirmation").default(false).notNull(), // Confirm before creating tasks

  // Statistics
  messageCount: integer("messageCount").default(0).notNull(),
  tasksCreated: integer("tasksCreated").default(0).notNull(),

  // Timestamps
  lastMessageAt: timestamp("lastMessageAt"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  // Indexes for common queries
  userIdIdx: index("bot_conversations_user_id_idx").on(table.userId),
  webhookIdIdx: index("bot_conversations_webhook_id_idx").on(table.webhookId),
  conversationUuidIdx: uniqueIndex("bot_conversations_uuid_idx").on(table.conversationUuid),
  participantIdx: index("bot_conversations_participant_idx").on(table.participantIdentifier),
  statusIdx: index("bot_conversations_status_idx").on(table.status),
  userParticipantIdx: index("bot_conversations_user_participant_idx").on(table.userId, table.participantIdentifier),
}));

// ========================================
// AGENCY TASK BOARD
// ========================================

/**
 * Agency task board
 * Tasks created from webhook communications for the bot to execute
 */
export const agencyTasks = pgTable("agency_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),

  // Task identity
  taskUuid: uuid("taskUuid").defaultRandom().notNull().unique(),

  // Source tracking
  sourceType: varchar("sourceType", { length: 50 }).notNull(), // webhook_sms, webhook_email, webhook_custom, manual, scheduled
  sourceWebhookId: integer("sourceWebhookId").references(() => userWebhooks.id, { onDelete: "set null" }),
  sourceMessageId: integer("sourceMessageId").references(() => inboundMessages.id, { onDelete: "set null" }),
  conversationId: integer("conversationId").references(() => botConversations.id, { onDelete: "set null" }),

  // Task details
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  originalMessage: text("originalMessage"), // The original message that created this task

  // Task categorization
  category: varchar("category", { length: 100 }).default("general"), // ghl_automation, client_work, admin, follow_up, etc.
  taskType: varchar("taskType", { length: 100 }).notNull(), // browser_automation, api_call, notification, reminder, custom

  // Priority and urgency
  priority: varchar("priority", { length: 20 }).default("medium").notNull(), // low, medium, high, critical
  urgency: varchar("urgency", { length: 20 }).default("normal").notNull(), // normal, soon, urgent, immediate

  // Status workflow
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  // pending, queued, in_progress, waiting_input, completed, failed, cancelled, deferred
  statusReason: text("statusReason"), // Reason for current status

  // Assignment
  assignedToBot: boolean("assignedToBot").default(true).notNull(), // Is this for the bot to execute?
  requiresHumanReview: boolean("requiresHumanReview").default(false).notNull(),
  humanReviewedBy: integer("humanReviewedBy").references(() => users.id, { onDelete: "set null" }),
  humanReviewedAt: timestamp("humanReviewedAt"),

  // Execution configuration
  executionType: varchar("executionType", { length: 50 }).default("automatic"), // automatic, manual_trigger, scheduled
  executionConfig: jsonb("executionConfig"), // Configuration for task execution
  /*
   * Execution config structure:
   * {
   *   workflowId: number,       // If using existing workflow
   *   automationSteps: [],      // Direct automation steps
   *   apiEndpoint: string,      // For API call tasks
   *   browserActions: [],       // Stagehand browser actions
   *   retryCount: number,
   *   timeout: number
   * }
   */

  // Scheduling
  scheduledFor: timestamp("scheduledFor"), // When to execute (null = ASAP)
  deadline: timestamp("deadline"), // Must complete by

  // Dependencies
  dependsOn: jsonb("dependsOn"), // Array of task IDs this depends on
  blockedBy: integer("blockedBy").references((): any => agencyTasks.id, { onDelete: "set null" }),

  // Results
  result: jsonb("result"), // Execution result
  resultSummary: text("resultSummary"), // Human-readable result summary

  // Error handling
  lastError: text("lastError"),
  errorCount: integer("errorCount").default(0).notNull(),
  maxRetries: integer("maxRetries").default(3).notNull(),

  // Notifications
  notifyOnComplete: boolean("notifyOnComplete").default(true).notNull(),
  notifyOnFailure: boolean("notifyOnFailure").default(true).notNull(),
  notificationsSent: jsonb("notificationsSent"), // Log of sent notifications

  // Tags and metadata
  tags: jsonb("tags"), // User-defined tags
  metadata: jsonb("metadata"), // Additional task data

  // Timestamps
  queuedAt: timestamp("queuedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  // Indexes for common queries
  userIdIdx: index("agency_tasks_user_id_idx").on(table.userId),
  taskUuidIdx: uniqueIndex("agency_tasks_uuid_idx").on(table.taskUuid),
  statusIdx: index("agency_tasks_status_idx").on(table.status),
  priorityIdx: index("agency_tasks_priority_idx").on(table.priority),
  taskTypeIdx: index("agency_tasks_task_type_idx").on(table.taskType),
  scheduledForIdx: index("agency_tasks_scheduled_for_idx").on(table.scheduledFor),
  conversationIdIdx: index("agency_tasks_conversation_id_idx").on(table.conversationId),
  // Composite indexes for common query patterns
  userStatusIdx: index("agency_tasks_user_status_idx").on(table.userId, table.status),
  pendingBotTasksIdx: index("agency_tasks_pending_bot_idx").on(table.status, table.assignedToBot, table.scheduledFor),
}));

// ========================================
// TASK EXECUTIONS
// ========================================

/**
 * Task execution history
 * Detailed log of each task execution attempt
 */
export const taskExecutions = pgTable("task_executions", {
  id: serial("id").primaryKey(),
  taskId: integer("taskId").references(() => agencyTasks.id, { onDelete: "cascade" }).notNull(),

  // Execution identity
  executionUuid: uuid("executionUuid").defaultRandom().notNull().unique(),
  attemptNumber: integer("attemptNumber").default(1).notNull(),

  // Execution details
  status: varchar("status", { length: 50 }).default("started").notNull(),
  // started, running, success, failed, timeout, cancelled, needs_input

  // Trigger
  triggeredBy: varchar("triggeredBy", { length: 50 }).notNull(), // automatic, manual, retry, scheduled
  triggeredByUserId: integer("triggeredByUserId").references(() => users.id, { onDelete: "set null" }),

  // Browser session (if applicable)
  browserSessionId: varchar("browserSessionId", { length: 255 }), // Browserbase session
  debugUrl: text("debugUrl"),
  recordingUrl: text("recordingUrl"),

  // Execution steps
  stepsTotal: integer("stepsTotal").default(0).notNull(),
  stepsCompleted: integer("stepsCompleted").default(0).notNull(),
  currentStep: varchar("currentStep", { length: 255 }),
  stepResults: jsonb("stepResults"), // Results from each step

  // Output
  output: jsonb("output"), // Final execution output
  logs: jsonb("logs"), // Execution logs array
  screenshots: jsonb("screenshots"), // Screenshots taken during execution

  // Errors
  error: text("error"),
  errorCode: varchar("errorCode", { length: 100 }),
  errorStack: text("errorStack"),

  // Performance
  duration: integer("duration"), // Duration in milliseconds
  resourceUsage: jsonb("resourceUsage"), // CPU, memory, etc.

  // Timestamps
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  // Indexes for common queries
  taskIdIdx: index("task_executions_task_id_idx").on(table.taskId),
  executionUuidIdx: uniqueIndex("task_executions_uuid_idx").on(table.executionUuid),
  statusIdx: index("task_executions_status_idx").on(table.status),
  startedAtIdx: index("task_executions_started_at_idx").on(table.startedAt),
  browserSessionIdx: index("task_executions_browser_session_idx").on(table.browserSessionId),
}));

// ========================================
// OUTBOUND MESSAGES
// ========================================

/**
 * Outbound messages sent by the bot
 * Tracks all messages sent back through webhooks
 */
export const outboundMessages = pgTable("outbound_messages", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhookId").references(() => userWebhooks.id, { onDelete: "cascade" }).notNull(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),

  // Related entities
  inboundMessageId: integer("inboundMessageId").references(() => inboundMessages.id, { onDelete: "set null" }),
  taskId: integer("taskId").references(() => agencyTasks.id, { onDelete: "set null" }),
  conversationId: integer("conversationId").references(() => botConversations.id, { onDelete: "set null" }),

  // Message content
  messageType: varchar("messageType", { length: 50 }).notNull(), // reply, notification, task_update, confirmation
  content: text("content").notNull(),

  // Recipient
  recipientIdentifier: varchar("recipientIdentifier", { length: 255 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),

  // Delivery status
  deliveryStatus: varchar("deliveryStatus", { length: 50 }).default("pending").notNull(),
  // pending, sent, delivered, read, failed, bounced
  deliveryError: text("deliveryError"),
  externalMessageId: varchar("externalMessageId", { length: 255 }), // Provider's message ID

  // Provider details
  providerResponse: jsonb("providerResponse"),

  // Timestamps
  scheduledFor: timestamp("scheduledFor"),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  // Indexes for common queries
  webhookIdIdx: index("outbound_messages_webhook_id_idx").on(table.webhookId),
  userIdIdx: index("outbound_messages_user_id_idx").on(table.userId),
  taskIdIdx: index("outbound_messages_task_id_idx").on(table.taskId),
  conversationIdIdx: index("outbound_messages_conversation_id_idx").on(table.conversationId),
  deliveryStatusIdx: index("outbound_messages_delivery_status_idx").on(table.deliveryStatus),
  scheduledForIdx: index("outbound_messages_scheduled_for_idx").on(table.scheduledFor),
  pendingMessagesIdx: index("outbound_messages_pending_idx").on(table.deliveryStatus, table.scheduledFor),
}));

// ========================================
// WEBHOOK DELIVERY LOGS
// ========================================

/**
 * Webhook delivery logs
 * Comprehensive logging for webhook delivery attempts with retry tracking
 */
export const webhookLogs = pgTable("webhook_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: text("webhookId").notNull(), // References webhook ID from userPreferences
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),

  // Event details
  event: varchar("event", { length: 100 }).notNull(), // Event type that triggered webhook

  // Request details
  url: text("url").notNull(), // Webhook endpoint URL
  method: varchar("method", { length: 10 }).default("POST").notNull(), // HTTP method
  requestHeaders: jsonb("requestHeaders"), // Request headers sent
  requestBody: jsonb("requestBody"), // Payload sent to webhook

  // Response details
  responseStatus: integer("responseStatus"), // HTTP status code
  responseBody: text("responseBody"), // Response body from webhook
  responseTime: integer("responseTime"), // Response time in milliseconds

  // Status and retry tracking
  status: varchar("status", { length: 50 }).notNull(), // pending, success, failed, retrying, permanently_failed
  attempts: integer("attempts").default(1).notNull(), // Number of delivery attempts
  nextRetryAt: timestamp("nextRetryAt"), // When to retry next (null if not retrying)

  // Error tracking
  error: text("error"), // Error message if failed
  errorCode: varchar("errorCode", { length: 100 }), // Error code for categorization

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(), // When webhook was triggered
  completedAt: timestamp("completedAt"), // When delivery completed (success or permanent failure)
}, (table) => ({
  // Indexes for common queries
  webhookIdIdx: index("webhook_logs_webhook_id_idx").on(table.webhookId),
  userIdIdx: index("webhook_logs_user_id_idx").on(table.userId),
  statusIdx: index("webhook_logs_status_idx").on(table.status),
  eventIdx: index("webhook_logs_event_idx").on(table.event),
  createdAtIdx: index("webhook_logs_created_at_idx").on(table.createdAt),
  nextRetryAtIdx: index("webhook_logs_next_retry_at_idx").on(table.nextRetryAt),
  // Composite indexes for common query patterns
  userWebhookIdx: index("webhook_logs_user_webhook_idx").on(table.userId, table.webhookId),
  statusRetryIdx: index("webhook_logs_status_retry_idx").on(table.status, table.nextRetryAt),
  userStatusIdx: index("webhook_logs_user_status_idx").on(table.userId, table.status),
}));

// ========================================
// TYPE EXPORTS
// ========================================

export type UserWebhook = typeof userWebhooks.$inferSelect;
export type InsertUserWebhook = typeof userWebhooks.$inferInsert;

export type InboundMessage = typeof inboundMessages.$inferSelect;
export type InsertInboundMessage = typeof inboundMessages.$inferInsert;

export type BotConversation = typeof botConversations.$inferSelect;
export type InsertBotConversation = typeof botConversations.$inferInsert;

export type AgencyTask = typeof agencyTasks.$inferSelect;
export type InsertAgencyTask = typeof agencyTasks.$inferInsert;

export type TaskExecution = typeof taskExecutions.$inferSelect;
export type InsertTaskExecution = typeof taskExecutions.$inferInsert;

export type OutboundMessage = typeof outboundMessages.$inferSelect;
export type InsertOutboundMessage = typeof outboundMessages.$inferInsert;

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;
