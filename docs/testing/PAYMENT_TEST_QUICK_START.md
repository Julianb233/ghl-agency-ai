# Payment Testing Quick Start Guide

## TL;DR

**Status:** Payment system has strong security but lacks test coverage
**Action Required:** Add unit and integration tests
**Timeline:** ~6 weeks for complete coverage
**Priority:** CRITICAL - Start immediately

## Current State

### What Works
- ✅ Stripe webhook handler (secure, modern)
- ✅ E2E payment endpoint tests (14 tests)
- ✅ Credit service architecture
- ✅ Security validation

### What's Missing
- ❌ Unit tests for webhook logic
- ❌ Integration tests for payment flow
- ❌ Test fixtures
- ❌ Security regression tests
- ❌ Performance tests

### Critical Issue
- 🔴 Deprecated insecure endpoint exists: `/server/api/routers/stripe-webhook.ts`
- **ACTION:** Remove this file immediately!

## Test Files Location

```
Project Root: /root/github-repos/ghl-agency-ai/

Test Files:
├── tests/
│   ├── e2e/
│   │   ├── prelaunch/
│   │   │   └── payment.spec.ts (14 E2E tests ✅)
│   │   └── utils/
│   │       └── deployment-test-utils.ts
│   └── load/
│       ├── api-smoke.test.js
│       ├── api-load.test.js
│       ├── api-stress.test.js
│       └── api-spike.test.js
│
├── server/
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── stripe.ts (✅ Good - Keep)
│   │   └── routers/
│   │       └── stripe-webhook.ts (❌ Bad - Delete)
│   └── services/
│       └── credit.service.ts
│
├── playwright.config.ts ✅
├── vitest.config.ts ✅
└── package.json (contains test scripts)

Generated Documents:
├── PAYMENT_TESTS_VERIFICATION_REPORT.md (detailed analysis)
├── PAYMENT_TEST_ROADMAP.md (implementation plan)
├── TESSA_PAYMENT_TEST_SUMMARY.md (executive summary)
└── PAYMENT_TEST_QUICK_START.md (this file)
```

## Running Current Tests

```bash
# Run all unit tests
npm run test

# Run all E2E tests
npm run test:e2e

# Run E2E tests only (payment)
npm run test:e2e -- payment.spec.ts

# View HTML report
npm run test:e2e:report

# Interactive E2E testing
npm run test:e2e:ui

# Load testing
npm run test:load
npm run test:load:stress
npm run test:load:spike
npm run test:load:smoke
```

## Test Configuration

### Playwright Config
- File: `playwright.config.ts`
- Browsers: Chrome, Firefox, Safari
- Timeout: 60 seconds
- Retries: 2 (in CI)
- Reports: HTML, JSON, JUnit XML

### Vitest Config
- File: `vitest.config.ts`
- Framework: Vitest
- For unit and integration tests

## Current Test Results

```
E2E Tests:     14/14 passing ✅
Total Tests:   1,422 passed, 273 failed
Duration:      93.95 seconds
Test Files:    22 passed, 25 failed
```

## Key Files to Understand

### 1. Webhook Handler (Secure - Good)
**File:** `/server/api/webhooks/stripe.ts`
- ✅ Signature verification with raw body
- ✅ Idempotency checking
- ✅ Event routing
- ✅ Error handling

### 2. Deprecated Endpoint (Insecure - DELETE)
**File:** `/server/api/routers/stripe-webhook.ts`
- ❌ No signature verification
- ❌ No idempotency checking
- ❌ Publicly accessible
- 🔴 REMOVE IMMEDIATELY

### 3. Credit Service
**File:** `/server/services/credit.service.ts`
- Manages credit balances
- Tracks transactions
- Supports 3 credit types

### 4. E2E Tests
**File:** `/tests/e2e/prelaunch/payment.spec.ts`
- 14 tests all passing
- Tests pricing page, endpoints, security

## Environment Variables

```bash
# Required for payment testing
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=<32-byte hex>
```

## Local Testing Setup

### Option 1: Use Stripe CLI (Recommended)
```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy webhook secret and add to .env
# STRIPE_WEBHOOK_SECRET=whsec_...

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger charge.refunded
```

### Option 2: Use Stripe Test Mode
1. Create Stripe test account
2. Get test API keys
3. Copy to .env
4. Use Stripe Dashboard to create test events

## Immediate Action Items

### TODAY
- [ ] Read PAYMENT_TESTS_VERIFICATION_REPORT.md
- [ ] Review webhook handler code (`/server/api/webhooks/stripe.ts`)
- [ ] Check for uses of deprecated endpoint
- [ ] Verify `STRIPE_WEBHOOK_SECRET` is configured

### THIS WEEK
- [ ] Delete deprecated `/server/api/routers/stripe-webhook.ts`
- [ ] Verify idempotency table exists in database
- [ ] Set up local Stripe CLI testing
- [ ] Create test directory structure

### NEXT 2 WEEKS (Priority 1)
- [ ] Add unit tests for webhook handler (16 hours)
- [ ] Create Stripe event fixtures (8 hours)
- [ ] Add credit service tests (12 hours)
- [ ] Total: ~36 hours

### FOLLOWING 2 WEEKS (Priority 2)
- [ ] Integration tests (20 hours)
- [ ] Security tests (8 hours)
- [ ] Performance tests (8 hours)
- [ ] Total: ~36 hours

## Testing Priorities

### 1. CRITICAL (Do First)
```
✓ Remove deprecated endpoint
✓ Unit tests for webhook handler
✓ Credit service tests
✓ Create test fixtures
```

### 2. HIGH (Do Soon)
```
✓ Integration tests for payment flow
✓ Refund processing tests
✓ Security validation tests
✓ Error scenario tests
```

### 3. MEDIUM (Nice to Have)
```
✓ Performance/load tests
✓ Advanced scenario tests
✓ Router unit tests
✓ Complete journey E2E tests
```

## Success Criteria

After implementation, you should have:
- [ ] >85% code coverage for payment module
- [ ] 100+ automated tests
- [ ] All tests pass on every commit
- [ ] <5 second webhook response time
- [ ] Zero critical payment bugs
- [ ] Team can confidently refactor payment code
- [ ] New developers can understand system in <2 hours

## Common Issues & Solutions

### Issue: STRIPE_WEBHOOK_SECRET not found
```bash
# Solution: Get from Stripe Dashboard or Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy displayed webhook signing secret

# Add to .env file
echo "STRIPE_WEBHOOK_SECRET=whsec_..." >> .env
```

### Issue: stripe_processed_events table not found
```bash
# Solution: Check if migration exists and apply it
# Look for: drizzle/migrations/add-stripe-idempotency.sql
npm run db:migrate
```

### Issue: Webhook tests failing with signature errors
```bash
# Solution: Ensure raw body parsing is working
# Check: /server/api/webhooks/stripe.ts uses raw({ type: "application/json" })
# Middleware order matters - raw parser must be FIRST
```

### Issue: Tests timing out
```bash
# Solution: Increase timeout in playwright.config.ts
timeout: 60 * 1000,  // Increase if needed
expect: {
  timeout: 10 * 1000,  // Increase if needed
}
```

## Testing Patterns

### Unit Test Pattern
```typescript
// server/api/webhooks/stripe.test.ts
describe('Stripe Webhook Handler', () => {
  it('should verify valid signatures', async () => {
    const event = generateMockEvent();
    const signature = generateValidSignature(event);

    const result = await handleWebhook(event, signature);

    expect(result.received).toBe(true);
  });
});
```

### Integration Test Pattern
```typescript
// tests/e2e/payment/payment-flow.spec.ts
test('complete payment flow', async ({ page }) => {
  // 1. Checkout
  await page.goto('/pricing');
  await page.click('button:has-text("Purchase")');

  // 2. Verify webhook processed
  await verifyWebhookProcessed(sessionId);

  // 3. Check credits awarded
  const credits = await getCreditBalance(userId);
  expect(credits.enrichment).toBeGreaterThan(0);
});
```

### Fixture Pattern
```typescript
// __tests__/fixtures/stripe/events.ts
export const mockCheckoutSessionCompleted = {
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_123',
      metadata: {
        userId: '1',
        packageId: '1',
        creditType: 'enrichment',
        creditAmount: '1000'
      }
    }
  }
};
```

## Documentation References

### Generated Documents
1. **PAYMENT_TESTS_VERIFICATION_REPORT.md** - Detailed technical analysis
2. **PAYMENT_TEST_ROADMAP.md** - Sprint-by-sprint implementation plan
3. **TESSA_PAYMENT_TEST_SUMMARY.md** - Executive summary
4. **PAYMENT_TEST_QUICK_START.md** - This file

### External Resources
- [Stripe Webhooks Docs](https://stripe.com/docs/webhooks)
- [Playwright Testing](https://playwright.dev/)
- [Vitest Unit Testing](https://vitest.dev/)
- [Stripe Signature Verification](https://stripe.com/docs/webhooks/signatures)

## Team Communication

### Daily Standup Template
```
Payment Testing Initiative Update:

Completed:
- [ ] Task description

In Progress:
- [ ] Task description

Blocked:
- [ ] Task description (reason)

Today's Plan:
- [ ] Task description
```

### Weekly Review Checklist
- [ ] Test coverage increased?
- [ ] New tests passing?
- [ ] Any blocker issues?
- [ ] On schedule?
- [ ] Team needs help?

## Quick Stats

```
Current E2E Tests:           14 (all passing ✅)
Estimated Unit Tests Needed: ~80
Estimated Integration Tests: ~20
Estimated Performance Tests: ~5
Estimated Security Tests:    ~10

Total Tests Needed: ~115 additional tests

Lines of Test Code: ~4,000-5,000
Effort: ~90-110 hours
Timeline: ~6 weeks at 15 hours/week
Team: 1.5-2 FTE
```

## Next Steps

1. **Read the full reports** (30 minutes)
   - PAYMENT_TESTS_VERIFICATION_REPORT.md
   - PAYMENT_TEST_ROADMAP.md

2. **Remove deprecated code** (1 hour)
   - Delete `/server/api/routers/stripe-webhook.ts`
   - Verify no references exist

3. **Verify infrastructure** (2 hours)
   - Check `stripe_processed_events` table
   - Set up Stripe CLI locally
   - Test webhook forwarding

4. **Plan Sprint 1** (2 hours)
   - Assign team members
   - Create test directory structure
   - Schedule daily standups

5. **Start implementation** (ongoing)
   - Follow PAYMENT_TEST_ROADMAP.md
   - Track progress
   - Weekly reviews

## Questions?

Refer to the detailed reports for:
- **Architecture questions** → PAYMENT_TESTS_VERIFICATION_REPORT.md
- **Implementation questions** → PAYMENT_TEST_ROADMAP.md
- **High-level overview** → TESSA_PAYMENT_TEST_SUMMARY.md
- **Quick answers** → This file

---

**Status:** Ready for Implementation
**Effort:** ~90-110 hours
**Timeline:** ~6 weeks
**Priority:** CRITICAL
**Start Date:** ASAP (after removing deprecated code)

**Key Rule:** Don't skip the unit tests! They're the foundation for everything else.
