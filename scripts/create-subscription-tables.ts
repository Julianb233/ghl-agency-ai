/**
 * Create Subscription Tables
 * Creates the subscription-related tables in the database
 *
 * Run: npx tsx scripts/create-subscription-tables.ts
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const createTablesSql = `
-- Create subscription_tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  "monthlyPriceCents" INTEGER NOT NULL,
  "setupFeeCents" INTEGER NOT NULL DEFAULT 0,
  "weeklyPremiumPercent" INTEGER NOT NULL DEFAULT 15,
  "sixMonthDiscountPercent" INTEGER NOT NULL DEFAULT 5,
  "annualDiscountPercent" INTEGER NOT NULL DEFAULT 10,
  "maxAgents" INTEGER NOT NULL,
  "maxConcurrentAgents" INTEGER NOT NULL,
  "monthlyExecutionLimit" INTEGER NOT NULL,
  "maxExecutionDurationMinutes" INTEGER NOT NULL DEFAULT 60,
  "maxGhlAccounts" INTEGER,
  features JSONB NOT NULL DEFAULT '{}',
  "allowedStrategies" JSONB NOT NULL DEFAULT '["auto"]',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPopular" BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  "tierId" INTEGER NOT NULL REFERENCES subscription_tiers(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  "paymentFrequency" VARCHAR(20) NOT NULL DEFAULT 'monthly',
  "currentPeriodStart" TIMESTAMP NOT NULL,
  "currentPeriodEnd" TIMESTAMP NOT NULL,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "stripeCustomerId" VARCHAR(255),
  "stripeSubscriptionId" VARCHAR(255),
  "executionsUsedThisPeriod" INTEGER NOT NULL DEFAULT 0,
  "agentsSpawnedThisPeriod" INTEGER NOT NULL DEFAULT 0,
  "additionalAgentSlots" INTEGER NOT NULL DEFAULT 0,
  "additionalExecutions" INTEGER NOT NULL DEFAULT 0,
  "trialEndsAt" TIMESTAMP,
  "cancelledAt" TIMESTAMP,
  "cancellationReason" TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create execution_packs table
CREATE TABLE IF NOT EXISTS execution_packs (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  "executionCount" INTEGER,
  "validForDays" INTEGER,
  "priceCents" INTEGER NOT NULL,
  "minTierId" INTEGER REFERENCES subscription_tiers(id),
  "maxPerMonth" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create user_execution_packs table
CREATE TABLE IF NOT EXISTS user_execution_packs (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "packId" INTEGER NOT NULL REFERENCES execution_packs(id),
  "executionsIncluded" INTEGER,
  "executionsRemaining" INTEGER,
  "purchasedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "pricePaidCents" INTEGER NOT NULL,
  "stripePaymentIntentId" VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  metadata JSONB
);

-- Create agent_add_ons table
CREATE TABLE IF NOT EXISTS agent_add_ons (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  "additionalAgents" INTEGER NOT NULL,
  "monthlyPriceCents" INTEGER NOT NULL,
  "minTierId" INTEGER REFERENCES subscription_tiers(id),
  "maxPerUser" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create user_agent_add_ons table
CREATE TABLE IF NOT EXISTS user_agent_add_ons (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "addOnId" INTEGER NOT NULL REFERENCES agent_add_ons(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  "stripeSubscriptionItemId" VARCHAR(255),
  "startedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP,
  metadata JSONB
);

-- Create subscription_usage_records table
CREATE TABLE IF NOT EXISTS subscription_usage_records (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "periodStart" TIMESTAMP NOT NULL,
  "periodEnd" TIMESTAMP NOT NULL,
  "tierId" INTEGER NOT NULL REFERENCES subscription_tiers(id),
  "executionLimit" INTEGER NOT NULL,
  "agentLimit" INTEGER NOT NULL,
  "executionsUsed" INTEGER NOT NULL DEFAULT 0,
  "peakConcurrentAgents" INTEGER NOT NULL DEFAULT 0,
  "additionalExecutionsPurchased" INTEGER NOT NULL DEFAULT 0,
  "additionalExecutionsUsed" INTEGER NOT NULL DEFAULT 0,
  "overageExecutions" INTEGER NOT NULL DEFAULT 0,
  "overageChargedCents" INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Note: Indexes are created automatically on foreign keys by Postgres
-- Additional indexes can be added later if needed
`;

async function createTables() {
  console.log('Creating subscription tables...\n');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    const client = await pool.connect();
    console.log('Connected to database');

    await client.query(createTablesSql);
    console.log('✅ Subscription tables created successfully!');

    client.release();
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTables();
