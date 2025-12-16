/**
 * Failure Recovery Service
 *
 * Intelligent failure analysis and recovery with:
 * - Failure pattern recognition
 * - Root cause analysis
 * - Automatic retry with backoff
 * - Alternative approach generation
 * - Recovery strategy selection
 */

// ========================================
// TYPES
// ========================================

export interface FailureContext {
  executionId: string;
  sessionId: string;
  action: string;
  selector?: string;
  url?: string;
  errorMessage: string;
  errorType: ErrorType;
  timestamp: Date;
  attemptNumber: number;
  previousAttempts: FailureAttempt[];
  pageState?: PageState;
}

export interface FailureAttempt {
  action: string;
  strategy: string;
  error: string;
  timestamp: Date;
  duration: number;
}

export interface PageState {
  url: string;
  title: string;
  hasOverlay?: boolean;
  hasModal?: boolean;
  isLoading?: boolean;
  interactiveElements?: number;
  errorMessages?: string[];
}

export type ErrorType =
  | 'element_not_found'
  | 'element_not_interactable'
  | 'timeout'
  | 'navigation_failed'
  | 'authentication_required'
  | 'captcha_detected'
  | 'rate_limited'
  | 'network_error'
  | 'page_crashed'
  | 'session_expired'
  | 'unknown';

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  applicableErrors: ErrorType[];
  priority: number;
  maxAttempts: number;
  backoffMs: number;
  execute: (context: FailureContext) => Promise<RecoveryResult>;
}

export interface RecoveryResult {
  success: boolean;
  strategyUsed: string;
  newApproach?: {
    action: string;
    selector?: string;
    description: string;
  };
  shouldRetry: boolean;
  waitBeforeRetry?: number;
  fallbackSuggested?: string;
  details: string;
}

export interface FailurePattern {
  pattern: string;
  errorType: ErrorType;
  frequency: number;
  lastSeen: Date;
  successfulRecoveries: string[];
  failedRecoveries: string[];
}

// ========================================
// CONSTANTS
// ========================================

const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RETRY_ATTEMPTS = 3;

// ========================================
// FAILURE RECOVERY SERVICE
// ========================================

class FailureRecoveryService {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private failurePatterns: Map<string, FailurePattern> = new Map();
  private recoveryHistory: Map<string, RecoveryResult[]> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  // ========================================
  // STRATEGY REGISTRATION
  // ========================================

  private registerDefaultStrategies(): void {
    // Element Not Found Strategy
    this.registerStrategy({
      id: 'element_not_found_wait_retry',
      name: 'Wait and Retry',
      description: 'Wait for element to appear then retry',
      applicableErrors: ['element_not_found'],
      priority: 1,
      maxAttempts: 3,
      backoffMs: 2000,
      execute: async (context) => {
        // Strategy: Wait longer, element might be loading
        return {
          success: true,
          strategyUsed: 'element_not_found_wait_retry',
          shouldRetry: true,
          waitBeforeRetry: 2000 * (context.attemptNumber + 1),
          details: 'Waiting for element to appear on page',
        };
      },
    });

    this.registerStrategy({
      id: 'element_not_found_alternative_selector',
      name: 'Alternative Selector',
      description: 'Try finding element with alternative selectors',
      applicableErrors: ['element_not_found', 'element_not_interactable'],
      priority: 2,
      maxAttempts: 3,
      backoffMs: 1000,
      execute: async (context) => {
        const alternatives = this.generateAlternativeSelectors(context.selector);
        return {
          success: true,
          strategyUsed: 'element_not_found_alternative_selector',
          newApproach: {
            action: context.action,
            selector: alternatives[0],
            description: `Try alternative selector: ${alternatives[0]}`,
          },
          shouldRetry: true,
          waitBeforeRetry: 1000,
          details: `Generated ${alternatives.length} alternative selectors`,
        };
      },
    });

    this.registerStrategy({
      id: 'element_not_found_scroll',
      name: 'Scroll and Search',
      description: 'Scroll page to find element',
      applicableErrors: ['element_not_found'],
      priority: 3,
      maxAttempts: 2,
      backoffMs: 1500,
      execute: async (context) => {
        return {
          success: true,
          strategyUsed: 'element_not_found_scroll',
          newApproach: {
            action: 'scroll_and_find',
            selector: context.selector,
            description: 'Scroll page to locate element',
          },
          shouldRetry: true,
          waitBeforeRetry: 1500,
          details: 'Will scroll page to find element',
        };
      },
    });

    // Element Not Interactable Strategy
    this.registerStrategy({
      id: 'not_interactable_dismiss_overlay',
      name: 'Dismiss Overlay',
      description: 'Try to dismiss any overlays blocking interaction',
      applicableErrors: ['element_not_interactable'],
      priority: 1,
      maxAttempts: 2,
      backoffMs: 1000,
      execute: async (context) => {
        return {
          success: true,
          strategyUsed: 'not_interactable_dismiss_overlay',
          newApproach: {
            action: 'dismiss_overlays',
            description: 'Dismiss any modals, popups, or overlays',
          },
          shouldRetry: true,
          waitBeforeRetry: 1000,
          details: 'Attempting to dismiss blocking elements',
        };
      },
    });

    this.registerStrategy({
      id: 'not_interactable_force_click',
      name: 'Force Click',
      description: 'Use JavaScript to force element interaction',
      applicableErrors: ['element_not_interactable'],
      priority: 2,
      maxAttempts: 1,
      backoffMs: 500,
      execute: async (context) => {
        return {
          success: true,
          strategyUsed: 'not_interactable_force_click',
          newApproach: {
            action: 'force_interact',
            selector: context.selector,
            description: 'Force interaction via JavaScript',
          },
          shouldRetry: true,
          waitBeforeRetry: 500,
          details: 'Will attempt force interaction',
        };
      },
    });

    // Timeout Strategy
    this.registerStrategy({
      id: 'timeout_extended_wait',
      name: 'Extended Wait',
      description: 'Extend timeout and retry',
      applicableErrors: ['timeout'],
      priority: 1,
      maxAttempts: 2,
      backoffMs: 5000,
      execute: async (context) => {
        return {
          success: true,
          strategyUsed: 'timeout_extended_wait',
          shouldRetry: true,
          waitBeforeRetry: 5000,
          details: 'Extended timeout for slower network/page',
        };
      },
    });

    this.registerStrategy({
      id: 'timeout_refresh_retry',
      name: 'Refresh and Retry',
      description: 'Refresh page and retry action',
      applicableErrors: ['timeout', 'page_crashed'],
      priority: 2,
      maxAttempts: 1,
      backoffMs: 3000,
      execute: async (context) => {
        return {
          success: true,
          strategyUsed: 'timeout_refresh_retry',
          newApproach: {
            action: 'refresh_and_retry',
            description: 'Refresh page then retry original action',
          },
          shouldRetry: true,
          waitBeforeRetry: 3000,
          details: 'Will refresh page before retry',
        };
      },
    });

    // Navigation Failed Strategy
    this.registerStrategy({
      id: 'navigation_retry_direct',
      name: 'Direct Navigation Retry',
      description: 'Retry navigation with direct URL',
      applicableErrors: ['navigation_failed'],
      priority: 1,
      maxAttempts: 3,
      backoffMs: 2000,
      execute: async (context) => {
        return {
          success: true,
          strategyUsed: 'navigation_retry_direct',
          shouldRetry: true,
          waitBeforeRetry: 2000,
          details: 'Retrying navigation with clean state',
        };
      },
    });

    // Authentication Required Strategy
    this.registerStrategy({
      id: 'auth_required_relogin',
      name: 'Re-authenticate',
      description: 'Attempt to re-authenticate',
      applicableErrors: ['authentication_required', 'session_expired'],
      priority: 1,
      maxAttempts: 1,
      backoffMs: 1000,
      execute: async (context) => {
        return {
          success: true,
          strategyUsed: 'auth_required_relogin',
          newApproach: {
            action: 'reauthenticate',
            description: 'Re-authenticate with stored credentials',
          },
          shouldRetry: true,
          waitBeforeRetry: 1000,
          fallbackSuggested: 'manual_login',
          details: 'Session expired, attempting re-authentication',
        };
      },
    });

    // Captcha Strategy
    this.registerStrategy({
      id: 'captcha_detected_wait',
      name: 'Captcha Wait',
      description: 'Wait for manual captcha resolution or automated service',
      applicableErrors: ['captcha_detected'],
      priority: 1,
      maxAttempts: 1,
      backoffMs: 30000,
      execute: async (context) => {
        return {
          success: false,
          strategyUsed: 'captcha_detected_wait',
          shouldRetry: false,
          fallbackSuggested: 'manual_captcha',
          details: 'Captcha detected - requires human intervention or captcha service',
        };
      },
    });

    // Rate Limited Strategy
    this.registerStrategy({
      id: 'rate_limited_backoff',
      name: 'Rate Limit Backoff',
      description: 'Exponential backoff for rate limiting',
      applicableErrors: ['rate_limited'],
      priority: 1,
      maxAttempts: 5,
      backoffMs: 10000,
      execute: async (context) => {
        const backoff = Math.min(10000 * Math.pow(2, context.attemptNumber), MAX_RETRY_DELAY);
        return {
          success: true,
          strategyUsed: 'rate_limited_backoff',
          shouldRetry: true,
          waitBeforeRetry: backoff,
          details: `Rate limited - backing off for ${backoff}ms`,
        };
      },
    });

    // Network Error Strategy
    this.registerStrategy({
      id: 'network_error_retry',
      name: 'Network Error Retry',
      description: 'Retry after network error',
      applicableErrors: ['network_error'],
      priority: 1,
      maxAttempts: 3,
      backoffMs: 3000,
      execute: async (context) => {
        return {
          success: true,
          strategyUsed: 'network_error_retry',
          shouldRetry: true,
          waitBeforeRetry: 3000 * (context.attemptNumber + 1),
          details: 'Network error detected - will retry with backoff',
        };
      },
    });
  }

  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  // ========================================
  // FAILURE ANALYSIS
  // ========================================

  /**
   * Analyze a failure and determine the error type
   */
  analyzeFailure(error: string, context: Partial<FailureContext>): ErrorType {
    const lowerError = error.toLowerCase();

    // Check for specific error patterns
    if (
      lowerError.includes('element not found') ||
      lowerError.includes('no element') ||
      lowerError.includes('selector') ||
      lowerError.includes('could not find')
    ) {
      return 'element_not_found';
    }

    if (
      lowerError.includes('not interactable') ||
      lowerError.includes('not clickable') ||
      lowerError.includes('obscured') ||
      lowerError.includes('blocked')
    ) {
      return 'element_not_interactable';
    }

    if (
      lowerError.includes('timeout') ||
      lowerError.includes('timed out') ||
      lowerError.includes('exceeded')
    ) {
      return 'timeout';
    }

    if (
      lowerError.includes('navigation') ||
      lowerError.includes('net::err') ||
      lowerError.includes('failed to navigate')
    ) {
      return 'navigation_failed';
    }

    if (
      lowerError.includes('login') ||
      lowerError.includes('authentication') ||
      lowerError.includes('401') ||
      lowerError.includes('unauthorized')
    ) {
      return 'authentication_required';
    }

    if (
      lowerError.includes('captcha') ||
      lowerError.includes('robot') ||
      lowerError.includes('verify you')
    ) {
      return 'captcha_detected';
    }

    if (
      lowerError.includes('rate limit') ||
      lowerError.includes('too many requests') ||
      lowerError.includes('429')
    ) {
      return 'rate_limited';
    }

    if (
      lowerError.includes('network') ||
      lowerError.includes('connection') ||
      lowerError.includes('fetch')
    ) {
      return 'network_error';
    }

    if (
      lowerError.includes('crashed') ||
      lowerError.includes('disconnected') ||
      lowerError.includes('target closed')
    ) {
      return 'page_crashed';
    }

    if (
      lowerError.includes('session') ||
      lowerError.includes('expired') ||
      lowerError.includes('invalid token')
    ) {
      return 'session_expired';
    }

    return 'unknown';
  }

  /**
   * Record a failure pattern for learning
   */
  recordFailurePattern(context: FailureContext): void {
    const patternKey = `${context.errorType}:${context.action}`;
    const existing = this.failurePatterns.get(patternKey);

    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date();
    } else {
      this.failurePatterns.set(patternKey, {
        pattern: patternKey,
        errorType: context.errorType,
        frequency: 1,
        lastSeen: new Date(),
        successfulRecoveries: [],
        failedRecoveries: [],
      });
    }
  }

  // ========================================
  // RECOVERY EXECUTION
  // ========================================

  /**
   * Attempt to recover from a failure
   */
  async recover(context: FailureContext): Promise<RecoveryResult> {
    // Record the failure pattern
    this.recordFailurePattern(context);

    // Get applicable strategies sorted by priority
    const applicableStrategies = this.getApplicableStrategies(context.errorType)
      .sort((a, b) => a.priority - b.priority);

    if (applicableStrategies.length === 0) {
      return {
        success: false,
        strategyUsed: 'none',
        shouldRetry: false,
        details: `No recovery strategies available for error type: ${context.errorType}`,
      };
    }

    // Try strategies until one succeeds or we run out
    for (const strategy of applicableStrategies) {
      // Check if we've exceeded max attempts for this strategy
      const strategyAttempts = context.previousAttempts.filter(
        (a) => a.strategy === strategy.id
      ).length;

      if (strategyAttempts >= strategy.maxAttempts) {
        continue;
      }

      try {
        const result = await strategy.execute(context);

        // Store recovery result
        this.storeRecoveryResult(context.executionId, result);

        // Update pattern with recovery success/failure
        this.updatePatternRecovery(context, strategy.id, result.success);

        if (result.success || result.shouldRetry) {
          return result;
        }
      } catch (error) {
        console.error(`[FailureRecovery] Strategy ${strategy.id} failed:`, error);
      }
    }

    // All strategies exhausted
    return {
      success: false,
      strategyUsed: 'all_exhausted',
      shouldRetry: false,
      details: 'All recovery strategies exhausted',
    };
  }

  private getApplicableStrategies(errorType: ErrorType): RecoveryStrategy[] {
    return Array.from(this.strategies.values()).filter((s) =>
      s.applicableErrors.includes(errorType)
    );
  }

  private updatePatternRecovery(
    context: FailureContext,
    strategyId: string,
    success: boolean
  ): void {
    const patternKey = `${context.errorType}:${context.action}`;
    const pattern = this.failurePatterns.get(patternKey);

    if (pattern) {
      if (success) {
        if (!pattern.successfulRecoveries.includes(strategyId)) {
          pattern.successfulRecoveries.push(strategyId);
        }
      } else {
        if (!pattern.failedRecoveries.includes(strategyId)) {
          pattern.failedRecoveries.push(strategyId);
        }
      }
    }
  }

  // ========================================
  // ALTERNATIVE GENERATION
  // ========================================

  /**
   * Generate alternative selectors for an element
   */
  private generateAlternativeSelectors(originalSelector?: string): string[] {
    if (!originalSelector) return [];

    const alternatives: string[] = [];

    // If it's an ID selector, try class-based
    if (originalSelector.startsWith('#')) {
      const id = originalSelector.slice(1);
      alternatives.push(`[id*="${id}"]`);
      alternatives.push(`[data-testid*="${id}"]`);
    }

    // If it's a class selector, try partial matches
    if (originalSelector.startsWith('.')) {
      const className = originalSelector.slice(1);
      alternatives.push(`[class*="${className}"]`);
    }

    // Try data attributes
    alternatives.push(`[data-cy="${originalSelector.replace(/[#.]/g, '')}"]`);
    alternatives.push(`[data-test="${originalSelector.replace(/[#.]/g, '')}"]`);

    // Try aria labels
    alternatives.push(`[aria-label*="${originalSelector.replace(/[#.]/g, '')}"]`);

    // Try role-based selectors
    alternatives.push(`[role="button"]`);
    alternatives.push(`[role="link"]`);

    return alternatives.filter((a) => a !== originalSelector);
  }

  /**
   * Generate alternative approaches for an action
   */
  generateAlternativeApproaches(
    action: string,
    context: FailureContext
  ): Array<{ action: string; description: string; confidence: number }> {
    const alternatives: Array<{ action: string; description: string; confidence: number }> = [];

    const lowerAction = action.toLowerCase();

    // Click alternatives
    if (lowerAction.includes('click')) {
      alternatives.push({
        action: 'keyboard_enter',
        description: 'Focus element and press Enter key',
        confidence: 0.7,
      });
      alternatives.push({
        action: 'javascript_click',
        description: 'Click using JavaScript directly',
        confidence: 0.6,
      });
      alternatives.push({
        action: 'double_click',
        description: 'Try double-click instead',
        confidence: 0.5,
      });
    }

    // Type alternatives
    if (lowerAction.includes('type') || lowerAction.includes('input')) {
      alternatives.push({
        action: 'clipboard_paste',
        description: 'Paste text from clipboard',
        confidence: 0.7,
      });
      alternatives.push({
        action: 'javascript_value',
        description: 'Set value using JavaScript',
        confidence: 0.6,
      });
    }

    // Navigation alternatives
    if (lowerAction.includes('navigate') || lowerAction.includes('go to')) {
      alternatives.push({
        action: 'direct_url',
        description: 'Navigate directly to URL',
        confidence: 0.8,
      });
      alternatives.push({
        action: 'click_link',
        description: 'Find and click a link to destination',
        confidence: 0.6,
      });
    }

    // Add learned successful strategies
    const patternKey = `${context.errorType}:${action}`;
    const pattern = this.failurePatterns.get(patternKey);

    if (pattern && pattern.successfulRecoveries.length > 0) {
      for (const strategy of pattern.successfulRecoveries) {
        const strategyInfo = this.strategies.get(strategy);
        if (strategyInfo) {
          alternatives.push({
            action: strategy,
            description: `${strategyInfo.name}: ${strategyInfo.description}`,
            confidence: 0.85,
          });
        }
      }
    }

    // Sort by confidence
    return alternatives.sort((a, b) => b.confidence - a.confidence);
  }

  // ========================================
  // RETRY LOGIC
  // ========================================

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attemptNumber: number, baseDelay?: number): number {
    const base = baseDelay || BASE_RETRY_DELAY;
    const delay = Math.min(base * Math.pow(2, attemptNumber), MAX_RETRY_DELAY);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Math.round(delay + jitter);
  }

  /**
   * Determine if we should continue retrying
   */
  shouldRetry(context: FailureContext): boolean {
    // Don't retry after too many attempts
    if (context.attemptNumber >= MAX_RETRY_ATTEMPTS) {
      return false;
    }

    // Don't retry certain errors
    const nonRetryableErrors: ErrorType[] = ['captcha_detected'];
    if (nonRetryableErrors.includes(context.errorType)) {
      return false;
    }

    // Check if we've exhausted all strategies
    const applicableStrategies = this.getApplicableStrategies(context.errorType);
    const totalStrategyAttempts = applicableStrategies.reduce((sum, strategy) => {
      return sum + strategy.maxAttempts;
    }, 0);

    return context.attemptNumber < totalStrategyAttempts;
  }

  // ========================================
  // HISTORY & ANALYTICS
  // ========================================

  private storeRecoveryResult(executionId: string, result: RecoveryResult): void {
    if (!this.recoveryHistory.has(executionId)) {
      this.recoveryHistory.set(executionId, []);
    }
    this.recoveryHistory.get(executionId)!.push(result);
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    totalRecoveries: number;
    successfulRecoveries: number;
    successRate: number;
    mostCommonErrors: Array<{ type: ErrorType; count: number }>;
    mostEffectiveStrategies: Array<{ id: string; successRate: number }>;
  } {
    let totalRecoveries = 0;
    let successfulRecoveries = 0;

    for (const results of Array.from(this.recoveryHistory.values())) {
      for (const result of results) {
        totalRecoveries++;
        if (result.success) {
          successfulRecoveries++;
        }
      }
    }

    // Calculate most common errors
    const errorCounts = new Map<ErrorType, number>();
    for (const pattern of Array.from(this.failurePatterns.values())) {
      errorCounts.set(pattern.errorType, (errorCounts.get(pattern.errorType) || 0) + pattern.frequency);
    }

    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate most effective strategies
    const strategySuccess = new Map<string, { success: number; total: number }>();
    for (const pattern of Array.from(this.failurePatterns.values())) {
      for (const strategy of pattern.successfulRecoveries) {
        const stats = strategySuccess.get(strategy) || { success: 0, total: 0 };
        stats.success++;
        stats.total++;
        strategySuccess.set(strategy, stats);
      }
      for (const strategy of pattern.failedRecoveries) {
        const stats = strategySuccess.get(strategy) || { success: 0, total: 0 };
        stats.total++;
        strategySuccess.set(strategy, stats);
      }
    }

    const mostEffectiveStrategies = Array.from(strategySuccess.entries())
      .map(([id, stats]) => ({
        id,
        successRate: stats.total > 0 ? stats.success / stats.total : 0,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    return {
      totalRecoveries,
      successfulRecoveries,
      successRate: totalRecoveries > 0 ? successfulRecoveries / totalRecoveries : 0,
      mostCommonErrors,
      mostEffectiveStrategies,
    };
  }

  /**
   * Clean up resources
   */
  cleanup(executionId?: string): void {
    if (executionId) {
      this.recoveryHistory.delete(executionId);
    } else {
      this.recoveryHistory.clear();
    }
  }
}

// Export singleton instance
export const failureRecoveryService = new FailureRecoveryService();

// Export factory function for testing
export function createFailureRecoveryService(): FailureRecoveryService {
  return new FailureRecoveryService();
}
