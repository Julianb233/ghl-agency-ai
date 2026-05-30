/**
 * Credential Rotation tRPC Router
 * Endpoints for managing credential rotation policies
 */

import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  credentialRotationService,
  type CredentialType,
} from "../../services/credentialRotation.service";

// ========================================
// VALIDATION SCHEMAS
// ========================================

const credentialTypeSchema = z.enum(["api_key", "oauth_token", "webhook_secret"]);

const createPolicySchema = z.object({
  credentialType: credentialTypeSchema,
  rotationIntervalDays: z.number().int().min(1).max(365),
});

const updatePolicySchema = z.object({
  policyId: z.number().int(),
  rotationIntervalDays: z.number().int().min(1).max(365).optional(),
  isEnabled: z.boolean().optional(),
});

const deletePolicySchema = z.object({
  policyId: z.number().int(),
});

const rotateNowSchema = z.object({
  policyId: z.number().int(),
});

const getPolicySchema = z.object({
  credentialType: credentialTypeSchema,
});

const getHistorySchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});

// ========================================
// ROUTER
// ========================================

export const credentialRotationRouter = router({
  /**
   * Get all rotation policies for the current user
   */
  getPolicies: protectedProcedure.query(async ({ ctx }) => {
    try {
      const policies = await credentialRotationService.getPolicies(ctx.user.id);
      return {
        success: true,
        data: policies,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to get policies",
      });
    }
  }),

  /**
   * Get a specific rotation policy by credential type
   */
  getPolicy: protectedProcedure
    .input(getPolicySchema)
    .query(async ({ ctx, input }) => {
      try {
        const policy = await credentialRotationService.getPolicy(
          ctx.user.id,
          input.credentialType as CredentialType
        );
        return {
          success: true,
          data: policy,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get policy",
        });
      }
    }),

  /**
   * Create a new rotation policy
   */
  createPolicy: protectedProcedure
    .input(createPolicySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const policy = await credentialRotationService.createPolicy({
          userId: ctx.user.id,
          credentialType: input.credentialType as CredentialType,
          rotationIntervalDays: input.rotationIntervalDays,
        });
        return {
          success: true,
          message: `Rotation policy created for ${input.credentialType}`,
          data: policy,
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("already exists")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create policy",
        });
      }
    }),

  /**
   * Update an existing rotation policy
   */
  updatePolicy: protectedProcedure
    .input(updatePolicySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const policy = await credentialRotationService.updatePolicy(
          input.policyId,
          ctx.user.id,
          {
            rotationIntervalDays: input.rotationIntervalDays,
            isEnabled: input.isEnabled,
          }
        );
        return {
          success: true,
          message: "Rotation policy updated",
          data: policy,
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update policy",
        });
      }
    }),

  /**
   * Delete a rotation policy
   */
  deletePolicy: protectedProcedure
    .input(deletePolicySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await credentialRotationService.deletePolicy(input.policyId, ctx.user.id);
        return {
          success: true,
          message: "Rotation policy deleted",
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to delete policy",
        });
      }
    }),

  /**
   * Manually trigger a credential rotation
   */
  rotateNow: protectedProcedure
    .input(rotateNowSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await credentialRotationService.rotateCredential(
          input.policyId,
          ctx.user.id
        );
        
        if (result.action === "failed") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.reason || "Rotation failed",
          });
        }

        return {
          success: true,
          message: result.action === "rotated" 
            ? "Credential rotated successfully" 
            : "Rotation skipped",
          data: {
            action: result.action,
            credentialType: result.credentialType,
            reason: result.reason,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to rotate credential",
        });
      }
    }),

  /**
   * Get rotation history for the current user
   */
  getHistory: protectedProcedure
    .input(getHistorySchema)
    .query(async ({ ctx, input }) => {
      try {
        const history = await credentialRotationService.getRotationHistory(
          ctx.user.id,
          input.limit
        );
        return {
          success: true,
          data: history,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get rotation history",
        });
      }
    }),
});
