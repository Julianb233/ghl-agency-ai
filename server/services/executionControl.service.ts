/**
 * Execution Control Service
 * Manages pause/resume/cancel operations for agent executions
 *
 * Features:
 * - Pause execution mid-task
 * - Resume from checkpoint
 * - Cancel and cleanup
 * - Inject user instructions during execution
 * - State persistence for resumability
 *
 * Usage:
 * - Pause: await executionControl.pauseExecution(executionId)
 * - Resume: await executionControl.resumeExecution(executionId)
 * - Cancel: await executionControl.cancelExecution(executionId, reason)
 * - Inject instruction: await executionControl.injectInstruction(executionId, instruction)
 */

import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { executionControls, securityAuditLog } from "../../drizzle/schema-security";
import { taskExecutions } from "../../drizzle/schema-webhooks";
import type {
  ExecutionControl,
  InsertExecutionControl,
  InsertSecurityAuditLog,
} from "../../drizzle/schema-security";

// ========================================
// TYPES
// ========================================

export type ControlState =
  | "running"
  | "paused"
  | "cancelled"
  | "awaiting_approval";

export interface CheckpointData {
  conversationHistory: any[];
  plan: any;
  currentPhaseId: number;
  toolHistory: any[];
  context: Record<string, unknown>;
  iterations: number;
  errorCount: number;
  consecutiveErrors: number;
  timestamp: Date;
}

export interface ExecutionControlStatus {
  executionId: number;
  controlState: ControlState;
  stateReason?: string;
  hasInjectedInstruction: boolean;
  injectedInstruction?: string;
  canResume: boolean;
  lastStateChange: Date;
}

// ========================================
// EXECUTION CONTROL SERVICE
// ========================================

export class ExecutionControlService {
  /**
   * Get or create execution control record
   */
  async getOrCreateControl(
    executionId: number,
    userId: number
  ): Promise<ExecutionControl> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Try to get existing control
    const [existing] = await db
      .select()
      .from(executionControls)
      .where(eq(executionControls.executionId, executionId))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create new control record
    const [control] = await db
      .insert(executionControls)
      .values({
        executionId,
        userId,
        controlState: "running",
      })
      .returning();

    return control;
  }

  /**
   * Pause execution
   */
  async pauseExecution(
    userId: number,
    executionId: number,
    reason?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Verify execution ownership
      await this.verifyOwnership(executionId, userId);

      // Get current control state
      const control = await this.getOrCreateControl(executionId, userId);

      if (control.controlState === "paused") {
        console.log(`[ExecutionControl] Execution ${executionId} is already paused`);
        return;
      }

      if (control.controlState === "cancelled") {
        throw new Error("Cannot pause a cancelled execution");
      }

      // Update control state
      await db
        .update(executionControls)
        .set({
          controlState: "paused",
          stateReason: reason || "Paused by user",
          lastStateChange: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(executionControls.executionId, executionId));

      // Update task execution status
      await db
        .update(taskExecutions)
        .set({
          status: "needs_input", // Use needs_input to signal pause
        })
        .where(eq(taskExecutions.id, executionId));

      // Audit log
      await this.auditLog(db, {
        userId,
        action: "execution_pause",
        resourceType: "execution",
        resourceId: executionId,
        details: { reason },
        success: true,
      });

      console.log(`[ExecutionControl] Paused execution ${executionId}`);
    } catch (error) {
      await this.auditLog(db, {
        userId,
        action: "execution_pause",
        resourceType: "execution",
        resourceId: executionId,
        details: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(
        `Failed to pause execution: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Resume execution
   */
  async resumeExecution(
    userId: number,
    executionId: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Verify execution ownership
      await this.verifyOwnership(executionId, userId);

      // Get current control state
      const [control] = await db
        .select()
        .from(executionControls)
        .where(eq(executionControls.executionId, executionId))
        .limit(1);

      if (!control) {
        throw new Error("Execution control not found");
      }

      if (control.controlState !== "paused" && control.controlState !== "awaiting_approval") {
        throw new Error(
          `Cannot resume execution with state: ${control.controlState}`
        );
      }

      // Update control state
      await db
        .update(executionControls)
        .set({
          controlState: "running",
          stateReason: "Resumed by user",
          lastStateChange: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(executionControls.executionId, executionId));

      // Update task execution status
      await db
        .update(taskExecutions)
        .set({
          status: "running",
        })
        .where(eq(taskExecutions.id, executionId));

      // Audit log
      await this.auditLog(db, {
        userId,
        action: "execution_resume",
        resourceType: "execution",
        resourceId: executionId,
        details: {},
        success: true,
      });

      console.log(`[ExecutionControl] Resumed execution ${executionId}`);
    } catch (error) {
      await this.auditLog(db, {
        userId,
        action: "execution_resume",
        resourceType: "execution",
        resourceId: executionId,
        details: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(
        `Failed to resume execution: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Cancel execution
   */
  async cancelExecution(
    userId: number,
    executionId: number,
    reason?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Verify execution ownership
      await this.verifyOwnership(executionId, userId);

      // Update control state
      const control = await this.getOrCreateControl(executionId, userId);

      await db
        .update(executionControls)
        .set({
          controlState: "cancelled",
          stateReason: reason || "Cancelled by user",
          lastStateChange: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(executionControls.executionId, executionId));

      // Update task execution status
      await db
        .update(taskExecutions)
        .set({
          status: "cancelled",
          error: reason || "Cancelled by user",
          completedAt: new Date(),
        })
        .where(eq(taskExecutions.id, executionId));

      // Audit log
      await this.auditLog(db, {
        userId,
        action: "execution_cancel",
        resourceType: "execution",
        resourceId: executionId,
        details: { reason },
        success: true,
      });

      console.log(`[ExecutionControl] Cancelled execution ${executionId}`);
    } catch (error) {
      await this.auditLog(db, {
        userId,
        action: "execution_cancel",
        resourceType: "execution",
        resourceId: executionId,
        details: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(
        `Failed to cancel execution: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Inject user instruction mid-execution
   */
  async injectInstruction(
    userId: number,
    executionId: number,
    instruction: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Verify execution ownership
      await this.verifyOwnership(executionId, userId);

      // Get current control state
      const control = await this.getOrCreateControl(executionId, userId);

      if (control.controlState === "cancelled") {
        throw new Error("Cannot inject instruction into cancelled execution");
      }

      // Store injected instruction
      await db
        .update(executionControls)
        .set({
          injectedInstruction: instruction,
          injectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(executionControls.executionId, executionId));

      // If paused, automatically resume
      if (control.controlState === "paused") {
        await this.resumeExecution(userId, executionId);
      }

      // Audit log
      await this.auditLog(db, {
        userId,
        action: "instruction_inject",
        resourceType: "execution",
        resourceId: executionId,
        details: {
          instructionLength: instruction.length,
        },
        success: true,
      });

      console.log(
        `[ExecutionControl] Injected instruction into execution ${executionId}`
      );
    } catch (error) {
      await this.auditLog(db, {
        userId,
        action: "instruction_inject",
        resourceType: "execution",
        resourceId: executionId,
        details: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(
        `Failed to inject instruction: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Save execution checkpoint for resumability
   */
  async saveCheckpoint(
    executionId: number,
    checkpointData: CheckpointData
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    await db
      .update(executionControls)
      .set({
        checkpointData: checkpointData as any,
        updatedAt: new Date(),
      })
      .where(eq(executionControls.executionId, executionId));

    console.log(`[ExecutionControl] Saved checkpoint for execution ${executionId}`);
  }

  /**
   * Get execution control status
   */
  async getControlStatus(
    userId: number,
    executionId: number
  ): Promise<ExecutionControlStatus> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Verify ownership
    await this.verifyOwnership(executionId, userId);

    const control = await this.getOrCreateControl(executionId, userId);

    return {
      executionId: control.executionId,
      controlState: control.controlState as ControlState,
      stateReason: control.stateReason || undefined,
      hasInjectedInstruction: !!control.injectedInstruction,
      injectedInstruction: control.injectedInstruction || undefined,
      canResume:
        control.controlState === "paused" ||
        control.controlState === "awaiting_approval",
      lastStateChange: control.lastStateChange,
    };
  }

  /**
   * Check if execution should pause (called by agent loop)
   */
  async shouldPause(executionId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      return false;
    }

    const [control] = await db
      .select()
      .from(executionControls)
      .where(eq(executionControls.executionId, executionId))
      .limit(1);

    if (!control) {
      return false;
    }

    return (
      control.controlState === "paused" ||
      control.controlState === "awaiting_approval" ||
      control.controlState === "cancelled"
    );
  }

  /**
   * Get and clear injected instruction (called by agent loop)
   */
  async getInjectedInstruction(
    executionId: number
  ): Promise<string | null> {
    const db = await getDb();
    if (!db) {
      return null;
    }

    const [control] = await db
      .select()
      .from(executionControls)
      .where(eq(executionControls.executionId, executionId))
      .limit(1);

    if (!control || !control.injectedInstruction) {
      return null;
    }

    const instruction = control.injectedInstruction;

    // Clear the injected instruction after reading
    await db
      .update(executionControls)
      .set({
        injectedInstruction: null,
        updatedAt: new Date(),
      })
      .where(eq(executionControls.executionId, executionId));

    return instruction;
  }

  /**
   * Verify execution ownership
   */
  private async verifyOwnership(
    executionId: number,
    userId: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const [execution] = await db
      .select()
      .from(taskExecutions)
      .where(
        and(
          eq(taskExecutions.id, executionId),
          eq(taskExecutions.triggeredByUserId, userId)
        )
      )
      .limit(1);

    if (!execution) {
      throw new Error("Execution not found or access denied");
    }
  }

  /**
   * Write to security audit log
   */
  private async auditLog(
    db: any,
    entry: Omit<InsertSecurityAuditLog, "timestamp">
  ): Promise<void> {
    try {
      await db.insert(securityAuditLog).values({
        ...entry,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("[ExecutionControl] Failed to write audit log:", error);
    }
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let executionControlInstance: ExecutionControlService | null = null;

export function getExecutionControl(): ExecutionControlService {
  if (!executionControlInstance) {
    executionControlInstance = new ExecutionControlService();
  }
  return executionControlInstance;
}
