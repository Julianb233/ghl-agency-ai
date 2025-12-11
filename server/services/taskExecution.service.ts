/**
 * Task Execution Service
 * Executes agency tasks using browser automation, API calls, or custom handlers
 */

import { getDb } from "../db";
import { eq, and, or, lte, isNull } from "drizzle-orm";
import {
  agencyTasks,
  taskExecutions,
  outboundMessages,
  userWebhooks,
} from "../../drizzle/schema-webhooks";
import { browserbaseSDK } from "../_core/browserbaseSDK";
import { Stagehand } from "@browserbasehq/stagehand";

// ========================================
// TYPES
// ========================================

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  duration?: number;
  screenshots?: string[];
}

export interface TaskExecutionConfig {
  workflowId?: number;
  automationSteps?: AutomationStep[];
  apiEndpoint?: string;
  apiMethod?: "GET" | "POST" | "PUT" | "DELETE";
  apiPayload?: any;
  browserActions?: BrowserAction[];
  timeout?: number;
  retryCount?: number;
}

export interface AutomationStep {
  type: "navigate" | "click" | "type" | "extract" | "wait" | "screenshot";
  config: Record<string, any>;
}

export interface BrowserAction {
  action: string;
  selector?: string;
  value?: string;
  waitFor?: string;
}

// ========================================
// TASK EXECUTION SERVICE
// ========================================

export class TaskExecutionService {
  /**
   * Execute a task
   */
  async executeTask(taskId: number, triggeredBy: string = "automatic"): Promise<ExecutionResult> {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not initialized" };
    }

    const startTime = Date.now();
    let executionId: number | undefined;

    try {
      // Get the task
      const [task] = await db
        .select()
        .from(agencyTasks)
        .where(eq(agencyTasks.id, taskId))
        .limit(1);

      if (!task) {
        return { success: false, error: "Task not found" };
      }

      if (task.status === "completed") {
        return { success: false, error: "Task is already completed" };
      }

      if (task.status === "cancelled") {
        return { success: false, error: "Task is cancelled" };
      }

      if (task.requiresHumanReview && !task.humanReviewedBy) {
        return { success: false, error: "Task requires human review" };
      }

      // Create execution record
      const [execution] = await db
        .insert(taskExecutions)
        .values({
          taskId,
          triggeredBy,
          status: "running",
          attemptNumber: (task.errorCount || 0) + 1,
        })
        .returning();

      executionId = execution.id;

      // Update task status
      await db
        .update(agencyTasks)
        .set({
          status: "in_progress",
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agencyTasks.id, taskId));

      // Execute based on task type
      let result: ExecutionResult;

      switch (task.taskType) {
        case "browser_automation":
          result = await this.executeBrowserAutomation(task, execution.id);
          break;
        case "api_call":
          result = await this.executeApiCall(task);
          break;
        case "notification":
          result = await this.executeNotification(task);
          break;
        case "reminder":
          result = await this.executeReminder(task);
          break;
        case "ghl_action":
          result = await this.executeGhlAction(task);
          break;
        case "data_extraction":
          result = await this.executeDataExtraction(task, execution.id);
          break;
        case "report_generation":
          result = await this.executeReportGeneration(task);
          break;
        default:
          result = await this.executeCustomTask(task);
      }

      const duration = Date.now() - startTime;

      // Update execution record
      await db
        .update(taskExecutions)
        .set({
          status: result.success ? "success" : "failed",
          output: result.output,
          error: result.error,
          duration,
          screenshots: result.screenshots,
          completedAt: new Date(),
        })
        .where(eq(taskExecutions.id, executionId));

      // Update task status
      if (result.success) {
        await db
          .update(agencyTasks)
          .set({
            status: "completed",
            completedAt: new Date(),
            result: result.output,
            resultSummary: this.generateResultSummary(result),
            updatedAt: new Date(),
          })
          .where(eq(agencyTasks.id, taskId));

        // Send completion notification if enabled
        if (task.notifyOnComplete) {
          await this.sendNotification(task, "completed", result);
        }
      } else {
        const newErrorCount = (task.errorCount || 0) + 1;
        const maxRetries = task.maxRetries || 3;

        if (newErrorCount >= maxRetries) {
          await db
            .update(agencyTasks)
            .set({
              status: "failed",
              lastError: result.error,
              errorCount: newErrorCount,
              statusReason: `Failed after ${newErrorCount} attempts`,
              updatedAt: new Date(),
            })
            .where(eq(agencyTasks.id, taskId));

          // Send failure notification if enabled
          if (task.notifyOnFailure) {
            await this.sendNotification(task, "failed", result);
          }
        } else {
          await db
            .update(agencyTasks)
            .set({
              status: "pending",
              lastError: result.error,
              errorCount: newErrorCount,
              statusReason: `Attempt ${newErrorCount} failed, will retry`,
              updatedAt: new Date(),
            })
            .where(eq(agencyTasks.id, taskId));
        }
      }

      return { ...result, duration };
    } catch (error) {
      console.error("Task execution error:", error);

      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update execution record if created
      if (executionId) {
        const db2 = await getDb();
        if (db2) {
          await db2
            .update(taskExecutions)
            .set({
              status: "failed",
              error: errorMessage,
              duration,
              completedAt: new Date(),
            })
            .where(eq(taskExecutions.id, executionId));
        }
      }

      return { success: false, error: errorMessage, duration };
    }
  }

  /**
   * Execute browser automation task
   */
  private async executeBrowserAutomation(
    task: typeof agencyTasks.$inferSelect,
    executionId: number
  ): Promise<ExecutionResult> {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not initialized" };
    }

    try {
      const config = task.executionConfig as TaskExecutionConfig | null;
      if (!config?.browserActions && !config?.automationSteps) {
        return { success: false, error: "No browser actions configured" };
      }

      // Create Browserbase session
      const session = await browserbaseSDK.createSession();

      // Get debug URL for live view
      const debugInfo = await browserbaseSDK.getSessionDebug(session.id);

      // Update execution with session info
      await db
        .update(taskExecutions)
        .set({
          browserSessionId: session.id,
          debugUrl: debugInfo.debuggerFullscreenUrl,
        })
        .where(eq(taskExecutions.id, executionId));

      // Initialize Stagehand
      const modelName = process.env.STAGEHAND_MODEL || process.env.AI_MODEL || "google/gemini-2.0-flash";

      const stagehand = new Stagehand({
        env: "BROWSERBASE",
        verbose: 0, // Disable verbose logging to prevent pino-pretty loading
        enableCaching: false,
        model: modelName,
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        browserbaseSessionID: session.id,
      });

      await stagehand.init();
      const page = stagehand.context.pages()[0];

      const results: any[] = [];
      const screenshots: string[] = [];

      // Execute automation steps
      const steps = config.automationSteps || config.browserActions || [];
      for (const step of steps) {
        try {
          const stepResult = await this.executeAutomationStep(stagehand, page, step);
          results.push(stepResult);

          // Take screenshot if requested
          if ((step as any).screenshot) {
            const screenshotPath = `/tmp/screenshot_${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath });
            screenshots.push(screenshotPath);
          }
        } catch (stepError) {
          console.error("Step execution failed:", stepError);
          if (!(step as any).continueOnError) {
            throw stepError;
          }
          results.push({ error: stepError instanceof Error ? stepError.message : "Step failed" });
        }
      }

      await stagehand.close();

      return {
        success: true,
        output: { steps: results, sessionId: session.id },
        screenshots,
      };
    } catch (error) {
      console.error("Browser automation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Browser automation failed",
      };
    }
  }

  /**
   * Execute a single automation step
   */
  private async executeAutomationStep(
    stagehand: Stagehand,
    page: any,
    step: AutomationStep | BrowserAction
  ): Promise<any> {
    const stepType = (step as AutomationStep).type || (step as BrowserAction).action;
    const config = (step as AutomationStep).config || step;

    switch (stepType) {
      case "navigate":
        await page.goto(config.url);
        return { action: "navigate", url: config.url };

      case "click":
        if (config.selector) {
          await page.click(config.selector);
        } else if (config.instruction) {
          await stagehand.act(config.instruction);
        }
        return { action: "click", selector: config.selector };

      case "type":
        if (config.selector) {
          await page.fill(config.selector, config.value);
        }
        return { action: "type", selector: config.selector };

      case "extract":
        const extracted = await stagehand.extract(config.instruction || "Extract the main content");
        return { action: "extract", data: extracted };

      case "wait":
        await new Promise((resolve) => setTimeout(resolve, config.duration || 1000));
        return { action: "wait", duration: config.duration };

      case "screenshot":
        const screenshot = await page.screenshot({ encoding: "base64" });
        return { action: "screenshot", data: screenshot };

      default:
        return { action: stepType, error: "Unknown action" };
    }
  }

  /**
   * Execute API call task
   */
  private async executeApiCall(task: typeof agencyTasks.$inferSelect): Promise<ExecutionResult> {
    try {
      const config = task.executionConfig as TaskExecutionConfig | null;
      if (!config?.apiEndpoint) {
        return { success: false, error: "No API endpoint configured" };
      }

      const response = await fetch(config.apiEndpoint, {
        method: config.apiMethod || "GET",
        headers: {
          "Content-Type": "application/json",
        },
        body: config.apiPayload ? JSON.stringify(config.apiPayload) : undefined,
      });

      const data = await response.json();

      return {
        success: response.ok,
        output: data,
        error: response.ok ? undefined : `API returned ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "API call failed",
      };
    }
  }

  /**
   * Execute notification task
   */
  private async executeNotification(
    task: typeof agencyTasks.$inferSelect
  ): Promise<ExecutionResult> {
    // TODO: Implement actual notification sending
    return {
      success: true,
      output: { message: "Notification sent", taskId: task.id },
    };
  }

  /**
   * Execute reminder task
   */
  private async executeReminder(task: typeof agencyTasks.$inferSelect): Promise<ExecutionResult> {
    // TODO: Implement actual reminder
    return {
      success: true,
      output: { message: "Reminder set", taskId: task.id },
    };
  }

  /**
   * Execute GHL action task
   */
  private async executeGhlAction(task: typeof agencyTasks.$inferSelect): Promise<ExecutionResult> {
    // TODO: Implement GHL API integration
    return {
      success: true,
      output: { message: "GHL action executed", taskId: task.id },
    };
  }

  /**
   * Execute data extraction task
   */
  private async executeDataExtraction(
    task: typeof agencyTasks.$inferSelect,
    executionId: number
  ): Promise<ExecutionResult> {
    // Use browser automation for extraction
    return this.executeBrowserAutomation(task, executionId);
  }

  /**
   * Execute report generation task
   */
  private async executeReportGeneration(
    task: typeof agencyTasks.$inferSelect
  ): Promise<ExecutionResult> {
    // TODO: Implement report generation
    return {
      success: true,
      output: { message: "Report generated", taskId: task.id },
    };
  }

  /**
   * Execute custom task
   */
  private async executeCustomTask(task: typeof agencyTasks.$inferSelect): Promise<ExecutionResult> {
    // For custom tasks, just mark as completed
    return {
      success: true,
      output: { message: "Custom task completed", taskId: task.id },
    };
  }

  /**
   * Send notification about task status
   */
  private async sendNotification(
    task: typeof agencyTasks.$inferSelect,
    status: "completed" | "failed",
    result: ExecutionResult
  ): Promise<void> {
    const db = await getDb();
    if (!db || !task.sourceWebhookId) return;

    try {
      const [webhook] = await db
        .select()
        .from(userWebhooks)
        .where(eq(userWebhooks.id, task.sourceWebhookId))
        .limit(1);

      if (!webhook || !webhook.outboundEnabled) return;

      const message =
        status === "completed"
          ? `Task completed: ${task.title}\n\nResult: ${result.output?.message || "Success"}`
          : `Task failed: ${task.title}\n\nError: ${result.error}`;

      // Create outbound message
      await db.insert(outboundMessages).values({
        webhookId: webhook.id,
        userId: task.userId,
        taskId: task.id,
        conversationId: task.conversationId,
        messageType: "task_update",
        content: message,
        recipientIdentifier: "owner", // Will be resolved based on webhook config
        deliveryStatus: "pending",
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }

  /**
   * Generate result summary
   */
  private generateResultSummary(result: ExecutionResult): string {
    if (!result.success) {
      return `Failed: ${result.error}`;
    }

    if (result.output?.message) {
      return result.output.message;
    }

    if (result.output?.steps) {
      return `Completed ${result.output.steps.length} automation steps`;
    }

    return "Task completed successfully";
  }

  /**
   * Process pending tasks (called by scheduler)
   */
  async processPendingTasks(): Promise<{ processed: number; success: number; failed: number }> {
    const db = await getDb();
    if (!db) {
      return { processed: 0, success: 0, failed: 0 };
    }

    try {
      // Get tasks ready for execution
      const pendingTasks = await db
        .select()
        .from(agencyTasks)
        .where(
          and(
            eq(agencyTasks.assignedToBot, true),
            eq(agencyTasks.requiresHumanReview, false),
            or(
              eq(agencyTasks.status, "pending"),
              eq(agencyTasks.status, "queued")
            ),
            or(
              isNull(agencyTasks.scheduledFor),
              lte(agencyTasks.scheduledFor, new Date())
            )
          )
        )
        .limit(10); // Process in batches

      let success = 0;
      let failed = 0;

      for (const task of pendingTasks) {
        const result = await this.executeTask(task.id, "scheduled");
        if (result.success) {
          success++;
        } else {
          failed++;
        }
      }

      return { processed: pendingTasks.length, success, failed };
    } catch (error) {
      console.error("Failed to process pending tasks:", error);
      return { processed: 0, success: 0, failed: 0 };
    }
  }
}

// Export singleton instance
export const taskExecutionService = new TaskExecutionService();
