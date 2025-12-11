/**
 * RAG Database Schema for AI Browser Automation
 *
 * This schema stores knowledge about websites, navigation patterns,
 * successful action sequences, and error recovery strategies.
 *
 * The AI agent uses this to:
 * 1. Understand website structure before navigating
 * 2. Use proven selectors and action patterns
 * 3. Recover from errors using known solutions
 * 4. Learn from successful and failed executions
 */

import { pgTable, serial, text, jsonb, timestamp, integer, boolean, vector, index, uniqueIndex, varchar, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ========================================
// WEBSITE KNOWLEDGE BASE
// ========================================

/**
 * Websites - Core website information and configuration
 */
export const websites = pgTable("rag_websites", {
  id: serial("id").primaryKey(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  description: text("description"),

  // Website metadata
  loginUrl: text("login_url"),
  dashboardUrl: text("dashboard_url"),
  requiresAuth: boolean("requires_auth").default(false),
  authMethod: varchar("auth_method", { length: 50 }), // 'password', 'oauth', 'sso', '2fa'

  // Navigation config
  defaultTimeout: integer("default_timeout").default(30000),
  waitForSelector: text("wait_for_selector"),
  loadStrategy: varchar("load_strategy", { length: 50 }).default("domcontentloaded"),

  // Performance hints
  avgLoadTime: real("avg_load_time"),
  // CHECK constraint: reliabilityScore should be between 0 and 1
  // SQL: CHECK (reliability_score >= 0 AND reliability_score <= 1)
  reliabilityScore: real("reliability_score").default(0.5),
  lastCrawled: timestamp("last_crawled"),

  // Metadata
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  domainIdx: uniqueIndex("rag_websites_domain_idx").on(table.domain),
}));

/**
 * Page Knowledge - Information about specific pages within websites
 */
export const pageKnowledge = pgTable("rag_page_knowledge", {
  id: serial("id").primaryKey(),
  websiteId: integer("website_id").references(() => websites.id, { onDelete: "cascade" }).notNull(),

  // Page identification
  urlPattern: text("url_pattern").notNull(), // Regex pattern to match URLs
  pageName: varchar("page_name", { length: 255 }),
  pageType: varchar("page_type", { length: 50 }), // 'login', 'dashboard', 'list', 'form', 'detail'

  // Page structure knowledge
  description: text("description"),
  mainContentSelector: text("main_content_selector"),
  navigationSelector: text("navigation_selector"),
  loadIndicator: text("load_indicator"), // Selector that appears when page is ready

  // DOM structure snapshot (for reference)
  domSnapshot: jsonb("dom_snapshot"),
  accessibilityTree: jsonb("accessibility_tree"),

  // Common elements on this page
  knownElements: jsonb("known_elements"), // Array of {selector, description, type}

  // Vector embedding for semantic search
  embedding: vector("embedding", { dimensions: 1536 }),

  // Metadata
  confidence: real("confidence").default(0.5),
  lastVerified: timestamp("last_verified"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  websiteIdx: index("rag_page_knowledge_website_idx").on(table.websiteId),
  pageTypeIdx: index("rag_page_knowledge_type_idx").on(table.pageType),
}));

// ========================================
// ELEMENT SELECTORS & PATTERNS
// ========================================

/**
 * Element Selectors - Reliable selectors for UI elements
 */
export const elementSelectors = pgTable("rag_element_selectors", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").references(() => pageKnowledge.id, { onDelete: "cascade" }),
  websiteId: integer("website_id").references(() => websites.id, { onDelete: "cascade" }).notNull(),

  // Element identification
  elementName: varchar("element_name", { length: 255 }).notNull(),
  elementType: varchar("element_type", { length: 50 }), // 'button', 'input', 'link', 'dropdown', 'table'
  description: text("description"),

  // Selectors (multiple for redundancy)
  primarySelector: text("primary_selector").notNull(),
  fallbackSelectors: jsonb("fallback_selectors"), // Array of alternative selectors
  xpathSelector: text("xpath_selector"),
  ariaLabel: text("aria_label"),
  testId: text("test_id"), // data-testid attribute

  // Reliability tracking
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  // CHECK constraint: reliabilityScore should be between 0 and 1
  // SQL: CHECK (reliability_score >= 0 AND reliability_score <= 1)
  reliabilityScore: real("reliability_score").default(0.5),
  lastSuccess: timestamp("last_success"),
  lastFailure: timestamp("last_failure"),

  // Vector embedding for semantic search
  embedding: vector("embedding", { dimensions: 1536 }),

  // Metadata
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  websiteIdx: index("rag_element_selectors_website_idx").on(table.websiteId),
  pageIdx: index("rag_element_selectors_page_idx").on(table.pageId),
  typeIdx: index("rag_element_selectors_type_idx").on(table.elementType),
  reliabilityIdx: index("rag_element_selectors_reliability_idx").on(table.reliabilityScore),
  // Unique constraint: websiteId + elementName should be unique
  websiteElementUnique: uniqueIndex("rag_element_selectors_website_element_unique").on(table.websiteId, table.elementName),
}));

// ========================================
// ACTION SEQUENCES & WORKFLOWS
// ========================================

/**
 * Action Sequences - Successful action patterns for common tasks
 */
export const actionSequences = pgTable("rag_action_sequences", {
  id: serial("id").primaryKey(),
  websiteId: integer("website_id").references(() => websites.id, { onDelete: "cascade" }).notNull(),

  // Sequence identification
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  taskType: varchar("task_type", { length: 100 }), // 'login', 'navigate', 'extract', 'form_fill', 'click'

  // Trigger conditions
  triggerInstruction: text("trigger_instruction"), // NLP instruction that triggers this sequence
  triggerKeywords: jsonb("trigger_keywords"), // Array of keywords

  // Action steps
  steps: jsonb("steps").notNull(), // Array of {action, selector, value, waitAfter}
  expectedOutcome: text("expected_outcome"),
  successIndicator: text("success_indicator"), // Selector/condition to verify success

  // Performance tracking
  avgExecutionTime: real("avg_execution_time"),
  // CHECK constraint: successRate should be between 0 and 1
  // SQL: CHECK (success_rate >= 0 AND success_rate <= 1)
  successRate: real("success_rate").default(0.5),
  executionCount: integer("execution_count").default(0),

  // Vector embedding for semantic search
  embedding: vector("embedding", { dimensions: 1536 }),

  // Metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  websiteIdx: index("rag_action_sequences_website_idx").on(table.websiteId),
  taskTypeIdx: index("rag_action_sequences_task_idx").on(table.taskType),
  successRateIdx: index("rag_action_sequences_success_idx").on(table.successRate),
  // Unique constraint: websiteId + name should be unique
  websiteNameUnique: uniqueIndex("rag_action_sequences_website_name_unique").on(table.websiteId, table.name),
}));

// ========================================
// ERROR PATTERNS & RECOVERY
// ========================================

/**
 * Error Patterns - Known errors and their recovery strategies
 */
export const errorPatterns = pgTable("rag_error_patterns", {
  id: serial("id").primaryKey(),
  websiteId: integer("website_id").references(() => websites.id, { onDelete: "cascade" }),

  // Error identification
  errorType: varchar("error_type", { length: 100 }).notNull(), // 'element_not_found', 'timeout', 'auth_failed', 'captcha'
  errorPattern: text("error_pattern").notNull(), // Regex or string pattern to match error
  description: text("description"),

  // Recovery strategy
  recoveryStrategy: varchar("recovery_strategy", { length: 50 }), // 'retry', 'alternative_selector', 'wait', 'refresh', 'reauth'
  recoverySteps: jsonb("recovery_steps"), // Array of actions to recover
  maxRetries: integer("max_retries").default(3),
  retryDelay: integer("retry_delay").default(1000), // ms

  // Tracking
  occurrenceCount: integer("occurrence_count").default(0),
  recoverySuccessCount: integer("recovery_success_count").default(0),
  recoveryRate: real("recovery_rate").default(0.5),

  // Vector embedding
  embedding: vector("embedding", { dimensions: 1536 }),

  // Metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  websiteIdx: index("rag_error_patterns_website_idx").on(table.websiteId),
  errorTypeIdx: index("rag_error_patterns_type_idx").on(table.errorType),
}));

// ========================================
// EXECUTION HISTORY FOR LEARNING
// ========================================

/**
 * Execution Logs - History of browser automation executions for learning
 */
export const executionLogs = pgTable("rag_execution_logs", {
  id: serial("id").primaryKey(),
  websiteId: integer("website_id").references(() => websites.id, { onDelete: "cascade" }),
  actionSequenceId: integer("action_sequence_id").references(() => actionSequences.id, { onDelete: "cascade" }),

  // Execution context
  sessionId: varchar("session_id", { length: 255 }),
  userId: varchar("user_id", { length: 255 }),
  instruction: text("instruction"),

  // Execution details
  steps: jsonb("steps"), // Array of {action, selector, success, error, duration}
  totalDuration: integer("total_duration"), // ms
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  errorType: varchar("error_type", { length: 100 }),

  // Recovery attempts
  recoveryAttempts: jsonb("recovery_attempts"), // Array of {strategy, success}
  finalState: jsonb("final_state"), // Screenshot URL, DOM snapshot, etc.

  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  websiteIdx: index("rag_execution_logs_website_idx").on(table.websiteId),
  sequenceIdx: index("rag_execution_logs_sequence_idx").on(table.actionSequenceId),
  successIdx: index("rag_execution_logs_success_idx").on(table.success),
  createdIdx: index("rag_execution_logs_created_idx").on(table.createdAt),
}));

// ========================================
// SUPPORT DOCUMENTS
// ========================================

/**
 * Support Documents - Help docs, guides, and reference materials
 */
export const supportDocuments = pgTable("rag_support_documents", {
  id: serial("id").primaryKey(),
  websiteId: integer("website_id").references(() => websites.id, { onDelete: "cascade" }),

  // Document info
  title: varchar("title", { length: 500 }).notNull(),
  documentType: varchar("document_type", { length: 50 }), // 'help', 'api_doc', 'tutorial', 'faq', 'changelog'
  sourceUrl: text("source_url"),

  // Content
  content: text("content").notNull(),
  summary: text("summary"),

  // Chunking for RAG
  chunkIndex: integer("chunk_index").default(0),
  parentDocumentId: integer("parent_document_id"),

  // Vector embedding
  embedding: vector("embedding", { dimensions: 1536 }),

  // Relevance tracking
  retrievalCount: integer("retrieval_count").default(0),
  helpfulnessScore: real("helpfulness_score").default(0.5),

  // Metadata
  lastUpdated: timestamp("last_updated"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  websiteIdx: index("rag_support_docs_website_idx").on(table.websiteId),
  typeIdx: index("rag_support_docs_type_idx").on(table.documentType),
}));

// ========================================
// RELATIONS
// ========================================

export const websitesRelations = relations(websites, ({ many }) => ({
  pages: many(pageKnowledge),
  elements: many(elementSelectors),
  actionSequences: many(actionSequences),
  errorPatterns: many(errorPatterns),
  executionLogs: many(executionLogs),
  supportDocuments: many(supportDocuments),
}));

export const pageKnowledgeRelations = relations(pageKnowledge, ({ one, many }) => ({
  website: one(websites, {
    fields: [pageKnowledge.websiteId],
    references: [websites.id],
  }),
  elements: many(elementSelectors),
}));

export const elementSelectorsRelations = relations(elementSelectors, ({ one }) => ({
  website: one(websites, {
    fields: [elementSelectors.websiteId],
    references: [websites.id],
  }),
  page: one(pageKnowledge, {
    fields: [elementSelectors.pageId],
    references: [pageKnowledge.id],
  }),
}));

export const actionSequencesRelations = relations(actionSequences, ({ one, many }) => ({
  website: one(websites, {
    fields: [actionSequences.websiteId],
    references: [websites.id],
  }),
  executionLogs: many(executionLogs),
}));

export const errorPatternsRelations = relations(errorPatterns, ({ one }) => ({
  website: one(websites, {
    fields: [errorPatterns.websiteId],
    references: [websites.id],
  }),
}));

export const executionLogsRelations = relations(executionLogs, ({ one }) => ({
  website: one(websites, {
    fields: [executionLogs.websiteId],
    references: [websites.id],
  }),
  actionSequence: one(actionSequences, {
    fields: [executionLogs.actionSequenceId],
    references: [actionSequences.id],
  }),
}));

export const supportDocumentsRelations = relations(supportDocuments, ({ one }) => ({
  website: one(websites, {
    fields: [supportDocuments.websiteId],
    references: [websites.id],
  }),
}));

// ========================================
// TYPE EXPORTS
// ========================================

export type Website = typeof websites.$inferSelect;
export type NewWebsite = typeof websites.$inferInsert;
export type PageKnowledge = typeof pageKnowledge.$inferSelect;
export type NewPageKnowledge = typeof pageKnowledge.$inferInsert;
export type ElementSelector = typeof elementSelectors.$inferSelect;
export type NewElementSelector = typeof elementSelectors.$inferInsert;
export type ActionSequence = typeof actionSequences.$inferSelect;
export type NewActionSequence = typeof actionSequences.$inferInsert;
export type ErrorPattern = typeof errorPatterns.$inferSelect;
export type NewErrorPattern = typeof errorPatterns.$inferInsert;
export type ExecutionLog = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;
export type SupportDocument = typeof supportDocuments.$inferSelect;
export type NewSupportDocument = typeof supportDocuments.$inferInsert;
