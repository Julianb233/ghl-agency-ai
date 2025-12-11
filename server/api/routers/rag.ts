/**
 * RAG Router
 *
 * tRPC endpoints for RAG system:
 * - Document ingestion
 * - Documentation retrieval
 * - System prompt building
 * - Source management
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ragService } from "../../services/rag.service";
import { platformDetectionService } from "../../services/platformDetection.service";
import { getDb } from "../../db";
import { documentationSources, documentationChunks } from "../../../drizzle/schema-rag";
import { eq, desc, sql, and } from "drizzle-orm";

export const ragRouter = router({
  /**
   * Ingest a new documentation document
   * Requires authentication (protectedProcedure)
   */
  ingestDocument: protectedProcedure
    .input(
      z.object({
        platform: z.string().min(1).max(50),
        category: z.string().min(1).max(50),
        title: z.string().min(1),
        content: z.string().min(10),
        sourceUrl: z.string().url().optional(),
        sourceType: z.enum(["markdown", "html", "pdf", "docx"]).optional(),
        version: z.string().optional(),
        // Chunking options
        maxTokens: z.number().min(100).max(2000).optional(),
        overlapTokens: z.number().min(0).max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await ragService.ingest({
          platform: input.platform,
          category: input.category,
          title: input.title,
          content: input.content,
          sourceUrl: input.sourceUrl,
          sourceType: input.sourceType,
          version: input.version,
          userId: ctx.user.id,
          chunkingOptions: {
            maxTokens: input.maxTokens,
            overlapTokens: input.overlapTokens,
          },
        });

        return {
          success: true,
          sourceId: result.sourceId,
          chunkCount: result.chunkCount,
          totalTokens: result.totalTokens,
          message: `Successfully ingested "${input.title}" with ${result.chunkCount} chunks`,
        };
      } catch (error) {
        console.error("[RAG Router] Ingest failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to ingest document: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Retrieve relevant documentation for a query
   * Public endpoint for AI system prompt building
   */
  retrieve: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        topK: z.number().min(1).max(20).optional(),
        platforms: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        minSimilarity: z.number().min(0).max(1).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const chunks = await ragService.retrieve(input.query, {
          topK: input.topK,
          platforms: input.platforms,
          categories: input.categories,
          minSimilarity: input.minSimilarity,
        });

        return {
          success: true,
          chunks,
          count: chunks.length,
        };
      } catch (error) {
        console.error("[RAG Router] Retrieve failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to retrieve documentation: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Build a system prompt with RAG context
   * This is the main endpoint for AI chat integration
   */
  buildSystemPrompt: publicProcedure
    .input(
      z.object({
        userPrompt: z.string().min(1),
        platform: z.string().optional(),
        customTemplate: z.string().optional(),
        maxDocumentationTokens: z.number().min(100).max(10000).optional(),
        includeExamples: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await ragService.buildSystemPrompt(input.userPrompt, {
          platform: input.platform,
          customTemplate: input.customTemplate,
          maxDocumentationTokens: input.maxDocumentationTokens,
          includeExamples: input.includeExamples,
        });

        return {
          success: true,
          systemPrompt: result.systemPrompt,
          retrievedChunks: result.retrievedChunks,
          detectedPlatforms: result.detectedPlatforms,
          chunkCount: result.retrievedChunks.length,
        };
      } catch (error) {
        console.error("[RAG Router] Build system prompt failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to build system prompt: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Detect platforms from user input
   */
  detectPlatforms: publicProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
        url: z.string().optional(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await platformDetectionService.detect({
          prompt: input.prompt,
          url: input.url,
          context: input.context,
        });

        return {
          success: true,
          platforms: result.platforms,
          primaryPlatform: result.primaryPlatform,
          isDnsRelated: result.isDnsRelated,
          isDomainRelated: result.isDomainRelated,
        };
      } catch (error) {
        console.error("[RAG Router] Platform detection failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to detect platforms: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * List all documentation sources
   * Requires authentication
   */
  listSources: protectedProcedure
    .input(
      z.object({
        platform: z.string().optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const database = await db;
        if (!database) {
          throw new Error("Database not available");
        }

        const { platform, category, isActive, limit = 20, offset = 0 } = input;

        let query = database
          .select({
            id: documentationSources.id,
            platform: documentationSources.platform,
            category: documentationSources.category,
            title: documentationSources.title,
            sourceUrl: documentationSources.sourceUrl,
            version: documentationSources.version,
            isActive: documentationSources.isActive,
            createdAt: documentationSources.createdAt,
            updatedAt: documentationSources.updatedAt,
          })
          .from(documentationSources);

        // Apply filters
        const conditions = [];
        if (platform) {
          conditions.push(eq(documentationSources.platform, platform));
        }
        if (category) {
          conditions.push(eq(documentationSources.category, category));
        }
        if (isActive !== undefined) {
          conditions.push(eq(documentationSources.isActive, isActive));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }

        const sources = await query
          .orderBy(desc(documentationSources.createdAt))
          .limit(limit)
          .offset(offset);

        // Get chunk counts for each source
        const sourceIds = sources.map(s => s.id);
        const chunkCounts = await database
          .select({
            sourceId: documentationChunks.sourceId,
            count: sql<number>`count(*)`,
          })
          .from(documentationChunks)
          .where(sql`${documentationChunks.sourceId} = ANY(${sourceIds})`)
          .groupBy(documentationChunks.sourceId);

        const countMap = new Map(chunkCounts.map(c => [c.sourceId, Number(c.count)]));

        const sourcesWithCounts = sources.map(s => ({
          ...s,
          chunkCount: countMap.get(s.id) || 0,
        }));

        return {
          success: true,
          sources: sourcesWithCounts,
          count: sourcesWithCounts.length,
        };
      } catch (error) {
        console.error("[RAG Router] List sources failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list sources: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Get a single documentation source with its chunks
   */
  getSource: protectedProcedure
    .input(z.object({ sourceId: z.number() }))
    .query(async ({ input }) => {
      try {
        const database = await db;
        if (!database) {
          throw new Error("Database not available");
        }

        const source = await database.query.documentationSources.findFirst({
          where: eq(documentationSources.id, input.sourceId),
        });

        if (!source) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Source ${input.sourceId} not found`,
          });
        }

        // Get chunks for this source
        const chunks = await database
          .select({
            id: documentationChunks.id,
            chunkIndex: documentationChunks.chunkIndex,
            content: documentationChunks.content,
            tokenCount: documentationChunks.tokenCount,
            metadata: documentationChunks.metadata,
          })
          .from(documentationChunks)
          .where(eq(documentationChunks.sourceId, input.sourceId))
          .orderBy(documentationChunks.chunkIndex);

        return {
          success: true,
          source,
          chunks,
          chunkCount: chunks.length,
        };
      } catch (error) {
        console.error("[RAG Router] Get source failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get source: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Delete a documentation source
   */
  deleteSource: protectedProcedure
    .input(z.object({ sourceId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await ragService.deleteSource(input.sourceId);

        return {
          success: true,
          message: `Source ${input.sourceId} deleted successfully`,
        };
      } catch (error) {
        console.error("[RAG Router] Delete source failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete source: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Update a documentation source
   */
  updateSource: protectedProcedure
    .input(
      z.object({
        sourceId: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        sourceUrl: z.string().url().optional(),
        version: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { sourceId, ...updates } = input;

        await ragService.updateSource(sourceId, updates);

        return {
          success: true,
          message: `Source ${sourceId} updated successfully`,
        };
      } catch (error) {
        console.error("[RAG Router] Update source failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update source: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }),

  /**
   * Seed platform keywords (admin operation)
   * This should be called once during initial setup
   */
  seedPlatformKeywords: protectedProcedure.mutation(async () => {
    try {
      await platformDetectionService.seedPlatformKeywords();

      return {
        success: true,
        message: "Platform keywords seeded successfully",
      };
    } catch (error) {
      console.error("[RAG Router] Seed keywords failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to seed keywords: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }),
});
