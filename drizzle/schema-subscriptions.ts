/**
 * Subscription & Membership Schema
 * Database tables for subscription tiers, user memberships, and usage limits
 *
 * Tier Structure:
 * - Starter:     $997/mo  | 5 agents  | 200 executions/mo
 * - Growth:      $1,697/mo | 10 agents | 500 executions/mo
 * - Professional: $3,197/mo | 25 agents | 1,250 executions/mo
 * - Enterprise:  $4,997/mo | 50 agents | 3,000 executions/mo
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
  decimal,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ========================================
// SUBSCRIPTION TIERS
// ========================================

/**
 * Subscription tiers definition
 * Defines available membership plans with their limits and pricing
 */
export const subscriptionTiers = pgTable("subscription_tiers", {
  id: serial("id").primaryKey(),

  // Tier identification
  slug: varchar("slug", { length: 50 }).notNull().unique(), // starter, growth, professional, enterprise
  name: varchar("name", { length: 100 }).notNull(), // Display name
  description: text("description"),

  // Pricing (in cents to avoid floating point issues)
  monthlyPriceCents: integer("monthlyPriceCents").notNull(),
  setupFeeCents: integer("setupFeeCents").default(0).notNull(),

  // Payment frequency discounts (percentage off monthly price)
  weeklyPremiumPercent: integer("weeklyPremiumPercent").default(15).notNull(), // +15% for weekly
  sixMonthDiscountPercent: integer("sixMonthDiscountPercent").default(5).notNull(), // -5% for 6-month
  annualDiscountPercent: integer("annualDiscountPercent").default(10).notNull(), // -10% for annual

  // Agent limits
  maxAgents: integer("maxAgents").notNull(),
  maxConcurrentAgents: integer("maxConcurrentAgents").notNull(), // Max agents running simultaneously

  // Execution limits
  monthlyExecutionLimit: integer("monthlyExecutionLimit").notNull(),
  maxExecutionDurationMinutes: integer("maxExecutionDurationMinutes").default(60).notNull(),

  // GHL account limits
  maxGhlAccounts: integer("maxGhlAccounts"), // null = unlimited

  // Feature flags
  features: jsonb("features").default({}).notNull(), // { swarmAccess: true, prioritySupport: false, ... }

  // Swarm strategies allowed
  allowedStrategies: jsonb("allowedStrategies").default(["auto"]).notNull(), // ["auto", "research", "development", "analysis"]

  // Display & ordering
  sortOrder: integer("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isPopular: boolean("isPopular").default(false).notNull(), // Highlight badge

  // Metadata
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ========================================
// USER SUBSCRIPTIONS
// ========================================

/**
 * User subscriptions
 * Tracks active subscription for each user
 */
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),

  userId: integer("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(), // One active subscription per user

  tierId: integer("tierId")
    .references(() => subscriptionTiers.id)
    .notNull(),

  // Subscription status
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, past_due, cancelled, paused, trial

  // Payment frequency
  paymentFrequency: varchar("paymentFrequency", { length: 20 }).default("monthly").notNull(), // weekly, monthly, six_month, annual

  // Billing
  currentPeriodStart: timestamp("currentPeriodStart").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),

  // External payment provider IDs
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),

  // Usage tracking (reset monthly)
  executionsUsedThisPeriod: integer("executionsUsedThisPeriod").default(0).notNull(),
  agentsSpawnedThisPeriod: integer("agentsSpawnedThisPeriod").default(0).notNull(),

  // Add-ons
  additionalAgentSlots: integer("additionalAgentSlots").default(0).notNull(), // From agent add-on purchases
  additionalExecutions: integer("additionalExecutions").default(0).notNull(), // From top-off packs

  // Trial info
  trialEndsAt: timestamp("trialEndsAt"),

  // Cancellation
  cancelledAt: timestamp("cancelledAt"),
  cancellationReason: text("cancellationReason"),

  // Metadata
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

// ========================================
// EXECUTION TOP-OFF PACKS
// ========================================

/**
 * Execution top-off pack definitions
 * One-time purchasable execution bundles
 */
export const executionPacks = pgTable("execution_packs", {
  id: serial("id").primaryKey(),

  slug: varchar("slug", { length: 50 }).notNull().unique(), // boost, power, unlimited_month
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),

  // Pack contents
  executionCount: integer("executionCount"), // null = unlimited for duration
  validForDays: integer("validForDays"), // null = until end of billing period

  // Pricing (in cents)
  priceCents: integer("priceCents").notNull(),

  // Restrictions
  minTierId: integer("minTierId").references(() => subscriptionTiers.id), // Minimum tier required to purchase
  maxPerMonth: integer("maxPerMonth"), // Max purchases per month (null = unlimited)

  // Display
  sortOrder: integer("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),

  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Purchased execution packs
 * Tracks user purchases of top-off packs
 */
export const userExecutionPacks = pgTable("user_execution_packs", {
  id: serial("id").primaryKey(),

  userId: integer("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  packId: integer("packId")
    .references(() => executionPacks.id)
    .notNull(),

  // Pack details at time of purchase (denormalized for history)
  executionsIncluded: integer("executionsIncluded"), // null = unlimited
  executionsRemaining: integer("executionsRemaining"),

  // Validity
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // When the pack expires

  // Payment
  pricePaidCents: integer("pricePaidCents").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),

  // Status
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, depleted, expired

  metadata: jsonb("metadata"),
});

// ========================================
// AGENT ADD-ON SLOTS
// ========================================

/**
 * Agent add-on definitions
 * Recurring add-ons for additional agent slots
 */
export const agentAddOns = pgTable("agent_add_ons", {
  id: serial("id").primaryKey(),

  slug: varchar("slug", { length: 50 }).notNull().unique(), // plus_5, plus_10
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),

  // Add-on contents
  additionalAgents: integer("additionalAgents").notNull(),

  // Pricing (in cents, monthly)
  monthlyPriceCents: integer("monthlyPriceCents").notNull(),

  // Restrictions
  minTierId: integer("minTierId").references(() => subscriptionTiers.id),
  maxPerUser: integer("maxPerUser"), // Max of this add-on per user (null = unlimited)

  // Display
  sortOrder: integer("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),

  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * User agent add-ons
 * Tracks active agent add-ons for users
 */
export const userAgentAddOns = pgTable("user_agent_add_ons", {
  id: serial("id").primaryKey(),

  userId: integer("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  addOnId: integer("addOnId")
    .references(() => agentAddOns.id)
    .notNull(),

  // Quantity (if they buy multiple of same add-on)
  quantity: integer("quantity").default(1).notNull(),

  // Status
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, cancelled

  // Billing
  stripeSubscriptionItemId: varchar("stripeSubscriptionItemId", { length: 255 }),

  // Dates
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  cancelledAt: timestamp("cancelledAt"),

  metadata: jsonb("metadata"),
});

// ========================================
// USAGE TRACKING
// ========================================

/**
 * Monthly usage records
 * Historical tracking of usage per billing period
 */
export const subscriptionUsageRecords = pgTable("subscription_usage_records", {
  id: serial("id").primaryKey(),

  userId: integer("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  // Period
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),

  // Tier at time of period
  tierId: integer("tierId")
    .references(() => subscriptionTiers.id)
    .notNull(),

  // Limits for this period
  executionLimit: integer("executionLimit").notNull(),
  agentLimit: integer("agentLimit").notNull(),

  // Actual usage
  executionsUsed: integer("executionsUsed").default(0).notNull(),
  peakConcurrentAgents: integer("peakConcurrentAgents").default(0).notNull(),

  // Top-offs used
  additionalExecutionsPurchased: integer("additionalExecutionsPurchased").default(0).notNull(),
  additionalExecutionsUsed: integer("additionalExecutionsUsed").default(0).notNull(),

  // Overage
  overageExecutions: integer("overageExecutions").default(0).notNull(),
  overageChargedCents: integer("overageChargedCents").default(0).notNull(),

  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ========================================
// TYPE EXPORTS
// ========================================

export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type InsertSubscriptionTier = typeof subscriptionTiers.$inferInsert;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

export type ExecutionPack = typeof executionPacks.$inferSelect;
export type InsertExecutionPack = typeof executionPacks.$inferInsert;

export type UserExecutionPack = typeof userExecutionPacks.$inferSelect;
export type InsertUserExecutionPack = typeof userExecutionPacks.$inferInsert;

export type AgentAddOn = typeof agentAddOns.$inferSelect;
export type InsertAgentAddOn = typeof agentAddOns.$inferInsert;

export type UserAgentAddOn = typeof userAgentAddOns.$inferSelect;
export type InsertUserAgentAddOn = typeof userAgentAddOns.$inferInsert;

export type SubscriptionUsageRecord = typeof subscriptionUsageRecords.$inferSelect;
export type InsertSubscriptionUsageRecord = typeof subscriptionUsageRecords.$inferInsert;

// ========================================
// TIER CONSTANTS (for seeding)
// ========================================

export const TIER_SLUGS = {
  STARTER: "starter",
  GROWTH: "growth",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
} as const;

export const DEFAULT_TIERS: InsertSubscriptionTier[] = [
  {
    slug: TIER_SLUGS.STARTER,
    name: "Starter",
    description: "Perfect for small agencies and solopreneurs",
    monthlyPriceCents: 99700, // $997
    setupFeeCents: 49700, // $497
    maxAgents: 5,
    maxConcurrentAgents: 2,
    monthlyExecutionLimit: 200,
    maxExecutionDurationMinutes: 30,
    maxGhlAccounts: 1,
    features: {
      swarmAccess: false,
      prioritySupport: false,
      customAgents: false,
      apiAccess: true,
      webhooks: true,
    },
    allowedStrategies: ["auto"],
    sortOrder: 1,
    isActive: true,
    isPopular: false,
  },
  {
    slug: TIER_SLUGS.GROWTH,
    name: "Growth",
    description: "For growing agencies scaling their operations",
    monthlyPriceCents: 169700, // $1,697
    setupFeeCents: 99700, // $997
    maxAgents: 10,
    maxConcurrentAgents: 4,
    monthlyExecutionLimit: 500,
    maxExecutionDurationMinutes: 45,
    maxGhlAccounts: 5,
    features: {
      swarmAccess: true,
      prioritySupport: false,
      customAgents: false,
      apiAccess: true,
      webhooks: true,
    },
    allowedStrategies: ["auto", "research"],
    sortOrder: 2,
    isActive: true,
    isPopular: true,
  },
  {
    slug: TIER_SLUGS.PROFESSIONAL,
    name: "Professional",
    description: "Full automation suite for established agencies",
    monthlyPriceCents: 319700, // $3,197
    setupFeeCents: 199700, // $1,997
    maxAgents: 25,
    maxConcurrentAgents: 10,
    monthlyExecutionLimit: 1250,
    maxExecutionDurationMinutes: 60,
    maxGhlAccounts: 20,
    features: {
      swarmAccess: true,
      prioritySupport: true,
      customAgents: true,
      apiAccess: true,
      webhooks: true,
    },
    allowedStrategies: ["auto", "research", "development", "analysis"],
    sortOrder: 3,
    isActive: true,
    isPopular: false,
  },
  {
    slug: TIER_SLUGS.ENTERPRISE,
    name: "Enterprise",
    description: "White-glove service for large agencies",
    monthlyPriceCents: 499700, // $4,997
    setupFeeCents: 299700, // $2,997
    maxAgents: 50,
    maxConcurrentAgents: 20,
    monthlyExecutionLimit: 3000,
    maxExecutionDurationMinutes: 120,
    maxGhlAccounts: null, // Unlimited
    features: {
      swarmAccess: true,
      prioritySupport: true,
      customAgents: true,
      apiAccess: true,
      webhooks: true,
      dedicatedSupport: true,
      customIntegrations: true,
      sla: true,
    },
    allowedStrategies: ["auto", "research", "development", "analysis", "deployment"],
    sortOrder: 4,
    isActive: true,
    isPopular: false,
  },
];

export const DEFAULT_EXECUTION_PACKS: InsertExecutionPack[] = [
  {
    slug: "boost",
    name: "Boost Pack",
    description: "100 additional executions",
    executionCount: 100,
    validForDays: null, // Valid until end of billing period
    priceCents: 4900, // $49
    maxPerMonth: null,
    sortOrder: 1,
    isActive: true,
  },
  {
    slug: "power",
    name: "Power Pack",
    description: "300 additional executions - best value",
    executionCount: 300,
    validForDays: null,
    priceCents: 12900, // $129
    maxPerMonth: null,
    sortOrder: 2,
    isActive: true,
  },
  {
    slug: "unlimited_month",
    name: "Unlimited Month",
    description: "Unlimited executions for 30 days",
    executionCount: null, // Unlimited
    validForDays: 30,
    priceCents: 29900, // $299
    maxPerMonth: 1,
    sortOrder: 3,
    isActive: true,
  },
];

export const DEFAULT_AGENT_ADDONS: InsertAgentAddOn[] = [
  {
    slug: "plus_5",
    name: "+5 Agent Slots",
    description: "Add 5 additional agent slots to your plan",
    additionalAgents: 5,
    monthlyPriceCents: 19700, // $197/mo
    maxPerUser: 4, // Max 20 additional agents this way
    sortOrder: 1,
    isActive: true,
  },
  {
    slug: "plus_10",
    name: "+10 Agent Slots",
    description: "Add 10 additional agent slots to your plan",
    additionalAgents: 10,
    monthlyPriceCents: 34700, // $347/mo
    maxPerUser: 2, // Max 20 additional agents this way
    sortOrder: 2,
    isActive: true,
  },
];
