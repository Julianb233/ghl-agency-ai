/**
 * Seed Subscription Data
 * Seeds default subscription tiers, execution packs, and agent add-ons
 *
 * Run: npx tsx scripts/seed-subscriptions.ts
 */

import 'dotenv/config';
import { getDb } from '../server/db';
import {
  subscriptionTiers,
  executionPacks,
  agentAddOns,
  DEFAULT_TIERS,
  DEFAULT_EXECUTION_PACKS,
  DEFAULT_AGENT_ADDONS,
} from '../drizzle/schema-subscriptions';
import { eq } from 'drizzle-orm';

async function seedSubscriptions() {
  console.log('Starting subscription seed...\n');

  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database. Make sure DATABASE_URL is set.');
    process.exit(1);
  }

  // Seed subscription tiers
  console.log('Seeding subscription tiers...');
  for (const tier of DEFAULT_TIERS) {
    const existing = await db
      .select()
      .from(subscriptionTiers)
      .where(eq(subscriptionTiers.slug, tier.slug))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(subscriptionTiers).values(tier);
      console.log(`  ✓ Created tier: ${tier.name} ($${tier.monthlyPriceCents / 100}/mo)`);
    } else {
      // Update existing tier
      await db
        .update(subscriptionTiers)
        .set(tier)
        .where(eq(subscriptionTiers.slug, tier.slug));
      console.log(`  ↻ Updated tier: ${tier.name}`);
    }
  }

  // Seed execution packs
  console.log('\nSeeding execution packs...');
  for (const pack of DEFAULT_EXECUTION_PACKS) {
    const existing = await db
      .select()
      .from(executionPacks)
      .where(eq(executionPacks.slug, pack.slug))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(executionPacks).values(pack);
      console.log(`  ✓ Created pack: ${pack.name} ($${pack.priceCents / 100})`);
    } else {
      await db
        .update(executionPacks)
        .set(pack)
        .where(eq(executionPacks.slug, pack.slug));
      console.log(`  ↻ Updated pack: ${pack.name}`);
    }
  }

  // Seed agent add-ons
  console.log('\nSeeding agent add-ons...');
  for (const addon of DEFAULT_AGENT_ADDONS) {
    const existing = await db
      .select()
      .from(agentAddOns)
      .where(eq(agentAddOns.slug, addon.slug))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(agentAddOns).values(addon);
      console.log(`  ✓ Created add-on: ${addon.name} ($${addon.priceCents / 100})`);
    } else {
      await db
        .update(agentAddOns)
        .set(addon)
        .where(eq(agentAddOns.slug, addon.slug));
      console.log(`  ↻ Updated add-on: ${addon.name}`);
    }
  }

  console.log('\n✅ Subscription seed completed successfully!');
  console.log('\nSummary:');
  console.log(`  - ${DEFAULT_TIERS.length} subscription tiers`);
  console.log(`  - ${DEFAULT_EXECUTION_PACKS.length} execution packs`);
  console.log(`  - ${DEFAULT_AGENT_ADDONS.length} agent add-ons`);
}

// Run the seed
seedSubscriptions()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding subscriptions:', error);
    process.exit(1);
  });
