import { pgTable, serial, text, timestamp, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).unique(),
  googleId: varchar("googleId", { length: 64 }).unique(),
  password: text("password"), // Hashed password for email/password login
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  suspendedAt: timestamp("suspendedAt"), // When the user account was suspended (null = active)
  suspensionReason: text("suspensionReason"), // Reason for account suspension
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * User business profiles for onboarding data collection
 * Stores business info for sales opportunities and upsells
 */
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull().unique(),
  companyName: text("companyName"),
  industry: varchar("industry", { length: 100 }),
  monthlyRevenue: varchar("monthlyRevenue", { length: 50 }), // e.g. "0-10k", "10k-50k", "50k-100k", "100k+"
  employeeCount: varchar("employeeCount", { length: 50 }), // e.g. "1-5", "6-20", "21-50", "50+"
  website: text("website"),
  phone: varchar("phone", { length: 30 }),
  goals: jsonb("goals"), // Array of user goals/pain points
  currentTools: jsonb("currentTools"), // Array of current tools/software they use
  referralSource: varchar("referralSource", { length: 100 }), // How they heard about us
  ghlApiKey: text("ghlApiKey"), // Encrypted GoHighLevel API key
  notes: text("notes"), // Any additional notes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

// Note: The comprehensive leads table is defined in schema-lead-enrichment.ts
// and re-exported below. This basic version is kept for reference only.
// export const leads = pgTable("leads", { ... });

/**
 * Client profiles for mission context
 * Stores detailed client information used by AI agents for context-aware operations
 */
export const clientProfiles = pgTable("client_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  name: text("name").notNull(), // Client/business name
  subaccountName: text("subaccountName"), // GHL subaccount name
  subaccountId: text("subaccountId"), // GHL subaccount ID
  brandVoice: text("brandVoice"), // Brand voice description (e.g., "Professional, Empathetic")
  primaryGoal: text("primaryGoal"), // Primary business goal (e.g., "Increase Lead Conversion")
  website: text("website"), // Client website URL
  seoConfig: jsonb("seoConfig"), // SEO configuration (title, meta, keywords, robots.txt)
  assets: jsonb("assets"), // Array of asset metadata (logos, images, etc.)
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ClientProfile = typeof clientProfiles.$inferSelect;
export type InsertClientProfile = typeof clientProfiles.$inferInsert;

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: serial("userId").references(() => users.id),
  name: text("name").notNull(),
  url: text("url").notNull(), // S3 URL
  type: varchar("type", { length: 50 }), // pdf, docx, txt
  size: varchar("size", { length: 20 }),
  embeddingId: varchar("embeddingId", { length: 128 }), // Vector DB ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // email_sync, voice_call, seo_audit
  status: varchar("status", { length: 50 }).default("pending"), // pending, processing, completed, failed
  payload: text("payload"), // JSON string of job data
  result: text("result"), // JSON string of result
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  userId: serial("userId").references(() => users.id),
  service: varchar("service", { length: 50 }).notNull(), // gmail, outlook, twilio, stripe, etc.
  accessToken: text("accessToken"), // Encrypted OAuth access token
  refreshToken: text("refreshToken"), // Encrypted OAuth refresh token
  expiresAt: timestamp("expiresAt"), // Token expiration
  metadata: text("metadata"), // JSON string for service-specific data
  isActive: varchar("isActive", { length: 10 }).default("true"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// Lead types are defined in schema-lead-enrichment.ts and re-exported below

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;
export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;

export const scheduledTasks = pgTable("scheduled_tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  schedule: text("schedule").notNull(), // Cron expression or human readable
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, paused
  lastRun: timestamp("lastRun"),
  nextRun: timestamp("nextRun"),
  config: text("config"), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const automationTemplates = pgTable("automation_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  steps: text("steps").notNull(), // JSON string of Stagehand steps
  category: varchar("category", { length: 50 }).default("General"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type InsertScheduledTask = typeof scheduledTasks.$inferInsert;

export type AutomationTemplate = typeof automationTemplates.$inferSelect;
export type InsertAutomationTemplate = typeof automationTemplates.$inferInsert;

// ========================================
// AI BROWSER INTEGRATION TABLES
// ========================================

/**
 * Browserbase session metadata
 * Tracks browser sessions created via Browserbase API
 */
export const browserSessions = pgTable("browser_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  sessionId: varchar("sessionId", { length: 128 }).notNull().unique(), // Browserbase session ID
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, completed, failed, expired
  url: text("url"), // Current or last visited URL
  projectId: varchar("projectId", { length: 128 }), // Browserbase project ID
  debugUrl: text("debugUrl"), // Live debug URL
  recordingUrl: text("recordingUrl"), // Session recording URL
  metadata: jsonb("metadata"), // Additional session data
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type BrowserSession = typeof browserSessions.$inferSelect;
export type InsertBrowserSession = typeof browserSessions.$inferInsert;

/**
 * Automation workflow definitions
 * Stores reusable automation workflows created by users
 */
export const automationWorkflows = pgTable("automation_workflows", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  steps: jsonb("steps").notNull(), // Array of Stagehand automation steps
  category: varchar("category", { length: 50 }).default("custom"),
  isTemplate: boolean("isTemplate").default(false).notNull(), // Public template or private workflow
  tags: jsonb("tags"), // Array of tags for categorization
  version: integer("version").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  executionCount: integer("executionCount").default(0).notNull(),
  lastExecutedAt: timestamp("lastExecutedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AutomationWorkflow = typeof automationWorkflows.$inferSelect;
export type InsertAutomationWorkflow = typeof automationWorkflows.$inferInsert;

/**
 * Workflow execution tracking
 * Records each workflow run with status and results
 */
export const workflowExecutions = pgTable("workflow_executions", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflowId").references(() => automationWorkflows.id).notNull(),
  sessionId: integer("sessionId").references(() => browserSessions.id),
  userId: integer("userId").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, running, completed, failed, cancelled
  input: jsonb("input"), // Input parameters for this execution
  output: jsonb("output"), // Results/output from execution
  error: text("error"), // Error message if failed
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  duration: integer("duration"), // Execution time in milliseconds
  stepResults: jsonb("stepResults"), // Results from each step
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = typeof workflowExecutions.$inferInsert;

/**
 * Extracted web data
 * Stores data extracted from web pages during automation
 */
export const extractedData = pgTable("extracted_data", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").references(() => browserSessions.id),
  executionId: integer("executionId").references(() => workflowExecutions.id),
  userId: integer("userId").references(() => users.id).notNull(),
  url: text("url").notNull(), // Source URL
  dataType: varchar("dataType", { length: 50 }).notNull(), // text, image, table, form, link, custom
  selector: text("selector"), // CSS selector or XPath used
  data: jsonb("data").notNull(), // Extracted data payload
  metadata: jsonb("metadata"), // Additional context (screenshot, page title, etc.)
  tags: jsonb("tags"), // User-defined tags for organization
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExtractedData = typeof extractedData.$inferSelect;
export type InsertExtractedData = typeof extractedData.$inferInsert;

/**
 * User preferences for AI browser
 * Stores user-specific defaults and settings
 */
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull().unique(),
  defaultBrowserConfig: jsonb("defaultBrowserConfig"), // Default Browserbase config
  defaultWorkflowSettings: jsonb("defaultWorkflowSettings"), // Default automation settings
  notifications: jsonb("notifications"), // Notification preferences
  apiKeys: jsonb("apiKeys"), // Encrypted API keys for integrations
  theme: varchar("theme", { length: 20 }).default("light"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

// ========================================
// QUIZ SYSTEM TABLES
// ========================================

/**
 * Quiz documents
 * Top-level quiz/assessment definitions
 */
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id), // Creator/owner of quiz
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"),
  difficulty: varchar("difficulty", { length: 20 }).default("medium"), // easy, medium, hard
  timeLimit: integer("timeLimit"), // Time limit in minutes (null = no limit)
  passingScore: integer("passingScore").default(70), // Percentage required to pass
  isPublished: boolean("isPublished").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  tags: jsonb("tags"), // Array of tags
  metadata: jsonb("metadata"), // Additional quiz settings (randomize, show answers, etc.)
  attemptsAllowed: integer("attemptsAllowed"), // Max attempts per user (null = unlimited)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  publishedAt: timestamp("publishedAt"),
});

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = typeof quizzes.$inferInsert;

/**
 * Quiz questions
 * Individual questions belonging to quizzes
 */
export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quizId").references(() => quizzes.id).notNull(),
  questionText: text("questionText").notNull(),
  questionType: varchar("questionType", { length: 30 }).notNull(), // multiple_choice, true_false, short_answer, essay
  options: jsonb("options"), // Array of answer options for multiple choice
  correctAnswer: jsonb("correctAnswer"), // Correct answer(s) - can be string, array, or object
  points: integer("points").default(1).notNull(),
  order: integer("order").notNull(), // Question order in quiz
  explanation: text("explanation"), // Explanation shown after answer
  hint: text("hint"), // Optional hint for question
  metadata: jsonb("metadata"), // Additional question settings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = typeof quizQuestions.$inferInsert;

/**
 * Quiz attempts
 * Tracks user quiz submissions and results
 */
export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  quizId: integer("quizId").references(() => quizzes.id).notNull(),
  userId: integer("userId").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).default("in_progress").notNull(), // in_progress, submitted, graded
  answers: jsonb("answers").notNull(), // Array of user answers with questionId mapping
  score: integer("score"), // Total score achieved
  percentage: integer("percentage"), // Score as percentage
  passed: boolean("passed"), // Whether user passed based on passingScore
  timeSpent: integer("timeSpent"), // Time spent in minutes
  attemptNumber: integer("attemptNumber").notNull(), // Which attempt this is for the user
  feedback: text("feedback"), // Optional instructor feedback
  gradedBy: integer("gradedBy").references(() => users.id), // User who graded (if manual grading)
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  submittedAt: timestamp("submittedAt"),
  gradedAt: timestamp("gradedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;

// ========================================
// API KEYS AND REQUEST LOGGING TABLES
// ========================================

/**
 * API keys for REST API authentication
 * Stores hashed API keys with rate limits and usage tracking
 */
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  keyHash: text("keyHash").notNull().unique(), // SHA256 hash of the API key
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(), // First 12 chars for display
  scopes: jsonb("scopes").notNull(), // Array of permission scopes
  isActive: boolean("isActive").default(true).notNull(),
  rateLimitPerMinute: integer("rateLimitPerMinute").default(100).notNull(),
  rateLimitPerHour: integer("rateLimitPerHour").default(1000).notNull(),
  rateLimitPerDay: integer("rateLimitPerDay").default(10000).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  totalRequests: integer("totalRequests").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * API request logs
 * Tracks all API requests for analytics and debugging
 */
export const apiRequestLogs = pgTable("api_request_logs", {
  id: serial("id").primaryKey(),
  apiKeyId: integer("apiKeyId").references(() => apiKeys.id).notNull(),
  userId: integer("userId").references(() => users.id).notNull(),
  method: varchar("method", { length: 10 }).notNull(), // GET, POST, PUT, DELETE, etc.
  endpoint: text("endpoint").notNull(),
  statusCode: integer("statusCode").notNull(),
  responseTime: integer("responseTime").notNull(), // Response time in milliseconds
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: text("userAgent"),
  referer: text("referer"),
  requestBody: jsonb("requestBody"), // Sanitized request body
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiRequestLog = typeof apiRequestLogs.$inferSelect;
export type InsertApiRequestLog = typeof apiRequestLogs.$inferInsert;

// ========================================
// RE-EXPORTS FROM SEPARATE SCHEMA FILES
// ========================================

// Lead Enrichment & Credits
export {
  user_credits,
  credit_packages,
  credit_transactions,
  lead_lists,
  leads as enrichedLeads, // Renamed to avoid conflict with basic leads table above
  ai_call_campaigns,
  ai_calls,
  type UserCredit,
  type InsertUserCredit,
  type CreditPackage,
  type InsertCreditPackage,
  type CreditTransaction,
  type InsertCreditTransaction,
  type LeadList,
  type InsertLeadList,
  type AiCallCampaign,
  type InsertAiCallCampaign,
  type AiCall,
  type InsertAiCall,
} from "./schema-lead-enrichment";

// Scheduled Tasks
export {
  scheduledBrowserTasks,
  scheduledTaskExecutions,
  cronJobRegistry,
  type ScheduledBrowserTask,
  type InsertScheduledBrowserTask,
  type ScheduledTaskExecution,
  type InsertScheduledTaskExecution,
  type CronJobRegistry,
  type InsertCronJobRegistry,
} from "./schema-scheduled-tasks";

// Alerts & Notifications
export {
  alertRules,
  alertHistory,
  inAppNotifications,
  alertDeliveryQueue,
  type AlertRule,
  type InsertAlertRule,
  type AlertHistory,
  type InsertAlertHistory,
  type InAppNotification,
  type InsertInAppNotification,
  type AlertDeliveryQueueItem,
  type InsertAlertDeliveryQueueItem,
} from "./schema-alerts";

// Email Integration
export {
  emailConnections,
  syncedEmails,
  emailDrafts,
  emailSyncHistory,
  type EmailConnection,
  type InsertEmailConnection,
  type SyncedEmail,
  type InsertSyncedEmail,
  type EmailDraft,
  type InsertEmailDraft,
  type EmailSyncHistory,
  type InsertEmailSyncHistory,
} from "./schema-email";

// SEO & Reports
export {
  seoReports,
  keywordResearch,
  keywordRankings,
  backlinks,
  heatmapSessions,
  heatmapEvents,
  scheduledSeoReports,
  seoCompetitors,
  type SeoReport,
  type InsertSeoReport,
  type KeywordResearch,
  type InsertKeywordResearch,
  type KeywordRanking,
  type InsertKeywordRanking,
  type Backlink,
  type InsertBacklink,
  type HeatmapSession,
  type InsertHeatmapSession,
  type HeatmapEvent,
  type InsertHeatmapEvent,
  type ScheduledSeoReport,
  type InsertScheduledSeoReport,
  type SeoCompetitor,
  type InsertSeoCompetitor,
} from "./schema-seo";

// Meta Ads
export {
  adAnalyses,
  adRecommendations,
  adCopyVariations,
  adAutomationHistory,
  metaAdAccounts,
  metaCampaigns,
  metaAdSets,
  metaAds,
  type AdAnalysis,
  type InsertAdAnalysis,
  type AdRecommendation,
  type InsertAdRecommendation,
  type AdCopyVariation,
  type InsertAdCopyVariation,
  type AdAutomationHistory,
  type InsertAdAutomationHistory,
  type MetaAdAccount,
  type InsertMetaAdAccount,
  type MetaCampaign,
  type InsertMetaCampaign,
  type MetaAdSet,
  type InsertMetaAdSet,
  type MetaAd,
  type InsertMetaAd,
} from "./schema-meta-ads";

// Admin Dashboard
export {
  auditLogs,
  featureFlags,
  systemConfig,
  supportTickets,
  ticketMessages,
  announcements,
  securityEvents,
  type AuditLog,
  type InsertAuditLog,
  type FeatureFlag,
  type InsertFeatureFlag,
  type SystemConfig,
  type InsertSystemConfig,
  type SupportTicket,
  type InsertSupportTicket,
  type TicketMessage,
  type InsertTicketMessage,
  type Announcement,
  type InsertAnnouncement,
  type SecurityEvent,
  type InsertSecurityEvent,
} from "./schema-admin";

// Webhooks & Communication Channels
export {
  userWebhooks,
  inboundMessages,
  botConversations,
  agencyTasks,
  taskExecutions,
  outboundMessages,
  webhookLogs,
  type UserWebhook,
  type InsertUserWebhook,
  type InboundMessage,
  type InsertInboundMessage,
  type BotConversation,
  type InsertBotConversation,
  type AgencyTask,
  type InsertAgencyTask,
  type TaskExecution,
  type InsertTaskExecution,
  type OutboundMessage,
  type InsertOutboundMessage,
  type WebhookLog,
  type InsertWebhookLog,
} from "./schema-webhooks";
