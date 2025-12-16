/**
 * Multi-Tab Browser Management Service
 *
 * Advanced multi-tab browser session management with:
 * - Tab groups for organized workflows
 * - Context isolation between tabs
 * - Intelligent tab orchestration
 * - Cross-tab data sharing
 * - Tab lifecycle management
 */

import { stagehandService } from '../stagehand.service';

// ========================================
// TYPES
// ========================================

export interface TabGroup {
  id: string;
  name: string;
  tabIds: string[];
  purpose: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface TabContext {
  tabId: string;
  sessionId: string;
  url: string;
  title: string;
  status: 'loading' | 'ready' | 'error' | 'closed';
  isolatedContext: boolean;
  cookies: Array<{ name: string; value: string; domain: string }>;
  localStorage?: Record<string, string>;
  groupId?: string;
}

export interface TabSwitchStrategy {
  strategy: 'round_robin' | 'priority' | 'random' | 'least_used';
  priorityOrder?: string[]; // Tab IDs in priority order
}

export interface TabOrchestrationPlan {
  id: string;
  steps: Array<{
    tabId: string;
    action: string;
    params: Record<string, any>;
    waitForResult?: boolean;
    dependsOn?: string; // Previous step ID
  }>;
  parallelGroups?: string[][]; // Groups of step IDs that can run in parallel
}

export interface CrossTabData {
  key: string;
  value: any;
  sourceTabId: string;
  timestamp: Date;
  ttl?: number; // Time to live in seconds
}

// ========================================
// MULTI-TAB SERVICE
// ========================================

class MultiTabService {
  private tabGroups: Map<string, TabGroup> = new Map();
  private tabContexts: Map<string, TabContext> = new Map();
  private crossTabData: Map<string, CrossTabData> = new Map();
  private tabUsageCount: Map<string, number> = new Map();

  // ========================================
  // TAB GROUP MANAGEMENT
  // ========================================

  /**
   * Create a new tab group
   */
  async createTabGroup(
    sessionId: string,
    name: string,
    purpose: string,
    initialTabCount: number = 1
  ): Promise<{ success: boolean; group?: TabGroup; error?: string }> {
    try {
      const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tabIds: string[] = [];

      // Create initial tabs for the group
      for (let i = 0; i < initialTabCount; i++) {
        const tabResult = await stagehandService.openTab(sessionId, undefined, true);
        if (tabResult.success && tabResult.tabId) {
          tabIds.push(tabResult.tabId);
          this.initializeTabContext(tabResult.tabId, sessionId, groupId);
        }
      }

      const group: TabGroup = {
        id: groupId,
        name,
        tabIds,
        purpose,
        createdAt: new Date(),
      };

      this.tabGroups.set(groupId, group);

      return { success: true, group };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tab group',
      };
    }
  }

  /**
   * Add a tab to an existing group
   */
  async addTabToGroup(
    sessionId: string,
    groupId: string,
    url?: string
  ): Promise<{ success: boolean; tabId?: string; error?: string }> {
    const group = this.tabGroups.get(groupId);
    if (!group) {
      return { success: false, error: 'Group not found' };
    }

    const tabResult = await stagehandService.openTab(sessionId, url, true);
    if (tabResult.success && tabResult.tabId) {
      group.tabIds.push(tabResult.tabId);
      this.initializeTabContext(tabResult.tabId, sessionId, groupId);
      return { success: true, tabId: tabResult.tabId };
    }

    return { success: false, error: tabResult.error || 'Failed to add tab' };
  }

  /**
   * Remove a tab from a group
   */
  async removeTabFromGroup(
    sessionId: string,
    groupId: string,
    tabId: string,
    closeTab: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    const group = this.tabGroups.get(groupId);
    if (!group) {
      return { success: false, error: 'Group not found' };
    }

    const tabIndex = group.tabIds.indexOf(tabId);
    if (tabIndex === -1) {
      return { success: false, error: 'Tab not in group' };
    }

    group.tabIds.splice(tabIndex, 1);
    this.tabContexts.delete(tabId);

    if (closeTab) {
      await stagehandService.closeTab(sessionId, tabId);
    }

    return { success: true };
  }

  /**
   * Get all tabs in a group
   */
  getGroupTabs(groupId: string): TabContext[] {
    const group = this.tabGroups.get(groupId);
    if (!group) return [];

    return group.tabIds
      .map((id) => this.tabContexts.get(id))
      .filter((ctx): ctx is TabContext => ctx !== undefined);
  }

  /**
   * Close an entire tab group
   */
  async closeTabGroup(
    sessionId: string,
    groupId: string
  ): Promise<{ success: boolean; closedCount: number; error?: string }> {
    const group = this.tabGroups.get(groupId);
    if (!group) {
      return { success: false, closedCount: 0, error: 'Group not found' };
    }

    let closedCount = 0;
    for (const tabId of group.tabIds) {
      const result = await stagehandService.closeTab(sessionId, tabId);
      if (result.success) {
        closedCount++;
        this.tabContexts.delete(tabId);
      }
    }

    this.tabGroups.delete(groupId);
    return { success: true, closedCount };
  }

  // ========================================
  // TAB CONTEXT ISOLATION
  // ========================================

  /**
   * Initialize context for a tab
   */
  private initializeTabContext(
    tabId: string,
    sessionId: string,
    groupId?: string
  ): void {
    const context: TabContext = {
      tabId,
      sessionId,
      url: 'about:blank',
      title: 'New Tab',
      status: 'ready',
      isolatedContext: false,
      cookies: [],
      groupId,
    };

    this.tabContexts.set(tabId, context);
    this.tabUsageCount.set(tabId, 0);
  }

  /**
   * Enable context isolation for a tab (separate cookies, localStorage)
   */
  async enableContextIsolation(
    sessionId: string,
    tabId: string
  ): Promise<{ success: boolean; error?: string }> {
    const context = this.tabContexts.get(tabId);
    if (!context) {
      return { success: false, error: 'Tab context not found' };
    }

    // Clear cookies for this tab's context
    // Note: Full isolation requires browser-level support
    context.isolatedContext = true;
    context.cookies = [];
    context.localStorage = {};

    return { success: true };
  }

  /**
   * Copy context from one tab to another
   */
  async copyTabContext(
    sessionId: string,
    sourceTabId: string,
    targetTabId: string
  ): Promise<{ success: boolean; error?: string }> {
    const sourceContext = this.tabContexts.get(sourceTabId);
    const targetContext = this.tabContexts.get(targetTabId);

    if (!sourceContext || !targetContext) {
      return { success: false, error: 'Tab context not found' };
    }

    targetContext.cookies = [...sourceContext.cookies];
    targetContext.localStorage = { ...sourceContext.localStorage };

    return { success: true };
  }

  // ========================================
  // INTELLIGENT TAB ORCHESTRATION
  // ========================================

  /**
   * Execute actions across multiple tabs with dependencies
   */
  async executeOrchestrationPlan(
    sessionId: string,
    plan: TabOrchestrationPlan
  ): Promise<{
    success: boolean;
    results: Map<string, { success: boolean; result?: any; error?: string }>;
    error?: string;
  }> {
    const results = new Map<string, { success: boolean; result?: any; error?: string }>();
    const completed = new Set<string>();

    // Build dependency graph
    const dependencyGraph = new Map<string, string | undefined>();
    for (const step of plan.steps) {
      dependencyGraph.set(step.tabId, step.dependsOn);
    }

    // Execute steps respecting dependencies
    const executeStep = async (step: typeof plan.steps[0]): Promise<void> => {
      // Wait for dependency if exists
      if (step.dependsOn && !completed.has(step.dependsOn)) {
        return; // Will be retried later
      }

      try {
        // Switch to the tab
        await stagehandService.switchTab(sessionId, step.tabId);
        this.incrementTabUsage(step.tabId);

        // Execute the action
        const result = await this.executeTabAction(
          sessionId,
          step.tabId,
          step.action,
          step.params
        );

        results.set(step.tabId, result);
        completed.add(step.tabId);
      } catch (error) {
        results.set(step.tabId, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    // Execute steps in order, respecting dependencies
    let iterations = 0;
    const maxIterations = plan.steps.length * 2; // Prevent infinite loops

    while (completed.size < plan.steps.length && iterations < maxIterations) {
      for (const step of plan.steps) {
        if (!completed.has(step.tabId)) {
          await executeStep(step);
        }
      }
      iterations++;
    }

    return {
      success: completed.size === plan.steps.length,
      results,
      error: completed.size < plan.steps.length ? 'Some steps failed to complete' : undefined,
    };
  }

  /**
   * Execute an action on a specific tab
   */
  private async executeTabAction(
    sessionId: string,
    tabId: string,
    action: string,
    params: Record<string, any>
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      switch (action) {
        case 'navigate':
          return await stagehandService.navigate(sessionId, params.url);

        case 'click':
          return await stagehandService.act(sessionId, `Click on ${params.selector}`);

        case 'type':
          return await stagehandService.act(
            sessionId,
            `Type "${params.text}" in ${params.selector}`
          );

        case 'extract':
          return await stagehandService.extract(
            sessionId,
            params.instruction,
            params.schema
          );

        case 'screenshot':
          return await stagehandService.screenshot(sessionId, params);

        case 'wait':
          return await stagehandService.waitFor(sessionId, params.type, params.value);

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Action failed',
      };
    }
  }

  /**
   * Select next tab based on strategy
   */
  selectNextTab(
    groupId: string,
    strategy: TabSwitchStrategy,
    excludeTabId?: string
  ): string | null {
    const group = this.tabGroups.get(groupId);
    if (!group || group.tabIds.length === 0) return null;

    const availableTabs = excludeTabId
      ? group.tabIds.filter((id) => id !== excludeTabId)
      : group.tabIds;

    if (availableTabs.length === 0) return null;

    switch (strategy.strategy) {
      case 'round_robin':
        // Simple round-robin based on usage count
        return availableTabs.reduce((min, id) => {
          const count = this.tabUsageCount.get(id) || 0;
          const minCount = this.tabUsageCount.get(min) || 0;
          return count < minCount ? id : min;
        }, availableTabs[0]);

      case 'priority':
        if (strategy.priorityOrder) {
          for (const tabId of strategy.priorityOrder) {
            if (availableTabs.includes(tabId)) {
              return tabId;
            }
          }
        }
        return availableTabs[0];

      case 'least_used':
        return availableTabs.reduce((min, id) => {
          const count = this.tabUsageCount.get(id) || 0;
          const minCount = this.tabUsageCount.get(min) || 0;
          return count < minCount ? id : min;
        }, availableTabs[0]);

      case 'random':
      default:
        return availableTabs[Math.floor(Math.random() * availableTabs.length)];
    }
  }

  private incrementTabUsage(tabId: string): void {
    const current = this.tabUsageCount.get(tabId) || 0;
    this.tabUsageCount.set(tabId, current + 1);
  }

  // ========================================
  // CROSS-TAB DATA SHARING
  // ========================================

  /**
   * Share data across tabs
   */
  shareData(
    sourceTabId: string,
    key: string,
    value: any,
    ttl?: number
  ): void {
    const data: CrossTabData = {
      key,
      value,
      sourceTabId,
      timestamp: new Date(),
      ttl,
    };

    this.crossTabData.set(key, data);
  }

  /**
   * Get shared data from any tab
   */
  getSharedData(key: string): CrossTabData | null {
    const data = this.crossTabData.get(key);
    if (!data) return null;

    // Check TTL
    if (data.ttl) {
      const elapsed = (Date.now() - data.timestamp.getTime()) / 1000;
      if (elapsed > data.ttl) {
        this.crossTabData.delete(key);
        return null;
      }
    }

    return data;
  }

  /**
   * Get all shared data from a specific source tab
   */
  getDataFromTab(sourceTabId: string): CrossTabData[] {
    const result: CrossTabData[] = [];
    for (const data of Array.from(this.crossTabData.values())) {
      if (data.sourceTabId === sourceTabId) {
        result.push(data);
      }
    }
    return result;
  }

  /**
   * Clear all shared data
   */
  clearSharedData(): void {
    this.crossTabData.clear();
  }

  // ========================================
  // TAB LIFECYCLE MANAGEMENT
  // ========================================

  /**
   * Get tab statistics
   */
  getTabStats(sessionId: string): {
    totalTabs: number;
    totalGroups: number;
    tabsByGroup: Record<string, number>;
    usageStats: Record<string, number>;
  } {
    const tabsByGroup: Record<string, number> = {};
    for (const [groupId, group] of Array.from(this.tabGroups.entries())) {
      tabsByGroup[group.name || groupId] = group.tabIds.length;
    }

    const usageStats: Record<string, number> = {};
    for (const [tabId, count] of Array.from(this.tabUsageCount.entries())) {
      const context = this.tabContexts.get(tabId);
      usageStats[context?.title || tabId] = count;
    }

    return {
      totalTabs: this.tabContexts.size,
      totalGroups: this.tabGroups.size,
      tabsByGroup,
      usageStats,
    };
  }

  /**
   * Clean up idle tabs
   */
  async cleanupIdleTabs(
    sessionId: string,
    maxIdleTime: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<{ closedCount: number; closedTabIds: string[] }> {
    const now = Date.now();
    const closedTabIds: string[] = [];

    // Note: In a full implementation, we'd track last activity time per tab
    // For now, just return empty as we don't have activity tracking yet
    return { closedCount: 0, closedTabIds };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.tabGroups.clear();
    this.tabContexts.clear();
    this.crossTabData.clear();
    this.tabUsageCount.clear();
  }
}

// Export singleton instance
export const multiTabService = new MultiTabService();

// Export factory function for testing
export function createMultiTabService(): MultiTabService {
  return new MultiTabService();
}
