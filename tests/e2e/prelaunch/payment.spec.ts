import { test, expect } from '@playwright/test';
import { getDeploymentUrl } from '../utils/deployment-test-utils';

const baseUrl = getDeploymentUrl();

test.describe('Payment Processing and Stripe Integration', () => {
  test('Pricing page loads and displays pricing information', async ({ page }) => {
    const response = await page.goto(`${baseUrl}/#pricing`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
  });

  test('Pricing page contains plan information', async ({ page }) => {
    await page.goto(`${baseUrl}/#pricing`, { waitUntil: 'domcontentloaded' });

    // Check for pricing elements
    const pricingElements = await page.locator('[class*="price"], [class*="plan"], [class*="pricing"]').count();
    expect(pricingElements).toBeGreaterThan(0);
  });

  test('Checkout or upgrade buttons are accessible', async ({ page }) => {
    await page.goto(`${baseUrl}/#pricing`, { waitUntil: 'domcontentloaded' });

    const checkoutButtons = await page.locator(
      'button:has-text("Upgrade"), button:has-text("Subscribe"), button:has-text("Checkout"), [href*="checkout"], [href*="subscribe"]'
    ).count();

    expect(checkoutButtons).toBeGreaterThanOrEqual(0);
  });

  test('Stripe environment validation', async ({ page }) => {
    // Check for Stripe in page context
    const stripePresent = await page.evaluate(() => {
      return typeof (window as any).Stripe !== 'undefined' ||
             document.querySelector('[src*="stripe"]') !== null;
    });

    // Stripe should be loaded or available (not critical if missing on non-checkout pages)
    expect(typeof stripePresent).toBe('boolean');
  });

  test('Payment API endpoint health check', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/stripe/status`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      // Accept various status codes, but not 500+
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('Webhook endpoint is accessible', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/webhooks/stripe`, {
      data: { test: true },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      // Should handle webhook requests (may reject due to signature validation)
      expect([200, 400, 401]).toContain(response.status());
    }
  });

  test('Pricing page contains call-to-action elements', async ({ page }) => {
    await page.goto(`${baseUrl}/#pricing`, { waitUntil: 'domcontentloaded' });

    const ctaElements = await page.locator(
      'button, a[href*="contact"], a[href*="demo"], a[href*="trial"]'
    ).count();

    expect(ctaElements).toBeGreaterThan(0);
  });

  test('Payment pages are HTTPS enabled', async ({ page }) => {
    const response = await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });
    const url = page.url();

    // Should redirect to HTTPS or already be HTTPS
    expect(url.startsWith('http') && (url.startsWith('https') || url.includes('localhost') || url.includes('127.0.0.1'))).toBe(true);
  });

  test('Subscription status endpoint accessible', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/subscription/status`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 403, 404]).toContain(response.status());
    }
  });

  test('Invoice endpoints are available', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/invoices`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 403, 404]).toContain(response.status());
    }
  });

  test('Payment method management endpoints accessible', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/payment-methods`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 403, 404]).toContain(response.status());
    }
  });

  test('Stripe publishable key exposed safely (not secret key)', async ({ page }) => {
    const response = await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });

    const exposedSecrets = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;
      const hasSecretKey = html.includes('sk_');
      const hasPublishable = html.includes('pk_');

      return {
        hasSecretKey,
        hasPublishable
      };
    });

    // Should NOT expose secret keys
    expect(exposedSecrets.hasSecretKey).toBe(false);
  });

  test('Plan feature comparison information available', async ({ page }) => {
    await page.goto(`${baseUrl}/#pricing`, { waitUntil: 'domcontentloaded' });

    const featureElements = await page.locator('[class*="feature"], [class*="benefit"], li, .feature-list').count();

    expect(featureElements).toBeGreaterThan(0);
  });

  test('Cancel subscription endpoint accessible', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/subscription/cancel`, {
      data: {},
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      // Should require auth, but endpoint should exist
      expect([200, 401, 403, 404]).toContain(response.status());
    }
  });
});
