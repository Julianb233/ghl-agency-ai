/**
 * Stagehand AI Browser Automation Service
 * Combines Browserbase cloud browsers with Stagehand AI-powered automation
 *
 * Features:
 * - AI-powered browser actions via natural language
 * - Structured data extraction with schemas
 * - Action caching for cost reduction
 * - Session management and lifecycle
 * - GHL-specific automation helpers
 */

import { Stagehand } from '@browserbasehq/stagehand';
import type { Page, BrowserContext } from 'playwright-core';
import { browserbaseSDK, BrowserbaseSDKError } from '../_core/browserbaseSDK';

// ========================================
// TYPES & INTERFACES
// ========================================

export interface StagehandConfig {
  model?: 'anthropic' | 'openai' | 'gemini';
  cacheDir?: string;
  verbose?: 0 | 1 | 2;
  timeout?: number;
}

export interface TabInfo {
  id: string;
  page: any;
  title: string;
  url: string;
  createdAt: Date;
}

export interface StagehandSession {
  id: string;
  stagehand: Stagehand;
  page: any; // Stagehand's page type is compatible but not exact match with Page (default/primary tab)
  context: any; // Stagehand's context type is compatible but not exact match with BrowserContext
  createdAt: Date;
  lastActivityAt: Date;
  status: 'active' | 'idle' | 'closed';
  // Multi-tab support
  pages: Map<string, TabInfo>;
  activeTabId: string;
  // File handling
  downloads: Array<{ filename: string; path: string; timestamp: Date }>;
}

export interface ActResult {
  success: boolean;
  message: string;
  actionDescription?: string;
  actions?: Array<{
    selector: string;
    description: string;
    method: string;
    arguments: unknown[];
  }>;
  error?: string;
}

export interface ExtractResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ObserveResult {
  success: boolean;
  observations: Array<{
    selector: string;
    description: string;
    method: string;
    arguments: unknown[];
  }>;
  error?: string;
}

export interface ScreenshotResult {
  success: boolean;
  screenshot?: Buffer;
  base64?: string;
  error?: string;
}

export interface ActionVerificationResult {
  canProceed: boolean;
  issues: string[];
  elementInfo?: {
    exists: boolean;
    visible: boolean;
    enabled: boolean;
    selector: string;
  };
}

export interface UploadFileResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export interface DownloadInfo {
  filename: string;
  path: string;
  timestamp: Date;
  size?: number;
}

export interface PageStructureResult {
  success: boolean;
  structure?: {
    forms: Array<{ selector: string; action?: string; method?: string }>;
    links: Array<{ text: string; href: string; selector: string }>;
    buttons: Array<{ text: string; selector: string; type?: string }>;
    inputs: Array<{ type: string; name?: string; placeholder?: string; selector: string }>;
  };
  error?: string;
}

export interface ElementInspectionResult {
  success: boolean;
  element?: {
    tagName: string;
    attributes: Record<string, string>;
    text: string;
    html: string;
    isVisible: boolean;
    isEnabled: boolean;
    boundingBox?: { x: number; y: number; width: number; height: number };
  };
  error?: string;
}

// ========================================
// MODEL CONFIGURATION
// ========================================

function getModelConfig(modelType: 'anthropic' | 'openai' | 'gemini' = 'anthropic'): {
  modelName: string;
  apiKey: string | undefined;
} {
  switch (modelType) {
    case 'anthropic':
      return {
        modelName: 'anthropic/claude-sonnet-4-20250514',
        apiKey: process.env.ANTHROPIC_API_KEY,
      };
    case 'openai':
      return {
        modelName: 'openai/gpt-4o',
        apiKey: process.env.OPENAI_API_KEY,
      };
    case 'gemini':
      return {
        modelName: 'google/gemini-2.0-flash',
        apiKey: process.env.GEMINI_API_KEY,
      };
    default:
      return {
        modelName: 'anthropic/claude-sonnet-4-20250514',
        apiKey: process.env.ANTHROPIC_API_KEY,
      };
  }
}

// ========================================
// STAGEHAND SERVICE
// ========================================

export class StagehandService {
  private static instance: StagehandService;
  private sessions: Map<string, StagehandSession> = new Map();
  private defaultConfig: StagehandConfig;
  private cleanupInterval?: ReturnType<typeof setInterval>;

  private constructor(config: StagehandConfig = {}) {
    this.defaultConfig = {
      model: 'anthropic',
      cacheDir: './stagehand-cache',
      verbose: 1,
      timeout: 60000,
      ...config,
    };

    // Start cleanup interval for idle sessions
    this.startCleanupInterval();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: StagehandConfig): StagehandService {
    if (!StagehandService.instance) {
      StagehandService.instance = new StagehandService(config);
    }
    return StagehandService.instance;
  }

  /**
   * Start background cleanup for idle sessions
   */
  private startCleanupInterval(): void {
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Cleanup sessions idle for more than 10 minutes
   */
  private async cleanupIdleSessions(): Promise<void> {
    const now = new Date();
    const maxIdleTime = 10 * 60 * 1000; // 10 minutes

    const sessionsToCleanup = Array.from(this.sessions.entries())
      .filter(([_, session]) => {
        const idleTime = now.getTime() - session.lastActivityAt.getTime();
        return idleTime > maxIdleTime && session.status === 'idle';
      })
      .map(([sessionId]) => sessionId);

    for (const sessionId of sessionsToCleanup) {
      console.log(`[StagehandService] Cleaning up idle session: ${sessionId}`);
      await this.closeSession(sessionId);
    }
  }

  /**
   * Create a new Stagehand session
   */
  public async createSession(config?: Partial<StagehandConfig>): Promise<StagehandSession> {
    const mergedConfig = { ...this.defaultConfig, ...config };

    // Verify Browserbase credentials
    if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
      throw new Error('BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID are required');
    }

    const modelConfig = getModelConfig(mergedConfig.model);
    if (!modelConfig.apiKey) {
      throw new Error(`API key not found for model type: ${mergedConfig.model}`);
    }

    try {
      console.log('[StagehandService] Creating new session...');

      const stagehand = new Stagehand({
        env: 'BROWSERBASE',
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        verbose: mergedConfig.verbose,
        model: {
          modelName: modelConfig.modelName,
          apiKey: modelConfig.apiKey,
        },
      } as any);

      await stagehand.init();

      const context = stagehand.context;
      const pages = context.pages();
      const page = pages[0] || await context.newPage();

      // Generate unique session ID
      const sessionId = `stagehand_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Initialize primary tab
      const primaryTabId = `tab_${Date.now()}_0`;
      const pagesMap = new Map<string, TabInfo>();

      pagesMap.set(primaryTabId, {
        id: primaryTabId,
        page,
        title: await page.title().catch(() => 'New Tab'),
        url: page.url(),
        createdAt: new Date(),
      });

      const session: StagehandSession = {
        id: sessionId,
        stagehand,
        page,
        context,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        status: 'active',
        pages: pagesMap,
        activeTabId: primaryTabId,
        downloads: [],
      };

      this.sessions.set(sessionId, session);

      console.log(`[StagehandService] Session created: ${sessionId}`);
      return session;

    } catch (error) {
      console.error('[StagehandService] Failed to create session:', error);
      throw new Error(`Failed to create Stagehand session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get an existing session
   */
  public getSession(sessionId: string): StagehandSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session activity timestamp
   */
  private updateActivity(session: StagehandSession): void {
    session.lastActivityAt = new Date();
    session.status = 'active';
  }

  /**
   * Navigate to a URL
   */
  public async navigate(sessionId: string, url: string): Promise<{ success: boolean; title?: string; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      this.updateActivity(session);
      await session.page.goto(url, { waitUntil: 'domcontentloaded' });
      const title = await session.page.title();

      console.log(`[StagehandService] Navigated to: ${url} - Title: ${title}`);
      return { success: true, title };

    } catch (error) {
      console.error('[StagehandService] Navigation failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Execute an AI-powered action using natural language
   */
  public async act(
    sessionId: string,
    instruction: string,
    options?: {
      variables?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<ActResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, message: 'Session not found', error: 'Session not found' };
    }

    try {
      this.updateActivity(session);
      console.log(`[StagehandService] Executing action: ${instruction}`);

      // Stagehand v3 uses string argument for act()
      let actionInstruction = instruction;

      // Replace variables in instruction if provided
      if (options?.variables) {
        for (const [key, value] of Object.entries(options.variables)) {
          actionInstruction = actionInstruction.replace(new RegExp(`%${key}%`, 'g'), value);
        }
      }

      const result = await session.stagehand.act(actionInstruction);

      console.log(`[StagehandService] Action completed:`, result);

      return {
        success: true,
        message: 'Action executed successfully',
        actionDescription: typeof result === 'object' ? (result as any).actionDescription : undefined,
        actions: typeof result === 'object' ? (result as any).actions : undefined,
      };

    } catch (error) {
      console.error('[StagehandService] Action failed:', error);
      return {
        success: false,
        message: 'Action failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract structured data from the page using AI
   */
  public async extract<T = unknown>(
    sessionId: string,
    instruction: string,
    schema: Record<string, unknown>
  ): Promise<ExtractResult<T>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      this.updateActivity(session);
      console.log(`[StagehandService] Extracting data: ${instruction}`);

      const result = await session.stagehand.extract(instruction, schema);

      console.log(`[StagehandService] Extraction completed:`, result);

      return {
        success: true,
        data: result as T,
      };

    } catch (error) {
      console.error('[StagehandService] Extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Observe available actions on the current page
   */
  public async observe(sessionId: string, instruction?: string): Promise<ObserveResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, observations: [], error: 'Session not found' };
    }

    try {
      this.updateActivity(session);
      console.log(`[StagehandService] Observing page: ${instruction || 'general observation'}`);

      const observations = await session.stagehand.observe(
        instruction || 'What actions are available on this page?'
      );

      console.log(`[StagehandService] Found ${observations.length} observations`);

      return {
        success: true,
        observations: observations.map((obs: any) => ({
          selector: obs.selector || '',
          description: obs.description || '',
          method: obs.method || 'click',
          arguments: obs.arguments || [],
        })),
      };

    } catch (error) {
      console.error('[StagehandService] Observation failed:', error);
      return {
        success: false,
        observations: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Take a screenshot of the current page
   */
  public async screenshot(
    sessionId: string,
    options?: { fullPage?: boolean; returnBase64?: boolean }
  ): Promise<ScreenshotResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      this.updateActivity(session);

      const screenshot = await session.page.screenshot({
        type: 'png',
        fullPage: options?.fullPage ?? false,
      });

      console.log(`[StagehandService] Screenshot captured: ${screenshot.length} bytes`);

      const result: ScreenshotResult = {
        success: true,
        screenshot,
      };

      if (options?.returnBase64) {
        result.base64 = screenshot.toString('base64');
      }

      return result;

    } catch (error) {
      console.error('[StagehandService] Screenshot failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the current page URL
   */
  public async getCurrentUrl(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    this.updateActivity(session);
    return session.page.url();
  }

  /**
   * Get the current page title
   */
  public async getPageTitle(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    this.updateActivity(session);
    return session.page.title();
  }

  /**
   * Wait for a specific condition
   */
  public async waitFor(
    sessionId: string,
    condition: 'navigation' | 'selector' | 'timeout',
    value?: string | number
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      this.updateActivity(session);

      switch (condition) {
        case 'navigation':
          await session.page.waitForURL(value as string || '**/*');
          break;
        case 'selector':
          await session.page.waitForSelector(value as string);
          break;
        case 'timeout':
          await session.page.waitForTimeout(value as number || 1000);
          break;
      }

      return { success: true };

    } catch (error) {
      console.error('[StagehandService] Wait failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get debug/live view URL for the session
   */
  public async getDebugUrl(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    try {
      // Extract Browserbase session ID from Stagehand
      const browserbaseSessionId = (session.stagehand as any).sessionId;
      if (!browserbaseSessionId) return null;

      const debugInfo = await browserbaseSDK.getSessionDebug(browserbaseSessionId);
      return debugInfo.debuggerFullscreenUrl;

    } catch (error) {
      console.error('[StagehandService] Failed to get debug URL:', error);
      return null;
    }
  }

  /**
   * Close a session
   */
  public async closeSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      console.log(`[StagehandService] Closing session: ${sessionId}`);

      await session.stagehand.close();
      session.status = 'closed';
      this.sessions.delete(sessionId);

      console.log(`[StagehandService] Session closed: ${sessionId}`);
      return { success: true };

    } catch (error) {
      console.error('[StagehandService] Failed to close session:', error);
      // Still remove from map even if close fails
      this.sessions.delete(sessionId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List all active sessions
   */
  public listSessions(): Array<{
    id: string;
    createdAt: Date;
    lastActivityAt: Date;
    status: string;
  }> {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      status: s.status,
    }));
  }

  /**
   * Get session count
   */
  public getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    console.log('[StagehandService] Shutting down...');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all sessions
    const closePromises = Array.from(this.sessions.keys()).map(id => this.closeSession(id));
    await Promise.allSettled(closePromises);

    console.log('[StagehandService] Shutdown complete');
  }

  // ========================================
  // MULTI-TAB SUPPORT
  // ========================================

  /**
   * Open a new tab in the browser session
   */
  public async openTab(
    sessionId: string,
    url?: string,
    background?: boolean
  ): Promise<{ success: boolean; tabId?: string; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      this.updateActivity(session);

      // Create new page in the browser context
      const newPage = await session.context.newPage();

      // Navigate to URL if provided
      if (url) {
        await newPage.goto(url, { waitUntil: 'domcontentloaded' });
      }

      // Generate tab ID
      const tabId = `tab_${Date.now()}_${session.pages.size}`;

      // Store tab info
      const tabInfo: TabInfo = {
        id: tabId,
        page: newPage,
        title: await newPage.title().catch(() => 'New Tab'),
        url: newPage.url(),
        createdAt: new Date(),
      };

      session.pages.set(tabId, tabInfo);

      // Switch to new tab if not opening in background
      if (!background) {
        session.activeTabId = tabId;
        session.page = newPage;
      }

      console.log(`[StagehandService] Opened new tab: ${tabId} (background: ${background})`);
      return { success: true, tabId };

    } catch (error) {
      console.error('[StagehandService] Failed to open tab:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Switch to a specific tab
   */
  public async switchTab(
    sessionId: string,
    tabId: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const tabInfo = session.pages.get(tabId);
    if (!tabInfo) {
      return { success: false, error: `Tab not found: ${tabId}` };
    }

    try {
      this.updateActivity(session);
      session.activeTabId = tabId;
      session.page = tabInfo.page;

      console.log(`[StagehandService] Switched to tab: ${tabId}`);
      return { success: true };

    } catch (error) {
      console.error('[StagehandService] Failed to switch tab:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Close a specific tab
   */
  public async closeTab(
    sessionId: string,
    tabId: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const tabInfo = session.pages.get(tabId);
    if (!tabInfo) {
      return { success: false, error: `Tab not found: ${tabId}` };
    }

    // Prevent closing the last tab
    if (session.pages.size === 1) {
      return { success: false, error: 'Cannot close the last tab' };
    }

    try {
      this.updateActivity(session);

      // Close the page
      await tabInfo.page.close();

      // Remove from map
      session.pages.delete(tabId);

      // If this was the active tab, switch to first available tab
      if (session.activeTabId === tabId) {
        const firstTab = session.pages.values().next().value as TabInfo;
        session.activeTabId = firstTab.id;
        session.page = firstTab.page;
      }

      console.log(`[StagehandService] Closed tab: ${tabId}`);
      return { success: true };

    } catch (error) {
      console.error('[StagehandService] Failed to close tab:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * List all tabs in the session
   */
  public async listTabs(sessionId: string): Promise<{
    success: boolean;
    tabs?: Array<{ id: string; title: string; url: string; isActive: boolean }>;
    error?: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      this.updateActivity(session);

      const tabs = await Promise.all(
        Array.from(session.pages.entries()).map(async ([id, tabInfo]) => ({
          id,
          title: await tabInfo.page.title().catch(() => tabInfo.title),
          url: tabInfo.page.url(),
          isActive: id === session.activeTabId,
        }))
      );

      return { success: true, tabs };

    } catch (error) {
      console.error('[StagehandService] Failed to list tabs:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ========================================
  // FILE UPLOAD/DOWNLOAD
  // ========================================

  /**
   * Upload a file to a file input element
   */
  public async uploadFile(
    sessionId: string,
    selector: string,
    filePath: string
  ): Promise<UploadFileResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      this.updateActivity(session);

      // Set files on the file input
      await session.page.setInputFiles(selector, filePath);

      const filename = filePath.split('/').pop() || filePath;
      console.log(`[StagehandService] Uploaded file: ${filename} to ${selector}`);

      return { success: true, filename };

    } catch (error) {
      console.error('[StagehandService] Failed to upload file:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get list of downloaded files
   */
  public async getDownloads(sessionId: string): Promise<{
    success: boolean;
    downloads?: DownloadInfo[];
    error?: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      this.updateActivity(session);
      return { success: true, downloads: session.downloads };

    } catch (error) {
      console.error('[StagehandService] Failed to get downloads:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ========================================
  // ACTION VERIFICATION
  // ========================================

  /**
   * Verify action preconditions before executing
   */
  public async verifyActionPreconditions(
    sessionId: string,
    selector: string,
    actionType: 'click' | 'type' | 'navigate'
  ): Promise<ActionVerificationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { canProceed: false, issues: ['Session not found'] };
    }

    const issues: string[] = [];

    try {
      this.updateActivity(session);

      // Check if element exists
      const element = await session.page.$(selector);
      if (!element) {
        issues.push(`Element not found: ${selector}`);
        return {
          canProceed: false,
          issues,
          elementInfo: {
            exists: false,
            visible: false,
            enabled: false,
            selector,
          },
        };
      }

      // Check if element is visible
      const isVisible = await element.isVisible().catch(() => false);
      if (!isVisible) {
        issues.push(`Element is not visible: ${selector}`);
      }

      // Check if element is enabled (for clicks and typing)
      let isEnabled = true;
      if (actionType === 'click' || actionType === 'type') {
        isEnabled = await element.isEnabled().catch(() => false);
        if (!isEnabled) {
          issues.push(`Element is disabled: ${selector}`);
        }
      }

      return {
        canProceed: issues.length === 0,
        issues,
        elementInfo: {
          exists: true,
          visible: isVisible,
          enabled: isEnabled,
          selector,
        },
      };

    } catch (error) {
      console.error('[StagehandService] Verification failed:', error);
      return {
        canProceed: false,
        issues: [`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Verify action success after execution
   */
  public async verifyActionSuccess(
    sessionId: string,
    actionType: 'click' | 'type' | 'navigate',
    expectedChange: {
      urlPattern?: string;
      elementSelector?: string;
      elementProperty?: { selector: string; property: string; expectedValue: any };
    }
  ): Promise<{ success: boolean; changes: string[]; issues: string[] }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, changes: [], issues: ['Session not found'] };
    }

    const changes: string[] = [];
    const issues: string[] = [];

    try {
      this.updateActivity(session);

      // Verify URL change if expected
      if (expectedChange.urlPattern) {
        const currentUrl = session.page.url();
        const matches = new RegExp(expectedChange.urlPattern).test(currentUrl);
        if (matches) {
          changes.push(`URL changed to: ${currentUrl}`);
        } else {
          issues.push(`URL did not match expected pattern: ${expectedChange.urlPattern}`);
        }
      }

      // Verify element appeared if expected
      if (expectedChange.elementSelector) {
        const element = await session.page.$(expectedChange.elementSelector);
        if (element) {
          const isVisible = await element.isVisible().catch(() => false);
          if (isVisible) {
            changes.push(`Element appeared: ${expectedChange.elementSelector}`);
          } else {
            issues.push(`Element exists but not visible: ${expectedChange.elementSelector}`);
          }
        } else {
          issues.push(`Expected element not found: ${expectedChange.elementSelector}`);
        }
      }

      // Verify element property if expected
      if (expectedChange.elementProperty) {
        const { selector, property, expectedValue } = expectedChange.elementProperty;
        const element = await session.page.$(selector);
        if (element) {
          const actualValue = await element.evaluate(
            (el, prop) => (el as any)[prop],
            property
          );
          if (actualValue === expectedValue) {
            changes.push(`Property ${property} updated to: ${actualValue}`);
          } else {
            issues.push(`Property ${property} is ${actualValue}, expected ${expectedValue}`);
          }
        } else {
          issues.push(`Element not found for property check: ${selector}`);
        }
      }

      return {
        success: issues.length === 0,
        changes,
        issues,
      };

    } catch (error) {
      console.error('[StagehandService] Post-action verification failed:', error);
      return {
        success: false,
        changes,
        issues: [`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  // ========================================
  // DOM INSPECTION
  // ========================================

  /**
   * Inspect a specific element
   */
  public async inspectElement(
    sessionId: string,
    selector: string
  ): Promise<ElementInspectionResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      this.updateActivity(session);

      const element = await session.page.$(selector);
      if (!element) {
        return { success: false, error: `Element not found: ${selector}` };
      }

      const [tagName, attributes, text, html, isVisible, boundingBox] = await Promise.all([
        element.evaluate((el: any) => el.tagName.toLowerCase()),
        element.evaluate((el: any) => {
          const attrs: Record<string, string> = {};
          for (const attr of el.attributes) {
            attrs[attr.name] = attr.value;
          }
          return attrs;
        }),
        element.textContent().catch(() => ''),
        element.innerHTML().catch(() => ''),
        element.isVisible().catch(() => false),
        element.boundingBox().catch(() => null),
      ]);

      const isEnabled = await element.isEnabled().catch(() => true);

      return {
        success: true,
        element: {
          tagName,
          attributes,
          text,
          html,
          isVisible,
          isEnabled,
          boundingBox: boundingBox || undefined,
        },
      };

    } catch (error) {
      console.error('[StagehandService] Element inspection failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get page structure (forms, links, buttons, inputs)
   */
  public async getPageStructure(sessionId: string): Promise<PageStructureResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      this.updateActivity(session);

      const structure = await session.page.evaluate(() => {
        // Extract forms
        const forms = Array.from(document.querySelectorAll('form')).map((form, idx) => ({
          selector: form.id ? `#${form.id}` : `form:nth-of-type(${idx + 1})`,
          action: form.action,
          method: form.method,
        }));

        // Extract links
        const links = Array.from(document.querySelectorAll('a[href]'))
          .slice(0, 50) // Limit to first 50
          .map((link, idx) => ({
            text: link.textContent?.trim() || '',
            href: (link as HTMLAnchorElement).href,
            selector: link.id ? `#${link.id}` : `a:nth-of-type(${idx + 1})`,
          }));

        // Extract buttons
        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
          .slice(0, 50)
          .map((button, idx) => ({
            text: button.textContent?.trim() || (button as HTMLInputElement).value || '',
            selector: button.id ? `#${button.id}` : `button:nth-of-type(${idx + 1})`,
            type: (button as HTMLButtonElement).type || (button as HTMLInputElement).type,
          }));

        // Extract inputs
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
          .slice(0, 50)
          .map((input, idx) => {
            const inputEl = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            return {
              type: inputEl.tagName.toLowerCase() === 'input' ? (inputEl as HTMLInputElement).type : inputEl.tagName.toLowerCase(),
              name: inputEl.name,
              placeholder: 'placeholder' in inputEl ? inputEl.placeholder : undefined,
              selector: inputEl.id ? `#${inputEl.id}` : inputEl.name ? `[name="${inputEl.name}"]` : `input:nth-of-type(${idx + 1})`,
            };
          });

        return { forms, links, buttons, inputs };
      });

      return { success: true, structure };

    } catch (error) {
      console.error('[StagehandService] Failed to get page structure:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// ========================================
// GHL-SPECIFIC AUTOMATION HELPERS
// ========================================

export class GHLAutomation {
  private stagehand: StagehandService;

  constructor() {
    this.stagehand = StagehandService.getInstance();
  }

  /**
   * Login to GoHighLevel
   */
  public async login(
    sessionId: string,
    credentials: { email: string; password: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Navigate to GHL login
      await this.stagehand.navigate(sessionId, 'https://app.gohighlevel.com');

      // Type email
      await this.stagehand.act(sessionId, 'type into the email field', {
        variables: { value: credentials.email },
      });

      // Type password
      await this.stagehand.act(sessionId, 'type into the password field', {
        variables: { value: credentials.password },
      });

      // Click login
      await this.stagehand.act(sessionId, 'click the login button');

      // Wait for dashboard
      await this.stagehand.waitFor(sessionId, 'navigation', '**/dashboard**');

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Create a workflow in GHL
   */
  public async createWorkflow(
    sessionId: string,
    workflowConfig: {
      name: string;
      description?: string;
      triggers?: string[];
      actions?: string[];
    }
  ): Promise<{ success: boolean; workflowId?: string; error?: string }> {
    try {
      // Navigate to workflows
      await this.stagehand.act(sessionId, 'click on Automation in the sidebar');
      await this.stagehand.act(sessionId, 'click on Workflows');

      // Create new workflow
      await this.stagehand.act(sessionId, 'click the Create Workflow button');
      await this.stagehand.act(sessionId, `name the workflow "${workflowConfig.name}"`);

      if (workflowConfig.description) {
        await this.stagehand.act(sessionId, `add description "${workflowConfig.description}"`);
      }

      // Add triggers if specified
      if (workflowConfig.triggers && workflowConfig.triggers.length > 0) {
        for (const trigger of workflowConfig.triggers) {
          await this.stagehand.act(sessionId, `add trigger: ${trigger}`);
        }
      }

      // Add actions if specified
      if (workflowConfig.actions && workflowConfig.actions.length > 0) {
        for (const action of workflowConfig.actions) {
          await this.stagehand.act(sessionId, `add action: ${action}`);
        }
      }

      // Save workflow
      await this.stagehand.act(sessionId, 'save the workflow');

      // Extract workflow ID from URL
      const url = await this.stagehand.getCurrentUrl(sessionId);
      const workflowIdMatch = url?.match(/workflows\/([^\/]+)/);

      return {
        success: true,
        workflowId: workflowIdMatch?.[1],
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Workflow creation failed',
      };
    }
  }

  /**
   * Navigate to a specific GHL module
   */
  public async navigateToModule(
    sessionId: string,
    module: 'contacts' | 'conversations' | 'calendar' | 'opportunities' | 'marketing' | 'automation' | 'sites' | 'settings'
  ): Promise<{ success: boolean; error?: string }> {
    const moduleMap: Record<string, string> = {
      contacts: 'Contacts',
      conversations: 'Conversations',
      calendar: 'Calendars',
      opportunities: 'Opportunities',
      marketing: 'Marketing',
      automation: 'Automation',
      sites: 'Sites',
      settings: 'Settings',
    };

    try {
      await this.stagehand.act(sessionId, `click on ${moduleMap[module]} in the sidebar`);
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed',
      };
    }
  }

  /**
   * Extract contact information from GHL
   */
  public async extractContactInfo(sessionId: string): Promise<ExtractResult<{
    name: string;
    email: string;
    phone?: string;
    tags?: string[];
  }>> {
    return this.stagehand.extract(sessionId, 'Extract the contact information including name, email, phone, and tags', {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Contact full name' },
        email: { type: 'string', description: 'Contact email address' },
        phone: { type: 'string', description: 'Contact phone number' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Contact tags',
        },
      },
      required: ['name', 'email'],
    });
  }

  /**
   * Task 3.1: Create a new sub-account in GHL
   * Complexity: Level 4 (Advanced)
   * Estimated time: 15-30 minutes
   * Cost: $0.30-$0.50 per action
   */
  public async createSubAccount(
    sessionId: string,
    config: {
      businessName: string;
      email: string;
      phone?: string;
      timezone?: string;
      address?: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
      branding?: {
        logoUrl?: string;
        primaryColor?: string;
        companyName?: string;
      };
      users?: Array<{
        email: string;
        firstName: string;
        lastName: string;
        role?: 'admin' | 'user';
      }>;
      templateSnapshot?: string; // Snapshot ID to import
    }
  ): Promise<{
    success: boolean;
    subAccountId?: string;
    subAccountName?: string;
    error?: string;
    steps?: Array<{ step: string; success: boolean; duration: number }>;
  }> {
    const startTime = Date.now();
    const steps: Array<{ step: string; success: boolean; duration: number }> = [];

    const recordStep = (step: string, success: boolean, stepStart: number) => {
      steps.push({ step, success, duration: Date.now() - stepStart });
    };

    try {
      // Step 1: Navigate to Agency View / Sub-Accounts
      let stepStart = Date.now();
      console.log('[GHLAutomation] Step 1: Navigating to sub-accounts...');

      await this.stagehand.act(sessionId, 'Click on the Agency/Settings icon in the bottom left sidebar');
      await this.stagehand.waitFor(sessionId, 'timeout', 1500);
      await this.stagehand.act(sessionId, 'Click on Sub-Accounts or Accounts in the menu');
      await this.stagehand.waitFor(sessionId, 'timeout', 2000);
      recordStep('Navigate to sub-accounts', true, stepStart);

      // Step 2: Click Create Sub-Account
      stepStart = Date.now();
      console.log('[GHLAutomation] Step 2: Creating new sub-account...');

      await this.stagehand.act(sessionId, 'Click the "Add Sub-Account" or "Create Sub-Account" button');
      await this.stagehand.waitFor(sessionId, 'timeout', 2000);
      recordStep('Open create sub-account form', true, stepStart);

      // Step 3: Fill in business information
      stepStart = Date.now();
      console.log('[GHLAutomation] Step 3: Filling business information...');

      await this.stagehand.act(sessionId, `Type "${config.businessName}" into the business name or company name field`);
      await this.stagehand.act(sessionId, `Type "${config.email}" into the email field`);

      if (config.phone) {
        await this.stagehand.act(sessionId, `Type "${config.phone}" into the phone number field`);
      }

      if (config.timezone) {
        await this.stagehand.act(sessionId, `Select "${config.timezone}" from the timezone dropdown`);
      }
      recordStep('Fill business information', true, stepStart);

      // Step 4: Fill address if provided
      if (config.address) {
        stepStart = Date.now();
        console.log('[GHLAutomation] Step 4: Filling address...');

        if (config.address.street) {
          await this.stagehand.act(sessionId, `Type "${config.address.street}" into the street address field`);
        }
        if (config.address.city) {
          await this.stagehand.act(sessionId, `Type "${config.address.city}" into the city field`);
        }
        if (config.address.state) {
          await this.stagehand.act(sessionId, `Type or select "${config.address.state}" for the state field`);
        }
        if (config.address.postalCode) {
          await this.stagehand.act(sessionId, `Type "${config.address.postalCode}" into the postal code or zip code field`);
        }
        if (config.address.country) {
          await this.stagehand.act(sessionId, `Select "${config.address.country}" from the country dropdown`);
        }
        recordStep('Fill address information', true, stepStart);
      }

      // Step 5: Apply template/snapshot if provided
      if (config.templateSnapshot) {
        stepStart = Date.now();
        console.log('[GHLAutomation] Step 5: Applying template snapshot...');

        await this.stagehand.act(sessionId, 'Click on "Use Snapshot" or template option');
        await this.stagehand.waitFor(sessionId, 'timeout', 1500);
        await this.stagehand.act(sessionId, `Select the snapshot or template with ID or name "${config.templateSnapshot}"`);
        recordStep('Apply template snapshot', true, stepStart);
      }

      // Step 6: Save/Create the sub-account
      stepStart = Date.now();
      console.log('[GHLAutomation] Step 6: Saving sub-account...');

      await this.stagehand.act(sessionId, 'Click the Save, Create, or Submit button to create the sub-account');
      await this.stagehand.waitFor(sessionId, 'timeout', 5000); // Wait for creation
      recordStep('Save sub-account', true, stepStart);

      // Step 7: Extract the created sub-account ID
      stepStart = Date.now();
      console.log('[GHLAutomation] Step 7: Extracting sub-account details...');

      const extractResult = await this.stagehand.extract<{
        subAccountId: string;
        subAccountName: string;
      }>(sessionId, 'Extract the sub-account ID and name from the current page or URL', {
        type: 'object',
        properties: {
          subAccountId: { type: 'string', description: 'The sub-account ID from the URL or page' },
          subAccountName: { type: 'string', description: 'The sub-account business name' },
        },
        required: ['subAccountId', 'subAccountName'],
      });
      recordStep('Extract sub-account details', extractResult.success, stepStart);

      // Step 8: Configure branding if provided
      if (config.branding && extractResult.success) {
        stepStart = Date.now();
        console.log('[GHLAutomation] Step 8: Configuring branding...');

        await this.stagehand.act(sessionId, 'Navigate to Settings or Business Profile');
        await this.stagehand.waitFor(sessionId, 'timeout', 2000);

        if (config.branding.companyName) {
          await this.stagehand.act(sessionId, `Update the company name to "${config.branding.companyName}"`);
        }
        if (config.branding.primaryColor) {
          await this.stagehand.act(sessionId, `Set the primary brand color to "${config.branding.primaryColor}"`);
        }
        if (config.branding.logoUrl) {
          await this.stagehand.act(sessionId, 'Click on upload logo or change logo');
          // Note: Logo upload via URL may require additional handling
        }

        await this.stagehand.act(sessionId, 'Save the branding changes');
        recordStep('Configure branding', true, stepStart);
      }

      // Step 9: Add users if provided
      if (config.users && config.users.length > 0 && extractResult.success) {
        stepStart = Date.now();
        console.log('[GHLAutomation] Step 9: Adding users...');

        await this.stagehand.act(sessionId, 'Navigate to Team or Users section in Settings');
        await this.stagehand.waitFor(sessionId, 'timeout', 2000);

        for (const user of config.users) {
          await this.stagehand.act(sessionId, 'Click Add User or Invite Team Member button');
          await this.stagehand.waitFor(sessionId, 'timeout', 1000);
          await this.stagehand.act(sessionId, `Type "${user.email}" into the email field`);
          await this.stagehand.act(sessionId, `Type "${user.firstName}" into the first name field`);
          await this.stagehand.act(sessionId, `Type "${user.lastName}" into the last name field`);

          if (user.role) {
            await this.stagehand.act(sessionId, `Select "${user.role}" role from the role dropdown`);
          }

          await this.stagehand.act(sessionId, 'Click Save or Send Invite button');
          await this.stagehand.waitFor(sessionId, 'timeout', 2000);
        }
        recordStep(`Add ${config.users.length} users`, true, stepStart);
      }

      const totalDuration = Date.now() - startTime;
      console.log(`[GHLAutomation] Sub-account creation completed in ${totalDuration}ms`);

      return {
        success: true,
        subAccountId: extractResult.data?.subAccountId,
        subAccountName: extractResult.data?.subAccountName || config.businessName,
        steps,
      };

    } catch (error) {
      console.error('[GHLAutomation] Sub-account creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sub-account creation failed',
        steps,
      };
    }
  }

  /**
   * Switch to a specific sub-account
   */
  public async switchToSubAccount(
    sessionId: string,
    subAccountIdentifier: string // Can be name or ID
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[GHLAutomation] Switching to sub-account: ${subAccountIdentifier}`);

      // Click on account switcher (usually in top-left or top-right)
      await this.stagehand.act(sessionId, 'Click on the account switcher or sub-account dropdown in the header');
      await this.stagehand.waitFor(sessionId, 'timeout', 1500);

      // Search/select the sub-account
      await this.stagehand.act(sessionId, `Search for or click on sub-account "${subAccountIdentifier}"`);
      await this.stagehand.waitFor(sessionId, 'timeout', 3000);

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to switch sub-account',
      };
    }
  }

  /**
   * List all sub-accounts
   */
  public async listSubAccounts(sessionId: string): Promise<ExtractResult<{
    subAccounts: Array<{
      id: string;
      name: string;
      email?: string;
      status?: string;
    }>;
  }>> {
    try {
      // Navigate to sub-accounts list
      await this.stagehand.act(sessionId, 'Click on the Agency/Settings icon in the sidebar');
      await this.stagehand.waitFor(sessionId, 'timeout', 1500);
      await this.stagehand.act(sessionId, 'Click on Sub-Accounts or Accounts');
      await this.stagehand.waitFor(sessionId, 'timeout', 2000);

      // Extract all sub-accounts
      return this.stagehand.extract(sessionId, 'Extract all sub-accounts from the list including their ID, name, email, and status', {
        type: 'object',
        properties: {
          subAccounts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Sub-account ID' },
                name: { type: 'string', description: 'Business name' },
                email: { type: 'string', description: 'Email address' },
                status: { type: 'string', description: 'Account status (active, paused, etc.)' },
              },
              required: ['id', 'name'],
            },
            description: 'List of all sub-accounts',
          },
        },
        required: ['subAccounts'],
      });

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list sub-accounts',
      };
    }
  }
}

// ========================================
// EXPORTS
// ========================================

export const stagehandService = StagehandService.getInstance();
export const ghlAutomation = new GHLAutomation();
