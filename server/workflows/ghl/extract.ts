/**
 * GHL Data Extraction Workflows
 * Extract contacts, workflows, pipelines, and other data from GoHighLevel
 */

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import type { Page } from "playwright";

// Helper to get Playwright page with correct types
function getPage(stagehand: Stagehand): Page {
  return stagehand.context.pages()[0] as unknown as Page;
}

// Helper for delays
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Extraction schemas
export const contactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});

export const workflowSchema = z.object({
  name: z.string(),
  status: z.enum(["active", "inactive", "draft"]).optional(),
  triggerType: z.string().optional(),
  stepsCount: z.number().optional(),
});

export const pipelineSchema = z.object({
  name: z.string(),
  stages: z.array(z.object({
    name: z.string(),
    count: z.number().optional(),
  })).optional(),
});

export type GHLContact = z.infer<typeof contactSchema>;
export type GHLWorkflow = z.infer<typeof workflowSchema>;
export type GHLPipeline = z.infer<typeof pipelineSchema>;

/**
 * Extract contacts from GHL Contacts page
 */
export async function extractContacts(
  stagehand: Stagehand,
  options: { limit?: number; searchTerm?: string } = {}
): Promise<GHLContact[]> {
  const page = getPage(stagehand);
  const contacts: GHLContact[] = [];

  try {
    // Navigate to contacts if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes("/contacts")) {
      console.log("[GHL Extract] Navigating to Contacts...");
      await stagehand.act("Click on Contacts in the navigation menu");
      await delay(2000);
    }

    // Apply search filter if provided
    if (options.searchTerm) {
      console.log(`[GHL Extract] Searching for: ${options.searchTerm}`);
      await stagehand.act(`Type "${options.searchTerm}" into the search input`);
      await delay(1500);
    }

    // Extract contact list - using 'as any' pattern from existing codebase
    console.log("[GHL Extract] Extracting contacts...");
    const instruction = `Extract all visible contacts from the contact list table. For each contact, get their name, email, phone number, and any visible tags. Limit to ${options.limit || 50} contacts.`;
    const extractedData: any = await stagehand.extract(
      instruction,
      z.object({
        contacts: z.array(contactSchema),
      }) as any
    );

    if (extractedData?.contacts) {
      contacts.push(...extractedData.contacts);
    }

    console.log(`[GHL Extract] Found ${contacts.length} contacts`);
    return contacts;

  } catch (error) {
    console.error("[GHL Extract] Error extracting contacts:", error);
    return contacts;
  }
}

/**
 * Extract workflows from GHL Automations page
 */
export async function extractWorkflows(
  stagehand: Stagehand,
  options: { status?: "active" | "inactive" | "all" } = {}
): Promise<GHLWorkflow[]> {
  const page = getPage(stagehand);
  const workflows: GHLWorkflow[] = [];

  try {
    // Navigate to workflows
    console.log("[GHL Extract] Navigating to Workflows...");
    await stagehand.act("Click on Automation in the navigation menu");
    await delay(1500);
    await stagehand.act("Click on Workflows");
    await delay(2000);

    // Filter by status if specified
    if (options.status && options.status !== "all") {
      console.log(`[GHL Extract] Filtering by status: ${options.status}`);
      await stagehand.act(`Click on the ${options.status} filter tab or button`);
      await delay(1500);
    }

    // Extract workflow list
    console.log("[GHL Extract] Extracting workflows...");
    const instruction = "Extract all visible workflows from the workflow list. For each workflow, get the name, status (active/inactive/draft), trigger type, and number of steps if visible.";
    const extractedData: any = await stagehand.extract(
      instruction,
      z.object({
        workflows: z.array(workflowSchema),
      }) as any
    );

    if (extractedData?.workflows) {
      workflows.push(...extractedData.workflows);
    }

    console.log(`[GHL Extract] Found ${workflows.length} workflows`);
    return workflows;

  } catch (error) {
    console.error("[GHL Extract] Error extracting workflows:", error);
    return workflows;
  }
}

/**
 * Extract pipelines from GHL Opportunities page
 */
export async function extractPipelines(
  stagehand: Stagehand
): Promise<GHLPipeline[]> {
  const page = getPage(stagehand);
  const pipelines: GHLPipeline[] = [];

  try {
    // Navigate to pipelines/opportunities
    console.log("[GHL Extract] Navigating to Opportunities...");
    await stagehand.act("Click on Opportunities in the navigation menu");
    await delay(2000);

    // Extract pipeline data
    console.log("[GHL Extract] Extracting pipelines...");
    const instruction = "Extract all visible pipeline information. For each pipeline, get the name and all stage names with their opportunity counts if visible.";
    const extractedData: any = await stagehand.extract(
      instruction,
      z.object({
        pipelines: z.array(pipelineSchema),
      }) as any
    );

    if (extractedData?.pipelines) {
      pipelines.push(...extractedData.pipelines);
    }

    console.log(`[GHL Extract] Found ${pipelines.length} pipelines`);
    return pipelines;

  } catch (error) {
    console.error("[GHL Extract] Error extracting pipelines:", error);
    return pipelines;
  }
}

/**
 * Extract dashboard metrics from GHL
 */
export async function extractDashboardMetrics(
  stagehand: Stagehand
): Promise<Record<string, string | number>> {
  const page = getPage(stagehand);

  try {
    // Navigate to dashboard
    console.log("[GHL Extract] Navigating to Dashboard...");
    await stagehand.act("Click on Dashboard in the navigation menu");
    await delay(2000);

    // Extract metrics
    console.log("[GHL Extract] Extracting dashboard metrics...");
    const instruction = "Extract all visible metrics and KPIs from the dashboard. Include any numbers for leads, appointments, revenue, conversion rates, etc.";
    const extractedData: any = await stagehand.extract(
      instruction,
      z.object({
        metrics: z.record(z.string(), z.union([z.string(), z.number()])),
      }) as any
    );

    console.log("[GHL Extract] Dashboard metrics extracted");
    return extractedData?.metrics || {};

  } catch (error) {
    console.error("[GHL Extract] Error extracting dashboard:", error);
    return {};
  }
}

/**
 * Extract single contact details by navigating to their profile
 */
export async function extractContactDetails(
  stagehand: Stagehand,
  searchTerm: string
): Promise<GHLContact | null> {
  const page = getPage(stagehand);

  try {
    // Navigate to contacts and search
    console.log(`[GHL Extract] Searching for contact: ${searchTerm}`);
    await stagehand.act("Click on Contacts in the navigation menu");
    await delay(1500);
    await stagehand.act(`Type "${searchTerm}" into the search input and press Enter`);
    await delay(2000);

    // Click on first result
    await stagehand.act("Click on the first contact in the search results");
    await delay(2000);

    // Extract detailed contact info
    console.log("[GHL Extract] Extracting contact details...");
    const instruction = "Extract all visible contact information including name, email, phone, address, tags, custom fields, notes, and any other profile data.";
    const extractedData: any = await stagehand.extract(
      instruction,
      z.object({
        contact: contactSchema.extend({
          address: z.string().optional(),
          notes: z.string().optional(),
          createdAt: z.string().optional(),
          lastActivity: z.string().optional(),
        }),
      }) as any
    );

    return extractedData?.contact || null;

  } catch (error) {
    console.error("[GHL Extract] Error extracting contact details:", error);
    return null;
  }
}

/**
 * Extract campaign/email statistics
 */
export async function extractCampaignStats(
  stagehand: Stagehand
): Promise<Array<{ name: string; sent?: number; openRate?: string; clickRate?: string; status?: string }>> {
  const page = getPage(stagehand);

  try {
    // Navigate to marketing/campaigns
    console.log("[GHL Extract] Navigating to Campaigns...");
    await stagehand.act("Click on Marketing in the navigation menu");
    await delay(1500);
    await stagehand.act("Click on Emails or Campaigns");
    await delay(2000);

    // Extract campaign statistics
    console.log("[GHL Extract] Extracting campaign stats...");
    const instruction = "Extract all visible email campaign statistics. For each campaign, get the name, sent count, open rate, click rate, and status.";
    const extractedData: any = await stagehand.extract(
      instruction,
      z.object({
        campaigns: z.array(z.object({
          name: z.string(),
          sent: z.number().optional(),
          openRate: z.string().optional(),
          clickRate: z.string().optional(),
          status: z.string().optional(),
        })),
      }) as any
    );

    return extractedData?.campaigns || [];

  } catch (error) {
    console.error("[GHL Extract] Error extracting campaign stats:", error);
    return [];
  }
}
