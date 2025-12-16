/**
 * Agent Confidence Scoring Service
 * Scores agent decisions and determines when to ask for user help
 */

import Anthropic from '@anthropic-ai/sdk';

// ========================================
// TYPES
// ========================================

/**
 * Confidence-scored action decision
 */
export interface ActionDecision {
  action: string;
  parameters: Record<string, unknown>;
  confidence: number; // 0-1
  reasoning: string;
  ambiguityReasons?: string[];
  alternatives?: AlternativeDecision[];
  shouldAskUser: boolean;
}

/**
 * Alternative decision option
 */
export interface AlternativeDecision {
  action: string;
  parameters: Record<string, unknown>;
  confidence: number;
  reasoning: string;
}

/**
 * Context for scoring confidence
 */
export interface ConfidenceContext {
  taskDescription: string;
  currentPhase?: string;
  previousActions?: Array<{
    action: string;
    success: boolean;
    result?: unknown;
  }>;
  pageState?: {
    url?: string;
    title?: string;
    observedElements?: string[];
  };
  userPreferences?: Record<string, unknown>;
}

/**
 * Confidence factors that contribute to the overall score
 */
export interface ConfidenceFactors {
  selectorClarity: number;      // 0-1: How clear/unambiguous is the element selector
  actionFeasibility: number;     // 0-1: How feasible is the action given page state
  contextRelevance: number;      // 0-1: How relevant is this to the task
  historicalSuccess: number;     // 0-1: Success rate of similar actions
  dataAvailability: number;      // 0-1: Do we have all needed information
  overallConfidence: number;     // 0-1: Weighted average
}

// ========================================
// CONFIDENCE THRESHOLDS
// ========================================

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,           // Execute without hesitation
  MEDIUM: 0.6,         // Execute but monitor closely
  LOW: 0.4,            // Consider asking user
  VERY_LOW: 0.0,       // Definitely ask user
} as const;

// ========================================
// CONFIDENCE SCORING SERVICE
// ========================================

export class AgentConfidenceService {
  private claude: Anthropic;
  private successHistory: Map<string, number> = new Map(); // action -> success rate

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.claude = new Anthropic({ apiKey });
  }

  /**
   * Score confidence for an action decision
   */
  async scoreDecision(
    action: string,
    parameters: Record<string, unknown>,
    context: ConfidenceContext
  ): Promise<ActionDecision> {
    // Calculate confidence factors
    const factors = await this.calculateConfidenceFactors(
      action,
      parameters,
      context
    );

    // Determine if we should ask user
    const shouldAskUser = factors.overallConfidence < CONFIDENCE_THRESHOLDS.MEDIUM;

    // Generate alternatives if confidence is low
    let alternatives: AlternativeDecision[] | undefined;
    let ambiguityReasons: string[] | undefined;

    if (shouldAskUser) {
      const analysis = await this.analyzeAmbiguity(action, parameters, context, factors);
      alternatives = analysis.alternatives;
      ambiguityReasons = analysis.reasons;
    }

    return {
      action,
      parameters,
      confidence: factors.overallConfidence,
      reasoning: this.explainConfidence(factors),
      ambiguityReasons,
      alternatives,
      shouldAskUser,
    };
  }

  /**
   * Calculate individual confidence factors
   */
  private async calculateConfidenceFactors(
    action: string,
    parameters: Record<string, unknown>,
    context: ConfidenceContext
  ): Promise<ConfidenceFactors> {
    // Factor 1: Selector Clarity (for browser actions)
    const selectorClarity = this.scoreSelectorClarity(parameters);

    // Factor 2: Action Feasibility
    const actionFeasibility = this.scoreActionFeasibility(
      action,
      parameters,
      context.pageState
    );

    // Factor 3: Context Relevance
    const contextRelevance = await this.scoreContextRelevance(
      action,
      parameters,
      context
    );

    // Factor 4: Historical Success
    const historicalSuccess = this.getHistoricalSuccessRate(action);

    // Factor 5: Data Availability
    const dataAvailability = this.scoreDataAvailability(parameters);

    // Calculate weighted overall confidence
    const weights = {
      selectorClarity: 0.25,
      actionFeasibility: 0.25,
      contextRelevance: 0.20,
      historicalSuccess: 0.15,
      dataAvailability: 0.15,
    };

    const overallConfidence =
      selectorClarity * weights.selectorClarity +
      actionFeasibility * weights.actionFeasibility +
      contextRelevance * weights.contextRelevance +
      historicalSuccess * weights.historicalSuccess +
      dataAvailability * weights.dataAvailability;

    return {
      selectorClarity,
      actionFeasibility,
      contextRelevance,
      historicalSuccess,
      dataAvailability,
      overallConfidence,
    };
  }

  /**
   * Score how clear/unambiguous a selector is
   */
  private scoreSelectorClarity(parameters: Record<string, unknown>): number {
    const instruction = parameters.instruction as string;
    if (!instruction) return 0.5; // Neutral if no instruction

    let score = 0.5;

    // Higher confidence for specific selectors
    if (instruction.includes('id=') || instruction.includes('#')) {
      score += 0.3;
    } else if (instruction.includes('class=') || instruction.includes('.')) {
      score += 0.2;
    } else if (instruction.includes('first') || instruction.includes('second')) {
      score += 0.1;
    }

    // Lower confidence for vague selectors
    if (instruction.includes('button') && !instruction.includes('the')) {
      score -= 0.2; // "click button" is vague
    }

    if (instruction.split(' ').length < 3) {
      score -= 0.1; // Very short instructions may be ambiguous
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score action feasibility given page state
   */
  private scoreActionFeasibility(
    action: string,
    parameters: Record<string, unknown>,
    pageState?: ConfidenceContext['pageState']
  ): number {
    if (!pageState) return 0.5; // Neutral if no page state

    let score = 0.7; // Start optimistic

    // Check if we have observed elements
    if (pageState.observedElements && pageState.observedElements.length > 0) {
      score += 0.2;
    }

    // Check if URL makes sense for the action
    if (action.includes('ghl_') && !pageState.url?.includes('gohighlevel')) {
      score -= 0.3; // GHL action on non-GHL page
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score how relevant the action is to the task
   */
  private async scoreContextRelevance(
    action: string,
    parameters: Record<string, unknown>,
    context: ConfidenceContext
  ): Promise<number> {
    // Simple heuristic-based scoring
    // In production, could use LLM to evaluate relevance

    let score = 0.5;

    // Check if action aligns with task description
    const taskLower = context.taskDescription.toLowerCase();
    const actionLower = action.toLowerCase();

    if (taskLower.includes('login') && actionLower.includes('login')) {
      score += 0.3;
    }

    if (taskLower.includes('create') && actionLower.includes('create')) {
      score += 0.3;
    }

    if (taskLower.includes('extract') && actionLower.includes('extract')) {
      score += 0.3;
    }

    // Check if we're in the right phase
    if (context.currentPhase) {
      const phaseLower = context.currentPhase.toLowerCase();
      if (phaseLower.includes(actionLower.split('_')[0])) {
        score += 0.2;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get historical success rate for an action
   */
  private getHistoricalSuccessRate(action: string): number {
    return this.successHistory.get(action) || 0.5; // Default to neutral
  }

  /**
   * Score whether we have all necessary data
   */
  private scoreDataAvailability(parameters: Record<string, unknown>): number {
    const requiredFields = Object.keys(parameters).filter(
      key => !['sessionId', 'instruction'].includes(key)
    );

    if (requiredFields.length === 0) return 1.0; // No extra data needed

    const availableFields = requiredFields.filter(
      key => parameters[key] !== undefined && parameters[key] !== null
    );

    return availableFields.length / requiredFields.length;
  }

  /**
   * Explain confidence score in human terms
   */
  private explainConfidence(factors: ConfidenceFactors): string {
    const parts: string[] = [];

    if (factors.overallConfidence >= CONFIDENCE_THRESHOLDS.HIGH) {
      parts.push('High confidence:');
    } else if (factors.overallConfidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
      parts.push('Moderate confidence:');
    } else {
      parts.push('Low confidence:');
    }

    // Explain the weakest factors
    const factorEntries = [
      { name: 'selector clarity', value: factors.selectorClarity },
      { name: 'action feasibility', value: factors.actionFeasibility },
      { name: 'context relevance', value: factors.contextRelevance },
      { name: 'historical success', value: factors.historicalSuccess },
      { name: 'data availability', value: factors.dataAvailability },
    ].sort((a, b) => a.value - b.value);

    const weakest = factorEntries.slice(0, 2);
    const strongest = factorEntries.slice(-2);

    if (weakest[0].value < 0.5) {
      parts.push(`low ${weakest[0].name} (${(weakest[0].value * 100).toFixed(0)}%)`);
    }

    if (strongest[0].value > 0.7) {
      parts.push(`good ${strongest[0].name} (${(strongest[0].value * 100).toFixed(0)}%)`);
    }

    return parts.join(' ');
  }

  /**
   * Analyze why confidence is low and suggest alternatives
   */
  private async analyzeAmbiguity(
    action: string,
    parameters: Record<string, unknown>,
    context: ConfidenceContext,
    factors: ConfidenceFactors
  ): Promise<{
    reasons: string[];
    alternatives: AlternativeDecision[];
  }> {
    const reasons: string[] = [];

    if (factors.selectorClarity < 0.5) {
      reasons.push('The element selector is ambiguous or unclear');
    }

    if (factors.actionFeasibility < 0.5) {
      reasons.push('The action may not be feasible in the current page state');
    }

    if (factors.contextRelevance < 0.5) {
      reasons.push("The action doesn't clearly relate to the task goal");
    }

    if (factors.dataAvailability < 0.5) {
      reasons.push('Some required information is missing');
    }

    // Generate alternatives
    const alternatives: AlternativeDecision[] = [];

    // Alternative 1: Observe first
    alternatives.push({
      action: 'browser_observe',
      parameters: {
        sessionId: parameters.sessionId,
        instruction: `Find elements related to: ${parameters.instruction}`,
      },
      confidence: 0.8,
      reasoning: 'Observing the page will provide more context for the action',
    });

    // Alternative 2: Ask user
    alternatives.push({
      action: 'ask_user',
      parameters: {
        question: `I'm unsure about: "${action}" with instruction "${parameters.instruction}". ${reasons.join('. ')}. Should I proceed?`,
        context: JSON.stringify({ factors, reasons }),
      },
      confidence: 1.0,
      reasoning: 'Get user confirmation before proceeding',
    });

    return { reasons, alternatives };
  }

  /**
   * Record success/failure for learning
   */
  recordOutcome(action: string, success: boolean): void {
    const currentRate = this.successHistory.get(action) || 0.5;
    const newRate = currentRate * 0.9 + (success ? 1 : 0) * 0.1; // Exponential moving average
    this.successHistory.set(action, newRate);

    console.log(`[Confidence] Updated ${action} success rate: ${(newRate * 100).toFixed(1)}%`);
  }

  /**
   * Get confidence statistics
   */
  getStats(): {
    actionsTracked: number;
    averageSuccessRate: number;
    topActions: Array<{ action: string; successRate: number }>;
  } {
    const entries = Array.from(this.successHistory.entries());

    if (entries.length === 0) {
      return {
        actionsTracked: 0,
        averageSuccessRate: 0,
        topActions: [],
      };
    }

    const averageSuccessRate =
      entries.reduce((sum, [_, rate]) => sum + rate, 0) / entries.length;

    const topActions = entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, successRate]) => ({ action, successRate }));

    return {
      actionsTracked: entries.length,
      averageSuccessRate,
      topActions,
    };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let confidenceServiceInstance: AgentConfidenceService | null = null;

/**
 * Get singleton instance of confidence service
 */
export function getConfidenceService(): AgentConfidenceService {
  if (!confidenceServiceInstance) {
    confidenceServiceInstance = new AgentConfidenceService();
  }
  return confidenceServiceInstance;
}
