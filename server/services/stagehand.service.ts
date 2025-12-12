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

export interface StagehandSession {
  id: string;
  stagehand: Stagehand;
  page: Page;
  context: BrowserContext;
  createdAt: Date;
  lastActivityAt: Date;
  status: 'active' | 'idle' | 'closed';
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

    for (const [sessionId, session] of this.sessions.entries()) {
      const idleTime = now.getTime() - session.lastActivityAt.getTime();
      if (idleTime > maxIdleTime && session.status === 'idle') {
        console.log(`[StagehandService] Cleaning up idle session: ${sessionId}`);
        await this.closeSession(sessionId);
      }
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

      const session: StagehandSession = {
        id: sessionId,
        stagehand,
        page,
        context,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        status: 'active',
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

      const result = await session.stagehand.extract({
        instruction,
        schema,
      });

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

      const observations = await session.stagehand.observe({
        instruction: instruction || 'What actions are available on this page?',
      });

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
}

// ========================================
// EXPORTS
// ========================================

export const stagehandService = StagehandService.getInstance();
export const ghlAutomation = new GHLAutomation();
