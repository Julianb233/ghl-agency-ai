/**
 * Subscription Service
 * Handles subscription management, usage tracking, and limit enforcement
 */

import { getDb } from "../db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  subscriptionTiers,
  userSubscriptions,
  executionPacks,
  userExecutionPacks,
  agentAddOns,
  userAgentAddOns,
  subscriptionUsageRecords,
  TIER_SLUGS,
  DEFAULT_TIERS,
  DEFAULT_EXECUTION_PACKS,
  DEFAULT_AGENT_ADDONS,
  type SubscriptionTier,
  type UserSubscription,
  type UserExecutionPack,
  type UserAgentAddOn,
} from "../../drizzle/schema-subscriptions";
import { users } from "../../drizzle/schema";

// ========================================
// TYPES
// ========================================

export interface SubscriptionLimits {
  maxAgents: number;
  maxConcurrentAgents: number;
  monthlyExecutionLimit: number;
  maxExecutionDurationMinutes: number;
  maxGhlAccounts: number | null;
  features: Record<string, boolean>;
  allowedStrategies: string[];
}

export interface UsageInfo {
  executionsUsed: number;
  executionsRemaining: number;
  executionLimit: number;
  additionalExecutions: number;
  agentsUsed: number;
  agentLimit: number;
  additionalAgentSlots: number;
  percentUsed: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  subscription: UserSubscription;
  limits: SubscriptionLimits;
  usage: UsageInfo;
  activePacks: UserExecutionPack[];
  activeAddOns: UserAgentAddOn[];
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
  upgradeRequired?: boolean;
  suggestedAction?: 'upgrade' | 'buy_pack' | 'wait';
}

// ========================================
// SUBSCRIPTION SERVICE CLASS
// ========================================

class SubscriptionService {
  private static instance: SubscriptionService;

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Seed default tiers, packs, and add-ons
   */
  async seedDefaults(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // Check if tiers already exist
    const existingTiers = await db.select().from(subscriptionTiers).limit(1);
    if (existingTiers.length > 0) {
      console.log("[SubscriptionService] Defaults already seeded");
      return;
    }

    console.log("[SubscriptionService] Seeding default subscription data...");

    // Insert tiers
    for (const tier of DEFAULT_TIERS) {
      await db.insert(subscriptionTiers).values(tier);
    }

    // Insert execution packs
    for (const pack of DEFAULT_EXECUTION_PACKS) {
      await db.insert(executionPacks).values(pack);
    }

    // Insert agent add-ons
    for (const addOn of DEFAULT_AGENT_ADDONS) {
      await db.insert(agentAddOns).values(addOn);
    }

    console.log("[SubscriptionService] Default subscription data seeded");
  }

  /**
   * Get all available tiers
   */
  async getTiers(): Promise<SubscriptionTier[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    return db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.isActive, true))
      .orderBy(subscriptionTiers.sortOrder);
  }

  /**
   * Get tier by slug
   */
  async getTierBySlug(slug: string): Promise<SubscriptionTier | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const [tier] = await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.slug, slug))
      .limit(1);

    return tier || null;
  }

  /**
   * Get user's current subscription with full info
   */
  async getUserSubscription(userId: number): Promise<SubscriptionInfo | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // Get user subscription
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      return null;
    }

    // Get tier details
    const [tier] = await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.id, subscription.tierId))
      .limit(1);

    if (!tier) {
      throw new Error("Subscription tier not found");
    }

    // Get active execution packs
    const activePacks = await db
      .select()
      .from(userExecutionPacks)
      .where(
        and(
          eq(userExecutionPacks.userId, userId),
          eq(userExecutionPacks.status, "active")
        )
      );

    // Get active add-ons
    const activeAddOns = await db
      .select()
      .from(userAgentAddOns)
      .where(
        and(
          eq(userAgentAddOns.userId, userId),
          eq(userAgentAddOns.status, "active")
        )
      );

    // Calculate total additional agents from add-ons
    let additionalAgentSlots = subscription.additionalAgentSlots;
    for (const addOn of activeAddOns) {
      const [addOnDef] = await db
        .select()
        .from(agentAddOns)
        .where(eq(agentAddOns.id, addOn.addOnId))
        .limit(1);
      if (addOnDef) {
        additionalAgentSlots += addOnDef.additionalAgents * addOn.quantity;
      }
    }

    // Calculate additional executions from packs
    let additionalExecutions = subscription.additionalExecutions;
    for (const pack of activePacks) {
      if (pack.executionsRemaining && pack.executionsRemaining > 0) {
        additionalExecutions += pack.executionsRemaining;
      }
    }

    // Build limits
    const limits: SubscriptionLimits = {
      maxAgents: tier.maxAgents + additionalAgentSlots,
      maxConcurrentAgents: tier.maxConcurrentAgents,
      monthlyExecutionLimit: tier.monthlyExecutionLimit + additionalExecutions,
      maxExecutionDurationMinutes: tier.maxExecutionDurationMinutes,
      maxGhlAccounts: tier.maxGhlAccounts,
      features: tier.features as Record<string, boolean>,
      allowedStrategies: tier.allowedStrategies as string[],
    };

    // Build usage info
    const usage: UsageInfo = {
      executionsUsed: subscription.executionsUsedThisPeriod,
      executionsRemaining:
        tier.monthlyExecutionLimit +
        additionalExecutions -
        subscription.executionsUsedThisPeriod,
      executionLimit: tier.monthlyExecutionLimit,
      additionalExecutions,
      agentsUsed: subscription.agentsSpawnedThisPeriod,
      agentLimit: tier.maxAgents,
      additionalAgentSlots,
      percentUsed:
        tier.monthlyExecutionLimit > 0
          ? Math.round(
              (subscription.executionsUsedThisPeriod /
                (tier.monthlyExecutionLimit + additionalExecutions)) *
                100
            )
          : 0,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    };

    return {
      tier,
      subscription,
      limits,
      usage,
      activePacks,
      activeAddOns,
    };
  }

  /**
   * Check if user can execute a task
   */
  async canExecuteTask(userId: number): Promise<LimitCheckResult> {
    const subscriptionInfo = await this.getUserSubscription(userId);

    if (!subscriptionInfo) {
      return {
        allowed: false,
        reason: "No active subscription. Please subscribe to a plan.",
        upgradeRequired: true,
        suggestedAction: "upgrade",
      };
    }

    const { subscription, limits, usage } = subscriptionInfo;

    // Check subscription status
    if (subscription.status !== "active") {
      return {
        allowed: false,
        reason: `Subscription is ${subscription.status}. Please update your payment method.`,
        upgradeRequired: false,
      };
    }

    // Check if within billing period
    const now = new Date();
    if (now > subscription.currentPeriodEnd) {
      return {
        allowed: false,
        reason: "Billing period has ended. Awaiting renewal.",
        upgradeRequired: false,
      };
    }

    // Check execution limit
    if (usage.executionsRemaining <= 0) {
      return {
        allowed: false,
        reason: `Monthly execution limit reached (${usage.executionLimit} executions).`,
        currentUsage: usage.executionsUsed,
        limit: limits.monthlyExecutionLimit,
        upgradeRequired: true,
        suggestedAction: usage.executionLimit < 3000 ? "upgrade" : "buy_pack",
      };
    }

    return {
      allowed: true,
      currentUsage: usage.executionsUsed,
      limit: limits.monthlyExecutionLimit,
    };
  }

  /**
   * Check if user can spawn more agents
   */
  async canSpawnAgent(userId: number, requestedAgents: number = 1): Promise<LimitCheckResult> {
    const subscriptionInfo = await this.getUserSubscription(userId);

    if (!subscriptionInfo) {
      return {
        allowed: false,
        reason: "No active subscription. Please subscribe to a plan.",
        upgradeRequired: true,
        suggestedAction: "upgrade",
      };
    }

    const { limits } = subscriptionInfo;

    // For now, just check against max agents (concurrent tracking would need runtime state)
    if (requestedAgents > limits.maxAgents) {
      return {
        allowed: false,
        reason: `Requested ${requestedAgents} agents but your plan only allows ${limits.maxAgents}.`,
        currentUsage: requestedAgents,
        limit: limits.maxAgents,
        upgradeRequired: true,
        suggestedAction: "upgrade",
      };
    }

    return {
      allowed: true,
      limit: limits.maxAgents,
    };
  }

  /**
   * Check if swarm strategy is allowed
   */
  async canUseStrategy(userId: number, strategy: string): Promise<LimitCheckResult> {
    const subscriptionInfo = await this.getUserSubscription(userId);

    if (!subscriptionInfo) {
      return {
        allowed: false,
        reason: "No active subscription.",
        upgradeRequired: true,
      };
    }

    const { limits, tier } = subscriptionInfo;

    if (!limits.allowedStrategies.includes(strategy)) {
      return {
        allowed: false,
        reason: `Strategy "${strategy}" is not available on ${tier.name} plan. Upgrade to access this feature.`,
        upgradeRequired: true,
        suggestedAction: "upgrade",
      };
    }

    return { allowed: true };
  }

  /**
   * Check if feature is enabled for user
   */
  async hasFeature(userId: number, feature: string): Promise<boolean> {
    const subscriptionInfo = await this.getUserSubscription(userId);

    if (!subscriptionInfo) {
      return false;
    }

    return subscriptionInfo.limits.features[feature] === true;
  }

  /**
   * Increment execution usage
   */
  async incrementExecutionUsage(userId: number, count: number = 1): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    await db
      .update(userSubscriptions)
      .set({
        executionsUsedThisPeriod: sql`${userSubscriptions.executionsUsedThisPeriod} + ${count}`,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.userId, userId));
  }

  /**
   * Create subscription for user
   */
  async createSubscription(
    userId: number,
    tierSlug: string,
    paymentFrequency: "weekly" | "monthly" | "six_month" | "annual" = "monthly",
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ): Promise<UserSubscription> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const tier = await this.getTierBySlug(tierSlug);
    if (!tier) {
      throw new Error(`Tier not found: ${tierSlug}`);
    }

    const now = new Date();
    let periodEnd: Date;

    switch (paymentFrequency) {
      case "weekly":
        periodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "six_month":
        periodEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
        break;
      case "annual":
        periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const [subscription] = await db
      .insert(userSubscriptions)
      .values({
        userId,
        tierId: tier.id,
        status: "active",
        paymentFrequency,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeCustomerId,
        stripeSubscriptionId,
      })
      .returning();

    return subscription;
  }

  /**
   * Update subscription tier
   */
  async updateTier(userId: number, newTierSlug: string): Promise<UserSubscription> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const tier = await this.getTierBySlug(newTierSlug);
    if (!tier) {
      throw new Error(`Tier not found: ${newTierSlug}`);
    }

    const [subscription] = await db
      .update(userSubscriptions)
      .set({
        tierId: tier.id,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.userId, userId))
      .returning();

    return subscription;
  }

  /**
   * Reset monthly usage (called by billing cycle)
   */
  async resetMonthlyUsage(userId: number, newPeriodStart: Date, newPeriodEnd: Date): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // Get current subscription for archiving
    const subscriptionInfo = await this.getUserSubscription(userId);
    if (subscriptionInfo) {
      // Archive usage record
      await db.insert(subscriptionUsageRecords).values({
        userId,
        periodStart: subscriptionInfo.subscription.currentPeriodStart,
        periodEnd: subscriptionInfo.subscription.currentPeriodEnd,
        tierId: subscriptionInfo.tier.id,
        executionLimit: subscriptionInfo.limits.monthlyExecutionLimit,
        agentLimit: subscriptionInfo.limits.maxAgents,
        executionsUsed: subscriptionInfo.usage.executionsUsed,
        peakConcurrentAgents: subscriptionInfo.subscription.agentsSpawnedThisPeriod,
        additionalExecutionsPurchased: subscriptionInfo.usage.additionalExecutions,
        additionalExecutionsUsed: 0, // TODO: Track separately
      });
    }

    // Reset counters
    await db
      .update(userSubscriptions)
      .set({
        executionsUsedThisPeriod: 0,
        agentsSpawnedThisPeriod: 0,
        additionalExecutions: 0, // Reset pack credits
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.userId, userId));

    // Expire old packs
    await db
      .update(userExecutionPacks)
      .set({ status: "expired" })
      .where(
        and(
          eq(userExecutionPacks.userId, userId),
          eq(userExecutionPacks.status, "active"),
          lte(userExecutionPacks.expiresAt, new Date())
        )
      );
  }

  /**
   * Get available execution packs
   */
  async getExecutionPacks(): Promise<typeof executionPacks.$inferSelect[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    return db
      .select()
      .from(executionPacks)
      .where(eq(executionPacks.isActive, true))
      .orderBy(executionPacks.sortOrder);
  }

  /**
   * Get available agent add-ons
   */
  async getAgentAddOns(): Promise<typeof agentAddOns.$inferSelect[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    return db
      .select()
      .from(agentAddOns)
      .where(eq(agentAddOns.isActive, true))
      .orderBy(agentAddOns.sortOrder);
  }

  /**
   * Purchase execution pack
   */
  async purchaseExecutionPack(
    userId: number,
    packSlug: string,
    stripePaymentIntentId?: string
  ): Promise<UserExecutionPack> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    // Get pack
    const [pack] = await db
      .select()
      .from(executionPacks)
      .where(eq(executionPacks.slug, packSlug))
      .limit(1);

    if (!pack) {
      throw new Error(`Pack not found: ${packSlug}`);
    }

    // Calculate expiry
    let expiresAt: Date | null = null;
    if (pack.validForDays) {
      expiresAt = new Date(Date.now() + pack.validForDays * 24 * 60 * 60 * 1000);
    } else {
      // Expires at end of billing period
      const subscription = await this.getUserSubscription(userId);
      if (subscription) {
        expiresAt = subscription.subscription.currentPeriodEnd;
      }
    }

    // Create purchase record
    const [purchase] = await db
      .insert(userExecutionPacks)
      .values({
        userId,
        packId: pack.id,
        executionsIncluded: pack.executionCount,
        executionsRemaining: pack.executionCount,
        pricePaidCents: pack.priceCents,
        stripePaymentIntentId,
        expiresAt,
        status: "active",
      })
      .returning();

    // Update subscription additional executions if pack has a count
    if (pack.executionCount) {
      await db
        .update(userSubscriptions)
        .set({
          additionalExecutions: sql`${userSubscriptions.additionalExecutions} + ${pack.executionCount}`,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.userId, userId));
    }

    return purchase;
  }
}

// Export singleton
export const subscriptionService = SubscriptionService.getInstance();

// Export for direct access
export function getSubscriptionService(): SubscriptionService {
  return SubscriptionService.getInstance();
}
