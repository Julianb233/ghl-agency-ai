/**
 * Scheduler Runner Service
 * Polls for scheduled tasks and executes them when due
 */

import { getDb } from "../db";
import { eq, and, lte, or } from "drizzle-orm";
import { scheduledBrowserTasks, scheduledTaskExecutions } from "../../drizzle/schema-scheduled-tasks";
import { cronSchedulerService } from "./cronScheduler.service";
import { credentialRotationService } from "./credentialRotation.service";

// ========================================
// TYPES
// ========================================

export interface SchedulerStats {
  totalTasks: number;
  activeTasks: number;
  tasksRun: number;
  successCount: number;
  failureCount: number;
  lastCheckTime: Date;
  credentialRotationStats?: {
    processed: number;
    rotated: number;
    failed: number;
    skipped: number;
    lastRunTime: Date;
  };
}

// ========================================
// SCHEDULER RUNNER SERVICE
// ========================================

class SchedulerRunnerService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private credentialRotationIntervalId: NodeJS.Timeout | null = null;
  private checkIntervalMs = 60000; // Check every minute
  private credentialRotationIntervalMs = 24 * 60 * 60 * 1000; // Check daily
  private stats: SchedulerStats = {
    totalTasks: 0,
    activeTasks: 0,
    tasksRun: 0,
    successCount: 0,
    failureCount: 0,
    lastCheckTime: new Date(),
  };

  /**
   * Start the scheduler runner
   */
  start(checkIntervalMs: number = 60000): void {
    if (this.isRunning) {
      console.log("Scheduler runner is already running");
      return;
    }

    this.checkIntervalMs = checkIntervalMs;
    this.isRunning = true;

    console.log(`Starting scheduler runner (checking every ${checkIntervalMs / 1000}s)`);

    // Run immediately on start
    this.checkScheduledTasks();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.checkScheduledTasks();
    }, checkIntervalMs);

    // Start credential rotation check (runs daily)
    this.startCredentialRotationCheck();
  }

  /**
   * Start the credential rotation check interval
   */
  private startCredentialRotationCheck(): void {
    console.log(`Starting credential rotation check (running daily)`);

    // Run immediately on start
    this.checkCredentialRotations();

    // Then run on interval (daily)
    this.credentialRotationIntervalId = setInterval(() => {
      this.checkCredentialRotations();
    }, this.credentialRotationIntervalMs);
  }

  /**
   * Stop the scheduler runner
   */
  stop(): void {
    if (!this.isRunning) {
      console.log("Scheduler runner is not running");
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.credentialRotationIntervalId) {
      clearInterval(this.credentialRotationIntervalId);
      this.credentialRotationIntervalId = null;
    }

    this.isRunning = false;
    console.log("Scheduler runner stopped");
  }

  /**
   * Check for credentials due for rotation
   */
  private async checkCredentialRotations(): Promise<void> {
    try {
      console.log("[SchedulerRunner] Checking credential rotations...");

      const result = await credentialRotationService.runScheduledRotations();

      this.stats.credentialRotationStats = {
        ...result,
        lastRunTime: new Date(),
      };

      if (result.processed > 0) {
        console.log(
          `[SchedulerRunner] Credential rotation complete: ${result.rotated} rotated, ${result.failed} failed, ${result.skipped} skipped`
        );
      }
    } catch (error) {
      console.error("[SchedulerRunner] Error checking credential rotations:", error);
    }
  }

  /**
   * Check for scheduled tasks that need to run
   */
  private async checkScheduledTasks(): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        console.error("Database not available");
        return;
      }

      this.stats.lastCheckTime = new Date();
      const now = new Date();

      // Get all active scheduled tasks
      const tasks = await db
        .select()
        .from(scheduledBrowserTasks)
        .where(
          and(
            eq(scheduledBrowserTasks.isActive, true),
            eq(scheduledBrowserTasks.status, "active")
          )
        );

      this.stats.totalTasks = tasks.length;
      let tasksTriggered = 0;

      for (const task of tasks) {
        try {
          // Check if task should run
          const shouldRun = cronSchedulerService.isTimeToRun(
            task.cronExpression,
            task.lastRun,
            task.timezone
          );

          if (shouldRun) {
            console.log(`Task ${task.id} (${task.name}) is due to run`);

            // Queue the task for execution
            await this.queueTaskExecution(task.id);
            tasksTriggered++;

            // Update next run time
            const nextRun = cronSchedulerService.getNextRunTime(
              task.cronExpression,
              task.timezone
            );

            await db
              .update(scheduledBrowserTasks)
              .set({
                nextRun,
                updatedAt: new Date(),
              })
              .where(eq(scheduledBrowserTasks.id, task.id));
          }
        } catch (error) {
          console.error(`Error checking task ${task.id}:`, error);
        }
      }

      this.stats.activeTasks = tasksTriggered;

      if (tasksTriggered > 0) {
        console.log(`Triggered ${tasksTriggered} scheduled tasks`);
      }
    } catch (error) {
      console.error("Error checking scheduled tasks:", error);
    }
  }

  /**
   * Queue a task for execution
   */
  private async queueTaskExecution(taskId: number): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        console.error("Database not available");
        return;
      }

      // Get the task details
      const [task] = await db
        .select()
        .from(scheduledBrowserTasks)
        .where(eq(scheduledBrowserTasks.id, taskId))
        .limit(1);

      if (!task) {
        console.error(`Task ${taskId} not found`);
        return;
      }

      // Create execution record
      const [execution] = await db
        .insert(scheduledTaskExecutions)
        .values({
          taskId,
          status: "queued",
          triggerType: "scheduled",
          attemptNumber: 1,
        })
        .returning();

      console.log(`Created execution ${execution.id} for task ${taskId}`);

      // Execute the task immediately
      // In a production system, you might want to use a job queue like BullMQ
      this.executeTask(taskId, execution.id);
    } catch (error) {
      console.error(`Error queueing task ${taskId}:`, error);
    }
  }

  /**
   * Execute a scheduled task
   */
  private async executeTask(taskId: number, executionId: number): Promise<void> {
    const startTime = new Date();
    let success = false;

    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Get task and execution details
      const [task] = await db
        .select()
        .from(scheduledBrowserTasks)
        .where(eq(scheduledBrowserTasks.id, taskId))
        .limit(1);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Update execution status to running
      await db
        .update(scheduledTaskExecutions)
        .set({
          status: "running",
          startedAt: startTime,
        })
        .where(eq(scheduledTaskExecutions.id, executionId));

      console.log(`Executing task ${taskId} (${task.name})`);

      // Import taskExecutionService dynamically to avoid circular dependencies
      const { taskExecutionService } = await import("./taskExecution.service");

      // Execute the task based on automation type
      let result;
      switch (task.automationType) {
        case "browser_automation":
        case "data_extraction":
          // Execute browser automation
          result = await this.executeBrowserTask(task, executionId);
          break;

        case "api_call":
          // Execute API call
          result = await this.executeApiTask(task);
          break;

        default:
          result = {
            success: false,
            error: `Unsupported automation type: ${task.automationType}`,
          };
      }

      success = result.success;
      const duration = Date.now() - startTime.getTime();

      // Update execution record
      await db
        .update(scheduledTaskExecutions)
        .set({
          status: result.success ? "success" : "failed",
          output: result.output,
          error: result.error,
          duration,
          completedAt: new Date(),
        })
        .where(eq(scheduledTaskExecutions.id, executionId));

      // Update task statistics
      const newExecutionCount = task.executionCount + 1;
      const newSuccessCount = task.successCount + (result.success ? 1 : 0);
      const newFailureCount = task.failureCount + (result.success ? 0 : 1);
      const newAverageDuration = Math.round(
        (task.averageDuration * task.executionCount + duration) / newExecutionCount
      );

      await db
        .update(scheduledBrowserTasks)
        .set({
          lastRun: startTime,
          lastRunStatus: result.success ? "success" : "failed",
          lastRunError: result.error,
          lastRunDuration: duration,
          executionCount: newExecutionCount,
          successCount: newSuccessCount,
          failureCount: newFailureCount,
          averageDuration: newAverageDuration,
          updatedAt: new Date(),
        })
        .where(eq(scheduledBrowserTasks.id, taskId));

      // Update stats
      this.stats.tasksRun++;
      if (result.success) {
        this.stats.successCount++;
      } else {
        this.stats.failureCount++;
      }

      // Send notifications if configured
      if (result.success && task.notifyOnSuccess) {
        await this.sendNotification(task, "success", result);
      } else if (!result.success && task.notifyOnFailure) {
        await this.sendNotification(task, "failure", result);
      }

      // Retry logic
      if (!result.success && task.retryOnFailure) {
        const attemptNumber = 1; // This is the first attempt
        if (attemptNumber < task.maxRetries) {
          console.log(`Scheduling retry for task ${taskId} (attempt ${attemptNumber + 1}/${task.maxRetries})`);

          // Schedule retry after delay
          setTimeout(() => {
            this.retryTask(taskId, attemptNumber + 1);
          }, task.retryDelay * 1000);
        }
      }

      console.log(`Task ${taskId} execution completed: ${result.success ? "success" : "failed"}`);
    } catch (error) {
      console.error(`Task ${taskId} execution error:`, error);
      success = false;

      const db = await getDb();
      if (db) {
        const duration = Date.now() - startTime.getTime();
        await db
          .update(scheduledTaskExecutions)
          .set({
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
            duration,
            completedAt: new Date(),
          })
          .where(eq(scheduledTaskExecutions.id, executionId));

        await db
          .update(scheduledBrowserTasks)
          .set({
            lastRun: startTime,
            lastRunStatus: "failed",
            lastRunError: error instanceof Error ? error.message : "Unknown error",
            lastRunDuration: duration,
            updatedAt: new Date(),
          })
          .where(eq(scheduledBrowserTasks.id, taskId));
      }

      this.stats.tasksRun++;
      this.stats.failureCount++;
    }
  }

  /**
   * Execute browser automation task
   */
  private async executeBrowserTask(
    task: typeof scheduledBrowserTasks.$inferSelect,
    executionId: number
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      // Import Browserbase SDK
      const { browserbaseSDK } = await import("../_core/browserbaseSDK");
      const { Stagehand } = await import("@browserbasehq/stagehand");

      // Create browser session
      const session = await browserbaseSDK.createSession();
      const debugInfo = await browserbaseSDK.getSessionDebug(session.id);

      const db = await getDb();
      if (db) {
        await db
          .update(scheduledTaskExecutions)
          .set({
            sessionId: session.id,
            debugUrl: debugInfo.debuggerFullscreenUrl,
          })
          .where(eq(scheduledTaskExecutions.id, executionId));
      }

      // Initialize Stagehand
      const modelName = process.env.STAGEHAND_MODEL || process.env.AI_MODEL || "google/gemini-2.0-flash";

      process.env.PINO_DISABLE_PRETTY = 'true';
      process.env.LOG_LEVEL = 'silent';

      const stagehand = new Stagehand({
        env: "BROWSERBASE",
        verbose: 0,
        disablePino: true,
        model: modelName,
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        browserbaseSessionID: session.id,
      } as any);

      await stagehand.init();
      const page = stagehand.context.pages()[0];

      // Execute automation config
      const config = task.automationConfig as any;
      const results: any[] = [];

      if (config.steps) {
        for (const step of config.steps) {
          const stepResult = await this.executeAutomationStep(stagehand, page, step);
          results.push(stepResult);
        }
      }

      await stagehand.close();

      return {
        success: true,
        output: { steps: results, sessionId: session.id },
      };
    } catch (error) {
      console.error("Browser task execution error:", error);
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
    stagehand: any,
    page: any,
    step: any
  ): Promise<any> {
    const stepType = step.type || step.action;

    switch (stepType) {
      case "navigate":
        await page.goto(step.url);
        return { action: "navigate", url: step.url };

      case "click":
        if (step.selector) {
          await page.click(step.selector);
        } else if (step.instruction) {
          await stagehand.act(step.instruction);
        }
        return { action: "click", selector: step.selector };

      case "type":
        if (step.selector) {
          await page.fill(step.selector, step.value);
        }
        return { action: "type", selector: step.selector };

      case "extract":
        const extracted = await stagehand.extract(step.instruction || "Extract the main content");
        return { action: "extract", data: extracted };

      case "wait":
        await new Promise((resolve) => setTimeout(resolve, step.duration || 1000));
        return { action: "wait", duration: step.duration };

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
  private async executeApiTask(
    task: typeof scheduledBrowserTasks.$inferSelect
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const config = task.automationConfig as any;

      if (!config.endpoint) {
        return { success: false, error: "No API endpoint configured" };
      }

      const response = await fetch(config.endpoint, {
        method: config.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(config.headers || {}),
        },
        body: config.payload ? JSON.stringify(config.payload) : undefined,
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
   * Retry a failed task
   */
  private async retryTask(taskId: number, attemptNumber: number): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        console.error("Database not available");
        return;
      }

      // Create new execution record for retry
      const [execution] = await db
        .insert(scheduledTaskExecutions)
        .values({
          taskId,
          status: "queued",
          triggerType: "retry",
          attemptNumber,
        })
        .returning();

      console.log(`Retrying task ${taskId}, attempt ${attemptNumber}`);

      // Execute the task
      await this.executeTask(taskId, execution.id);
    } catch (error) {
      console.error(`Error retrying task ${taskId}:`, error);
    }
  }

  /**
   * Send notification about task execution
   */
  private async sendNotification(
    task: typeof scheduledBrowserTasks.$inferSelect,
    status: "success" | "failure",
    result: { success: boolean; output?: any; error?: string }
  ): Promise<void> {
    try {
      console.log(`Sending ${status} notification for task ${task.id} (${task.name})`);

      // Get notification channels
      const channels = task.notificationChannels as any[] || [];

      for (const channel of channels) {
        switch (channel.type) {
          case "email":
            // TODO: Implement email notification
            console.log(`Email notification to ${channel.email}: Task ${status}`);
            break;

          case "webhook":
            // Send webhook notification
            await fetch(channel.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                taskId: task.id,
                taskName: task.name,
                status,
                timestamp: new Date().toISOString(),
                result,
              }),
            });
            break;

          case "slack":
            // TODO: Implement Slack notification
            console.log(`Slack notification to ${channel.webhookUrl}: Task ${status}`);
            break;

          default:
            console.log(`Unknown notification channel type: ${channel.type}`);
        }
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalTasks: 0,
      activeTasks: 0,
      tasksRun: 0,
      successCount: 0,
      failureCount: 0,
      lastCheckTime: new Date(),
    };
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Update check interval
   */
  updateCheckInterval(intervalMs: number): void {
    if (this.isRunning) {
      this.stop();
      this.start(intervalMs);
    } else {
      this.checkIntervalMs = intervalMs;
    }
  }

  /**
   * Manually trigger credential rotation check
   * Returns the results of the rotation run
   */
  async runCredentialRotationsNow(): Promise<{
    processed: number;
    rotated: number;
    failed: number;
    skipped: number;
  }> {
    console.log("[SchedulerRunner] Manually triggering credential rotation check");
    const result = await credentialRotationService.runScheduledRotations();

    this.stats.credentialRotationStats = {
      ...result,
      lastRunTime: new Date(),
    };

    return result;
  }

  /**
   * Get credential rotation stats
   */
  getCredentialRotationStats(): SchedulerStats["credentialRotationStats"] {
    return this.stats.credentialRotationStats;
  }
}

// Export singleton instance
export const schedulerRunnerService = new SchedulerRunnerService();
