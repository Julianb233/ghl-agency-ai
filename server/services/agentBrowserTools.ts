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
  }): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
  }> => {
    try {
      const session = await stagehandService.createSession({
        model: _params.model || 'anthropic',
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
