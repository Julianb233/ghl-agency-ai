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
  geminiTokenUsage,
  browserbaseCosts,
  storageCosts,
  dailyCostSummaries,
  costBudgets,
  type InsertApiTokenUsage,
  type InsertGeminiTokenUsage,
  type InsertBrowserbaseCost,
  type InsertStorageCost,
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

/**
 * Gemini API pricing per 1M tokens (USD)
 * https://ai.google.dev/pricing
 */
export const GEMINI_PRICING = {
  "gemini-2.0-flash-exp": {
    input: 0.0, // Free during preview
    output: 0.0,
  },
  "gemini-2.0-flash": {
    input: 0.10, // $0.10 per 1M input tokens
    output: 0.40, // $0.40 per 1M output tokens
  },
  "gemini-1.5-flash": {
    input: 0.075, // $0.075 per 1M input tokens
    output: 0.30, // $0.30 per 1M output tokens
  },
  "gemini-1.5-flash-8b": {
    input: 0.0375, // $0.0375 per 1M input tokens
    output: 0.15, // $0.15 per 1M output tokens
  },
  "gemini-1.5-pro": {
    input: 1.25, // $1.25 per 1M input tokens
    output: 5.0, // $5.00 per 1M output tokens
  },
  "gemini-2.5-pro": {
    input: 1.25, // $1.25 per 1M input tokens (<200k context)
    output: 10.0, // $10.00 per 1M output tokens
  },
} as const;

/**
 * S3/R2 Storage pricing (estimated)
 * https://aws.amazon.com/s3/pricing/
 * https://developers.cloudflare.com/r2/pricing/
 */
export const STORAGE_PRICING = {
  s3: {
    storagePerGbMonth: 0.023, // $0.023/GB/month (standard)
    putRequest: 0.000005, // $0.005 per 1,000 PUT requests
    getRequest: 0.0000004, // $0.0004 per 1,000 GET requests
    egressPerGb: 0.09, // $0.09/GB egress (after first 100GB)
  },
  r2: {
    storagePerGbMonth: 0.015, // $0.015/GB/month
    putRequest: 0.0000045, // $0.0045 per 1,000 PUT requests (Class A)
    getRequest: 0.00000036, // $0.00036 per 1,000 GET requests (Class B)
    egressPerGb: 0.0, // Free egress
  },
  gcs: {
    storagePerGbMonth: 0.020, // $0.020/GB/month (standard)
    putRequest: 0.000005, // $0.005 per 1,000 operations (Class A)
    getRequest: 0.0000004, // $0.0004 per 1,000 operations (Class B)
    egressPerGb: 0.12, // $0.12/GB egress (standard)
  },
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

export interface GeminiTokenUsageData {
  inputTokens: number;
  outputTokens: number;
}

export interface GeminiCostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface StorageOperationData {
  operationId?: string;
  provider: "s3" | "r2" | "gcs";
  bucket: string;
  operationType: "upload" | "download" | "delete" | "list";
  objectKey?: string;
  sizeBytes: number;
  contentType?: string;
  status: "success" | "failed" | "pending";
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

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  budgetType?: "daily" | "weekly" | "monthly";
  currentSpend?: number;
  limit?: number;
  percentUsed?: number;
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
   * Calculate cost from Gemini token usage based on model pricing
   */
  calculateGeminiCost(
    model: string,
    tokens: GeminiTokenUsageData
  ): GeminiCostCalculation {
    // Get pricing for the model (default to gemini-2.0-flash if not found)
    const pricing = GEMINI_PRICING[model as keyof typeof GEMINI_PRICING] || GEMINI_PRICING["gemini-2.0-flash"];

    // Calculate costs (pricing is per 1M tokens)
    const inputCost = (tokens.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (tokens.outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputCost,
      outputCost,
      totalCost,
    };
  }

  /**
   * Calculate storage operation cost
   */
  calculateStorageCost(
    provider: "s3" | "r2" | "gcs",
    operationType: "upload" | "download" | "delete" | "list",
    sizeBytes: number
  ): { requestCost: number; transferCost: number; totalCost: number } {
    const pricing = STORAGE_PRICING[provider] || STORAGE_PRICING.s3;
    const sizeMb = sizeBytes / (1024 * 1024);
    const sizeGb = sizeMb / 1024;

    let requestCost = 0;
    let transferCost = 0;

    switch (operationType) {
      case "upload":
        requestCost = pricing.putRequest;
        break;
      case "download":
        requestCost = pricing.getRequest;
        transferCost = sizeGb * pricing.egressPerGb;
        break;
      case "delete":
        requestCost = 0; // DELETE requests are free
        break;
      case "list":
        requestCost = pricing.getRequest;
        break;
    }

    return {
      requestCost,
      transferCost,
      totalCost: requestCost + transferCost,
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
   * Track Gemini API call cost
   */
  async trackGeminiCall(params: {
    userId: number;
    executionId?: number;
    requestId?: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    promptType?: string;
    toolsUsed?: string[];
    responseTime?: number;
    finishReason?: string;
  }): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Calculate costs
    const tokens: GeminiTokenUsageData = {
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
    };
    const costs = this.calculateGeminiCost(params.model, tokens);
    const totalTokens = params.inputTokens + params.outputTokens;

    // Insert Gemini token usage record
    await db.insert(geminiTokenUsage).values({
      userId: params.userId,
      executionId: params.executionId,
      requestId: params.requestId,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens,
      inputCost: costs.inputCost.toFixed(6),
      outputCost: costs.outputCost.toFixed(6),
      totalCost: costs.totalCost.toFixed(6),
      promptType: params.promptType,
      toolsUsed: params.toolsUsed ? JSON.stringify(params.toolsUsed) : null,
      responseTime: params.responseTime,
      finishReason: params.finishReason,
    });

    // Update daily summary
    await this.updateDailySummary(params.userId, new Date());

    // Check budget limits
    await this.checkBudgetLimits(params.userId);
  }

  /**
   * Track storage operation cost (S3/R2)
   */
  async trackStorageOperation(params: {
    userId: number;
    executionId?: number;
    storageData: StorageOperationData;
  }): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { storageData } = params;
    const sizeMb = storageData.sizeBytes / (1024 * 1024);

    // Calculate costs
    const costs = this.calculateStorageCost(
      storageData.provider,
      storageData.operationType,
      storageData.sizeBytes
    );

    // Get storage pricing for provider
    const pricing = STORAGE_PRICING[storageData.provider] || STORAGE_PRICING.s3;

    // Insert storage cost record
    await db.insert(storageCosts).values({
      userId: params.userId,
      executionId: params.executionId,
      operationId: storageData.operationId,
      provider: storageData.provider,
      bucket: storageData.bucket,
      operationType: storageData.operationType,
      objectKey: storageData.objectKey,
      sizeBytes: storageData.sizeBytes,
      sizeMb: sizeMb.toFixed(4),
      storageCostPerGb: pricing.storagePerGbMonth.toFixed(6),
      transferCostPerGb: pricing.egressPerGb.toFixed(6),
      requestCost: costs.requestCost.toFixed(8),
      totalCost: costs.totalCost.toFixed(6),
      contentType: storageData.contentType,
      status: storageData.status,
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

    // Aggregate Gemini API costs for the day
    const geminiStats = await db
      .select({
        totalCalls: count(),
        totalInputTokens: sum(geminiTokenUsage.inputTokens),
        totalOutputTokens: sum(geminiTokenUsage.outputTokens),
        geminiCost: sum(geminiTokenUsage.totalCost),
      })
      .from(geminiTokenUsage)
      .where(
        and(
          eq(geminiTokenUsage.userId, userId),
          gte(geminiTokenUsage.createdAt, dayStart),
          lte(geminiTokenUsage.createdAt, dayEnd)
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

    // Aggregate Storage costs for the day
    const storageStats = await db
      .select({
        totalOperations: count(),
        totalMb: sum(storageCosts.sizeMb),
        storageCost: sum(storageCosts.totalCost),
      })
      .from(storageCosts)
      .where(
        and(
          eq(storageCosts.userId, userId),
          gte(storageCosts.createdAt, dayStart),
          lte(storageCosts.createdAt, dayEnd)
        )
      );

    const apiCost = Number(apiStats[0]?.apiCost || 0);
    const geminiCost = Number(geminiStats[0]?.geminiCost || 0);
    const browserbaseCostValue = Number(browserbaseStats[0]?.browserbaseCost || 0);
    const storageCostValue = Number(storageStats[0]?.storageCost || 0);
    const totalCost = apiCost + geminiCost + browserbaseCostValue + storageCostValue;

    // Get cost breakdown by Claude model
    const claudeCostByModel = await db
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

    // Get cost breakdown by Gemini model
    const geminiCostByModel = await db
      .select({
        model: geminiTokenUsage.model,
        cost: sum(geminiTokenUsage.totalCost),
      })
      .from(geminiTokenUsage)
      .where(
        and(
          eq(geminiTokenUsage.userId, userId),
          gte(geminiTokenUsage.createdAt, dayStart),
          lte(geminiTokenUsage.createdAt, dayEnd)
        )
      )
      .groupBy(geminiTokenUsage.model);

    const costByModelJson: Record<string, number> = {};
    claudeCostByModel.forEach(row => {
      costByModelJson[row.model] = Number(row.cost || 0);
    });
    geminiCostByModel.forEach(row => {
      costByModelJson[row.model] = Number(row.cost || 0);
    });

    // Build cost by provider breakdown
    const costByProviderJson: Record<string, number> = {
      anthropic: apiCost,
      google: geminiCost,
      browserbase: browserbaseCostValue,
      storage: storageCostValue,
    };

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
          // Claude API stats
          totalApiCalls: Number(apiStats[0]?.totalCalls || 0),
          totalInputTokens: Number(apiStats[0]?.totalInputTokens || 0),
          totalOutputTokens: Number(apiStats[0]?.totalOutputTokens || 0),
          totalCacheTokens: Number(apiStats[0]?.totalCacheTokens || 0),
          apiCostUsd: apiCost.toFixed(4),
          // Gemini API stats
          totalGeminiCalls: Number(geminiStats[0]?.totalCalls || 0),
          totalGeminiInputTokens: Number(geminiStats[0]?.totalInputTokens || 0),
          totalGeminiOutputTokens: Number(geminiStats[0]?.totalOutputTokens || 0),
          geminiCostUsd: geminiCost.toFixed(6),
          // Browserbase stats
          totalSessions: Number(browserbaseStats[0]?.totalSessions || 0),
          totalSessionMinutes: Number(browserbaseStats[0]?.totalMinutes || 0).toFixed(2),
          browserbaseCostUsd: browserbaseCostValue.toFixed(4),
          // Storage stats
          totalStorageOperations: Number(storageStats[0]?.totalOperations || 0),
          totalStorageMb: Number(storageStats[0]?.totalMb || 0).toFixed(4),
          storageCostUsd: storageCostValue.toFixed(6),
          // Totals
          totalCostUsd: totalCost.toFixed(4),
          costByModel: costByModelJson,
          costByProvider: costByProviderJson,
          updatedAt: new Date(),
        })
        .where(eq(dailyCostSummaries.id, existingSummary[0].id));
    } else {
      // Insert new summary
      await db.insert(dailyCostSummaries).values({
        userId,
        date: dayStart,
        // Claude API stats
        totalApiCalls: Number(apiStats[0]?.totalCalls || 0),
        totalInputTokens: Number(apiStats[0]?.totalInputTokens || 0),
        totalOutputTokens: Number(apiStats[0]?.totalOutputTokens || 0),
        totalCacheTokens: Number(apiStats[0]?.totalCacheTokens || 0),
        apiCostUsd: apiCost.toFixed(4),
        // Gemini API stats
        totalGeminiCalls: Number(geminiStats[0]?.totalCalls || 0),
        totalGeminiInputTokens: Number(geminiStats[0]?.totalInputTokens || 0),
        totalGeminiOutputTokens: Number(geminiStats[0]?.totalOutputTokens || 0),
        geminiCostUsd: geminiCost.toFixed(6),
        // Browserbase stats
        totalSessions: Number(browserbaseStats[0]?.totalSessions || 0),
        totalSessionMinutes: Number(browserbaseStats[0]?.totalMinutes || 0).toFixed(2),
        browserbaseCostUsd: browserbaseCostValue.toFixed(4),
        // Storage stats
        totalStorageOperations: Number(storageStats[0]?.totalOperations || 0),
        totalStorageMb: Number(storageStats[0]?.totalMb || 0).toFixed(4),
        storageCostUsd: storageCostValue.toFixed(6),
        // Totals
        totalCostUsd: totalCost.toFixed(4),
        costByModel: costByModelJson,
        costByProvider: costByProviderJson,
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

    // Send alert notifications if at threshold
    await this.sendBudgetAlertIfNeeded(userId);
  }

  /**
   * Check if user can execute based on budget limits
   * Called BEFORE task execution to block over-budget users
   */
  async checkBudgetBeforeExecution(userId: number): Promise<BudgetCheckResult> {
    const budgetStatus = await this.getBudgetStatus(userId);

    // No budget configured = allowed
    if (!budgetStatus.hasBudget) {
      return { allowed: true };
    }

    // Check daily budget
    if (budgetStatus.dailyLimit !== undefined && budgetStatus.dailySpend >= budgetStatus.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily budget limit reached ($${budgetStatus.dailySpend.toFixed(2)} of $${budgetStatus.dailyLimit.toFixed(2)})`,
        budgetType: "daily",
        currentSpend: budgetStatus.dailySpend,
        limit: budgetStatus.dailyLimit,
        percentUsed: (budgetStatus.dailySpend / budgetStatus.dailyLimit) * 100,
      };
    }

    // Check weekly budget
    if (budgetStatus.weeklyLimit !== undefined && budgetStatus.weeklySpend >= budgetStatus.weeklyLimit) {
      return {
        allowed: false,
        reason: `Weekly budget limit reached ($${budgetStatus.weeklySpend.toFixed(2)} of $${budgetStatus.weeklyLimit.toFixed(2)})`,
        budgetType: "weekly",
        currentSpend: budgetStatus.weeklySpend,
        limit: budgetStatus.weeklyLimit,
        percentUsed: (budgetStatus.weeklySpend / budgetStatus.weeklyLimit) * 100,
      };
    }

    // Check monthly budget
    if (budgetStatus.monthlyLimit !== undefined && budgetStatus.monthlySpend >= budgetStatus.monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly budget limit reached ($${budgetStatus.monthlySpend.toFixed(2)} of $${budgetStatus.monthlyLimit.toFixed(2)})`,
        budgetType: "monthly",
        currentSpend: budgetStatus.monthlySpend,
        limit: budgetStatus.monthlyLimit,
        percentUsed: (budgetStatus.monthlySpend / budgetStatus.monthlyLimit) * 100,
      };
    }

    // All checks passed
    return { allowed: true };
  }

  /**
   * Send budget threshold alert notification if needed
   */
  async sendBudgetAlertIfNeeded(userId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const budgetStatus = await this.getBudgetStatus(userId);

    if (!budgetStatus.hasBudget || !budgetStatus.shouldAlert) {
      return;
    }

    // Import alert tables
    const { inAppNotifications } = await import("../../drizzle/schema-alerts");

    // Check which budget is at threshold
    let alertTitle = "";
    let alertMessage = "";
    let alertType: "warning" | "error" = "warning";

    if (budgetStatus.dailyLimit !== undefined) {
      const dailyPercent = (budgetStatus.dailySpend / budgetStatus.dailyLimit) * 100;
      if (dailyPercent >= 100) {
        alertTitle = "Daily Budget Exceeded";
        alertMessage = `You've exceeded your daily budget of $${budgetStatus.dailyLimit.toFixed(2)}. Current spend: $${budgetStatus.dailySpend.toFixed(2)} (${dailyPercent.toFixed(0)}%). New executions will be blocked.`;
        alertType = "error";
      } else if (dailyPercent >= 80) {
        alertTitle = "Daily Budget Warning";
        alertMessage = `You've used ${dailyPercent.toFixed(0)}% of your daily budget ($${budgetStatus.dailySpend.toFixed(2)} of $${budgetStatus.dailyLimit.toFixed(2)}). Consider adjusting usage.`;
      }
    }

    if (!alertTitle && budgetStatus.weeklyLimit !== undefined) {
      const weeklyPercent = (budgetStatus.weeklySpend / budgetStatus.weeklyLimit) * 100;
      if (weeklyPercent >= 100) {
        alertTitle = "Weekly Budget Exceeded";
        alertMessage = `You've exceeded your weekly budget of $${budgetStatus.weeklyLimit.toFixed(2)}. Current spend: $${budgetStatus.weeklySpend.toFixed(2)} (${weeklyPercent.toFixed(0)}%). New executions will be blocked.`;
        alertType = "error";
      } else if (weeklyPercent >= 80) {
        alertTitle = "Weekly Budget Warning";
        alertMessage = `You've used ${weeklyPercent.toFixed(0)}% of your weekly budget ($${budgetStatus.weeklySpend.toFixed(2)} of $${budgetStatus.weeklyLimit.toFixed(2)}). Consider adjusting usage.`;
      }
    }

    if (!alertTitle && budgetStatus.monthlyLimit !== undefined) {
      const monthlyPercent = (budgetStatus.monthlySpend / budgetStatus.monthlyLimit) * 100;
      if (monthlyPercent >= 100) {
        alertTitle = "Monthly Budget Exceeded";
        alertMessage = `You've exceeded your monthly budget of $${budgetStatus.monthlyLimit.toFixed(2)}. Current spend: $${budgetStatus.monthlySpend.toFixed(2)} (${monthlyPercent.toFixed(0)}%). New executions will be blocked.`;
        alertType = "error";
      } else if (monthlyPercent >= 80) {
        alertTitle = "Monthly Budget Warning";
        alertMessage = `You've used ${monthlyPercent.toFixed(0)}% of your monthly budget ($${budgetStatus.monthlySpend.toFixed(2)} of $${budgetStatus.monthlyLimit.toFixed(2)}). Consider adjusting usage.`;
      }
    }

    if (!alertTitle) {
      return; // No alert needed
    }

    // Check if we already sent a similar alert recently (within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAlerts = await db
      .select()
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.userId, userId),
          eq(inAppNotifications.title, alertTitle),
          gte(inAppNotifications.createdAt, oneHourAgo)
        )
      )
      .limit(1);

    if (recentAlerts.length > 0) {
      return; // Already sent this alert type recently
    }

    // Create in-app notification
    await db.insert(inAppNotifications).values({
      userId,
      title: alertTitle,
      message: alertMessage,
      type: alertType,
      priority: alertType === "error" ? 10 : 7,
      metadata: {
        budgetStatus: {
          dailySpend: budgetStatus.dailySpend,
          dailyLimit: budgetStatus.dailyLimit,
          weeklySpend: budgetStatus.weeklySpend,
          weeklyLimit: budgetStatus.weeklyLimit,
          monthlySpend: budgetStatus.monthlySpend,
          monthlyLimit: budgetStatus.monthlyLimit,
        },
      },
      actionUrl: "/settings/billing",
      actionLabel: "Manage Budget",
    });

    console.log(`[CostTracking] Sent budget alert to user ${userId}: ${alertTitle}`);
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
    geminiCost: number;
    browserbaseCost: number;
    storageCost: number;
    totalApiCalls: number;
    totalGeminiCalls: number;
    totalSessions: number;
    totalStorageOperations: number;
    totalTokens: number;
    totalGeminiTokens: number;
    averageCostPerExecution: number;
    costByDay: Array<{ date: Date; cost: number }>;
    costByModel: Record<string, number>;
    costByProvider: Record<string, number>;
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
    let geminiCost = 0;
    let browserbaseCost = 0;
    let storageCost = 0;
    let totalApiCalls = 0;
    let totalGeminiCalls = 0;
    let totalSessions = 0;
    let totalStorageOperations = 0;
    let totalTokens = 0;
    let totalGeminiTokens = 0;
    const costByModel: Record<string, number> = {};
    const costByProvider: Record<string, number> = {
      anthropic: 0,
      google: 0,
      browserbase: 0,
      storage: 0,
    };

    const costByDay = summaries.map(summary => {
      const dayCost = Number(summary.totalCostUsd);
      totalCost += dayCost;
      apiCost += Number(summary.apiCostUsd);
      geminiCost += Number(summary.geminiCostUsd || 0);
      browserbaseCost += Number(summary.browserbaseCostUsd);
      storageCost += Number(summary.storageCostUsd || 0);
      totalApiCalls += summary.totalApiCalls;
      totalGeminiCalls += summary.totalGeminiCalls || 0;
      totalSessions += summary.totalSessions;
      totalStorageOperations += summary.totalStorageOperations || 0;
      totalTokens += summary.totalInputTokens + summary.totalOutputTokens + summary.totalCacheTokens;
      totalGeminiTokens += (summary.totalGeminiInputTokens || 0) + (summary.totalGeminiOutputTokens || 0);

      // Aggregate cost by model
      if (summary.costByModel) {
        const modelCosts = summary.costByModel as Record<string, number>;
        Object.entries(modelCosts).forEach(([model, cost]) => {
          costByModel[model] = (costByModel[model] || 0) + cost;
        });
      }

      // Aggregate cost by provider
      if (summary.costByProvider) {
        const providerCosts = summary.costByProvider as Record<string, number>;
        Object.entries(providerCosts).forEach(([provider, cost]) => {
          costByProvider[provider] = (costByProvider[provider] || 0) + cost;
        });
      }

      return {
        date: summary.date,
        cost: dayCost,
      };
    });

    const totalExecutions = totalApiCalls + totalGeminiCalls;
    const averageCostPerExecution = totalExecutions > 0 ? totalCost / totalExecutions : 0;

    return {
      totalCost,
      apiCost,
      geminiCost,
      browserbaseCost,
      storageCost,
      totalApiCalls,
      totalGeminiCalls,
      totalSessions,
      totalStorageOperations,
      totalTokens,
      totalGeminiTokens,
      averageCostPerExecution,
      costByDay,
      costByModel,
      costByProvider,
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
