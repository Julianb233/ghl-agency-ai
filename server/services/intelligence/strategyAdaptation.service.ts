/**
 * Strategy Adaptation Service
 *
 * Dynamic strategy selection and learning:
 * - Context-aware strategy selection
 * - Performance-based adaptation
 * - Site-specific optimizations
 * - Learning from success/failure
 * - Strategy recommendations
 */

// ========================================
// TYPES
// ========================================

export interface ExecutionContext {
  executionId: string;
  sessionId: string;
  taskType: string;
  siteUrl: string;
  siteDomain: string;
  currentAction: string;
  pageState: PageAnalysis;
  historicalPerformance?: SitePerformance;
}

export interface PageAnalysis {
  url: string;
  title: string;
  domain: string;
  pageType: PageType;
  complexity: 'simple' | 'moderate' | 'complex';
  hasDynamicContent: boolean;
  hasIframes: boolean;
  hasShadowDOM: boolean;
  formCount: number;
  interactiveElements: number;
  loadTime: number;
  isAuthenticated: boolean;
  isSPA: boolean;
}

export type PageType =
  | 'login'
  | 'dashboard'
  | 'form'
  | 'listing'
  | 'detail'
  | 'checkout'
  | 'search'
  | 'settings'
  | 'unknown';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  applicablePageTypes: PageType[];
  applicableComplexity: ('simple' | 'moderate' | 'complex')[];
  settings: StrategySettings;
}

export interface StrategySettings {
  waitBeforeAction: number;
  waitAfterAction: number;
  useAIFallback: boolean;
  scrollBehavior: 'none' | 'into_view' | 'center' | 'smooth';
  retryOnFailure: boolean;
  maxRetries: number;
  timeout: number;
  useScreenshotVerification: boolean;
  clickMethod: 'native' | 'javascript' | 'coordinates';
  typeMethod: 'native' | 'clipboard' | 'javascript';
  navigationMethod: 'direct' | 'click' | 'history';
}

export interface SitePerformance {
  domain: string;
  totalActions: number;
  successfulActions: number;
  successRate: number;
  averageActionTime: number;
  failurePatterns: string[];
  effectiveStrategies: string[];
  lastUpdated: Date;
}

export interface StrategyRecommendation {
  strategyId: string;
  confidence: number;
  reasoning: string;
  adjustments?: Partial<StrategySettings>;
}

export interface AdaptationEvent {
  timestamp: Date;
  executionId: string;
  action: string;
  strategyUsed: string;
  success: boolean;
  duration: number;
  adjustmentsMade?: string[];
}

// ========================================
// CONSTANTS
// ========================================

const DEFAULT_STRATEGY: StrategySettings = {
  waitBeforeAction: 500,
  waitAfterAction: 500,
  useAIFallback: true,
  scrollBehavior: 'into_view',
  retryOnFailure: true,
  maxRetries: 3,
  timeout: 30000,
  useScreenshotVerification: false,
  clickMethod: 'native',
  typeMethod: 'native',
  navigationMethod: 'direct',
};

// ========================================
// STRATEGY ADAPTATION SERVICE
// ========================================

class StrategyAdaptationService {
  private strategies: Map<string, Strategy> = new Map();
  private sitePerformance: Map<string, SitePerformance> = new Map();
  private adaptationHistory: Map<string, AdaptationEvent[]> = new Map();
  private activeStrategies: Map<string, Strategy> = new Map(); // executionId -> strategy

  constructor() {
    this.registerDefaultStrategies();
  }

  // ========================================
  // STRATEGY REGISTRATION
  // ========================================

  private registerDefaultStrategies(): void {
    // Fast & Simple Strategy
    this.registerStrategy({
      id: 'fast_simple',
      name: 'Fast & Simple',
      description: 'Optimized for simple, fast-loading pages',
      applicablePageTypes: ['login', 'search', 'unknown'],
      applicableComplexity: ['simple'],
      settings: {
        ...DEFAULT_STRATEGY,
        waitBeforeAction: 200,
        waitAfterAction: 200,
        timeout: 15000,
        maxRetries: 2,
      },
    });

    // Careful Navigation Strategy
    this.registerStrategy({
      id: 'careful_navigation',
      name: 'Careful Navigation',
      description: 'For complex or slow pages, with extended waits',
      applicablePageTypes: ['dashboard', 'settings', 'checkout'],
      applicableComplexity: ['moderate', 'complex'],
      settings: {
        ...DEFAULT_STRATEGY,
        waitBeforeAction: 1000,
        waitAfterAction: 1000,
        timeout: 45000,
        scrollBehavior: 'smooth',
        useScreenshotVerification: true,
      },
    });

    // Form Filling Strategy
    this.registerStrategy({
      id: 'form_filling',
      name: 'Form Filling',
      description: 'Optimized for form interactions',
      applicablePageTypes: ['form', 'checkout', 'settings'],
      applicableComplexity: ['simple', 'moderate', 'complex'],
      settings: {
        ...DEFAULT_STRATEGY,
        waitBeforeAction: 300,
        waitAfterAction: 500,
        typeMethod: 'native',
        scrollBehavior: 'center',
        useScreenshotVerification: true,
      },
    });

    // SPA Strategy
    this.registerStrategy({
      id: 'spa_navigation',
      name: 'SPA Navigation',
      description: 'For Single Page Applications with dynamic content',
      applicablePageTypes: ['dashboard', 'listing', 'detail', 'search'],
      applicableComplexity: ['moderate', 'complex'],
      settings: {
        ...DEFAULT_STRATEGY,
        waitBeforeAction: 500,
        waitAfterAction: 1500,
        timeout: 45000,
        navigationMethod: 'click',
        useAIFallback: true,
      },
    });

    // Robust Fallback Strategy
    this.registerStrategy({
      id: 'robust_fallback',
      name: 'Robust Fallback',
      description: 'Maximum reliability with multiple fallbacks',
      applicablePageTypes: ['login', 'dashboard', 'form', 'listing', 'detail', 'checkout', 'search', 'settings', 'unknown'],
      applicableComplexity: ['simple', 'moderate', 'complex'],
      settings: {
        ...DEFAULT_STRATEGY,
        waitBeforeAction: 1000,
        waitAfterAction: 1500,
        timeout: 60000,
        maxRetries: 5,
        useAIFallback: true,
        useScreenshotVerification: true,
        clickMethod: 'javascript',
      },
    });

    // Dynamic Content Strategy
    this.registerStrategy({
      id: 'dynamic_content',
      name: 'Dynamic Content',
      description: 'For pages with heavy JavaScript and dynamic loading',
      applicablePageTypes: ['dashboard', 'listing', 'search'],
      applicableComplexity: ['complex'],
      settings: {
        ...DEFAULT_STRATEGY,
        waitBeforeAction: 800,
        waitAfterAction: 2000,
        timeout: 60000,
        scrollBehavior: 'smooth',
        useAIFallback: true,
      },
    });
  }

  registerStrategy(strategy: Strategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  // ========================================
  // STRATEGY SELECTION
  // ========================================

  /**
   * Select the best strategy for the current context
   */
  selectStrategy(context: ExecutionContext): StrategyRecommendation {
    const candidates: Array<{ strategy: Strategy; score: number; reasons: string[] }> = [];

    for (const strategy of Array.from(this.strategies.values())) {
      const { score, reasons } = this.evaluateStrategy(strategy, context);
      if (score > 0) {
        candidates.push({ strategy, score, reasons });
      }
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      // Fallback to robust strategy
      const fallback = this.strategies.get('robust_fallback')!;
      return {
        strategyId: fallback.id,
        confidence: 0.5,
        reasoning: 'No optimal strategy found, using robust fallback',
      };
    }

    const best = candidates[0];

    // Check site-specific performance data
    const sitePerf = this.sitePerformance.get(context.siteDomain);
    const adjustments = sitePerf
      ? this.applyLearnings(best.strategy.settings, sitePerf, context)
      : undefined;

    return {
      strategyId: best.strategy.id,
      confidence: Math.min(best.score / 100, 0.95),
      reasoning: best.reasons.join('; '),
      adjustments,
    };
  }

  private evaluateStrategy(
    strategy: Strategy,
    context: ExecutionContext
  ): { score: number; reasons: string[] } {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Check page type match
    if (strategy.applicablePageTypes.includes(context.pageState.pageType)) {
      score += 20;
      reasons.push(`Matches page type: ${context.pageState.pageType}`);
    } else if (strategy.applicablePageTypes.includes('unknown')) {
      score += 5;
      reasons.push('Generic strategy applicable');
    } else {
      score -= 20;
    }

    // Check complexity match
    if (strategy.applicableComplexity.includes(context.pageState.complexity)) {
      score += 15;
      reasons.push(`Matches complexity: ${context.pageState.complexity}`);
    } else {
      score -= 15;
    }

    // Bonus for SPA handling
    if (context.pageState.isSPA && strategy.id === 'spa_navigation') {
      score += 25;
      reasons.push('Optimized for SPA');
    }

    // Bonus for dynamic content handling
    if (context.pageState.hasDynamicContent && strategy.id === 'dynamic_content') {
      score += 20;
      reasons.push('Handles dynamic content');
    }

    // Check historical performance for this site
    const sitePerf = this.sitePerformance.get(context.siteDomain);
    if (sitePerf) {
      if (sitePerf.effectiveStrategies.includes(strategy.id)) {
        score += 30;
        reasons.push(`Previously effective on ${context.siteDomain}`);
      }
      if (sitePerf.successRate < 0.5) {
        // Site has low success rate, prefer robust strategies
        if (strategy.settings.maxRetries >= 3 && strategy.settings.useAIFallback) {
          score += 15;
          reasons.push('Robust strategy for challenging site');
        }
      }
    }

    return { score, reasons };
  }

  // ========================================
  // LEARNING & ADAPTATION
  // ========================================

  /**
   * Apply learnings from site performance to strategy settings
   */
  private applyLearnings(
    baseSettings: StrategySettings,
    sitePerf: SitePerformance,
    context: ExecutionContext
  ): Partial<StrategySettings> {
    const adjustments: Partial<StrategySettings> = {};

    // If site is slow, increase timeouts
    if (sitePerf.averageActionTime > 5000) {
      adjustments.timeout = Math.max(baseSettings.timeout, sitePerf.averageActionTime * 3);
      adjustments.waitBeforeAction = baseSettings.waitBeforeAction * 1.5;
      adjustments.waitAfterAction = baseSettings.waitAfterAction * 1.5;
    }

    // If success rate is low, be more careful
    if (sitePerf.successRate < 0.7) {
      adjustments.maxRetries = Math.max(baseSettings.maxRetries, 4);
      adjustments.useAIFallback = true;
      adjustments.useScreenshotVerification = true;
    }

    // If site has specific failure patterns, adjust accordingly
    for (const pattern of sitePerf.failurePatterns) {
      if (pattern.includes('element_not_found')) {
        adjustments.waitBeforeAction = (adjustments.waitBeforeAction || baseSettings.waitBeforeAction) * 1.5;
      }
      if (pattern.includes('timeout')) {
        adjustments.timeout = (adjustments.timeout || baseSettings.timeout) * 1.5;
      }
      if (pattern.includes('element_not_interactable')) {
        adjustments.scrollBehavior = 'center';
        adjustments.clickMethod = 'javascript';
      }
    }

    return Object.keys(adjustments).length > 0 ? adjustments : {};
  }

  /**
   * Record an action result for learning
   */
  recordActionResult(
    executionId: string,
    action: string,
    strategyId: string,
    success: boolean,
    duration: number,
    domain: string,
    adjustments?: string[]
  ): void {
    // Record adaptation event
    const event: AdaptationEvent = {
      timestamp: new Date(),
      executionId,
      action,
      strategyUsed: strategyId,
      success,
      duration,
      adjustmentsMade: adjustments,
    };

    if (!this.adaptationHistory.has(executionId)) {
      this.adaptationHistory.set(executionId, []);
    }
    this.adaptationHistory.get(executionId)!.push(event);

    // Update site performance
    this.updateSitePerformance(domain, strategyId, success, duration, action);
  }

  private updateSitePerformance(
    domain: string,
    strategyId: string,
    success: boolean,
    duration: number,
    action: string
  ): void {
    let perf = this.sitePerformance.get(domain);

    if (!perf) {
      perf = {
        domain,
        totalActions: 0,
        successfulActions: 0,
        successRate: 0,
        averageActionTime: 0,
        failurePatterns: [],
        effectiveStrategies: [],
        lastUpdated: new Date(),
      };
      this.sitePerformance.set(domain, perf);
    }

    // Update stats
    perf.totalActions++;
    if (success) {
      perf.successfulActions++;
      // Track effective strategy
      if (!perf.effectiveStrategies.includes(strategyId)) {
        perf.effectiveStrategies.push(strategyId);
      }
    } else {
      // Track failure pattern
      const pattern = `${action}:failed`;
      if (!perf.failurePatterns.includes(pattern)) {
        perf.failurePatterns.push(pattern);
      }
    }

    // Update averages
    perf.successRate = perf.successfulActions / perf.totalActions;
    perf.averageActionTime =
      (perf.averageActionTime * (perf.totalActions - 1) + duration) / perf.totalActions;
    perf.lastUpdated = new Date();

    // Keep only recent failure patterns (last 10)
    if (perf.failurePatterns.length > 10) {
      perf.failurePatterns = perf.failurePatterns.slice(-10);
    }

    // Keep only effective strategies (top 5)
    if (perf.effectiveStrategies.length > 5) {
      perf.effectiveStrategies = perf.effectiveStrategies.slice(-5);
    }
  }

  // ========================================
  // PAGE ANALYSIS
  // ========================================

  /**
   * Analyze page characteristics to inform strategy selection
   */
  async analyzePage(url: string, pageContent?: string): Promise<PageAnalysis> {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Determine page type from URL and content
    const pageType = this.inferPageType(url, pageContent);
    const complexity = this.estimateComplexity(pageContent);

    return {
      url,
      title: '', // Would be populated from actual page
      domain,
      pageType,
      complexity,
      hasDynamicContent: this.detectDynamicContent(pageContent),
      hasIframes: this.detectIframes(pageContent),
      hasShadowDOM: this.detectShadowDOM(pageContent),
      formCount: this.countForms(pageContent),
      interactiveElements: this.countInteractiveElements(pageContent),
      loadTime: 0, // Would be measured
      isAuthenticated: this.detectAuthentication(url, pageContent),
      isSPA: this.detectSPA(pageContent),
    };
  }

  private inferPageType(url: string, content?: string): PageType {
    const lowerUrl = url.toLowerCase();
    const lowerContent = content?.toLowerCase() || '';

    if (lowerUrl.includes('login') || lowerUrl.includes('signin') || lowerContent.includes('password')) {
      return 'login';
    }
    if (lowerUrl.includes('dashboard') || lowerUrl.includes('admin')) {
      return 'dashboard';
    }
    if (lowerUrl.includes('checkout') || lowerUrl.includes('payment')) {
      return 'checkout';
    }
    if (lowerUrl.includes('search') || lowerUrl.includes('q=')) {
      return 'search';
    }
    if (lowerUrl.includes('settings') || lowerUrl.includes('preferences')) {
      return 'settings';
    }
    if (lowerUrl.includes('list') || lowerContent.includes('results')) {
      return 'listing';
    }
    if (lowerContent.includes('<form')) {
      return 'form';
    }
    if (lowerUrl.match(/\/\d+$/) || lowerUrl.includes('/detail')) {
      return 'detail';
    }

    return 'unknown';
  }

  private estimateComplexity(content?: string): 'simple' | 'moderate' | 'complex' {
    if (!content) return 'moderate';

    const scriptTags = (content.match(/<script/gi) || []).length;
    const divTags = (content.match(/<div/gi) || []).length;
    const formElements = (content.match(/<(input|select|textarea)/gi) || []).length;

    if (scriptTags > 20 || divTags > 200 || formElements > 30) {
      return 'complex';
    }
    if (scriptTags > 5 || divTags > 50 || formElements > 10) {
      return 'moderate';
    }
    return 'simple';
  }

  private detectDynamicContent(content?: string): boolean {
    if (!content) return false;
    return (
      content.includes('React') ||
      content.includes('Vue') ||
      content.includes('Angular') ||
      content.includes('__NEXT') ||
      content.includes('data-reactroot')
    );
  }

  private detectIframes(content?: string): boolean {
    return content?.includes('<iframe') || false;
  }

  private detectShadowDOM(content?: string): boolean {
    return content?.includes('shadowRoot') || content?.includes('attachShadow') || false;
  }

  private countForms(content?: string): number {
    return (content?.match(/<form/gi) || []).length;
  }

  private countInteractiveElements(content?: string): number {
    if (!content) return 0;
    const buttons = (content.match(/<button/gi) || []).length;
    const inputs = (content.match(/<input/gi) || []).length;
    const links = (content.match(/<a\s/gi) || []).length;
    const selects = (content.match(/<select/gi) || []).length;
    return buttons + inputs + links + selects;
  }

  private detectAuthentication(url: string, content?: string): boolean {
    return (
      url.includes('auth') ||
      content?.includes('logout') ||
      content?.includes('signout') ||
      content?.includes('my-account') ||
      false
    );
  }

  private detectSPA(content?: string): boolean {
    return (
      content?.includes('__NEXT_DATA__') ||
      content?.includes('ng-app') ||
      content?.includes('data-reactroot') ||
      content?.includes('id="app"') ||
      content?.includes('id="root"') ||
      false
    );
  }

  // ========================================
  // ACTIVE STRATEGY MANAGEMENT
  // ========================================

  /**
   * Set active strategy for an execution
   */
  setActiveStrategy(executionId: string, strategyId: string): void {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      this.activeStrategies.set(executionId, strategy);
    }
  }

  /**
   * Get active strategy settings for an execution
   */
  getActiveSettings(executionId: string): StrategySettings {
    const strategy = this.activeStrategies.get(executionId);
    return strategy?.settings || DEFAULT_STRATEGY;
  }

  /**
   * Adjust active strategy settings dynamically
   */
  adjustActiveStrategy(
    executionId: string,
    adjustments: Partial<StrategySettings>
  ): void {
    const strategy = this.activeStrategies.get(executionId);
    if (strategy) {
      strategy.settings = { ...strategy.settings, ...adjustments };
    }
  }

  // ========================================
  // ANALYTICS
  // ========================================

  /**
   * Get performance analytics
   */
  getAnalytics(): {
    sitePerformance: SitePerformance[];
    strategyEffectiveness: Array<{ id: string; name: string; usageCount: number; successRate: number }>;
    adaptationEvents: number;
  } {
    const strategyUsage = new Map<string, { success: number; total: number }>();

    // Count strategy usage across all events
    for (const events of Array.from(this.adaptationHistory.values())) {
      for (const event of events) {
        const stats = strategyUsage.get(event.strategyUsed) || { success: 0, total: 0 };
        stats.total++;
        if (event.success) {
          stats.success++;
        }
        strategyUsage.set(event.strategyUsed, stats);
      }
    }

    const strategyEffectiveness = Array.from(this.strategies.entries()).map(([id, strategy]) => {
      const usage = strategyUsage.get(id) || { success: 0, total: 0 };
      return {
        id,
        name: strategy.name,
        usageCount: usage.total,
        successRate: usage.total > 0 ? usage.success / usage.total : 0,
      };
    });

    let totalEvents = 0;
    for (const events of Array.from(this.adaptationHistory.values())) {
      totalEvents += events.length;
    }

    return {
      sitePerformance: Array.from(this.sitePerformance.values()),
      strategyEffectiveness,
      adaptationEvents: totalEvents,
    };
  }

  /**
   * Clean up resources
   */
  cleanup(executionId?: string): void {
    if (executionId) {
      this.adaptationHistory.delete(executionId);
      this.activeStrategies.delete(executionId);
    } else {
      this.adaptationHistory.clear();
      this.activeStrategies.clear();
    }
  }
}

// Export singleton instance
export const strategyAdaptationService = new StrategyAdaptationService();

// Export factory function for testing
export function createStrategyAdaptationService(): StrategyAdaptationService {
  return new StrategyAdaptationService();
}
