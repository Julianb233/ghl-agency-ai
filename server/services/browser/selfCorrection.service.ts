/**
 * Self-Correction Service
 * Implements intelligent error recovery and self-healing for browser automation
 *
 * Inspired by ChatGPT Operator and Manus AI:
 * - Analyzes failures to understand root causes
 * - Generates alternative approaches
 * - Learns from successful recoveries
 * - Escalates when all alternatives exhausted
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ErrorType,
  ErrorSeverity,
  RecoveryStrategy,
  classifyError,
  getErrorMetadata,
  getRecoveryStrategies,
} from '../../lib/errorTypes';

// ========================================
// TYPES
// ========================================

/**
 * Analysis of a failure with recovery recommendations
 */
export interface FailureAnalysis {
  errorType: ErrorType;
  errorSeverity: ErrorSeverity;
  rootCause: string;
  alternatives: AlternativeAction[];
  shouldRetry: boolean;
  shouldEscalate: boolean;
  confidence: number;
  reasoning: string;
  context: FailureContext;
}

/**
 * An alternative action to try
 */
export interface AlternativeAction {
  strategy: RecoveryStrategy;
  description: string;
  actionType: string;
  parameters: Record<string, unknown>;
  confidence: number;
  estimatedSuccessProbability: number;
  reasoning: string;
}

/**
 * Context about the failure
 */
export interface FailureContext {
  action: string;
  parameters: Record<string, unknown>;
  error: string;
  errorType: ErrorType;
  attemptNumber: number;
  previousAttempts: FailureAttempt[];
  pageState?: {
    url?: string;
    title?: string;
    screenshot?: string;
  };
  taskContext?: Record<string, unknown>;
}

/**
 * Record of a previous attempt
 */
export interface FailureAttempt {
  action: string;
  parameters: Record<string, unknown>;
  error: string;
  timestamp: Date;
  strategy: RecoveryStrategy;
}

/**
 * Successful recovery record for learning
 */
export interface RecoveryRecord {
  originalError: ErrorType;
  originalAction: string;
  successfulStrategy: RecoveryStrategy;
  successfulAction: string;
  timestamp: Date;
  context: Record<string, unknown>;
}

// ========================================
// SELF-CORRECTION SERVICE
// ========================================

export class SelfCorrectionService {
  private claude: Anthropic;
  private recoveryMemory: Map<string, RecoveryRecord[]> = new Map();

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.claude = new Anthropic({ apiKey });
  }

  /**
   * Analyze a failure and generate recovery alternatives
   */
  async analyzeFailure(
    action: string,
    error: string | Error,
    context: Partial<FailureContext>
  ): Promise<FailureAnalysis> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorType = classifyError(errorMessage);
    const metadata = getErrorMetadata(errorType);

    // Build failure context
    const failureContext: FailureContext = {
      action,
      parameters: context.parameters || {},
      error: errorMessage,
      errorType,
      attemptNumber: context.attemptNumber || 1,
      previousAttempts: context.previousAttempts || [],
      pageState: context.pageState,
      taskContext: context.taskContext,
    };

    // Get recovery strategies from error metadata
    const recommendedStrategies = getRecoveryStrategies(errorType);

    // Use Claude to analyze the failure and generate alternatives
    const analysis = await this.generateAlternatives(
      failureContext,
      recommendedStrategies
    );

    // Enhance alternatives with learned patterns
    const enhancedAlternatives = await this.enhanceWithLearning(
      analysis.alternatives,
      errorType,
      action
    );

    return {
      ...analysis,
      errorType,
      errorSeverity: metadata.severity,
      alternatives: enhancedAlternatives,
      context: failureContext,
    };
  }

  /**
   * Use Claude to generate alternative actions
   */
  private async generateAlternatives(
    context: FailureContext,
    recommendedStrategies: RecoveryStrategy[]
  ): Promise<Omit<FailureAnalysis, 'errorType' | 'errorSeverity' | 'alternatives' | 'context'> & { alternatives: AlternativeAction[] }> {
    const prompt = this.buildAnalysisPrompt(context, recommendedStrategies);

    try {
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );

      if (!textContent) {
        throw new Error('No text content in Claude response');
      }

      // Parse Claude's analysis
      const analysisData = this.parseAnalysisResponse(textContent.text);

      return analysisData;
    } catch (error) {
      console.error('[SelfCorrection] Error generating alternatives:', error);

      // Fallback to rule-based alternatives
      return this.generateFallbackAlternatives(context, recommendedStrategies);
    }
  }

  /**
   * Build prompt for Claude to analyze failure
   */
  private buildAnalysisPrompt(
    context: FailureContext,
    strategies: RecoveryStrategy[]
  ): string {
    const previousAttemptsText = context.previousAttempts.length > 0
      ? `\n\nPrevious Attempts:\n${context.previousAttempts.map((attempt, i) =>
          `${i + 1}. Strategy: ${attempt.strategy}\n   Action: ${attempt.action}\n   Error: ${attempt.error}`
        ).join('\n\n')}`
      : '';

    return `You are an expert at debugging browser automation failures and finding alternative approaches.

**Current Failure:**
- Action: ${context.action}
- Parameters: ${JSON.stringify(context.parameters, null, 2)}
- Error: ${context.error}
- Error Type: ${context.errorType}
- Attempt Number: ${context.attemptNumber}
${context.pageState?.url ? `- Current URL: ${context.pageState.url}` : ''}
${context.pageState?.title ? `- Page Title: ${context.pageState.title}` : ''}
${previousAttemptsText}

**Recommended Recovery Strategies:**
${strategies.map(s => `- ${s}`).join('\n')}

**Your Task:**
1. Analyze the root cause of this failure
2. Generate 3-5 alternative actions to achieve the same goal
3. For each alternative, explain why it might succeed where the original failed
4. Rate each alternative's probability of success (0-1)
5. Determine if we should escalate to the user if all alternatives fail

**Response Format (JSON):**
\`\`\`json
{
  "rootCause": "Detailed explanation of why the original action failed",
  "confidence": 0.85,
  "shouldRetry": true,
  "shouldEscalate": false,
  "reasoning": "Overall reasoning about the failure and recovery approach",
  "alternatives": [
    {
      "strategy": "RETRY_ALTERNATIVE_SELECTOR",
      "description": "Try a different CSS selector that's more specific",
      "actionType": "browser_act",
      "parameters": {
        "instruction": "click the submit button with class 'btn-primary'",
        "sessionId": "..."
      },
      "confidence": 0.8,
      "estimatedSuccessProbability": 0.75,
      "reasoning": "The original selector may have been too generic..."
    }
  ]
}
\`\`\`

Be creative and practical. Consider:
- Different selectors or element identifiers
- Waiting for page to stabilize
- Alternative interaction methods (click vs keyboard)
- Breaking the action into smaller steps
- Refreshing the page if state is corrupted`;
  }

  /**
   * Parse Claude's response into structured analysis
   */
  private parseAnalysisResponse(response: string): Omit<FailureAnalysis, 'errorType' | 'errorSeverity' | 'context'> {
    try {
      // Extract JSON from response (it might be wrapped in markdown)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                       response.match(/{\s*"rootCause"[\s\S]*}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      return {
        rootCause: parsed.rootCause || 'Unknown cause',
        alternatives: parsed.alternatives || [],
        shouldRetry: parsed.shouldRetry !== false,
        shouldEscalate: parsed.shouldEscalate === true,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || '',
      };
    } catch (error) {
      console.error('[SelfCorrection] Failed to parse analysis response:', error);
      throw error;
    }
  }

  /**
   * Generate rule-based alternatives as fallback
   */
  private generateFallbackAlternatives(
    context: FailureContext,
    strategies: RecoveryStrategy[]
  ): Omit<FailureAnalysis, 'errorType' | 'errorSeverity' | 'context'> {
    const alternatives: AlternativeAction[] = [];

    for (const strategy of strategies.slice(0, 3)) {
      let alternative: AlternativeAction | null = null;

      switch (strategy) {
        case RecoveryStrategy.RETRY_AFTER_WAIT:
          alternative = {
            strategy,
            description: 'Wait longer for page to stabilize, then retry',
            actionType: 'browser_wait',
            parameters: {
              sessionId: context.parameters.sessionId,
              type: 'timeout',
              value: 2000,
            },
            confidence: 0.6,
            estimatedSuccessProbability: 0.5,
            reasoning: 'Page may need more time to load or stabilize',
          };
          break;

        case RecoveryStrategy.RETRY_ALTERNATIVE_SELECTOR:
          alternative = {
            strategy,
            description: 'Try alternative element selector',
            actionType: context.action,
            parameters: {
              ...context.parameters,
              instruction: this.generateAlternativeInstruction(
                context.parameters.instruction as string
              ),
            },
            confidence: 0.7,
            estimatedSuccessProbability: 0.6,
            reasoning: 'Original selector may have been too specific or generic',
          };
          break;

        case RecoveryStrategy.RETRY_AFTER_REFRESH:
          alternative = {
            strategy,
            description: 'Refresh page and retry action',
            actionType: 'browser_navigate',
            parameters: {
              sessionId: context.parameters.sessionId,
              url: context.pageState?.url || '',
            },
            confidence: 0.5,
            estimatedSuccessProbability: 0.4,
            reasoning: 'Page state may be corrupted, refresh might help',
          };
          break;

        case RecoveryStrategy.ESCALATE_TO_USER:
          alternative = {
            strategy,
            description: 'Request user guidance',
            actionType: 'ask_user',
            parameters: {
              question: `The action "${context.action}" failed with error: ${context.error}. How should I proceed?`,
              context: JSON.stringify(context.parameters),
            },
            confidence: 1.0,
            estimatedSuccessProbability: 0.9,
            reasoning: 'User can provide specific guidance for this situation',
          };
          break;

        default:
          alternative = {
            strategy,
            description: `Apply ${strategy} strategy`,
            actionType: context.action,
            parameters: context.parameters,
            confidence: 0.5,
            estimatedSuccessProbability: 0.4,
            reasoning: `Automated recovery using ${strategy}`,
          };
      }

      if (alternative) {
        alternatives.push(alternative);
      }
    }

    return {
      rootCause: `Action failed: ${context.error}`,
      alternatives,
      shouldRetry: alternatives.length > 0,
      shouldEscalate: alternatives.length === 0,
      confidence: 0.5,
      reasoning: 'Using rule-based fallback alternatives',
    };
  }

  /**
   * Generate alternative instruction with slight variations
   */
  private generateAlternativeInstruction(original: string): string {
    if (!original) return '';

    // Simple heuristics for generating alternatives
    const variations = [
      original.replace(/click/i, 'click on'),
      original.replace(/the /g, ''),
      original.replace(/button/i, 'btn'),
      original + ' that is visible',
      original.replace(/first/i, 'second').replace(/second/i, 'third'),
    ];

    return variations[Math.floor(Math.random() * variations.length)];
  }

  /**
   * Enhance alternatives with learned patterns from past successes
   */
  private async enhanceWithLearning(
    alternatives: AlternativeAction[],
    errorType: ErrorType,
    action: string
  ): Promise<AlternativeAction[]> {
    const memoryKey = `${errorType}:${action}`;
    const pastRecoveries = this.recoveryMemory.get(memoryKey) || [];

    if (pastRecoveries.length === 0) {
      return alternatives;
    }

    // Boost confidence of strategies that worked before
    const successfulStrategies = new Set(
      pastRecoveries.map(r => r.successfulStrategy)
    );

    return alternatives.map(alt => {
      if (successfulStrategies.has(alt.strategy)) {
        return {
          ...alt,
          confidence: Math.min(alt.confidence * 1.2, 1.0),
          estimatedSuccessProbability: Math.min(alt.estimatedSuccessProbability * 1.15, 1.0),
          reasoning: `${alt.reasoning} (Previously successful for similar failures)`,
        };
      }
      return alt;
    }).sort((a, b) => b.estimatedSuccessProbability - a.estimatedSuccessProbability);
  }

  /**
   * Record a successful recovery for learning
   */
  recordSuccess(
    originalError: ErrorType,
    originalAction: string,
    successfulStrategy: RecoveryStrategy,
    successfulAction: string,
    context?: Record<string, unknown>
  ): void {
    const memoryKey = `${originalError}:${originalAction}`;
    const records = this.recoveryMemory.get(memoryKey) || [];

    const record: RecoveryRecord = {
      originalError,
      originalAction,
      successfulStrategy,
      successfulAction,
      timestamp: new Date(),
      context: context || {},
    };

    records.push(record);

    // Keep only last 50 records per key
    if (records.length > 50) {
      records.shift();
    }

    this.recoveryMemory.set(memoryKey, records);

    console.log(`[SelfCorrection] Learned: ${originalError} in ${originalAction} → ${successfulStrategy}`);
  }

  /**
   * Get statistics about learned recoveries
   */
  getRecoveryStats(): {
    totalRecoveries: number;
    byErrorType: Record<string, number>;
    byStrategy: Record<string, number>;
  } {
    let totalRecoveries = 0;
    const byErrorType: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};

    for (const records of Array.from(this.recoveryMemory.values())) {
      for (const record of records) {
        totalRecoveries++;
        byErrorType[record.originalError] = (byErrorType[record.originalError] || 0) + 1;
        byStrategy[record.successfulStrategy] = (byStrategy[record.successfulStrategy] || 0) + 1;
      }
    }

    return { totalRecoveries, byErrorType, byStrategy };
  }

  /**
   * Clear recovery memory
   */
  clearMemory(): void {
    this.recoveryMemory.clear();
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let selfCorrectionInstance: SelfCorrectionService | null = null;

/**
 * Get singleton instance of self-correction service
 */
export function getSelfCorrectionService(): SelfCorrectionService {
  if (!selfCorrectionInstance) {
    selfCorrectionInstance = new SelfCorrectionService();
  }
  return selfCorrectionInstance;
}
