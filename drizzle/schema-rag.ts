/**
 * RAG (Retrieval-Augmented Generation) Schema
 * Database tables for documentation storage and retrieval
 *
 * TODO: Add vector column support when vector extension is configured
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
// DOCUMENTATION/RAG TABLES
// ========================================

/**
 * Documentation sources
 * Top-level documentation documents ingested into the RAG system
 */
export const documentationSources = pgTable("documentation_sources", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id), // User who uploaded (null for system docs)

  // Source metadata
  platform: varchar("platform", { length: 50 }).notNull(), // gohighlevel, wordpress, cloudflare, etc.
  category: varchar("category", { length: 50 }).notNull(), // api, ui, workflows, etc.
  title: text("title").notNull(),
  sourceUrl: text("sourceUrl"), // Original URL if scraped
  sourceType: varchar("sourceType", { length: 50 }), // markdown, html, pdf, docx
  version: varchar("version", { length: 50 }), // Documentation version

  // Content
  content: text("content").notNull(), // Full original content
  contentHash: varchar("contentHash", { length: 64 }), // Hash for deduplication

  // Status
  isActive: boolean("isActive").default(true).notNull(),

  // Metadata
  metadata: jsonb("metadata"), // Additional source info
  tags: jsonb("tags"), // Array of tags

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Documentation chunks
 * Chunked and embedded documentation pieces for retrieval
 */
export const documentationChunks = pgTable("documentation_chunks", {
  id: serial("id").primaryKey(),
  sourceId: integer("sourceId")
    .references(() => documentationSources.id, { onDelete: "cascade" })
    .notNull(),

  // Chunk details
  chunkIndex: integer("chunkIndex").notNull(), // Order within source
  content: text("content").notNull(), // Chunk text
  tokenCount: integer("tokenCount").notNull(), // Number of tokens

  // Embedding
  // TODO: Add vector column when pgvector extension is configured
  // embedding: vector("embedding", { dimensions: 1536 }), // OpenAI embedding vector

  // Metadata
  metadata: jsonb("metadata"), // Additional chunk metadata (context, headers, etc.)

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Platform keywords
 * Keywords for platform detection
 */
export const platformKeywords = pgTable("platform_keywords", {
  id: serial("id").primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  weight: integer("weight").default(1).notNull(), // Keyword importance weight
  category: varchar("category", { length: 50 }), // Type of keyword (product_name, feature, etc.)
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ========================================
// TYPE EXPORTS
// ========================================

export type DocumentationSource = typeof documentationSources.$inferSelect;
export type InsertDocumentationSource = typeof documentationSources.$inferInsert;

export type DocumentationChunk = typeof documentationChunks.$inferSelect;
export type InsertDocumentationChunk = typeof documentationChunks.$inferInsert;

export type PlatformKeyword = typeof platformKeywords.$inferSelect;
export type InsertPlatformKeyword = typeof platformKeywords.$inferInsert;
