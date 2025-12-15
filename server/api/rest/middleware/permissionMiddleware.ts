/**
 * Agent Execution Permission Middleware for REST API
 * Validates agent execution permissions for REST API endpoints
 *
 * Security:
 * - Checks user permission level before allowing agent executions
 * - Validates API key scopes for tool execution
 * - Enforces subscription-based execution limits
 */

import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authMiddleware";
import {
  getAgentPermissionsService,
  PermissionDeniedError,
  AgentPermissionLevel,
} from "../../../services/agentPermissions.service";

/**
 * Extended request with permission context
 */
export interface PermissionRequest extends AuthenticatedRequest {
  permissions?: {
    level: AgentPermissionLevel;
    canExecute: boolean;
    limits: {
      maxConcurrent: number;
      currentActive: number;
      monthlyLimit: number;
      monthlyUsed: number;
    };
  };
}

/**
 * Middleware: Require specific permission level
 *
 * Usage:
 * ```typescript
 * router.post('/api/v1/agent/execute',
 *   requireApiKey,
 *   requirePermissionLevel(AgentPermissionLevel.EXECUTE_BASIC),
 *   handler
 * );
 * ```
 */
export function requirePermissionLevel(requiredLevel: AgentPermissionLevel) {
  return async (
    req: PermissionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Authentication required",
          code: "AUTH_REQUIRED",
        });
        return;
      }

      const permissionsService = getAgentPermissionsService();
      const userLevel = await permissionsService.getUserPermissionLevel(req.user.id);

      // Define permission hierarchy
      const levels = [
        AgentPermissionLevel.VIEW_ONLY,
        AgentPermissionLevel.EXECUTE_BASIC,
        AgentPermissionLevel.EXECUTE_ADVANCED,
        AgentPermissionLevel.ADMIN,
      ];

      const userLevelIndex = levels.indexOf(userLevel);
      const requiredLevelIndex = levels.indexOf(requiredLevel);

      if (userLevelIndex < requiredLevelIndex) {
        res.status(403).json({
          error: "Forbidden",
          message: `Insufficient permissions. Required: ${requiredLevel}, Current: ${userLevel}`,
          code: "INSUFFICIENT_PERMISSIONS",
          details: {
            required: requiredLevel,
            current: userLevel,
          },
        });
        return;
      }

      // Attach permission context to request
      const limitsCheck = await permissionsService.checkExecutionLimits(req.user.id);
      req.permissions = {
        level: userLevel,
        canExecute: limitsCheck.canExecute,
        limits: limitsCheck.limits,
      };

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Permission check failed",
        code: "PERMISSION_CHECK_ERROR",
      });
    }
  };
}

/**
 * Middleware: Require tool execution permission
 * Checks if user can execute a specific tool
 *
 * Usage:
 * ```typescript
 * router.post('/api/v1/tools/execute',
 *   requireApiKey,
 *   requireToolPermission,
 *   handler
 * );
 * ```
 */
export async function requireToolPermission(
  req: PermissionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    // Get tool name from request body
    const toolName = req.body?.toolName || req.body?.name;
    if (!toolName) {
      res.status(400).json({
        error: "Bad Request",
        message: "Tool name required in request body",
        code: "TOOL_NAME_REQUIRED",
      });
      return;
    }

    const permissionsService = getAgentPermissionsService();
    const apiKeyId = req.apiKey?.id;

    try {
      await permissionsService.requirePermission(req.user.id, toolName, apiKeyId);
      next();
    } catch (error) {
      if (error instanceof PermissionDeniedError) {
        res.status(403).json({
          error: "Forbidden",
          message: error.message,
          code: "TOOL_PERMISSION_DENIED",
          details: {
            tool: toolName,
            permissionLevel: error.permissionLevel,
            toolCategory: error.toolCategory,
          },
        });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error("Tool permission check error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Permission check failed",
      code: "PERMISSION_CHECK_ERROR",
    });
  }
}

/**
 * Middleware: Check execution limits
 * Validates user hasn't exceeded concurrent or monthly execution limits
 *
 * Usage:
 * ```typescript
 * router.post('/api/v1/agent/start',
 *   requireApiKey,
 *   checkExecutionLimits,
 *   handler
 * );
 * ```
 */
export async function checkExecutionLimits(
  req: PermissionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    const permissionsService = getAgentPermissionsService();
    const limitsCheck = await permissionsService.checkExecutionLimits(req.user.id);

    if (!limitsCheck.canExecute) {
      res.status(429).json({
        error: "Too Many Requests",
        message: limitsCheck.reason || "Execution limit exceeded",
        code: "EXECUTION_LIMIT_EXCEEDED",
        limits: limitsCheck.limits,
      });
      return;
    }

    // Attach limits to request for handler use
    req.permissions = {
      level: await permissionsService.getUserPermissionLevel(req.user.id),
      canExecute: true,
      limits: limitsCheck.limits,
    };

    next();
  } catch (error) {
    console.error("Execution limit check error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Execution limit check failed",
      code: "LIMIT_CHECK_ERROR",
    });
  }
}

/**
 * Middleware: Attach permission context
 * Non-blocking - adds permission info to request without enforcing
 *
 * Usage:
 * ```typescript
 * router.get('/api/v1/agent/status',
 *   requireApiKey,
 *   attachPermissionContext,
 *   handler
 * );
 * ```
 */
export async function attachPermissionContext(
  req: PermissionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      // No user, skip permission context
      next();
      return;
    }

    const permissionsService = getAgentPermissionsService();
    const level = await permissionsService.getUserPermissionLevel(req.user.id);
    const limitsCheck = await permissionsService.checkExecutionLimits(req.user.id);

    req.permissions = {
      level,
      canExecute: limitsCheck.canExecute,
      limits: limitsCheck.limits,
    };

    next();
  } catch (error) {
    console.error("Failed to attach permission context:", error);
    // Don't block request on permission context failure
    next();
  }
}

/**
 * Middleware: Require admin permission
 * Shorthand for requiring admin-level access
 */
export const requireAdminPermission = requirePermissionLevel(AgentPermissionLevel.ADMIN);

/**
 * Middleware: Require execute permission
 * Shorthand for requiring at least basic execution permission
 */
export const requireExecutePermission = requirePermissionLevel(
  AgentPermissionLevel.EXECUTE_BASIC
);

/**
 * Middleware: Require advanced permission
 * Shorthand for requiring advanced execution permission
 */
export const requireAdvancedPermission = requirePermissionLevel(
  AgentPermissionLevel.EXECUTE_ADVANCED
);
