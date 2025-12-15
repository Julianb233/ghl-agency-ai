/**
 * Knowledge Router - tRPC API for Knowledge & Training System
 *
 * Provides endpoints for:
 * - Action pattern management
 * - Element selector versioning
 * - Error pattern tracking
 * - Agent feedback collection
 * - Brand voice storage
 * - Client context management
 * - Analytics and metrics
 */

import { z } from 'zod';
import { publicProcedure, router } from '../../_core/trpc';
import { TRPCError } from '@trpc/server';
import { knowledgeService } from '../../services/knowledge.service';

// ========================================
// ZOD SCHEMAS (Matching service types)
// ========================================

const actionStepSchema = z.object({
  order: z.number(),
  action: z.enum(['navigate', 'click', 'type', 'extract', 'wait', 'screenshot', 'scroll']),
  selector: z.string().optional(),
  instruction: z.string().optional(),
  value: z.string().optional(),
  waitFor: z.string().optional(),
  timeout: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const actionPatternSchema = z.object({
  taskType: z.string(),
  taskName: z.string(),
  pageUrl: z.string(),
  steps: z.array(actionStepSchema),
  successCount: z.number().optional(),
  failureCount: z.number().optional(),
});

const elementSelectorSchema = z.object({
  pagePath: z.string(),
  elementName: z.string(),
  primarySelector: z.string(),
  fallbackSelectors: z.array(z.string()),
  successRate: z.number().optional(),
  totalAttempts: z.number().optional(),
  screenshotRef: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const brandVoiceExampleSchema = z.object({
  type: z.enum(['email', 'sms', 'social', 'funnel', 'general']),
  good: z.string(),
  bad: z.string(),
  notes: z.string().optional(),
});

const brandVoiceSchema = z.object({
  clientId: z.number(),
  name: z.string(),
  tone: z.array(z.string()),
  vocabulary: z.array(z.string()),
  avoidWords: z.array(z.string()),
  examples: z.array(brandVoiceExampleSchema),
  industry: z.string().optional(),
  targetAudience: z.string().optional(),
});

const customerPersonaSchema = z.object({
  name: z.string(),
  demographics: z.string(),
  painPoints: z.array(z.string()),
  goals: z.array(z.string()),
  preferredChannels: z.array(z.string()),
});

const clientContextSchema = z.object({
  clientId: z.number(),
  businessType: z.string(),
  industry: z.string(),
  targetMarket: z.string(),
  products: z.array(z.string()),
  services: z.array(z.string()),
  keyValues: z.array(z.string()),
  competitors: z.array(z.string()),
  uniqueSellingPoints: z.array(z.string()),
  customerPersonas: z.array(customerPersonaSchema),
  customFields: z.record(z.unknown()).optional(),
});

const agentFeedbackSchema = z.object({
  executionId: z.number(),
  userId: z.number(),
  rating: z.number().min(1).max(5),
  feedbackType: z.enum(['success', 'partial', 'failure', 'suggestion']),
  comment: z.string().optional(),
  taskType: z.string(),
  actionsTaken: z.array(actionStepSchema).optional(),
  corrections: z.string().optional(),
});

// ========================================
// KNOWLEDGE ROUTER
// ========================================

export const knowledgeRouter = router({
  // ========================================
  // ACTION PATTERNS
  // ========================================

  /**
   * Get an action pattern by task type
   */
  getPattern: publicProcedure
    .input(z.object({ taskType: z.string() }))
    .query(async ({ input }) => {
      const pattern = await knowledgeService.getActionPattern(input.taskType);
      return {
        success: true,
        pattern: pattern || null,
      };
    }),

  /**
   * List all action patterns
   */
  listPatterns: publicProcedure.query(async () => {
    const patterns = await knowledgeService.getAllPatterns();
    return {
      success: true,
      patterns,
      total: patterns.length,
    };
  }),

  /**
   * Get top performing patterns
   */
  getTopPatterns: publicProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const patterns = await knowledgeService.getTopPerformingPatterns(input?.limit || 10);
      return {
        success: true,
        patterns,
      };
    }),

  /**
   * Save an action pattern
   */
  savePattern: publicProcedure
    .input(actionPatternSchema)
    .mutation(async ({ input }) => {
      try {
        await knowledgeService.saveActionPattern({
          ...input,
          successCount: input.successCount || 0,
          failureCount: input.failureCount || 0,
        });
        return {
          success: true,
          message: `Pattern '${input.taskType}' saved successfully`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to save pattern',
        });
      }
    }),

  /**
   * Record pattern execution result
   */
  recordPatternExecution: publicProcedure
    .input(z.object({
      taskType: z.string(),
      success: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      await knowledgeService.recordPatternExecution(input.taskType, input.success);
      return {
        success: true,
        message: 'Execution recorded',
      };
    }),

  /**
   * Delete an action pattern
   */
  deletePattern: publicProcedure
    .input(z.object({ taskType: z.string() }))
    .mutation(async ({ input }) => {
      const deleted = await knowledgeService.deletePattern(input.taskType);
      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Pattern '${input.taskType}' not found`,
        });
      }
      return {
        success: true,
        message: `Pattern '${input.taskType}' deleted`,
      };
    }),

  // ========================================
  // ELEMENT SELECTORS
  // ========================================

  /**
   * Get selector for a page element
   */
  getSelector: publicProcedure
    .input(z.object({
      pagePath: z.string(),
      elementName: z.string(),
    }))
    .query(async ({ input }) => {
      const selector = await knowledgeService.getSelector(input.pagePath, input.elementName);
      return {
        success: true,
        selector: selector || null,
      };
    }),

  /**
   * List selectors for a page
   */
  listSelectorsForPage: publicProcedure
    .input(z.object({ pagePath: z.string() }))
    .query(async ({ input }) => {
      const selectors = await knowledgeService.getSelectorsForPage(input.pagePath);
      return {
        success: true,
        selectors,
        total: selectors.length,
      };
    }),

  /**
   * List all selectors
   */
  listAllSelectors: publicProcedure.query(async () => {
    const selectors = await knowledgeService.getAllSelectors();
    return {
      success: true,
      selectors,
      total: selectors.length,
    };
  }),

  /**
   * Save an element selector
   */
  saveSelector: publicProcedure
    .input(elementSelectorSchema)
    .mutation(async ({ input }) => {
      try {
        await knowledgeService.saveSelector({
          ...input,
          successRate: input.successRate || 1.0,
          totalAttempts: input.totalAttempts || 0,
        });
        return {
          success: true,
          message: `Selector '${input.elementName}' for '${input.pagePath}' saved`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to save selector',
        });
      }
    }),

  /**
   * Record selector usage result
   */
  recordSelectorUsage: publicProcedure
    .input(z.object({
      pagePath: z.string(),
      elementName: z.string(),
      selectorUsed: z.string(),
      success: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      await knowledgeService.recordSelectorUsage(
        input.pagePath,
        input.elementName,
        input.selectorUsed,
        input.success
      );
      return {
        success: true,
        message: 'Selector usage recorded',
      };
    }),

  // ========================================
  // ERROR PATTERNS
  // ========================================

  /**
   * Record an error and get recovery strategies
   */
  recordError: publicProcedure
    .input(z.object({
      errorType: z.string(),
      errorMessage: z.string(),
      context: z.string(),
    }))
    .mutation(async ({ input }) => {
      const strategies = await knowledgeService.recordError(
        input.errorType,
        input.errorMessage,
        input.context
      );
      return {
        success: true,
        recoveryStrategies: strategies,
      };
    }),

  /**
   * Record successful recovery from error
   */
  recordRecoverySuccess: publicProcedure
    .input(z.object({
      errorType: z.string(),
      context: z.string(),
      strategyUsed: z.enum(['wait_and_retry', 'refresh_page', 'fallback_selector', 'skip', 'escalate']),
    }))
    .mutation(async ({ input }) => {
      await knowledgeService.recordRecoverySuccess(
        input.errorType,
        input.context,
        input.strategyUsed
      );
      return {
        success: true,
        message: 'Recovery success recorded',
      };
    }),

  /**
   * Get error statistics
   */
  getErrorStats: publicProcedure.query(async () => {
    const stats = await knowledgeService.getErrorStats();
    return {
      success: true,
      stats,
    };
  }),

  // ========================================
  // AGENT FEEDBACK
  // ========================================

  /**
   * Submit agent feedback
   */
  submitFeedback: publicProcedure
    .input(agentFeedbackSchema)
    .mutation(async ({ input }) => {
      try {
        await knowledgeService.submitFeedback(input);
        return {
          success: true,
          message: 'Feedback submitted successfully',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to submit feedback',
        });
      }
    }),

  /**
   * Get feedback entries
   */
  getFeedback: publicProcedure
    .input(z.object({
      userId: z.number().optional(),
      taskType: z.string().optional(),
      rating: z.number().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const feedback = await knowledgeService.getFeedback(input);
      return {
        success: true,
        feedback,
        total: feedback.length,
      };
    }),

  /**
   * Get feedback statistics
   */
  getFeedbackStats: publicProcedure.query(async () => {
    const stats = await knowledgeService.getFeedbackStats();
    return {
      success: true,
      stats,
    };
  }),

  // ========================================
  // BRAND VOICE
  // ========================================

  /**
   * Get brand voice for a client
   */
  getBrandVoice: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const brandVoice = await knowledgeService.getBrandVoice(input.clientId);
      return {
        success: true,
        brandVoice: brandVoice || null,
      };
    }),

  /**
   * List all brand voices
   */
  listBrandVoices: publicProcedure.query(async () => {
    const voices = await knowledgeService.getAllBrandVoices();
    return {
      success: true,
      brandVoices: voices,
      total: voices.length,
    };
  }),

  /**
   * Save brand voice
   */
  saveBrandVoice: publicProcedure
    .input(brandVoiceSchema)
    .mutation(async ({ input }) => {
      try {
        await knowledgeService.saveBrandVoice(input);
        return {
          success: true,
          message: `Brand voice for client ${input.clientId} saved`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to save brand voice',
        });
      }
    }),

  /**
   * Generate brand prompt for content
   */
  generateBrandPrompt: publicProcedure
    .input(z.object({
      clientId: z.number(),
      contentType: z.string(),
    }))
    .query(async ({ input }) => {
      const prompt = await knowledgeService.generateBrandPrompt(
        input.clientId,
        input.contentType
      );
      return {
        success: true,
        prompt,
      };
    }),

  // ========================================
  // CLIENT CONTEXT
  // ========================================

  /**
   * Get client context
   */
  getClientContext: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const context = await knowledgeService.getClientContext(input.clientId);
      return {
        success: true,
        context: context || null,
      };
    }),

  /**
   * List all client contexts
   */
  listClientContexts: publicProcedure.query(async () => {
    const contexts = await knowledgeService.getAllClientContexts();
    return {
      success: true,
      contexts,
      total: contexts.length,
    };
  }),

  /**
   * Save client context
   */
  saveClientContext: publicProcedure
    .input(clientContextSchema)
    .mutation(async ({ input }) => {
      try {
        await knowledgeService.saveClientContext(input);
        return {
          success: true,
          message: `Context for client ${input.clientId} saved`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to save client context',
        });
      }
    }),

  /**
   * Generate context prompt for agent
   */
  generateContextPrompt: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const prompt = await knowledgeService.generateContextPrompt(input.clientId);
      return {
        success: true,
        prompt,
      };
    }),

  /**
   * Update client history metrics
   */
  updateClientHistory: publicProcedure
    .input(z.object({
      clientId: z.number(),
      taskCompleted: z.boolean(),
      issue: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await knowledgeService.updateClientHistory(
        input.clientId,
        input.taskCompleted,
        input.issue
      );
      return {
        success: true,
        message: 'Client history updated',
      };
    }),

  // ========================================
  // ANALYTICS & SYSTEM
  // ========================================

  /**
   * Get system-wide statistics
   */
  getSystemStats: publicProcedure.query(async () => {
    const stats = await knowledgeService.getSystemStats();
    return {
      success: true,
      stats,
    };
  }),

  /**
   * Get pattern recommendations for a task
   */
  getRecommendations: publicProcedure
    .input(z.object({
      taskDescription: z.string(),
      clientId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const recommendations = await knowledgeService.getPatternRecommendations(
        input.taskDescription,
        input.clientId
      );
      return {
        success: true,
        recommendations,
      };
    }),

  /**
   * Health check for knowledge service
   */
  health: publicProcedure.query(async () => {
    const stats = await knowledgeService.getSystemStats();
    return {
      success: true,
      healthy: true,
      stats: {
        patterns: stats.totalPatterns,
        selectors: stats.totalSelectors,
        brandVoices: stats.totalBrandVoices,
        contexts: stats.totalClientContexts,
      },
    };
  }),
});
