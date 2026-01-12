/**
 * Asset Management Service
 *
 * Handles file uploads, storage, and retrieval for client assets
 * Integrates with S3 for storage and CDN for delivery
 */

import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql, isNull, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import {
  clientAssets,
  assetFolders,
  type ClientAsset,
  type InsertClientAsset,
  type AssetFolder,
  type InsertAssetFolder,
  type AssetCategory,
  ASSET_CATEGORIES,
} from "../../drizzle/schema-assets";
import { s3StorageService } from "./s3-storage.service";
import { cdnService } from "./cdn.service";
import { serviceLoggers } from "../lib/logger";

const logger = serviceLoggers.deployment;

/**
 * Asset filters for querying
 */
export interface AssetFilters {
  category?: AssetCategory;
  tags?: string[];
  folderId?: number | null;
  isPublic?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * File upload data
 */
export interface FileUploadData {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  size: number;
}

/**
 * Asset update data
 */
export interface AssetUpdateData {
  filename?: string;
  category?: AssetCategory;
  tags?: string[];
  metadata?: Record<string, unknown>;
  isPublic?: boolean;
}

/**
 * Asset Service
 */
class AssetService {
  /**
   * Generate a unique filename with extension
   */
  private generateFilename(originalFilename: string): string {
    const ext = originalFilename.includes(".")
      ? `.${originalFilename.split(".").pop()}`
      : "";
    return `${uuidv4()}${ext}`;
  }

  /**
   * Generate S3 key for asset storage
   */
  private generateS3Key(
    userId: number,
    clientProfileId: number | null | undefined,
    filename: string
  ): string {
    const basePath = "assets";
    if (clientProfileId) {
      return `${basePath}/users/${userId}/clients/${clientProfileId}/${filename}`;
    }
    return `${basePath}/users/${userId}/${filename}`;
  }

  /**
   * Detect category from mime type
   */
  private detectCategory(mimeType: string): AssetCategory {
    if (mimeType.startsWith("image/")) {
      if (mimeType.includes("svg") || mimeType.includes("icon")) {
        return "logo";
      }
      return "image";
    }
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("text/") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("presentation")
    ) {
      return "document";
    }
    return "other";
  }

  /**
   * Upload an asset to S3 and create database record
   */
  async uploadAsset(
    userId: number,
    clientProfileId: number | null | undefined,
    file: FileUploadData,
    category?: AssetCategory,
    tags?: string[],
    folderId?: number
  ): Promise<ClientAsset> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      logger.info(`Uploading asset for user ${userId}: ${file.originalFilename}`);

      // Generate unique filename and S3 key
      const filename = this.generateFilename(file.originalFilename);
      const s3Key = this.generateS3Key(userId, clientProfileId, filename);

      // Detect category if not provided
      const assetCategory = category || this.detectCategory(file.mimeType);

      // Upload to S3
      const s3Url = await s3StorageService.uploadFile(
        s3Key,
        file.buffer,
        file.mimeType,
        {
          originalFilename: file.originalFilename,
          userId: userId.toString(),
          ...(clientProfileId && { clientProfileId: clientProfileId.toString() }),
        }
      );

      // Generate CDN URL if available
      let cdnUrl: string | null = null;
      if (cdnService.isEnabled()) {
        cdnUrl = cdnService.getPublicUrl(s3Key);
      }

      // Create database record
      const [asset] = await db
        .insert(clientAssets)
        .values({
          userId,
          clientProfileId: clientProfileId || null,
          folderId: folderId || null,
          filename,
          originalFilename: file.originalFilename,
          mimeType: file.mimeType,
          size: file.size,
          s3Key,
          s3Url,
          cdnUrl,
          category: assetCategory,
          tags: tags || [],
          metadata: {},
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      logger.info(`Asset uploaded successfully: ${asset.id}`);

      return asset;
    } catch (error) {
      logger.error({ err: error }, "Failed to upload asset");

      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to upload asset",
        cause: error,
      });
    }
  }

  /**
   * Get assets with optional filters
   */
  async getAssets(
    userId: number,
    clientProfileId?: number | null,
    filters?: AssetFilters
  ): Promise<ClientAsset[]> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      const conditions = [eq(clientAssets.userId, userId)];

      if (clientProfileId !== undefined) {
        if (clientProfileId === null) {
          conditions.push(isNull(clientAssets.clientProfileId));
        } else {
          conditions.push(eq(clientAssets.clientProfileId, clientProfileId));
        }
      }

      if (filters?.category) {
        conditions.push(eq(clientAssets.category, filters.category));
      }

      if (filters?.folderId !== undefined) {
        if (filters.folderId === null) {
          conditions.push(isNull(clientAssets.folderId));
        } else {
          conditions.push(eq(clientAssets.folderId, filters.folderId));
        }
      }

      if (filters?.isPublic !== undefined) {
        conditions.push(eq(clientAssets.isPublic, filters.isPublic));
      }

      if (filters?.tags && filters.tags.length > 0) {
        conditions.push(
          sql`${clientAssets.tags} ?| ${sql.raw(`ARRAY[${filters.tags.map((t) => `'${t}'`).join(",")}]`)}`
        );
      }

      if (filters?.search) {
        const searchPattern = `%${filters.search}%`;
        conditions.push(
          sql`(${clientAssets.originalFilename} ILIKE ${searchPattern} OR ${clientAssets.filename} ILIKE ${searchPattern})`
        );
      }

      let query = db
        .select()
        .from(clientAssets)
        .where(and(...conditions))
        .orderBy(desc(clientAssets.createdAt));

      if (filters?.limit) {
        query = query.limit(filters.limit) as typeof query;
      }

      if (filters?.offset) {
        query = query.offset(filters.offset) as typeof query;
      }

      return await query;
    } catch (error) {
      logger.error({ err: error }, "Failed to get assets");

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get assets",
        cause: error,
      });
    }
  }

  /**
   * Get a single asset by ID
   */
  async getAssetById(
    assetId: number,
    userId?: number
  ): Promise<ClientAsset | null> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      const conditions = [eq(clientAssets.id, assetId)];

      if (userId !== undefined) {
        conditions.push(eq(clientAssets.userId, userId));
      }

      const [asset] = await db
        .select()
        .from(clientAssets)
        .where(and(...conditions))
        .limit(1);

      return asset || null;
    } catch (error) {
      logger.error({ err: error }, `Failed to get asset ${assetId}`);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get asset",
        cause: error,
      });
    }
  }

  /**
   * Update an asset
   */
  async updateAsset(
    assetId: number,
    userId: number,
    updates: AssetUpdateData
  ): Promise<ClientAsset> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      // Verify ownership
      const existing = await this.getAssetById(assetId, userId);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      const [updated] = await db
        .update(clientAssets)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(clientAssets.id, assetId))
        .returning();

      logger.info(`Asset ${assetId} updated`);

      return updated;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      logger.error({ err: error }, `Failed to update asset ${assetId}`);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update asset",
        cause: error,
      });
    }
  }

  /**
   * Delete an asset (removes from S3 and database)
   */
  async deleteAsset(assetId: number, userId: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      // Get asset to find S3 key
      const asset = await this.getAssetById(assetId, userId);
      if (!asset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      // Delete from S3
      await s3StorageService.deleteFile(asset.s3Key);

      // Invalidate CDN cache if enabled
      if (cdnService.isEnabled()) {
        await cdnService.invalidateCache([asset.s3Key]);
      }

      // Delete from database
      await db.delete(clientAssets).where(eq(clientAssets.id, assetId));

      logger.info(`Asset ${assetId} deleted`);
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      logger.error({ err: error }, `Failed to delete asset ${assetId}`);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete asset",
        cause: error,
      });
    }
  }

  /**
   * Move an asset to a different folder
   */
  async moveAsset(
    assetId: number,
    userId: number,
    folderId: number | null
  ): Promise<ClientAsset> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      // Verify asset ownership
      const asset = await this.getAssetById(assetId, userId);
      if (!asset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      // Verify folder ownership if moving to a folder
      if (folderId !== null) {
        const folder = await this.getFolderById(folderId, userId);
        if (!folder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Folder not found",
          });
        }
      }

      const [updated] = await db
        .update(clientAssets)
        .set({
          folderId,
          updatedAt: new Date(),
        })
        .where(eq(clientAssets.id, assetId))
        .returning();

      logger.info(`Asset ${assetId} moved to folder ${folderId}`);

      return updated;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      logger.error({ err: error }, `Failed to move asset ${assetId}`);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to move asset",
        cause: error,
      });
    }
  }

  /**
   * Create a folder
   */
  async createFolder(
    userId: number,
    clientProfileId: number | null | undefined,
    name: string,
    parentId?: number | null
  ): Promise<AssetFolder> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      // Verify parent folder ownership if provided
      if (parentId) {
        const parentFolder = await this.getFolderById(parentId, userId);
        if (!parentFolder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Parent folder not found",
          });
        }
      }

      const [folder] = await db
        .insert(assetFolders)
        .values({
          userId,
          clientProfileId: clientProfileId || null,
          name,
          parentId: parentId || null,
          createdAt: new Date(),
        })
        .returning();

      logger.info(`Folder created: ${folder.id} - ${name}`);

      return folder;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      logger.error({ err: error }, "Failed to create folder");

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create folder",
        cause: error,
      });
    }
  }

  /**
   * Get folders for a user/client
   */
  async getFolders(
    userId: number,
    clientProfileId?: number | null,
    parentId?: number | null
  ): Promise<AssetFolder[]> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      const conditions = [eq(assetFolders.userId, userId)];

      if (clientProfileId !== undefined) {
        if (clientProfileId === null) {
          conditions.push(isNull(assetFolders.clientProfileId));
        } else {
          conditions.push(eq(assetFolders.clientProfileId, clientProfileId));
        }
      }

      if (parentId !== undefined) {
        if (parentId === null) {
          conditions.push(isNull(assetFolders.parentId));
        } else {
          conditions.push(eq(assetFolders.parentId, parentId));
        }
      }

      return await db
        .select()
        .from(assetFolders)
        .where(and(...conditions))
        .orderBy(assetFolders.name);
    } catch (error) {
      logger.error({ err: error }, "Failed to get folders");

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get folders",
        cause: error,
      });
    }
  }

  /**
   * Get a single folder by ID
   */
  async getFolderById(
    folderId: number,
    userId?: number
  ): Promise<AssetFolder | null> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      const conditions = [eq(assetFolders.id, folderId)];

      if (userId !== undefined) {
        conditions.push(eq(assetFolders.userId, userId));
      }

      const [folder] = await db
        .select()
        .from(assetFolders)
        .where(and(...conditions))
        .limit(1);

      return folder || null;
    } catch (error) {
      logger.error({ err: error }, `Failed to get folder ${folderId}`);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get folder",
        cause: error,
      });
    }
  }

  /**
   * Delete a folder (and optionally its contents)
   */
  async deleteFolder(
    folderId: number,
    userId: number,
    deleteContents: boolean = false
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      // Verify ownership
      const folder = await this.getFolderById(folderId, userId);
      if (!folder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Folder not found",
        });
      }

      if (deleteContents) {
        // Get all assets in this folder
        const assets = await this.getAssets(userId, undefined, { folderId });

        // Delete all assets
        for (const asset of assets) {
          await this.deleteAsset(asset.id, userId);
        }

        // Recursively delete subfolders
        const subfolders = await this.getFolders(userId, undefined, folderId);
        for (const subfolder of subfolders) {
          await this.deleteFolder(subfolder.id, userId, true);
        }
      } else {
        // Move assets to root (no folder)
        await db
          .update(clientAssets)
          .set({ folderId: null, updatedAt: new Date() })
          .where(
            and(
              eq(clientAssets.folderId, folderId),
              eq(clientAssets.userId, userId)
            )
          );

        // Move subfolders to root
        await db
          .update(assetFolders)
          .set({ parentId: null })
          .where(
            and(
              eq(assetFolders.parentId, folderId),
              eq(assetFolders.userId, userId)
            )
          );
      }

      // Delete the folder
      await db.delete(assetFolders).where(eq(assetFolders.id, folderId));

      logger.info(`Folder ${folderId} deleted`);
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      logger.error({ err: error }, `Failed to delete folder ${folderId}`);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete folder",
        cause: error,
      });
    }
  }

  /**
   * Get a signed URL for an asset
   */
  async getAssetUrl(
    assetId: number,
    userId: number,
    expiresIn: number = 3600
  ): Promise<string> {
    const asset = await this.getAssetById(assetId, userId);
    if (!asset) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Asset not found",
      });
    }

    // Use CDN URL if available and asset is public
    if (asset.cdnUrl && asset.isPublic) {
      return asset.cdnUrl;
    }

    // Generate signed URL
    return cdnService.getUrl(asset.s3Key, { expiresIn });
  }

  /**
   * Get valid asset categories
   */
  getCategories(): readonly AssetCategory[] {
    return ASSET_CATEGORIES;
  }
}

export const assetService = new AssetService();
