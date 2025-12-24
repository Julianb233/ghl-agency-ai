# Payment Processing Test Implementation Roadmap

## Overview
This document outlines the test implementation priorities for the Stripe payment integration and credit system.

## Current Test Status Summary

| Component | Unit Tests | Integration Tests | E2E Tests | Status |
|-----------|-----------|-------------------|-----------|--------|
| Stripe Webhook Handler | ❌ Missing | ❌ Missing | ✅ Basic | 🔴 Critical |
| Credit Service | ❌ Missing | ❌ Missing | ✅ Indirect | 🔴 Critical |
| Credit Router | ❌ Missing | ❌ Missing | ✅ Indirect | 🟡 High |
| Pricing Page | ✅ Exists | ✅ Partial | ✅ Good | 🟢 Good |
| Payment Endpoints | ❌ Missing | ❌ Missing | ✅ Health Check | 🟡 High |

## Sprint 1: Critical Foundation (Week 1-2)

### 1.1 Stripe Webhook Handler Unit Tests
**File:** `server/api/webhooks/stripe.test.ts`
**Priority:** CRITICAL
**Effort:** 16 hours

```typescript
// Test Categories:
- Signature Verification (4 hours)
  ✓ Valid signature should verify event
  ✓ Invalid signature should reject
  ✓ Missing signature should reject
  ✓ Tampered body should fail verification

- Idempotency Checking (3 hours)
  ✓ First event should be processed
  ✓ Duplicate event should be skipped
  ✓ Processed status should be tracked
  ✓ Concurrent duplicates should be handled

- Event Routing (4 hours)
  ✓ checkout.session.completed routes correctly
  ✓ payment_intent.succeeded routes correctly
  ✓ payment_intent.payment_failed routes correctly
  ✓ charge.refunded routes correctly
  ✓ Unknown event types handled gracefully

- Error Handling (3 hours)
  ✓ Missing configuration returns error
  ✓ Database unavailable handled
  ✓ Credit service failures logged
  ✓ Invalid metadata rejected
  ✓ Missing package handled
  ✓ Invalid user ID rejected
```

### 1.2 Stripe Event Test Fixtures
**Location:** `__tests__/fixtures/stripe/`
**Priority:** CRITICAL
**Effort:** 8 hours

```typescript
// Fixtures needed:
✓ checkout.session.completed.json
✓ payment_intent.succeeded.json
✓ payment_intent.payment_failed.json
✓ charge.refunded.json
✓ invalid-signature.json
✓ missing-metadata.json
✓ invalid-package-id.json
✓ fixture-generator.ts (utility)
```

### 1.3 Credit Service Unit Tests
**File:** `server/services/credit.service.test.ts`
**Priority:** CRITICAL
**Effort:** 12 hours

```typescript
// Test Categories:
- addCredits() Method (4 hours)
  ✓ Successfully adds credits
  ✓ Updates balance correctly
  ✓ Creates transaction record
  ✓ Handles database errors
  ✓ Validates input parameters

- deductCredits() Method (4 hours)
  ✓ Successfully deducts credits
  ✓ Updates balance correctly
  ✓ Validates sufficient balance
  ✓ Creates transaction record
  ✓ Handles database errors

- Balance Management (4 hours)
  ✓ getBalance() returns cached value
  ✓ Cache expires correctly
  ✓ getAllBalances() initializes missing types
  ✓ Transaction history paginated
  ✓ Filters work correctly
```

**Total Sprint 1: 36 hours**

## Sprint 2: Integration Testing (Week 3-4)

### 2.1 Payment Flow Integration Tests
**File:** `tests/e2e/payment/payment-flow.spec.ts`
**Priority:** HIGH
**Effort:** 12 hours

```typescript
// Test Scenarios:
- Checkout Session Completion
  ✓ User receives credits after successful payment
  ✓ Credit balance updated immediately
  ✓ Transaction history created
  ✓ Database state is consistent

- Refund Processing
  ✓ Refund event deducts credits
  ✓ User notified of refund
  ✓ Transaction marked as refund
  ✓ Credit balance restored

- Error Recovery
  ✓ Failed payment doesn't award credits
  ✓ Partial failures don't corrupt state
  ✓ Retries work correctly
```

### 2.2 Security Validation Tests
**File:** `server/api/webhooks/stripe.security.test.ts`
**Priority:** HIGH
**Effort:** 8 hours

```typescript
// Security Tests:
- Signature Verification
  ✓ Replay attacks prevented
  ✓ HMAC signature validated
  ✓ Timing attack resistance

- Data Validation
  ✓ Metadata sanitized
  ✓ Input validation strict
  ✓ SQL injection prevented

- Authorization
  ✓ Webhook publicly accessible (required)
  ✓ Database protected
  ✓ Credit operations authorized
```

### 2.3 Error Scenario Tests
**File:** `server/api/webhooks/stripe.error.test.ts`
**Priority:** HIGH
**Effort:** 8 hours

```typescript
// Error Scenarios:
- Missing/Invalid Data
  ✓ Missing userId in metadata
  ✓ Missing packageId in metadata
  ✓ Non-existent user
  ✓ Non-existent package
  ✓ Invalid creditType

- System Failures
  ✓ Database connection fails
  ✓ Stripe API timeout
  ✓ Credit service unavailable
  ✓ Partial transaction failure

- Concurrent Operations
  ✓ Concurrent same event
  ✓ Concurrent different events
  ✓ Race condition handling
```

**Total Sprint 2: 28 hours**

## Sprint 3: Performance & Advanced Testing (Week 5-6)

### 3.1 Load Testing for Webhook
**File:** `tests/load/stripe-webhook.test.js`
**Framework:** K6
**Priority:** MEDIUM
**Effort:** 8 hours

```javascript
// Load Test Scenarios:
- Throughput Test
  ✓ 10 concurrent webhooks
  ✓ 50 concurrent webhooks
  ✓ 100 concurrent webhooks
  ✓ Measure response times

- Stress Test
  ✓ Sustained load 5 minutes
  ✓ Peak load 10 minutes
  ✓ Identify breaking point

- Spike Test
  ✓ Normal load baseline
  ✓ Sudden 10x load
  ✓ Recovery time measurement

- Idempotency Under Load
  ✓ Duplicate events handled
  ✓ No credit duplication
  ✓ Database consistency maintained
```

### 3.2 Credits Router Tests
**File:** `server/api/routers/credits.test.ts`
**Priority:** MEDIUM
**Effort:** 10 hours

```typescript
// Router Tests:
- Credit Queries
  ✓ Get balance endpoint
  ✓ Get all balances endpoint
  ✓ Get transaction history endpoint
  ✓ Pagination works

- Authorization
  ✓ Only user can see own credits
  ✓ Admin can see all credits
  ✓ Unauthenticated requests rejected

- Package Management
  ✓ List credit packages
  ✓ Get package details
  ✓ Package prices correct
  ✓ Availability status
```

### 3.3 End-to-End Scenario Testing
**File:** `tests/e2e/payment/complete-payment-journey.spec.ts`
**Priority:** MEDIUM
**Effort:** 12 hours

```typescript
// Complete Journey Tests:
- User Purchase Journey
  ✓ Browse pricing page
  ✓ Select credit package
  ✓ Initiate checkout
  ✓ Receive credits
  ✓ View transaction history
  ✓ Use credits

- Refund Journey
  ✓ Initiate refund
  ✓ Credits deducted
  ✓ Refund status visible
  ✓ Can repurchase

- Subscription Journey (if applicable)
  ✓ Subscribe to plan
  ✓ View subscription
  ✓ Update subscription
  ✓ Cancel subscription
  ✓ Renewal verification
```

**Total Sprint 3: 30 hours**

## Implementation Checklist

### Phase 1: Setup & Infrastructure
- [ ] Create test directory structure
- [ ] Set up test fixtures directory
- [ ] Create shared test utilities
- [ ] Configure test environment variables
- [ ] Add missing dependencies (if any)

### Phase 2: Webhook Handler Tests
- [ ] Implement signature verification tests
- [ ] Implement idempotency tests
- [ ] Implement event routing tests
- [ ] Implement error handling tests
- [ ] Create webhook event fixtures
- [ ] Implement fixture generators

### Phase 3: Credit Service Tests
- [ ] Test addCredits() method
- [ ] Test deductCredits() method
- [ ] Test getBalance() method
- [ ] Test getAllBalances() method
- [ ] Test transaction history retrieval
- [ ] Test caching behavior

### Phase 4: Integration Testing
- [ ] Implement checkout flow test
- [ ] Implement refund flow test
- [ ] Implement error recovery tests
- [ ] Implement security validation tests
- [ ] Implement concurrent operation tests

### Phase 5: Performance & Advanced
- [ ] Implement K6 load tests
- [ ] Implement credits router tests
- [ ] Implement complete journey tests
- [ ] Document testing procedures
- [ ] Create test data fixtures

## Test Data Management

### Seed Data Required
```sql
-- Test users
INSERT INTO users (id, email, name) VALUES
  (1, 'test@example.com', 'Test User'),
  (2, 'admin@example.com', 'Admin User');

-- Credit packages
INSERT INTO credit_packages (id, name, type, amount, price) VALUES
  (1, 'Starter Enrichment', 'enrichment', 1000, 4900),
  (2, 'Standard Calling', 'calling', 500, 2900),
  (3, 'Pro Scraping', 'scraping', 10000, 9900);

-- Initial credit balances
INSERT INTO user_credits (userId, creditType, balance, totalPurchased, totalUsed) VALUES
  (1, 'enrichment', 0, 0, 0),
  (1, 'calling', 0, 0, 0),
  (1, 'scraping', 0, 0, 0);
```

### Mock Stripe Data
- Test API keys (sk_test_...)
- Webhook signing secrets (whsec_...)
- Test products and prices
- Test customer fixtures

## Continuous Integration Integration

### GitHub Actions Workflow
```yaml
name: Payment Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test -- payment

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:e2e -- payment

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test -- security
```

## Success Criteria

### Unit Test Coverage
- [ ] Stripe webhook handler: >90% coverage
- [ ] Credit service: >85% coverage
- [ ] Credit router: >80% coverage
- [ ] Overall payment module: >85% coverage

### E2E Test Coverage
- [ ] All critical payment paths covered
- [ ] Error scenarios covered
- [ ] Multi-browser validation passing
- [ ] Performance thresholds met

### Reliability Metrics
- [ ] No flaky tests
- [ ] <1 minute test execution time
- [ ] <5 minute total CI time
- [ ] 100% test pass rate

## Timeline

```
Week 1-2:  Sprint 1 - Critical Foundation (36 hours)
Week 3-4:  Sprint 2 - Integration Testing (28 hours)
Week 5-6:  Sprint 3 - Performance & Advanced (30 hours)
Week 7:    Code review, refinement, documentation (16 hours)

Total: ~110 hours over 7 weeks
Or: ~3 sprints at 40 hours/week
```

## Resource Allocation

**Recommended Team:**
- 1 Senior QA Engineer (Lead) - 50% time
- 1 Mid-level QA Engineer - 80% time
- 1 Backend Developer (on-call) - 20% time
- Total: ~2.5 FTE

## Risk Mitigation

### Known Risks
1. **Database Migration Required**
   - Risk: stripe_processed_events table may not exist
   - Mitigation: Verify and apply migration before testing

2. **Stripe Configuration**
   - Risk: Webhook secret not configured in test environment
   - Mitigation: Set up local Stripe CLI before testing

3. **Test Isolation**
   - Risk: Tests may interfere with each other
   - Mitigation: Use database transactions and rollback

4. **Timing Issues**
   - Risk: Cached values may cause flaky tests
   - Mitigation: Clear cache between tests

## Success Metrics After Implementation

| Metric | Current | Target |
|--------|---------|--------|
| Test Coverage (Payment) | 20% | 85%+ |
| Unit Test Count | 0 | 80+ |
| Integration Test Count | 0 | 20+ |
| E2E Test Count | 13 | 25+ |
| Critical Bugs Caught | Unknown | High |
| Confidence Level | Low | High |
| Regression Detection | Manual | Automated |

---

**Next Steps:**
1. Review and approve this roadmap
2. Allocate resources
3. Begin Sprint 1 implementation
4. Schedule weekly review meetings
5. Track progress against timeline
