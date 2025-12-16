/**
 * Agent Multi-Strategy Planning Service
 * Generates and evaluates multiple execution strategies before acting
 */

import Anthropic from '@anthropic-ai/sdk';

// ========================================
// TYPES
// ========================================

/**
 * A complete execution strategy with steps and metadata
 */
export interface ExecutionStrategy {
  id: string;
  name: string;
  description: string;
  steps: ActionStep[];
  estimatedTime: number;        // milliseconds
  riskLevel: 'low' | 'medium' | 'high';
  successProbability: number;   // 0-1
  fallbackStrategy?: string;    // ID of fallback strategy
  reasoning: string;
  constraints: StrategyConstraints;
}

/**
 * Individual action step in a strategy
 */
export interface ActionStep {
  stepNumber: number;
  action: string;
  parameters: Record<string, unknown>;
  description: string;
  expectedOutcome: string;
  successCriteria: string[];
  errorHandling?: {
    retryable: boolean;
    maxRetries: number;
    fallbackAction?: string;
  };
}

/**
 * Constraints that influence strategy selection
 */
export interface StrategyConstraints {
  maxTime?: number;           // Maximum time allowed (ms)
  riskTolerance?: 'low' | 'medium' | 'high';
  requireUserApproval?: boolean;
  allowExperimentalActions?: boolean;
  mustPreserveState?: boolean; // Don't modify data permanently
}

/**
 * Strategy evaluation result
 */
export interface StrategyEvaluation {
  strategy: ExecutionStrategy;
  score: number;              // 0-1 composite score
  pros: string[];
  cons: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended';
}

/**
 * Context for generating strategies
 */
export interface StrategyContext {
  taskDescription: string;
  taskGoal: string;
  currentState?: {
    url?: string;
    pageState?: string;
    availableActions?: string[];
  };
  constraints?: StrategyConstraints;
  previousAttempts?: Array<{
    strategy: ExecutionStrategy;
    outcome: 'success' | 'failure' | 'partial';
    error?: string;
  }>;
}

// ========================================
// MULTI-STRATEGY PLANNING SERVICE
// ========================================

export class AgentStrategyService {
  private claude: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.claude = new Anthropic({ apiKey });
  }

  /**
   * Generate multiple execution strategies for a task
   */
  async generateStrategies(
    context: StrategyContext,
    count: number = 3
  ): Promise<ExecutionStrategy[]> {
    const prompt = this.buildStrategyPrompt(context, count);

    try {
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
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

      const strategies = this.parseStrategiesResponse(textContent.text);
      return strategies;
    } catch (error) {
      console.error('[Strategy] Error generating strategies:', error);
      return this.generateFallbackStrategies(context);
    }
  }

  /**
   * Build prompt for Claude to generate strategies
   */
  private buildStrategyPrompt(context: StrategyContext, count: number): string {
    const constraintsText = context.constraints
      ? `
**Constraints:**
${context.constraints.maxTime ? `- Maximum time: ${context.constraints.maxTime}ms` : ''}
${context.constraints.riskTolerance ? `- Risk tolerance: ${context.constraints.riskTolerance}` : ''}
${context.constraints.requireUserApproval ? '- Requires user approval for critical actions' : ''}
${context.constraints.allowExperimentalActions ? '- Experimental actions allowed' : '- Only proven actions allowed'}
${context.constraints.mustPreserveState ? '- Must not modify data permanently (read-only)' : ''}
      `
      : '';

    const previousAttemptsText = context.previousAttempts && context.previousAttempts.length > 0
      ? `
**Previous Attempts:**
${context.previousAttempts.map((attempt, i) => `
${i + 1}. ${attempt.strategy.name} - ${attempt.outcome.toUpperCase()}
   ${attempt.error ? `Error: ${attempt.error}` : ''}
   Risk: ${attempt.strategy.riskLevel}, Steps: ${attempt.strategy.steps.length}
`).join('\n')}
      `
      : '';

    return `You are an expert at planning browser automation strategies. Generate ${count} different approaches to accomplish a task.

**Task:**
Goal: ${context.taskGoal}
Description: ${context.taskDescription}

${context.currentState?.url ? `Current URL: ${context.currentState.url}` : ''}
${context.currentState?.pageState ? `Page State: ${context.currentState.pageState}` : ''}
${context.currentState?.availableActions ? `Available Actions: ${context.currentState.availableActions.join(', ')}` : ''}

${constraintsText}
${previousAttemptsText}

**Your Task:**
Generate ${count} distinct strategies with different trade-offs:
1. **Conservative Strategy**: Safe, proven approach with minimal risk
2. **Balanced Strategy**: Good mix of speed and reliability
3. **Aggressive Strategy**: Fast and direct but higher risk

For each strategy, provide:
- Clear step-by-step actions
- Estimated time and success probability
- Risk assessment
- Fallback plan if it fails

**Response Format (JSON):**
\`\`\`json
{
  "strategies": [
    {
      "id": "strategy-1",
      "name": "Conservative Approach",
      "description": "Step-by-step verification at each stage",
      "steps": [
        {
          "stepNumber": 1,
          "action": "browser_navigate",
          "parameters": {
            "sessionId": "{{sessionId}}",
            "url": "https://example.com"
          },
          "description": "Navigate to the login page",
          "expectedOutcome": "Login page loads successfully",
          "successCriteria": [
            "Page title contains 'Login'",
            "Login form is visible"
          ],
          "errorHandling": {
            "retryable": true,
            "maxRetries": 3,
            "fallbackAction": "Take screenshot and ask user"
          }
        }
      ],
      "estimatedTime": 15000,
      "riskLevel": "low",
      "successProbability": 0.85,
      "fallbackStrategy": "strategy-2",
      "reasoning": "Takes more time but verifies each step",
      "constraints": {
        "maxTime": 30000,
        "riskTolerance": "low"
      }
    }
  ]
}
\`\`\`

Be creative and practical. Consider different paths to achieve the same goal.`;
  }

  /**
   * Parse Claude's strategy response
   */
  private parseStrategiesResponse(response: string): ExecutionStrategy[] {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                       response.match(/{\s*"strategies"[\s\S]*}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      return parsed.strategies || [];
    } catch (error) {
      console.error('[Strategy] Failed to parse strategies response:', error);
      throw error;
    }
  }

  /**
   * Generate fallback strategies using rule-based approach
   */
  private generateFallbackStrategies(context: StrategyContext): ExecutionStrategy[] {
    const baseStrategy: ExecutionStrategy = {
      id: 'fallback-1',
      name: 'Basic Sequential Approach',
      description: 'Execute actions in simple sequence',
      steps: [
        {
          stepNumber: 1,
          action: 'browser_observe',
          parameters: { instruction: 'Observe the page' },
          description: 'Understand current page state',
          expectedOutcome: 'List of available elements',
          successCriteria: ['Elements are found'],
          errorHandling: {
            retryable: true,
            maxRetries: 2,
          },
        },
      ],
      estimatedTime: 10000,
      riskLevel: 'low',
      successProbability: 0.6,
      reasoning: 'Fallback strategy when AI generation fails',
      constraints: context.constraints || {},
    };

    return [baseStrategy];
  }

  /**
   * Evaluate and rank strategies
   */
  async evaluateStrategies(
    strategies: ExecutionStrategy[],
    context: StrategyContext
  ): Promise<StrategyEvaluation[]> {
    const evaluations = strategies.map(strategy => {
      const evaluation = this.evaluateStrategy(strategy, context);
      return evaluation;
    });

    // Sort by score (highest first)
    return evaluations.sort((a, b) => b.score - a.score);
  }

  /**
   * Evaluate a single strategy
   */
  private evaluateStrategy(
    strategy: ExecutionStrategy,
    context: StrategyContext
  ): StrategyEvaluation {
    const scores = {
      successProbability: strategy.successProbability,
      riskAlignment: this.scoreRiskAlignment(strategy.riskLevel, context.constraints?.riskTolerance),
      timeAlignment: this.scoreTimeAlignment(strategy.estimatedTime, context.constraints?.maxTime),
      completeness: this.scoreCompleteness(strategy),
      errorHandling: this.scoreErrorHandling(strategy),
    };

    // Weighted composite score
    const weights = {
      successProbability: 0.35,
      riskAlignment: 0.25,
      timeAlignment: 0.15,
      completeness: 0.15,
      errorHandling: 0.10,
    };

    const score = Object.entries(scores).reduce(
      (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
      0
    );

    // Determine pros and cons
    const pros: string[] = [];
    const cons: string[] = [];

    if (strategy.successProbability >= 0.7) {
      pros.push(`High success probability (${(strategy.successProbability * 100).toFixed(0)}%)`);
    } else if (strategy.successProbability < 0.5) {
      cons.push(`Low success probability (${(strategy.successProbability * 100).toFixed(0)}%)`);
    }

    if (strategy.riskLevel === 'low') {
      pros.push('Low risk approach');
    } else if (strategy.riskLevel === 'high') {
      cons.push('High risk approach');
    }

    if (strategy.estimatedTime < 10000) {
      pros.push('Fast execution');
    } else if (strategy.estimatedTime > 30000) {
      cons.push('Slow execution');
    }

    if (strategy.fallbackStrategy) {
      pros.push('Has fallback plan');
    }

    if (strategy.steps.every(step => step.errorHandling)) {
      pros.push('Comprehensive error handling');
    }

    // Determine recommendation
    let recommendation: StrategyEvaluation['recommendation'];
    if (score >= 0.8) {
      recommendation = 'highly_recommended';
    } else if (score >= 0.65) {
      recommendation = 'recommended';
    } else if (score >= 0.5) {
      recommendation = 'acceptable';
    } else {
      recommendation = 'not_recommended';
    }

    return {
      strategy,
      score,
      pros,
      cons,
      recommendation,
    };
  }

  /**
   * Score how well risk level aligns with tolerance
   */
  private scoreRiskAlignment(
    strategyRisk: 'low' | 'medium' | 'high',
    tolerance?: 'low' | 'medium' | 'high'
  ): number {
    if (!tolerance) return 0.5; // Neutral if no preference

    const riskValues = { low: 0, medium: 1, high: 2 };
    const strategyValue = riskValues[strategyRisk];
    const toleranceValue = riskValues[tolerance];

    if (strategyValue <= toleranceValue) {
      return 1.0; // Within tolerance
    } else {
      return Math.max(0, 1 - (strategyValue - toleranceValue) * 0.3);
    }
  }

  /**
   * Score how well estimated time fits constraint
   */
  private scoreTimeAlignment(estimatedTime: number, maxTime?: number): number {
    if (!maxTime) return 0.5; // Neutral if no constraint

    if (estimatedTime <= maxTime) {
      return 1.0; // Within limit
    } else {
      const overage = (estimatedTime - maxTime) / maxTime;
      return Math.max(0, 1 - overage);
    }
  }

  /**
   * Score completeness of strategy definition
   */
  private scoreCompleteness(strategy: ExecutionStrategy): number {
    let score = 0.5;

    if (strategy.steps.length > 0) score += 0.2;
    if (strategy.reasoning) score += 0.1;
    if (strategy.fallbackStrategy) score += 0.1;
    if (strategy.steps.every(s => s.successCriteria.length > 0)) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Score quality of error handling
   */
  private scoreErrorHandling(strategy: ExecutionStrategy): number {
    const stepsWithHandling = strategy.steps.filter(s => s.errorHandling);
    const ratio = stepsWithHandling.length / strategy.steps.length;

    let score = ratio * 0.7;

    // Bonus for comprehensive error handling
    if (stepsWithHandling.every(s => s.errorHandling?.fallbackAction)) {
      score += 0.3;
    }

    return Math.min(1, score);
  }

  /**
   * Select best strategy from evaluations
   */
  selectBestStrategy(evaluations: StrategyEvaluation[]): ExecutionStrategy {
    if (evaluations.length === 0) {
      throw new Error('No strategies to select from');
    }

    // Return highest scored strategy
    return evaluations[0].strategy;
  }

  /**
   * Switch to fallback strategy
   */
  getFallbackStrategy(
    currentStrategy: ExecutionStrategy,
    allStrategies: ExecutionStrategy[]
  ): ExecutionStrategy | null {
    if (!currentStrategy.fallbackStrategy) {
      return null;
    }

    return allStrategies.find(s => s.id === currentStrategy.fallbackStrategy) || null;
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let strategyServiceInstance: AgentStrategyService | null = null;

/**
 * Get singleton instance of strategy service
 */
export function getStrategyService(): AgentStrategyService {
  if (!strategyServiceInstance) {
    strategyServiceInstance = new AgentStrategyService();
  }
  return strategyServiceInstance;
}
