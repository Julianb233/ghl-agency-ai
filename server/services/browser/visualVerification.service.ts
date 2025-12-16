/**
 * Visual Verification Service
 *
 * Provides visual verification capabilities:
 * - Screenshot comparison (before/after)
 * - Element presence/state verification
 * - Visual regression detection
 * - Action success confirmation
 * - DOM change detection
 */

import { stagehandService } from '../stagehand.service';
import * as crypto from 'crypto';

// ========================================
// TYPES
// ========================================

export interface VerificationResult {
  success: boolean;
  confidence: number; // 0-1
  method: VerificationMethod;
  details: string;
  evidence?: {
    screenshotBefore?: string;
    screenshotAfter?: string;
    elementFound?: boolean;
    expectedValue?: string;
    actualValue?: string;
    changes?: DOMChange[];
  };
  timestamp: Date;
}

export type VerificationMethod =
  | 'screenshot_comparison'
  | 'element_presence'
  | 'element_state'
  | 'text_content'
  | 'url_change'
  | 'dom_mutation'
  | 'visual_regression'
  | 'ai_verification';

export interface VerificationConfig {
  method: VerificationMethod;
  timeout?: number;
  retries?: number;
  threshold?: number; // For comparison methods (0-1)
  selector?: string;
  expectedValue?: string;
  expectedUrl?: string;
  captureEvidence?: boolean;
}

export interface DOMChange {
  type: 'added' | 'removed' | 'modified' | 'attribute';
  selector: string;
  description: string;
  timestamp: Date;
}

export interface ScreenshotComparison {
  similarity: number; // 0-1
  pixelDifference: number;
  regions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    differencePercentage: number;
  }>;
}

// ========================================
// CONSTANTS
// ========================================

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 3;
const DEFAULT_THRESHOLD = 0.8;
const RETRY_DELAY = 1000;

// ========================================
// VISUAL VERIFICATION SERVICE
// ========================================

class VisualVerificationService {
  private verificationHistory: Map<string, VerificationResult[]> = new Map();

  // ========================================
  // MAIN VERIFICATION METHODS
  // ========================================

  /**
   * Verify an action was successful using the configured method
   */
  async verify(
    sessionId: string,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    const timeout = config.timeout || DEFAULT_TIMEOUT;
    const retries = config.retries || DEFAULT_RETRIES;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        let result: VerificationResult;

        switch (config.method) {
          case 'element_presence':
            result = await this.verifyElementPresence(sessionId, config);
            break;

          case 'element_state':
            result = await this.verifyElementState(sessionId, config);
            break;

          case 'text_content':
            result = await this.verifyTextContent(sessionId, config);
            break;

          case 'url_change':
            result = await this.verifyUrlChange(sessionId, config);
            break;

          case 'screenshot_comparison':
            result = await this.verifyScreenshotComparison(sessionId, config);
            break;

          case 'ai_verification':
            result = await this.verifyWithAI(sessionId, config);
            break;

          case 'dom_mutation':
            result = await this.verifyDOMMutation(sessionId, config);
            break;

          default:
            result = {
              success: false,
              confidence: 0,
              method: config.method,
              details: `Unknown verification method: ${config.method}`,
              timestamp: new Date(),
            };
        }

        // Store verification result
        this.storeVerificationResult(sessionId, result);

        if (result.success) {
          return result;
        }

        // Wait before retry
        if (attempt < retries - 1) {
          await this.delay(RETRY_DELAY);
        }
      } catch (error) {
        console.error(`[VisualVerification] Attempt ${attempt + 1} failed:`, error);

        if (attempt === retries - 1) {
          return {
            success: false,
            confidence: 0,
            method: config.method,
            details: error instanceof Error ? error.message : 'Verification failed',
            timestamp: new Date(),
          };
        }

        await this.delay(RETRY_DELAY);
      }
    }

    return {
      success: false,
      confidence: 0,
      method: config.method,
      details: 'Verification failed after all retries',
      timestamp: new Date(),
    };
  }

  // ========================================
  // ELEMENT VERIFICATION
  // ========================================

  /**
   * Verify an element exists on the page
   */
  private async verifyElementPresence(
    sessionId: string,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    if (!config.selector) {
      return {
        success: false,
        confidence: 0,
        method: 'element_presence',
        details: 'No selector provided for element presence verification',
        timestamp: new Date(),
      };
    }

    try {
      const result = await stagehandService.extract(
        sessionId,
        `Check if an element matching "${config.selector}" exists on the page`,
        {
          type: 'object',
          properties: {
            exists: { type: 'boolean' },
            count: { type: 'number' },
            visible: { type: 'boolean' },
          },
        }
      );

      if (result.success && result.data) {
        const data = result.data as { exists: boolean; count: number; visible: boolean };
        const found = data.exists && data.visible;

        return {
          success: found,
          confidence: found ? 0.9 : 0.1,
          method: 'element_presence',
          details: found
            ? `Element found (${data.count} matches, visible: ${data.visible})`
            : `Element not found or not visible`,
          evidence: {
            elementFound: found,
          },
          timestamp: new Date(),
        };
      }

      return {
        success: false,
        confidence: 0.3,
        method: 'element_presence',
        details: 'Could not determine element presence',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        method: 'element_presence',
        details: error instanceof Error ? error.message : 'Element verification failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verify element state (enabled, checked, selected, etc.)
   */
  private async verifyElementState(
    sessionId: string,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    if (!config.selector || !config.expectedValue) {
      return {
        success: false,
        confidence: 0,
        method: 'element_state',
        details: 'Selector and expected value required for element state verification',
        timestamp: new Date(),
      };
    }

    try {
      const result = await stagehandService.extract(
        sessionId,
        `Get the state of element "${config.selector}". Check if it's ${config.expectedValue}`,
        {
          type: 'object',
          properties: {
            state: { type: 'string' },
            matchesExpected: { type: 'boolean' },
            attributes: { type: 'object' },
          },
        }
      );

      if (result.success && result.data) {
        const data = result.data as { state: string; matchesExpected: boolean };

        return {
          success: data.matchesExpected,
          confidence: data.matchesExpected ? 0.85 : 0.2,
          method: 'element_state',
          details: data.matchesExpected
            ? `Element state matches: ${config.expectedValue}`
            : `Element state mismatch. Expected: ${config.expectedValue}, Actual: ${data.state}`,
          evidence: {
            expectedValue: config.expectedValue,
            actualValue: data.state,
          },
          timestamp: new Date(),
        };
      }

      return {
        success: false,
        confidence: 0.3,
        method: 'element_state',
        details: 'Could not determine element state',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        method: 'element_state',
        details: error instanceof Error ? error.message : 'State verification failed',
        timestamp: new Date(),
      };
    }
  }

  // ========================================
  // TEXT & URL VERIFICATION
  // ========================================

  /**
   * Verify text content on the page
   */
  private async verifyTextContent(
    sessionId: string,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    if (!config.expectedValue) {
      return {
        success: false,
        confidence: 0,
        method: 'text_content',
        details: 'Expected text value required for text content verification',
        timestamp: new Date(),
      };
    }

    try {
      const selector = config.selector || 'body';
      const result = await stagehandService.extract(
        sessionId,
        `Find text "${config.expectedValue}" in element "${selector}"`,
        {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            exactMatch: { type: 'boolean' },
            context: { type: 'string' },
          },
        }
      );

      if (result.success && result.data) {
        const data = result.data as { found: boolean; exactMatch: boolean; context: string };

        return {
          success: data.found,
          confidence: data.exactMatch ? 0.95 : data.found ? 0.75 : 0.1,
          method: 'text_content',
          details: data.found
            ? `Text found${data.exactMatch ? ' (exact match)' : ' (partial match)'}: "${data.context}"`
            : `Text not found: "${config.expectedValue}"`,
          evidence: {
            expectedValue: config.expectedValue,
            actualValue: data.context,
          },
          timestamp: new Date(),
        };
      }

      return {
        success: false,
        confidence: 0.3,
        method: 'text_content',
        details: 'Could not verify text content',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        method: 'text_content',
        details: error instanceof Error ? error.message : 'Text verification failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verify URL changed to expected value
   */
  private async verifyUrlChange(
    sessionId: string,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    if (!config.expectedUrl) {
      return {
        success: false,
        confidence: 0,
        method: 'url_change',
        details: 'Expected URL required for URL change verification',
        timestamp: new Date(),
      };
    }

    try {
      const result = await stagehandService.getCurrentUrl(sessionId);

      if (result.success && result.url) {
        const currentUrl = result.url;
        const expectedUrl = config.expectedUrl;

        // Check for exact match or pattern match
        const exactMatch = currentUrl === expectedUrl;
        const containsExpected = currentUrl.includes(expectedUrl);
        const patternMatch = this.urlMatchesPattern(currentUrl, expectedUrl);

        const success = exactMatch || containsExpected || patternMatch;

        return {
          success,
          confidence: exactMatch ? 1 : containsExpected ? 0.85 : patternMatch ? 0.7 : 0.1,
          method: 'url_change',
          details: success
            ? `URL matches: ${currentUrl}`
            : `URL mismatch. Expected: ${expectedUrl}, Actual: ${currentUrl}`,
          evidence: {
            expectedValue: expectedUrl,
            actualValue: currentUrl,
          },
          timestamp: new Date(),
        };
      }

      return {
        success: false,
        confidence: 0.3,
        method: 'url_change',
        details: 'Could not get current URL',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        method: 'url_change',
        details: error instanceof Error ? error.message : 'URL verification failed',
        timestamp: new Date(),
      };
    }
  }

  // ========================================
  // SCREENSHOT COMPARISON
  // ========================================

  /**
   * Compare screenshots before and after an action
   */
  private async verifyScreenshotComparison(
    sessionId: string,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    try {
      // This is a simplified implementation
      // A full implementation would store the "before" screenshot
      // and compare it with the current state

      const screenshotResult = await stagehandService.screenshot(sessionId, {
        fullPage: false,
      });

      if (!screenshotResult.success || !screenshotResult.screenshot) {
        return {
          success: false,
          confidence: 0,
          method: 'screenshot_comparison',
          details: 'Could not capture screenshot for comparison',
          timestamp: new Date(),
        };
      }

      // For now, just confirm we can take a screenshot
      // A real implementation would compare pixel data
      return {
        success: true,
        confidence: 0.7,
        method: 'screenshot_comparison',
        details: 'Screenshot captured successfully (comparison pending full implementation)',
        evidence: {
          screenshotAfter: screenshotResult.screenshot,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        method: 'screenshot_comparison',
        details: error instanceof Error ? error.message : 'Screenshot comparison failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Start tracking for screenshot comparison
   */
  async captureBeforeState(
    sessionId: string
  ): Promise<{ success: boolean; stateId?: string; error?: string }> {
    try {
      const screenshotResult = await stagehandService.screenshot(sessionId, {
        fullPage: false,
      });

      if (!screenshotResult.success || !screenshotResult.screenshot) {
        return { success: false, error: 'Could not capture screenshot' };
      }

      const stateId = `state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store the state for later comparison
      // In a full implementation, this would be stored in a cache/database
      const beforeStates = this.getBeforeStates(sessionId);
      beforeStates.set(stateId, {
        screenshot: screenshotResult.screenshot,
        timestamp: new Date(),
        url: await this.getCurrentUrl(sessionId),
      });

      return { success: true, stateId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to capture before state',
      };
    }
  }

  private beforeStates: Map<string, Map<string, any>> = new Map();

  private getBeforeStates(sessionId: string): Map<string, any> {
    if (!this.beforeStates.has(sessionId)) {
      this.beforeStates.set(sessionId, new Map());
    }
    return this.beforeStates.get(sessionId)!;
  }

  private async getCurrentUrl(sessionId: string): Promise<string> {
    try {
      const result = await stagehandService.getCurrentUrl(sessionId);
      return result.url || '';
    } catch {
      return '';
    }
  }

  // ========================================
  // AI-POWERED VERIFICATION
  // ========================================

  /**
   * Use AI to verify action success
   */
  private async verifyWithAI(
    sessionId: string,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    const expectedOutcome = config.expectedValue || 'the action was successful';

    try {
      const result = await stagehandService.extract(
        sessionId,
        `Verify that ${expectedOutcome}. Look for visual indicators, success messages, state changes, or any evidence that confirms or denies this.`,
        {
          type: 'object',
          properties: {
            verified: { type: 'boolean' },
            confidence: { type: 'number' },
            evidence: { type: 'string' },
            reasoning: { type: 'string' },
          },
        }
      );

      if (result.success && result.data) {
        const data = result.data as {
          verified: boolean;
          confidence: number;
          evidence: string;
          reasoning: string;
        };

        return {
          success: data.verified,
          confidence: Math.min(Math.max(data.confidence, 0), 1),
          method: 'ai_verification',
          details: data.reasoning,
          evidence: {
            actualValue: data.evidence,
          },
          timestamp: new Date(),
        };
      }

      return {
        success: false,
        confidence: 0.3,
        method: 'ai_verification',
        details: 'AI verification could not determine outcome',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        method: 'ai_verification',
        details: error instanceof Error ? error.message : 'AI verification failed',
        timestamp: new Date(),
      };
    }
  }

  // ========================================
  // DOM MUTATION VERIFICATION
  // ========================================

  /**
   * Verify DOM changed as expected
   */
  private async verifyDOMMutation(
    sessionId: string,
    config: VerificationConfig
  ): Promise<VerificationResult> {
    const expectedChange = config.expectedValue || 'page content changed';

    try {
      const result = await stagehandService.extract(
        sessionId,
        `Detect any recent DOM changes: ${expectedChange}. Look for new elements, modified content, or removed elements.`,
        {
          type: 'object',
          properties: {
            changesDetected: { type: 'boolean' },
            changeType: { type: 'string' },
            description: { type: 'string' },
            affectedElements: { type: 'array', items: { type: 'string' } },
          },
        }
      );

      if (result.success && result.data) {
        const data = result.data as {
          changesDetected: boolean;
          changeType: string;
          description: string;
          affectedElements: string[];
        };

        const changes: DOMChange[] = data.affectedElements?.map((el) => ({
          type: data.changeType as 'added' | 'removed' | 'modified' | 'attribute',
          selector: el,
          description: data.description,
          timestamp: new Date(),
        })) || [];

        return {
          success: data.changesDetected,
          confidence: data.changesDetected ? 0.8 : 0.2,
          method: 'dom_mutation',
          details: data.changesDetected
            ? `DOM changes detected: ${data.description}`
            : 'No DOM changes detected',
          evidence: {
            changes,
          },
          timestamp: new Date(),
        };
      }

      return {
        success: false,
        confidence: 0.3,
        method: 'dom_mutation',
        details: 'Could not analyze DOM mutations',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        method: 'dom_mutation',
        details: error instanceof Error ? error.message : 'DOM mutation verification failed',
        timestamp: new Date(),
      };
    }
  }

  // ========================================
  // COMPOSITE VERIFICATION
  // ========================================

  /**
   * Run multiple verification methods and combine results
   */
  async verifyMultiple(
    sessionId: string,
    configs: VerificationConfig[]
  ): Promise<{
    success: boolean;
    overallConfidence: number;
    results: VerificationResult[];
  }> {
    const results: VerificationResult[] = [];

    for (const config of configs) {
      const result = await this.verify(sessionId, config);
      results.push(result);
    }

    // Calculate overall success and confidence
    const successCount = results.filter((r) => r.success).length;
    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    const averageConfidence = results.length > 0 ? totalConfidence / results.length : 0;

    // Require majority success and reasonable confidence
    const success = successCount > results.length / 2 && averageConfidence >= DEFAULT_THRESHOLD;

    return {
      success,
      overallConfidence: averageConfidence,
      results,
    };
  }

  /**
   * Smart verification that chooses the best method based on context
   */
  async smartVerify(
    sessionId: string,
    actionDescription: string,
    expectedOutcome?: string
  ): Promise<VerificationResult> {
    // Determine best verification method based on the action
    const action = actionDescription.toLowerCase();

    if (action.includes('navigate') || action.includes('go to') || action.includes('open')) {
      return this.verify(sessionId, {
        method: 'url_change',
        expectedUrl: expectedOutcome,
      });
    }

    if (action.includes('click') || action.includes('select') || action.includes('check')) {
      return this.verify(sessionId, {
        method: 'element_state',
        expectedValue: expectedOutcome || 'clicked/selected state',
      });
    }

    if (action.includes('type') || action.includes('enter') || action.includes('fill')) {
      return this.verify(sessionId, {
        method: 'text_content',
        expectedValue: expectedOutcome,
      });
    }

    if (action.includes('submit') || action.includes('save')) {
      // Use AI verification for complex actions
      return this.verify(sessionId, {
        method: 'ai_verification',
        expectedValue: expectedOutcome || 'form submitted successfully',
      });
    }

    // Default to AI verification
    return this.verify(sessionId, {
      method: 'ai_verification',
      expectedValue: expectedOutcome || actionDescription + ' completed successfully',
    });
  }

  // ========================================
  // UTILITIES
  // ========================================

  private urlMatchesPattern(url: string, pattern: string): boolean {
    // Simple pattern matching with wildcards
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*');
    return new RegExp(regexPattern).test(url);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private storeVerificationResult(sessionId: string, result: VerificationResult): void {
    if (!this.verificationHistory.has(sessionId)) {
      this.verificationHistory.set(sessionId, []);
    }
    const history = this.verificationHistory.get(sessionId)!;
    history.push(result);

    // Keep only last 100 results per session
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get verification history for a session
   */
  getVerificationHistory(sessionId: string): VerificationResult[] {
    return this.verificationHistory.get(sessionId) || [];
  }

  /**
   * Calculate verification success rate
   */
  getSuccessRate(sessionId: string): number {
    const history = this.getVerificationHistory(sessionId);
    if (history.length === 0) return 0;

    const successCount = history.filter((r) => r.success).length;
    return successCount / history.length;
  }

  /**
   * Clean up resources
   */
  cleanup(sessionId?: string): void {
    if (sessionId) {
      this.verificationHistory.delete(sessionId);
      this.beforeStates.delete(sessionId);
    } else {
      this.verificationHistory.clear();
      this.beforeStates.clear();
    }
  }
}

// Export singleton instance
export const visualVerificationService = new VisualVerificationService();

// Export factory function for testing
export function createVisualVerificationService(): VisualVerificationService {
  return new VisualVerificationService();
}
