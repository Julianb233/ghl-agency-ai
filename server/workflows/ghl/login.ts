/**
 * GHL Login Workflow
 * Handles authentication to GoHighLevel dashboard with 2FA support
 */

import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import type { Page } from "playwright";

// GHL Login URL
const GHL_LOGIN_URL = "https://app.gohighlevel.com/";

// Helper to get Playwright page with correct types
function getPage(stagehand: Stagehand): Page {
  return stagehand.context.pages()[0] as unknown as Page;
}

// Helper for delays (Playwright-compatible)
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Login credentials schema
export const ghlLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  locationId: z.string().optional(),
  // 2FA code - if provided, will be used for authentication
  twoFactorCode: z.string().length(6).optional(),
});

export type GHLLoginCredentials = z.infer<typeof ghlLoginSchema>;

// Login result schema
export interface GHLLoginResult {
  success: boolean;
  sessionId: string;
  locationId?: string;
  dashboardUrl?: string;
  error?: string;
  requires2FA?: boolean;
}

/**
 * Login to GoHighLevel dashboard
 * Supports email/password authentication with optional 2FA
 */
export async function ghlLogin(
  stagehand: Stagehand,
  credentials: GHLLoginCredentials
): Promise<GHLLoginResult> {
  const sessionId = stagehand.browserbaseSessionID || "unknown";

  try {
    const page = getPage(stagehand);

    // Navigate to GHL login page
    console.log("[GHL Login] Navigating to login page...");
    await page.goto(GHL_LOGIN_URL, { waitUntil: "domcontentloaded" });
    await delay(2000);

    // Check if already logged in
    const currentUrl = page.url();
    if (currentUrl.includes("/dashboard") || currentUrl.includes("/location")) {
      console.log("[GHL Login] Already logged in");
      return {
        success: true,
        sessionId,
        dashboardUrl: currentUrl,
      };
    }

    // Fill in email using Playwright native method (SECURE - not logged)
    console.log("[GHL Login] Entering email...");
    const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await emailInput.fill(credentials.email);
    await delay(500);

    // Fill in password using Playwright native method (SECURE - not logged)
    console.log("[GHL Login] Entering password...");
    const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.fill(credentials.password);
    await delay(500);

    // Click login button
    console.log("[GHL Login] Clicking login button...");
    await stagehand.act("Click the Sign In or Login button");
    await delay(3000);

    // Check for 2FA prompt
    const pageContent = await page.content();
    const needs2FA = pageContent.toLowerCase().includes("verification") ||
                     pageContent.toLowerCase().includes("two-factor") ||
                     pageContent.toLowerCase().includes("2fa") ||
                     pageContent.toLowerCase().includes("code");

    if (needs2FA && !credentials.twoFactorCode) {
      console.log("[GHL Login] 2FA required but no code provided");
      return {
        success: false,
        sessionId,
        requires2FA: true,
        error: "2FA verification required. Please provide twoFactorCode.",
      };
    }

    if (needs2FA && credentials.twoFactorCode) {
      console.log("[GHL Login] Entering 2FA code...");
      // Use Playwright native method for 2FA code (SECURE - not logged)
      const codeInput = await page.locator('input[type="text"][maxlength="6"], input[name*="code" i], input[placeholder*="code" i], input[name*="otp" i]').first();
      await codeInput.fill(credentials.twoFactorCode);
      await delay(500);
      await stagehand.act("Click the Verify or Submit button");
      await delay(3000);
    }

    // Verify login success
    const finalUrl = page.url();
    const loginSuccess = finalUrl.includes("/dashboard") ||
                         finalUrl.includes("/location") ||
                         finalUrl.includes("/launchpad");

    if (!loginSuccess) {
      // Check for error messages - using 'as any' pattern from existing codebase
      try {
        const errorText: any = await stagehand.extract(
          "Extract any error message shown on the page",
          z.object({
            error: z.string().optional(),
          }) as any
        );

        return {
          success: false,
          sessionId,
          error: errorText?.error || "Login failed - unknown error",
        };
      } catch {
        return {
          success: false,
          sessionId,
          error: "Login failed - could not verify success",
        };
      }
    }

    // If locationId provided, navigate to that location
    if (credentials.locationId && loginSuccess) {
      console.log(`[GHL Login] Switching to location: ${credentials.locationId}`);
      try {
        await page.goto(`https://app.gohighlevel.com/location/${credentials.locationId}/dashboard`, {
          waitUntil: "domcontentloaded",
        });
        await delay(2000);
      } catch (e) {
        console.log("[GHL Login] Could not navigate to specific location");
      }
    }

    console.log("[GHL Login] Login successful!");
    return {
      success: true,
      sessionId,
      locationId: credentials.locationId,
      dashboardUrl: page.url(),
    };

  } catch (error) {
    console.error("[GHL Login] Error:", error);
    return {
      success: false,
      sessionId,
      error: error instanceof Error ? error.message : "Unknown error during login",
    };
  }
}

/**
 * Check if currently logged in to GHL
 */
export async function isGHLLoggedIn(stagehand: Stagehand): Promise<boolean> {
  try {
    const page = getPage(stagehand);
    const currentUrl = page.url();

    return currentUrl.includes("app.gohighlevel.com") &&
           (currentUrl.includes("/dashboard") ||
            currentUrl.includes("/location") ||
            currentUrl.includes("/launchpad"));
  } catch {
    return false;
  }
}

/**
 * Logout from GHL
 */
export async function ghlLogout(stagehand: Stagehand): Promise<boolean> {
  try {
    // Try to click user menu and logout
    await stagehand.act("Click on the user profile menu or avatar in the header");
    await delay(1000);
    await stagehand.act("Click on Logout or Sign Out");
    await delay(2000);

    return true;
  } catch {
    return false;
  }
}
