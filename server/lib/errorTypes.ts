/**
 * Error Classification and Recovery Types
 * Provides comprehensive error classification for intelligent recovery
 */

// ========================================
// ERROR TYPES
// ========================================

/**
 * Comprehensive error classification for intelligent handling
 */
export enum ErrorType {
  // Browser/DOM Errors
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  SELECTOR_AMBIGUOUS = 'SELECTOR_AMBIGUOUS',
  ELEMENT_NOT_INTERACTABLE = 'ELEMENT_NOT_INTERACTABLE',
  ELEMENT_STALE = 'ELEMENT_STALE',

  // Timing Errors
  TIMEOUT = 'TIMEOUT',
  PAGE_LOAD_TIMEOUT = 'PAGE_LOAD_TIMEOUT',
  SCRIPT_TIMEOUT = 'SCRIPT_TIMEOUT',

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  DNS_ERROR = 'DNS_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  SSL_ERROR = 'SSL_ERROR',

  // HTTP Errors
  HTTP_4XX = 'HTTP_4XX',
  HTTP_5XX = 'HTTP_5XX',
  RATE_LIMIT = 'RATE_LIMIT',

  // Security/Authentication
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  AUTH_FAILED = 'AUTH_FAILED',
  CAPTCHA = 'CAPTCHA',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Page State
  PAGE_CRASH = 'PAGE_CRASH',
  INVALID_STATE = 'INVALID_STATE',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  CONTENT_MISMATCH = 'CONTENT_MISMATCH',

  // Input/Validation
  INVALID_INPUT = 'INVALID_INPUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Resource
  MEMORY_ERROR = 'MEMORY_ERROR',
  DISK_SPACE_ERROR = 'DISK_SPACE_ERROR',

  // Unknown
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error severity for prioritizing recovery efforts
 */
export enum ErrorSeverity {
  LOW = 'low',           // Can retry with same approach
  MEDIUM = 'medium',     // Need alternative approach
  HIGH = 'high',         // Need user intervention or escalation
  CRITICAL = 'critical', // Fatal, cannot continue
}

/**
 * Recovery strategy types
 */
export enum RecoveryStrategy {
  RETRY_SAME = 'RETRY_SAME',                       // Retry with same parameters
  RETRY_INCREASED_TIMEOUT = 'RETRY_INCREASED_TIMEOUT', // Increase timeout and retry
  RETRY_ALTERNATIVE_SELECTOR = 'RETRY_ALTERNATIVE_SELECTOR', // Try different selector
  RETRY_AFTER_WAIT = 'RETRY_AFTER_WAIT',          // Wait longer before retry
  RETRY_AFTER_REFRESH = 'RETRY_AFTER_REFRESH',    // Refresh page and retry
  RETRY_DIFFERENT_APPROACH = 'RETRY_DIFFERENT_APPROACH', // Use completely different method
  ESCALATE_TO_USER = 'ESCALATE_TO_USER',          // Ask user for help
  SKIP_STEP = 'SKIP_STEP',                        // Skip this step and continue
  ABORT = 'ABORT',                                 // Cannot recover, abort task
}

// ========================================
// ERROR METADATA
// ========================================

/**
 * Metadata for each error type including recovery strategies
 */
export interface ErrorTypeMetadata {
  type: ErrorType;
  severity: ErrorSeverity;
  retryable: boolean;
  defaultStrategies: RecoveryStrategy[];
  maxRetries: number;
  backoffMultiplier: number;
  description: string;
}

/**
 * Error type configurations with recovery strategies
 */
export const ERROR_TYPE_METADATA: Record<ErrorType, ErrorTypeMetadata> = {
  [ErrorType.ELEMENT_NOT_FOUND]: {
    type: ErrorType.ELEMENT_NOT_FOUND,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_AFTER_WAIT,
      RecoveryStrategy.RETRY_ALTERNATIVE_SELECTOR,
      RecoveryStrategy.RETRY_AFTER_REFRESH,
    ],
    maxRetries: 3,
    backoffMultiplier: 1.5,
    description: 'Element could not be found on the page',
  },

  [ErrorType.SELECTOR_AMBIGUOUS]: {
    type: ErrorType.SELECTOR_AMBIGUOUS,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_ALTERNATIVE_SELECTOR,
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 2,
    backoffMultiplier: 1,
    description: 'Multiple elements matched the selector',
  },

  [ErrorType.ELEMENT_NOT_INTERACTABLE]: {
    type: ErrorType.ELEMENT_NOT_INTERACTABLE,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_AFTER_WAIT,
      RecoveryStrategy.RETRY_DIFFERENT_APPROACH,
    ],
    maxRetries: 3,
    backoffMultiplier: 1.5,
    description: 'Element exists but cannot be interacted with',
  },

  [ErrorType.ELEMENT_STALE]: {
    type: ErrorType.ELEMENT_STALE,
    severity: ErrorSeverity.LOW,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_SAME,
      RecoveryStrategy.RETRY_ALTERNATIVE_SELECTOR,
    ],
    maxRetries: 3,
    backoffMultiplier: 1.2,
    description: 'Element reference is stale (page changed)',
  },

  [ErrorType.TIMEOUT]: {
    type: ErrorType.TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_INCREASED_TIMEOUT,
      RecoveryStrategy.RETRY_AFTER_WAIT,
    ],
    maxRetries: 2,
    backoffMultiplier: 2,
    description: 'Operation timed out',
  },

  [ErrorType.PAGE_LOAD_TIMEOUT]: {
    type: ErrorType.PAGE_LOAD_TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_INCREASED_TIMEOUT,
      RecoveryStrategy.RETRY_SAME,
    ],
    maxRetries: 2,
    backoffMultiplier: 2,
    description: 'Page took too long to load',
  },

  [ErrorType.SCRIPT_TIMEOUT]: {
    type: ErrorType.SCRIPT_TIMEOUT,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_INCREASED_TIMEOUT,
      RecoveryStrategy.RETRY_DIFFERENT_APPROACH,
    ],
    maxRetries: 2,
    backoffMultiplier: 2,
    description: 'Script execution timed out',
  },

  [ErrorType.NETWORK_ERROR]: {
    type: ErrorType.NETWORK_ERROR,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_AFTER_WAIT,
      RecoveryStrategy.RETRY_SAME,
    ],
    maxRetries: 3,
    backoffMultiplier: 2,
    description: 'Network connectivity issue',
  },

  [ErrorType.DNS_ERROR]: {
    type: ErrorType.DNS_ERROR,
    severity: ErrorSeverity.HIGH,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_AFTER_WAIT,
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 2,
    backoffMultiplier: 3,
    description: 'DNS resolution failed',
  },

  [ErrorType.CONNECTION_REFUSED]: {
    type: ErrorType.CONNECTION_REFUSED,
    severity: ErrorSeverity.HIGH,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_AFTER_WAIT,
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 2,
    backoffMultiplier: 3,
    description: 'Connection was refused',
  },

  [ErrorType.SSL_ERROR]: {
    type: ErrorType.SSL_ERROR,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    defaultStrategies: [
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 0,
    backoffMultiplier: 1,
    description: 'SSL certificate error',
  },

  [ErrorType.HTTP_4XX]: {
    type: ErrorType.HTTP_4XX,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    defaultStrategies: [
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 0,
    backoffMultiplier: 1,
    description: 'Client error (4xx status)',
  },

  [ErrorType.HTTP_5XX]: {
    type: ErrorType.HTTP_5XX,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_AFTER_WAIT,
      RecoveryStrategy.RETRY_SAME,
    ],
    maxRetries: 3,
    backoffMultiplier: 2,
    description: 'Server error (5xx status)',
  },

  [ErrorType.RATE_LIMIT]: {
    type: ErrorType.RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_AFTER_WAIT,
    ],
    maxRetries: 3,
    backoffMultiplier: 3,
    description: 'Rate limit exceeded',
  },

  [ErrorType.PERMISSION_DENIED]: {
    type: ErrorType.PERMISSION_DENIED,
    severity: ErrorSeverity.CRITICAL,
    retryable: false,
    defaultStrategies: [
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 0,
    backoffMultiplier: 1,
    description: 'Permission denied',
  },

  [ErrorType.AUTH_FAILED]: {
    type: ErrorType.AUTH_FAILED,
    severity: ErrorSeverity.CRITICAL,
    retryable: false,
    defaultStrategies: [
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 0,
    backoffMultiplier: 1,
    description: 'Authentication failed',
  },

  [ErrorType.CAPTCHA]: {
    type: ErrorType.CAPTCHA,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    defaultStrategies: [
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 0,
    backoffMultiplier: 1,
    description: 'CAPTCHA challenge detected',
  },

  [ErrorType.SESSION_EXPIRED]: {
    type: ErrorType.SESSION_EXPIRED,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_DIFFERENT_APPROACH,
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 1,
    backoffMultiplier: 1,
    description: 'Session has expired',
  },

  [ErrorType.PAGE_CRASH]: {
    type: ErrorType.PAGE_CRASH,
    severity: ErrorSeverity.HIGH,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_AFTER_REFRESH,
      RecoveryStrategy.RETRY_SAME,
    ],
    maxRetries: 2,
    backoffMultiplier: 2,
    description: 'Page crashed or became unresponsive',
  },

  [ErrorType.INVALID_STATE]: {
    type: ErrorType.INVALID_STATE,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_AFTER_REFRESH,
      RecoveryStrategy.RETRY_DIFFERENT_APPROACH,
    ],
    maxRetries: 2,
    backoffMultiplier: 1.5,
    description: 'Page is in an unexpected state',
  },

  [ErrorType.NAVIGATION_FAILED]: {
    type: ErrorType.NAVIGATION_FAILED,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_SAME,
      RecoveryStrategy.RETRY_AFTER_WAIT,
    ],
    maxRetries: 3,
    backoffMultiplier: 1.5,
    description: 'Navigation to URL failed',
  },

  [ErrorType.CONTENT_MISMATCH]: {
    type: ErrorType.CONTENT_MISMATCH,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_AFTER_WAIT,
      RecoveryStrategy.RETRY_DIFFERENT_APPROACH,
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 2,
    backoffMultiplier: 1.5,
    description: 'Page content does not match expected',
  },

  [ErrorType.INVALID_INPUT]: {
    type: ErrorType.INVALID_INPUT,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    defaultStrategies: [
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 0,
    backoffMultiplier: 1,
    description: 'Invalid input provided',
  },

  [ErrorType.VALIDATION_ERROR]: {
    type: ErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    defaultStrategies: [
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 0,
    backoffMultiplier: 1,
    description: 'Input validation failed',
  },

  [ErrorType.MEMORY_ERROR]: {
    type: ErrorType.MEMORY_ERROR,
    severity: ErrorSeverity.CRITICAL,
    retryable: false,
    defaultStrategies: [
      RecoveryStrategy.ABORT,
    ],
    maxRetries: 0,
    backoffMultiplier: 1,
    description: 'Out of memory',
  },

  [ErrorType.DISK_SPACE_ERROR]: {
    type: ErrorType.DISK_SPACE_ERROR,
    severity: ErrorSeverity.CRITICAL,
    retryable: false,
    defaultStrategies: [
      RecoveryStrategy.ABORT,
    ],
    maxRetries: 0,
    backoffMultiplier: 1,
    description: 'Insufficient disk space',
  },

  [ErrorType.UNKNOWN]: {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    defaultStrategies: [
      RecoveryStrategy.RETRY_SAME,
      RecoveryStrategy.ESCALATE_TO_USER,
    ],
    maxRetries: 2,
    backoffMultiplier: 2,
    description: 'Unknown error occurred',
  },
};

// ========================================
// ERROR CLASSIFICATION
// ========================================

/**
 * Classify an error based on its message and context
 */
export function classifyError(error: Error | string, context?: Record<string, unknown>): ErrorType {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  // Element errors
  if (lowerMessage.includes('element not found') ||
      lowerMessage.includes('no element') ||
      lowerMessage.includes('could not find element')) {
    return ErrorType.ELEMENT_NOT_FOUND;
  }

  if (lowerMessage.includes('multiple elements') ||
      lowerMessage.includes('ambiguous selector')) {
    return ErrorType.SELECTOR_AMBIGUOUS;
  }

  if (lowerMessage.includes('not interactable') ||
      lowerMessage.includes('element is not visible') ||
      lowerMessage.includes('not clickable')) {
    return ErrorType.ELEMENT_NOT_INTERACTABLE;
  }

  if (lowerMessage.includes('stale element') ||
      lowerMessage.includes('stale reference')) {
    return ErrorType.ELEMENT_STALE;
  }

  // Timeout errors
  if (lowerMessage.includes('page load timeout')) {
    return ErrorType.PAGE_LOAD_TIMEOUT;
  }

  if (lowerMessage.includes('script timeout')) {
    return ErrorType.SCRIPT_TIMEOUT;
  }

  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return ErrorType.TIMEOUT;
  }

  // Network errors
  if (lowerMessage.includes('network') ||
      lowerMessage.includes('fetch failed') ||
      lowerMessage.includes('connection reset')) {
    return ErrorType.NETWORK_ERROR;
  }

  if (lowerMessage.includes('enotfound') ||
      lowerMessage.includes('dns')) {
    return ErrorType.DNS_ERROR;
  }

  if (lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('connection refused')) {
    return ErrorType.CONNECTION_REFUSED;
  }

  if (lowerMessage.includes('ssl') ||
      lowerMessage.includes('certificate')) {
    return ErrorType.SSL_ERROR;
  }

  // HTTP errors
  if (lowerMessage.match(/4\d{2}/) || lowerMessage.includes('client error')) {
    if (lowerMessage.includes('429') || lowerMessage.includes('rate limit')) {
      return ErrorType.RATE_LIMIT;
    }
    return ErrorType.HTTP_4XX;
  }

  if (lowerMessage.match(/5\d{2}/) || lowerMessage.includes('server error')) {
    return ErrorType.HTTP_5XX;
  }

  // Authentication/Security
  if (lowerMessage.includes('permission denied') ||
      lowerMessage.includes('forbidden')) {
    return ErrorType.PERMISSION_DENIED;
  }

  if (lowerMessage.includes('auth') ||
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('login failed')) {
    return ErrorType.AUTH_FAILED;
  }

  if (lowerMessage.includes('captcha') ||
      lowerMessage.includes('recaptcha')) {
    return ErrorType.CAPTCHA;
  }

  if (lowerMessage.includes('session expired') ||
      lowerMessage.includes('session invalid')) {
    return ErrorType.SESSION_EXPIRED;
  }

  // Page state
  if (lowerMessage.includes('page crash') ||
      lowerMessage.includes('page unresponsive')) {
    return ErrorType.PAGE_CRASH;
  }

  if (lowerMessage.includes('invalid state') ||
      lowerMessage.includes('unexpected state')) {
    return ErrorType.INVALID_STATE;
  }

  if (lowerMessage.includes('navigation failed')) {
    return ErrorType.NAVIGATION_FAILED;
  }

  if (lowerMessage.includes('content mismatch') ||
      lowerMessage.includes('unexpected content')) {
    return ErrorType.CONTENT_MISMATCH;
  }

  // Validation
  if (lowerMessage.includes('invalid input')) {
    return ErrorType.INVALID_INPUT;
  }

  if (lowerMessage.includes('validation error') ||
      lowerMessage.includes('validation failed')) {
    return ErrorType.VALIDATION_ERROR;
  }

  // Resource
  if (lowerMessage.includes('out of memory') ||
      lowerMessage.includes('memory limit')) {
    return ErrorType.MEMORY_ERROR;
  }

  if (lowerMessage.includes('disk space') ||
      lowerMessage.includes('enospc')) {
    return ErrorType.DISK_SPACE_ERROR;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get metadata for an error type
 */
export function getErrorMetadata(errorType: ErrorType): ErrorTypeMetadata {
  return ERROR_TYPE_METADATA[errorType];
}

/**
 * Check if an error is retryable
 */
export function isErrorRetryable(errorType: ErrorType): boolean {
  return ERROR_TYPE_METADATA[errorType].retryable;
}

/**
 * Get recommended recovery strategies for an error
 */
export function getRecoveryStrategies(errorType: ErrorType): RecoveryStrategy[] {
  return ERROR_TYPE_METADATA[errorType].defaultStrategies;
}
