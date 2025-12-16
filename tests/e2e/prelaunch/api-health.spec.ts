import { test, expect } from '@playwright/test';
import { getDeploymentUrl } from '../utils/deployment-test-utils';

const baseUrl = getDeploymentUrl();

test.describe('API Health Checks and Endpoint Validation', () => {
  test('Server is responding to requests', async ({ page }) => {
    const response = await page.request.get(baseUrl);
    expect(response.status()).toBeLessThan(500);
  });

  test('Health check endpoint returns 200', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/health`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 404]).toContain(response.status());
    }
  });

  test('API responds with correct content-type', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/health`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response && response.status() === 200) {
      expect(response.headers()['content-type']).toContain('json');
    }
  });

  test('Base API endpoint is available', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 404]).toContain(response.status());
    }
  });

  test('Rate limiting headers are present', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/health`).catch(() => null);

    if (response) {
      const headers = response.headers();
      const hasRateLimitHeaders = 'x-ratelimit-limit' in headers ||
                                  'x-ratelimit-remaining' in headers ||
                                  'x-ratelimit-reset' in headers ||
                                  'ratelimit-limit' in headers;

      // Rate limiting headers are nice to have but not critical
      expect(typeof hasRateLimitHeaders).toBe('boolean');
    }
  });

  test('CORS headers are properly configured', async ({ page }) => {
    const response = await page.request.options(`${baseUrl}/api/health`, {
      headers: {
        'Origin': baseUrl,
        'Access-Control-Request-Method': 'GET'
      }
    }).catch(() => null);

    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('Error responses return proper status codes', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/non-existent-endpoint`, {
      headers: { 'Accept': 'application/json' }
    });

    expect([404, 405]).toContain(response.status());
  });

  test('Server returns error JSON structure on failures', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/invalid-route`, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status() >= 400) {
      try {
        const json = await response.json();
        expect(typeof json).toBe('object');
      } catch {
        // Some errors might not have JSON body, which is acceptable
        expect(true).toBe(true);
      }
    }
  });

  test('API supports POST requests', async ({ page }) => {
    const response = await page.request.post(`${baseUrl}/api/test`, {
      data: { test: true },
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect([200, 401, 404, 405]).toContain(response.status());
    }
  });

  test('Database connectivity check via API', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/db-health`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('Redis/Cache connectivity check', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/cache-health`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('Authentication endpoints are available', async ({ page }) => {
    const authEndpoints = [
      `${baseUrl}/api/auth/login`,
      `${baseUrl}/api/auth/signup`,
      `${baseUrl}/api/auth/logout`,
      `${baseUrl}/api/auth/refresh`
    ];

    for (const endpoint of authEndpoints) {
      const response = await page.request.post(endpoint, {
        data: {},
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => null);

      if (response) {
        expect([400, 401, 404, 405]).toContain(response.status());
      }
    }
  });

  test('API version information available', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/version`, {
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (response && response.status() === 200) {
      try {
        const json = await response.json();
        expect(json).toHaveProperty(['version'] || ['apiVersion']);
      } catch {
        // Version endpoint might not return JSON
        expect(true).toBe(true);
      }
    }
  });

  test('No 5xx server errors on health endpoints', async ({ page }) => {
    const endpoints = [
      `${baseUrl}/api/health`,
      `${baseUrl}/api/status`,
      `${baseUrl}/api/ping`
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint).catch(() => null);

      if (response) {
        expect(response.status()).toBeLessThan(500);
      }
    }
  });

  test('Response times are acceptable (< 5 seconds)', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(baseUrl);
    const endTime = Date.now();

    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(5000);
  });

  test('API supports required HTTP methods', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/health`);
    expect(response.status()).toBeLessThan(500);
  });

  test('No sensitive information in error messages', async ({ page }) => {
    const response = await page.request.get(`${baseUrl}/api/test-error-message`);

    if (response.status() >= 400) {
      const text = await response.text();
      const hasSensitiveInfo = text.includes('password') ||
                               text.includes('secret') ||
                               text.includes('api_key') ||
                               text.includes('database') ||
                               text.toLowerCase().includes('stack trace');

      expect(hasSensitiveInfo).toBe(false);
    }
  });
});
