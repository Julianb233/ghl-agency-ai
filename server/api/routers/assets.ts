/**
 * Assets tRPC Router
 *
 * API endpoints for managing client assets and folders
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { assetService, type AssetFilters } from "../../services/asset.service";
import { ASSET_CATEGORIES, type AssetCategory } from "../../../drizzle/schema-assets";

// ========================================
// VALIDATION SCHEMAS
// ========================================

const assetCategorySchema = z.enum(ASSET_CATEGORIES);

const assetFiltersSchema = z.object({
  category: assetCategorySchema.optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.number().int().nullable().optional(),
  isPublic: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

const uploadAssetSchema = z.object({
  clientProfileId: z.number().int().positive().nullable().optional(),
  fileData: z.object({
    base64: z.string(),
    originalFilename: z.string(),
    mimeType: z.string(),
    size: z.number().int().positive(),
  }),
  category: assetCategorySchema.optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.number().int().positive().optional(),
});

const updateAssetSchema = z.object({
  id: z.number().int().positive(),
  filename: z.string().optional(),
  category: assetCategorySchema.optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  isPublic: z.boolean().optional(),
});

const moveAssetSchema = z.object({
  assetId: z.number().int().positive(),
  folderId: z.number().int().positive().nullable(),
});

const createFolderSchema = z.object({
  clientProfileId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1, "Folder name is required").max(255),
  parentId: z.number().int().positive().nullable().optional(),
});

const listFoldersSchema = z.object({
  clientProfileId: z.number().int().positive().nullable().optional(),
  parentId: z.number().int().positive().nullable().optional(),
});

const deleteFolderSchema = z.object({
  id: z.number().int().positive(),
  deleteContents: z.boolean().optional().default(false),
});

// ========================================
// ASSETS ROUTER
// ========================================

export const assetsRouter = router({
  /**
   * Upload a new asset
   */
  upload: protectedProcedure
    .input(uploadAssetSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const buffer = Buffer.from(input.fileData.base64, "base64");

        const asset = await assetService.uploadAsset(
          ctx.user.id,
          input.clientProfileId,
          {
            buffer,
            originalFilename: input.fileData.originalFilename,
            mimeType: input.fileData.mimeType,
            size: input.fileData.size,
          },
          input.category,
          input.tags,
          input.folderId
        );

        return {
          success: true,
          message: "Asset uploaded successfully",
          data: asset,
        };
      } catch (error) {
        console.error("[Assets] Upload error:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload asset",
          cause: error,
        });
      }
    }),

  /**
   * List assets with optional filters
   */
  list: protectedProcedure
    .input(
      z.object({
        clientProfileId: z.number().int().positive().nullable().optional(),
        filters: assetFiltersSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const assets = await assetService.getAssets(
          ctx.user.id,
          input.clientProfileId,
          input.filters as AssetFilters
        );

        return {
          success: true,
          data: assets,
          count: assets.length,
        };
      } catch (error) {
        console.error("[Assets] List error:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list assets",
          cause: error,
        });
      }
    }),

  /**
   * Get a single asset by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        const asset = await assetService.getAssetById(input.id, ctx.user.id);

        if (!asset) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Asset not found",
          });
        }

        return {
          success: true,
          data: asset,
        };
      } catch (error) {
        console.error("[Assets] Get error:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get asset",
          cause: error,
        });
      }
    }),

  /**
   * Get a signed URL for accessing an asset
   */
  getUrl: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        expiresIn: z.number().int().min(60).max(604800).optional(), // 1 min to 7 days
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const url = await assetService.getAssetUrl(
          input.id,
          ctx.user.id,
          input.expiresIn
        );

        return {
          success: true,
          data: { url },
        };
      } catch (error) {
        console.error("[Assets] GetUrl error:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get asset URL",
          cause: error,
        });
      }
    }),

  /**
   * Update an asset
   */
  update: protectedProcedure
    .input(updateAssetSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updates } = input;

        const asset = await assetService.updateAsset(id, ctx.user.id, updates);

        return {
          success: true,
          message: "Asset updated successfully",
          data: asset,
        };
      } catch (error) {
        console.error("[Assets] Update error:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update asset",
          cause: error,
        });
      }
    }),

  /**
   * Delete an asset
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await assetService.deleteAsset(input.id, ctx.user.id);

        return {
          success: true,
          message: "Asset deleted successfully",
        };
      } catch (error) {
        console.error("[Assets] Delete error:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete asset",
          cause: error,
        });
      }
    }),

  /**
   * Move an asset to a different folder
   */
  move: protectedProcedure
    .input(moveAssetSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const asset = await assetService.moveAsset(
          input.assetId,
          ctx.user.id,
          input.folderId
        );

        return {
          success: true,
          message: "Asset moved successfully",
          data: asset,
        };
      } catch (error) {
        console.error("[Assets] Move error:", error);

        if (error instanceof TRPCError) throw error;

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to move asset",
          cause: error,
        });
      }
    }),

  /**
   * Get available asset categories
   */
  categories: protectedProcedure.query(async () => {
    return {
      success: true,
      data: assetService.getCategories(),
    };
  }),

  // ========================================
  // FOLDER ENDPOINTS
  // ========================================

  folders: router({
    /**
     * Create a new folder
     */
    create: protectedProcedure
      .input(createFolderSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const folder = await assetService.createFolder(
            ctx.user.id,
            input.clientProfileId,
            input.name,
            input.parentId
          );

          return {
            success: true,
            message: "Folder created successfully",
            data: folder,
          };
        } catch (error) {
          console.error("[Assets] Folder create error:", error);

          if (error instanceof TRPCError) throw error;

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create folder",
            cause: error,
          });
        }
      }),

    /**
     * List folders
     */
    list: protectedProcedure
      .input(listFoldersSchema.optional())
      .query(async ({ ctx, input }) => {
        try {
          const folders = await assetService.getFolders(
            ctx.user.id,
            input?.clientProfileId,
            input?.parentId
          );

          return {
            success: true,
            data: folders,
            count: folders.length,
          };
        } catch (error) {
          console.error("[Assets] Folder list error:", error);

          if (error instanceof TRPCError) throw error;

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to list folders",
            cause: error,
          });
        }
      }),

    /**
     * Get a single folder by ID
     */
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        try {
          const folder = await assetService.getFolderById(input.id, ctx.user.id);

          if (!folder) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Folder not found",
            });
          }

          return {
            success: true,
            data: folder,
          };
        } catch (error) {
          console.error("[Assets] Folder get error:", error);

          if (error instanceof TRPCError) throw error;

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get folder",
            cause: error,
          });
        }
      }),

    /**
     * Delete a folder
     */
    delete: protectedProcedure
      .input(deleteFolderSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          await assetService.deleteFolder(
            input.id,
            ctx.user.id,
            input.deleteContents
          );

          return {
            success: true,
            message: "Folder deleted successfully",
          };
        } catch (error) {
          console.error("[Assets] Folder delete error:", error);

          if (error instanceof TRPCError) throw error;

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete folder",
            cause: error,
          });
        }
      }),
  }),
});
