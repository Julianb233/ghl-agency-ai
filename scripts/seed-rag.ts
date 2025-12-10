/**
 * RAG Knowledge Base Seed Script
 *
 * This script ingests all knowledge documents into the RAG system.
 * Run with: npx tsx scripts/seed-rag.ts
 */

import { ragService } from "../server/services/rag.service";
import { platformDetectionService } from "../server/services/platformDetection.service";
import * as fs from "fs";
import * as path from "path";

interface DocumentConfig {
  platform: string;
  category: string;
  files: {
    name: string;
    title: string;
    description: string;
  }[];
}

const KNOWLEDGE_BASE_PATH = path.join(__dirname, "../knowledge");

const documentConfigs: DocumentConfig[] = [
  {
    platform: "ghl",
    category: "documentation",
    files: [
      {
        name: "api-guide.md",
        title: "GoHighLevel API Guide",
        description: "Complete guide to GHL API endpoints, authentication, webhooks, and integrations",
      },
      {
        name: "workflows-automations.md",
        title: "GHL Workflows & Automations Guide",
        description: "Master guide for creating workflows, triggers, actions, and automations in GoHighLevel",
      },
    ],
  },
  {
    platform: "google",
    category: "documentation",
    files: [
      {
        name: "analytics-ga4.md",
        title: "Google Analytics 4 Complete Guide",
        description: "GA4 setup, event tracking, conversions, reports, and best practices",
      },
      {
        name: "google-ads.md",
        title: "Google Ads Complete Guide",
        description: "Campaign types, bidding strategies, keyword research, and optimization",
      },
      {
        name: "search-console.md",
        title: "Google Search Console Guide",
        description: "GSC setup, performance reports, indexing, and technical SEO monitoring",
      },
      {
        name: "tag-manager.md",
        title: "Google Tag Manager Guide",
        description: "GTM setup, tags, triggers, variables, and tracking implementation",
      },
    ],
  },
  {
    platform: "ahrefs",
    category: "documentation",
    files: [
      {
        name: "seo-guide.md",
        title: "Ahrefs SEO Complete Guide",
        description: "Backlink analysis, keyword research, site audit, and competitive analysis",
      },
    ],
  },
  {
    platform: "marketing",
    category: "best-practices",
    files: [
      {
        name: "top-tools-guide.md",
        title: "Top 15 Marketing Agency Tools",
        description: "Comprehensive guide to essential marketing tools: HubSpot, Mailchimp, SEMrush, and more",
      },
      {
        name: "seo-fundamentals.md",
        title: "SEO Fundamentals Guide",
        description: "Technical SEO, on-page optimization, link building, and content strategy",
      },
      {
        name: "ppc-advertising.md",
        title: "PPC Advertising Guide",
        description: "Pay-per-click advertising strategies, bidding, keywords, and optimization",
      },
      {
        name: "email-marketing.md",
        title: "Email Marketing Complete Guide",
        description: "Email campaigns, automation, segmentation, deliverability, and analytics",
      },
    ],
  },
  {
    platform: "ai-tools",
    category: "documentation",
    files: [
      {
        name: "marketing-ai-tools.md",
        title: "AI Marketing Tools Complete Guide",
        description: "Top AI tools for marketing: ChatGPT, Jasper, Midjourney, Surfer SEO, and more with integration examples",
      },
      {
        name: "agency-outreach-tools.md",
        title: "Agency Outreach & Prospecting Tools",
        description: "Lead generation tools: Apollo, ZoomInfo, LinkedIn Sales Navigator, Hunter.io, Lemlist, and cold outreach strategies",
      },
    ],
  },
  {
    platform: "stagehand",
    category: "automation",
    files: [
      {
        name: "browser-automation-guide.md",
        title: "Stagehand Browser Automation Guide",
        description: "Navigation patterns and automation strategies for marketing platforms using Stagehand browser automation",
      },
    ],
  },
];

async function seedPlatformKeywords(): Promise<void> {
  console.log("\n📚 Seeding platform keywords...");
  try {
    await platformDetectionService.seedPlatformKeywords();
    console.log("✓ Platform keywords seeded successfully");
  } catch (error) {
    console.error("✗ Failed to seed platform keywords:", error);
  }
}

async function ingestDocument(
  platform: string,
  category: string,
  filePath: string,
  title: string,
  description: string
): Promise<boolean> {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const url = `file://${filePath}`;

    console.log(`  Ingesting: ${title}`);

    const result = await ragService.ingest({
      url,
      content,
      title,
      description,
      platform,
      category,
      chunkSize: 1500,
      chunkOverlap: 200,
    });

    console.log(`    ✓ Created ${result.chunksCreated} chunks (${result.totalTokens} tokens)`);
    return true;
  } catch (error) {
    console.error(`    ✗ Failed to ingest ${title}:`, error);
    return false;
  }
}

async function seedKnowledgeBase(): Promise<void> {
  console.log("\n📖 Seeding knowledge base documents...\n");

  let successCount = 0;
  let failCount = 0;

  for (const config of documentConfigs) {
    console.log(`\n📁 Processing ${config.platform.toUpperCase()} documents:`);

    const platformPath = path.join(KNOWLEDGE_BASE_PATH, config.platform);

    if (!fs.existsSync(platformPath)) {
      console.log(`  ⚠ Directory not found: ${platformPath}`);
      continue;
    }

    for (const file of config.files) {
      const filePath = path.join(platformPath, file.name);

      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠ File not found: ${filePath}`);
        failCount++;
        continue;
      }

      const success = await ingestDocument(
        config.platform,
        config.category,
        filePath,
        file.title,
        file.description
      );

      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`📊 Seeding Complete:`);
  console.log(`   ✓ Successfully ingested: ${successCount} documents`);
  console.log(`   ✗ Failed: ${failCount} documents`);
  console.log("=".repeat(50) + "\n");
}

async function main(): Promise<void> {
  console.log("🚀 Starting RAG Knowledge Base Seed Script");
  console.log("=".repeat(50));

  try {
    // Seed platform keywords first
    await seedPlatformKeywords();

    // Then seed knowledge base documents
    await seedKnowledgeBase();

    console.log("✅ RAG seed script completed successfully!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ RAG seed script failed:", error);
    process.exit(1);
  }
}

// Run the main function
main();
