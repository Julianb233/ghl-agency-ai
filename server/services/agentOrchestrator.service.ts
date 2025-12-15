/**
 * Agent Orchestrator Service
 * Implements the Manus 1.5 autonomous agent using Claude API with function calling
 *
 * Architecture:
 * 1. Analyze Context - Understand current state and progress
 * 2. Update Plan - Create or advance task plan
 * 3. Think & Reason - Decide on next action
 * 4. Select Tool - Via Claude function calling
 * 5. Execute Action - Run the selected tool
 * 6. Observe Result - Process tool output
 * 7. Iterate - Continue until complete or max iterations
 */

import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { agencyTasks, taskExecutions } from "../../drizzle/schema-webhooks";
import {
  buildSystemPrompt,
  buildTaskPrompt,
  buildObservationPrompt,
  buildErrorRecoveryPrompt,
  type RAGContext
} from "./agentPrompts";
import { AgentSSEEmitter } from "../_core/agent-sse-events";
import {
  registerBrowserTools,
  getBrowserToolDefinitions,
} from "./agentBrowserTools";
import { ragService } from "./rag.service";
import { getToolRegistry, ShellTool, FileTool } from "./tools";
import {
  getAgentPermissionsService,
  PermissionDeniedError,
} from "./agentPermissions.service";

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Agent plan structure
 */
export interface AgentPlan {
  goal: string;
  phases: AgentPhase[];
  currentPhaseId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Individual phase in the agent's plan
 */
export interface AgentPhase {
  id: number;
  name: string;
  description: string;
  successCriteria: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * A single thinking step in the agent's reasoning process
 */
export interface ThinkingStep {
  timestamp: Date;
  phase: string;
  understanding: string;
  nextAction: string;
  reasoning: string;
  toolSelected?: string;
}

/**
 * Tool execution history entry
 */
export interface ToolHistoryEntry {
  timestamp: Date;
  toolName: string;
  parameters: Record<string, unknown>;
  result: unknown;
  success: boolean;
  error?: string;
  duration?: number;
}

/**
 * Complete agent state
 */
export interface AgentState {
  executionId: number;
  userId: number;
  taskDescription: string;
  plan: AgentPlan | null;
  currentPhaseId: number;
  thinkingSteps: ThinkingStep[];
  iterations: number;
  errorCount: number;
  consecutiveErrors: number;
  toolHistory: ToolHistoryEntry[];
  context: Record<string, unknown>;
  conversationHistory: Anthropic.MessageParam[];
  status: 'initializing' | 'planning' | 'executing' | 'completed' | 'failed' | 'needs_input';
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  duration?: number;
}

/**
 * Agent execution options
 */
export interface ExecuteTaskOptions {
  userId: number;
  taskDescription: string;
  context?: Record<string, unknown>;
  maxIterations?: number;
  taskId?: number;
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  executionId: number;
  status: 'completed' | 'failed' | 'needs_input' | 'max_iterations';
  plan: AgentPlan | null;
  output: unknown;
  thinkingSteps: ThinkingStep[];
  toolHistory: ToolHistoryEntry[];
  error?: string;
  iterations: number;
  duration: number;
}

// ========================================
// CONSTANTS
// ========================================

const MAX_ITERATIONS = 50;
const MAX_CONSECUTIVE_ERRORS = 3;
const CLAUDE_MODEL = "claude-opus-4-5-20251101"; // Latest Opus 4.5
const MAX_TOKENS = 4096;

// ========================================
// AGENT ORCHESTRATOR SERVICE
// ========================================

export class AgentOrchestratorService {
  private claude: Anthropic;
  private toolRegistry: Map<string, Function>;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }

    this.claude = new Anthropic({ apiKey });
    this.toolRegistry = new Map();

    // Register core tools
    this.registerCoreTools();

    // Register browser automation tools
    registerBrowserTools(this.toolRegistry);
  }

  /**
   * Create SSE emitter for an execution
   */
  private createSSEEmitter(userId: number, executionId: number): AgentSSEEmitter {
    return new AgentSSEEmitter(userId, executionId.toString());
  }

  /**
   * Register core tools that the agent can use
   */
  private registerCoreTools(): void {
    // Tool: Create or update plan
    this.toolRegistry.set("update_plan", async (params: {
      goal: string;
      phases: Array<{
        name: string;
        description: string;
        successCriteria: string[];
      }>;
      currentPhaseId: number;
    }) => {
      return {
        success: true,
        plan: {
          goal: params.goal,
          phases: params.phases.map((p, i) => ({
            id: i + 1,
            ...p,
            status: i + 1 === params.currentPhaseId ? 'in_progress' :
                    i + 1 < params.currentPhaseId ? 'completed' : 'pending',
            startedAt: i + 1 === params.currentPhaseId ? new Date() : undefined,
          })),
          currentPhaseId: params.currentPhaseId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
    });

    // Tool: Mark phase complete and advance
    this.toolRegistry.set("advance_phase", async (params: {
      phaseId: number;
      outcome: string;
    }) => {
      return {
        success: true,
        phaseId: params.phaseId,
        outcome: params.outcome,
        nextPhaseId: params.phaseId + 1,
      };
    });

    // Tool: Ask user for input
    this.toolRegistry.set("ask_user", async (params: {
      question: string;
      context?: string;
    }) => {
      return {
        success: true,
        needsUserInput: true,
        question: params.question,
        context: params.context,
      };
    });

    // Tool: Store data
    this.toolRegistry.set("store_data", async (params: {
      key: string;
      value: unknown;
      description?: string;
    }) => {
      return {
        success: true,
        key: params.key,
        stored: true,
      };
    });

    // Tool: Retrieve data
    this.toolRegistry.set("retrieve_data", async (params: {
      key: string;
    }) => {
      return {
        success: true,
        key: params.key,
        value: null, // Would retrieve from state.context
      };
    });

    // Tool: Make HTTP request
    this.toolRegistry.set("http_request", async (params: {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
    }) => {
      try {
        const method = params.method?.toUpperCase() || 'GET';
        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...params.headers,
          },
        };

        if (params.body && method !== 'GET' && method !== 'HEAD') {
          options.body = typeof params.body === 'string'
            ? params.body
            : JSON.stringify(params.body);
        }

        const response = await fetch(params.url, options);
        const data = await response.json().catch(() => response.text());

        return {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          data,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Tool: Retrieve documentation from knowledge base (RAG)
    this.toolRegistry.set("retrieve_documentation", async (params: {
      query: string;
      topK?: number;
      platforms?: string[];
      categories?: string[];
    }) => {
      try {
        const chunks = await ragService.retrieve(params.query, {
          topK: params.topK || 5,
          platforms: params.platforms,
          categories: params.categories,
          minSimilarity: 0.5,
        });

        if (chunks.length === 0) {
          return {
            success: true,
            message: "No relevant documentation found for the query.",
            chunks: [],
            count: 0,
          };
        }

        // Format chunks for agent consumption
        const formattedChunks = chunks.slice(0, params.topK || 5).map((chunk, index) => ({
          index: index + 1,
          content: chunk.content,
          relevance: chunk.similarity ? `${(chunk.similarity * 100).toFixed(1)}%` : 'N/A',
          metadata: chunk.metadata,
        }));

        return {
          success: true,
          chunks: formattedChunks,
          count: chunks.length,
          message: `Found ${chunks.length} relevant document(s).`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to retrieve documentation',
          chunks: [],
          count: 0,
        };
      }
    });

    // Register shell and file tools from the new Tool system
    const toolRegistry = getToolRegistry();
    const shellTool = toolRegistry.get('shell') as ShellTool;
    const fileTool = toolRegistry.get('file') as FileTool;

    // Tool: Execute shell command
    this.toolRegistry.set("shell_exec", async (params: {
      command: string;
      cwd?: string;
      timeout?: number;
      background?: boolean;
    }) => {
      const result = await shellTool.execute({
        action: 'exec',
        command: params.command,
        cwd: params.cwd,
        timeout: params.timeout?.toString(),
        background: params.background?.toString(),
      }, { userId: 0, sessionId: 'agent' });
      return result;
    });

    // Tool: Read file
    this.toolRegistry.set("file_read", async (params: {
      path: string;
      lines?: number;
      offset?: number;
    }) => {
      const result = await fileTool.execute({
        action: 'read',
        path: params.path,
        lines: params.lines?.toString(),
        offset: params.offset?.toString(),
      }, { userId: 0, sessionId: 'agent' });
      return result;
    });

    // Tool: Write file
    this.toolRegistry.set("file_write", async (params: {
      path: string;
      content: string;
      createDirectories?: boolean;
    }) => {
      const result = await fileTool.execute({
        action: 'write',
        path: params.path,
        content: params.content,
        createDirectories: params.createDirectories?.toString() || 'true',
      }, { userId: 0, sessionId: 'agent' });
      return result;
    });

    // Tool: Edit file
    this.toolRegistry.set("file_edit", async (params: {
      path: string;
      oldContent: string;
      newContent: string;
      replaceAll?: boolean;
    }) => {
      const result = await fileTool.execute({
        action: 'edit',
        path: params.path,
        oldContent: params.oldContent,
        newContent: params.newContent,
        replaceAll: params.replaceAll?.toString(),
      }, { userId: 0, sessionId: 'agent' });
      return result;
    });

    // Tool: List files in directory
    this.toolRegistry.set("file_list", async (params: {
      path: string;
      recursive?: boolean;
      pattern?: string;
    }) => {
      const result = await fileTool.execute({
        action: 'list',
        path: params.path,
        recursive: params.recursive?.toString(),
        pattern: params.pattern,
      }, { userId: 0, sessionId: 'agent' });
      return result;
    });

    // Tool: Search in file
    this.toolRegistry.set("file_search", async (params: {
      path: string;
      pattern: string;
      caseSensitive?: boolean;
    }) => {
      const result = await fileTool.execute({
        action: 'search',
        path: params.path,
        pattern: params.pattern,
        caseSensitive: params.caseSensitive?.toString(),
      }, { userId: 0, sessionId: 'agent' });
      return result;
    });
  }

  /**
   * Convert tool registry to Claude function format
   */
  private getClaudeTools(): Anthropic.Tool[] {
    const tools: Anthropic.Tool[] = [
      {
        name: "update_plan",
        description: "Create or update the task execution plan with phases and success criteria. Use this when you need to structure your approach to the task.",
        input_schema: {
          type: "object" as const,
          properties: {
            goal: {
              type: "string",
              description: "The overall goal of the task"
            },
            phases: {
              type: "array",
              description: "List of phases to complete the task",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Phase name" },
                  description: { type: "string", description: "What this phase accomplishes" },
                  successCriteria: {
                    type: "array",
                    description: "How to know this phase is complete",
                    items: { type: "string" }
                  }
                },
                required: ["name", "description", "successCriteria"]
              }
            },
            currentPhaseId: {
              type: "number",
              description: "Which phase to start with (1-indexed)"
            }
          },
          required: ["goal", "phases", "currentPhaseId"]
        }
      },
      {
        name: "advance_phase",
        description: "Mark the current phase as complete and advance to the next phase. Use this when you've successfully completed all success criteria for the current phase.",
        input_schema: {
          type: "object" as const,
          properties: {
            phaseId: {
              type: "number",
              description: "The ID of the phase being completed"
            },
            outcome: {
              type: "string",
              description: "Summary of what was accomplished in this phase"
            }
          },
          required: ["phaseId", "outcome"]
        }
      },
      {
        name: "ask_user",
        description: "Request input, clarification, or guidance from the user. Use this when you're stuck, need more information, or require user approval for an action.",
        input_schema: {
          type: "object" as const,
          properties: {
            question: {
              type: "string",
              description: "The specific question or request for the user"
            },
            context: {
              type: "string",
              description: "Optional context explaining why you need this information"
            }
          },
          required: ["question"]
        }
      },
      {
        name: "store_data",
        description: "Store a piece of data for later retrieval. Use this to save extracted information, intermediate results, or any data you'll need in future phases.",
        input_schema: {
          type: "object" as const,
          properties: {
            key: {
              type: "string",
              description: "Unique identifier for this data"
            },
            value: {
              type: "object",
              description: "The data to store (can be any JSON-serializable value)"
            },
            description: {
              type: "string",
              description: "Optional description of what this data represents"
            }
          },
          required: ["key", "value"]
        }
      },
      {
        name: "retrieve_data",
        description: "Retrieve previously stored data by key. Use this to access information saved in earlier phases.",
        input_schema: {
          type: "object" as const,
          properties: {
            key: {
              type: "string",
              description: "The key of the data to retrieve"
            }
          },
          required: ["key"]
        }
      },
      {
        name: "http_request",
        description: "Make an HTTP request to an external API. Use this to fetch data from web services, post data to APIs, or interact with external systems.",
        input_schema: {
          type: "object" as const,
          properties: {
            url: {
              type: "string",
              description: "The full URL to request"
            },
            method: {
              type: "string",
              description: "HTTP method (GET, POST, PUT, DELETE, PATCH)",
              enum: ["GET", "POST", "PUT", "DELETE", "PATCH"]
            },
            headers: {
              type: "object",
              description: "Optional HTTP headers as key-value pairs",
              additionalProperties: { type: "string" }
            },
            body: {
              type: "object",
              description: "Optional request body (for POST, PUT, PATCH)"
            }
          },
          required: ["url"]
        }
      },
      {
        name: "retrieve_documentation",
        description: "Search the knowledge base for relevant documentation, support articles, and guides. Use this when you need help understanding how to complete a task, troubleshoot an issue, or learn about a specific platform or feature.",
        input_schema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description: "Search query describing what information you need"
            },
            topK: {
              type: "number",
              description: "Number of results to return (default: 5, max: 10)"
            },
            platforms: {
              type: "array",
              description: "Filter by specific platforms (e.g., 'ghl', 'zapier', 'mailchimp')",
              items: { type: "string" }
            },
            categories: {
              type: "array",
              description: "Filter by documentation categories (e.g., 'api', 'workflows', 'troubleshooting')",
              items: { type: "string" }
            }
          },
          required: ["query"]
        }
      }
    ];

    // Add browser automation tools
    const browserTools = getBrowserToolDefinitions();
    tools.push(...browserTools);

    // Add shell and file tools
    tools.push(
      {
        name: "shell_exec",
        description: "Execute a shell command. Use this to run system commands, install packages, run scripts, or interact with the operating system.",
        input_schema: {
          type: "object" as const,
          properties: {
            command: {
              type: "string",
              description: "The shell command to execute"
            },
            cwd: {
              type: "string",
              description: "Working directory for command execution"
            },
            timeout: {
              type: "number",
              description: "Timeout in milliseconds (default: 30000)"
            },
            background: {
              type: "boolean",
              description: "Run command in background (default: false)"
            }
          },
          required: ["command"]
        }
      },
      {
        name: "file_read",
        description: "Read the contents of a file. Use this to examine file contents, configuration, or data.",
        input_schema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Path to the file to read"
            },
            lines: {
              type: "number",
              description: "Number of lines to read (for large files)"
            },
            offset: {
              type: "number",
              description: "Line number to start reading from"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "file_write",
        description: "Write content to a file. Use this to create new files or overwrite existing ones.",
        input_schema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Path where to write the file"
            },
            content: {
              type: "string",
              description: "Content to write to the file"
            },
            createDirectories: {
              type: "boolean",
              description: "Create parent directories if they don't exist (default: true)"
            }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "file_edit",
        description: "Edit a file by replacing specific content. Use this for surgical edits to existing files.",
        input_schema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Path to the file to edit"
            },
            oldContent: {
              type: "string",
              description: "The exact content to find and replace"
            },
            newContent: {
              type: "string",
              description: "The new content to replace with"
            },
            replaceAll: {
              type: "boolean",
              description: "Replace all occurrences (default: false, fails if multiple found)"
            }
          },
          required: ["path", "oldContent", "newContent"]
        }
      },
      {
        name: "file_list",
        description: "List files and directories. Use this to explore directory structures.",
        input_schema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Directory path to list"
            },
            recursive: {
              type: "boolean",
              description: "List recursively (default: false)"
            },
            pattern: {
              type: "string",
              description: "Glob pattern to filter files (e.g., '*.ts')"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "file_search",
        description: "Search for a pattern within a file. Use this to find specific content.",
        input_schema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "File path to search in"
            },
            pattern: {
              type: "string",
              description: "Regex pattern to search for"
            },
            caseSensitive: {
              type: "boolean",
              description: "Case sensitive search (default: true)"
            }
          },
          required: ["path", "pattern"]
        }
      }
    );

    return tools;
  }

  /**
   * Execute a tool and return the result
   */
  private async executeTool(
    toolName: string,
    parameters: Record<string, unknown>,
    state: AgentState,
    emitter?: AgentSSEEmitter
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    // Emit tool start event
    if (emitter) {
      emitter.toolStart({
        toolName,
        params: parameters,
      });
    }

    try {
      const toolFunction = this.toolRegistry.get(toolName);
      if (!toolFunction) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // SECURITY: Check permission before executing tool
      const permissionsService = getAgentPermissionsService();
      try {
        await permissionsService.requirePermission(state.userId, toolName);
      } catch (error) {
        if (error instanceof PermissionDeniedError) {
          throw new Error(
            `Permission denied: ${error.message} (Tool: ${toolName}, Permission Level: ${error.permissionLevel})`
          );
        }
        throw error;
      }

      // Special handling for certain tools that need state
      let result: unknown;
      if (toolName === "update_plan") {
        result = await toolFunction(parameters);
        if (result && typeof result === 'object' && 'plan' in result) {
          state.plan = (result as any).plan;
          state.currentPhaseId = state.plan?.currentPhaseId || 1;

          // Emit plan created event
          if (emitter && state.plan) {
            emitter.planCreated({
              plan: {
                goal: state.plan.goal,
                phases: state.plan.phases.map(p => ({
                  id: p.id.toString(),
                  name: p.name,
                  description: p.description,
                  steps: p.successCriteria,
                })),
              },
            });

            // Emit phase start for the current phase
            const currentPhase = state.plan.phases[state.currentPhaseId - 1];
            if (currentPhase) {
              emitter.phaseStart({
                phaseId: currentPhase.id.toString(),
                phaseName: currentPhase.name,
                phaseIndex: state.currentPhaseId - 1,
              });
            }
          }
        }
      } else if (toolName === "advance_phase") {
        result = await toolFunction(parameters);
        if (result && typeof result === 'object' && 'nextPhaseId' in result) {
          const nextPhaseId = (result as any).nextPhaseId;
          const completedPhase = state.plan?.phases[nextPhaseId - 2];

          state.currentPhaseId = nextPhaseId;
          if (state.plan && state.plan.phases[nextPhaseId - 2]) {
            state.plan.phases[nextPhaseId - 2].status = 'completed';
            state.plan.phases[nextPhaseId - 2].completedAt = new Date();
          }
          if (state.plan && state.plan.phases[nextPhaseId - 1]) {
            state.plan.phases[nextPhaseId - 1].status = 'in_progress';
            state.plan.phases[nextPhaseId - 1].startedAt = new Date();
          }

          // Emit phase complete event
          if (emitter && completedPhase) {
            emitter.phaseComplete({
              phaseId: completedPhase.id.toString(),
              phaseName: completedPhase.name,
              phaseIndex: nextPhaseId - 2,
            });
          }

          // Emit phase start for next phase
          if (emitter && state.plan && state.plan.phases[nextPhaseId - 1]) {
            const nextPhase = state.plan.phases[nextPhaseId - 1];
            emitter.phaseStart({
              phaseId: nextPhase.id.toString(),
              phaseName: nextPhase.name,
              phaseIndex: nextPhaseId - 1,
            });
          }
        }
      } else if (toolName === "store_data") {
        result = await toolFunction(parameters);
        const key = parameters.key as string;
        const value = parameters.value;
        state.context[key] = value;
      } else if (toolName === "retrieve_data") {
        const key = parameters.key as string;
        const value = state.context[key];
        result = {
          success: true,
          key,
          value,
          found: value !== undefined,
        };
      } else if (toolName === "ask_user") {
        result = await toolFunction(parameters);
        state.status = 'needs_input';
      } else {
        result = await toolFunction(parameters);
      }

      const duration = Date.now() - startTime;

      // Emit tool complete event
      if (emitter) {
        emitter.toolComplete({
          toolName,
          result,
          duration,
        });
      }

      return {
        success: true,
        result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Emit tool complete event with error
      if (emitter) {
        emitter.toolComplete({
          toolName,
          result: { error: error instanceof Error ? error.message : 'Unknown error' },
          duration,
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    }
  }

  /**
   * Run the agent loop for one iteration
   */
  private async runAgentLoop(state: AgentState, emitter?: AgentSSEEmitter): Promise<boolean> {
    try {
      // Build the current prompt based on state
      let currentPrompt = "";

      if (state.iterations === 0) {
        // First iteration - introduce the task
        currentPrompt = buildTaskPrompt(state.taskDescription);
      } else {
        // Subsequent iterations - continue based on last tool result
        const lastTool = state.toolHistory[state.toolHistory.length - 1];
        if (lastTool) {
          if (!lastTool.success && lastTool.error) {
            currentPrompt = buildErrorRecoveryPrompt(
              lastTool.error,
              state.consecutiveErrors
            );
          } else {
            currentPrompt = buildObservationPrompt(
              lastTool.result,
              lastTool.toolName
            );
          }
        }
      }

      // Add current prompt to conversation
      state.conversationHistory.push({
        role: "user",
        content: currentPrompt,
      });

      // Fetch RAG context on first iteration
      let ragContext: RAGContext | undefined;
      if (state.iterations === 0) {
        try {
          const ragResult = await ragService.buildSystemPrompt(state.taskDescription, {
            maxDocumentationTokens: 3000,
            includeExamples: true,
          });
          ragContext = {
            relevantSelectors: ragResult.retrievedChunks.map(chunk => ({
              elementName: 'document',
              selector: chunk.content.substring(0, 100),
              reliability: chunk.similarity || 0,
            })),
          };
          console.log(`[Agent] RAG context loaded: ${ragResult.retrievedChunks.length} chunks, platforms: ${ragResult.detectedPlatforms.join(', ')}`);
        } catch (ragError) {
          console.warn('[Agent] Failed to load RAG context:', ragError);
          // Continue without RAG context
        }
      }

      // Call Claude with function calling
      const systemPrompt = buildSystemPrompt({
        userId: state.userId,
        taskDescription: state.taskDescription,
        ragContext,
      });

      const response = await this.claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: state.conversationHistory,
        tools: this.getClaudeTools(),
      });

      // Save assistant's response
      state.conversationHistory.push({
        role: "assistant",
        content: response.content,
      });

      // Check if response contains tool use
      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      // Extract thinking from text blocks
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );

      if (textBlocks.length > 0 && emitter) {
        const thinking = textBlocks.map(b => b.text).join('\n');
        emitter.thinking({
          thought: thinking,
          iteration: state.iterations,
        });
      }

      if (!toolUse) {
        // No tool use - check if task is complete
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === "text"
        );

        if (textBlock?.text.toLowerCase().includes("complete")) {
          state.status = 'completed';
          return false; // Stop iteration
        }

        // Agent didn't use a tool - this is unexpected
        console.warn("Agent response without tool use:", response);
        state.errorCount++;
        state.consecutiveErrors++;
        return true; // Continue but flag error
      }

      // Execute the tool
      const toolName = toolUse.name;
      const toolParams = toolUse.input as Record<string, unknown>;

      console.log(`[Agent] Executing tool: ${toolName}`, toolParams);

      const toolResult = await this.executeTool(toolName, toolParams, state, emitter);

      // Record tool execution
      const historyEntry: ToolHistoryEntry = {
        timestamp: new Date(),
        toolName,
        parameters: toolParams,
        result: toolResult.result,
        success: toolResult.success,
        error: toolResult.error,
        duration: toolResult.duration,
      };

      state.toolHistory.push(historyEntry);

      // Update error counters
      if (!toolResult.success) {
        state.errorCount++;
        state.consecutiveErrors++;
      } else {
        state.consecutiveErrors = 0;
      }

      // Check if we should stop due to errors
      if (state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        state.status = 'failed';
        return false; // Stop iteration
      }

      // Check if user input is needed
      if (state.status === 'needs_input') {
        return false; // Stop iteration
      }

      // Continue iteration
      state.iterations++;
      return true;

    } catch (error) {
      console.error("[Agent Loop] Error:", error);
      state.errorCount++;
      state.consecutiveErrors++;

      if (state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        state.status = 'failed';
        return false;
      }

      return true; // Try to continue
    }
  }

  /**
   * Main entry point - Execute a task
   */
  public async executeTask(options: ExecuteTaskOptions): Promise<AgentExecutionResult> {
    const {
      userId,
      taskDescription,
      context = {},
      maxIterations = MAX_ITERATIONS,
      taskId,
    } = options;

    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const startTime = Date.now();

    // Create execution record - Note: taskId is required in schema
    // If no taskId provided, we need to create a placeholder task first or update the schema
    if (!taskId) {
      throw new Error("taskId is required for task execution");
    }

    const [execution] = await db.insert(taskExecutions).values({
      taskId: taskId,
      status: "started",
      triggeredBy: "automatic",
      triggeredByUserId: userId,
      stepsTotal: 0,
      stepsCompleted: 0,
    }).returning();

    // Initialize agent state
    const state: AgentState = {
      executionId: execution.id,
      userId,
      taskDescription,
      plan: null,
      currentPhaseId: 1,
      thinkingSteps: [],
      iterations: 0,
      errorCount: 0,
      consecutiveErrors: 0,
      toolHistory: [],
      context,
      conversationHistory: [],
      status: 'initializing',
    };

    // Create SSE emitter for real-time updates
    const emitter = this.createSSEEmitter(userId, execution.id);

    try {
      // SECURITY: Check execution limits before starting
      const permissionsService = getAgentPermissionsService();
      const limitsCheck = await permissionsService.checkExecutionLimits(userId);

      if (!limitsCheck.canExecute) {
        throw new Error(limitsCheck.reason || "Execution limit reached");
      }

      // Emit execution started event
      emitter.executionStarted({
        task: taskDescription,
        startedAt: new Date(),
      });

      // Update status to executing
      state.status = 'executing';
      await this.updateExecutionRecord(state);

      // Run agent loop
      let continueLoop = true;
      while (continueLoop && state.iterations < maxIterations) {
        continueLoop = await this.runAgentLoop(state, emitter);

        // Periodic state save
        if (state.iterations % 5 === 0) {
          await this.updateExecutionRecord(state);
        }
      }

      // Check completion status
      if (state.iterations >= maxIterations && state.status === 'executing') {
        state.status = 'failed';
        await this.updateExecutionRecord(state, "Max iterations reached");
      } else if (state.status === 'executing') {
        // Didn't explicitly complete - check if plan is done
        if (state.plan && state.plan.phases.every(p => p.status === 'completed')) {
          state.status = 'completed';
        }
      }

      // Final state save
      await this.updateExecutionRecord(state);

      const duration = Date.now() - startTime;

      // Determine final result status
      // Note: state.status type is narrowed by TypeScript control flow analysis
      // but it could have been set to 'needs_input' earlier in the execution
      const currentStatus = state.status as AgentState['status'];
      let resultStatus: 'completed' | 'failed' | 'needs_input' | 'max_iterations';

      if (currentStatus === 'completed') {
        resultStatus = 'completed';
        // Emit completion event
        emitter.executionComplete({
          result: state.context,
          duration,
        });
      } else if (currentStatus === 'needs_input') {
        resultStatus = 'needs_input';
      } else if (currentStatus === 'failed') {
        resultStatus = 'failed';
        // Emit error event
        emitter.executionError({
          error: state.errorCount > 0 ? 'Execution failed after multiple errors' : 'Execution failed',
        });
      } else {
        // All other statuses (initializing, planning, executing) are treated as max_iterations
        resultStatus = 'max_iterations';
        // Emit error event
        emitter.executionError({
          error: 'Maximum iterations reached',
        });
      }

      return {
        executionId: execution.id,
        status: resultStatus,
        plan: state.plan,
        output: state.context,
        thinkingSteps: state.thinkingSteps,
        toolHistory: state.toolHistory,
        iterations: state.iterations,
        duration,
      };

    } catch (error) {
      console.error("[Agent Execution] Fatal error:", error);

      // Emit error event
      emitter.executionError({
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      await db.update(taskExecutions)
        .set({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        })
        .where(eq(taskExecutions.id, execution.id));

      throw error;
    }
  }

  /**
   * Update execution record in database
   */
  private async updateExecutionRecord(
    state: AgentState,
    error?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    const updates: any = {
      status: state.status,
      stepsTotal: state.plan?.phases.length || 0,
      stepsCompleted: state.plan?.phases.filter(p => p.status === 'completed').length || 0,
      currentStep: state.plan?.phases[state.currentPhaseId - 1]?.name,
      stepResults: state.toolHistory,
      output: state.context,
      logs: state.thinkingSteps,
    };

    if (error) {
      updates.error = error;
    }

    if (state.status === 'completed' || state.status === 'failed') {
      updates.completedAt = new Date();
    }

    await db.update(taskExecutions)
      .set(updates)
      .where(eq(taskExecutions.id, state.executionId));
  }

  /**
   * Get execution status
   */
  public async getExecutionStatus(executionId: number): Promise<any> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const [execution] = await db
      .select()
      .from(taskExecutions)
      .where(eq(taskExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      throw new Error("Execution not found");
    }

    return execution;
  }
}

// ========================================
// EXPORT SINGLETON INSTANCE
// ========================================

let agentOrchestratorInstance: AgentOrchestratorService | null = null;

/**
 * Get singleton instance of agent orchestrator
 */
export function getAgentOrchestrator(): AgentOrchestratorService {
  if (!agentOrchestratorInstance) {
    agentOrchestratorInstance = new AgentOrchestratorService();
  }
  return agentOrchestratorInstance;
}

/**
 * Execute a task using the agent orchestrator (convenience function)
 */
export async function executeAgentTask(
  options: ExecuteTaskOptions
): Promise<AgentExecutionResult> {
  const orchestrator = getAgentOrchestrator();
  return await orchestrator.executeTask(options);
}
