/**
 * Asset Management Schema
 *
 * Stores client assets and media files with S3/CDN integration
 * Supports folder organization and flexible metadata
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
  index,
  bigint,
} from "drizzle-orm/pg-core";
import { users, clientProfiles } from "./schema";

/**
 * Asset categories enum values
 */
export const ASSET_CATEGORIES = [
  "logo",
  "image",
  "video",
  "document",
  "audio",
  "other",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

/**
 * Asset folders for organizing client assets
 * Supports nested folder structure via parentId self-reference
 */
export const assetFolders = pgTable(
  "asset_folders",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    clientProfileId: integer("clientProfileId").references(
      () => clientProfiles.id,
      { onDelete: "cascade" }
    ),
    name: text("name").notNull(),
    parentId: integer("parentId"), // Self-reference for nested folders
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("asset_folders_user_id_idx").on(table.userId),
    clientProfileIdIdx: index("asset_folders_client_profile_id_idx").on(
      table.clientProfileId
    ),
    parentIdIdx: index("asset_folders_parent_id_idx").on(table.parentId),
  })
);

export type AssetFolder = typeof assetFolders.$inferSelect;
export type InsertAssetFolder = typeof assetFolders.$inferInsert;

/**
 * Client assets table
 * Stores metadata for files uploaded to S3 with CDN URLs
 */
export const clientAssets = pgTable(
  "client_assets",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    clientProfileId: integer("clientProfileId").references(
      () => clientProfiles.id,
      { onDelete: "cascade" }
    ),
    folderId: integer("folderId").references(() => assetFolders.id, {
      onDelete: "set null",
    }),

    // File information
    filename: text("filename").notNull(), // Generated unique filename
    originalFilename: text("originalFilename").notNull(), // Original uploaded filename
    mimeType: varchar("mimeType", { length: 255 }).notNull(),
    size: bigint("size", { mode: "number" }).notNull(), // File size in bytes

    // Storage locations
    s3Key: text("s3Key").notNull(), // S3 object key
    s3Url: text("s3Url").notNull(), // Direct S3 URL
    cdnUrl: text("cdnUrl"), // CloudFront CDN URL (if CDN enabled)

    // Categorization
    category: varchar("category", { length: 50 })
      .default("other")
      .notNull()
      .$type<AssetCategory>(),
    tags: jsonb("tags").$type<string[]>().default([]),

    // Flexible metadata (dimensions, duration, etc.)
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    // Access control
    isPublic: boolean("isPublic").default(false).notNull(),

    // Timestamps
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("client_assets_user_id_idx").on(table.userId),
    clientProfileIdIdx: index("client_assets_client_profile_id_idx").on(
      table.clientProfileId
    ),
    categoryIdx: index("client_assets_category_idx").on(table.category),
    folderIdIdx: index("client_assets_folder_id_idx").on(table.folderId),
    tagsIdx: index("client_assets_tags_idx").on(table.tags),
    createdAtIdx: index("client_assets_created_at_idx").on(table.createdAt),
  })
);

export type ClientAsset = typeof clientAssets.$inferSelect;
export type InsertClientAsset = typeof clientAssets.$inferInsert;
