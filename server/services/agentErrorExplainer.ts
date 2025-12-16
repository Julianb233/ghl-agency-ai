/**
 * Agent Error Explainer Service
 *
 * Converts technical errors into user-friendly, actionable error messages.
 * Provides context, likely causes, and suggested actions.
 */

export interface ExplainedError {
  title: string;
  explanation: string;
  likelyCauses: string[];
  suggestedActions: string[];
  technicalDetails: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

/**
 * Error pattern matchers
 */
const ERROR_PATTERNS = [
  {
    pattern: /session.*not.*found/i,
    explain: (error: string): ExplainedError => ({
      title: 'Browser Session Not Found',
      explanation: 'The browser session you were using has expired or was closed.',
      likelyCauses: [
        'Session timed out due to inactivity',
        'Session was manually closed',
        'Connection to browser was lost',
      ],
      suggestedActions: [
        'Create a new browser session',
        'Retry the operation',
        'Check your internet connection',
      ],
      technicalDetails: error,
      severity: 'medium',
      recoverable: true,
    }),
  },
  {
    pattern: /timeout|timed out/i,
    explain: (error: string): ExplainedError => ({
      title: 'Operation Timed Out',
      explanation: 'The operation took longer than expected and was cancelled.',
      likelyCauses: [
        'Page is loading slowly',
        'Network connection is slow',
        'Element is taking too long to appear',
        'Website is unresponsive',
      ],
      suggestedActions: [
        'Increase the timeout duration',
        'Check if the website is accessible',
        'Wait and retry the operation',
        'Verify your network connection',
      ],
      technicalDetails: error,
      severity: 'medium',
      recoverable: true,
    }),
  },
  {
    pattern: /element.*not.*found|selector.*not.*found/i,
    explain: (error: string): ExplainedError => ({
      title: 'Element Not Found on Page',
      explanation: 'The agent could not find the expected element on the webpage.',
      likelyCauses: [
        'Page structure has changed',
        'Element is hidden or not yet loaded',
        'Wrong page was loaded',
        'Element selector is incorrect',
      ],
      suggestedActions: [
        'Verify you are on the correct page',
        'Wait for the page to fully load',
        'Check if the website layout has changed',
        'Inspect the page manually',
      ],
      technicalDetails: error,
      severity: 'high',
      recoverable: true,
    }),
  },
  {
    pattern: /navigation.*failed|page.*not.*loaded/i,
    explain: (error: string): ExplainedError => ({
      title: 'Navigation Failed',
      explanation: 'The agent could not navigate to the requested page.',
      likelyCauses: [
        'URL is incorrect or inaccessible',
        'Network connection issues',
        'Website is down',
        'Page requires authentication',
      ],
      suggestedActions: [
        'Verify the URL is correct',
        'Check if the website is accessible in your browser',
        'Ensure you have proper authentication',
        'Try accessing the page from a different network',
      ],
      technicalDetails: error,
      severity: 'high',
      recoverable: true,
    }),
  },
  {
    pattern: /permission.*denied|forbidden|unauthorized/i,
    explain: (error: string): ExplainedError => ({
      title: 'Permission Denied',
      explanation: 'You do not have permission to perform this action.',
      likelyCauses: [
        'Subscription plan limits reached',
        'Action requires higher permission level',
        'Account is not verified',
        'Tool is disabled for your account',
      ],
      suggestedActions: [
        'Upgrade your subscription plan',
        'Contact support for permission escalation',
        'Verify your account',
        'Check your account settings',
      ],
      technicalDetails: error,
      severity: 'critical',
      recoverable: false,
    }),
  },
  {
    pattern: /rate.*limit|too.*many.*requests/i,
    explain: (error: string): ExplainedError => ({
      title: 'Rate Limit Exceeded',
      explanation: 'You have made too many requests in a short period of time.',
      likelyCauses: [
        'Exceeded API rate limits',
        'Too many concurrent operations',
        'Subscription plan limits',
      ],
      suggestedActions: [
        'Wait a few minutes before retrying',
        'Reduce the number of concurrent operations',
        'Upgrade to a higher tier plan',
      ],
      technicalDetails: error,
      severity: 'medium',
      recoverable: true,
    }),
  },
  {
    pattern: /api.*key|authentication.*failed/i,
    explain: (error: string): ExplainedError => ({
      title: 'Authentication Failed',
      explanation: 'The service could not authenticate your request.',
      likelyCauses: [
        'API key is missing or invalid',
        'API key has expired',
        'Credentials are incorrect',
      ],
      suggestedActions: [
        'Check your API key configuration',
        'Regenerate your API key',
        'Update credentials in settings',
        'Contact support if issue persists',
      ],
      technicalDetails: error,
      severity: 'critical',
      recoverable: false,
    }),
  },
  {
    pattern: /network.*error|connection.*refused/i,
    explain: (error: string): ExplainedError => ({
      title: 'Network Error',
      explanation: 'Could not establish a network connection.',
      likelyCauses: [
        'Internet connection is down',
        'Firewall blocking connection',
        'Service is temporarily unavailable',
        'DNS resolution failed',
      ],
      suggestedActions: [
        'Check your internet connection',
        'Verify firewall settings',
        'Wait and retry',
        'Try from a different network',
      ],
      technicalDetails: error,
      severity: 'high',
      recoverable: true,
    }),
  },
];

/**
 * Default fallback explanation for unknown errors
 */
const DEFAULT_EXPLANATION: ExplainedError = {
  title: 'Unexpected Error',
  explanation: 'An unexpected error occurred during execution.',
  likelyCauses: [
    'Internal system error',
    'Unexpected response from service',
    'Bug in the automation logic',
  ],
  suggestedActions: [
    'Retry the operation',
    'Report this issue to support',
    'Try a different approach',
  ],
  technicalDetails: '',
  severity: 'medium',
  recoverable: true,
};

/**
 * Explain an error in user-friendly terms
 */
export function explainError(error: string | Error): ExplainedError {
  const errorMessage = error instanceof Error ? error.message : error;

  // Try to match error patterns
  for (const { pattern, explain } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return explain(errorMessage);
    }
  }

  // Return default explanation with technical details
  return {
    ...DEFAULT_EXPLANATION,
    technicalDetails: errorMessage,
  };
}

/**
 * Emit an enhanced error event via SSE
 */
export function emitExplainedError(
  userId: number,
  executionId: string,
  error: string | Error,
  screenshot?: string
) {
  const explained = explainError(error);

  const { sendAgentEvent } = require('../_core/sse-manager');
  const event = {
    type: 'execution:error' as const,
    executionId,
    data: {
      ...explained,
      screenshot,
      timestamp: new Date().toISOString(),
    },
  };

  sendAgentEvent(userId, executionId, event);
}
