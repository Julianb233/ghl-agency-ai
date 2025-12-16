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
import { explainError, emitExplainedError } from "./agentErrorExplainer";
import { ragService } from "./rag.service";
import { getToolRegistry, ShellTool, FileTool } from "./tools";
import {
  getAgentPermissionsService,
  PermissionDeniedError,
} from "./agentPermissions.service";
import { getSelfCorrectionService, type FailureAttempt } from "./browser/selfCorrection.service";
import { getConfidenceService } from "./agentConfidence.service";
import { getStrategyService, type ExecutionStrategy } from "./agentStrategy.service";
import { ErrorType, RecoveryStrategy, classifyError } from "../lib/errorTypes";
import {
  AgentProgressTracker,
  createProgressTracker,
  inferTaskType,
  estimateStepCount,
} from "./agentProgressTracker.service";

// Cost Tracking
import { getCostTrackingService } from "./costTracking.service";

// Memory & Learning Services
import {
  getCheckpointService,
  getLearningEngine,
  getPatternReuseService,
  getUserMemoryService,
  type CheckpointOptions,
  type ResumeResult,
} from "./memory";

// Browser Automation Services
import {
  getMultiTabService,
  getFileUploadService,
  getVisualVerificationService,
} from "./browser";

// Intelligence Services
import {
  getFailureRecoveryService,
  getStrategyAdaptationService,
} from "./intelligence";

// Security Services
import {
  getCredentialVault,
  getExecutionControl,
} from "./security";

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
  estimatedSteps: number;
  estimatedDuration: number; // in milliseconds
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
 * Structured reasoning data for enhanced visibility
 */
export interface ReasoningStep {
  step: number;
  thought: string;
  evidence: string[];
  hypothesis: string;
  decision: string;
  alternatives: string[];
  confidence: number; // 0-1
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
  structuredReasoning?: ReasoningStep;
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
  // Self-correction tracking
  failureAttempts: FailureAttempt[];
  currentStrategy?: ExecutionStrategy;
  recoveryAttempts: number;
  // Progress tracking
  progressTracker?: AgentProgressTracker;
  // Memory & Learning
  checkpointId?: string;
  resumedFromCheckpoint?: ResumeResult;
  recommendedStrategy?: any;
  patternMatch?: any;
  // Browser Automation
  activeTabIds?: string[];
  pendingUploads?: string[];
  // Intelligence
  adaptedStrategy?: any;
  recoveryStrategiesUsed?: string[];
  // Security & Control
  isPaused?: boolean;
  credentialsUsed?: number[];
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
      estimatedSteps?: number;
      estimatedDuration?: number;
    }) => {
      // Calculate estimates if not provided
      const estimatedSteps = params.estimatedSteps || params.phases.reduce((acc, p) => acc + p.successCriteria.length, 0);
      const estimatedDuration = params.estimatedDuration || (params.phases.length * 60000); // 1 min per phase default

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
          estimatedSteps,
          estimatedDuration,
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
      if (toolName === "browser_create_session") {
        // Pass userId and executionId for cost tracking
        result = await toolFunction({
          ...parameters,
          userId: state.userId,
          executionId: state.executionId,
        });

        // Emit browser session event with debug URL
        if (result && typeof result === 'object' && 'success' in result && result.success && 'sessionId' in result) {
          const sessionId = (result as any).sessionId;
          // Import stagehand service to get debug URL
          const { stagehandService } = await import('./stagehand.service');
          const debugUrl = await stagehandService.getDebugUrl(sessionId);

          if (emitter && debugUrl) {
            emitter.browserSession({
              sessionId,
              debugUrl,
            });
          }
        }
      } else if (toolName === "update_plan") {
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
   * Execute a tool with self-correction and retry logic
   */
  private async executeToolWithSelfCorrection(
    toolName: string,
    parameters: Record<string, unknown>,
    state: AgentState,
    emitter?: AgentSSEEmitter
  ): Promise<ToolExecutionResult> {
    const MAX_RECOVERY_ATTEMPTS = 3;
    const selfCorrection = getSelfCorrectionService();
    const confidence = getConfidenceService();
    const failureRecovery = getFailureRecoveryService();

    // First attempt
    let result = await this.executeTool(toolName, parameters, state, emitter);

    if (result.success) {
      // Record success for learning
      confidence.recordOutcome(toolName, true);
      state.recoveryAttempts = 0;
      state.consecutiveErrors = 0;
      return result;
    }

    // Tool failed - initiate self-correction
    console.log(`[SelfCorrection] Tool ${toolName} failed: ${result.error}`);
    confidence.recordOutcome(toolName, false);

    // Build failure context
    const failureAttempt: FailureAttempt = {
      action: toolName,
      parameters,
      error: result.error || 'Unknown error',
      timestamp: new Date(),
      strategy: RecoveryStrategy.RETRY_SAME,
    };
    state.failureAttempts.push(failureAttempt);

    // Try recovery alternatives
    for (let attempt = 1; attempt <= MAX_RECOVERY_ATTEMPTS; attempt++) {
      state.recoveryAttempts = attempt;

      // Analyze failure and get alternatives
      const analysis = await selfCorrection.analyzeFailure(
        toolName,
        result.error || 'Unknown error',
        {
          parameters,
          attemptNumber: attempt,
          previousAttempts: state.failureAttempts,
          pageState: {
            url: state.context.currentUrl as string,
            title: state.context.pageTitle as string,
          },
          taskContext: {
            taskDescription: state.taskDescription,
            currentPhase: state.plan?.phases[state.currentPhaseId - 1]?.name,
          },
        }
      );

      console.log(`[SelfCorrection] Analysis: ${analysis.rootCause}`);
      console.log(`[SelfCorrection] Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
      console.log(`[SelfCorrection] Found ${analysis.alternatives.length} alternatives`);

      // ========================================
      // INTELLIGENCE: Use failure recovery service for learning
      // ========================================
      try {
        // Record the failure pattern for learning
        // Map the errorType enum to the string format expected by failureRecovery
        const errorTypeStr = analysis.errorType.toLowerCase().replace(/_/g, '_') as import('./intelligence/failureRecovery.service').ErrorType;

        failureRecovery.recordFailurePattern({
          executionId: state.executionId.toString(),
          sessionId: state.executionId.toString(),
          action: toolName,
          errorMessage: result.error || 'Unknown error',
          errorType: errorTypeStr,
          timestamp: new Date(),
          pageState: {
            url: state.context.currentUrl as string || '',
            title: state.context.pageTitle as string || '',
          },
          attemptNumber: attempt,
          // Map selfCorrection's FailureAttempt to failureRecovery's FailureAttempt
          previousAttempts: state.failureAttempts.map(a => ({
            action: a.action,
            strategy: String(a.strategy), // Convert enum to string
            error: a.error,
            timestamp: a.timestamp,
            duration: 0, // We don't track duration in selfCorrection attempts
          })),
        });

        console.log(`[Intelligence] Recorded failure pattern for learning`);

        // Track which strategies we've used
        state.recoveryStrategiesUsed = state.recoveryStrategiesUsed || [];
      } catch (recoveryError) {
        console.warn('[Intelligence] Failure recovery error (continuing with self-correction):', recoveryError);
      }

      // Emit self-correction event
      if (emitter) {
        emitter.thinking({
          thought: `Self-correcting after failure. Root cause: ${analysis.rootCause}. Trying ${analysis.alternatives.length} alternatives...`,
          iteration: state.iterations,
        });
      }

      // Should we escalate to user?
      if (analysis.shouldEscalate || !analysis.shouldRetry) {
        console.log('[SelfCorrection] Escalating to user');
        if (emitter) {
          emitter.thinking({
            thought: `Unable to recover automatically. ${analysis.reasoning || 'All alternatives exhausted.'}`,
            iteration: state.iterations,
          });
        }
        break;
      }

      // Try each alternative
      for (const alternative of analysis.alternatives) {
        console.log(`[SelfCorrection] Trying alternative: ${alternative.strategy} - ${alternative.description}`);

        if (emitter) {
          emitter.thinking({
            thought: `Attempting recovery strategy: ${alternative.description}`,
            iteration: state.iterations,
          });
        }

        // Execute alternative action
        const altResult = await this.executeTool(
          alternative.actionType,
          alternative.parameters,
          state,
          emitter
        );

        // Record attempt
        const altFailureAttempt: FailureAttempt = {
          action: alternative.actionType,
          parameters: alternative.parameters,
          error: altResult.error || '',
          timestamp: new Date(),
          strategy: alternative.strategy,
        };
        state.failureAttempts.push(altFailureAttempt);

        if (altResult.success) {
          console.log(`[SelfCorrection] Recovery successful with strategy: ${alternative.strategy}`);

          // Record successful recovery for learning
          selfCorrection.recordSuccess(
            analysis.errorType,
            toolName,
            alternative.strategy,
            alternative.actionType,
            { parameters: alternative.parameters }
          );

          // Track recovery strategy used
          state.recoveryStrategiesUsed?.push(alternative.strategy);

          if (emitter) {
            emitter.thinking({
              thought: `Successfully recovered using ${alternative.strategy}`,
              iteration: state.iterations,
            });
          }

          state.recoveryAttempts = 0;
          state.consecutiveErrors = 0;
          return altResult;
        }

        console.log(`[SelfCorrection] Alternative failed: ${altResult.error}`);
      }

      // All alternatives failed, continue to next analysis iteration
    }

    // All recovery attempts exhausted
    console.log('[SelfCorrection] All recovery attempts exhausted');
    state.errorCount++;
    state.consecutiveErrors++;

    return result; // Return original failure
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

      const apiCallStartTime = Date.now();
      const response = await this.claude.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: state.conversationHistory,
        tools: this.getClaudeTools(),
      });
      const apiCallDuration = Date.now() - apiCallStartTime;

      // ========================================
      // COST TRACKING: Track Claude API token usage
      // ========================================
      try {
        const costTrackingService = getCostTrackingService();

        // Determine prompt type based on iteration
        let promptType = 'task';
        if (state.iterations === 0) {
          promptType = 'task';
        } else {
          const lastTool = state.toolHistory[state.toolHistory.length - 1];
          if (lastTool && !lastTool.success && lastTool.error) {
            promptType = 'error_recovery';
          } else {
            promptType = 'observation';
          }
        }

        // Extract tool names used in this response
        const toolsUsed = response.content
          .filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use")
          .map(block => block.name);

        await costTrackingService.trackApiCall({
          userId: state.userId,
          executionId: state.executionId,
          response,
          model: CLAUDE_MODEL,
          promptType,
          toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
          responseTime: apiCallDuration,
        });
      } catch (costTrackingError) {
        console.warn('[CostTracking] Failed to track API call:', costTrackingError);
        // Continue execution even if cost tracking fails
      }

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

      // Use self-correction for browser automation tools
      const isBrowserTool = toolName.startsWith('browser_') || toolName.startsWith('ghl_');
      const toolResult = isBrowserTool
        ? await this.executeToolWithSelfCorrection(toolName, toolParams, state, emitter)
        : await this.executeTool(toolName, toolParams, state, emitter);

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
      // Self-correction state
      failureAttempts: [],
      recoveryAttempts: 0,
    };

    // ========================================
    // MEMORY & LEARNING: Pre-execution setup
    // ========================================
    const learningEngine = getLearningEngine();
    const patternReuse = getPatternReuseService();
    const checkpointService = getCheckpointService();
    const userMemoryService = getUserMemoryService();

    try {
      // 1. Get recommended strategy from learning engine
      const taskType = inferTaskType(taskDescription);
      const recommendedStrategy = await learningEngine.getRecommendedStrategy({
        userId,
        executionId: execution.id,
        taskType,
      });
      state.recommendedStrategy = recommendedStrategy;
      console.log(`[Memory] Recommended strategy: ${recommendedStrategy.source} (confidence: ${recommendedStrategy.confidence.toFixed(2)})`);

      // 2. Look for reusable patterns
      const patternMatch = await patternReuse.findBestPattern({
        userId,
        taskType,
        parameters: context,
      });
      if (patternMatch) {
        state.patternMatch = patternMatch;
        console.log(`[Memory] Found matching pattern: ${patternMatch.source} (similarity: ${patternMatch.similarity.toFixed(2)}, confidence: ${patternMatch.confidence.toFixed(2)})`);
      }

      // 3. Get cached selectors for GHL
      if (taskType.includes('ghl')) {
        const cachedSelectors = await learningEngine.getCachedSelector(userId, 'ghl_nav');
        if (cachedSelectors) {
          state.context.cachedSelectors = cachedSelectors;
          console.log(`[Memory] Loaded cached GHL selectors`);
        }
      }
    } catch (memoryError) {
      console.warn('[Memory] Pre-execution setup error (continuing):', memoryError);
    }

    // ========================================
    // BROWSER AUTOMATION: Initialize services
    // ========================================
    const multiTabService = getMultiTabService();
    const fileUploadService = getFileUploadService();
    const visualVerificationService = getVisualVerificationService();
    state.activeTabIds = [];
    state.pendingUploads = [];

    // ========================================
    // INTELLIGENCE: Initialize services
    // ========================================
    const failureRecoveryService = getFailureRecoveryService();
    const strategyAdaptationService = getStrategyAdaptationService();
    state.recoveryStrategiesUsed = [];

    try {
      // Get adapted strategy based on task analysis
      const taskType = inferTaskType(taskDescription);
      const siteUrl = (context.url as string) || '';
      const siteDomain = siteUrl ? new URL(siteUrl).hostname : 'unknown';

      // Analyze the page first
      const pageAnalysis = await strategyAdaptationService.analyzePage(siteUrl);

      // Build execution context for strategy selection
      const executionContext = {
        executionId: execution.id.toString(),
        sessionId: execution.id.toString(),
        taskType,
        siteUrl,
        siteDomain,
        currentAction: taskDescription,
        pageState: pageAnalysis,
      };

      const adaptedStrategy = strategyAdaptationService.selectStrategy(executionContext);
      state.adaptedStrategy = adaptedStrategy;
      console.log(`[Intelligence] Selected strategy: ${adaptedStrategy.strategyId} (confidence: ${adaptedStrategy.confidence.toFixed(2)})`);
    } catch (intelligenceError) {
      console.warn('[Intelligence] Strategy adaptation error (continuing with default):', intelligenceError);
    }

    // ========================================
    // SECURITY: Initialize execution control
    // ========================================
    const executionControl = getExecutionControl();
    const credentialVault = getCredentialVault();
    state.isPaused = false;
    state.credentialsUsed = [];

    try {
      // Register execution with control service
      const registrationResult = executionControl.registerExecution(
        execution.id.toString(),
        userId
      );
      if (registrationResult.success) {
        console.log(`[Security] Execution ${execution.id} registered with control service`);
      } else {
        console.warn(`[Security] Execution registration failed: ${registrationResult.error}`);
      }
    } catch (securityError) {
      console.warn('[Security] Execution control setup error (continuing):', securityError);
    }

    // Create SSE emitter for real-time updates
    const emitter = this.createSSEEmitter(userId, execution.id);

    // Initialize progress tracker with intelligent estimates
    const taskType = inferTaskType(taskDescription);
    const estimatedSteps = estimateStepCount(taskDescription, taskType);
    const progressTracker = createProgressTracker(
      execution.id.toString(),
      userId,
      taskType,
      estimatedSteps
    );
    state.progressTracker = progressTracker;

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

      // Start progress tracking
      progressTracker.startPhase('initialization');

      // ========================================
      // MEMORY & LEARNING: Create initial checkpoint
      // ========================================
      try {
        state.checkpointId = await checkpointService.createCheckpoint({
          executionId: execution.id,
          userId,
          phaseName: 'initialization',
          stepIndex: 0,
          completedSteps: [],
          partialResults: {},
          extractedData: {},
          checkpointReason: 'auto',
          ttlSeconds: 24 * 60 * 60, // 24 hours
        });
        console.log(`[Memory] Created initial checkpoint: ${state.checkpointId}`);
      } catch (checkpointError) {
        console.warn('[Memory] Failed to create initial checkpoint:', checkpointError);
      }

      // Update status to executing
      state.status = 'executing';
      await this.updateExecutionRecord(state);

      // Run agent loop
      let continueLoop = true;
      const loopStartTime = Date.now();

      while (continueLoop && state.iterations < maxIterations) {
        // ========================================
        // SECURITY: Check execution control state
        // ========================================
        try {
          const controlState = executionControl.getExecutionStatus(execution.id.toString());

          if (controlState?.status === 'cancelled') {
            console.log(`[Security] Execution ${execution.id} was cancelled`);
            state.status = 'failed';
            break;
          }

          if (controlState?.status === 'paused') {
            state.isPaused = true;
            console.log(`[Security] Execution ${execution.id} is paused, waiting...`);
            emitter.thinking({
              thought: 'Execution paused by user. Waiting for resume...',
              iteration: state.iterations,
            });

            // Wait for resume (check every 2 seconds, max 5 minutes)
            let waitTime = 0;
            const maxWait = 5 * 60 * 1000; // 5 minutes
            while (waitTime < maxWait) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              waitTime += 2000;
              const newState = executionControl.getExecutionStatus(execution.id.toString());
              if (newState?.status === 'running') {
                state.isPaused = false;
                console.log(`[Security] Execution ${execution.id} resumed`);
                break;
              }
              if (newState?.status === 'cancelled') {
                state.status = 'failed';
                continueLoop = false;
                break;
              }
            }

            if (state.isPaused) {
              // Timed out waiting for resume
              console.log(`[Security] Execution ${execution.id} pause timeout, saving checkpoint`);
              await checkpointService.createCheckpoint({
                executionId: execution.id,
                userId,
                phaseName: state.plan?.phases[state.currentPhaseId - 1]?.name || 'paused',
                stepIndex: state.iterations,
                completedSteps: state.toolHistory.filter(t => t.success).map(t => t.toolName),
                partialResults: state.context as Record<string, any>,
                checkpointReason: 'manual',
              });
              state.status = 'failed';
              break;
            }
          }
        } catch (controlError) {
          console.warn('[Security] Execution control check error (continuing):', controlError);
        }

        // Get current action for progress tracking
        let currentAction = 'Processing...';
        let currentPhase = 'execution';
        if (state.plan?.phases[state.currentPhaseId - 1]) {
          currentPhase = state.plan.phases[state.currentPhaseId - 1].name;
          currentAction = currentPhase;
        }

        // Update progress tracker with current step
        progressTracker.stepStarted(currentAction, currentPhase);

        // Run the agent loop iteration
        continueLoop = await this.runAgentLoop(state, emitter);

        // Mark step completed for accurate ETA calculation
        progressTracker.stepCompleted();

        // Update total steps estimate if we have a plan
        if (state.plan?.estimatedSteps) {
          progressTracker.updateTotalSteps(state.plan.estimatedSteps);
        }

        // Periodic state save
        if (state.iterations % 5 === 0) {
          await this.updateExecutionRecord(state);
        }
      }

      // Check completion status
      if (state.iterations >= maxIterations && state.status === 'executing') {
        state.status = 'failed';
        progressTracker.complete(false);
        await this.updateExecutionRecord(state, "Max iterations reached");

        // Create error checkpoint
        try {
          await checkpointService.createCheckpoint({
            executionId: execution.id,
            userId,
            phaseName: state.plan?.phases[state.currentPhaseId - 1]?.name || 'unknown',
            stepIndex: state.iterations,
            completedSteps: state.toolHistory.filter(t => t.success).map(t => t.toolName),
            partialResults: state.context as Record<string, any>,
            errorInfo: {
              error: 'MAX_ITERATIONS',
              message: 'Maximum iterations reached',
              timestamp: new Date(),
              retryable: true,
            },
            checkpointReason: 'error',
          });
        } catch (e) {
          console.warn('[Memory] Failed to create error checkpoint:', e);
        }
      } else if (state.status === 'executing') {
        // Didn't explicitly complete - check if plan is done
        if (state.plan && state.plan.phases.every(p => p.status === 'completed')) {
          state.status = 'completed';
          progressTracker.complete(true);
        }
      }

      // Final state save
      await this.updateExecutionRecord(state);

      const duration = Date.now() - startTime;

      // Get progress statistics for logging
      const progressStats = progressTracker.getStats();
      console.log(`[Agent] Execution completed. Duration: ${progressStats.totalDuration}ms, Steps: ${progressStats.stepCount}, Avg step: ${progressStats.avgStepDuration.toFixed(0)}ms`);

      // Determine final result status
      // Note: state.status type is narrowed by TypeScript control flow analysis
      // but it could have been set to 'needs_input' earlier in the execution
      const currentStatus = state.status as AgentState['status'];
      let resultStatus: 'completed' | 'failed' | 'needs_input' | 'max_iterations';

      if (currentStatus === 'completed') {
        resultStatus = 'completed';
        progressTracker.complete(true);
        // Emit completion event
        emitter.executionComplete({
          result: state.context,
          duration,
          tokensUsed: progressStats.stepCount, // Approximate token usage
        });

        // ========================================
        // MEMORY & LEARNING: Record success feedback
        // ========================================
        try {
          const taskType = inferTaskType(taskDescription);

          // Record task history and feedback
          await learningEngine.processFeedback({
            userId,
            executionId: execution.id,
            taskType,
            success: true,
            approach: state.recommendedStrategy?.approach || 'standard',
            executionTime: duration,
          });

          // Update pattern usage if we used one
          if (state.patternMatch?.pattern?.patternId) {
            await patternReuse.recordPatternUsage(
              state.patternMatch.pattern.patternId,
              true,
              duration
            );
          }

          // Invalidate checkpoint (execution complete)
          if (state.checkpointId) {
            await checkpointService.invalidateCheckpoint(state.checkpointId);
          }

          console.log(`[Memory] Recorded successful execution feedback for user ${userId}`);
        } catch (feedbackError) {
          console.warn('[Memory] Failed to record feedback:', feedbackError);
        }
      } else if (currentStatus === 'needs_input') {
        resultStatus = 'needs_input';
      } else if (currentStatus === 'failed') {
        resultStatus = 'failed';
        progressTracker.complete(false);
        // Emit error event
        emitter.executionError({
          error: state.errorCount > 0 ? 'Execution failed after multiple errors' : 'Execution failed',
        });

        // ========================================
        // MEMORY & LEARNING: Record failure feedback
        // ========================================
        try {
          const taskType = inferTaskType(taskDescription);

          // Record task history and feedback
          await learningEngine.processFeedback({
            userId,
            executionId: execution.id,
            taskType,
            success: false,
            approach: state.recommendedStrategy?.approach || 'standard',
            executionTime: duration,
          });

          // Update pattern usage if we used one (mark as failed)
          if (state.patternMatch?.pattern?.patternId) {
            await patternReuse.recordPatternUsage(
              state.patternMatch.pattern.patternId,
              false,
              duration
            );
          }

          console.log(`[Memory] Recorded failed execution feedback for user ${userId}`);
        } catch (feedbackError) {
          console.warn('[Memory] Failed to record failure feedback:', feedbackError);
        }
      } else {
        // All other statuses (initializing, planning, executing) are treated as max_iterations
        resultStatus = 'max_iterations';
        progressTracker.complete(false);
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

      // Mark progress tracker as failed
      progressTracker.complete(false);

      // Emit enhanced error event with explanation
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      emitExplainedError(userId, execution.id.toString(), errorMessage);

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
