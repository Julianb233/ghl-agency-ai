# Testing Documentation

This directory contains all testing documentation for the GHL Agency AI platform, including E2E tests and payment tests.

## Quick Access

### E2E Testing
- [E2E_TESTING_INDEX.md](./E2E_TESTING_INDEX.md) - Main index for E2E testing
- [E2E_TESTING_QUICK_START.md](./E2E_TESTING_QUICK_START.md) - Quick start guide for E2E tests
- [E2E_TESTS_FILE_REFERENCE.md](./E2E_TESTS_FILE_REFERENCE.md) - Reference for all E2E test files
- [E2E_TEST_EXECUTION_REPORT.md](./E2E_TEST_EXECUTION_REPORT.md) - Latest E2E test execution results
- [E2E_TEST_IMPROVEMENT_GUIDE.md](./E2E_TEST_IMPROVEMENT_GUIDE.md) - Guide for improving E2E tests

### Payment Testing
- [PAYMENT_TESTING_INDEX.md](./PAYMENT_TESTING_INDEX.md) - Main index for payment testing
- [PAYMENT_TEST_QUICK_START.md](./PAYMENT_TEST_QUICK_START.md) - Quick start guide for payment tests
- [PAYMENT_TEST_ROADMAP.md](./PAYMENT_TEST_ROADMAP.md) - Payment testing roadmap
- [PAYMENT_TESTS_VERIFICATION_REPORT.md](./PAYMENT_TESTS_VERIFICATION_REPORT.md) - Payment test verification results

### Test Reports
- [TESSA_TEST_REPORT_SUMMARY.md](./TESSA_TEST_REPORT_SUMMARY.md) - Tessa's general test report summary
- [TESSA_PAYMENT_TEST_SUMMARY.md](./TESSA_PAYMENT_TEST_SUMMARY.md) - Tessa's payment test summary

## Testing Overview

### E2E Tests
End-to-end tests verify complete user workflows including:
- User authentication flows
- Agent creation and management
- Lead management
- Browser automation
- API integrations

### Payment Tests
Payment tests verify the Stripe integration including:
- Subscription creation
- Payment processing
- Credit system
- Usage tracking
- Billing workflows

## Getting Started

### Run E2E Tests
```bash
# See E2E_TESTING_QUICK_START.md for detailed instructions
npm run test:e2e
```

### Run Payment Tests
```bash
# See PAYMENT_TEST_QUICK_START.md for detailed instructions
npm run test:payment
```

## Test Reports

All test execution reports are maintained in this directory:
- Latest E2E results: [E2E_TEST_EXECUTION_REPORT.md](./E2E_TEST_EXECUTION_REPORT.md)
- Latest payment results: [PAYMENT_TESTS_VERIFICATION_REPORT.md](./PAYMENT_TESTS_VERIFICATION_REPORT.md)

## Related Documentation

- [Development Setup](../DEVELOPMENT_SETUP.md)
- [API Reference](../API_REFERENCE.md)
- [Troubleshooting](../TROUBLESHOOTING.md)

## Contributing

When adding new tests:
1. Follow patterns in existing test files
2. Update the appropriate file reference document
3. Add test descriptions to the relevant index
4. Update this INDEX.md if adding new test categories
