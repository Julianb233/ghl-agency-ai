/**
 * Costs Router - API Cost Tracking and Analytics
 *
 * Provides comprehensive cost tracking endpoints for monitoring API usage
 * and managing budgets.
 *
 * Features:
 * - Token usage statistics (Claude API)
 * - Gemini API token usage tracking
 * - Browserbase session cost tracking
 * - Storage (S3/R2) cost tracking
 * - Cost analytics and trends
 * - Budget management
 * - Daily/weekly/monthly cost summaries
 */

import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  apiTokenUsage,
  geminiTokenUsage,
  browserbaseCosts,
  storageCosts,
  dailyCostSummaries,
  costBudgets,
} from "../../../drizzle/schema-costs";
import { eq, and, gte, lte, desc, sum, count, avg, sql } from "drizzle-orm";
import { getCostTrackingService } from "../../services/costTracking.service";

// Time period enum for stats
const TimePeriod = z.enum(["day", "week", "month", "quarter", "year", "all"]);
type TimePeriodType = z.infer<typeof TimePeriod>;

/**
 * Helper: Get date range for time period
 */
function getDateRangeForPeriod(period: TimePeriodType): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "day":
      start.setDate(start.getDate() - 1);
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "all":
      start.setFullYear(2020, 0, 1); // Start from 2020
      break;
  }

  return { start, end };
}

export const costsRouter = router({
  /**
   * Get cost overview for the current user
   */
  getOverview: protectedProcedure
    .input(
      z.object({
        period: TimePeriod.default("month"),
      })
    )
    .query(async ({ input, ctx }) => {
      const costService = getCostTrackingService();
      const { start, end } = getDateRangeForPeriod(input.period);

      const analytics = await costService.getCostAnalytics({
        userId: ctx.user.id,
        startDate: start,
        endDate: end,
      });

      const budgetStatus = await costService.getBudgetStatus(ctx.user.id);

      return {
        period: input.period,
        dateRange: { start, end },
        analytics,
        budget: budgetStatus,
      };
    }),

  /**
   * Get detailed token usage statistics
   */
  getTokenUsageStats: protectedProcedure
    .input(
      z.object({
        period: TimePeriod.default("week"),
        executionId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const { start, end } = getDateRangeForPeriod(input.period);

      // Build query conditions
      const conditions = [
        eq(apiTokenUsage.userId, ctx.user.id),
        gte(apiTokenUsage.createdAt, start),
        lte(apiTokenUsage.createdAt, end),
      ];

      if (input.executionId) {
        conditions.push(eq(apiTokenUsage.executionId, input.executionId));
      }

      // Get aggregated stats
      const stats = await database
        .select({
          totalCalls: count(),
          totalInputTokens: sum(apiTokenUsage.inputTokens),
          totalOutputTokens: sum(apiTokenUsage.outputTokens),
          totalCacheCreationTokens: sum(apiTokenUsage.cacheCreationTokens),
          totalCacheReadTokens: sum(apiTokenUsage.cacheReadTokens),
          totalCost: sum(apiTokenUsage.totalCost),
          avgInputTokens: avg(apiTokenUsage.inputTokens),
          avgOutputTokens: avg(apiTokenUsage.outputTokens),
          avgCost: avg(apiTokenUsage.totalCost),
        })
        .from(apiTokenUsage)
        .where(and(...conditions));

      // Get breakdown by model
      const byModel = await database
        .select({
          model: apiTokenUsage.model,
          callCount: count(),
          totalTokens: sum(apiTokenUsage.totalTokens),
          totalCost: sum(apiTokenUsage.totalCost),
        })
        .from(apiTokenUsage)
        .where(and(...conditions))
        .groupBy(apiTokenUsage.model);

      // Get breakdown by prompt type
      const byPromptType = await database
        .select({
          promptType: apiTokenUsage.promptType,
          callCount: count(),
          totalCost: sum(apiTokenUsage.totalCost),
        })
        .from(apiTokenUsage)
        .where(and(...conditions))
        .groupBy(apiTokenUsage.promptType);

      return {
        period: input.period,
        dateRange: { start, end },
        overall: {
          totalCalls: Number(stats[0]?.totalCalls || 0),
          totalInputTokens: Number(stats[0]?.totalInputTokens || 0),
          totalOutputTokens: Number(stats[0]?.totalOutputTokens || 0),
          totalCacheCreationTokens: Number(stats[0]?.totalCacheCreationTokens || 0),
          totalCacheReadTokens: Number(stats[0]?.totalCacheReadTokens || 0),
          totalTokens: Number(stats[0]?.totalInputTokens || 0) + Number(stats[0]?.totalOutputTokens || 0),
          totalCost: Number(stats[0]?.totalCost || 0),
          avgInputTokens: Math.round(Number(stats[0]?.avgInputTokens || 0)),
          avgOutputTokens: Math.round(Number(stats[0]?.avgOutputTokens || 0)),
          avgCostPerCall: Number(stats[0]?.avgCost || 0),
        },
        byModel: byModel.map(row => ({
          model: row.model,
          callCount: Number(row.callCount),
          totalTokens: Number(row.totalTokens || 0),
          totalCost: Number(row.totalCost || 0),
        })),
        byPromptType: byPromptType
          .filter(row => row.promptType)
          .map(row => ({
            promptType: row.promptType!,
            callCount: Number(row.callCount),
            totalCost: Number(row.totalCost || 0),
          })),
      };
    }),

  /**
   * Get detailed Gemini token usage statistics
   */
  getGeminiTokenUsageStats: protectedProcedure
    .input(
      z.object({
        period: TimePeriod.default("week"),
        executionId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const { start, end } = getDateRangeForPeriod(input.period);

      // Build query conditions
      const conditions = [
        eq(geminiTokenUsage.userId, ctx.user.id),
        gte(geminiTokenUsage.createdAt, start),
        lte(geminiTokenUsage.createdAt, end),
      ];

      if (input.executionId) {
        conditions.push(eq(geminiTokenUsage.executionId, input.executionId));
      }

      // Get aggregated stats
      const stats = await database
        .select({
          totalCalls: count(),
          totalInputTokens: sum(geminiTokenUsage.inputTokens),
          totalOutputTokens: sum(geminiTokenUsage.outputTokens),
          totalCost: sum(geminiTokenUsage.totalCost),
          avgInputTokens: avg(geminiTokenUsage.inputTokens),
          avgOutputTokens: avg(geminiTokenUsage.outputTokens),
          avgCost: avg(geminiTokenUsage.totalCost),
        })
        .from(geminiTokenUsage)
        .where(and(...conditions));

      // Get breakdown by model
      const byModel = await database
        .select({
          model: geminiTokenUsage.model,
          callCount: count(),
          totalTokens: sum(geminiTokenUsage.totalTokens),
          totalCost: sum(geminiTokenUsage.totalCost),
        })
        .from(geminiTokenUsage)
        .where(and(...conditions))
        .groupBy(geminiTokenUsage.model);

      // Get breakdown by prompt type
      const byPromptType = await database
        .select({
          promptType: geminiTokenUsage.promptType,
          callCount: count(),
          totalCost: sum(geminiTokenUsage.totalCost),
        })
        .from(geminiTokenUsage)
        .where(and(...conditions))
        .groupBy(geminiTokenUsage.promptType);

      return {
        period: input.period,
        dateRange: { start, end },
        overall: {
          totalCalls: Number(stats[0]?.totalCalls || 0),
          totalInputTokens: Number(stats[0]?.totalInputTokens || 0),
          totalOutputTokens: Number(stats[0]?.totalOutputTokens || 0),
          totalTokens: Number(stats[0]?.totalInputTokens || 0) + Number(stats[0]?.totalOutputTokens || 0),
          totalCost: Number(stats[0]?.totalCost || 0),
          avgInputTokens: Math.round(Number(stats[0]?.avgInputTokens || 0)),
          avgOutputTokens: Math.round(Number(stats[0]?.avgOutputTokens || 0)),
          avgCostPerCall: Number(stats[0]?.avgCost || 0),
        },
        byModel: byModel.map(row => ({
          model: row.model,
          callCount: Number(row.callCount),
          totalTokens: Number(row.totalTokens || 0),
          totalCost: Number(row.totalCost || 0),
        })),
        byPromptType: byPromptType
          .filter(row => row.promptType)
          .map(row => ({
            promptType: row.promptType!,
            callCount: Number(row.callCount),
            totalCost: Number(row.totalCost || 0),
          })),
      };
    }),

  /**
   * Get Browserbase session costs
   */
  getBrowserbaseCosts: protectedProcedure
    .input(
      z.object({
        period: TimePeriod.default("week"),
        executionId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const { start, end } = getDateRangeForPeriod(input.period);

      // Build query conditions
      const conditions = [
        eq(browserbaseCosts.userId, ctx.user.id),
        gte(browserbaseCosts.createdAt, start),
        lte(browserbaseCosts.createdAt, end),
      ];

      if (input.executionId) {
        conditions.push(eq(browserbaseCosts.executionId, input.executionId));
      }

      // Get aggregated stats
      const stats = await database
        .select({
          totalSessions: count(),
          totalDurationMinutes: sum(browserbaseCosts.durationMinutes),
          totalCost: sum(browserbaseCosts.totalCost),
          totalRecordingCost: sum(browserbaseCosts.recordingCost),
          totalScreenshotCost: sum(browserbaseCosts.screenshotCost),
          avgDurationMinutes: avg(browserbaseCosts.durationMinutes),
          avgCost: avg(browserbaseCosts.totalCost),
        })
        .from(browserbaseCosts)
        .where(and(...conditions));

      // Get breakdown by status
      const byStatus = await database
        .select({
          status: browserbaseCosts.status,
          sessionCount: count(),
          totalCost: sum(browserbaseCosts.totalCost),
        })
        .from(browserbaseCosts)
        .where(and(...conditions))
        .groupBy(browserbaseCosts.status);

      // Get recent sessions
      const recentSessions = await database
        .select({
          sessionId: browserbaseCosts.sessionId,
          durationMinutes: browserbaseCosts.durationMinutes,
          totalCost: browserbaseCosts.totalCost,
          status: browserbaseCosts.status,
          createdAt: browserbaseCosts.createdAt,
        })
        .from(browserbaseCosts)
        .where(and(...conditions))
        .orderBy(desc(browserbaseCosts.createdAt))
        .limit(20);

      return {
        period: input.period,
        dateRange: { start, end },
        overall: {
          totalSessions: Number(stats[0]?.totalSessions || 0),
          totalDurationMinutes: Number(stats[0]?.totalDurationMinutes || 0),
          totalCost: Number(stats[0]?.totalCost || 0),
          totalRecordingCost: Number(stats[0]?.totalRecordingCost || 0),
          totalScreenshotCost: Number(stats[0]?.totalScreenshotCost || 0),
          avgDurationMinutes: Number(stats[0]?.avgDurationMinutes || 0),
          avgCostPerSession: Number(stats[0]?.avgCost || 0),
        },
        byStatus: byStatus.map(row => ({
          status: row.status,
          sessionCount: Number(row.sessionCount),
          totalCost: Number(row.totalCost || 0),
        })),
        recentSessions: recentSessions.map(row => ({
          sessionId: row.sessionId,
          durationMinutes: Number(row.durationMinutes),
          totalCost: Number(row.totalCost),
          status: row.status,
          createdAt: row.createdAt,
        })),
      };
    }),

  /**
   * Get Storage (S3/R2) operation costs
   */
  getStorageCosts: protectedProcedure
    .input(
      z.object({
        period: TimePeriod.default("week"),
        executionId: z.number().optional(),
        provider: z.enum(["s3", "r2", "gcs", "all"]).default("all"),
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const { start, end } = getDateRangeForPeriod(input.period);

      // Build query conditions
      const conditions = [
        eq(storageCosts.userId, ctx.user.id),
        gte(storageCosts.createdAt, start),
        lte(storageCosts.createdAt, end),
      ];

      if (input.executionId) {
        conditions.push(eq(storageCosts.executionId, input.executionId));
      }

      if (input.provider !== "all") {
        conditions.push(eq(storageCosts.provider, input.provider));
      }

      // Get aggregated stats
      const stats = await database
        .select({
          totalOperations: count(),
          totalSizeBytes: sum(storageCosts.sizeBytes),
          totalSizeMb: sum(storageCosts.sizeMb),
          totalCost: sum(storageCosts.totalCost),
          avgSizeMb: avg(storageCosts.sizeMb),
          avgCost: avg(storageCosts.totalCost),
        })
        .from(storageCosts)
        .where(and(...conditions));

      // Get breakdown by provider
      const byProvider = await database
        .select({
          provider: storageCosts.provider,
          operationCount: count(),
          totalSizeMb: sum(storageCosts.sizeMb),
          totalCost: sum(storageCosts.totalCost),
        })
        .from(storageCosts)
        .where(and(...conditions))
        .groupBy(storageCosts.provider);

      // Get breakdown by operation type
      const byOperationType = await database
        .select({
          operationType: storageCosts.operationType,
          operationCount: count(),
          totalSizeMb: sum(storageCosts.sizeMb),
          totalCost: sum(storageCosts.totalCost),
        })
        .from(storageCosts)
        .where(and(...conditions))
        .groupBy(storageCosts.operationType);

      // Get recent operations
      const recentOperations = await database
        .select({
          operationId: storageCosts.operationId,
          provider: storageCosts.provider,
          bucket: storageCosts.bucket,
          operationType: storageCosts.operationType,
          sizeMb: storageCosts.sizeMb,
          totalCost: storageCosts.totalCost,
          status: storageCosts.status,
          createdAt: storageCosts.createdAt,
        })
        .from(storageCosts)
        .where(and(...conditions))
        .orderBy(desc(storageCosts.createdAt))
        .limit(20);

      return {
        period: input.period,
        dateRange: { start, end },
        overall: {
          totalOperations: Number(stats[0]?.totalOperations || 0),
          totalSizeBytes: Number(stats[0]?.totalSizeBytes || 0),
          totalSizeMb: Number(stats[0]?.totalSizeMb || 0),
          totalCost: Number(stats[0]?.totalCost || 0),
          avgSizeMb: Number(stats[0]?.avgSizeMb || 0),
          avgCostPerOperation: Number(stats[0]?.avgCost || 0),
        },
        byProvider: byProvider.map(row => ({
          provider: row.provider,
          operationCount: Number(row.operationCount),
          totalSizeMb: Number(row.totalSizeMb || 0),
          totalCost: Number(row.totalCost || 0),
        })),
        byOperationType: byOperationType.map(row => ({
          operationType: row.operationType,
          operationCount: Number(row.operationCount),
          totalSizeMb: Number(row.totalSizeMb || 0),
          totalCost: Number(row.totalCost || 0),
        })),
        recentOperations: recentOperations.map(row => ({
          operationId: row.operationId,
          provider: row.provider,
          bucket: row.bucket,
          operationType: row.operationType,
          sizeMb: Number(row.sizeMb),
          totalCost: Number(row.totalCost),
          status: row.status,
          createdAt: row.createdAt,
        })),
      };
    }),

  /**
   * Get daily cost summaries
   */
  getDailySummaries: protectedProcedure
    .input(
      z.object({
        period: TimePeriod.default("month"),
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const { start, end } = getDateRangeForPeriod(input.period);

      const summaries = await database
        .select()
        .from(dailyCostSummaries)
        .where(
          and(
            eq(dailyCostSummaries.userId, ctx.user.id),
            gte(dailyCostSummaries.date, start),
            lte(dailyCostSummaries.date, end)
          )
        )
        .orderBy(dailyCostSummaries.date);

      return {
        period: input.period,
        dateRange: { start, end },
        summaries: summaries.map(s => ({
          date: s.date,
          // Claude API stats
          totalApiCalls: s.totalApiCalls,
          totalInputTokens: s.totalInputTokens,
          totalOutputTokens: s.totalOutputTokens,
          totalCacheTokens: s.totalCacheTokens,
          apiCostUsd: Number(s.apiCostUsd),
          // Gemini API stats
          totalGeminiCalls: s.totalGeminiCalls || 0,
          totalGeminiInputTokens: s.totalGeminiInputTokens || 0,
          totalGeminiOutputTokens: s.totalGeminiOutputTokens || 0,
          geminiCostUsd: Number(s.geminiCostUsd || 0),
          // Browserbase stats
          totalSessions: s.totalSessions,
          totalSessionMinutes: Number(s.totalSessionMinutes),
          browserbaseCostUsd: Number(s.browserbaseCostUsd),
          // Storage stats
          totalStorageOperations: s.totalStorageOperations || 0,
          totalStorageMb: Number(s.totalStorageMb || 0),
          storageCostUsd: Number(s.storageCostUsd || 0),
          // Totals
          totalCostUsd: Number(s.totalCostUsd),
          costByModel: s.costByModel as Record<string, number> | null,
          costByProvider: s.costByProvider as Record<string, number> | null,
        })),
      };
    }),

  /**
   * Get current budget status
   */
  getBudget: protectedProcedure.query(async ({ ctx }) => {
    const costService = getCostTrackingService();
    return await costService.getBudgetStatus(ctx.user.id);
  }),

  /**
   * Set or update user budget
   */
  setBudget: protectedProcedure
    .input(
      z.object({
        dailyBudget: z.number().optional(),
        weeklyBudget: z.number().optional(),
        monthlyBudget: z.number().optional(),
        alertThreshold: z.number().min(1).max(100).default(80),
        autoStopOnLimit: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Check if budget exists
      const existing = await database
        .select()
        .from(costBudgets)
        .where(eq(costBudgets.userId, ctx.user.id))
        .limit(1);

      const now = new Date();

      if (existing.length > 0) {
        // Update existing budget
        await database
          .update(costBudgets)
          .set({
            dailyBudget: input.dailyBudget?.toString(),
            weeklyBudget: input.weeklyBudget?.toString(),
            monthlyBudget: input.monthlyBudget?.toString(),
            alertThreshold: input.alertThreshold,
            autoStopOnLimit: input.autoStopOnLimit,
            updatedAt: now,
          })
          .where(eq(costBudgets.userId, ctx.user.id));
      } else {
        // Create new budget
        await database.insert(costBudgets).values({
          userId: ctx.user.id,
          dailyBudget: input.dailyBudget?.toString(),
          weeklyBudget: input.weeklyBudget?.toString(),
          monthlyBudget: input.monthlyBudget?.toString(),
          alertThreshold: input.alertThreshold,
          autoStopOnLimit: input.autoStopOnLimit,
          isActive: true,
        });
      }

      // Return updated budget status
      const costService = getCostTrackingService();
      return await costService.getBudgetStatus(ctx.user.id);
    }),

  /**
   * Get cost trends over time
   */
  getCostTrends: protectedProcedure
    .input(
      z.object({
        period: TimePeriod.default("month"),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      const { start, end } = getDateRangeForPeriod(input.period);

      // Determine date truncation based on groupBy
      let dateTrunc: string;
      switch (input.groupBy) {
        case "day":
          dateTrunc = "day";
          break;
        case "week":
          dateTrunc = "week";
          break;
        case "month":
          dateTrunc = "month";
          break;
      }

      // Get trends from daily summaries
      const trends = await database
        .select({
          period: sql<Date>`DATE_TRUNC('${sql.raw(dateTrunc)}', ${dailyCostSummaries.date})`.as("period"),
          totalCost: sum(dailyCostSummaries.totalCostUsd),
          apiCost: sum(dailyCostSummaries.apiCostUsd),
          geminiCost: sum(dailyCostSummaries.geminiCostUsd),
          browserbaseCost: sum(dailyCostSummaries.browserbaseCostUsd),
          storageCost: sum(dailyCostSummaries.storageCostUsd),
          totalApiCalls: sum(dailyCostSummaries.totalApiCalls),
          totalGeminiCalls: sum(dailyCostSummaries.totalGeminiCalls),
          totalSessions: sum(dailyCostSummaries.totalSessions),
          totalStorageOperations: sum(dailyCostSummaries.totalStorageOperations),
          totalTokens: sql<number>`${sum(dailyCostSummaries.totalInputTokens)} + ${sum(dailyCostSummaries.totalOutputTokens)}`,
          totalGeminiTokens: sql<number>`COALESCE(${sum(dailyCostSummaries.totalGeminiInputTokens)}, 0) + COALESCE(${sum(dailyCostSummaries.totalGeminiOutputTokens)}, 0)`,
        })
        .from(dailyCostSummaries)
        .where(
          and(
            eq(dailyCostSummaries.userId, ctx.user.id),
            gte(dailyCostSummaries.date, start),
            lte(dailyCostSummaries.date, end)
          )
        )
        .groupBy(sql`DATE_TRUNC('${sql.raw(dateTrunc)}', ${dailyCostSummaries.date})`)
        .orderBy(sql`DATE_TRUNC('${sql.raw(dateTrunc)}', ${dailyCostSummaries.date})`);

      return {
        period: input.period,
        groupBy: input.groupBy,
        dateRange: { start, end },
        trends: trends.map(row => ({
          period: row.period,
          totalCost: Number(row.totalCost || 0),
          apiCost: Number(row.apiCost || 0),
          geminiCost: Number(row.geminiCost || 0),
          browserbaseCost: Number(row.browserbaseCost || 0),
          storageCost: Number(row.storageCost || 0),
          totalApiCalls: Number(row.totalApiCalls || 0),
          totalGeminiCalls: Number(row.totalGeminiCalls || 0),
          totalSessions: Number(row.totalSessions || 0),
          totalStorageOperations: Number(row.totalStorageOperations || 0),
          totalTokens: Number(row.totalTokens || 0),
          totalGeminiTokens: Number(row.totalGeminiTokens || 0),
        })),
      };
    }),

  /**
   * Get cost breakdown by execution
   */
  getExecutionCosts: protectedProcedure
    .input(
      z.object({
        executionId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database) {
        throw new Error("Database not available");
      }

      // Get Claude API token usage for this execution
      const apiUsage = await database
        .select()
        .from(apiTokenUsage)
        .where(
          and(
            eq(apiTokenUsage.executionId, input.executionId),
            eq(apiTokenUsage.userId, ctx.user.id)
          )
        )
        .orderBy(apiTokenUsage.createdAt);

      // Get Gemini API token usage for this execution
      const geminiUsage = await database
        .select()
        .from(geminiTokenUsage)
        .where(
          and(
            eq(geminiTokenUsage.executionId, input.executionId),
            eq(geminiTokenUsage.userId, ctx.user.id)
          )
        )
        .orderBy(geminiTokenUsage.createdAt);

      // Get Browserbase costs for this execution
      const browserbaseCost = await database
        .select()
        .from(browserbaseCosts)
        .where(
          and(
            eq(browserbaseCosts.executionId, input.executionId),
            eq(browserbaseCosts.userId, ctx.user.id)
          )
        )
        .limit(1);

      // Get Storage costs for this execution
      const storageUsage = await database
        .select()
        .from(storageCosts)
        .where(
          and(
            eq(storageCosts.executionId, input.executionId),
            eq(storageCosts.userId, ctx.user.id)
          )
        )
        .orderBy(storageCosts.createdAt);

      const totalApiCost = apiUsage.reduce((sum, row) => sum + Number(row.totalCost), 0);
      const totalGeminiCost = geminiUsage.reduce((sum, row) => sum + Number(row.totalCost), 0);
      const totalBrowserbaseCost = browserbaseCost.length > 0 ? Number(browserbaseCost[0].totalCost) : 0;
      const totalStorageCost = storageUsage.reduce((sum, row) => sum + Number(row.totalCost), 0);
      const totalCost = totalApiCost + totalGeminiCost + totalBrowserbaseCost + totalStorageCost;

      return {
        executionId: input.executionId,
        totalCost,
        apiCost: totalApiCost,
        geminiCost: totalGeminiCost,
        browserbaseCost: totalBrowserbaseCost,
        storageCost: totalStorageCost,
        // Claude API calls
        apiCalls: apiUsage.map(row => ({
          requestId: row.requestId,
          model: row.model,
          inputTokens: row.inputTokens,
          outputTokens: row.outputTokens,
          cacheCreationTokens: row.cacheCreationTokens,
          cacheReadTokens: row.cacheReadTokens,
          totalTokens: row.totalTokens,
          totalCost: Number(row.totalCost),
          promptType: row.promptType,
          createdAt: row.createdAt,
        })),
        // Gemini API calls
        geminiCalls: geminiUsage.map(row => ({
          requestId: row.requestId,
          model: row.model,
          inputTokens: row.inputTokens,
          outputTokens: row.outputTokens,
          totalTokens: row.totalTokens,
          totalCost: Number(row.totalCost),
          promptType: row.promptType,
          createdAt: row.createdAt,
        })),
        // Browserbase session
        browserbaseSession: browserbaseCost.length > 0 ? {
          sessionId: browserbaseCost[0].sessionId,
          durationMinutes: Number(browserbaseCost[0].durationMinutes),
          totalCost: Number(browserbaseCost[0].totalCost),
          status: browserbaseCost[0].status,
        } : null,
        // Storage operations
        storageOperations: storageUsage.map(row => ({
          operationId: row.operationId,
          provider: row.provider,
          bucket: row.bucket,
          operationType: row.operationType,
          sizeMb: Number(row.sizeMb),
          totalCost: Number(row.totalCost),
          status: row.status,
          createdAt: row.createdAt,
        })),
      };
    }),
});
