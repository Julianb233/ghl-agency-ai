/**
 * Security tRPC Router
 * Provides API endpoints for credential management, execution control, and approvals
 *
 * Features:
 * - Secure credential vault (store, retrieve, delete)
 * - Execution control (pause, resume, cancel, inject)
 * - Action approvals (approve, reject, list pending)
 * - Browser context isolation
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getCredentialVault } from "../../services/credentialVault.service";
import { getExecutionControl } from "../../services/executionControl.service";
import { getActionApproval } from "../../services/actionApproval.service";
import { getBrowserContextIsolation } from "../../services/browserContextIsolation.service";

// ========================================
// INPUT SCHEMAS - CREDENTIALS
// ========================================

const storeCredentialSchema = z.object({
  name: z.string().min(1).max(200),
  service: z.string().min(1).max(100),
  type: z.enum(["password", "api_key", "oauth_token", "ssh_key"]),
  data: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    privateKey: z.string().optional(),
  }),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const getCredentialSchema = z.object({
  credentialId: z.number().int().positive(),
});

const deleteCredentialSchema = z.object({
  credentialId: z.number().int().positive(),
});

const listCredentialsSchema = z.object({
  service: z.string().optional(),
});

// ========================================
// INPUT SCHEMAS - EXECUTION CONTROL
// ========================================

const pauseExecutionSchema = z.object({
  executionId: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

const resumeExecutionSchema = z.object({
  executionId: z.number().int().positive(),
});

const cancelExecutionSchema = z.object({
  executionId: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

const injectInstructionSchema = z.object({
  executionId: z.number().int().positive(),
  instruction: z.string().min(1).max(5000),
});

const getControlStatusSchema = z.object({
  executionId: z.number().int().positive(),
});

// ========================================
// INPUT SCHEMAS - ACTION APPROVALS
// ========================================

const approveActionSchema = z.object({
  approvalId: z.number().int().positive(),
});

const rejectActionSchema = z.object({
  approvalId: z.number().int().positive(),
  reason: z.string().min(1).max(1000),
});

// ========================================
// INPUT SCHEMAS - BROWSER CONTEXT
// ========================================

const getContextSchema = z.object({
  clientId: z.number().int().positive(),
  isolationLevel: z.enum(["strict", "standard"]).optional(),
});

const createSessionSchema = z.object({
  contextId: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
});

// ========================================
// SECURITY ROUTER
// ========================================

export const securityRouter = router({
  // ========================================
  // CREDENTIAL VAULT ENDPOINTS
  // ========================================

  /**
   * Store a credential securely
   */
  storeCredential: protectedProcedure
    .input(storeCredentialSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const credentialVault = getCredentialVault();
        const credentialId = await credentialVault.storeCredential(userId, {
          name: input.name,
          service: input.service,
          type: input.type,
          data: input.data,
          metadata: input.metadata,
        });

        return {
          success: true,
          credentialId,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to store credential: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  /**
   * Retrieve a credential (decrypted)
   * SECURITY: Only returns credential to owner
   */
  getCredential: protectedProcedure
    .input(getCredentialSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const credentialVault = getCredentialVault();
        const credential = await credentialVault.retrieveCredential(
          userId,
          input.credentialId
        );

        return credential;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to retrieve credential: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  /**
   * List user's credentials (without sensitive data)
   */
  listCredentials: protectedProcedure
    .input(listCredentialsSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const credentialVault = getCredentialVault();
        const credentials = await credentialVault.listCredentials(
          userId,
          input.service
        );

        return credentials;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list credentials: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  /**
   * Delete a credential (soft delete)
   */
  deleteCredential: protectedProcedure
    .input(deleteCredentialSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const credentialVault = getCredentialVault();
        await credentialVault.deleteCredential(userId, input.credentialId);

        return {
          success: true,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete credential: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  // ========================================
  // EXECUTION CONTROL ENDPOINTS
  // ========================================

  /**
   * Pause a running execution
   */
  pauseExecution: protectedProcedure
    .input(pauseExecutionSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const executionControl = getExecutionControl();
        await executionControl.pauseExecution(
          userId,
          input.executionId,
          input.reason
        );

        return {
          success: true,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to pause execution: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  /**
   * Resume a paused execution
   */
  resumeExecution: protectedProcedure
    .input(resumeExecutionSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const executionControl = getExecutionControl();
        await executionControl.resumeExecution(userId, input.executionId);

        return {
          success: true,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to resume execution: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  /**
   * Cancel a running execution
   */
  cancelExecution: protectedProcedure
    .input(cancelExecutionSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const executionControl = getExecutionControl();
        await executionControl.cancelExecution(
          userId,
          input.executionId,
          input.reason
        );

        return {
          success: true,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to cancel execution: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  /**
   * Inject user instruction mid-execution
   */
  injectInstruction: protectedProcedure
    .input(injectInstructionSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const executionControl = getExecutionControl();
        await executionControl.injectInstruction(
          userId,
          input.executionId,
          input.instruction
        );

        return {
          success: true,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to inject instruction: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  /**
   * Get execution control status
   */
  getControlStatus: protectedProcedure
    .input(getControlStatusSchema)
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const executionControl = getExecutionControl();
        const status = await executionControl.getControlStatus(
          userId,
          input.executionId
        );

        return status;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get control status: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  // ========================================
  // ACTION APPROVAL ENDPOINTS
  // ========================================

  /**
   * List pending approvals for user
   */
  listPendingApprovals: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;

      try {
        const actionApproval = getActionApproval();
        const approvals = await actionApproval.getPendingApprovals(userId);

        return approvals;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list pending approvals: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  /**
   * Approve an action
   */
  approveAction: protectedProcedure
    .input(approveActionSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const actionApproval = getActionApproval();
        await actionApproval.approveAction(userId, input.approvalId);

        return {
          success: true,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to approve action: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  /**
   * Reject an action
   */
  rejectAction: protectedProcedure
    .input(rejectActionSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const actionApproval = getActionApproval();
        await actionApproval.rejectAction(
          userId,
          input.approvalId,
          input.reason
        );

        return {
          success: true,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to reject action: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  // ========================================
  // BROWSER CONTEXT ISOLATION ENDPOINTS
  // ========================================

  /**
   * Get or create isolated browser context
   */
  getOrCreateContext: protectedProcedure
    .input(getContextSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      try {
        const contextIsolation = getBrowserContextIsolation();
        const context = await contextIsolation.getOrCreateContext(
          userId,
          input.clientId,
          input.isolationLevel
        );

        return {
          contextId: context.contextId,
          isolationLevel: context.isolationLevel,
          createdAt: context.createdAt,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get/create context: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  /**
   * Create isolated session
   */
  createIsolatedSession: protectedProcedure
    .input(createSessionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const contextIsolation = getBrowserContextIsolation();
        const session = await contextIsolation.createIsolatedSession(
          input.contextId,
          input.config
        );

        return session;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create isolated session: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),
});
