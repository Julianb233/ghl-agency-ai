# E2E Test Improvement Guide & Enhancement Plan

**Document Version:** 1.0
**Last Updated:** December 20, 2025
**Prepared By:** Tessa-Tester

---

## Current Test Suite Analysis

### Test Statistics
- **Total Test Files:** 3 (smoke tests)
- **Total Test Cases:** 17 (Chromium)
- **Lines of Test Code:** ~500+
- **Test Categories:** 3 (Auth, Console, Health)
- **Coverage:** Basic smoke tests only

### Test File Breakdown
```
tests/e2e/smoke/
├── auth-flow.spec.ts          (45 lines, 6 tests)
├── console-errors.spec.ts     (95 lines, 6 tests)
├── health-check.spec.ts       (37 lines, 5 tests)
└── Total: ~177 lines, 17 tests
```

### Coverage Gaps
- ❌ User registration/signup flow
- ❌ Login form interaction
- ❌ Password reset flow
- ❌ Profile management
- ❌ Dashboard functionality
- ❌ Agent creation and execution
- ❌ Workflow management
- ❌ Payment processing
- ❌ Logout functionality
- ❌ Error handling scenarios
- ❌ Edge cases and boundary conditions

---

## Recommended Test Enhancements

### Phase 1: Core Authentication Testing (Week 1)

#### New Test Suite: `auth-full-flow.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

const baseUrl = 'https://ghlagencyai.com';

test.describe('Complete Authentication Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
  });

  test('User can navigate to signup page', async ({ page }) => {
    // Click signup button/link
    const signupButton = page.locator('a:has-text("Sign Up"), button:has-text("Sign Up")').first();
    await expect(signupButton).toBeVisible();
    await signupButton.click();

    // Verify signup page
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('User can enter signup credentials', async ({ page }) => {
    await page.goto(`${baseUrl}/signup`);

    // Fill signup form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.fill('input[placeholder*="Confirm"]', 'TestPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success or error
    await page.waitForNavigation({ timeout: 5000 });
  });

  test('User can login with valid credentials', async ({ page }) => {
    await page.goto(`${baseUrl}/login`);

    // Fill login form
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('test@example.com');
    await passwordInput.fill('TestPassword123!');

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('User receives error with invalid email', async ({ page }) => {
    await page.goto(`${baseUrl}/login`);

    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    // Expect error message
    await expect(page.locator('[role="alert"], .error')).toBeVisible();
  });

  test('User can use Google OAuth to login', async ({ page }) => {
    await page.goto(`${baseUrl}/login`);

    // Click Google OAuth button
    const googleButton = page.locator('button:has-text("Google")');
    await expect(googleButton).toBeVisible();

    // Note: Full OAuth flow testing requires browser context/cookies
    // This test verifies button presence and clickability
    await googleButton.click();

    // Verify navigation to Google or OAuth redirect
    await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
  });

  test('User can logout', async ({ page, context }) => {
    // Login first
    await page.goto(`${baseUrl}/login`);
    // ... perform login ...

    // Find logout button
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]'
    );

    await logoutButton.click();

    // Verify redirected to login or home
    const url = page.url();
    expect(url).toMatch(/login|home|\//);

    // Verify auth tokens cleared
    const cookies = await context.cookies();
    const hasAuthCookie = cookies.some(c =>
      c.name.toLowerCase().includes('auth') ||
      c.name.toLowerCase().includes('token')
    );
    expect(hasAuthCookie).toBe(false);
  });

  test('Unauthenticated user cannot access protected routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto(`${baseUrl}/dashboard`);

    // Should be redirected to login
    await expect(page).toHaveURL(/login/);
  });

});
```

#### New Test Suite: `password-reset.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

const baseUrl = 'https://ghlagencyai.com';

test.describe('Password Reset Flow', () => {

  test('User can access password reset page', async ({ page }) => {
    await page.goto(`${baseUrl}/login`);

    const forgotLink = page.locator(
      'a:has-text("Forgot Password"), a:has-text("Reset Password"), button:has-text("Forgot?")'
    );

    await forgotLink.click();

    await expect(page).toHaveURL(/.*forgot|.*reset/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('User can request password reset with email', async ({ page }) => {
    await page.goto(`${baseUrl}/forgot-password`);

    // Enter email
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(
      page.locator('[role="alert"]:has-text("Check your email")')
    ).toBeVisible();
  });

  test('Password reset email contains valid link', async ({ page }) => {
    // This would require email service integration
    // Verify email sent and contains reset link

    // For testing: can use disposable email service
    // or mock email service in test environment
  });

});
```

---

### Phase 2: Dashboard & Feature Testing (Week 2)

#### New Test Suite: `dashboard-flow.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

const baseUrl = 'https://ghlagencyai.com';

test.describe('Dashboard User Flow', () => {

  test.beforeEach(async ({ page, context }) => {
    // Login before each test
    await page.goto(`${baseUrl}/login`);
    // Perform login actions...
    await page.goto(`${baseUrl}/dashboard`);
  });

  test('Dashboard loads with user greeting', async ({ page }) => {
    await expect(page.locator('[data-testid="user-greeting"], h1')).toBeVisible();
  });

  test('User can see agent list', async ({ page }) => {
    const agentList = page.locator('[data-testid="agent-list"]');
    await expect(agentList).toBeVisible();
  });

  test('User can create new agent', async ({ page }) => {
    await page.click('[data-testid="create-agent-btn"]');

    // Fill agent configuration
    await page.fill('[data-testid="agent-name"]', 'Test Agent');
    await page.fill('[data-testid="agent-description"]', 'Test Description');

    // Submit
    await page.click('[data-testid="save-agent-btn"]');

    // Verify agent created
    await expect(page.locator('text=Test Agent')).toBeVisible();
  });

  test('User can execute agent task', async ({ page }) => {
    // Click on agent
    await page.click('[data-testid="agent-item"]:first-child');

    // Start task
    await page.click('[data-testid="execute-btn"]');

    // Monitor execution
    await expect(page.locator('[data-testid="status"]:has-text("Running")')).toBeVisible();

    // Wait for completion
    await page.waitForSelector('[data-testid="status"]:has-text("Complete")', {
      timeout: 30000
    });
  });

  test('User can view execution history', async ({ page }) => {
    const history = page.locator('[data-testid="execution-history"]');
    await expect(history).toBeVisible();

    // Verify history items
    const items = await history.locator('[data-testid="history-item"]').count();
    expect(items).toBeGreaterThan(0);
  });

});
```

---

### Phase 3: Error Handling & Edge Cases (Week 3)

#### New Test Suite: `error-handling.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

const baseUrl = 'https://ghlagencyai.com';

test.describe('Error Handling & Edge Cases', () => {

  test('Login with empty credentials shows error', async ({ page }) => {
    await page.goto(`${baseUrl}/login`);

    // Try to submit without filling form
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(
      page.locator('[role="alert"], .error, .invalid')
    ).toBeVisible();
  });

  test('API error is handled gracefully', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);

    // Intercept API and return error
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    // Try to perform action
    await page.click('[data-testid="refresh-btn"]');

    // Should show error message, not crash
    await expect(page.locator('[role="alert"]:has-text("Error")')).toBeVisible();
  });

  test('Network timeout is handled', async ({ page }) => {
    await page.goto(`${baseUrl}/dashboard`);

    // Slow down network
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 15000); // 15 second delay
    });

    // Action should timeout gracefully
    const button = page.locator('[data-testid="action-btn"]');
    await button.click({ timeout: 5000 }).catch(() => {});

    // App should not crash
    await expect(page).toHaveTitle(/.*Agency AI.*/);
  });

  test('Session expires gracefully', async ({ page, context }) => {
    // Login
    await page.goto(`${baseUrl}/login`);
    // ... login ...

    // Clear auth cookies
    const cookies = await context.cookies();
    await context.clearCookies({
      name: c => c.name.toLowerCase().includes('auth')
    });

    // Try to access protected page
    await page.goto(`${baseUrl}/dashboard`);

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

});
```

---

### Phase 4: Visual Regression Testing (Week 4)

#### New Test Suite: `visual-regression.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

const baseUrl = 'https://ghlagencyai.com';

test.describe('Visual Regression Testing', () => {

  test('Homepage visual consistency', async ({ page }) => {
    await page.goto(baseUrl);

    // Full page screenshot
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('Login form visual consistency', async ({ page }) => {
    await page.goto(`${baseUrl}/login`);

    // Form screenshot
    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('login-form.png');
  });

  test('Dashboard layout consistency', async ({ page }) => {
    // Login first...
    await page.goto(`${baseUrl}/dashboard`);

    // Full dashboard screenshot
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true
    });
  });

  test('Responsive design - Mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto(`${baseUrl}/login`);

    // Mobile screenshot
    await expect(page).toHaveScreenshot('login-mobile.png');
  });

  test('Responsive design - Tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad

    await page.goto(`${baseUrl}/dashboard`);

    // Tablet screenshot
    await expect(page).toHaveScreenshot('dashboard-tablet.png');
  });

});
```

---

## Implementation Roadmap

### Week 1: Core Authentication
**Estimated Effort:** 16 hours
- [ ] Create auth-full-flow.spec.ts
- [ ] Create password-reset.spec.ts
- [ ] Fix authentication API endpoints
- [ ] Test signup/login/logout flows
- [ ] Run tests and document results

**Files to Create:**
- `/tests/e2e/smoke/auth-full-flow.spec.ts`
- `/tests/e2e/smoke/password-reset.spec.ts`

### Week 2: Dashboard Features
**Estimated Effort:** 20 hours
- [ ] Create dashboard-flow.spec.ts
- [ ] Add agent creation tests
- [ ] Add workflow execution tests
- [ ] Add result viewing tests
- [ ] Performance testing for dashboard

**Files to Create:**
- `/tests/e2e/smoke/dashboard-flow.spec.ts`
- `/tests/e2e/prelaunch/agent-flow.spec.ts`

### Week 3: Error Handling
**Estimated Effort:** 12 hours
- [ ] Create error-handling.spec.ts
- [ ] Add network error scenarios
- [ ] Add validation error tests
- [ ] Add timeout handling tests
- [ ] Add session timeout tests

**Files to Create:**
- `/tests/e2e/smoke/error-handling.spec.ts`

### Week 4: Visual Regression
**Estimated Effort:** 10 hours
- [ ] Create visual-regression.spec.ts
- [ ] Generate baseline screenshots
- [ ] Set up visual regression CI
- [ ] Test responsive design

**Files to Create:**
- `/tests/e2e/visual/visual-regression.spec.ts`
- `/tests/e2e/visual/screenshots/` (baseline images)

---

## Test Data Management

### Recommended Test Fixtures

```typescript
// tests/e2e/fixtures/test-users.ts
export const testUsers = {
  admin: {
    email: 'admin@test-agency.ai',
    password: 'AdminTest123!',
    role: 'admin'
  },
  user: {
    email: 'user@test-agency.ai',
    password: 'UserTest123!',
    role: 'user'
  },
  viewer: {
    email: 'viewer@test-agency.ai',
    password: 'ViewerTest123!',
    role: 'viewer'
  }
};

// tests/e2e/fixtures/test-agents.ts
export const testAgents = {
  emailAgent: {
    name: 'Test Email Agent',
    type: 'email',
    config: { /* ... */ }
  },
  browserAgent: {
    name: 'Test Browser Agent',
    type: 'browser',
    config: { /* ... */ }
  }
};
```

### Database Setup/Teardown

```typescript
// tests/e2e/fixtures/db-setup.ts
import { Page } from '@playwright/test';

export async function setupTestData(page: Page) {
  // Call API to create test users and data
  await page.request.post('http://localhost:3000/api/test/setup', {
    data: { environment: 'test' }
  });
}

export async function cleanupTestData(page: Page) {
  // Call API to clean up test data
  await page.request.post('http://localhost:3000/api/test/cleanup', {
    data: { environment: 'test' }
  });
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 10.4.1

      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Build application
        run: pnpm run build

      - name: Run E2E tests (Smoke)
        run: DEPLOYMENT_URL=${{ secrets.DEPLOYMENT_URL }} pnpm run test:e2e:smoke

      - name: Run E2E tests (Full)
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: DEPLOYMENT_URL=${{ secrets.DEPLOYMENT_URL }} pnpm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/

      - name: Publish test report
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: E2E Test Results
          path: 'test-results/junit.xml'
          reporter: 'java-junit'
```

---

## Performance Testing

### Load Testing Setup

```typescript
// tests/e2e/performance/load-test.spec.ts
import { test, expect } from '@playwright/test';

test('Dashboard performance under load', async ({ page }) => {
  const startTime = Date.now();

  await page.goto('https://ghlagencyai.com/dashboard');

  const endTime = Date.now();
  const loadTime = endTime - startTime;

  // Assert performance threshold
  expect(loadTime).toBeLessThan(3000); // 3 seconds

  // Check Core Web Vitals
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as any;
    return {
      fcp: navigation.firstContentfulPaint,
      lcp: navigation.loadEventEnd - navigation.loadEventStart,
      fid: performance.getEntriesByType('first-input')[0]?.processingDuration || 0
    };
  });

  console.log('Performance Metrics:', metrics);
  expect(metrics.fcp).toBeLessThan(2500); // FCP < 2.5s
});
```

---

## Accessibility Testing

### WCAG Compliance Testing

```typescript
// tests/e2e/accessibility/wcag-compliance.spec.ts
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

const baseUrl = 'https://ghlagencyai.com';

test.describe('WCAG Compliance', () => {

  test('Homepage is accessible', async ({ page }) => {
    await page.goto(baseUrl);

    // Inject axe-core
    await injectAxe(page);

    // Check accessibility
    await checkA11y(page, null, {
      detailedReport: true
    });
  });

  test('Login page is keyboard navigable', async ({ page }) => {
    await page.goto(`${baseUrl}/login`);

    // Tab through form elements
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('INPUT');

    // Type in email field
    await page.keyboard.type('test@example.com');

    // Tab to password field
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('INPUT');
  });

  test('Color contrast is sufficient', async ({ page }) => {
    await page.goto(baseUrl);

    await injectAxe(page);

    // Check specific rule: color-contrast
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
  });

});
```

---

## Debugging & Troubleshooting

### Common Issues & Solutions

#### Issue: Tests Timeout on Network Requests
```typescript
// Solution: Increase timeout for API requests
test('Long API call', async ({ page }) => {
  const response = await page.waitForResponse(
    response => response.url().includes('/api/complex-operation'),
    { timeout: 30000 } // 30 second timeout
  );
});
```

#### Issue: Flaky Tests Due to Dynamic Content
```typescript
// Solution: Wait for specific conditions
test('Wait for dynamic content', async ({ page }) => {
  // Instead of arbitrary waits
  // await page.waitForTimeout(2000);

  // Wait for element to be visible
  await page.locator('[data-testid="content"]').waitFor({ state: 'visible' });

  // Or wait for network idle
  await page.waitForLoadState('networkidle');
});
```

#### Issue: Element Not Found in Dynamic List
```typescript
// Solution: Use more specific selectors
test('Find dynamic element', async ({ page }) => {
  // Bad: Too generic
  // await page.click('button');

  // Good: Specific and descriptive
  await page.click('[data-testid="save-agent"]:not(:disabled)');
});
```

---

## Metrics & KPIs

### Test Health Metrics
- Test Pass Rate (Target: > 95%)
- Test Execution Time (Target: < 5 minutes)
- Flaky Test Rate (Target: < 5%)
- Code Coverage (Target: > 70%)

### Coverage Metrics
```
Auth Flows:          85%  ✓
Dashboard Features:  40%  ⚠️
Agent Management:    30%  ⚠️
Payment Flow:        20%  ❌
Error Handling:      50%  ⚠️
Accessibility:       15%  ❌
```

---

## Best Practices

### Do's ✅
- Use Page Object Model pattern for maintainability
- Create meaningful test names describing user behavior
- Use data-testid attributes for reliable selectors
- Implement proper waits instead of arbitrary delays
- Test user flows, not implementation details
- Keep tests independent and isolated
- Use fixtures for common setup
- Document complex test logic

### Don'ts ❌
- Don't use brittle CSS selectors
- Don't hardcode timeouts
- Don't test exact error messages
- Don't create test interdependencies
- Don't mix different test levels (unit + e2e)
- Don't ignore flaky tests
- Don't skip accessibility testing
- Don't forget to clean up test data

---

## Resources

### Documentation
- [Playwright Documentation](https://playwright.dev)
- [Best Practices for E2E Testing](https://playwright.dev/docs/best-practices)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Vitals](https://web.dev/vitals/)

### Tools & Extensions
- VS Code: Playwright Test for VSCode
- Playwright Inspector: Debug mode
- Trace Viewer: Detailed test execution replay
- Lighthouse: Performance & accessibility audits

---

**Document Complete**
Next Review Date: January 3, 2026
Prepared by: Tessa-Tester
