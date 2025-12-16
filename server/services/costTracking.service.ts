/**
 * Cost Tracking Service
 * Comprehensive API cost tracking for Claude API and Browserbase sessions
 *
 * Features:
 * - Track token usage from Claude API responses (input, output, cache tokens)
 * - Calculate costs based on current pricing tiers
 * - Track Browserbase session duration and costs
 * - Aggregate daily cost summaries
 * - Budget management and alerts
 * - Cost analytics and reporting
 */

import { getDb } from "../db";
import {
  apiTokenUsage,
  browserbaseCosts,
  dailyCostSummaries,
  costBudgets,
  type InsertApiTokenUsage,
  type InsertBrowserbaseCost,
  type InsertDailyCostSummary,
} from "../../drizzle/schema-costs";
import { eq, and, gte, lte, sum, count, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

// ========================================
// PRICING CONSTANTS (as of 2025)
// ========================================

/**
 * Claude API pricing per 1M tokens (USD)
 * https://www.anthropic.com/pricing
 */
export const CLAUDE_PRICING = {
  "claude-opus-4-5-20251101": {
    input: 3.0, // $3 per 1M input tokens
    output: 15.0, // $15 per 1M output tokens
    cacheCreation: 3.75, // $3.75 per 1M tokens (25% markup)
    cacheRead: 0.30, // $0.30 per 1M tokens (90% discount)
  },
  "claude-sonnet-4-5-20251022": {
    input: 3.0,
    output: 15.0,
    cacheCreation: 3.75,
    cacheRead: 0.30,
  },
  "claude-3-5-sonnet-20241022": {
    input: 3.0,
    output: 15.0,
    cacheCreation: 3.75,
    cacheRead: 0.30,
  },
} as const;

/**
 * Browserbase pricing (estimated)
 * https://www.browserbase.com/pricing
 */
export const BROWSERBASE_PRICING = {
  sessionCostPerMinute: 0.01, // ~$0.01 per minute of session time
  recordingCost: 0.005, // Additional cost for recordings
  screenshotCost: 0.001, // Per screenshot
} as const;

// ========================================
// TYPES
// ========================================

export interface TokenUsageData {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  cacheCost: number;
  totalCost: number;
}

export interface BrowserbaseSessionData {
  sessionId: string;
  projectId?: string;
  durationMs: number;
  hasRecording?: boolean;
  screenshotCount?: number;
  debugUrl?: string;
  recordingUrl?: string;
  status: "active" | "completed" | "failed" | "timeout";
}

export interface BudgetStatus {
  hasBudget: boolean;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  dailySpend: number;
  weeklySpend: number;
  monthlySpend: number;
  dailyRemaining?: number;
  weeklyRemaining?: number;
  monthlyRemaining?: number;
  isOverBudget: boolean;
  shouldAlert: boolean;
}

// ========================================
// COST TRACKING SERVICE
// ========================================

export class CostTrackingService {
  /**
   * Calculate cost from token usage based on model pricing
   */
  calculateCost(
    model: string,
    tokens: TokenUsageData
  ): CostCalculation {
    // Get pricing for the model (default to Opus 4.5 if not found)
    const pricing = CLAUDE_PRICING[model as keyof typeof CLAUDE_PRICING] || CLAUDE_PRICING["claude-opus-4-5-20251101"];

    // Calculate costs (pricing is per 1M tokens)
    const inputCost = (tokens.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (tokens.outputTokens / 1_000_000) * pricing.output;

    // Calculate cache costs
    let cacheCost = 0;
    if (tokens.cacheCreationTokens) {
      cacheCost += (tokens.cacheCreationTokens / 1_000_000) * pricing.cacheCreation;
    }
    if (tokens.cacheReadTokens) {
      cacheCost += (tokens.cacheReadTokens / 1_000_000) * pricing.cacheRead;
    }

    const totalCost = inputCost + outputCost + cacheCost;

    return {
      inputCost,
      outputCost,
      cacheCost,
      totalCost,
    };
  }

  /**
   * Extract token usage from Claude API response
   */
  extractTokenUsage(response: Anthropic.Message): TokenUsageData {
    const usage = response.usage;

    return {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      cacheCreationTokens: usage.cache_creation_input_tokens || 0,
      cacheReadTokens: usage.cache_read_input_tokens || 0,
    };
  }

  /**
   * Track Claude API call cost
   */
  async trackApiCall(params: {
    userId: number;
    executionId?: number;
    response: Anthropic.Message;
    model: string;
    promptType?: string;
    toolsUsed?: string[];
    responseTime?: number;
  }): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Extract token usage
    const tokens = this.extractTokenUsage(params.response);
    const totalTokens =
      tokens.inputTokens +
      tokens.outputTokens +
      (tokens.cacheCreationTokens || 0) +
      (tokens.cacheReadTokens || 0);

    // Calculate costs
    const costs = this.calculateCost(params.model, tokens);

    // Insert token usage record
    await db.insert(apiTokenUsage).values({
      userId: params.userId,
      executionId: params.executionId,
      requestId: params.response.id,
      model: params.model,
      inputTokens: tokens.inputTokens,
      outputTokens: tokens.outputTokens,
      cacheCreationTokens: tokens.cacheCreationTokens || 0,
      cacheReadTokens: tokens.cacheReadTokens || 0,
      totalTokens,
      inputCost: costs.inputCost.toFixed(4),
      outputCost: costs.outputCost.toFixed(4),
      cacheCost: costs.cacheCost.toFixed(4),
      totalCost: costs.totalCost.toFixed(4),
      promptType: params.promptType,
      toolsUsed: params.toolsUsed ? JSON.stringify(params.toolsUsed) : null,
      responseTime: params.responseTime,
      stopReason: params.response.stop_reason || undefined,
    });

    // Update daily summary
    await this.updateDailySummary(params.userId, new Date());

    // Check budget limits
    await this.checkBudgetLimits(params.userId);
  }

  /**
   * Track Browserbase session cost
   */
  async trackBrowserbaseSession(params: {
    userId: number;
    executionId?: number;
    sessionData: BrowserbaseSessionData;
  }): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { sessionData } = params;
    const durationMinutes = sessionData.durationMs / 1000 / 60;

    // Calculate base session cost
    let totalCost = durationMinutes * BROWSERBASE_PRICING.sessionCostPerMinute;

    // Add recording cost
    const recordingCost = sessionData.hasRecording ? BROWSERBASE_PRICING.recordingCost : 0;
    totalCost += recordingCost;

    // Add screenshot costs
    const screenshotCost = (sessionData.screenshotCount || 0) * BROWSERBASE_PRICING.screenshotCost;
    totalCost += screenshotCost;

    // Insert browserbase cost record
    await db.insert(browserbaseCosts).values({
      userId: params.userId,
      executionId: params.executionId,
      sessionId: sessionData.sessionId,
      projectId: sessionData.projectId,
      durationMs: sessionData.durationMs,
      durationMinutes: durationMinutes.toFixed(2),
      costPerMinute: BROWSERBASE_PRICING.sessionCostPerMinute.toFixed(4),
      totalCost: totalCost.toFixed(4),
      debugUrl: sessionData.debugUrl,
      recordingUrl: sessionData.recordingUrl,
      hasRecording: sessionData.hasRecording || false,
      recordingCost: recordingCost.toFixed(4),
      screenshotCount: sessionData.screenshotCount || 0,
      screenshotCost: screenshotCost.toFixed(4),
      status: sessionData.status,
      startedAt: new Date(Date.now() - sessionData.durationMs),
      completedAt: sessionData.status === "completed" ? new Date() : null,
    });

    // Update daily summary
    await this.updateDailySummary(params.userId, new Date());

    // Check budget limits
    await this.checkBudgetLimits(params.userId);
  }

  /**
   * Update daily cost summary for a user
   */
  async updateDailySummary(userId: number, date: Date): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Truncate to start of day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Aggregate API costs for the day
    const apiStats = await db
      .select({
        totalCalls: count(),
        totalInputTokens: sum(apiTokenUsage.inputTokens),
        totalOutputTokens: sum(apiTokenUsage.outputTokens),
        totalCacheTokens: sql<number>`${sum(apiTokenUsage.cacheCreationTokens)} + ${sum(apiTokenUsage.cacheReadTokens)}`,
        apiCost: sum(apiTokenUsage.totalCost),
      })
      .from(apiTokenUsage)
      .where(
        and(
          eq(apiTokenUsage.userId, userId),
          gte(apiTokenUsage.createdAt, dayStart),
          lte(apiTokenUsage.createdAt, dayEnd)
        )
      );

    // Aggregate Browserbase costs for the day
    const browserbaseStats = await db
      .select({
        totalSessions: count(),
        totalMinutes: sum(browserbaseCosts.durationMinutes),
        browserbaseCost: sum(browserbaseCosts.totalCost),
      })
      .from(browserbaseCosts)
      .where(
        and(
          eq(browserbaseCosts.userId, userId),
          gte(browserbaseCosts.createdAt, dayStart),
          lte(browserbaseCosts.createdAt, dayEnd)
        )
      );

    const apiCost = Number(apiStats[0]?.apiCost || 0);
    const browserbaseCost = Number(browserbaseStats[0]?.browserbaseCost || 0);
    const totalCost = apiCost + browserbaseCost;

    // Get cost breakdown by model
    const costByModel = await db
      .select({
        model: apiTokenUsage.model,
        cost: sum(apiTokenUsage.totalCost),
      })
      .from(apiTokenUsage)
      .where(
        and(
          eq(apiTokenUsage.userId, userId),
          gte(apiTokenUsage.createdAt, dayStart),
          lte(apiTokenUsage.createdAt, dayEnd)
        )
      )
      .groupBy(apiTokenUsage.model);

    const costByModelJson: Record<string, number> = {};
    costByModel.forEach(row => {
      costByModelJson[row.model] = Number(row.cost || 0);
    });

    // Upsert daily summary
    const existingSummary = await db
      .select()
      .from(dailyCostSummaries)
      .where(
        and(
          eq(dailyCostSummaries.userId, userId),
          eq(dailyCostSummaries.date, dayStart)
        )
      )
      .limit(1);

    if (existingSummary.length > 0) {
      // Update existing summary
      await db
        .update(dailyCostSummaries)
        .set({
          totalApiCalls: Number(apiStats[0]?.totalCalls || 0),
          totalInputTokens: Number(apiStats[0]?.totalInputTokens || 0),
          totalOutputTokens: Number(apiStats[0]?.totalOutputTokens || 0),
          totalCacheTokens: Number(apiStats[0]?.totalCacheTokens || 0),
          apiCostUsd: apiCost.toFixed(4),
          totalSessions: Number(browserbaseStats[0]?.totalSessions || 0),
          totalSessionMinutes: Number(browserbaseStats[0]?.totalMinutes || 0).toFixed(2),
          browserbaseCostUsd: browserbaseCost.toFixed(4),
          totalCostUsd: totalCost.toFixed(4),
          costByModel: costByModelJson,
          updatedAt: new Date(),
        })
        .where(eq(dailyCostSummaries.id, existingSummary[0].id));
    } else {
      // Insert new summary
      await db.insert(dailyCostSummaries).values({
        userId,
        date: dayStart,
        totalApiCalls: Number(apiStats[0]?.totalCalls || 0),
        totalInputTokens: Number(apiStats[0]?.totalInputTokens || 0),
        totalOutputTokens: Number(apiStats[0]?.totalOutputTokens || 0),
        totalCacheTokens: Number(apiStats[0]?.totalCacheTokens || 0),
        apiCostUsd: apiCost.toFixed(4),
        totalSessions: Number(browserbaseStats[0]?.totalSessions || 0),
        totalSessionMinutes: Number(browserbaseStats[0]?.totalMinutes || 0).toFixed(2),
        browserbaseCostUsd: browserbaseCost.toFixed(4),
        totalCostUsd: totalCost.toFixed(4),
        costByModel: costByModelJson,
      });
    }
  }

  /**
   * Get current budget status for a user
   */
  async getBudgetStatus(userId: number): Promise<BudgetStatus> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get user's budget
    const budget = await db
      .select()
      .from(costBudgets)
      .where(eq(costBudgets.userId, userId))
      .limit(1);

    if (budget.length === 0) {
      // No budget configured
      return {
        hasBudget: false,
        dailySpend: 0,
        weeklySpend: 0,
        monthlySpend: 0,
        isOverBudget: false,
        shouldAlert: false,
      };
    }

    const userBudget = budget[0];

    // Calculate spending
    const now = new Date();

    // Daily spending
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dailySpend = Number(userBudget.currentDailySpend);

    // Weekly spending
    const weekStart = new Date(userBudget.weeklyPeriodStart);
    const weeklySpend = Number(userBudget.currentWeeklySpend);

    // Monthly spending
    const monthStart = new Date(userBudget.monthlyPeriodStart);
    const monthlySpend = Number(userBudget.currentMonthlySpend);

    // Check if over budget
    const dailyLimit = userBudget.dailyBudget ? Number(userBudget.dailyBudget) : undefined;
    const weeklyLimit = userBudget.weeklyBudget ? Number(userBudget.weeklyBudget) : undefined;
    const monthlyLimit = userBudget.monthlyBudget ? Number(userBudget.monthlyBudget) : undefined;

    const isOverBudget =
      (dailyLimit !== undefined && dailySpend > dailyLimit) ||
      (weeklyLimit !== undefined && weeklySpend > weeklyLimit) ||
      (monthlyLimit !== undefined && monthlySpend > monthlyLimit);

    // Check if should alert (at threshold)
    const alertThreshold = userBudget.alertThreshold / 100;
    const shouldAlert =
      (dailyLimit !== undefined && dailySpend >= dailyLimit * alertThreshold) ||
      (weeklyLimit !== undefined && weeklySpend >= weeklyLimit * alertThreshold) ||
      (monthlyLimit !== undefined && monthlySpend >= monthlyLimit * alertThreshold);

    return {
      hasBudget: true,
      dailyLimit,
      weeklyLimit,
      monthlyLimit,
      dailySpend,
      weeklySpend,
      monthlySpend,
      dailyRemaining: dailyLimit !== undefined ? Math.max(0, dailyLimit - dailySpend) : undefined,
      weeklyRemaining: weeklyLimit !== undefined ? Math.max(0, weeklyLimit - weeklySpend) : undefined,
      monthlyRemaining: monthlyLimit !== undefined ? Math.max(0, monthlyLimit - monthlySpend) : undefined,
      isOverBudget,
      shouldAlert,
    };
  }

  /**
   * Check budget limits and update budget tracking
   */
  async checkBudgetLimits(userId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get user's budget
    const budget = await db
      .select()
      .from(costBudgets)
      .where(eq(costBudgets.userId, userId))
      .limit(1);

    if (budget.length === 0) return; // No budget configured

    const userBudget = budget[0];
    const now = new Date();

    // Calculate current period spending
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    // Get today's spending
    const dailySummary = await db
      .select()
      .from(dailyCostSummaries)
      .where(
        and(
          eq(dailyCostSummaries.userId, userId),
          eq(dailyCostSummaries.date, dayStart)
        )
      )
      .limit(1);

    const dailySpend = dailySummary.length > 0 ? Number(dailySummary[0].totalCostUsd) : 0;

    // Calculate weekly spending
    const weekStart = new Date(userBudget.weeklyPeriodStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Reset weekly period if needed
    if (now >= weekEnd) {
      await db
        .update(costBudgets)
        .set({
          currentWeeklySpend: "0",
          weeklyPeriodStart: now,
        })
        .where(eq(costBudgets.userId, userId));
    }

    const weeklySummaries = await db
      .select({
        totalCost: sum(dailyCostSummaries.totalCostUsd),
      })
      .from(dailyCostSummaries)
      .where(
        and(
          eq(dailyCostSummaries.userId, userId),
          gte(dailyCostSummaries.date, weekStart),
          lte(dailyCostSummaries.date, now)
        )
      );

    const weeklySpend = Number(weeklySummaries[0]?.totalCost || 0);

    // Calculate monthly spending
    const monthStart = new Date(userBudget.monthlyPeriodStart);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    // Reset monthly period if needed
    if (now >= monthEnd) {
      await db
        .update(costBudgets)
        .set({
          currentMonthlySpend: "0",
          monthlyPeriodStart: now,
        })
        .where(eq(costBudgets.userId, userId));
    }

    const monthlySummaries = await db
      .select({
        totalCost: sum(dailyCostSummaries.totalCostUsd),
      })
      .from(dailyCostSummaries)
      .where(
        and(
          eq(dailyCostSummaries.userId, userId),
          gte(dailyCostSummaries.date, monthStart),
          lte(dailyCostSummaries.date, now)
        )
      );

    const monthlySpend = Number(monthlySummaries[0]?.totalCost || 0);

    // Update budget with current spending
    await db
      .update(costBudgets)
      .set({
        currentDailySpend: dailySpend.toFixed(4),
        currentWeeklySpend: weeklySpend.toFixed(4),
        currentMonthlySpend: monthlySpend.toFixed(4),
        dailyPeriodStart: dayStart,
        updatedAt: now,
      })
      .where(eq(costBudgets.userId, userId));

    // TODO: Implement alert notifications when threshold is reached
    // This would integrate with the alerts system (schema-alerts.ts)
  }

  /**
   * Get cost analytics for a date range
   */
  async getCostAnalytics(params: {
    userId: number;
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalCost: number;
    apiCost: number;
    browserbaseCost: number;
    totalApiCalls: number;
    totalSessions: number;
    totalTokens: number;
    averageCostPerExecution: number;
    costByDay: Array<{ date: Date; cost: number }>;
    costByModel: Record<string, number>;
  }> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get daily summaries for the date range
    const summaries = await db
      .select()
      .from(dailyCostSummaries)
      .where(
        and(
          eq(dailyCostSummaries.userId, params.userId),
          gte(dailyCostSummaries.date, params.startDate),
          lte(dailyCostSummaries.date, params.endDate)
        )
      )
      .orderBy(dailyCostSummaries.date);

    // Aggregate totals
    let totalCost = 0;
    let apiCost = 0;
    let browserbaseCost = 0;
    let totalApiCalls = 0;
    let totalSessions = 0;
    let totalTokens = 0;
    const costByModel: Record<string, number> = {};

    const costByDay = summaries.map(summary => {
      const dayCost = Number(summary.totalCostUsd);
      totalCost += dayCost;
      apiCost += Number(summary.apiCostUsd);
      browserbaseCost += Number(summary.browserbaseCostUsd);
      totalApiCalls += summary.totalApiCalls;
      totalSessions += summary.totalSessions;
      totalTokens += summary.totalInputTokens + summary.totalOutputTokens + summary.totalCacheTokens;

      // Aggregate cost by model
      if (summary.costByModel) {
        const modelCosts = summary.costByModel as Record<string, number>;
        Object.entries(modelCosts).forEach(([model, cost]) => {
          costByModel[model] = (costByModel[model] || 0) + cost;
        });
      }

      return {
        date: summary.date,
        cost: dayCost,
      };
    });

    const averageCostPerExecution = totalApiCalls > 0 ? totalCost / totalApiCalls : 0;

    return {
      totalCost,
      apiCost,
      browserbaseCost,
      totalApiCalls,
      totalSessions,
      totalTokens,
      averageCostPerExecution,
      costByDay,
      costByModel,
    };
  }
}

// ========================================
// EXPORT SINGLETON INSTANCE
// ========================================

let costTrackingServiceInstance: CostTrackingService | null = null;

/**
 * Get singleton instance of cost tracking service
 */
export function getCostTrackingService(): CostTrackingService {
  if (!costTrackingServiceInstance) {
    costTrackingServiceInstance = new CostTrackingService();
  }
  return costTrackingServiceInstance;
}
