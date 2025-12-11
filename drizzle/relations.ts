/**
 * Drizzle ORM Relations
 * Defines relationships between database tables
 */

import { relations } from "drizzle-orm";

// Import tables from schema files
import {
  users,
  sessions,
  leads,
  documents,
  jobs,
  integrations,
  scheduledTasks,
  automationTemplates,
  browserSessions,
  automationWorkflows,
  workflowExecutions,
  extractedData,
  userPreferences,
  quizzes,
  quizQuestions,
  quizAttempts,
  apiKeys,
  apiRequestLogs,
} from "./schema";

import {
  scheduledBrowserTasks,
  scheduledTaskExecutions,
} from "./schema-scheduled-tasks";

import {
  documentationSources,
  documentationChunks,
  platformKeywords,
} from "./schema-rag";

import {
  userWebhooks,
  inboundMessages,
  botConversations,
  agencyTasks,
  taskExecutions,
  outboundMessages,
} from "./schema-webhooks";

// ========================================
// USER RELATIONS
// ========================================

export const usersRelations = relations(users, ({ many, one }) => ({
  // Auth
  sessions: many(sessions),

  // Core entities
  documents: many(documents),
  integrations: many(integrations),

  // Browser automation
  browserSessions: many(browserSessions),
  automationWorkflows: many(automationWorkflows),
  workflowExecutions: many(workflowExecutions),
  extractedData: many(extractedData),
  userPreferences: one(userPreferences),

  // Scheduled tasks
  scheduledBrowserTasks: many(scheduledBrowserTasks),

  // Quizzes
  quizzes: many(quizzes),
  quizAttempts: many(quizAttempts),

  // API
  apiKeys: many(apiKeys),
  apiRequestLogs: many(apiRequestLogs),

  // Documentation
  documentationSources: many(documentationSources),

  // Webhooks & Communication
  userWebhooks: many(userWebhooks),
  inboundMessages: many(inboundMessages),
  botConversations: many(botConversations),
  agencyTasks: many(agencyTasks),
  outboundMessages: many(outboundMessages),
}));

// ========================================
// AUTH RELATIONS
// ========================================

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ========================================
// CORE ENTITY RELATIONS
// ========================================

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
}));

// ========================================
// BROWSER AUTOMATION RELATIONS
// ========================================

export const browserSessionsRelations = relations(browserSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [browserSessions.userId],
    references: [users.id],
  }),
  workflowExecutions: many(workflowExecutions),
  extractedData: many(extractedData),
}));

export const automationWorkflowsRelations = relations(automationWorkflows, ({ one, many }) => ({
  user: one(users, {
    fields: [automationWorkflows.userId],
    references: [users.id],
  }),
  executions: many(workflowExecutions),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one }) => ({
  workflow: one(automationWorkflows, {
    fields: [workflowExecutions.workflowId],
    references: [automationWorkflows.id],
  }),
  session: one(browserSessions, {
    fields: [workflowExecutions.sessionId],
    references: [browserSessions.id],
  }),
  user: one(users, {
    fields: [workflowExecutions.userId],
    references: [users.id],
  }),
}));

export const extractedDataRelations = relations(extractedData, ({ one }) => ({
  session: one(browserSessions, {
    fields: [extractedData.sessionId],
    references: [browserSessions.id],
  }),
  execution: one(workflowExecutions, {
    fields: [extractedData.executionId],
    references: [workflowExecutions.id],
  }),
  user: one(users, {
    fields: [extractedData.userId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

// ========================================
// SCHEDULED TASKS RELATIONS
// ========================================

export const scheduledBrowserTasksRelations = relations(scheduledBrowserTasks, ({ one, many }) => ({
  user: one(users, {
    fields: [scheduledBrowserTasks.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [scheduledBrowserTasks.createdBy],
    references: [users.id],
  }),
  modifiedByUser: one(users, {
    fields: [scheduledBrowserTasks.lastModifiedBy],
    references: [users.id],
  }),
  executions: many(scheduledTaskExecutions),
}));

export const scheduledTaskExecutionsRelations = relations(scheduledTaskExecutions, ({ one }) => ({
  task: one(scheduledBrowserTasks, {
    fields: [scheduledTaskExecutions.taskId],
    references: [scheduledBrowserTasks.id],
  }),
}));

// ========================================
// QUIZ RELATIONS
// ========================================

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  user: one(users, {
    fields: [quizzes.userId],
    references: [users.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
  grader: one(users, {
    fields: [quizAttempts.gradedBy],
    references: [users.id],
  }),
}));

// ========================================
// API RELATIONS
// ========================================

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
  requestLogs: many(apiRequestLogs),
}));

export const apiRequestLogsRelations = relations(apiRequestLogs, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiRequestLogs.apiKeyId],
    references: [apiKeys.id],
  }),
  user: one(users, {
    fields: [apiRequestLogs.userId],
    references: [users.id],
  }),
}));

// ========================================
// DOCUMENTATION/RAG RELATIONS
// ========================================

export const documentationSourcesRelations = relations(documentationSources, ({ one, many }) => ({
  user: one(users, {
    fields: [documentationSources.userId],
    references: [users.id],
  }),
  chunks: many(documentationChunks),
}));

export const documentationChunksRelations = relations(documentationChunks, ({ one }) => ({
  source: one(documentationSources, {
    fields: [documentationChunks.sourceId],
    references: [documentationSources.id],
  }),
}));

// ========================================
// WEBHOOK & COMMUNICATION RELATIONS
// ========================================

export const userWebhooksRelations = relations(userWebhooks, ({ one, many }) => ({
  user: one(users, {
    fields: [userWebhooks.userId],
    references: [users.id],
  }),
  inboundMessages: many(inboundMessages),
  outboundMessages: many(outboundMessages),
  botConversations: many(botConversations),
  agencyTasks: many(agencyTasks),
}));

export const inboundMessagesRelations = relations(inboundMessages, ({ one, many }) => ({
  webhook: one(userWebhooks, {
    fields: [inboundMessages.webhookId],
    references: [userWebhooks.id],
  }),
  user: one(users, {
    fields: [inboundMessages.userId],
    references: [users.id],
  }),
  conversation: one(botConversations, {
    fields: [inboundMessages.conversationId],
    references: [botConversations.id],
  }),
  parentMessage: one(inboundMessages, {
    fields: [inboundMessages.parentMessageId],
    references: [inboundMessages.id],
  }),
  childMessages: many(inboundMessages),
  outboundReplies: many(outboundMessages),
}));

export const botConversationsRelations = relations(botConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [botConversations.userId],
    references: [users.id],
  }),
  webhook: one(userWebhooks, {
    fields: [botConversations.webhookId],
    references: [userWebhooks.id],
  }),
  inboundMessages: many(inboundMessages),
  outboundMessages: many(outboundMessages),
  agencyTasks: many(agencyTasks),
}));

export const agencyTasksRelations = relations(agencyTasks, ({ one, many }) => ({
  user: one(users, {
    fields: [agencyTasks.userId],
    references: [users.id],
  }),
  sourceWebhook: one(userWebhooks, {
    fields: [agencyTasks.sourceWebhookId],
    references: [userWebhooks.id],
  }),
  sourceMessage: one(inboundMessages, {
    fields: [agencyTasks.sourceMessageId],
    references: [inboundMessages.id],
  }),
  conversation: one(botConversations, {
    fields: [agencyTasks.conversationId],
    references: [botConversations.id],
  }),
  humanReviewer: one(users, {
    fields: [agencyTasks.humanReviewedBy],
    references: [users.id],
  }),
  blockedByTask: one(agencyTasks, {
    fields: [agencyTasks.blockedBy],
    references: [agencyTasks.id],
  }),
  executions: many(taskExecutions),
  outboundNotifications: many(outboundMessages),
}));

export const taskExecutionsRelations = relations(taskExecutions, ({ one }) => ({
  task: one(agencyTasks, {
    fields: [taskExecutions.taskId],
    references: [agencyTasks.id],
  }),
  triggeredByUser: one(users, {
    fields: [taskExecutions.triggeredByUserId],
    references: [users.id],
  }),
}));

export const outboundMessagesRelations = relations(outboundMessages, ({ one }) => ({
  webhook: one(userWebhooks, {
    fields: [outboundMessages.webhookId],
    references: [userWebhooks.id],
  }),
  user: one(users, {
    fields: [outboundMessages.userId],
    references: [users.id],
  }),
  inboundMessage: one(inboundMessages, {
    fields: [outboundMessages.inboundMessageId],
    references: [inboundMessages.id],
  }),
  task: one(agencyTasks, {
    fields: [outboundMessages.taskId],
    references: [agencyTasks.id],
  }),
  conversation: one(botConversations, {
    fields: [outboundMessages.conversationId],
    references: [botConversations.id],
  }),
}));
