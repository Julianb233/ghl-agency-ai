/**
 * Knowledge & Training System Service
 *
 * Provides a learning system for browser automation agents:
 * - Action pattern caching for faster subsequent runs
 * - Success/failure tracking with metrics
 * - Element selector versioning
 * - Error recovery pattern storage
 * - Agent feedback collection
 * - Brand voice and client context storage
 */

import { getDb } from '../db';
import { eq, and, desc, sql, gte } from 'drizzle-orm';

// ========================================
// TYPES & INTERFACES
// ========================================

export interface ActionPattern {
  id?: number;
  taskType: string;
  taskName: string;
  pageUrl: string;
  steps: ActionStep[];
  successCount: number;
  failureCount: number;
  lastExecuted?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActionStep {
  order: number;
  action: 'navigate' | 'click' | 'type' | 'extract' | 'wait' | 'screenshot' | 'scroll';
  selector?: string;
  instruction?: string;
  value?: string;
  waitFor?: string;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface ElementSelector {
  id?: number;
  pagePath: string;
  elementName: string;
  primarySelector: string;
  fallbackSelectors: string[];
  successRate: number;
  totalAttempts: number;
  lastVerified?: Date;
  screenshotRef?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorPattern {
  id?: number;
  errorType: string;
  errorMessage: string;
  context: string;
  recoveryStrategies: RecoveryStrategy[];
  occurrenceCount: number;
  resolvedCount: number;
  lastOccurred?: Date;
}

export interface RecoveryStrategy {
  strategy: 'wait_and_retry' | 'refresh_page' | 'fallback_selector' | 'skip' | 'escalate';
  successRate: number;
  attempts: number;
  parameters?: Record<string, unknown>;
}

export interface AgentFeedback {
  id?: number;
  executionId: number;
  userId: number;
  rating: 1 | 2 | 3 | 4 | 5;
  feedbackType: 'success' | 'partial' | 'failure' | 'suggestion';
  comment?: string;
  taskType: string;
  actionsTaken?: ActionStep[];
  corrections?: string;
  createdAt?: Date;
}

export interface BrandVoice {
  id?: number;
  clientId: number;
  name: string;
  tone: string[];
  vocabulary: string[];
  avoidWords: string[];
  examples: BrandVoiceExample[];
  industry?: string;
  targetAudience?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BrandVoiceExample {
  type: 'email' | 'sms' | 'social' | 'funnel' | 'general';
  good: string;
  bad: string;
  notes?: string;
}

export interface ClientContext {
  id?: number;
  clientId: number;
  businessType: string;
  industry: string;
  targetMarket: string;
  products: string[];
  services: string[];
  keyValues: string[];
  competitors: string[];
  uniqueSellingPoints: string[];
  customerPersonas: CustomerPersona[];
  customFields?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CustomerPersona {
  name: string;
  demographics: string;
  painPoints: string[];
  goals: string[];
  preferredChannels: string[];
}

// ========================================
// IN-MEMORY STORAGE (TODO: Move to database)
// ========================================

// These would be stored in database tables in production
const actionPatterns = new Map<string, ActionPattern>();
const elementSelectors = new Map<string, ElementSelector>();
const errorPatterns = new Map<string, ErrorPattern>();
const agentFeedbackList: AgentFeedback[] = [];
const brandVoices = new Map<number, BrandVoice>();
const clientContexts = new Map<number, ClientContext>();

// ========================================
// KNOWLEDGE SERVICE
// ========================================

export class KnowledgeService {
  private static instance: KnowledgeService;

  private constructor() {
    // Load initial patterns (could be from database)
    this.loadDefaultPatterns();
  }

  public static getInstance(): KnowledgeService {
    if (!KnowledgeService.instance) {
      KnowledgeService.instance = new KnowledgeService();
    }
    return KnowledgeService.instance;
  }

  // ========================================
  // ACTION PATTERNS
  // ========================================

  /**
   * Get action pattern for a task type
   */
  public getActionPattern(taskType: string): ActionPattern | undefined {
    return actionPatterns.get(taskType);
  }

  /**
   * Store or update an action pattern
   */
  public saveActionPattern(pattern: ActionPattern): void {
    const existing = actionPatterns.get(pattern.taskType);
    if (existing) {
      pattern.successCount = existing.successCount;
      pattern.failureCount = existing.failureCount;
      pattern.updatedAt = new Date();
    } else {
      pattern.createdAt = new Date();
      pattern.updatedAt = new Date();
      pattern.successCount = 0;
      pattern.failureCount = 0;
    }
    actionPatterns.set(pattern.taskType, pattern);
  }

  /**
   * Record execution result for a pattern
   */
  public recordPatternExecution(taskType: string, success: boolean): void {
    const pattern = actionPatterns.get(taskType);
    if (pattern) {
      if (success) {
        pattern.successCount++;
      } else {
        pattern.failureCount++;
      }
      pattern.lastExecuted = new Date();
      pattern.updatedAt = new Date();
    }
  }

  /**
   * Get all action patterns with metrics
   */
  public getAllActionPatterns(): ActionPattern[] {
    return Array.from(actionPatterns.values()).map(p => ({
      ...p,
      successRate: p.successCount + p.failureCount > 0
        ? p.successCount / (p.successCount + p.failureCount)
        : 0,
    }));
  }

  /**
   * Get patterns sorted by success rate
   */
  public getTopPerformingPatterns(limit: number = 10): ActionPattern[] {
    return this.getAllActionPatterns()
      .sort((a, b) => {
        const aRate = a.successCount / (a.successCount + a.failureCount || 1);
        const bRate = b.successCount / (b.successCount + b.failureCount || 1);
        return bRate - aRate;
      })
      .slice(0, limit);
  }

  // ========================================
  // ELEMENT SELECTORS
  // ========================================

  /**
   * Get selector for an element
   */
  public getSelector(pagePath: string, elementName: string): ElementSelector | undefined {
    const key = `${pagePath}:${elementName}`;
    return elementSelectors.get(key);
  }

  /**
   * Save or update an element selector
   */
  public saveSelector(selector: ElementSelector): void {
    const key = `${selector.pagePath}:${selector.elementName}`;
    const existing = elementSelectors.get(key);

    if (existing) {
      // Merge fallbacks
      const allFallbacks = new Set([
        ...existing.fallbackSelectors,
        ...selector.fallbackSelectors,
      ]);
      selector.fallbackSelectors = Array.from(allFallbacks);
      selector.totalAttempts = existing.totalAttempts;
      selector.successRate = existing.successRate;
    } else {
      selector.totalAttempts = 0;
      selector.successRate = 1.0;
    }

    selector.lastVerified = new Date();
    elementSelectors.set(key, selector);
  }

  /**
   * Record selector usage result
   */
  public recordSelectorUsage(
    pagePath: string,
    elementName: string,
    selectorUsed: string,
    success: boolean
  ): void {
    const key = `${pagePath}:${elementName}`;
    const selector = elementSelectors.get(key);

    if (selector) {
      selector.totalAttempts++;

      // Update success rate with exponential moving average
      const alpha = 0.1; // Smoothing factor
      selector.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * selector.successRate;

      // If a fallback was used successfully, consider promoting it
      if (success && selectorUsed !== selector.primarySelector) {
        // Move successful selector to front of fallbacks
        selector.fallbackSelectors = selector.fallbackSelectors.filter(s => s !== selectorUsed);
        selector.fallbackSelectors.unshift(selectorUsed);
      }

      selector.lastVerified = new Date();
    }
  }

  /**
   * Get all selectors for a page
   */
  public getSelectorsForPage(pagePath: string): ElementSelector[] {
    return Array.from(elementSelectors.values())
      .filter(s => s.pagePath === pagePath);
  }

  // ========================================
  // ERROR PATTERNS
  // ========================================

  /**
   * Record an error and get recovery suggestions
   */
  public recordError(
    errorType: string,
    errorMessage: string,
    context: string
  ): RecoveryStrategy[] {
    const key = `${errorType}:${context}`;
    let pattern = errorPatterns.get(key);

    if (!pattern) {
      pattern = {
        errorType,
        errorMessage,
        context,
        recoveryStrategies: this.getDefaultRecoveryStrategies(errorType),
        occurrenceCount: 0,
        resolvedCount: 0,
      };
      errorPatterns.set(key, pattern);
    }

    pattern.occurrenceCount++;
    pattern.lastOccurred = new Date();

    // Return strategies sorted by success rate
    return pattern.recoveryStrategies.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Record that a recovery strategy worked
   */
  public recordRecoverySuccess(
    errorType: string,
    context: string,
    strategyUsed: RecoveryStrategy['strategy']
  ): void {
    const key = `${errorType}:${context}`;
    const pattern = errorPatterns.get(key);

    if (pattern) {
      pattern.resolvedCount++;
      const strategy = pattern.recoveryStrategies.find(s => s.strategy === strategyUsed);
      if (strategy) {
        strategy.attempts++;
        // Update success rate
        const alpha = 0.1;
        strategy.successRate = alpha * 1 + (1 - alpha) * strategy.successRate;
      }
    }
  }

  /**
   * Get default recovery strategies for error type
   */
  private getDefaultRecoveryStrategies(errorType: string): RecoveryStrategy[] {
    const defaults: Record<string, RecoveryStrategy[]> = {
      element_not_found: [
        { strategy: 'wait_and_retry', successRate: 0.7, attempts: 0, parameters: { maxRetries: 3, delayMs: 2000 } },
        { strategy: 'fallback_selector', successRate: 0.8, attempts: 0 },
        { strategy: 'refresh_page', successRate: 0.5, attempts: 0 },
        { strategy: 'escalate', successRate: 0.3, attempts: 0 },
      ],
      timeout: [
        { strategy: 'wait_and_retry', successRate: 0.6, attempts: 0, parameters: { maxRetries: 2, delayMs: 5000 } },
        { strategy: 'refresh_page', successRate: 0.5, attempts: 0 },
        { strategy: 'skip', successRate: 0.4, attempts: 0 },
      ],
      navigation_error: [
        { strategy: 'refresh_page', successRate: 0.7, attempts: 0 },
        { strategy: 'wait_and_retry', successRate: 0.6, attempts: 0, parameters: { maxRetries: 2, delayMs: 3000 } },
      ],
      authentication_error: [
        { strategy: 'escalate', successRate: 0.9, attempts: 0 },
      ],
    };

    return defaults[errorType] || [
      { strategy: 'wait_and_retry', successRate: 0.5, attempts: 0 },
      { strategy: 'escalate', successRate: 0.5, attempts: 0 },
    ];
  }

  // ========================================
  // AGENT FEEDBACK
  // ========================================

  /**
   * Submit feedback for an agent execution
   */
  public submitFeedback(feedback: Omit<AgentFeedback, 'id' | 'createdAt'>): void {
    const newFeedback: AgentFeedback = {
      ...feedback,
      id: agentFeedbackList.length + 1,
      createdAt: new Date(),
    };
    agentFeedbackList.push(newFeedback);

    // If corrections were provided, use them to improve patterns
    if (feedback.corrections && feedback.taskType) {
      this.applyCorrections(feedback.taskType, feedback.corrections);
    }
  }

  /**
   * Get feedback for analysis
   */
  public getFeedback(filters?: {
    userId?: number;
    taskType?: string;
    rating?: number;
    limit?: number;
  }): AgentFeedback[] {
    let results = [...agentFeedbackList];

    if (filters?.userId) {
      results = results.filter(f => f.userId === filters.userId);
    }
    if (filters?.taskType) {
      results = results.filter(f => f.taskType === filters.taskType);
    }
    if (filters?.rating) {
      results = results.filter(f => f.rating === filters.rating);
    }

    results.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get feedback statistics
   */
  public getFeedbackStats(): {
    total: number;
    averageRating: number;
    byType: Record<string, number>;
    byRating: Record<number, number>;
  } {
    const total = agentFeedbackList.length;
    const avgRating = total > 0
      ? agentFeedbackList.reduce((sum, f) => sum + f.rating, 0) / total
      : 0;

    const byType: Record<string, number> = {};
    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    agentFeedbackList.forEach(f => {
      byType[f.feedbackType] = (byType[f.feedbackType] || 0) + 1;
      byRating[f.rating] = (byRating[f.rating] || 0) + 1;
    });

    return { total, averageRating: avgRating, byType, byRating };
  }

  /**
   * Apply corrections from feedback to improve patterns
   */
  private applyCorrections(taskType: string, corrections: string): void {
    // This would parse corrections and update patterns
    console.log(`[Knowledge] Applying corrections for ${taskType}: ${corrections}`);
    // TODO: Implement NLP-based correction parsing
  }

  // ========================================
  // BRAND VOICE
  // ========================================

  /**
   * Get brand voice for a client
   */
  public getBrandVoice(clientId: number): BrandVoice | undefined {
    return brandVoices.get(clientId);
  }

  /**
   * Save brand voice
   */
  public saveBrandVoice(voice: BrandVoice): void {
    voice.updatedAt = new Date();
    if (!voice.createdAt) {
      voice.createdAt = new Date();
    }
    brandVoices.set(voice.clientId, voice);
  }

  /**
   * Generate content prompt with brand voice
   */
  public generateBrandPrompt(clientId: number, contentType: string): string {
    const voice = brandVoices.get(clientId);
    if (!voice) {
      return '';
    }

    let prompt = `Write in a ${voice.tone.join(', ')} tone.\n`;
    prompt += `Use words like: ${voice.vocabulary.slice(0, 10).join(', ')}.\n`;
    prompt += `Avoid using: ${voice.avoidWords.join(', ')}.\n`;

    if (voice.industry) {
      prompt += `Industry context: ${voice.industry}.\n`;
    }
    if (voice.targetAudience) {
      prompt += `Target audience: ${voice.targetAudience}.\n`;
    }

    // Add relevant example
    const example = voice.examples.find(e => e.type === contentType || e.type === 'general');
    if (example) {
      prompt += `\nExample of good copy:\n"${example.good}"\n`;
      prompt += `\nAvoid writing like this:\n"${example.bad}"\n`;
    }

    return prompt;
  }

  // ========================================
  // CLIENT CONTEXT
  // ========================================

  /**
   * Get client context
   */
  public getClientContext(clientId: number): ClientContext | undefined {
    return clientContexts.get(clientId);
  }

  /**
   * Save client context
   */
  public saveClientContext(context: ClientContext): void {
    context.updatedAt = new Date();
    if (!context.createdAt) {
      context.createdAt = new Date();
    }
    clientContexts.set(context.clientId, context);
  }

  /**
   * Generate context prompt for agent
   */
  public generateContextPrompt(clientId: number): string {
    const context = clientContexts.get(clientId);
    if (!context) {
      return '';
    }

    let prompt = `Business: ${context.businessType} in ${context.industry}\n`;
    prompt += `Target Market: ${context.targetMarket}\n`;

    if (context.products.length > 0) {
      prompt += `Products: ${context.products.join(', ')}\n`;
    }
    if (context.services.length > 0) {
      prompt += `Services: ${context.services.join(', ')}\n`;
    }
    if (context.uniqueSellingPoints.length > 0) {
      prompt += `USPs: ${context.uniqueSellingPoints.join(', ')}\n`;
    }

    if (context.customerPersonas.length > 0) {
      prompt += `\nCustomer Personas:\n`;
      context.customerPersonas.forEach((persona, i) => {
        prompt += `${i + 1}. ${persona.name}: ${persona.demographics}\n`;
        prompt += `   Pain points: ${persona.painPoints.join(', ')}\n`;
        prompt += `   Goals: ${persona.goals.join(', ')}\n`;
      });
    }

    return prompt;
  }

  // ========================================
  // ANALYTICS & METRICS
  // ========================================

  // ========================================
  // DEFAULT PATTERNS
  // ========================================

  /**
   * Load default GHL automation patterns
   */
  private loadDefaultPatterns(): void {
    // GHL Workflow Creation Pattern
    this.saveActionPattern({
      taskType: 'ghl_create_workflow',
      taskName: 'Create GHL Workflow',
      pageUrl: 'https://app.gohighlevel.com/v2/location/*/workflows',
      steps: [
        { order: 1, action: 'navigate', instruction: 'Navigate to Automation > Workflows' },
        { order: 2, action: 'click', instruction: 'Click Create Workflow button' },
        { order: 3, action: 'type', instruction: 'Enter workflow name', selector: 'input[name="workflow-name"]' },
        { order: 4, action: 'click', instruction: 'Click to add trigger' },
        { order: 5, action: 'click', instruction: 'Save workflow' },
      ],
      successCount: 0,
      failureCount: 0,
    });

    // GHL Contact Creation Pattern
    this.saveActionPattern({
      taskType: 'ghl_create_contact',
      taskName: 'Create GHL Contact',
      pageUrl: 'https://app.gohighlevel.com/v2/location/*/contacts',
      steps: [
        { order: 1, action: 'navigate', instruction: 'Navigate to Contacts' },
        { order: 2, action: 'click', instruction: 'Click Add Contact button' },
        { order: 3, action: 'type', instruction: 'Enter first name' },
        { order: 4, action: 'type', instruction: 'Enter last name' },
        { order: 5, action: 'type', instruction: 'Enter email' },
        { order: 6, action: 'type', instruction: 'Enter phone' },
        { order: 7, action: 'click', instruction: 'Save contact' },
      ],
      successCount: 0,
      failureCount: 0,
    });

    // GHL Funnel Creation Pattern
    this.saveActionPattern({
      taskType: 'ghl_create_funnel',
      taskName: 'Create GHL Funnel',
      pageUrl: 'https://app.gohighlevel.com/v2/location/*/funnels',
      steps: [
        { order: 1, action: 'navigate', instruction: 'Navigate to Sites > Funnels' },
        { order: 2, action: 'click', instruction: 'Click Create Funnel button' },
        { order: 3, action: 'click', instruction: 'Select template or start blank' },
        { order: 4, action: 'type', instruction: 'Enter funnel name' },
        { order: 5, action: 'click', instruction: 'Create funnel' },
      ],
      successCount: 0,
      failureCount: 0,
    });

    // Default selectors for common GHL elements
    this.saveSelector({
      pagePath: '/workflows',
      elementName: 'create_button',
      primarySelector: 'button[data-testid="create-workflow"]',
      fallbackSelectors: [
        'button:has-text("Create Workflow")',
        'button:has-text("New Workflow")',
        '//button[contains(text(), "Create")]',
      ],
      successRate: 1.0,
      totalAttempts: 0,
    });

    this.saveSelector({
      pagePath: '/contacts',
      elementName: 'add_button',
      primarySelector: 'button[data-testid="add-contact"]',
      fallbackSelectors: [
        'button:has-text("Add Contact")',
        'button:has-text("New Contact")',
        '//button[contains(@class, "add")]',
      ],
      successRate: 1.0,
      totalAttempts: 0,
    });

    console.log('[Knowledge] Default patterns loaded');
  }

  // ========================================
  // ADDITIONAL METHODS FOR ROUTER COMPATIBILITY
  // ========================================

  /**
   * Get all action patterns (alias for getAllActionPatterns)
   */
  public getAllPatterns(): ActionPattern[] {
    return this.getAllActionPatterns();
  }

  /**
   * Delete an action pattern
   */
  public deletePattern(taskType: string): boolean {
    return actionPatterns.delete(taskType);
  }

  /**
   * Get all selectors, optionally filtered by page
   */
  public getAllSelectors(pagePath?: string): ElementSelector[] {
    const all = Array.from(elementSelectors.values());
    if (pagePath) {
      return all.filter(s => s.pagePath === pagePath);
    }
    return all;
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    totalErrors: number;
    resolvedErrors: number;
    resolutionRate: number;
    byType: Record<string, { count: number; resolved: number }>;
    topStrategies: { strategy: string; successRate: number }[];
  } {
    const errors = Array.from(errorPatterns.values());
    const totalOccurrences = errors.reduce((sum, e) => sum + e.occurrenceCount, 0);
    const totalResolved = errors.reduce((sum, e) => sum + e.resolvedCount, 0);

    const byType: Record<string, { count: number; resolved: number }> = {};
    errors.forEach(e => {
      if (!byType[e.errorType]) {
        byType[e.errorType] = { count: 0, resolved: 0 };
      }
      byType[e.errorType].count += e.occurrenceCount;
      byType[e.errorType].resolved += e.resolvedCount;
    });

    // Get top strategies across all error patterns
    const strategyStats = new Map<string, { total: number; weighted: number }>();
    errors.forEach(e => {
      e.recoveryStrategies.forEach(s => {
        const current = strategyStats.get(s.strategy) || { total: 0, weighted: 0 };
        current.total += s.attempts;
        current.weighted += s.successRate * s.attempts;
        strategyStats.set(s.strategy, current);
      });
    });

    const topStrategies = Array.from(strategyStats.entries())
      .map(([strategy, stats]) => ({
        strategy,
        successRate: stats.total > 0 ? stats.weighted / stats.total : 0,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    return {
      totalErrors: totalOccurrences,
      resolvedErrors: totalResolved,
      resolutionRate: totalOccurrences > 0 ? totalResolved / totalOccurrences : 0,
      byType,
      topStrategies,
    };
  }

  /**
   * Get all brand voices
   */
  public getAllBrandVoices(): BrandVoice[] {
    return Array.from(brandVoices.values());
  }

  /**
   * Get all client contexts
   */
  public getAllClientContexts(): ClientContext[] {
    return Array.from(clientContexts.values());
  }

  /**
   * Update client history after task completion
   */
  public updateClientHistory(
    clientId: number,
    taskCompleted: boolean,
    issue?: string
  ): void {
    const context = clientContexts.get(clientId);
    if (!context) return;

    // Note: This would track history in a real implementation
    // For now we just log it
    console.log(`[Knowledge] Client ${clientId} history update: completed=${taskCompleted}, issue=${issue || 'none'}`);
  }

  /**
   * Get pattern recommendations based on task description
   */
  public getPatternRecommendations(
    taskDescription: string,
    clientId?: number
  ): { pattern: ActionPattern; relevanceScore: number }[] {
    const allPatterns = this.getAllActionPatterns();
    const lowerDesc = taskDescription.toLowerCase();

    // Simple keyword matching for now
    const scored = allPatterns.map(pattern => {
      let score = 0;

      // Match task type keywords
      const taskWords = pattern.taskType.toLowerCase().split('_');
      taskWords.forEach(word => {
        if (lowerDesc.includes(word)) score += 0.2;
      });

      // Match task name keywords
      const nameWords = pattern.taskName.toLowerCase().split(' ');
      nameWords.forEach(word => {
        if (lowerDesc.includes(word)) score += 0.15;
      });

      // Boost by success rate
      const successRate = pattern.successCount / (pattern.successCount + pattern.failureCount || 1);
      score += successRate * 0.3;

      // Consider client context if available
      if (clientId) {
        const context = this.getClientContext(clientId);
        if (context) {
          // Could add industry-specific boosts here
        }
      }

      return { pattern, relevanceScore: Math.min(score, 1.0) };
    });

    return scored
      .filter(r => r.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  /**
   * Extended system stats including brand voices and contexts
   */
  public getSystemStats(): {
    totalPatterns: number;
    totalSelectors: number;
    totalErrors: number;
    totalFeedback: number;
    totalBrandVoices: number;
    totalClientContexts: number;
    avgPatternSuccessRate: number;
    avgSelectorSuccessRate: number;
    errorResolutionRate: number;
  } {
    const patterns = this.getAllActionPatterns();
    const selectors = Array.from(elementSelectors.values());
    const errors = Array.from(errorPatterns.values());

    const avgPatternSuccess = patterns.length > 0
      ? patterns.reduce((sum, p) => {
          const rate = p.successCount / (p.successCount + p.failureCount || 1);
          return sum + rate;
        }, 0) / patterns.length
      : 0;

    const avgSelectorSuccess = selectors.length > 0
      ? selectors.reduce((sum, s) => sum + s.successRate, 0) / selectors.length
      : 0;

    const errorResolution = errors.length > 0
      ? errors.reduce((sum, e) => {
          const rate = e.resolvedCount / (e.occurrenceCount || 1);
          return sum + rate;
        }, 0) / errors.length
      : 0;

    return {
      totalPatterns: patterns.length,
      totalSelectors: selectors.length,
      totalErrors: errors.length,
      totalFeedback: agentFeedbackList.length,
      totalBrandVoices: brandVoices.size,
      totalClientContexts: clientContexts.size,
      avgPatternSuccessRate: avgPatternSuccess,
      avgSelectorSuccessRate: avgSelectorSuccess,
      errorResolutionRate: errorResolution,
    };
  }
}

// ========================================
// EXPORTS
// ========================================

export const knowledgeService = KnowledgeService.getInstance();
