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
 *
 * MIGRATED: Now uses PostgreSQL for persistence instead of in-memory Maps
 */

import { getDb } from '../db';
import { eq, and, desc, sql, gte, asc } from 'drizzle-orm';
import {
  actionPatterns as actionPatternsTable,
  elementSelectors as elementSelectorsTable,
  errorPatterns as errorPatternsTable,
  agentFeedback as agentFeedbackTable,
  brandVoices as brandVoicesTable,
  clientContexts as clientContextsTable,
} from '../../drizzle/schema-knowledge';

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
// LRU CACHE FOR PERFORMANCE
// ========================================

class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  values(): V[] {
    return Array.from(this.cache.values());
  }
}

// ========================================
// KNOWLEDGE SERVICE (DATABASE-BACKED)
// ========================================

export class KnowledgeService {
  private static instance: KnowledgeService;

  // LRU caches for performance
  private patternCache = new LRUCache<string, ActionPattern>(200);
  private selectorCache = new LRUCache<string, ElementSelector>(500);
  private errorCache = new LRUCache<string, ErrorPattern>(200);
  private brandVoiceCache = new LRUCache<number, BrandVoice>(100);
  private clientContextCache = new LRUCache<number, ClientContext>(100);

  private constructor() {
    // Initialize with default patterns on first use
    this.initializeDefaults();
  }

  public static getInstance(): KnowledgeService {
    if (!KnowledgeService.instance) {
      KnowledgeService.instance = new KnowledgeService();
    }
    return KnowledgeService.instance;
  }

  private async initializeDefaults(): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      // Check if we already have default patterns
      const existing = await db.select().from(actionPatternsTable).limit(1);
      if (existing.length === 0) {
        await this.loadDefaultPatterns();
      }
    } catch (error) {
      console.error('[Knowledge] Failed to initialize defaults:', error);
    }
  }

  // ========================================
  // ACTION PATTERNS
  // ========================================

  /**
   * Get action pattern for a task type
   */
  public async getActionPattern(taskType: string): Promise<ActionPattern | undefined> {
    // Check cache first
    const cached = this.patternCache.get(taskType);
    if (cached) return cached;

    try {
      const db = await getDb();
      if (!db) return undefined;

      const [result] = await db
        .select()
        .from(actionPatternsTable)
        .where(eq(actionPatternsTable.taskType, taskType))
        .limit(1);

      if (result) {
        const pattern: ActionPattern = {
          id: result.id,
          taskType: result.taskType,
          taskName: result.taskName,
          pageUrl: result.pageUrl || '',
          steps: (result.steps as ActionStep[]) || [],
          successCount: result.successCount,
          failureCount: result.failureCount,
          lastExecuted: result.lastExecuted || undefined,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        };
        this.patternCache.set(taskType, pattern);
        return pattern;
      }
      return undefined;
    } catch (error) {
      console.error('[Knowledge] Failed to get action pattern:', error);
      return undefined;
    }
  }

  /**
   * Store or update an action pattern
   */
  public async saveActionPattern(pattern: ActionPattern, userId?: number): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const existing = await this.getActionPattern(pattern.taskType);

      if (existing?.id) {
        // Update existing
        await db
          .update(actionPatternsTable)
          .set({
            taskName: pattern.taskName,
            pageUrl: pattern.pageUrl,
            steps: pattern.steps,
            updatedAt: new Date(),
          })
          .where(eq(actionPatternsTable.id, existing.id));

        pattern.id = existing.id;
        pattern.successCount = existing.successCount;
        pattern.failureCount = existing.failureCount;
      } else {
        // Insert new
        const [inserted] = await db
          .insert(actionPatternsTable)
          .values({
            userId: userId,
            taskType: pattern.taskType,
            taskName: pattern.taskName,
            pageUrl: pattern.pageUrl,
            steps: pattern.steps,
            successCount: 0,
            failureCount: 0,
          })
          .returning();

        pattern.id = inserted.id;
        pattern.successCount = 0;
        pattern.failureCount = 0;
      }

      pattern.updatedAt = new Date();
      this.patternCache.set(pattern.taskType, pattern);
    } catch (error) {
      console.error('[Knowledge] Failed to save action pattern:', error);
    }
  }

  /**
   * Record execution result for a pattern
   */
  public async recordPatternExecution(taskType: string, success: boolean): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const pattern = await this.getActionPattern(taskType);
      if (!pattern?.id) return;

      const now = new Date();
      const newSuccessCount = success ? pattern.successCount + 1 : pattern.successCount;
      const newFailureCount = success ? pattern.failureCount : pattern.failureCount + 1;

      await db
        .update(actionPatternsTable)
        .set({
          successCount: newSuccessCount,
          failureCount: newFailureCount,
          lastExecuted: now,
          updatedAt: now,
        })
        .where(eq(actionPatternsTable.id, pattern.id));

      // Update cache
      pattern.successCount = newSuccessCount;
      pattern.failureCount = newFailureCount;
      pattern.lastExecuted = now;
      pattern.updatedAt = now;
      this.patternCache.set(taskType, pattern);
    } catch (error) {
      console.error('[Knowledge] Failed to record pattern execution:', error);
    }
  }

  /**
   * Get all action patterns with metrics
   */
  public async getAllActionPatterns(): Promise<ActionPattern[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      const results = await db.select().from(actionPatternsTable);

      return results.map(r => ({
        id: r.id,
        taskType: r.taskType,
        taskName: r.taskName,
        pageUrl: r.pageUrl || '',
        steps: (r.steps as ActionStep[]) || [],
        successCount: r.successCount,
        failureCount: r.failureCount,
        lastExecuted: r.lastExecuted || undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    } catch (error) {
      console.error('[Knowledge] Failed to get all action patterns:', error);
      return [];
    }
  }

  /**
   * Get patterns sorted by success rate
   */
  public async getTopPerformingPatterns(limit: number = 10): Promise<ActionPattern[]> {
    const patterns = await this.getAllActionPatterns();
    return patterns
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
  public async getSelector(pagePath: string, elementName: string): Promise<ElementSelector | undefined> {
    const cacheKey = `${pagePath}:${elementName}`;
    const cached = this.selectorCache.get(cacheKey);
    if (cached) return cached;

    try {
      const db = await getDb();
      if (!db) return undefined;

      const [result] = await db
        .select()
        .from(elementSelectorsTable)
        .where(
          and(
            eq(elementSelectorsTable.pagePath, pagePath),
            eq(elementSelectorsTable.elementName, elementName)
          )
        )
        .limit(1);

      if (result) {
        const selector: ElementSelector = {
          id: result.id,
          pagePath: result.pagePath,
          elementName: result.elementName,
          primarySelector: result.primarySelector,
          fallbackSelectors: (result.fallbackSelectors as string[]) || [],
          successRate: result.successRate,
          totalAttempts: result.totalAttempts,
          lastVerified: result.lastVerified || undefined,
          screenshotRef: result.screenshotRef || undefined,
        };
        this.selectorCache.set(cacheKey, selector);
        return selector;
      }
      return undefined;
    } catch (error) {
      console.error('[Knowledge] Failed to get selector:', error);
      return undefined;
    }
  }

  /**
   * Save or update an element selector
   */
  public async saveSelector(selector: ElementSelector, userId?: number): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const cacheKey = `${selector.pagePath}:${selector.elementName}`;
      const existing = await this.getSelector(selector.pagePath, selector.elementName);

      if (existing?.id) {
        // Merge fallbacks
        const allFallbacks = new Set([
          ...existing.fallbackSelectors,
          ...selector.fallbackSelectors,
        ]);

        await db
          .update(elementSelectorsTable)
          .set({
            primarySelector: selector.primarySelector,
            fallbackSelectors: Array.from(allFallbacks),
            lastVerified: new Date(),
            screenshotRef: selector.screenshotRef,
            updatedAt: new Date(),
          })
          .where(eq(elementSelectorsTable.id, existing.id));

        selector.id = existing.id;
        selector.fallbackSelectors = Array.from(allFallbacks);
        selector.totalAttempts = existing.totalAttempts;
        selector.successRate = existing.successRate;
      } else {
        const [inserted] = await db
          .insert(elementSelectorsTable)
          .values({
            userId: userId,
            pagePath: selector.pagePath,
            elementName: selector.elementName,
            primarySelector: selector.primarySelector,
            fallbackSelectors: selector.fallbackSelectors,
            successRate: 1.0,
            totalAttempts: 0,
            lastVerified: new Date(),
            screenshotRef: selector.screenshotRef,
          })
          .returning();

        selector.id = inserted.id;
        selector.totalAttempts = 0;
        selector.successRate = 1.0;
      }

      selector.lastVerified = new Date();
      this.selectorCache.set(cacheKey, selector);
    } catch (error) {
      console.error('[Knowledge] Failed to save selector:', error);
    }
  }

  /**
   * Record selector usage result
   */
  public async recordSelectorUsage(
    pagePath: string,
    elementName: string,
    selectorUsed: string,
    success: boolean
  ): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const selector = await this.getSelector(pagePath, elementName);
      if (!selector?.id) return;

      const newAttempts = selector.totalAttempts + 1;
      // Exponential moving average for success rate
      const alpha = 0.1;
      const newSuccessRate = alpha * (success ? 1 : 0) + (1 - alpha) * selector.successRate;

      let newFallbacks = selector.fallbackSelectors;
      // If a fallback was used successfully, promote it
      if (success && selectorUsed !== selector.primarySelector) {
        newFallbacks = selector.fallbackSelectors.filter(s => s !== selectorUsed);
        newFallbacks.unshift(selectorUsed);
      }

      await db
        .update(elementSelectorsTable)
        .set({
          totalAttempts: newAttempts,
          successRate: newSuccessRate,
          fallbackSelectors: newFallbacks,
          lastVerified: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(elementSelectorsTable.id, selector.id));

      // Update cache
      selector.totalAttempts = newAttempts;
      selector.successRate = newSuccessRate;
      selector.fallbackSelectors = newFallbacks;
      selector.lastVerified = new Date();
      const cacheKey = `${pagePath}:${elementName}`;
      this.selectorCache.set(cacheKey, selector);
    } catch (error) {
      console.error('[Knowledge] Failed to record selector usage:', error);
    }
  }

  /**
   * Get all selectors for a page
   */
  public async getSelectorsForPage(pagePath: string): Promise<ElementSelector[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .select()
        .from(elementSelectorsTable)
        .where(eq(elementSelectorsTable.pagePath, pagePath));

      return results.map(r => ({
        id: r.id,
        pagePath: r.pagePath,
        elementName: r.elementName,
        primarySelector: r.primarySelector,
        fallbackSelectors: (r.fallbackSelectors as string[]) || [],
        successRate: r.successRate,
        totalAttempts: r.totalAttempts,
        lastVerified: r.lastVerified || undefined,
        screenshotRef: r.screenshotRef || undefined,
      }));
    } catch (error) {
      console.error('[Knowledge] Failed to get selectors for page:', error);
      return [];
    }
  }

  // ========================================
  // ERROR PATTERNS
  // ========================================

  /**
   * Record an error and get recovery suggestions
   */
  public async recordError(
    errorType: string,
    errorMessage: string,
    context: string,
    userId?: number
  ): Promise<RecoveryStrategy[]> {
    try {
      const db = await getDb();
      if (!db) return this.getDefaultRecoveryStrategies(errorType);

      const cacheKey = `${errorType}:${context}`;

      const [existing] = await db
        .select()
        .from(errorPatternsTable)
        .where(
          and(
            eq(errorPatternsTable.errorType, errorType),
            eq(errorPatternsTable.context, context)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(errorPatternsTable)
          .set({
            occurrenceCount: existing.occurrenceCount + 1,
            lastOccurred: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(errorPatternsTable.id, existing.id));

        const strategies = (existing.recoveryStrategies as RecoveryStrategy[]) || [];
        return strategies.sort((a, b) => b.successRate - a.successRate);
      } else {
        const defaultStrategies = this.getDefaultRecoveryStrategies(errorType);

        await db.insert(errorPatternsTable).values({
          userId: userId,
          errorType,
          errorMessage,
          context,
          recoveryStrategies: defaultStrategies,
          occurrenceCount: 1,
          resolvedCount: 0,
          lastOccurred: new Date(),
        });

        return defaultStrategies;
      }
    } catch (error) {
      console.error('[Knowledge] Failed to record error:', error);
      return this.getDefaultRecoveryStrategies(errorType);
    }
  }

  /**
   * Record that a recovery strategy worked
   */
  public async recordRecoverySuccess(
    errorType: string,
    context: string,
    strategyUsed: RecoveryStrategy['strategy']
  ): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const [pattern] = await db
        .select()
        .from(errorPatternsTable)
        .where(
          and(
            eq(errorPatternsTable.errorType, errorType),
            eq(errorPatternsTable.context, context)
          )
        )
        .limit(1);

      if (pattern) {
        const strategies = (pattern.recoveryStrategies as RecoveryStrategy[]) || [];
        const strategyIndex = strategies.findIndex(s => s.strategy === strategyUsed);

        if (strategyIndex !== -1) {
          strategies[strategyIndex].attempts++;
          const alpha = 0.1;
          strategies[strategyIndex].successRate =
            alpha * 1 + (1 - alpha) * strategies[strategyIndex].successRate;
        }

        await db
          .update(errorPatternsTable)
          .set({
            resolvedCount: pattern.resolvedCount + 1,
            recoveryStrategies: strategies,
            updatedAt: new Date(),
          })
          .where(eq(errorPatternsTable.id, pattern.id));
      }
    } catch (error) {
      console.error('[Knowledge] Failed to record recovery success:', error);
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
  public async submitFeedback(feedback: Omit<AgentFeedback, 'id' | 'createdAt'>): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      await db.insert(agentFeedbackTable).values({
        executionId: feedback.executionId,
        userId: feedback.userId,
        rating: feedback.rating,
        feedbackType: feedback.feedbackType,
        comment: feedback.comment,
        taskType: feedback.taskType,
        actionsTaken: feedback.actionsTaken || [],
        corrections: feedback.corrections,
      });

      // If corrections were provided, apply them
      if (feedback.corrections && feedback.taskType) {
        console.log(`[Knowledge] Applying corrections for ${feedback.taskType}: ${feedback.corrections}`);
      }
    } catch (error) {
      console.error('[Knowledge] Failed to submit feedback:', error);
    }
  }

  /**
   * Get feedback for analysis
   */
  public async getFeedback(filters?: {
    userId?: number;
    taskType?: string;
    rating?: number;
    limit?: number;
  }): Promise<AgentFeedback[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (filters?.userId) {
        conditions.push(eq(agentFeedbackTable.userId, filters.userId));
      }
      if (filters?.taskType) {
        conditions.push(eq(agentFeedbackTable.taskType, filters.taskType));
      }
      if (filters?.rating) {
        conditions.push(eq(agentFeedbackTable.rating, filters.rating));
      }

      const query = conditions.length > 0
        ? db.select().from(agentFeedbackTable).where(and(...conditions))
        : db.select().from(agentFeedbackTable);

      const results = await query
        .orderBy(desc(agentFeedbackTable.createdAt))
        .limit(filters?.limit || 100);

      return results.map(r => ({
        id: r.id,
        executionId: r.executionId || 0,
        userId: r.userId,
        rating: r.rating as 1 | 2 | 3 | 4 | 5,
        feedbackType: r.feedbackType as 'success' | 'partial' | 'failure' | 'suggestion',
        comment: r.comment || undefined,
        taskType: r.taskType || '',
        actionsTaken: (r.actionsTaken as ActionStep[]) || [],
        corrections: r.corrections || undefined,
        createdAt: r.createdAt,
      }));
    } catch (error) {
      console.error('[Knowledge] Failed to get feedback:', error);
      return [];
    }
  }

  /**
   * Get feedback statistics
   */
  public async getFeedbackStats(): Promise<{
    total: number;
    averageRating: number;
    byType: Record<string, number>;
    byRating: Record<number, number>;
  }> {
    const feedback = await this.getFeedback({ limit: 10000 });

    const total = feedback.length;
    const avgRating = total > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / total
      : 0;

    const byType: Record<string, number> = {};
    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    feedback.forEach(f => {
      byType[f.feedbackType] = (byType[f.feedbackType] || 0) + 1;
      byRating[f.rating] = (byRating[f.rating] || 0) + 1;
    });

    return { total, averageRating: avgRating, byType, byRating };
  }

  // ========================================
  // BRAND VOICE
  // ========================================

  /**
   * Get brand voice for a client
   */
  public async getBrandVoice(clientId: number): Promise<BrandVoice | undefined> {
    const cached = this.brandVoiceCache.get(clientId);
    if (cached) return cached;

    try {
      const db = await getDb();
      if (!db) return undefined;

      const [result] = await db
        .select()
        .from(brandVoicesTable)
        .where(eq(brandVoicesTable.clientId, clientId))
        .limit(1);

      if (result) {
        const voice: BrandVoice = {
          id: result.id,
          clientId: result.clientId,
          name: result.name,
          tone: (result.tone as string[]) || [],
          vocabulary: (result.vocabulary as string[]) || [],
          avoidWords: (result.avoidWords as string[]) || [],
          examples: (result.examples as BrandVoiceExample[]) || [],
          industry: result.industry || undefined,
          targetAudience: result.targetAudience || undefined,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        };
        this.brandVoiceCache.set(clientId, voice);
        return voice;
      }
      return undefined;
    } catch (error) {
      console.error('[Knowledge] Failed to get brand voice:', error);
      return undefined;
    }
  }

  /**
   * Save brand voice
   */
  public async saveBrandVoice(voice: BrandVoice, userId?: number): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const existing = await this.getBrandVoice(voice.clientId);

      if (existing?.id) {
        await db
          .update(brandVoicesTable)
          .set({
            name: voice.name,
            tone: voice.tone,
            vocabulary: voice.vocabulary,
            avoidWords: voice.avoidWords,
            examples: voice.examples,
            industry: voice.industry,
            targetAudience: voice.targetAudience,
            updatedAt: new Date(),
          })
          .where(eq(brandVoicesTable.id, existing.id));

        voice.id = existing.id;
      } else {
        const [inserted] = await db
          .insert(brandVoicesTable)
          .values({
            clientId: voice.clientId,
            userId: userId,
            name: voice.name,
            tone: voice.tone,
            vocabulary: voice.vocabulary,
            avoidWords: voice.avoidWords,
            examples: voice.examples,
            industry: voice.industry,
            targetAudience: voice.targetAudience,
          })
          .returning();

        voice.id = inserted.id;
      }

      voice.updatedAt = new Date();
      this.brandVoiceCache.set(voice.clientId, voice);
    } catch (error) {
      console.error('[Knowledge] Failed to save brand voice:', error);
    }
  }

  /**
   * Generate content prompt with brand voice
   */
  public async generateBrandPrompt(clientId: number, contentType: string): Promise<string> {
    const voice = await this.getBrandVoice(clientId);
    if (!voice) return '';

    let prompt = `Write in a ${voice.tone.join(', ')} tone.\n`;
    prompt += `Use words like: ${voice.vocabulary.slice(0, 10).join(', ')}.\n`;
    prompt += `Avoid using: ${voice.avoidWords.join(', ')}.\n`;

    if (voice.industry) {
      prompt += `Industry context: ${voice.industry}.\n`;
    }
    if (voice.targetAudience) {
      prompt += `Target audience: ${voice.targetAudience}.\n`;
    }

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
  public async getClientContext(clientId: number): Promise<ClientContext | undefined> {
    const cached = this.clientContextCache.get(clientId);
    if (cached) return cached;

    try {
      const db = await getDb();
      if (!db) return undefined;

      const [result] = await db
        .select()
        .from(clientContextsTable)
        .where(eq(clientContextsTable.clientId, clientId))
        .limit(1);

      if (result) {
        const context: ClientContext = {
          id: result.id,
          clientId: result.clientId,
          businessType: result.businessType,
          industry: result.industry,
          targetMarket: result.targetMarket || '',
          products: (result.products as string[]) || [],
          services: (result.services as string[]) || [],
          keyValues: (result.keyValues as string[]) || [],
          competitors: (result.competitors as string[]) || [],
          uniqueSellingPoints: (result.uniqueSellingPoints as string[]) || [],
          customerPersonas: (result.customerPersonas as CustomerPersona[]) || [],
          customFields: (result.customFields as Record<string, unknown>) || {},
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        };
        this.clientContextCache.set(clientId, context);
        return context;
      }
      return undefined;
    } catch (error) {
      console.error('[Knowledge] Failed to get client context:', error);
      return undefined;
    }
  }

  /**
   * Save client context
   */
  public async saveClientContext(context: ClientContext, userId?: number): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const existing = await this.getClientContext(context.clientId);

      if (existing?.id) {
        await db
          .update(clientContextsTable)
          .set({
            businessType: context.businessType,
            industry: context.industry,
            targetMarket: context.targetMarket,
            products: context.products,
            services: context.services,
            keyValues: context.keyValues,
            competitors: context.competitors,
            uniqueSellingPoints: context.uniqueSellingPoints,
            customerPersonas: context.customerPersonas,
            customFields: context.customFields,
            updatedAt: new Date(),
          })
          .where(eq(clientContextsTable.id, existing.id));

        context.id = existing.id;
      } else {
        const [inserted] = await db
          .insert(clientContextsTable)
          .values({
            clientId: context.clientId,
            userId: userId,
            businessType: context.businessType,
            industry: context.industry,
            targetMarket: context.targetMarket,
            products: context.products,
            services: context.services,
            keyValues: context.keyValues,
            competitors: context.competitors,
            uniqueSellingPoints: context.uniqueSellingPoints,
            customerPersonas: context.customerPersonas,
            customFields: context.customFields,
          })
          .returning();

        context.id = inserted.id;
      }

      context.updatedAt = new Date();
      this.clientContextCache.set(context.clientId, context);
    } catch (error) {
      console.error('[Knowledge] Failed to save client context:', error);
    }
  }

  /**
   * Generate context prompt for agent
   */
  public async generateContextPrompt(clientId: number): Promise<string> {
    const context = await this.getClientContext(clientId);
    if (!context) return '';

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
  // HELPER METHODS (for router compatibility)
  // ========================================

  public async getAllPatterns(): Promise<ActionPattern[]> {
    return this.getAllActionPatterns();
  }

  public async deletePattern(taskType: string): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      await db
        .delete(actionPatternsTable)
        .where(eq(actionPatternsTable.taskType, taskType));

      this.patternCache.delete(taskType);
      return true;
    } catch (error) {
      console.error('[Knowledge] Failed to delete pattern:', error);
      return false;
    }
  }

  public async getAllSelectors(pagePath?: string): Promise<ElementSelector[]> {
    if (pagePath) {
      return this.getSelectorsForPage(pagePath);
    }
    try {
      const db = await getDb();
      if (!db) return [];

      const results = await db.select().from(elementSelectorsTable);
      return results.map(r => ({
        id: r.id,
        pagePath: r.pagePath,
        elementName: r.elementName,
        primarySelector: r.primarySelector,
        fallbackSelectors: (r.fallbackSelectors as string[]) || [],
        successRate: r.successRate,
        totalAttempts: r.totalAttempts,
        lastVerified: r.lastVerified || undefined,
        screenshotRef: r.screenshotRef || undefined,
      }));
    } catch (error) {
      console.error('[Knowledge] Failed to get all selectors:', error);
      return [];
    }
  }

  public async getErrorStats(): Promise<{
    totalErrors: number;
    resolvedErrors: number;
    resolutionRate: number;
    byType: Record<string, { count: number; resolved: number }>;
    topStrategies: { strategy: string; successRate: number }[];
  }> {
    try {
      const db = await getDb();
      if (!db) return { totalErrors: 0, resolvedErrors: 0, resolutionRate: 0, byType: {}, topStrategies: [] };

      const errors = await db.select().from(errorPatternsTable);

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

      // Get top strategies
      const strategyStats = new Map<string, { total: number; weighted: number }>();
      errors.forEach(e => {
        const strategies = (e.recoveryStrategies as RecoveryStrategy[]) || [];
        strategies.forEach(s => {
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
    } catch (error) {
      console.error('[Knowledge] Failed to get error stats:', error);
      return { totalErrors: 0, resolvedErrors: 0, resolutionRate: 0, byType: {}, topStrategies: [] };
    }
  }

  public async getAllBrandVoices(): Promise<BrandVoice[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      const results = await db.select().from(brandVoicesTable);
      return results.map(r => ({
        id: r.id,
        clientId: r.clientId,
        name: r.name,
        tone: (r.tone as string[]) || [],
        vocabulary: (r.vocabulary as string[]) || [],
        avoidWords: (r.avoidWords as string[]) || [],
        examples: (r.examples as BrandVoiceExample[]) || [],
        industry: r.industry || undefined,
        targetAudience: r.targetAudience || undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    } catch (error) {
      console.error('[Knowledge] Failed to get all brand voices:', error);
      return [];
    }
  }

  public async getAllClientContexts(): Promise<ClientContext[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      const results = await db.select().from(clientContextsTable);
      return results.map(r => ({
        id: r.id,
        clientId: r.clientId,
        businessType: r.businessType,
        industry: r.industry,
        targetMarket: r.targetMarket || '',
        products: (r.products as string[]) || [],
        services: (r.services as string[]) || [],
        keyValues: (r.keyValues as string[]) || [],
        competitors: (r.competitors as string[]) || [],
        uniqueSellingPoints: (r.uniqueSellingPoints as string[]) || [],
        customerPersonas: (r.customerPersonas as CustomerPersona[]) || [],
        customFields: (r.customFields as Record<string, unknown>) || {},
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    } catch (error) {
      console.error('[Knowledge] Failed to get all client contexts:', error);
      return [];
    }
  }

  public async updateClientHistory(
    clientId: number,
    taskCompleted: boolean,
    issue?: string
  ): Promise<void> {
    console.log(`[Knowledge] Client ${clientId} history update: completed=${taskCompleted}, issue=${issue || 'none'}`);
  }

  public async getPatternRecommendations(
    taskDescription: string,
    clientId?: number
  ): Promise<{ pattern: ActionPattern; relevanceScore: number }[]> {
    const allPatterns = await this.getAllActionPatterns();
    const lowerDesc = taskDescription.toLowerCase();

    const scored = allPatterns.map(pattern => {
      let score = 0;

      const taskWords = pattern.taskType.toLowerCase().split('_');
      taskWords.forEach(word => {
        if (lowerDesc.includes(word)) score += 0.2;
      });

      const nameWords = pattern.taskName.toLowerCase().split(' ');
      nameWords.forEach(word => {
        if (lowerDesc.includes(word)) score += 0.15;
      });

      const successRate = pattern.successCount / (pattern.successCount + pattern.failureCount || 1);
      score += successRate * 0.3;

      return { pattern, relevanceScore: Math.min(score, 1.0) };
    });

    return scored
      .filter(r => r.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  public async getSystemStats(): Promise<{
    totalPatterns: number;
    totalSelectors: number;
    totalErrors: number;
    totalFeedback: number;
    totalBrandVoices: number;
    totalClientContexts: number;
    avgPatternSuccessRate: number;
    avgSelectorSuccessRate: number;
    errorResolutionRate: number;
  }> {
    try {
      const db = await getDb();
      if (!db) {
        return {
          totalPatterns: 0, totalSelectors: 0, totalErrors: 0, totalFeedback: 0,
          totalBrandVoices: 0, totalClientContexts: 0, avgPatternSuccessRate: 0,
          avgSelectorSuccessRate: 0, errorResolutionRate: 0,
        };
      }

      const patterns = await db.select().from(actionPatternsTable);
      const selectors = await db.select().from(elementSelectorsTable);
      const errors = await db.select().from(errorPatternsTable);
      const feedback = await db.select().from(agentFeedbackTable);
      const brandVoices = await db.select().from(brandVoicesTable);
      const clientContexts = await db.select().from(clientContextsTable);

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
        totalFeedback: feedback.length,
        totalBrandVoices: brandVoices.length,
        totalClientContexts: clientContexts.length,
        avgPatternSuccessRate: avgPatternSuccess,
        avgSelectorSuccessRate: avgSelectorSuccess,
        errorResolutionRate: errorResolution,
      };
    } catch (error) {
      console.error('[Knowledge] Failed to get system stats:', error);
      return {
        totalPatterns: 0, totalSelectors: 0, totalErrors: 0, totalFeedback: 0,
        totalBrandVoices: 0, totalClientContexts: 0, avgPatternSuccessRate: 0,
        avgSelectorSuccessRate: 0, errorResolutionRate: 0,
      };
    }
  }

  // ========================================
  // DEFAULT PATTERNS
  // ========================================

  private async loadDefaultPatterns(): Promise<void> {
    // GHL Workflow Creation Pattern
    await this.saveActionPattern({
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
    await this.saveActionPattern({
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
    await this.saveActionPattern({
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
    await this.saveSelector({
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

    await this.saveSelector({
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

    console.log('[Knowledge] Default patterns loaded to database');
  }
}

// ========================================
// EXPORTS
// ========================================

export const knowledgeService = KnowledgeService.getInstance();
