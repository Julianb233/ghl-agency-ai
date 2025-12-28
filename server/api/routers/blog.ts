/**
 * Blog Router
 * tRPC endpoints for Notion-powered blog
 */

import { z } from "zod";
import { publicProcedure, router } from "../../_core/trpc";
import { notionBlogService } from "../../services/notion-blog.service";

export const blogRouter = router({
  /**
   * Get paginated list of published blog posts
   */
  getPosts: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
          cursor: z.string().optional(),
          category: z.string().optional(),
          tag: z.string().optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const result = await notionBlogService.getPosts({
          limit: input?.limit,
          cursor: input?.cursor,
          category: input?.category,
          tag: input?.tag,
          search: input?.search,
        });

        return {
          success: true,
          posts: result.posts,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        };
      } catch (error) {
        console.error("[Blog Router] getPosts error:", error);
        return {
          success: false,
          posts: [],
          hasMore: false,
          nextCursor: undefined,
          error: error instanceof Error ? error.message : "Failed to fetch posts",
        };
      }
    }),

  /**
   * Get a single blog post by slug
   */
  getPost: publicProcedure
    .input(
      z.object({
        slug: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      try {
        const post = await notionBlogService.getPostBySlug(input.slug);

        if (!post) {
          return {
            success: false,
            post: null,
            error: "Post not found",
          };
        }

        return {
          success: true,
          post,
        };
      } catch (error) {
        console.error("[Blog Router] getPost error:", error);
        return {
          success: false,
          post: null,
          error: error instanceof Error ? error.message : "Failed to fetch post",
        };
      }
    }),

  /**
   * Get all blog categories
   */
  getCategories: publicProcedure.query(async () => {
    try {
      const categories = await notionBlogService.getCategories();

      return {
        success: true,
        categories,
      };
    } catch (error) {
      console.error("[Blog Router] getCategories error:", error);
      return {
        success: false,
        categories: [],
        error: error instanceof Error ? error.message : "Failed to fetch categories",
      };
    }
  }),

  /**
   * Get all blog tags
   */
  getTags: publicProcedure.query(async () => {
    try {
      const tags = await notionBlogService.getTags();

      return {
        success: true,
        tags,
      };
    } catch (error) {
      console.error("[Blog Router] getTags error:", error);
      return {
        success: false,
        tags: [],
        error: error instanceof Error ? error.message : "Failed to fetch tags",
      };
    }
  }),

  /**
   * Clear blog cache (admin operation)
   */
  clearCache: publicProcedure.mutation(async () => {
    try {
      notionBlogService.clearCache();
      return {
        success: true,
        message: "Blog cache cleared",
      };
    } catch (error) {
      console.error("[Blog Router] clearCache error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clear cache",
      };
    }
  }),
});
