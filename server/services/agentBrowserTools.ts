/**
 * Agent Browser Automation Tools
 * Provides browser automation capabilities for the AI agent
 *
 * These tools enable the agent to:
 * - Create and manage browser sessions
 * - Navigate to URLs
 * - Perform AI-powered actions using natural language
 * - Extract structured data from pages
 * - Take screenshots
 * - Interact with GoHighLevel
 */

import { stagehandService, ghlAutomation } from './stagehand.service';
import type Anthropic from '@anthropic-ai/sdk';

// ========================================
// TYPES
// ========================================

export interface BrowserToolState {
  activeSessionId: string | null;
  sessions: Map<string, {
    id: string;
    createdAt: Date;
    url: string;
  }>;
}

// ========================================
// TOOL IMPLEMENTATIONS
// ========================================

/**
 * Browser tool implementations that can be registered with the agent orchestrator
 */
export const browserTools = {
  /**
   * Create a new browser session
   */
  browser_create_session: async (_params: {
    model?: 'anthropic' | 'openai' | 'gemini';
    userId?: number;
    executionId?: number;
  }): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
  }> => {
    try {
      const session = await stagehandService.createSession({
        model: _params.model || 'anthropic',
        userId: _params.userId,
        executionId: _params.executionId,
      });

      return {
        success: true,
        sessionId: session.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
      };
    }
  },

  /**
   * Navigate to a URL
   */
  browser_navigate: async (params: {
    sessionId: string;
    url: string;
  }): Promise<{
    success: boolean;
    title?: string;
    error?: string;
  }> => {
    return stagehandService.navigate(params.sessionId, params.url);
  },

  /**
   * Perform an AI-powered action using natural language
   */
  browser_act: async (params: {
    sessionId: string;
    instruction: string;
    variables?: Record<string, string>;
  }): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> => {
    const result = await stagehandService.act(
      params.sessionId,
      params.instruction,
      { variables: params.variables }
    );

    return {
      success: result.success,
      message: result.message,
      error: result.error,
    };
  },

  /**
   * Extract structured data from the current page
   */
  browser_extract: async (params: {
    sessionId: string;
    instruction: string;
    schema: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }> => {
    return stagehandService.extract(
      params.sessionId,
      params.instruction,
      params.schema
    );
  },

  /**
   * Observe available actions on the current page
   */
  browser_observe: async (params: {
    sessionId: string;
    instruction?: string;
  }): Promise<{
    success: boolean;
    observations?: Array<{
      description: string;
      selector: string;
    }>;
    error?: string;
  }> => {
    const result = await stagehandService.observe(params.sessionId, params.instruction);

    return {
      success: result.success,
      observations: result.observations?.map(o => ({
        description: o.description,
        selector: o.selector,
      })),
      error: result.error,
    };
  },

  /**
   * Take a screenshot of the current page
   */
  browser_screenshot: async (params: {
    sessionId: string;
    fullPage?: boolean;
  }): Promise<{
    success: boolean;
    base64?: string;
    error?: string;
  }> => {
    const result = await stagehandService.screenshot(params.sessionId, {
      fullPage: params.fullPage,
      returnBase64: true,
    });

    return {
      success: result.success,
      base64: result.base64,
      error: result.error,
    };
  },

  /**
   * Get the current page URL
   */
  browser_get_url: async (params: {
    sessionId: string;
  }): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> => {
    const url = await stagehandService.getCurrentUrl(params.sessionId);
    return {
      success: url !== null,
      url: url || undefined,
      error: url === null ? 'Session not found' : undefined,
    };
  },

  /**
   * Wait for a condition
   */
  browser_wait: async (params: {
    sessionId: string;
    type: 'navigation' | 'selector' | 'timeout';
    value?: string | number;
  }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    return stagehandService.waitFor(
      params.sessionId,
      params.type,
      params.value
    );
  },

  /**
   * Close a browser session
   */
  browser_close_session: async (params: {
    sessionId: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    return stagehandService.closeSession(params.sessionId);
  },

  /**
   * Get the live view URL for debugging
   */
  browser_get_debug_url: async (params: {
    sessionId: string;
  }): Promise<{
    success: boolean;
    debugUrl?: string;
    error?: string;
  }> => {
    const debugUrl = await stagehandService.getDebugUrl(params.sessionId);
    return {
      success: debugUrl !== null,
      debugUrl: debugUrl || undefined,
      error: debugUrl === null ? 'Could not get debug URL' : undefined,
    };
  },

  // ========================================
  // MULTI-TAB SUPPORT
  // ========================================

  /**
   * Open a new tab in the browser session
   */
  browser_open_tab: async (params: {
    sessionId: string;
    url?: string;
    background?: boolean;
  }): Promise<{
    success: boolean;
    tabId?: string;
    error?: string;
  }> => {
    return stagehandService.openTab(params.sessionId, params.url, params.background);
  },

  /**
   * Switch to a specific tab
   */
  browser_switch_tab: async (params: {
    sessionId: string;
    tabId: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    return stagehandService.switchTab(params.sessionId, params.tabId);
  },

  /**
   * Close a specific tab
   */
  browser_close_tab: async (params: {
    sessionId: string;
    tabId: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    return stagehandService.closeTab(params.sessionId, params.tabId);
  },

  /**
   * List all open tabs
   */
  browser_list_tabs: async (params: {
    sessionId: string;
  }): Promise<{
    success: boolean;
    tabs?: Array<{ id: string; title: string; url: string; isActive: boolean }>;
    error?: string;
  }> => {
    return stagehandService.listTabs(params.sessionId);
  },

  // ========================================
  // FILE UPLOAD/DOWNLOAD
  // ========================================

  /**
   * Upload a file to a file input element
   */
  browser_upload_file: async (params: {
    sessionId: string;
    selector: string;
    filePath: string;
  }): Promise<{
    success: boolean;
    filename?: string;
    error?: string;
  }> => {
    return stagehandService.uploadFile(params.sessionId, params.selector, params.filePath);
  },

  /**
   * Get list of downloaded files
   */
  browser_get_downloads: async (params: {
    sessionId: string;
  }): Promise<{
    success: boolean;
    downloads?: Array<{ filename: string; path: string; timestamp: Date; size?: number }>;
    error?: string;
  }> => {
    return stagehandService.getDownloads(params.sessionId);
  },

  // ========================================
  // ACTION VERIFICATION
  // ========================================

  /**
   * Verify action preconditions before executing
   */
  browser_verify_action: async (params: {
    sessionId: string;
    selector: string;
    actionType: 'click' | 'type' | 'navigate';
  }): Promise<{
    canProceed: boolean;
    issues: string[];
    elementInfo?: {
      exists: boolean;
      visible: boolean;
      enabled: boolean;
      selector: string;
    };
  }> => {
    return stagehandService.verifyActionPreconditions(
      params.sessionId,
      params.selector,
      params.actionType
    );
  },

  /**
   * Verify action success after execution
   */
  browser_verify_success: async (params: {
    sessionId: string;
    actionType: 'click' | 'type' | 'navigate';
    expectedChange: {
      urlPattern?: string;
      elementSelector?: string;
      elementProperty?: { selector: string; property: string; expectedValue: any };
    };
  }): Promise<{
    success: boolean;
    changes: string[];
    issues: string[];
  }> => {
    return stagehandService.verifyActionSuccess(
      params.sessionId,
      params.actionType,
      params.expectedChange
    );
  },

  // ========================================
  // DOM INSPECTION
  // ========================================

  /**
   * Inspect a specific element
   */
  browser_inspect_element: async (params: {
    sessionId: string;
    selector: string;
  }): Promise<{
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
  }> => {
    return stagehandService.inspectElement(params.sessionId, params.selector);
  },

  /**
   * Get page structure (forms, links, buttons, inputs)
   */
  browser_get_page_structure: async (params: {
    sessionId: string;
  }): Promise<{
    success: boolean;
    structure?: {
      forms: Array<{ selector: string; action?: string; method?: string }>;
      links: Array<{ text: string; href: string; selector: string }>;
      buttons: Array<{ text: string; selector: string; type?: string }>;
      inputs: Array<{ type: string; name?: string; placeholder?: string; selector: string }>;
    };
    error?: string;
  }> => {
    return stagehandService.getPageStructure(params.sessionId);
  },

  // ========================================
  // GHL-SPECIFIC TOOLS
  // ========================================

  /**
   * Login to GoHighLevel
   */
  ghl_login: async (params: {
    sessionId: string;
    email: string;
    password: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    return ghlAutomation.login(params.sessionId, {
      email: params.email,
      password: params.password,
    });
  },

  /**
   * Navigate to a GHL module
   */
  ghl_navigate_module: async (params: {
    sessionId: string;
    module: 'contacts' | 'conversations' | 'calendar' | 'opportunities' | 'marketing' | 'automation' | 'sites' | 'settings';
  }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    return ghlAutomation.navigateToModule(params.sessionId, params.module);
  },

  /**
   * Create a workflow in GHL
   */
  ghl_create_workflow: async (params: {
    sessionId: string;
    name: string;
    description?: string;
    triggers?: string[];
    actions?: string[];
  }): Promise<{
    success: boolean;
    workflowId?: string;
    error?: string;
  }> => {
    return ghlAutomation.createWorkflow(params.sessionId, {
      name: params.name,
      description: params.description,
      triggers: params.triggers,
      actions: params.actions,
    });
  },

  /**
   * Extract contact info from current GHL page
   */
  ghl_extract_contact: async (params: {
    sessionId: string;
  }): Promise<{
    success: boolean;
    contact?: {
      name: string;
      email: string;
      phone?: string;
      tags?: string[];
    };
    error?: string;
  }> => {
    const result = await ghlAutomation.extractContactInfo(params.sessionId);
    return {
      success: result.success,
      contact: result.data,
      error: result.error,
    };
  },

  // ========================================
  // MATCH TOOL - MULTI-PAGE COMPARISON
  // ========================================

  /**
   * Match pattern across multiple browser pages
   */
  browser_match_pattern: async (params: {
    sessionId: string;
    pattern: string;
    pages?: string; // Comma-separated tab IDs
    matchType?: 'regex' | 'exact' | 'fuzzy' | 'contains';
    selector?: string;
    caseSensitive?: boolean;
    maxMatches?: number;
  }): Promise<{
    success: boolean;
    results?: Array<{
      tabId: string;
      url: string;
      title: string;
      matchCount: number;
      matches: Array<{ content: string; context?: string }>;
    }>;
    totalMatches?: number;
    error?: string;
  }> => {
    try {
      const { MatchTool } = await import('./tools/MatchTool');
      const matchTool = new MatchTool();

      const result = await matchTool.execute(
        {
          action: 'match',
          ...params,
          pages: params.pages?.split(',').map(p => p.trim()),
        },
        { userId: 0, sessionId: params.sessionId }
      );

      return {
        success: result.success,
        results: (result.data as any)?.results,
        totalMatches: (result.data as any)?.totalMatches,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pattern matching failed',
      };
    }
  },

  /**
   * Compare two browser pages
   */
  browser_compare_pages: async (params: {
    sessionId: string;
    tabId1: string;
    tabId2: string;
    compareType?: 'text' | 'structure' | 'visual' | 'all';
    selector?: string;
    threshold?: number;
  }): Promise<{
    success: boolean;
    similarity?: number;
    identical?: boolean;
    passesThreshold?: boolean;
    differences?: Array<{
      type: 'added' | 'removed' | 'changed';
      description: string;
      oldValue?: string;
      newValue?: string;
    }>;
    summary?: string;
    error?: string;
  }> => {
    try {
      const { MatchTool } = await import('./tools/MatchTool');
      const matchTool = new MatchTool();

      const result = await matchTool.execute(
        {
          action: 'compare',
          ...params,
        },
        { userId: 0, sessionId: params.sessionId }
      );

      return {
        success: result.success,
        similarity: (result.data as any)?.result?.similarity,
        identical: (result.data as any)?.result?.identical,
        passesThreshold: (result.data as any)?.passesThreshold,
        differences: (result.data as any)?.result?.differences,
        summary: (result.data as any)?.result?.summary,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Page comparison failed',
      };
    }
  },

  /**
   * Find differences across multiple page snapshots
   */
  browser_find_differences: async (params: {
    sessionId: string;
    snapshots: string; // JSON string of snapshot array
    diffType?: 'text' | 'structure' | 'visual';
    ignoreWhitespace?: boolean;
    ignoreCase?: boolean;
  }): Promise<{
    success: boolean;
    snapshotCount?: number;
    comparisons?: Array<{
      from: string;
      to: string;
      similarity: number;
      identical: boolean;
      differences: unknown[];
    }>;
    summary?: string;
    error?: string;
  }> => {
    try {
      const { MatchTool } = await import('./tools/MatchTool');
      const matchTool = new MatchTool();

      const result = await matchTool.execute(
        {
          action: 'diff',
          ...params,
        },
        { userId: 0, sessionId: params.sessionId }
      );

      return {
        success: result.success,
        snapshotCount: (result.data as any)?.snapshotCount,
        comparisons: (result.data as any)?.comparisons,
        summary: (result.data as any)?.summary,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Difference detection failed',
      };
    }
  },

  /**
   * Extract all pattern matches from a page
   */
  browser_extract_matches: async (params: {
    sessionId: string;
    pattern: string;
    tabId?: string;
    matchType?: 'regex' | 'exact' | 'fuzzy';
    extractType?: 'text' | 'html' | 'attributes' | 'links' | 'images';
    selector?: string;
  }): Promise<{
    success: boolean;
    matches?: Array<{
      content: string;
      selector?: string;
      attributes?: Record<string, string>;
      href?: string;
      src?: string;
    }>;
    totalMatches?: number;
    error?: string;
  }> => {
    try {
      const { MatchTool } = await import('./tools/MatchTool');
      const matchTool = new MatchTool();

      const result = await matchTool.execute(
        {
          action: 'extract',
          ...params,
        },
        { userId: 0, sessionId: params.sessionId }
      );

      return {
        success: result.success,
        matches: (result.data as any)?.matches,
        totalMatches: (result.data as any)?.totalMatches,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Match extraction failed',
      };
    }
  },
};

// ========================================
// CLAUDE TOOL DEFINITIONS
// ========================================

/**
 * Claude tool definitions for browser automation
 */
export const browserToolDefinitions: Anthropic.Tool[] = [
  {
    name: 'browser_create_session',
    description: 'Create a new cloud browser session for automation. Returns a sessionId that must be used for all subsequent browser operations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        model: {
          type: 'string',
          description: 'AI model to use for browser automation (anthropic, openai, or gemini)',
          enum: ['anthropic', 'openai', 'gemini'],
        },
      },
      required: [],
    },
  },
  {
    name: 'browser_navigate',
    description: 'Navigate the browser to a specific URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        url: {
          type: 'string',
          description: 'The URL to navigate to',
        },
      },
      required: ['sessionId', 'url'],
    },
  },
  {
    name: 'browser_act',
    description: 'Perform an action on the page using natural language instructions. The AI will find the appropriate element and interact with it. Examples: "click the login button", "type hello into the search field", "select Option 2 from the dropdown".',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        instruction: {
          type: 'string',
          description: 'Natural language instruction for the action to perform',
        },
        variables: {
          type: 'object',
          description: 'Optional variables to substitute in the instruction using %name% syntax',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['sessionId', 'instruction'],
    },
  },
  {
    name: 'browser_extract',
    description: 'Extract structured data from the current page using AI. Specify what to extract and the expected schema.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        instruction: {
          type: 'string',
          description: 'What data to extract from the page',
        },
        schema: {
          type: 'object',
          description: 'JSON schema defining the structure of data to extract',
        },
      },
      required: ['sessionId', 'instruction', 'schema'],
    },
  },
  {
    name: 'browser_observe',
    description: 'Observe the current page to discover available actions and interactive elements. Use this to understand what actions are possible before executing them.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        instruction: {
          type: 'string',
          description: 'Optional: What specific elements or actions to look for',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page. Returns base64-encoded PNG image.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        fullPage: {
          type: 'boolean',
          description: 'Whether to capture the full scrollable page',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'browser_get_url',
    description: 'Get the current URL of the browser page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'browser_wait',
    description: 'Wait for a specific condition before continuing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        type: {
          type: 'string',
          description: 'Type of wait condition',
          enum: ['navigation', 'selector', 'timeout'],
        },
        value: {
          type: ['string', 'number'],
          description: 'URL pattern for navigation, CSS selector for selector, or milliseconds for timeout',
        },
      },
      required: ['sessionId', 'type'],
    },
  },
  {
    name: 'browser_close_session',
    description: 'Close a browser session when done with automation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID to close',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'browser_get_debug_url',
    description: 'Get the live view URL for the browser session. Use this to see what the browser is doing in real-time.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  // Multi-tab support
  {
    name: 'browser_open_tab',
    description: 'Open a new tab in the browser session. Optionally navigate to a URL and choose whether to open in background.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        url: {
          type: 'string',
          description: 'Optional URL to navigate to in the new tab',
        },
        background: {
          type: 'boolean',
          description: 'Whether to open the tab in the background (default: false)',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'browser_switch_tab',
    description: 'Switch to a specific tab by its tab ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        tabId: {
          type: 'string',
          description: 'The ID of the tab to switch to',
        },
      },
      required: ['sessionId', 'tabId'],
    },
  },
  {
    name: 'browser_close_tab',
    description: 'Close a specific tab by its tab ID. Cannot close the last remaining tab.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        tabId: {
          type: 'string',
          description: 'The ID of the tab to close',
        },
      },
      required: ['sessionId', 'tabId'],
    },
  },
  {
    name: 'browser_list_tabs',
    description: 'List all open tabs in the browser session with their titles, URLs, and active status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  // File upload/download
  {
    name: 'browser_upload_file',
    description: 'Upload a file to a file input element on the page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the file input element',
        },
        filePath: {
          type: 'string',
          description: 'Absolute path to the file to upload',
        },
      },
      required: ['sessionId', 'selector', 'filePath'],
    },
  },
  {
    name: 'browser_get_downloads',
    description: 'Get the list of files downloaded during this browser session.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  // Action verification
  {
    name: 'browser_verify_action',
    description: 'Verify that an action can be performed on an element before attempting it. Checks if element exists, is visible, and is enabled.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the element to verify',
        },
        actionType: {
          type: 'string',
          description: 'Type of action to verify',
          enum: ['click', 'type', 'navigate'],
        },
      },
      required: ['sessionId', 'selector', 'actionType'],
    },
  },
  {
    name: 'browser_verify_success',
    description: 'Verify that an action was successful by checking for expected changes (URL change, element appearance, property update).',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        actionType: {
          type: 'string',
          description: 'Type of action that was performed',
          enum: ['click', 'type', 'navigate'],
        },
        expectedChange: {
          type: 'object',
          description: 'Expected changes to verify',
          properties: {
            urlPattern: {
              type: 'string',
              description: 'Regex pattern for expected URL change',
            },
            elementSelector: {
              type: 'string',
              description: 'Selector for element that should appear',
            },
            elementProperty: {
              type: 'object',
              description: 'Element property that should change',
              properties: {
                selector: { type: 'string' },
                property: { type: 'string' },
                expectedValue: {},
              },
              required: ['selector', 'property', 'expectedValue'],
            },
          },
        },
      },
      required: ['sessionId', 'actionType', 'expectedChange'],
    },
  },
  // DOM inspection
  {
    name: 'browser_inspect_element',
    description: 'Inspect a specific element to get detailed information about it (tag, attributes, text, visibility, bounding box).',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the element to inspect',
        },
      },
      required: ['sessionId', 'selector'],
    },
  },
  {
    name: 'browser_get_page_structure',
    description: 'Get the overall structure of the page including all forms, links, buttons, and input fields.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  // GHL-specific tools
  {
    name: 'ghl_login',
    description: 'Login to GoHighLevel using provided credentials.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        email: {
          type: 'string',
          description: 'GHL account email',
        },
        password: {
          type: 'string',
          description: 'GHL account password',
        },
      },
      required: ['sessionId', 'email', 'password'],
    },
  },
  {
    name: 'ghl_navigate_module',
    description: 'Navigate to a specific module in GoHighLevel.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        module: {
          type: 'string',
          description: 'The GHL module to navigate to',
          enum: ['contacts', 'conversations', 'calendar', 'opportunities', 'marketing', 'automation', 'sites', 'settings'],
        },
      },
      required: ['sessionId', 'module'],
    },
  },
  {
    name: 'ghl_create_workflow',
    description: 'Create a new workflow in GoHighLevel.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        name: {
          type: 'string',
          description: 'Workflow name',
        },
        description: {
          type: 'string',
          description: 'Workflow description',
        },
        triggers: {
          type: 'array',
          description: 'List of triggers to add (e.g., "form submission", "tag added")',
          items: { type: 'string' },
        },
        actions: {
          type: 'array',
          description: 'List of actions to add (e.g., "send email", "wait 2 days")',
          items: { type: 'string' },
        },
      },
      required: ['sessionId', 'name'],
    },
  },
  {
    name: 'ghl_extract_contact',
    description: 'Extract contact information from the current GHL contact page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
      },
      required: ['sessionId'],
    },
  },
  // Match Tool - Multi-page comparison
  {
    name: 'browser_match_pattern',
    description: 'Match a pattern across multiple browser tabs/pages. Supports regex, exact, fuzzy, and contains matching. Useful for finding content across multiple pages.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        pattern: {
          type: 'string',
          description: 'Pattern to search for (regex pattern, exact text, or fuzzy pattern)',
        },
        pages: {
          type: 'string',
          description: 'Comma-separated tab IDs to search. If not specified, searches all tabs.',
        },
        matchType: {
          type: 'string',
          description: 'Type of pattern matching',
          enum: ['regex', 'exact', 'fuzzy', 'contains'],
        },
        selector: {
          type: 'string',
          description: 'Optional CSS selector to limit search scope',
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Whether matching should be case sensitive',
        },
        maxMatches: {
          type: 'number',
          description: 'Maximum number of matches to return per page',
        },
      },
      required: ['sessionId', 'pattern'],
    },
  },
  {
    name: 'browser_compare_pages',
    description: 'Compare two browser pages to find similarities and differences. Supports text, structure, and visual comparisons. Returns similarity score and detailed differences.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        tabId1: {
          type: 'string',
          description: 'First tab ID to compare',
        },
        tabId2: {
          type: 'string',
          description: 'Second tab ID to compare',
        },
        compareType: {
          type: 'string',
          description: 'Type of comparison to perform',
          enum: ['text', 'structure', 'visual', 'all'],
        },
        selector: {
          type: 'string',
          description: 'Optional CSS selector to compare only specific elements',
        },
        threshold: {
          type: 'number',
          description: 'Similarity threshold (0-1) for determining if pages are similar enough',
        },
      },
      required: ['sessionId', 'tabId1', 'tabId2'],
    },
  },
  {
    name: 'browser_find_differences',
    description: 'Find differences across multiple page snapshots. Useful for tracking changes across page versions or comparing multiple related pages.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        snapshots: {
          type: 'string',
          description: 'JSON array of snapshots: [{"tabId": "tab1", "label": "Before"}, {"tabId": "tab2", "label": "After"}]',
        },
        diffType: {
          type: 'string',
          description: 'Type of difference detection',
          enum: ['text', 'structure', 'visual'],
        },
        ignoreWhitespace: {
          type: 'boolean',
          description: 'Whether to ignore whitespace differences',
        },
        ignoreCase: {
          type: 'boolean',
          description: 'Whether to ignore case differences',
        },
      },
      required: ['sessionId', 'snapshots'],
    },
  },
  {
    name: 'browser_extract_matches',
    description: 'Extract all pattern matches from a page. Supports extracting text, links, images, HTML, and element attributes. More powerful than basic extraction.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sessionId: {
          type: 'string',
          description: 'The browser session ID',
        },
        pattern: {
          type: 'string',
          description: 'Pattern to match and extract',
        },
        tabId: {
          type: 'string',
          description: 'Tab ID to extract from (uses active tab if not specified)',
        },
        matchType: {
          type: 'string',
          description: 'Type of pattern matching',
          enum: ['regex', 'exact', 'fuzzy'],
        },
        extractType: {
          type: 'string',
          description: 'Type of content to extract',
          enum: ['text', 'html', 'attributes', 'links', 'images'],
        },
        selector: {
          type: 'string',
          description: 'Optional CSS selector to limit extraction scope',
        },
      },
      required: ['sessionId', 'pattern'],
    },
  },
];

// ========================================
// REGISTRATION HELPER
// ========================================

/**
 * Register browser tools with the agent orchestrator's tool registry
 */
export function registerBrowserTools(toolRegistry: Map<string, Function>): void {
  for (const [name, handler] of Object.entries(browserTools)) {
    toolRegistry.set(name, handler);
  }
}

/**
 * Get all browser tool definitions for Claude
 */
export function getBrowserToolDefinitions(): Anthropic.Tool[] {
  return browserToolDefinitions;
}
