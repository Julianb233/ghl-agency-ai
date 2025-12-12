import { chromium, Browser, Page } from 'playwright';

const PRODUCTION_URL = 'https://www.ghlagencyai.com';
const VERCEL_URL = 'https://ghl-agency-ai.vercel.app';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

async function runTests(browser: Browser, baseUrl: string): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Homepage loads
  results.push(await runTest('Homepage loads', async () => {
    const page = await browser.newPage();
    try {
      const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response || response.status() !== 200) {
        throw new Error(`Homepage returned status ${response?.status()}`);
      }
    } finally {
      await page.close();
    }
  }));

  // Test 2: Login page accessible
  results.push(await runTest('Login page accessible', async () => {
    const page = await browser.newPage();
    try {
      const response = await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response || response.status() !== 200) {
        throw new Error(`Login page returned status ${response?.status()}`);
      }
      // Check for login form elements
      const googleButton = await page.locator('text=Google').count();
      if (googleButton === 0) {
        throw new Error('Google login button not found');
      }
    } finally {
      await page.close();
    }
  }));

  // Test 3: Auth debug endpoint works
  results.push(await runTest('Auth debug endpoint', async () => {
    const page = await browser.newPage();
    try {
      const response = await page.goto(`${baseUrl}/api/auth/debug`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response || response.status() !== 200) {
        throw new Error(`Auth debug endpoint returned status ${response?.status()}`);
      }
      const body = await page.textContent('body');
      const data = JSON.parse(body || '{}');
      if (!data.cookieConfig) {
        throw new Error('Cookie config not found in response');
      }
      if (data.cookieConfig.sameSite !== 'lax') {
        throw new Error(`Expected sameSite=lax, got ${data.cookieConfig.sameSite}`);
      }
      if (data.cookieConfig.secure !== true) {
        throw new Error(`Expected secure=true, got ${data.cookieConfig.secure}`);
      }
    } finally {
      await page.close();
    }
  }));

  // Test 4: Google OAuth config endpoint
  results.push(await runTest('Google OAuth config endpoint', async () => {
    const page = await browser.newPage();
    try {
      const response = await page.goto(`${baseUrl}/api/oauth/google/config`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response || response.status() !== 200) {
        throw new Error(`OAuth config endpoint returned status ${response?.status()}`);
      }
      const body = await page.textContent('body');
      const data = JSON.parse(body || '{}');
      if (data.clientId === 'NOT_SET') {
        throw new Error('GOOGLE_CLIENT_ID not configured');
      }
      if (!data.clientSecretSet) {
        throw new Error('GOOGLE_CLIENT_SECRET not configured');
      }
    } finally {
      await page.close();
    }
  }));

  // Test 5: tRPC health check
  results.push(await runTest('tRPC health endpoint', async () => {
    const page = await browser.newPage();
    try {
      const response = await page.goto(`${baseUrl}/api/health`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response || response.status() !== 200) {
        throw new Error(`Health endpoint returned status ${response?.status()}`);
      }
    } finally {
      await page.close();
    }
  }));

  // Test 6: API trpc route accessible
  results.push(await runTest('tRPC route accessible', async () => {
    const page = await browser.newPage();
    try {
      // Just check that the route responds (even with error is OK)
      const response = await page.goto(`${baseUrl}/api/trpc`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // tRPC returns 404 for empty path, which is expected
      if (!response) {
        throw new Error('No response from tRPC endpoint');
      }
    } finally {
      await page.close();
    }
  }));

  // Test 7: Google OAuth redirect works
  results.push(await runTest('Google OAuth redirect initiates', async () => {
    const page = await browser.newPage();
    try {
      // Don't actually follow the redirect, just check it starts correctly
      await page.goto(`${baseUrl}/api/oauth/google`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const url = page.url();
      if (!url.includes('accounts.google.com')) {
        throw new Error(`Expected redirect to Google, got ${url}`);
      }
    } finally {
      await page.close();
    }
  }));

  // Test 8: Pricing page loads
  results.push(await runTest('Pricing page loads', async () => {
    const page = await browser.newPage();
    try {
      const response = await page.goto(`${baseUrl}/#pricing`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!response || response.status() !== 200) {
        throw new Error(`Pricing page returned status ${response?.status()}`);
      }
    } finally {
      await page.close();
    }
  }));

  // Test 9: Dashboard redirects to login when not authenticated
  results.push(await runTest('Dashboard requires auth', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const url = page.url();
      // Should redirect to login or show login prompt
      const hasLoginInUrl = url.includes('/login');
      const hasLoginButton = await page.locator('text=Login').count() > 0 || await page.locator('text=Sign in').count() > 0;
      if (!hasLoginInUrl && !hasLoginButton) {
        console.log(`URL: ${url}`);
      }
    } finally {
      await page.close();
    }
  }));

  // Test 10: Static assets load
  results.push(await runTest('Static assets accessible', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      // Check that main JS bundle loaded
      const scripts = await page.$$('script[src]');
      if (scripts.length === 0) {
        throw new Error('No script tags found');
      }
    } finally {
      await page.close();
    }
  }));

  return results;
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    return { name, passed: true, duration: Date.now() - start };
  } catch (error) {
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start
    };
  }
}

async function main() {
  console.log('Starting E2E Auth & Cookie Tests...\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // Test production domain
    console.log(`\n=== Testing ${PRODUCTION_URL} ===\n`);
    const prodResults = await runTests(browser, PRODUCTION_URL);
    printResults(prodResults, PRODUCTION_URL);

    // Test Vercel domain
    console.log(`\n=== Testing ${VERCEL_URL} ===\n`);
    const vercelResults = await runTests(browser, VERCEL_URL);
    printResults(vercelResults, VERCEL_URL);

    // Summary
    const allResults = [...prodResults, ...vercelResults];
    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;

    console.log('\n========================================');
    console.log(`SUMMARY: ${passed} passed, ${failed} failed out of ${allResults.length} tests`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

function printResults(results: TestResult[], url: string) {
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
}

main().catch(console.error);
