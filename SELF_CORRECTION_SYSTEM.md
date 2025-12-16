# Self-Correction & Intelligence System

## Overview

This document describes the self-correction and intelligence system for the GHL Agency AI browser agent. Inspired by ChatGPT Operator and Manus AI, this system enables the agent to:

- **Self-heal** when actions fail
- **Analyze failures** to understand root causes
- **Generate alternatives** using AI
- **Learn from successes** for future recovery
- **Escalate intelligently** when all options are exhausted

## Architecture

### Components

1. **Error Classification** (`server/lib/errorTypes.ts`)
   - 25+ error types with specific recovery strategies
   - Error severity levels (LOW, MEDIUM, HIGH, CRITICAL)
   - Error-specific retry configurations

2. **Self-Correction Service** (`server/services/browser/selfCorrection.service.ts`)
   - AI-powered failure analysis
   - Alternative action generation
   - Recovery pattern learning
   - Success tracking

3. **Confidence Scoring** (`server/services/agentConfidence.service.ts`)
   - Multi-factor confidence scoring
   - Historical success tracking
   - Low-confidence detection
   - Intelligent escalation

4. **Multi-Strategy Planning** (`server/services/agentStrategy.service.ts`)
   - Generate multiple execution paths
   - Evaluate strategies before execution
   - Fallback strategy selection
   - Risk/time trade-off analysis

5. **Enhanced Retry Logic** (`server/lib/retry.ts`)
   - Context-aware retry decisions
   - Error-type-specific backoff
   - Intelligent retry limits

6. **Agent Orchestrator Integration** (`server/services/agentOrchestrator.service.ts`)
   - Automatic self-correction on browser tool failures
   - Recovery attempt tracking
   - SSE events for user visibility

## How It Works

### 1. Error Detection & Classification

When a browser action fails:

```typescript
Error: Element not found

→ Classified as: ErrorType.ELEMENT_NOT_FOUND
→ Severity: MEDIUM
→ Retryable: true
→ Max Retries: 3
→ Strategies: [
    RETRY_AFTER_WAIT,
    RETRY_ALTERNATIVE_SELECTOR,
    RETRY_AFTER_REFRESH
  ]
```

### 2. Failure Analysis (AI-Powered)

The self-correction service uses Claude to analyze the failure:

```typescript
const analysis = await selfCorrection.analyzeFailure(
  'browser_act',
  'Element not found: login button',
  {
    parameters: { instruction: 'click the login button' },
    attemptNumber: 1,
    previousAttempts: [],
    pageState: { url: 'https://app.gohighlevel.com/login' }
  }
);

// Returns:
{
  rootCause: "Selector too generic - multiple buttons may exist",
  alternatives: [
    {
      strategy: "RETRY_ALTERNATIVE_SELECTOR",
      description: "Try more specific selector",
      actionType: "browser_act",
      parameters: {
        instruction: "click the login button with class 'btn-primary'"
      },
      confidence: 0.8,
      estimatedSuccessProbability: 0.75
    },
    {
      strategy: "RETRY_AFTER_WAIT",
      description: "Wait for page to fully load",
      actionType: "browser_wait",
      parameters: { type: "timeout", value: 2000 },
      confidence: 0.6,
      estimatedSuccessProbability: 0.5
    }
  ],
  shouldRetry: true,
  shouldEscalate: false,
  confidence: 0.85
}
```

### 3. Alternative Execution

The orchestrator tries each alternative until one succeeds:

```typescript
// Try alternative 1: More specific selector
✓ Success! Element found and clicked

// Record success for learning
selfCorrection.recordSuccess(
  ErrorType.ELEMENT_NOT_FOUND,
  'browser_act',
  RecoveryStrategy.RETRY_ALTERNATIVE_SELECTOR,
  'browser_act'
);

// Future failures of this type will prioritize this strategy
```

### 4. Learning & Adaptation

The system learns from successful recoveries:

```typescript
// After multiple recoveries using RETRY_ALTERNATIVE_SELECTOR
getRecoveryStats();

// Returns:
{
  totalRecoveries: 47,
  byErrorType: {
    ELEMENT_NOT_FOUND: 25,
    TIMEOUT: 15,
    ELEMENT_NOT_INTERACTABLE: 7
  },
  byStrategy: {
    RETRY_ALTERNATIVE_SELECTOR: 18,
    RETRY_AFTER_WAIT: 12,
    RETRY_AFTER_REFRESH: 10,
    ESCALATE_TO_USER: 7
  }
}
```

### 5. Escalation

When all alternatives fail or confidence is too low:

```typescript
if (analysis.shouldEscalate || confidence < 0.6) {
  // Ask user for guidance
  await executeTool('ask_user', {
    question: "I'm having trouble clicking the login button. Can you help?",
    context: "Tried 3 different approaches, all failed"
  });
}
```

## Error Type Catalog

### Browser/DOM Errors

| Error Type | Severity | Max Retries | Recovery Strategies |
|------------|----------|-------------|---------------------|
| `ELEMENT_NOT_FOUND` | MEDIUM | 3 | Wait, Alternative Selector, Refresh |
| `ELEMENT_NOT_INTERACTABLE` | MEDIUM | 3 | Wait, Different Approach |
| `SELECTOR_AMBIGUOUS` | MEDIUM | 2 | Alternative Selector, Ask User |
| `ELEMENT_STALE` | LOW | 3 | Retry Same, Alternative Selector |

### Timing Errors

| Error Type | Severity | Max Retries | Recovery Strategies |
|------------|----------|-------------|---------------------|
| `TIMEOUT` | MEDIUM | 2 | Increased Timeout, Wait |
| `PAGE_LOAD_TIMEOUT` | MEDIUM | 2 | Increased Timeout, Retry |
| `SCRIPT_TIMEOUT` | MEDIUM | 2 | Increased Timeout, Different Approach |

### Network Errors

| Error Type | Severity | Max Retries | Recovery Strategies |
|------------|----------|-------------|---------------------|
| `NETWORK_ERROR` | MEDIUM | 3 | Wait, Retry |
| `DNS_ERROR` | HIGH | 2 | Wait, Escalate |
| `CONNECTION_REFUSED` | HIGH | 2 | Wait, Escalate |
| `HTTP_5XX` | MEDIUM | 3 | Wait, Retry |
| `RATE_LIMIT` | MEDIUM | 3 | Wait (exponential) |

### Security/Authentication

| Error Type | Severity | Max Retries | Recovery Strategies |
|------------|----------|-------------|---------------------|
| `AUTH_FAILED` | CRITICAL | 0 | Escalate to User |
| `CAPTCHA` | HIGH | 0 | Escalate to User |
| `SESSION_EXPIRED` | MEDIUM | 1 | Different Approach, Escalate |
| `PERMISSION_DENIED` | CRITICAL | 0 | Escalate to User |

## Confidence Scoring

The system scores decisions on multiple factors:

### Factors (0-1 scale)

1. **Selector Clarity** (25% weight)
   - ID selectors: +0.3
   - Class selectors: +0.2
   - Generic terms: -0.2

2. **Action Feasibility** (25% weight)
   - Page state matches: +0.2
   - Elements observed: +0.2
   - URL mismatch: -0.3

3. **Context Relevance** (20% weight)
   - Action aligns with task: +0.3
   - In correct phase: +0.2

4. **Historical Success** (15% weight)
   - Previous success rate for this action

5. **Data Availability** (15% weight)
   - All required parameters present

### Thresholds

- **High Confidence (≥ 0.8)**: Execute without hesitation
- **Medium Confidence (0.6-0.8)**: Execute but monitor closely
- **Low Confidence (0.4-0.6)**: Consider asking user
- **Very Low (< 0.4)**: Definitely ask user

## Multi-Strategy Planning

### Strategy Types

1. **Conservative Strategy**
   - Risk: LOW
   - Speed: SLOW
   - Success Probability: HIGH (0.85+)
   - Approach: Step-by-step with verification

2. **Balanced Strategy**
   - Risk: MEDIUM
   - Speed: MEDIUM
   - Success Probability: MEDIUM (0.70+)
   - Approach: Direct with some safeguards

3. **Aggressive Strategy**
   - Risk: HIGH
   - Speed: FAST
   - Success Probability: MEDIUM (0.60+)
   - Approach: Fast and direct

### Strategy Evaluation

Strategies are scored on:

- **Success Probability** (35%)
- **Risk Alignment** (25%)
- **Time Alignment** (15%)
- **Completeness** (15%)
- **Error Handling** (10%)

Best strategy is automatically selected based on constraints.

## Usage Examples

### Example 1: Simple Action Failure

```typescript
// Action fails
await executeTool('browser_act', {
  sessionId: 'abc123',
  instruction: 'click submit'
});
// Error: Element not found

// Self-correction kicks in
// 1. Analyze: "Too vague, multiple submit buttons may exist"
// 2. Try: "click the submit button at the bottom"
// 3. Success!
// 4. Learn: Store this pattern for future
```

### Example 2: Multiple Failures with Escalation

```typescript
// Attempt 1: Original action fails
// Attempt 2: Try alternative selector - fails
// Attempt 3: Try waiting - fails
// Attempt 4: Try page refresh - fails

// Escalate to user
await executeTool('ask_user', {
  question: "I'm having trouble submitting the form. Can you verify the page is correct?",
  context: "Tried 4 different approaches"
});
```

### Example 3: Learning from Success

```typescript
// First time encountering CAPTCHA
// → Escalates to user
// → User solves CAPTCHA
// → Agent continues

// Second time encountering CAPTCHA
// → Remembers to escalate immediately
// → No wasted retry attempts
```

## API Reference

### SelfCorrectionService

```typescript
// Analyze a failure
const analysis = await selfCorrection.analyzeFailure(
  action: string,
  error: string | Error,
  context: FailureContext
): Promise<FailureAnalysis>

// Record a successful recovery
selfCorrection.recordSuccess(
  originalError: ErrorType,
  originalAction: string,
  successfulStrategy: RecoveryStrategy,
  successfulAction: string,
  context?: Record<string, unknown>
): void

// Get recovery statistics
const stats = selfCorrection.getRecoveryStats(): {
  totalRecoveries: number;
  byErrorType: Record<string, number>;
  byStrategy: Record<string, number>;
}
```

### ConfidenceService

```typescript
// Score a decision
const decision = await confidence.scoreDecision(
  action: string,
  parameters: Record<string, unknown>,
  context: ConfidenceContext
): Promise<ActionDecision>

// Record outcome
confidence.recordOutcome(action: string, success: boolean): void

// Get statistics
const stats = confidence.getStats(): {
  actionsTracked: number;
  averageSuccessRate: number;
  topActions: Array<{ action: string; successRate: number }>;
}
```

### StrategyService

```typescript
// Generate strategies
const strategies = await strategy.generateStrategies(
  context: StrategyContext,
  count?: number
): Promise<ExecutionStrategy[]>

// Evaluate strategies
const evaluations = await strategy.evaluateStrategies(
  strategies: ExecutionStrategy[],
  context: StrategyContext
): Promise<StrategyEvaluation[]>

// Select best
const best = strategy.selectBestStrategy(
  evaluations: StrategyEvaluation[]
): ExecutionStrategy
```

## Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-xxx

# Optional
MAX_RECOVERY_ATTEMPTS=3  # Default: 3
```

### Tuning Parameters

Edit these constants in the services:

```typescript
// Self-correction
const MAX_RECOVERY_ATTEMPTS = 3;

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4,
};

// Retry configuration
const DEFAULT_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};
```

## Performance Metrics

The self-correction system tracks:

1. **Recovery Success Rate**: % of failures that self-heal
2. **Average Attempts to Success**: How many tries before success
3. **Most Effective Strategies**: Which recovery methods work best
4. **Escalation Rate**: How often we need user help
5. **Confidence Accuracy**: Do high-confidence actions succeed more?

## Best Practices

### For Developers

1. **Use Specific Instructions**: Better selectors = higher confidence
   ```typescript
   ✓ "click the blue 'Sign In' button in the header"
   ✗ "click sign in"
   ```

2. **Provide Context**: Help the agent understand the task
   ```typescript
   context: {
     taskDescription: "Login to GHL account",
     currentPhase: "Authentication"
   }
   ```

3. **Monitor Recovery Patterns**: Check stats regularly
   ```typescript
   const stats = selfCorrection.getRecoveryStats();
   console.log('Top strategies:', stats.byStrategy);
   ```

### For End Users

1. **Clear Task Descriptions**: Be specific about what you want
2. **Respond to Escalations**: Help the agent when it asks
3. **Provide Feedback**: Let us know if recovery patterns are wrong

## Future Enhancements

1. **Dynamic Replanning**: Replan entire task when stuck
2. **Multi-Agent Collaboration**: Ask other agents for help
3. **User Preference Learning**: Remember how users prefer to handle errors
4. **Visual Debugging**: Screenshot diff analysis
5. **Simulation Mode**: Test recovery without executing

## Troubleshooting

### High Escalation Rate

If agent escalates too often:
- Lower confidence thresholds
- Add more error patterns to classification
- Provide more specific instructions

### Recovery Loops

If agent retries endlessly:
- Check MAX_RECOVERY_ATTEMPTS setting
- Verify error classification is correct
- Add circuit breakers for specific error types

### Poor Recovery Success

If recoveries fail often:
- Review alternative generation prompts
- Check if page structure changed
- Verify browser tools are working correctly

## Contributing

When adding new error types:

1. Add to `ErrorType` enum in `errorTypes.ts`
2. Define metadata in `ERROR_TYPE_METADATA`
3. Add classification pattern in `classifyError()`
4. Test recovery strategies
5. Update this documentation

## License

Copyright (c) 2025 GHL Agency AI. All rights reserved.
