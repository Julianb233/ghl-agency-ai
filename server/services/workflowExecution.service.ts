import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import {
  automationWorkflows,
  workflowExecutions,
  browserSessions,
  extractedData,
} from "../../drizzle/schema";
import { getBrowserbaseService } from "../_core/browserbase";
import { browserbaseSDK } from "../_core/browserbaseSDK";
import { cacheService, CACHE_TTL } from "./cache.service";
import { cacheKeys } from "../lib/cacheKeys";
import { evaluateExpression } from "../lib/safeExpressionParser";
import type {
  WorkflowStep,
  WorkflowStepType,
  ExecutionContext,
  StepResult,
  ExecuteWorkflowOptions,
  ExecutionStatus,
  HttpMethod,
} from "../types";

/**
 * Workflow Execution Service
 * Handles execution of automation workflows with step-by-step processing
 */

// ========================================
// TYPES & INTERFACES
// ========================================

// Re-export types for backward compatibility
export type {
  WorkflowStep,
  ExecutionContext,
  StepResult,
  ExecuteWorkflowOptions,
  ExecutionStatus,
};

export interface TestExecuteWorkflowOptions {
  userId: number;
  steps: WorkflowStep[];
  variables?: Record<string, unknown>;
  geolocation?: {
    city?: string;
    state?: string;
    country?: string;
  };
  stepByStep?: boolean;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Resolve the correct LLM API key for a given model name
 */
function resolveModelApiKey(modelName: string): string {
  const isGoogleModel = modelName.includes("google") || modelName.includes("gemini");
  const isAnthropicModel = modelName.includes("anthropic") || modelName.includes("claude");

  let modelApiKey: string | undefined;
  if (isAnthropicModel) {
    modelApiKey = process.env.ANTHROPIC_API_KEY;
  } else if (isGoogleModel) {
    modelApiKey = process.env.GEMINI_API_KEY;
  } else {
    modelApiKey = process.env.OPENAI_API_KEY;
  }

  if (!modelApiKey) {
    const keyName = isAnthropicModel
      ? "ANTHROPIC_API_KEY"
      : isGoogleModel
      ? "GEMINI_API_KEY"
      : "OPENAI_API_KEY";
    throw new Error(
      `Missing API key for model ${modelName}. Please set ${keyName} in your environment.`
    );
  }

  return modelApiKey;
}

/**
 * Substitute variables in a string value
 * Supports {{variableName}} syntax
 */
export function substituteVariables(value: unknown, variables: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });
  }
  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      return value.map((item) => substituteVariables(item, variables));
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = substituteVariables(val, variables);
    }
    return result;
  }
  return value;
}

/**
 * Update execution status in database
 */
async function updateExecutionStatus(
  executionId: number,
  updates: {
    status?: string;
    currentStep?: number;
    completedAt?: Date;
    error?: string;
    output?: unknown;
    stepResults?: unknown[];
  }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not initialized");
  }

  await db
    .update(workflowExecutions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(workflowExecutions.id, executionId));
}

// ========================================
// STEP HANDLERS
// ========================================

/**
 * Execute a navigate step - Navigate browser to URL
 */
async function executeNavigateStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<StepResult> {
  const { config } = step;
  const url = substituteVariables(config.url, context.variables);

  if (!url) {
    throw new Error("Navigate step requires URL");
  }

  const page = context.stagehand.context.pages()[0];
  await page.goto(url);

  return {
    success: true,
    result: { url, timestamp: new Date() },
  };
}

/**
 * Execute an act step - Perform action using Stagehand
 */
async function executeActStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<StepResult> {
  const { config } = step;
  const instruction = substituteVariables(config.instruction, context.variables);

  if (!instruction) {
    throw new Error("Act step requires instruction");
  }

  await context.stagehand.act(instruction);

  return {
    success: true,
    result: { instruction, timestamp: new Date() },
  };
}

/**
 * Execute an observe step - Get available actions from page
 */
async function executeObserveStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<StepResult> {
  const { config } = step;
  const instruction = substituteVariables(config.observeInstruction, context.variables);

  if (!instruction) {
    throw new Error("Observe step requires instruction");
  }

  const actions = await context.stagehand.observe(instruction);

  return {
    success: true,
    result: { actions, timestamp: new Date() },
  };
}

/**
 * Execute an extract step - Extract structured data from page
 */
async function executeExtractStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<StepResult> {
  const { config } = step;
  const instruction = substituteVariables(config.extractInstruction, context.variables);

  if (!instruction) {
    throw new Error("Extract step requires instruction");
  }

  let extractedData: any;
  const page = context.stagehand.context.pages()[0];
  const currentUrl = page.url();

  // Use predefined schemas or custom extraction
  if (config.schemaType === "contactInfo") {
    extractedData = await context.stagehand.extract(
      instruction,
      z.object({
        contactInfo: z.object({
          email: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          name: z.string().optional(),
          company: z.string().optional(),
        }),
      }) as any
    );
  } else if (config.schemaType === "productInfo") {
    extractedData = await context.stagehand.extract(
      instruction,
      z.object({
        productInfo: z.object({
          name: z.string().optional(),
          price: z.string().optional(),
          description: z.string().optional(),
          availability: z.string().optional(),
          sku: z.string().optional(),
          rating: z.string().optional(),
        }),
      }) as any
    );
  } else {
    // Custom extraction without schema
    extractedData = await context.stagehand.extract(instruction);
  }

  // Store extracted data in context for later use
  context.extractedData.push({
    url: currentUrl,
    dataType: config.schemaType || "custom",
    data: extractedData,
  });

  // Save to database
  const db = await getDb();
  if (db) {
    await db.insert(extractedData).values({
      executionId: context.executionId,
      userId: context.userId,
      url: currentUrl,
      dataType: config.schemaType || "custom",
      data: extractedData,
      metadata: {
        stepType: "extract",
        instruction,
        timestamp: new Date(),
      },
    });
  }

  return {
    success: true,
    result: extractedData,
  };
}

/**
 * Execute a wait step - Wait for time or element
 */
async function executeWaitStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<StepResult> {
  const { config } = step;
  const waitMs = config.waitMs || 1000;

  if (config.selector) {
    // Wait for element
    const selector = substituteVariables(config.selector, context.variables);
    const page = context.stagehand.context.pages()[0];
    // Use Playwright's locator API instead of deprecated waitForSelector
    await page.locator(selector).waitFor({ timeout: waitMs });
    return {
      success: true,
      result: { waitedFor: "selector", selector, timestamp: new Date() },
    };
  } else {
    // Wait for time
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return {
      success: true,
      result: { waitedFor: "time", waitMs, timestamp: new Date() },
    };
  }
}

/**
 * Execute a condition step - Evaluate condition and branch
 */
async function executeConditionStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<StepResult> {
  const { config } = step;
  const condition = substituteVariables(config.condition, context.variables);

  if (!condition) {
    throw new Error("Condition step requires condition expression");
  }

  // Safely evaluate condition using secure expression parser
  // Supports: comparisons, logical operators, property access
  let passed = false;
  let evaluationError: string | undefined;

  try {
    // Check for legacy {{variable}} syntax for backward compatibility
    if (typeof condition === "string" && condition.startsWith("{{") && condition.endsWith("}}")) {
      const varName = condition.slice(2, -2);
      passed = context.variables[varName] !== undefined && context.variables[varName] !== null;
    } else {
      // Use safe expression parser (NO eval, NO Function constructor)
      const result = evaluateExpression(String(condition), context.variables);

      if (result.success) {
        passed = result.result;
      } else {
        // Log evaluation error but don't throw - allow workflow to continue
        console.error("Condition evaluation error:", result.error);
        evaluationError = result.error;
        passed = false;
      }
    }
  } catch (error) {
    console.error("Condition evaluation error:", error);
    evaluationError = error instanceof Error ? error.message : "Unknown error";
    passed = false;
  }

  return {
    success: true,
    result: {
      condition,
      passed,
      timestamp: new Date(),
      ...(evaluationError && { evaluationError })
    },
  };
}

/**
 * Execute a loop step - Iterate over data
 */
async function executeLoopStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<StepResult> {
  const { config } = step;
  const items = substituteVariables(config.items, context.variables);

  if (!Array.isArray(items)) {
    throw new Error("Loop step requires items array");
  }

  const results: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // Set loop variables
    context.variables["__loopItem"] = item;
    context.variables["__loopIndex"] = i;

    // Note: In a full implementation, you would execute nested steps here
    // For now, we just collect the items
    results.push({ index: i, item });
  }

  return {
    success: true,
    result: { iterations: results.length, results, timestamp: new Date() },
  };
}

/**
 * Execute an API call step - Make HTTP request
 */
async function executeApiCallStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<StepResult> {
  const { config } = step;
  const url = substituteVariables(config.url, context.variables);
  const method = (config.method || "GET").toUpperCase();
  const headers = substituteVariables(config.headers || {}, context.variables);
  const body = config.body ? substituteVariables(config.body, context.variables) : undefined;

  if (!url) {
    throw new Error("API call step requires URL");
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET" && method !== "HEAD") {
    fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const responseData = await response.json().catch(() => response.text());

  // Store response in variables if variable name is provided
  if (config.saveAs) {
    context.variables[config.saveAs] = responseData;
  }

  return {
    success: true,
    result: {
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      timestamp: new Date(),
    },
  };
}

/**
 * Execute a notification step - Send notification
 */
async function executeNotificationStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<StepResult> {
  const { config } = step;
  const message = substituteVariables(config.message, context.variables);
  const type = config.type || "info";

  if (!message) {
    throw new Error("Notification step requires message");
  }

  // In a real implementation, this would send notifications via email, SMS, etc.
  console.log(`[Notification - ${type}]: ${message}`);

  return {
    success: true,
    result: { message, type, timestamp: new Date() },
  };
}

// ========================================
// CORE EXECUTION FUNCTIONS
// ========================================

/**
 * Execute a single workflow step
 */
async function executeStep(
  step: WorkflowStep,
  context: ExecutionContext
): Promise<StepResult> {
  console.log(`Executing step ${step.order}: ${step.type}`);

  try {
    let result: StepResult;

    switch (step.type) {
      case "navigate":
        result = await executeNavigateStep(step, context);
        break;

      case "act":
        result = await executeActStep(step, context);
        break;

      case "observe":
        result = await executeObserveStep(step, context);
        break;

      case "extract":
        result = await executeExtractStep(step, context);
        break;

      case "wait":
        result = await executeWaitStep(step, context);
        break;

      case "condition":
        result = await executeConditionStep(step, context);
        break;

      case "loop":
        result = await executeLoopStep(step, context);
        break;

      case "apiCall":
        result = await executeApiCallStep(step, context);
        break;

      case "notification":
        result = await executeNotificationStep(step, context);
        break;

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    return result;
  } catch (error) {
    console.error(`Step ${step.order} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle step result and update context
 */
async function handleStepResult(
  step: WorkflowStep,
  stepIndex: number,
  result: StepResult,
  context: ExecutionContext
): Promise<void> {
  // Add result to context
  context.stepResults.push({
    stepIndex,
    type: step.type,
    success: result.success,
    result: result.result,
    error: result.error,
    timestamp: new Date(),
  });

  // Update execution record with current progress
  await updateExecutionStatus(context.executionId, {
    currentStep: stepIndex + 1,
    stepResults: context.stepResults,
  });

  // Store result in variables if saveAs is specified
  if (step.config.saveAs && result.success && result.result) {
    context.variables[step.config.saveAs] = result.result;
  }
}

/**
 * Main workflow execution function
 */
export async function executeWorkflow(
  options: ExecuteWorkflowOptions
): Promise<ExecutionStatus> {
  const { workflowId, userId, variables = {}, geolocation } = options;

  const db = await getDb();
  if (!db) {
    throw new Error("Database not initialized");
  }

  let sessionId: string | undefined;
  let executionId: number | undefined;
  let stagehand: Stagehand | undefined;

  try {
    // 1. Fetch workflow (with caching - 5 minutes TTL)
    const workflow = await cacheService.getOrSet(
      cacheKeys.workflowDefinition(workflowId.toString()),
      async () => {
        const [wf] = await db
          .select()
          .from(automationWorkflows)
          .where(and(eq(automationWorkflows.id, workflowId), eq(automationWorkflows.userId, userId)))
          .limit(1);
        return wf;
      },
      CACHE_TTL.MEDIUM // 5 minutes
    );

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (!workflow.isActive) {
      throw new Error("Workflow is not active");
    }

    const steps = workflow.steps as WorkflowStep[];

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error("Workflow has no steps");
    }

    // Sort steps by order
    steps.sort((a, b) => a.order - b.order);

    // 2. Create execution record
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        workflowId,
        userId,
        status: "running",
        startedAt: new Date(),
        input: variables,
      })
      .returning();

    executionId = execution.id;

    // 3. Create browser session
    const session = geolocation
      ? await browserbaseSDK.createSessionWithGeoLocation(geolocation)
      : await browserbaseSDK.createSession({
          projectId: process.env.BROWSERBASE_PROJECT_ID,
          proxies: true,
          timeout: 3600,
          keepAlive: true,
          browserSettings: {
            viewport: { width: 1920, height: 1080 },
          },
        });

    sessionId = session.id;
    console.log(`Workflow execution session created: ${session.id}`);

    // Store browser session in database
    const [browserSession] = await db.insert(browserSessions).values({
      userId,
      sessionId: session.id,
      status: "active",
      url: "",
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      metadata: {
        workflowId,
        executionId,
      },
    }).returning();

    // Update execution with browser session ID (for cancellation lookup)
    await db
      .update(workflowExecutions)
      .set({ sessionId: browserSession.id })
      .where(eq(workflowExecutions.id, executionId));

    // 4. Initialize Stagehand
    const modelName = "google/gemini-2.0-flash";
    const modelApiKey = resolveModelApiKey(modelName);

    stagehand = new Stagehand({
      env: "BROWSERBASE",
      verbose: 1,
      disablePino: true,
      modelApiKey,
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserbaseSessionCreateParams: {
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        proxies: true,
        region: "us-west-2",
        timeout: 3600,
        keepAlive: true,
        browserSettings: {
          advancedStealth: false,
          blockAds: true,
          solveCaptchas: true,
          recordSession: true,
          viewport: { width: 1920, height: 1080 },
        },
        userMetadata: {
          userId: `user-${userId}`,
          workflowId: `workflow-${workflowId}`,
          executionId: `execution-${executionId}`,
          environment: process.env.NODE_ENV || "development",
        },
      },
    });

    await stagehand.init();

    // 5. Create execution context
    const context: ExecutionContext = {
      workflowId,
      executionId,
      userId,
      sessionId: session.id,
      stagehand,
      variables: { ...variables },
      stepResults: [],
      extractedData: [],
    };

    // 6. Execute steps sequentially
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Execute step
      const result = await executeStep(step, context);

      // Handle result
      await handleStepResult(step, i, result, context);

      // Check if step failed and should stop execution
      if (!result.success && !step.config.continueOnError) {
        throw new Error(`Step ${i + 1} failed: ${result.error}`);
      }
    }

    // 7. Clean up and mark as completed
    await stagehand.close();

    const duration = Date.now() - new Date(execution.startedAt || Date.now()).getTime();

    await updateExecutionStatus(executionId, {
      status: "completed",
      completedAt: new Date(),
      output: {
        extractedData: context.extractedData,
        finalVariables: context.variables,
      },
      stepResults: context.stepResults,
    });

    // Update workflow statistics
    await db
      .update(automationWorkflows)
      .set({
        executionCount: (workflow.executionCount || 0) + 1,
        lastExecutedAt: new Date(),
      })
      .where(eq(automationWorkflows.id, workflowId));

    // Update browser session status
    await db
      .update(browserSessions)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(browserSessions.sessionId, sessionId));

    return {
      executionId,
      workflowId,
      status: "completed",
      startedAt: execution.startedAt || undefined,
      completedAt: new Date(),
      stepResults: context.stepResults,
      output: {
        extractedData: context.extractedData,
        finalVariables: context.variables,
      },
    };
  } catch (error) {
    console.error("Workflow execution failed:", error);

    // Update execution record with error
    if (executionId) {
      await updateExecutionStatus(executionId, {
        status: "failed",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Clean up browser session
    if (stagehand) {
      try {
        await stagehand.close();
      } catch (closeError) {
        console.error("Failed to close Stagehand:", closeError);
      }
    }

    if (sessionId && db) {
      await db
        .update(browserSessions)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(browserSessions.sessionId, sessionId));
    }

    throw error;
  }
}

/**
 * Get execution status
 */
export async function getExecutionStatus(executionId: number): Promise<ExecutionStatus> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not initialized");
  }

  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, executionId))
    .limit(1);

  if (!execution) {
    throw new Error("Execution not found");
  }

  return {
    executionId: execution.id,
    workflowId: execution.workflowId,
    status: execution.status,
    startedAt: execution.startedAt || undefined,
    completedAt: execution.completedAt || undefined,
    currentStep: execution.stepResults
      ? (execution.stepResults as any[]).length
      : undefined,
    stepResults: execution.stepResults as any[],
    output: execution.output,
    error: execution.error || undefined,
  };
}

/**
 * Test execute workflow without saving to database
 * Used for testing workflows before saving them
 */
export async function testExecuteWorkflow(
  options: TestExecuteWorkflowOptions
): Promise<ExecutionStatus> {
  const { userId, steps, variables = {}, geolocation, stepByStep = false } = options;

  let stagehand: Stagehand | undefined;
  let sessionId: string | undefined;

  try {
    // Validate and sort steps
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error("Test workflow has no steps");
    }

    const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

    // Create browser session
    const session = geolocation
      ? await browserbaseSDK.createSessionWithGeoLocation(geolocation)
      : await browserbaseSDK.createSession({
          projectId: process.env.BROWSERBASE_PROJECT_ID,
          proxies: true,
          timeout: 3600,
          keepAlive: true,
          browserSettings: {
            viewport: { width: 1920, height: 1080 },
          },
        });

    sessionId = session.id;
    console.log(`Test workflow session created: ${session.id}`);

    // Initialize Stagehand
    const modelName = "google/gemini-2.0-flash";
    const modelApiKey = resolveModelApiKey(modelName);

    stagehand = new Stagehand({
      env: "BROWSERBASE",
      verbose: 1,
      disablePino: true,
      modelApiKey,
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserbaseSessionCreateParams: {
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        proxies: true,
        region: "us-west-2",
        timeout: 3600,
        keepAlive: true,
        browserSettings: {
          advancedStealth: false,
          blockAds: true,
          solveCaptchas: true,
          recordSession: true,
          viewport: { width: 1920, height: 1080 },
        },
        userMetadata: {
          userId: `user-${userId}`,
          testRun: "true",
          environment: process.env.NODE_ENV || "development",
        },
      },
    });

    await stagehand.init();

    // Create execution context (no execution ID since we're not saving)
    const context: ExecutionContext = {
      workflowId: -1, // Dummy ID for test
      executionId: -1, // Dummy ID for test
      userId,
      sessionId: session.id,
      stagehand,
      variables: { ...variables },
      stepResults: [],
      extractedData: [],
    };

    const startTime = Date.now();

    // Execute steps sequentially
    for (let i = 0; i < sortedSteps.length; i++) {
      const step = sortedSteps[i];
      const stepStartTime = Date.now();

      console.log(`Test run - Executing step ${i + 1}/${sortedSteps.length}: ${step.type}`);

      // Execute step
      const result = await executeStep(step, context);

      // Calculate duration
      const duration = Date.now() - stepStartTime;

      // Add result to context with duration
      context.stepResults.push({
        stepIndex: i,
        type: step.type,
        success: result.success,
        result: result.result,
        error: result.error,
        timestamp: new Date(),
        duration,
      } as any);

      // Store result in variables if saveAs is specified
      if (step.config.saveAs && result.success && result.result) {
        context.variables[step.config.saveAs] = result.result;
      }

      // Check if step failed and should stop execution
      if (!result.success && !step.config.continueOnError) {
        const totalDuration = Date.now() - startTime;

        // Clean up
        await stagehand.close();

        return {
          executionId: -1,
          workflowId: -1,
          status: "failed",
          startedAt: new Date(startTime),
          completedAt: new Date(),
          stepResults: context.stepResults,
          output: {
            extractedData: context.extractedData,
            finalVariables: context.variables,
            duration: totalDuration,
          },
          error: `Step ${i + 1} failed: ${result.error}`,
        };
      }

      // If step-by-step mode, add a small delay to allow UI to update
      if (stepByStep && i < sortedSteps.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const totalDuration = Date.now() - startTime;

    // Clean up
    await stagehand.close();

    return {
      executionId: -1,
      workflowId: -1,
      status: "completed",
      startedAt: new Date(startTime),
      completedAt: new Date(),
      stepResults: context.stepResults,
      output: {
        extractedData: context.extractedData,
        finalVariables: context.variables,
        duration: totalDuration,
      },
    };
  } catch (error) {
    console.error("Test workflow execution failed:", error);

    // Clean up browser session
    if (stagehand) {
      try {
        await stagehand.close();
      } catch (closeError) {
        console.error("Failed to close Stagehand:", closeError);
      }
    }

    throw error;
  }
}

/**
 * Cancel workflow execution
 */
export async function cancelExecution(executionId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not initialized");
  }

  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, executionId))
    .limit(1);

  if (!execution) {
    throw new Error("Execution not found");
  }

  if (execution.status !== "running") {
    throw new Error("Only running executions can be cancelled");
  }

  // Update execution status
  await updateExecutionStatus(executionId, {
    status: "cancelled",
    completedAt: new Date(),
    error: "Cancelled by user",
  });

  // Terminate browser session if exists
  if (execution.sessionId) {
    const [browserSession] = await db
      .select()
      .from(browserSessions)
      .where(eq(browserSessions.id, execution.sessionId))
      .limit(1);

    if (browserSession && browserSession.sessionId) {
      try {
        await browserbaseSDK.terminateSession(browserSession.sessionId);
        await db
          .update(browserSessions)
          .set({
            status: "cancelled",
            completedAt: new Date(),
          })
          .where(eq(browserSessions.id, execution.sessionId));
      } catch (error) {
        console.error("Failed to terminate browser session:", error);
      }
    }
  }
}
