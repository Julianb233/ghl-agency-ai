/**
 * Swarm Router - tRPC API for Swarm Coordination
 *
 * Provides endpoints for:
 * - Creating and managing swarms
 * - Spawning and controlling agents
 * - Task distribution and monitoring
 * - Health checks and metrics
 */

import { z } from 'zod';
import { publicProcedure, router } from '../../_core/trpc';
import { TRPCError } from '@trpc/server';
import {
  SwarmCoordinator,
  TaskDistributor,
  type SwarmObjective,
  type AgentState,
  type AgentType,
} from '../../services/swarm';

// Global swarm coordinator instance
let coordinator: SwarmCoordinator | null = null;
let distributor: TaskDistributor | null = null;

// Initialize coordinator on first use
async function getCoordinator(): Promise<SwarmCoordinator> {
  if (!coordinator) {
    coordinator = new SwarmCoordinator({
      maxAgents: 20,
      maxTasks: 100,
      maxConcurrentTasks: 10,
      autoScaling: true,
      loadBalancing: true,
      faultTolerance: true,
    });
    await coordinator.initialize();
  }
  return coordinator;
}

// Initialize distributor on first use
function getDistributor(): TaskDistributor {
  if (!distributor) {
    distributor = new TaskDistributor('capability-based');
  }
  return distributor;
}

// Zod schemas
const createSwarmSchema = z.object({
  objective: z.string().min(10, 'Objective must be at least 10 characters'),
  name: z.string().optional(),
  strategy: z.enum(['research', 'development', 'analysis', 'deployment', 'auto']).optional(),
  maxAgents: z.number().min(1).max(50).optional(),
  maxTasks: z.number().min(1).max(500).optional(),
  autoScaling: z.boolean().optional(),
  timeout: z.number().optional(),
});

const swarmIdSchema = z.object({
  swarmId: z.string(),
});

const agentTypeSchema = z.object({
  type: z.string() as z.ZodType<AgentType>,
  name: z.string().optional(),
  config: z.record(z.any()).optional(),
});

const taskSchema = z.object({
  swarmId: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string(),
  priority: z.enum(['critical', 'high', 'normal', 'low', 'background']),
  requirements: z.object({
    capabilities: z.array(z.string()),
    tools: z.array(z.string()),
    permissions: z.array(z.string()),
  }),
  input: z.record(z.any()),
});

/**
 * Swarm Router
 */
export const swarmRouter = router({
  /**
   * Initialize the swarm coordinator
   */
  initialize: publicProcedure.mutation(async () => {
    try {
      const coord = await getCoordinator();
      return {
        success: true,
        message: 'Swarm coordinator initialized',
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to initialize coordinator',
      });
    }
  }),

  /**
   * Create a new swarm
   */
  create: publicProcedure.input(createSwarmSchema).mutation(async ({ input }) => {
    try {
      const coord = await getCoordinator();

      const swarmId = await coord.createSwarm(input.objective, {
        name: input.name,
        strategy: input.strategy,
        maxAgents: input.maxAgents,
        maxTasks: input.maxTasks,
        autoScaling: input.autoScaling,
        timeout: input.timeout,
      });

      return {
        success: true,
        swarmId,
        message: 'Swarm created successfully',
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create swarm',
      });
    }
  }),

  /**
   * Start a swarm
   */
  start: publicProcedure.input(swarmIdSchema).mutation(async ({ input }) => {
    try {
      const coord = await getCoordinator();
      await coord.startSwarm(input.swarmId);

      return {
        success: true,
        message: 'Swarm started successfully',
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start swarm',
      });
    }
  }),

  /**
   * Stop a swarm
   */
  stop: publicProcedure
    .input(
      z.object({
        swarmId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const coord = await getCoordinator();
        await coord.stopSwarm(input.swarmId, input.reason || 'User requested');

        return {
          success: true,
          message: 'Swarm stopped successfully',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to stop swarm',
        });
      }
    }),

  /**
   * Get swarm status
   */
  getStatus: publicProcedure.input(swarmIdSchema).query(async ({ input }) => {
    try {
      const coord = await getCoordinator();
      const status = coord.getSwarmStatus(input.swarmId);

      if (!status) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Swarm not found: ${input.swarmId}`,
        });
      }

      return {
        success: true,
        swarm: {
          id: status.swarmId,
          name: status.objective.name,
          status: status.objective.status,
          progress: status.objective.progress,
          agents: Array.from(status.agents.values()),
          tasks: Array.from(status.tasks.values()),
          startTime: status.startTime,
          endTime: status.endTime,
          metrics: status.metrics,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get swarm status',
      });
    }
  }),

  /**
   * List all active swarms
   */
  listActive: publicProcedure.query(async () => {
    try {
      const coord = await getCoordinator();
      const swarms = coord.getAllSwarmStatuses();

      return {
        success: true,
        swarms: swarms.map((status) => ({
          id: status.swarmId,
          name: status.objective.name,
          status: status.objective.status,
          strategy: status.objective.strategy,
          progress: status.objective.progress,
          agentCount: status.agents.size,
          taskCount: status.tasks.size,
          startTime: status.startTime,
        })),
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list swarms',
      });
    }
  }),

  /**
   * Get health status
   */
  getHealth: publicProcedure.query(async () => {
    try {
      const coord = await getCoordinator();
      const health = await coord.getHealth();

      return {
        success: true,
        health,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get health status',
      });
    }
  }),

  /**
   * Get metrics
   */
  getMetrics: publicProcedure.query(async () => {
    try {
      const coord = await getCoordinator();
      const metrics = coord.getMetrics();

      return {
        success: true,
        metrics,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get metrics',
      });
    }
  }),

  /**
   * Get available agent types
   */
  getAgentTypes: publicProcedure.query(async () => {
    try {
      const { AGENT_TYPES } = await import('../../services/swarm');

      const agentTypes = Object.entries(AGENT_TYPES)
        .filter(([_, def]) => def.name) // Filter out placeholder types
        .map(([type, def]) => ({
          type,
          name: def.name,
          description: def.description,
          category: def.category,
          capabilities: def.capabilities,
        }));

      return {
        success: true,
        agentTypes,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get agent types',
      });
    }
  }),

  /**
   * Get task queue status
   */
  getQueueStatus: publicProcedure.query(async () => {
    try {
      const dist = getDistributor();
      const status = dist.getQueueStatus();

      return {
        success: true,
        queue: status,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get queue status',
      });
    }
  }),

  /**
   * Execute quick swarm - create and start in one call
   */
  executeQuick: publicProcedure.input(createSwarmSchema).mutation(async ({ input }) => {
    try {
      const coord = await getCoordinator();

      // Create swarm
      const swarmId = await coord.createSwarm(input.objective, {
        name: input.name,
        strategy: input.strategy,
        maxAgents: input.maxAgents,
        maxTasks: input.maxTasks,
        autoScaling: input.autoScaling,
        timeout: input.timeout,
      });

      // Start swarm immediately
      await coord.startSwarm(swarmId);

      return {
        success: true,
        swarmId,
        message: 'Swarm created and started successfully',
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to execute swarm',
      });
    }
  }),

  /**
   * Shutdown coordinator (for cleanup)
   */
  shutdown: publicProcedure.mutation(async () => {
    try {
      if (coordinator) {
        await coordinator.shutdown();
        coordinator = null;
        distributor = null;
      }

      return {
        success: true,
        message: 'Coordinator shut down successfully',
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to shutdown coordinator',
      });
    }
  }),
});
