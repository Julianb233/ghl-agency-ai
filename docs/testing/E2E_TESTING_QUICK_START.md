# E2E Testing Quick Start Guide

**Quick Reference for Running & Managing E2E Tests**

---

## Running Tests

### Quick Commands

```bash
# Run all smoke tests (fastest)
npm run test:e2e:smoke

# Run all E2E tests across all browsers
npm run test:e2e

# Run tests in UI mode (interactive debugging)
npm run test:e2e:ui

# View HTML test report
npm run test:e2e:report

# Run tests against specific environment
DEPLOYMENT_URL="https://ghlagencyai.com" npm run test:e2e:smoke

# Run tests for single browser
npx playwright test --project=chromium

# Run specific test file
npx playwright test tests/e2e/smoke/auth-flow.spec.ts

# Run tests matching pattern
npx playwright test -g "Authentication"

# Run with debug mode
PWDEBUG=1 npm run test:e2e:smoke
```

---

## Test Execution Results (Latest Run)

### Chromium Browser Results (Primary)
```
✓ Passed:   11 tests
✗ Failed:   6 tests
⏱ Duration: 28.3 seconds
Success Rate: 64.7%
```

### Failed Tests (Chromium)
1. Homepage loads successfully
2. Login page is accessible
3. Login page contains auth elements
4. Dashboard redirects to login
5. Homepage has no critical console errors
6. Auth debug endpoint returns valid data

### Key Findings
- Network connectivity issues to production (net::ERR_NETWORK_CHANGED)
- Missing API endpoint fields in auth responses
- Some cookie configuration endpoints not responding

---

## Test File Structure

```
tests/
├── e2e/
│   ├── smoke/                    # Quick validation tests
│   │   ├── auth-flow.spec.ts     # Login/auth verification
│   │   ├── console-errors.spec.ts# Browser console monitoring
│   │   ├── health-check.spec.ts  # API health checks
│   │   └── (Results: 11/17 passing)
│   ├── prelaunch/                # Pre-deployment tests
│   │   ├── auth.spec.ts
│   │   ├── api-health.spec.ts
│   │   ├── agent-execution.spec.ts
│   │   ├── browser-automation.spec.ts
│   │   ├── payment.spec.ts
│   │   └── checklist.ts
│   ├── utils/
│   │   └── deployment-test-utils.ts  # Test utilities
│   └── visual/                   # [TO BE CREATED]
└── load/                        # Load testing (k6)
    ├── api-smoke.test.js
    ├── api-load.test.js
    ├── api-stress.test.js
    └── api-spike.test.js
```

---

## Test Utilities Available

### Navigation & Status Checks
```typescript
import { navigateToPath, getDeploymentUrl } from '../utils/deployment-test-utils';

// Get configured base URL
const baseUrl = getDeploymentUrl(); // Uses DEPLOYMENT_URL env var

// Navigate and get status
const status = await navigateToPath(page, `${baseUrl}/login`);
expect(status).toBe(200);
```

### API Testing
```typescript
import { testApiEndpoint } from '../utils/deployment-test-utils';

// Test API endpoint with expected fields
const { status, data } = await testApiEndpoint(
  page,
  `${baseUrl}/api/health`,
  ['status', 'timestamp']
);
```

### Console & Network Monitoring
```typescript
import {
  collectConsoleErrors,
  setupNetworkInterceptor,
  getAllConsoleErrors
} from '../utils/deployment-test-utils';

// Collect console errors
page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log(msg.text());
  }
});

// Monitor network
const failedRequests = await setupNetworkInterceptor(page);
```

---

## Common Test Patterns

### Pattern 1: Form Filling & Submission
```typescript
test('User fills and submits login form', async ({ page }) => {
  await page.goto(`${baseUrl}/login`);

  // Fill form
  await page.fill('input[type="email"]', 'user@example.com');
  await page.fill('input[type="password"]', 'password123');

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForNavigation();
});
```

### Pattern 2: Element Visibility
```typescript
test('Button is visible and clickable', async ({ page }) => {
  const button = page.locator('[data-testid="action-btn"]');

  // Check visibility
  await expect(button).toBeVisible();

  // Check enabled state
  await expect(button).toBeEnabled();

  // Click
  await button.click();
});
```

### Pattern 3: Error Handling
```typescript
test('Error message appears on invalid input', async ({ page }) => {
  await page.goto(`${baseUrl}/form`);

  // Submit empty form
  await page.click('button[type="submit"]');

  // Check for error
  await expect(page.locator('[role="alert"]')).toContainText('required');
});
```

### Pattern 4: Network Interception
```typescript
test('Handles API error gracefully', async ({ page }) => {
  // Mock API error
  await page.route('**/api/data', route => {
    route.abort('failed');
  });

  await page.goto(`${baseUrl}/dashboard`);

  // Trigger API call
  await page.click('[data-testid="refresh"]');

  // Check error handling
  await expect(page.locator('[role="alert"]')).toBeVisible();
});
```

---

## Test Data

### Test User Credentials
```
Email: test@example.com
Password: TestPassword123!
Role: Standard User

Admin: admin@example.com
Password: AdminPassword123!
Role: Administrator
```

### Test Endpoints
```
Homepage:       https://ghlagencyai.com
Login:          https://ghlagencyai.com/login
Dashboard:      https://ghlagencyai.com/dashboard
Pricing:        https://ghlagencyai.com/#pricing

API Health:     https://ghlagencyai.com/api/health
Auth Debug:     https://ghlagencyai.com/api/auth/debug
OAuth Config:   https://ghlagencyai.com/api/oauth/google/config
```

---

## Debugging Tests

### Enable Debug Mode
```bash
# Interactive debug mode
PWDEBUG=1 npm run test:e2e:smoke

# Run in headed mode (see browser)
npx playwright test --headed

# Run in headed mode with specific test
npx playwright test --headed -g "Authentication"
```

### Inspector Mode
```bash
# Use Playwright Inspector
npx playwright test --debug

# Then use commands:
# continue   - continue to next step
# step       - step into next action
# next       - skip to next step
```

### View Test Reports
```bash
# Open interactive HTML report
npm run test:e2e:report

# View detailed error logs
cat test-results/junit.xml

# View trace (detailed execution record)
npx playwright show-trace test-results/trace.zip
```

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `net::ERR_NETWORK_CHANGED` | Network timeout or site unreachable | Check URL, increase timeout, verify network |
| `Timeout waiting for selector` | Element not found | Add wait state, check selector, verify page state |
| `Cannot read property of undefined` | Element returned null | Use optional chaining, add null checks |
| `Method not allowed (405)` | Wrong HTTP method | Verify endpoint method in test |
| `Authentication failed (401)` | Auth token invalid/expired | Re-login, check test user account |

---

## Test Report Interpretation

### HTML Report Contents
```
test-results/html/index.html
├── Test Summary
│   ├── Total Tests
│   ├── Passed/Failed/Skipped
│   └── Execution Time
├── Browser Results
│   ├── Chromium
│   ├── Firefox
│   └── WebKit
├── Individual Test Details
│   ├── Error messages
│   ├── Screenshots
│   └── Videos
└── Trace Files
    └── Step-by-step execution replay
```

### Reading Failure Details
1. **Error Section**: Shows what failed and why
2. **Call Log**: Shows all browser actions leading to failure
3. **Screenshot**: Last state before failure
4. **Video**: Full test execution recording
5. **Trace**: Detailed browser interaction record

---

## CI/CD Integration

### GitHub Actions
Tests can be triggered via GitHub Actions workflow:
```bash
# Automatic on push to main
git push origin main

# Manual trigger
gh workflow run e2e-tests.yml
```

### Local Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running E2E smoke tests..."
npm run test:e2e:smoke

if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

---

## Performance Benchmarks

### Current Performance
- **Smoke tests (3 tests × 3 browsers):** ~1 minute 20 seconds
- **Single browser test:** ~30 seconds
- **Average test duration:** 10-15 seconds
- **Network timeout threshold:** 30 seconds

### Optimization Tips
- Run only smoke tests locally
- Use single browser (chromium) for faster feedback
- Run full suite only in CI
- Parallelize tests (default: 4 workers)

---

## Next Steps

### Immediate (This Sprint)
- [ ] Fix network connectivity issues on production
- [ ] Implement missing API endpoints
- [ ] Update API response structures
- [ ] Re-run tests to get baseline

### Short-term (2 Weeks)
- [ ] Add login form interaction tests
- [ ] Add dashboard functionality tests
- [ ] Improve error handling in tests
- [ ] Set up visual regression testing

### Long-term (1 Month+)
- [ ] Expand to 100+ test cases
- [ ] Add performance testing
- [ ] Add security testing
- [ ] Add accessibility testing

---

## Useful Links

### Documentation
- [Playwright Docs](https://playwright.dev)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-page)

### Tools
- [Playwright Inspector](https://playwright.dev/docs/inspector)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Code Generator](https://playwright.dev/docs/codegen)

### Testing Resources
- [Testing Library Docs](https://testing-library.com)
- [Web Vitals](https://web.dev/vitals)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref)

---

## Support & Issues

### Getting Help
1. Check test output for detailed error messages
2. Review HTML report for screenshots/videos
3. Run test in debug mode for step-by-step execution
4. Check documentation and examples
5. Review similar passing tests

### Reporting Issues
When filing a bug related to tests:
1. Include test name and error message
2. Attach HTML report or screenshot
3. Include reproduction steps
4. Note browser and OS
5. Include any relevant logs

---

**Last Updated:** December 20, 2025
**Test Framework Version:** Playwright 1.57.0
**Node.js Version:** 20.x
**Status:** 11/17 tests passing (Chromium)
