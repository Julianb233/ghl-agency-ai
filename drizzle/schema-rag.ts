/**
 * RAG System Drizzle Schema
 *
 * Schema definitions for the RAG (Retrieval Augmented Generation) system.
 * Uses PostgreSQL with pgvector extension for semantic search.
 */

import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./schema";
import { sql } from "drizzle-orm";

/**
 * Documentation Sources
 * Stores original documentation files before chunking
 */
export const documentationSources = pgTable(
  "documentation_sources",
  {
    id: serial("id").primaryKey(),
    platform: varchar("platform", { length: 50 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    sourceUrl: text("sourceUrl"),
    sourceType: varchar("sourceType", { length: 30 }).default("markdown"),
    metadata: jsonb("metadata"),
    version: varchar("version", { length: 20 }),
    isActive: boolean("isActive").default(true).notNull(),
    uploadedBy: integer("uploadedBy").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    platformIdx: index("platform_idx").on(table.platform),
    categoryIdx: index("category_idx").on(table.category),
    activeIdx: index("active_idx").on(table.isActive),
  })
);

/**
 * Documentation Chunks
 * Stores chunked documentation with vector embeddings for semantic search
 */
export const documentationChunks = pgTable(
  "documentation_chunks",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("sourceId")
      .references(() => documentationSources.id, { onDelete: "cascade" })
      .notNull(),
    platform: varchar("platform", { length: 50 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    chunkIndex: integer("chunkIndex").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("tokenCount").notNull(),
    // Note: embedding is vector(1536) but drizzle doesn't support vector type natively
    // We'll handle it with raw SQL for now
    embedding: text("embedding"), // Will be cast to vector in queries
    metadata: jsonb("metadata"),
    keywords: jsonb("keywords"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    sourceIdIdx: index("source_id_idx").on(table.sourceId),
    platformCategoryIdx: index("platform_category_idx").on(table.platform, table.category),
  })
);

/**
 * Platform Keywords
 * Platform detection keywords for automatic platform identification
 */
export const platformKeywords = pgTable(
  "platform_keywords",
  {
    id: serial("id").primaryKey(),
    platform: varchar("platform", { length: 50 }).notNull(),
    keyword: varchar("keyword", { length: 100 }).notNull(),
    keywordType: varchar("keywordType", { length: 30 }).notNull(), // url_pattern, domain, keyword, dns_record_type
    priority: integer("priority").default(1).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    platformKeywordsUniqueIdx: uniqueIndex("platform_keywords_unique_idx").on(
      table.platform,
      table.keyword,
      table.keywordType
    ),
    platformKeywordsPlatformIdx: index("platform_keywords_platform_idx").on(table.platform),
    platformKeywordsKeywordIdx: index("platform_keywords_keyword_idx").on(table.keyword),
    platformKeywordsTypeIdx: index("platform_keywords_type_idx").on(table.keywordType),
  })
);

/**
 * RAG Query Logs
 * Logs RAG queries for analytics and improvement
 */
export const ragQueryLogs = pgTable(
  "rag_query_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").references(() => users.id),
    query: text("query").notNull(),
    detectedPlatforms: jsonb("detectedPlatforms"),
    retrievedChunkIds: jsonb("retrievedChunkIds"),
    topSimilarityScore: numeric("topSimilarityScore"),
    averageSimilarityScore: numeric("averageSimilarityScore"),
    retrievalTimeMs: integer("retrievalTimeMs"),
    chunkCount: integer("chunkCount").notNull(),
    wasHelpful: boolean("wasHelpful"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    ragUserIdIdx: index("rag_user_id_idx").on(table.userId),
    ragCreatedAtIdx: index("rag_created_at_idx").on(table.createdAt),
  })
);

/**
 * System Prompt Templates
 * Pre-defined system prompt templates for different platforms
 */
export const systemPromptTemplates = pgTable(
  "system_prompt_templates",
  {
    id: serial("id").primaryKey(),
    platform: varchar("platform", { length: 50 }).notNull(),
    name: text("name").notNull(),
    template: text("template").notNull(),
    description: text("description"),
    isDefault: boolean("isDefault").default(false).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    promptPlatformIdx: index("prompt_platform_idx").on(table.platform),
    promptDefaultIdx: index("prompt_default_idx").on(table.platform, table.isDefault),
  })
);

// Type exports
export type DocumentationSource = typeof documentationSources.$inferSelect;
export type InsertDocumentationSource = typeof documentationSources.$inferInsert;

export type DocumentationChunk = typeof documentationChunks.$inferSelect;
export type InsertDocumentationChunk = typeof documentationChunks.$inferInsert;

export type PlatformKeyword = typeof platformKeywords.$inferSelect;
export type InsertPlatformKeyword = typeof platformKeywords.$inferInsert;

export type RagQueryLog = typeof ragQueryLogs.$inferSelect;
export type InsertRagQueryLog = typeof ragQueryLogs.$inferInsert;

export type SystemPromptTemplate = typeof systemPromptTemplates.$inferSelect;
export type InsertSystemPromptTemplate = typeof systemPromptTemplates.$inferInsert;
