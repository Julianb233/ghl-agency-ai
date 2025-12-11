/**
 * Lead Enrichment Schema
 * Database tables for lead enrichment and credit management
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
  decimal,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ========================================
// CREDIT MANAGEMENT TABLES
// ========================================

/**
 * User credit balances
 * Tracks credit balances for different credit types per user
 */
export const user_credits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  creditType: varchar("creditType", { length: 50 }).notNull(), // enrichment, calling, scraping
  balance: integer("balance").default(0).notNull(),
  totalPurchased: integer("totalPurchased").default(0).notNull(),
  totalUsed: integer("totalUsed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Credit packages
 * Available credit packages for purchase
 */
export const credit_packages = pgTable("credit_packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  creditAmount: integer("creditAmount").notNull(), // Number of credits in package
  price: integer("price").notNull(), // Price in cents
  creditType: varchar("creditType", { length: 50 }).notNull(), // enrichment, calling, scraping
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  metadata: jsonb("metadata"), // Additional package info
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Credit transactions
 * History of all credit transactions (purchases, usage, refunds, adjustments)
 */
export const credit_transactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  creditType: varchar("creditType", { length: 50 }).notNull(),
  transactionType: varchar("transactionType", { length: 50 }).notNull(), // purchase, usage, refund, adjustment
  amount: integer("amount").notNull(), // Positive or negative
  balanceAfter: integer("balanceAfter").notNull(),
  description: text("description").notNull(),
  referenceId: varchar("referenceId", { length: 255 }), // ID of related entity (lead, call, etc.)
  referenceType: varchar("referenceType", { length: 50 }), // Type of related entity
  metadata: jsonb("metadata"), // Additional transaction data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ========================================
// LEAD ENRICHMENT TABLES
// ========================================

/**
 * Lead lists
 * Container for uploaded lead lists
 */
export const lead_lists = pgTable("lead_lists", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  fileName: varchar("fileName", { length: 500 }),
  fileSize: integer("fileSize"), // Size in bytes
  status: varchar("status", { length: 50 }).default("uploading").notNull(), // uploading, processing, completed, failed
  totalLeads: integer("totalLeads").default(0).notNull(),
  enrichedLeads: integer("enrichedLeads").default(0).notNull(),
  failedLeads: integer("failedLeads").default(0).notNull(),
  costInCredits: integer("costInCredits").default(0).notNull(),
  metadata: jsonb("metadata"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  processingStartedAt: timestamp("processingStartedAt"),
  processedAt: timestamp("processedAt"),
});

/**
 * Individual leads
 * Lead records with raw and enriched data
 */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  listId: integer("listId")
    .references(() => lead_lists.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  rawData: jsonb("rawData").notNull(), // Original lead data from CSV
  enrichedData: jsonb("enrichedData"), // Enriched data from Appify
  enrichmentStatus: varchar("enrichmentStatus", { length: 50 })
    .default("pending")
    .notNull(), // pending, enriched, failed, skipped
  creditsUsed: integer("creditsUsed").default(0).notNull(),
  error: text("error"), // Error message if enrichment failed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  enrichedAt: timestamp("enrichedAt"),
});

// ========================================
// TYPE EXPORTS
// ========================================

export type UserCredit = typeof user_credits.$inferSelect;
export type InsertUserCredit = typeof user_credits.$inferInsert;

export type CreditPackage = typeof credit_packages.$inferSelect;
export type InsertCreditPackage = typeof credit_packages.$inferInsert;

export type CreditTransaction = typeof credit_transactions.$inferSelect;
export type InsertCreditTransaction = typeof credit_transactions.$inferInsert;

export type LeadList = typeof lead_lists.$inferSelect;
export type InsertLeadList = typeof lead_lists.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ========================================
// AI CALLING TABLES
// ========================================

/**
 * AI call campaigns
 * Manages AI-powered phone call campaigns via Vapi.ai
 */
export const ai_call_campaigns = pgTable("ai_call_campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  listId: integer("listId").references(() => lead_lists.id), // Optional lead list association
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  script: text("script").notNull(), // Call script/prompt for AI
  status: varchar("status", { length: 50 })
    .default("draft")
    .notNull(), // draft, running, paused, completed, cancelled
  callsMade: integer("callsMade").default(0).notNull(),
  callsSuccessful: integer("callsSuccessful").default(0).notNull(),
  callsFailed: integer("callsFailed").default(0).notNull(),
  callsAnswered: integer("callsAnswered").default(0).notNull(),
  totalDuration: integer("totalDuration").default(0).notNull(), // Total call duration in seconds
  costInCredits: integer("costInCredits").default(0).notNull(),
  settings: jsonb("settings"), // Voice, speed, language, model settings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
});

export type AiCallCampaign = typeof ai_call_campaigns.$inferSelect;
export type InsertAiCallCampaign = typeof ai_call_campaigns.$inferInsert;

/**
 * AI calls
 * Individual call records with status, transcript, and outcomes
 */
export const ai_calls = pgTable("ai_calls", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaignId")
    .references(() => ai_call_campaigns.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  leadId: integer("leadId").references(() => leads.id), // Optional lead association
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  status: varchar("status", { length: 50 })
    .default("pending")
    .notNull(), // pending, calling, answered, no_answer, failed, completed
  outcome: varchar("outcome", { length: 50 }), // interested, not_interested, callback, voicemail, no_answer, hung_up
  vapiCallId: varchar("vapiCallId", { length: 255 }), // Vapi.ai call ID
  duration: integer("duration"), // Call duration in seconds
  recordingUrl: text("recordingUrl"), // URL to call recording
  transcript: text("transcript"), // Call transcript
  analysis: jsonb("analysis"), // AI analysis of call (sentiment, key points, etc.)
  notes: text("notes"), // User notes about the call
  creditsUsed: integer("creditsUsed").default(1).notNull(),
  error: text("error"), // Error message if call failed
  calledAt: timestamp("calledAt").defaultNow().notNull(),
  answeredAt: timestamp("answeredAt"),
  completedAt: timestamp("completedAt"),
});

export type AiCall = typeof ai_calls.$inferSelect;
export type InsertAiCall = typeof ai_calls.$inferInsert;
