# E2E Tests - File Reference & Quick Navigation

Complete index of all E2E test files, utilities, and configurations.

---

## Test File Locations

### Smoke Tests (Quick Validation)
**Location:** `/tests/e2e/smoke/`

| File | Tests | Status | Coverage |
|------|-------|--------|----------|
| `auth-flow.spec.ts` | 6 | 2 passed | Login/OAuth/pricing |
| `console-errors.spec.ts` | 6 | 4 passed | Console monitoring |
| `health-check.spec.ts` | 5 | 1 passed | API health checks |

**Total Smoke Tests:** 17 tests, 11 passing (64.7%)

---

### Pre-Launch Tests
**Location:** `/tests/e2e/prelaunch/`

| File | Purpose | Status |
|------|---------|--------|
| `auth.spec.ts` | Authentication flows | Contains 11 tests |
| `api-health.spec.ts` | API endpoint validation | Contains 14 tests |
| `browser-automation.spec.ts` | Browser agent testing | [Not reviewed] |
| `agent-execution.spec.ts` | Agent execution flows | [Not reviewed] |
| `payment.spec.ts` | Payment/Stripe flow | Contains 14 tests |
| `checklist.ts` | Pre-launch checklist | Utility file |

---

### Utility Files
**Location:** `/tests/e2e/utils/`

#### `deployment-test-utils.ts`
Helper functions for E2E tests:

```typescript
// URL Configuration
getDeploymentUrl()                  // Get base URL from env

// Navigation
navigateToPath(page, path)          // Navigate and return status
waitForPageReady(page, timeout)     // Wait for page load

// Element Checking
isElementVisible(page, selector)    // Check element visibility
hasTextContent(page, text)          // Check text presence

// API Testing
testApiEndpoint(page, endpoint)     // Test API with validation

// Console/Network Monitoring
collectConsoleErrors(page)          // Collect console errors
getAllConsoleErrors(page)           // Get all console messages
setupNetworkInterceptor(page)       // Monitor network requests
```

**Usage Example:**
```typescript
import { getDeploymentUrl, navigateToPath } from '../utils/deployment-test-utils';

const baseUrl = getDeploymentUrl();
const status = await navigateToPath(page, `${baseUrl}/login`);
expect(status).toBe(200);
```

---

## Test Configuration Files

### Playwright Configuration
**File:** `/playwright.config.ts`

**Key Settings:**
- Test Directory: `./tests/e2e`
- Test Match Pattern: `**/*.spec.ts`
- Test Timeout: 60 seconds
- Expect Timeout: 10 seconds
- Fully Parallel: Yes
- Retries: 2 (CI), 0 (local)
- Reporters: HTML, JSON, JUnit, List

**Browsers Configured:**
- Chromium (Primary)
- Firefox
- WebKit (Safari)

**Web Server:**
- Command: `pnpm run dev`
- Port: 3000
- Reuse Existing: Yes (unless CI)

---

## Test Execution Commands

### Run Tests
```bash
# All smoke tests
npm run test:e2e:smoke

# All E2E tests (all browsers)
npm run test:e2e

# Specific browser only
npx playwright test --project=chromium
npx playwright test --project=firefox

# Matching test name
npx playwright test -g "Authentication"

# Specific file
npx playwright test tests/e2e/smoke/auth-flow.spec.ts

# With debugging
PWDEBUG=1 npm run test:e2e:smoke

# Headed mode (see browser)
npx playwright test --headed
```

### View Results
```bash
# Interactive HTML report
npm run test:e2e:report

# View test results JSON
cat test-results/results.json

# View JUnit XML
cat test-results/junit.xml

# View trace (detailed replay)
npx playwright show-trace test-results/trace.zip
```

---

## Test Results

### Artifact Locations
```
test-results/
├── html/                      # HTML report
│   └── index.html            # View this in browser
├── results.json              # JSON test results
├── junit.xml                 # JUnit XML format
├── trace.zip                 # Execution trace
└── [test-name]/
    ├── test-failed-1.png     # Failure screenshot
    └── video.webm            # Test recording
```

### Generate Report
```bash
npm run test:e2e:report
# Opens test-results/html/index.html
```

---

## Environment Variables

### For Test Execution
```bash
# Base URL configuration
BASE_URL=http://localhost:3000           # Default for local
DEPLOYMENT_URL=https://ghlagencyai.com   # Production URL

# Example usage
DEPLOYMENT_URL="https://ghlagencyai.com" npm run test:e2e:smoke
```

### For Application (Required for Web Server)
See `.env` file for:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`
- `JWT_SECRET`
- `OAUTH_SERVER_URL` (Currently missing - needs to be added)

---

## Common Test Patterns

### Pattern: Navigation & Status Check
```typescript
const status = await navigateToPath(page, `${baseUrl}/login`);
expect(status).toBe(200);
```

### Pattern: Text Content Verification
```typescript
const hasLogin = await hasTextContent(page, 'Login');
expect(hasLogin).toBe(true);
```

### Pattern: API Endpoint Testing
```typescript
const { status, data } = await testApiEndpoint(
  page,
  `${baseUrl}/api/health`,
  ['status']  // Expected fields
);
expect(status).toBe(200);
```

### Pattern: Console Error Detection
```typescript
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    console.log('Error:', msg.text());
  }
});
```

### Pattern: Network Monitoring
```typescript
page.on('response', (response) => {
  if (response.status() >= 400) {
    console.log(`${response.status()} ${response.url()}`);
  }
});
```

---

## Test Data

### Test User Accounts
```
Standard User:
  Email: test@example.com
  Password: TestPassword123!

Admin User:
  Email: admin@example.com
  Password: AdminPassword123!
```

### Test Endpoints
```
Homepage:     https://ghlagencyai.com/
Login:        https://ghlagencyai.com/login
Signup:       https://ghlagencyai.com/signup
Dashboard:    https://ghlagencyai.com/dashboard
Pricing:      https://ghlagencyai.com/#pricing

Health:       https://ghlagencyai.com/api/health
Auth Debug:   https://ghlagencyai.com/api/auth/debug
OAuth Config: https://ghlagencyai.com/api/oauth/google/config
```

---

## Debugging

### Debug Mode
```bash
# Interactive debug mode
PWDEBUG=1 npm run test:e2e:smoke

# Then use commands in inspector:
# continue   - Run next step
# step       - Step into action
# next       - Skip next step
```

### Headed Mode
```bash
# See browser during test execution
npx playwright test --headed

# Headed + debug
npx playwright test --headed --debug
```

### Inspect Element
```typescript
// Open inspector before action
await page.pause();
// Then interact with page while paused
```

---

## File Dependencies

### Test File Dependencies
```
auth-flow.spec.ts
├── @playwright/test
└── ../utils/deployment-test-utils.ts

console-errors.spec.ts
├── @playwright/test
└── ../utils/deployment-test-utils.ts

health-check.spec.ts
├── @playwright/test
└── ../utils/deployment-test-utils.ts
```

### Package Dependencies (from package.json)
```json
{
  "@playwright/test": "^1.57.0",
  "playwright": "^1.57.0",
  "playwright-core": "^1.57.0"
}
```

---

## Performance Metrics

### Execution Times (Latest Run)
```
Chromium Only:
  Total: 28.3 seconds
  Per test: ~1.7 seconds average
  Fastest: 1.0 second (OAuth button check)
  Slowest: 14.1 seconds (homepage console errors)

All Browsers (Parallel):
  Total: 1 minute 20 seconds
  With 4 workers: Efficient parallelization
```

### Performance Targets
- Individual test: < 10 seconds (target)
- Smoke suite: < 2 minutes (target)
- Full suite: < 5 minutes (target)

---

## Maintenance

### Regular Tasks
- **Daily:** Monitor flaky tests
- **Weekly:** Review test failures
- **Monthly:** Update selectors if UI changes
- **Quarterly:** Expand coverage

### File Maintenance
- Update test files when UI changes
- Update utilities when adding new test patterns
- Keep package.json dependencies current
- Archive old test results

---

## CI/CD Integration

### GitHub Actions Workflow
**File:** `.github/workflows/e2e-tests.yml` (To be created)

**Triggers:**
- Push to main/develop
- Pull requests
- Manual dispatch

**Steps:**
1. Checkout code
2. Install dependencies
3. Install Playwright browsers
4. Run tests
5. Upload artifacts
6. Publish report

---

## Quick Reference Checklist

### Before Running Tests
- [ ] Verify `DEPLOYMENT_URL` environment variable
- [ ] Check network connectivity
- [ ] Ensure test user accounts exist
- [ ] Review recent test failures
- [ ] Clear old test results

### After Running Tests
- [ ] Review test report (HTML)
- [ ] Check for new failures
- [ ] Note flaky tests
- [ ] Update test documentation if needed
- [ ] Archive failed test artifacts

### For Test Development
- [ ] Check existing utilities first
- [ ] Use data-testid selectors when possible
- [ ] Add meaningful test names
- [ ] Include setup/teardown where needed
- [ ] Test user flows, not implementation

---

## Additional Resources

### Files Referenced in This Guide
- `/playwright.config.ts` - Playwright configuration
- `/package.json` - Dependencies and scripts
- `/tests/e2e/utils/deployment-test-utils.ts` - Test utilities
- `E2E_TEST_EXECUTION_REPORT.md` - Detailed test results
- `E2E_TEST_IMPROVEMENT_GUIDE.md` - Enhancement roadmap
- `E2E_TESTING_QUICK_START.md` - Quick start guide

### External Resources
- [Playwright Documentation](https://playwright.dev)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)
- [API Documentation](https://playwright.dev/docs/api/class-page)
- [GitHub Integration](https://playwright.dev/docs/ci)

---

## Support

For questions about specific test files:
1. Check test file comments
2. Review deployment-test-utils for available helpers
3. Check test execution report for known issues
4. Review improvement guide for planned enhancements

---

**Last Updated:** December 20, 2025
**Total Test Files:** 6 (3 smoke + 3 prelaunch + utils)
**Total Test Cases:** 50+
**Framework:** Playwright 1.57.0
