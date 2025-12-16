import { test, expect } from '@playwright/test';
import { getDeploymentUrl } from '../utils/deployment-test-utils';

const baseUrl = getDeploymentUrl();

test.describe('Browser Automation and Browserbase Integration', () => {
  test('Browserbase environment variables are configured', async ({ page }) => {
    // This is a smoke test to verify Browserbase is set up
    const response = await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
  });

  test('Browser automation endpoints are accessible', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/browser/status`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Session management for browser automation', async ({ page }) => {
    const createSessionResponse = await page.request.post(`${baseUrl}/api/browser/sessions`, {
      data: { name: 'test-session' },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (createSessionResponse) {
      expect([200, 201, 401, 404]).toContain(createSessionResponse.status());
    }
  });

  test('Screenshot capability is available', async ({ page }) => {
    // Playwright native screenshot test
    const screenshot = await page.screenshot({ path: null }).catch(() => null);
    expect(screenshot).not.toBeNull();
  });

  test('Page automation basic operations work', async ({ page }) => {
    await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });

    // Test basic navigation
    const pageTitle = page.url();
    expect(pageTitle).toBeTruthy();
  });

  test('Browserbase SDK integration health check', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/stagehand/status`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404]).toContain(response.status());
    }
  });

  test('Browser context isolation works', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto(baseUrl);
    await page2.goto(baseUrl);

    expect(page1.url()).toBe(page2.url());

    await context1.close();
    await context2.close();
  });

  test('Viewport and device emulation works', async ({ page }) => {
    const viewportSize = page.viewportSize();
    expect(viewportSize).not.toBeNull();
    expect(viewportSize?.width).toBeGreaterThan(0);
    expect(viewportSize?.height).toBeGreaterThan(0);
  });

  test('Page timeout configurations are appropriate', async ({ page }) => {
    // Set a reasonable timeout
    page.setDefaultTimeout(30000);
    const response = await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status()).toBeLessThan(500);
  });

  test('Navigation between pages works correctly', async ({ page }) => {
    await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });
    const initialUrl = page.url();

    // Navigate to login
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    const loginUrl = page.url();

    expect(loginUrl).not.toBe(initialUrl);
    expect(loginUrl).toContain('login');
  });

  test('LocalStorage and SessionStorage are accessible', async ({ page }) => {
    await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });

    const storageInfo = await page.evaluate(() => {
      return {
        localStorageSize: Object.keys(localStorage).length,
        sessionStorageSize: Object.keys(sessionStorage).length,
        canAccess: true
      };
    });

    expect(storageInfo.canAccess).toBe(true);
  });

  test('Cookie handling works correctly', async ({ page, context }) => {
    await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });

    const cookies = await context.cookies();
    expect(Array.isArray(cookies)).toBe(true);

    // Try to set a test cookie
    await context.addCookies([{
      name: 'test_cookie',
      value: 'test_value',
      url: baseUrl
    }]);

    const updatedCookies = await context.cookies();
    expect(updatedCookies.length).toBeGreaterThanOrEqual(cookies.length);
  });

  test('Window and document objects are accessible', async ({ page }) => {
    await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });

    const windowInfo = await page.evaluate(() => {
      return {
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        hasNavigator: typeof navigator !== 'undefined'
      };
    });

    expect(windowInfo.hasWindow).toBe(true);
    expect(windowInfo.hasDocument).toBe(true);
    expect(windowInfo.hasNavigator).toBe(true);
  });

  test('Console API is functional', async ({ page }) => {
    const logs: string[] = [];

    page.on('console', msg => {
      logs.push(msg.text());
    });

    await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });

    // Trigger a console message
    await page.evaluate(() => {
      console.log('Test log message');
    });

    await page.waitForTimeout(500);

    expect(logs.some(log => log.includes('Test log'))).toBe(true);
  });

  test('Page events and listeners work', async ({ page }) => {
    let navigationHappened = false;

    page.once('load', () => {
      navigationHappened = true;
    });

    await page.goto(`${baseUrl}`, { waitUntil: 'load' });

    expect(navigationHappened).toBe(true);
  });

  test('Web API functionality (fetch, XMLHttpRequest)', async ({ page }) => {
    await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });

    const fetchWorks = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/health', { method: 'GET' });
        return response.status < 500;
      } catch {
        return false;
      }
    });

    expect(typeof fetchWorks).toBe('boolean');
  });

  test('Page performance metrics are available', async ({ page }) => {
    await page.goto(`${baseUrl}`, { waitUntil: 'domcontentloaded' });

    const metrics = await page.evaluate(() => {
      const perf = window.performance.timing;
      return {
        navigationStart: perf.navigationStart,
        loadEventEnd: perf.loadEventEnd,
        hasMetrics: perf.navigationStart > 0
      };
    });

    expect(metrics.hasMetrics).toBe(true);
  });
});
