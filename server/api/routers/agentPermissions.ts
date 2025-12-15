/**
 * Agent Permissions tRPC Router
 * Provides endpoints for checking and managing agent execution permissions
 *
 * Features:
 * - Get user's current permission level and limits
 * - Check permission for specific tool execution
 * - Get permission summary for UI display
 * - Admin endpoints for managing permissions
 */

import { router, protectedProcedure, adminProcedure } from "../../_core/trpc";
import { z } from "zod";
import {
  getAgentPermissionsService,
  AgentPermissionLevel,
} from "../../services/agentPermissions.service";
import { TRPCError } from "@trpc/server";

// ========================================
// VALIDATION SCHEMAS
// ========================================

const checkToolPermissionSchema = z.object({
  toolName: z.string().min(1).describe("Tool name to check permission for"),
  apiKeyId: z.number().int().positive().optional().describe("Optional API key ID to validate"),
});

const getUserPermissionsSchema = z.object({
  userId: z.number().int().positive().optional().describe("User ID (admin only, defaults to current user)"),
});

// ========================================
// ROUTER DEFINITION
// ========================================

export const agentPermissionsRouter = router({
  /**
   * Get current user's permission summary
   * Returns permission level, allowed tools, and execution limits
   */
  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    try {
      const permissionsService = getAgentPermissionsService();
      const summary = await permissionsService.getPermissionSummary(ctx.user.id);

      return {
        success: true,
        permissions: summary,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to get permissions",
      });
    }
  }),

  /**
   * Get permission context for current user
   * Includes subscription tier details
   */
  getPermissionContext: protectedProcedure.query(async ({ ctx }) => {
    try {
      const permissionsService = getAgentPermissionsService();
      const context = await permissionsService.getUserPermissionContext(ctx.user.id);

      return {
        success: true,
        context,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to get permission context",
      });
    }
  }),

  /**
   * Check if user can execute a specific tool
   */
  checkToolPermission: protectedProcedure
    .input(checkToolPermissionSchema)
    .query(async ({ input, ctx }) => {
      try {
        const permissionsService = getAgentPermissionsService();
        const result = await permissionsService.checkToolExecutionPermission(
          ctx.user.id,
          input.toolName,
          input.apiKeyId
        );

        return {
          success: true,
          permission: result,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to check permission",
        });
      }
    }),

  /**
   * Check execution limits for current user
   * Returns whether user can start new execution and current limit usage
   */
  checkExecutionLimits: protectedProcedure.query(async ({ ctx }) => {
    try {
      const permissionsService = getAgentPermissionsService();
      const limitsCheck = await permissionsService.checkExecutionLimits(ctx.user.id);

      return {
        success: true,
        limits: limitsCheck,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to check limits",
      });
    }
  }),

  /**
   * Get user permission level
   */
  getPermissionLevel: protectedProcedure.query(async ({ ctx }) => {
    try {
      const permissionsService = getAgentPermissionsService();
      const level = await permissionsService.getUserPermissionLevel(ctx.user.id);

      return {
        success: true,
        permissionLevel: level,
        description: getPermissionLevelDescription(level),
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to get permission level",
      });
    }
  }),

  /**
   * Admin: Get permissions for any user
   */
  getUserPermissions: adminProcedure
    .input(getUserPermissionsSchema)
    .query(async ({ input, ctx }) => {
      try {
        const userId = input.userId || ctx.user.id;
        const permissionsService = getAgentPermissionsService();
        const summary = await permissionsService.getPermissionSummary(userId);

        return {
          success: true,
          userId,
          permissions: summary,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get user permissions",
        });
      }
    }),

  /**
   * Admin: Get all permission levels and their capabilities
   */
  getPermissionLevels: adminProcedure.query(async () => {
    return {
      success: true,
      levels: [
        {
          level: AgentPermissionLevel.VIEW_ONLY,
          name: "View Only",
          description: "Can view agent executions and results but cannot execute agents",
          capabilities: {
            canExecute: false,
            canViewExecutions: true,
            canViewResults: true,
            allowedToolCategories: [],
          },
        },
        {
          level: AgentPermissionLevel.EXECUTE_BASIC,
          name: "Execute Basic",
          description: "Can execute safe, read-only tools",
          capabilities: {
            canExecute: true,
            canViewExecutions: true,
            canViewResults: true,
            allowedToolCategories: ["safe"],
          },
        },
        {
          level: AgentPermissionLevel.EXECUTE_ADVANCED,
          name: "Execute Advanced",
          description: "Can execute most tools including browser automation and HTTP requests",
          capabilities: {
            canExecute: true,
            canViewExecutions: true,
            canViewResults: true,
            allowedToolCategories: ["safe", "moderate"],
          },
        },
        {
          level: AgentPermissionLevel.ADMIN,
          name: "Admin",
          description: "Full access to all tools including shell commands and file modifications",
          capabilities: {
            canExecute: true,
            canViewExecutions: true,
            canViewResults: true,
            allowedToolCategories: ["safe", "moderate", "dangerous"],
          },
        },
      ],
    };
  }),
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get human-readable description for permission level
 */
function getPermissionLevelDescription(level: AgentPermissionLevel): string {
  switch (level) {
    case AgentPermissionLevel.VIEW_ONLY:
      return "View-only access. You can see agent executions but cannot run agents. Upgrade your subscription to execute agents.";

    case AgentPermissionLevel.EXECUTE_BASIC:
      return "Basic execution access. You can run agents with safe, read-only tools. Upgrade to Growth or higher for advanced capabilities.";

    case AgentPermissionLevel.EXECUTE_ADVANCED:
      return "Advanced execution access. You can run agents with most tools including browser automation and API calls. Admin role required for dangerous operations.";

    case AgentPermissionLevel.ADMIN:
      return "Full admin access. You can run agents with all tools including shell commands and file system modifications.";

    default:
      return "Unknown permission level";
  }
}
