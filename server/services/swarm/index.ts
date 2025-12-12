/**
 * Swarm System - Main Export
 *
 * Provides multi-agent swarm coordination capabilities
 * Adapted from claude-flow-foundation swarm system
 *
 * Features:
 * - Multi-agent task distribution
 * - Intelligent agent spawning and lifecycle management
 * - 64 specialized agent types
 * - Adaptive task scheduling
 * - Real-time health monitoring
 * - Result aggregation
 */

export * from './types';
export * from './agentTypes';
export * from './coordinator.service';
export * from './taskDistributor.service';

// Re-export main classes for convenience
export { SwarmCoordinator } from './coordinator.service';
export { TaskDistributor } from './taskDistributor.service';
export { AGENT_TYPES, getAgentTypeDefinition, getAgentTypesByCategory } from './agentTypes';
