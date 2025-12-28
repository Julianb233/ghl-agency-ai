/**
 * Agent Execution Permissions Service
 * Implements permission-based access control for agent executions
 *
 * Permission Levels:
 * - view_only: Can view agent executions and results (read-only)
 * - execute_basic: Can execute safe, read-only tools (file_read, retrieve_documentation, etc.)
 * - execute_advanced: Can execute most tools including browser automation and HTTP requests
 * - admin: Full access to all tools including shell commands and file modifications
 *
 * Security Architecture:
 * - Permission checks occur BEFORE tool execution
 * - User role + subscription tier determine base permissions
 * - API keys can have scoped permissions (subset of user permissions)
 * - Audit logging for all permission decisions
 */

import type { User } from "../../drizzle/schema";
import { getDb } from "../db";
import { users, userSubscriptions, subscriptionTiers, apiKeys } from "../../drizzle/schema";
import { agencyTasks, taskExecutions } from "../../drizzle/schema-webhooks";
import { eq, and, gte, inArray, sql } from "drizzle-orm";

// ========================================
// PERMISSION TYPES
// ========================================

/**
 * Permission levels for agent executions
 */
export enum AgentPermissionLevel {
  VIEW_ONLY = "view_only",
  EXECUTE_BASIC = "execute_basic",
  EXECUTE_ADVANCED = "execute_advanced",
  ADMIN = "admin",
}

/**
 * Tool categories by risk level
 */
export const TOOL_RISK_CATEGORIES = {
  // Safe read-only operations
  safe: [
    "retrieve_documentation",
    "file_read",
    "file_list",
    "file_search",
    "retrieve_data",
    "browser_navigate",
    "browser_extract",
    "browser_screenshot",
  ],

  // Operations that can modify data or make external calls
  moderate: [
    "http_request",
    "store_data",
    "browser_click",
    "browser_type",
    "browser_select",
    "browser_scroll",
    "browser_wait",
    "update_plan",
    "advance_phase",
  ],

  // Potentially dangerous operations
  dangerous: [
    "file_write",
    "file_edit",
    "shell_exec",
    "browser_close",
    "ask_user",
  ],
} as const;

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  permissionLevel: AgentPermissionLevel;
  toolCategory: "safe" | "moderate" | "dangerous";
}

/**
 * User permission context
 */
export interface UserPermissionContext {
  userId: number;
  userRole: string;
  permissionLevel: AgentPermissionLevel;
  subscriptionTier?: {
    slug: string;
    maxAgents: number;
    maxConcurrentAgents: number;
    monthlyExecutionLimit: number;
    features: Record<string, any>;
  };
  apiKeyScopes?: string[];
}

// ========================================
// PERMISSION SERVICE
// ========================================

export class AgentPermissionsService {
  /**
   * Get tool risk category
   */
  private getToolCategory(toolName: string): "safe" | "moderate" | "dangerous" {
    if ((TOOL_RISK_CATEGORIES.safe as readonly string[]).includes(toolName)) {
      return "safe";
    }
    if ((TOOL_RISK_CATEGORIES.moderate as readonly string[]).includes(toolName)) {
      return "moderate";
    }
    return "dangerous";
  }

  /**
   * Determine user's permission level based on role and subscription
   */
  async getUserPermissionLevel(userId: number): Promise<AgentPermissionLevel> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Fetch user with subscription info
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        tierId: userSubscriptions.tierId,
        tierSlug: subscriptionTiers.slug,
        features: subscriptionTiers.features,
      })
      .from(users)
      .leftJoin(userSubscriptions, eq(users.id, userSubscriptions.userId))
      .leftJoin(subscriptionTiers, eq(userSubscriptions.tierId, subscriptionTiers.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    // Admin role always gets full access
    if (user.role === "admin") {
      return AgentPermissionLevel.ADMIN;
    }

    // Determine permission based on subscription tier
    const tierSlug = user.tierSlug as string | null;
    const features = user.features as Record<string, any> | null;

    // No subscription = view only
    if (!tierSlug) {
      return AgentPermissionLevel.VIEW_ONLY;
    }

    // Check if tier has advanced agent features
    const hasAdvancedFeatures = features?.advancedAgentExecution === true;

    // Tier-based permissions
    switch (tierSlug) {
      case "starter":
        return AgentPermissionLevel.EXECUTE_BASIC;

      case "growth":
      case "professional":
        return hasAdvancedFeatures
          ? AgentPermissionLevel.EXECUTE_ADVANCED
          : AgentPermissionLevel.EXECUTE_BASIC;

      case "enterprise":
        return AgentPermissionLevel.EXECUTE_ADVANCED;

      default:
        return AgentPermissionLevel.VIEW_ONLY;
    }
  }

  /**
   * Get full user permission context
   */
  async getUserPermissionContext(userId: number): Promise<UserPermissionContext> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const [userData] = await db
      .select({
        userId: users.id,
        role: users.role,
        tierSlug: subscriptionTiers.slug,
        maxAgents: subscriptionTiers.maxAgents,
        maxConcurrentAgents: subscriptionTiers.maxConcurrentAgents,
        monthlyExecutionLimit: subscriptionTiers.monthlyExecutionLimit,
        features: subscriptionTiers.features,
      })
      .from(users)
      .leftJoin(userSubscriptions, eq(users.id, userSubscriptions.userId))
      .leftJoin(subscriptionTiers, eq(userSubscriptions.tierId, subscriptionTiers.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData) {
      throw new Error("User not found");
    }

    const permissionLevel = await this.getUserPermissionLevel(userId);

    return {
      userId: userData.userId,
      userRole: userData.role || "user",
      permissionLevel,
      subscriptionTier: userData.tierSlug
        ? {
            slug: userData.tierSlug,
            maxAgents: userData.maxAgents || 0,
            maxConcurrentAgents: userData.maxConcurrentAgents || 0,
            monthlyExecutionLimit: userData.monthlyExecutionLimit || 0,
            features: (userData.features as Record<string, any>) || {},
          }
        : undefined,
    };
  }

  /**
   * Check if user has permission to execute a specific tool
   */
  async checkToolExecutionPermission(
    userId: number,
    toolName: string,
    apiKeyId?: number
  ): Promise<PermissionCheckResult> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Get user permission level
    const permissionLevel = await this.getUserPermissionLevel(userId);
    const toolCategory = this.getToolCategory(toolName);

    // If using API key, check API key scopes
    if (apiKeyId) {
      const [apiKeyRecord] = await db
        .select({
          scopes: apiKeys.scopes,
          isActive: apiKeys.isActive,
        })
        .from(apiKeys)
        .where(eq(apiKeys.id, apiKeyId))
        .limit(1);

      if (!apiKeyRecord || !apiKeyRecord.isActive) {
        return {
          allowed: false,
          reason: "API key is invalid or inactive",
          permissionLevel,
          toolCategory,
        };
      }

      const scopes = apiKeyRecord.scopes as string[];

      // Check if API key has required scope for this tool
      const requiredScope = `agent:execute:${toolCategory}`;
      const hasScope =
        scopes.includes(requiredScope) ||
        scopes.includes("agent:execute:*") ||
        scopes.includes("*");

      if (!hasScope) {
        return {
          allowed: false,
          reason: `API key missing required scope: ${requiredScope}`,
          permissionLevel,
          toolCategory,
        };
      }
    }

    // Permission level checks
    switch (permissionLevel) {
      case AgentPermissionLevel.VIEW_ONLY:
        return {
          allowed: false,
          reason: "View-only access. Upgrade subscription to execute agents.",
          permissionLevel,
          toolCategory,
        };

      case AgentPermissionLevel.EXECUTE_BASIC:
        if (toolCategory === "safe") {
          return { allowed: true, permissionLevel, toolCategory };
        }
        return {
          allowed: false,
          reason: `Basic execution level cannot execute ${toolCategory} tools. Upgrade to Growth or higher.`,
          permissionLevel,
          toolCategory,
        };

      case AgentPermissionLevel.EXECUTE_ADVANCED:
        if (toolCategory === "safe" || toolCategory === "moderate") {
          return { allowed: true, permissionLevel, toolCategory };
        }
        return {
          allowed: false,
          reason: `Advanced execution level cannot execute dangerous tools. Admin role required.`,
          permissionLevel,
          toolCategory,
        };

      case AgentPermissionLevel.ADMIN:
        return { allowed: true, permissionLevel, toolCategory };

      default:
        return {
          allowed: false,
          reason: "Unknown permission level",
          permissionLevel,
          toolCategory,
        };
    }
  }

  /**
   * Check if user can create/start new agent execution
   * Checks against subscription limits
   */
  async checkExecutionLimits(userId: number): Promise<{
    canExecute: boolean;
    reason?: string;
    limits: {
      maxConcurrent: number;
      currentActive: number;
      monthlyLimit: number;
      monthlyUsed: number;
    };
  }> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const context = await this.getUserPermissionContext(userId);

    // No subscription = no execution
    if (!context.subscriptionTier) {
      return {
        canExecute: false,
        reason: "No active subscription. Subscribe to execute agents.",
        limits: {
          maxConcurrent: 0,
          currentActive: 0,
          monthlyLimit: 0,
          monthlyUsed: 0,
        },
      };
    }

    // Get current active executions count
    // Query actual active executions for this user
    const activeStatuses = ["started", "running", "needs_input"];

    const activeExecutions = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskExecutions)
      .innerJoin(agencyTasks, eq(taskExecutions.taskId, agencyTasks.id))
      .where(
        and(
          eq(agencyTasks.userId, userId),
          inArray(taskExecutions.status, activeStatuses)
        )
      );

    const currentActive = Number(activeExecutions[0]?.count || 0);

    // Get monthly execution count for this user
    // Calculate start of current month (UTC)
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const monthlyExecutions = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskExecutions)
      .innerJoin(agencyTasks, eq(taskExecutions.taskId, agencyTasks.id))
      .where(
        and(
          eq(agencyTasks.userId, userId),
          gte(taskExecutions.startedAt, monthStart)
        )
      );

    const monthlyUsed = Number(monthlyExecutions[0]?.count || 0);

    const limits = {
      maxConcurrent: context.subscriptionTier.maxConcurrentAgents,
      currentActive,
      monthlyLimit: context.subscriptionTier.monthlyExecutionLimit,
      monthlyUsed,
    };

    // Check concurrent execution limit
    if (currentActive >= limits.maxConcurrent) {
      return {
        canExecute: false,
        reason: `Maximum concurrent executions reached (${limits.maxConcurrent}). Wait for current executions to complete.`,
        limits,
      };
    }

    // Check monthly execution limit
    if (monthlyUsed >= limits.monthlyLimit) {
      return {
        canExecute: false,
        reason: `Monthly execution limit reached (${limits.monthlyLimit}). Upgrade subscription or wait for next billing cycle.`,
        limits,
      };
    }

    return {
      canExecute: true,
      limits,
    };
  }

  /**
   * Validate permission before tool execution (middleware-style)
   */
  async requirePermission(
    userId: number,
    toolName: string,
    apiKeyId?: number
  ): Promise<void> {
    const result = await this.checkToolExecutionPermission(userId, toolName, apiKeyId);

    if (!result.allowed) {
      throw new PermissionDeniedError(
        result.reason || "Permission denied",
        result.permissionLevel,
        result.toolCategory
      );
    }
  }

  /**
   * Verify that a task belongs to the specified user (tenant isolation)
   * CRITICAL: Must be called before any task operations to prevent cross-tenant access
   */
  async verifyTaskOwnership(taskId: number, userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    const [task] = await db
      .select({ userId: agencyTasks.userId })
      .from(agencyTasks)
      .where(eq(agencyTasks.id, taskId))
      .limit(1);

    if (!task) {
      return false;
    }

    return task.userId === userId;
  }

  /**
   * Verify that an execution belongs to the specified user (tenant isolation)
   * CRITICAL: Must be called before any execution operations to prevent cross-tenant access
   */
  async verifyExecutionOwnership(executionId: number, userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }

    // Join through agencyTasks to verify ownership
    const [execution] = await db
      .select({ taskUserId: agencyTasks.userId })
      .from(taskExecutions)
      .innerJoin(agencyTasks, eq(taskExecutions.taskId, agencyTasks.id))
      .where(eq(taskExecutions.id, executionId))
      .limit(1);

    if (!execution) {
      return false;
    }

    return execution.taskUserId === userId;
  }

  /**
   * Verify that a user can execute a specific task (combines ownership + permission checks)
   * CRITICAL: Use this for complete authorization before task execution
   */
  async canExecuteTask(taskId: number, userId: number, toolName: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    // First verify task ownership (tenant isolation)
    const ownsTask = await this.verifyTaskOwnership(taskId, userId);
    if (!ownsTask) {
      return {
        allowed: false,
        reason: "Task not found or access denied",
      };
    }

    // Check execution limits
    const limitsCheck = await this.checkExecutionLimits(userId);
    if (!limitsCheck.canExecute) {
      return {
        allowed: false,
        reason: limitsCheck.reason,
      };
    }

    // Check tool permission
    const permissionCheck = await this.checkToolExecutionPermission(userId, toolName);
    if (!permissionCheck.allowed) {
      return {
        allowed: false,
        reason: permissionCheck.reason,
      };
    }

    return { allowed: true };
  }

  /**
   * Get permission summary for user (for UI display)
   */
  async getPermissionSummary(userId: number): Promise<{
    permissionLevel: AgentPermissionLevel;
    allowedTools: {
      safe: string[];
      moderate: string[];
      dangerous: string[];
    };
    canExecute: boolean;
    limits: {
      maxConcurrent: number;
      currentActive: number;
      monthlyLimit: number;
      monthlyUsed: number;
    };
  }> {
    const permissionLevel = await this.getUserPermissionLevel(userId);
    const limitsCheck = await this.checkExecutionLimits(userId);

    // Determine which tool categories are allowed
    const allowedTools = {
      safe: [] as string[],
      moderate: [] as string[],
      dangerous: [] as string[],
    };

    if (
      permissionLevel === AgentPermissionLevel.EXECUTE_BASIC ||
      permissionLevel === AgentPermissionLevel.EXECUTE_ADVANCED ||
      permissionLevel === AgentPermissionLevel.ADMIN
    ) {
      allowedTools.safe = [...TOOL_RISK_CATEGORIES.safe];
    }

    if (
      permissionLevel === AgentPermissionLevel.EXECUTE_ADVANCED ||
      permissionLevel === AgentPermissionLevel.ADMIN
    ) {
      allowedTools.moderate = [...TOOL_RISK_CATEGORIES.moderate];
    }

    if (permissionLevel === AgentPermissionLevel.ADMIN) {
      allowedTools.dangerous = [...TOOL_RISK_CATEGORIES.dangerous];
    }

    return {
      permissionLevel,
      allowedTools,
      canExecute: limitsCheck.canExecute,
      limits: limitsCheck.limits,
    };
  }
}

// ========================================
// CUSTOM ERROR CLASS
// ========================================

export class PermissionDeniedError extends Error {
  public readonly permissionLevel: AgentPermissionLevel;
  public readonly toolCategory: string;
  public readonly code = "PERMISSION_DENIED";

  constructor(
    message: string,
    permissionLevel: AgentPermissionLevel,
    toolCategory: string
  ) {
    super(message);
    this.name = "PermissionDeniedError";
    this.permissionLevel = permissionLevel;
    this.toolCategory = toolCategory;
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let permissionsServiceInstance: AgentPermissionsService | null = null;

export function getAgentPermissionsService(): AgentPermissionsService {
  if (!permissionsServiceInstance) {
    permissionsServiceInstance = new AgentPermissionsService();
  }
  return permissionsServiceInstance;
}
