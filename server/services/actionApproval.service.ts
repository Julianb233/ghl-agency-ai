/**
 * Action Approval Service
 * Manages user approval for high-risk agent actions
 *
 * Features:
 * - Risk assessment for actions (low, medium, high, critical)
 * - User approval workflow with timeout
 * - Screenshot capture for context
 * - Approval queue management
 *
 * High-Risk Actions Requiring Approval:
 * - Delete operations
 * - Financial transactions (purchase, payment)
 * - Send email/message
 * - Modify critical data
 * - Execute shell commands
 * - File operations outside workspace
 *
 * Usage:
 * - Request approval: await actionApproval.requestApproval(executionId, actionDetails)
 * - Wait for response: await actionApproval.waitForApproval(approvalId, timeout)
 * - Approve: await actionApproval.approveAction(approvalId, userId)
 * - Reject: await actionApproval.rejectAction(approvalId, userId, reason)
 */

import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { actionApprovals, securityAuditLog } from "../../drizzle/schema-security";
import { getExecutionControl } from "./executionControl.service";
import type {
  ActionApproval,
  InsertActionApproval,
  InsertSecurityAuditLog,
} from "../../drizzle/schema-security";

// ========================================
// TYPES
// ========================================

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ActionDetails {
  actionType: string;
  actionDescription: string;
  actionParams: Record<string, unknown>;
  screenshotUrl?: string;
}

export interface RiskAssessment {
  riskLevel: RiskLevel;
  riskFactors: string[];
  requiresApproval: boolean;
}

export interface ApprovalRequest {
  approvalId: number;
  executionId: number;
  actionType: string;
  actionDescription: string;
  riskLevel: RiskLevel;
  riskFactors: string[];
  screenshotUrl?: string;
  expiresAt: Date;
}

// ========================================
// RISK ASSESSMENT RULES
// ========================================

const HIGH_RISK_ACTIONS = [
  "delete",
  "purchase",
  "payment",
  "send_email",
  "send_message",
  "shell_exec",
  "file_write",
  "database_modify",
];

const CRITICAL_RISK_PATTERNS = [
  /drop\s+table/i,
  /delete\s+from/i,
  /rm\s+-rf/i,
  /sudo/i,
  /--force/i,
];

const FINANCIAL_KEYWORDS = [
  "buy",
  "purchase",
  "payment",
  "charge",
  "transfer",
  "withdraw",
];

// ========================================
// ACTION APPROVAL SERVICE
// ========================================

export class ActionApprovalService {
  /**
   * Assess risk level for an action
   */
  assessRisk(actionDetails: ActionDetails): RiskAssessment {
    const { actionType, actionDescription, actionParams } = actionDetails;
    const riskFactors: string[] = [];
    let riskLevel: RiskLevel = "low";

    // Check action type
    if (HIGH_RISK_ACTIONS.includes(actionType)) {
      riskFactors.push(`High-risk action type: ${actionType}`);
      riskLevel = "high";
    }

    // Check for critical patterns
    const fullText = JSON.stringify(actionParams) + " " + actionDescription;
    for (const pattern of CRITICAL_RISK_PATTERNS) {
      if (pattern.test(fullText)) {
        riskFactors.push(`Critical pattern detected: ${pattern.source}`);
        riskLevel = "critical";
        break;
      }
    }

    // Check for financial operations
    const lowerText = fullText.toLowerCase();
    for (const keyword of FINANCIAL_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        riskFactors.push(`Financial operation detected: ${keyword}`);
        if (riskLevel === "low") riskLevel = "medium";
        if (riskLevel === "medium") riskLevel = "high";
      }
    }

    // Check for bulk operations
    if (actionParams.bulk || actionParams.multiple || actionParams.all) {
      riskFactors.push("Bulk operation");
      if (riskLevel === "low") riskLevel = "medium";
    }

    // Check for production environment
    if (
      actionParams.environment === "production" ||
      actionParams.env === "prod"
    ) {
      riskFactors.push("Production environment");
      if (riskLevel === "low") riskLevel = "medium";
      if (riskLevel === "medium") riskLevel = "high";
    }

    // Require approval for medium and above
    const requiresApproval = riskLevel !== "low";

    return {
      riskLevel,
      riskFactors,
      requiresApproval,
    };
  }

  /**
   * Request approval for an action
   */
  async requestApproval(
    userId: number,
    executionId: number,
    actionDetails: ActionDetails,
    timeoutMinutes: number = 5
  ): Promise<number> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Assess risk
      const assessment = this.assessRisk(actionDetails);

      // If low risk, auto-approve
      if (!assessment.requiresApproval) {
        console.log(
          `[ActionApproval] Auto-approved low-risk action: ${actionDetails.actionType}`
        );
        return -1; // Special value indicating auto-approval
      }

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + timeoutMinutes);

      // Create approval request
      const [approval] = await db
        .insert(actionApprovals)
        .values({
          executionId,
          userId,
          actionType: actionDetails.actionType,
          actionDescription: actionDetails.actionDescription,
          actionParams: actionDetails.actionParams,
          riskLevel: assessment.riskLevel,
          riskFactors: assessment.riskFactors,
          screenshotUrl: actionDetails.screenshotUrl || null,
          status: "pending",
          expiresAt,
          timeoutAction: "reject", // Default to reject on timeout
        })
        .returning();

      // Pause execution to wait for approval
      const executionControl = getExecutionControl();
      await executionControl.pauseExecution(
        userId,
        executionId,
        `Waiting for approval: ${actionDetails.actionDescription}`
      );

      // Update control state to awaiting_approval
      await db.execute(`
        UPDATE execution_controls
        SET control_state = 'awaiting_approval'
        WHERE execution_id = ${executionId}
      `);

      // Audit log
      await this.auditLog(db, {
        userId,
        action: "approval_request",
        resourceType: "approval",
        resourceId: approval.id,
        details: {
          actionType: actionDetails.actionType,
          riskLevel: assessment.riskLevel,
          executionId,
        },
        success: true,
      });

      console.log(
        `[ActionApproval] Requested approval ${approval.id} for ` +
        `${actionDetails.actionType} (risk: ${assessment.riskLevel})`
      );

      return approval.id;
    } catch (error) {
      await this.auditLog(db, {
        userId,
        action: "approval_request",
        resourceType: "approval",
        resourceId: null,
        details: {
          actionType: actionDetails.actionType,
          executionId,
        },
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(
        `Failed to request approval: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Wait for approval decision (with timeout)
   */
  async waitForApproval(
    approvalId: number,
    pollIntervalMs: number = 1000
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Auto-approved
    if (approvalId === -1) {
      return true;
    }

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const [approval] = await db
            .select()
            .from(actionApprovals)
            .where(eq(actionApprovals.id, approvalId))
            .limit(1);

          if (!approval) {
            clearInterval(pollInterval);
            reject(new Error("Approval not found"));
            return;
          }

          // Check if approved
          if (approval.status === "approved") {
            clearInterval(pollInterval);
            resolve(true);
            return;
          }

          // Check if rejected
          if (approval.status === "rejected") {
            clearInterval(pollInterval);
            resolve(false);
            return;
          }

          // Check if timed out
          if (approval.status === "timeout") {
            clearInterval(pollInterval);
            resolve(approval.timeoutAction === "approve");
            return;
          }

          // Check for expiration
          if (new Date() > approval.expiresAt) {
            // Auto-timeout
            await db
              .update(actionApprovals)
              .set({
                status: "timeout",
                updatedAt: new Date(),
              })
              .where(eq(actionApprovals.id, approvalId));

            clearInterval(pollInterval);
            resolve(approval.timeoutAction === "approve");
            return;
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, pollIntervalMs);
    });
  }

  /**
   * Approve an action
   */
  async approveAction(
    userId: number,
    approvalId: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Verify ownership
      const [approval] = await db
        .select()
        .from(actionApprovals)
        .where(
          and(
            eq(actionApprovals.id, approvalId),
            eq(actionApprovals.userId, userId)
          )
        )
        .limit(1);

      if (!approval) {
        throw new Error("Approval not found or access denied");
      }

      if (approval.status !== "pending") {
        throw new Error(`Cannot approve action with status: ${approval.status}`);
      }

      // Update approval
      await db
        .update(actionApprovals)
        .set({
          status: "approved",
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(actionApprovals.id, approvalId));

      // Resume execution
      const executionControl = getExecutionControl();
      await executionControl.resumeExecution(userId, approval.executionId);

      // Audit log
      await this.auditLog(db, {
        userId,
        action: "approval_approve",
        resourceType: "approval",
        resourceId: approvalId,
        details: {
          actionType: approval.actionType,
          executionId: approval.executionId,
        },
        success: true,
      });

      console.log(`[ActionApproval] Approved action ${approvalId}`);
    } catch (error) {
      await this.auditLog(db, {
        userId,
        action: "approval_approve",
        resourceType: "approval",
        resourceId: approvalId,
        details: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(
        `Failed to approve action: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Reject an action
   */
  async rejectAction(
    userId: number,
    approvalId: number,
    reason?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    try {
      // Verify ownership
      const [approval] = await db
        .select()
        .from(actionApprovals)
        .where(
          and(
            eq(actionApprovals.id, approvalId),
            eq(actionApprovals.userId, userId)
          )
        )
        .limit(1);

      if (!approval) {
        throw new Error("Approval not found or access denied");
      }

      if (approval.status !== "pending") {
        throw new Error(`Cannot reject action with status: ${approval.status}`);
      }

      // Update approval
      await db
        .update(actionApprovals)
        .set({
          status: "rejected",
          rejectedAt: new Date(),
          rejectionReason: reason || "Rejected by user",
          updatedAt: new Date(),
        })
        .where(eq(actionApprovals.id, approvalId));

      // Keep execution paused (user needs to decide next steps)
      // or optionally cancel it
      // const executionControl = getExecutionControl();
      // await executionControl.cancelExecution(userId, approval.executionId, reason);

      // Audit log
      await this.auditLog(db, {
        userId,
        action: "approval_reject",
        resourceType: "approval",
        resourceId: approvalId,
        details: {
          actionType: approval.actionType,
          executionId: approval.executionId,
          reason,
        },
        success: true,
      });

      console.log(`[ActionApproval] Rejected action ${approvalId}`);
    } catch (error) {
      await this.auditLog(db, {
        userId,
        action: "approval_reject",
        resourceType: "approval",
        resourceId: approvalId,
        details: {},
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(
        `Failed to reject action: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovals(userId: number): Promise<ApprovalRequest[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const approvals = await db
      .select()
      .from(actionApprovals)
      .where(
        and(
          eq(actionApprovals.userId, userId),
          eq(actionApprovals.status, "pending")
        )
      )
      .orderBy(actionApprovals.createdAt);

    return approvals.map((approval) => ({
      approvalId: approval.id,
      executionId: approval.executionId,
      actionType: approval.actionType,
      actionDescription: approval.actionDescription,
      riskLevel: approval.riskLevel as RiskLevel,
      riskFactors: (approval.riskFactors as string[]) || [],
      screenshotUrl: approval.screenshotUrl || undefined,
      expiresAt: approval.expiresAt,
    }));
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
      console.error("[ActionApproval] Failed to write audit log:", error);
    }
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let actionApprovalInstance: ActionApprovalService | null = null;

export function getActionApproval(): ActionApprovalService {
  if (!actionApprovalInstance) {
    actionApprovalInstance = new ActionApprovalService();
  }
  return actionApprovalInstance;
}
