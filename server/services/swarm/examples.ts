/**
 * Swarm Coordinator Examples
 * Production-ready usage examples for the swarm system
 */

import { SwarmCoordinator, TaskDistributor, type AgentType } from './index';

/**
 * Example 1: Basic Swarm Creation and Execution
 */
export async function basicSwarmExample() {
  const coordinator = new SwarmCoordinator({
    maxAgents: 10,
    maxConcurrentTasks: 5,
    autoScaling: true,
  });

  await coordinator.initialize();

  // Create a development swarm
  const swarmId = await coordinator.createSwarm(
    'Build a REST API with user authentication, database integration, and comprehensive tests',
    {
      name: 'API Development Swarm',
      strategy: 'development',
      maxAgents: 5,
      timeout: 7200000, // 2 hours
    }
  );

  // Start the swarm
  await coordinator.startSwarm(swarmId);

  // Monitor progress
  const checkInterval = setInterval(async () => {
    const status = coordinator.getSwarmStatus(swarmId);
    if (!status) {
      clearInterval(checkInterval);
      return;
    }

    console.log('Progress:', {
      percent: status.objective.progress.percentComplete,
      completed: status.objective.progress.completedTasks,
      total: status.objective.progress.totalTasks,
      agents: status.agents.size,
    });

    if (status.objective.status === 'completed' || status.objective.status === 'failed') {
      clearInterval(checkInterval);
      console.log('Swarm finished:', status.objective.status);
      console.log('Results:', status.objective.results);
    }
  }, 5000);

  return swarmId;
}

/**
 * Example 2: Research Swarm
 */
export async function researchSwarmExample() {
  const coordinator = new SwarmCoordinator();
  await coordinator.initialize();

  const swarmId = await coordinator.createSwarm(
    'Research and analyze the top 10 SaaS pricing strategies, identify trends, and provide recommendations',
    {
      name: 'Market Research Swarm',
      strategy: 'research',
      maxAgents: 3,
    }
  );

  await coordinator.startSwarm(swarmId);

  // Listen for completion
  coordinator.once('swarm:completed', ({ swarmId: completedId, results }) => {
    if (completedId === swarmId) {
      console.log('Research completed:', {
        quality: results.overallQuality,
        duration: results.totalExecutionTime,
        outputs: results.outputs,
        reports: results.reports,
      });
    }
  });

  return swarmId;
}

/**
 * Example 3: Data Analysis Swarm
 */
export async function analysisSwarmExample() {
  const coordinator = new SwarmCoordinator({
    maxAgents: 5,
    coordinationStrategy: 'mesh',
  });

  await coordinator.initialize();

  const swarmId = await coordinator.createSwarm(
    'Analyze customer churn data, identify patterns, create visualizations, and generate actionable insights',
    {
      name: 'Churn Analysis Swarm',
      strategy: 'analysis',
      maxAgents: 4,
    }
  );

  await coordinator.startSwarm(swarmId);

  // Monitor health
  const healthCheck = setInterval(async () => {
    const health = await coordinator.getHealth();
    console.log('System Health:', {
      overall: health.overall,
      healthyAgents: health.agents.healthy,
      issues: health.issues.length,
    });

    if (health.issues.length > 0) {
      console.warn('Health Issues:', health.issues);
    }
  }, 10000);

  // Cleanup after 2 hours
  setTimeout(() => {
    clearInterval(healthCheck);
    coordinator.stopSwarm(swarmId, 'Timeout');
  }, 7200000);

  return swarmId;
}

/**
 * Example 4: Multi-Swarm Coordination
 */
export async function multiSwarmExample() {
  const coordinator = new SwarmCoordinator({
    maxAgents: 20,
    maxTasks: 200,
    autoScaling: true,
    loadBalancing: true,
  });

  await coordinator.initialize();

  // Create multiple swarms for different tasks
  const swarms = await Promise.all([
    // Frontend development
    coordinator.createSwarm('Build React dashboard with charts and real-time updates', {
      name: 'Frontend Swarm',
      strategy: 'development',
      maxAgents: 4,
    }),

    // Backend development
    coordinator.createSwarm('Develop GraphQL API with authentication and authorization', {
      name: 'Backend Swarm',
      strategy: 'development',
      maxAgents: 5,
    }),

    // Testing
    coordinator.createSwarm('Create comprehensive test suite with unit, integration, and E2E tests', {
      name: 'Testing Swarm',
      strategy: 'auto',
      maxAgents: 3,
    }),
  ]);

  // Start all swarms
  await Promise.all(swarms.map((swarmId) => coordinator.startSwarm(swarmId)));

  // Monitor all swarms
  const allSwarms = coordinator.getAllSwarmStatuses();
  console.log('Active swarms:', allSwarms.length);

  return swarms;
}

/**
 * Example 5: Task Distribution with Custom Strategy
 */
export async function taskDistributionExample() {
  const distributor = new TaskDistributor('capability-based');

  // Queue multiple tasks
  const tasks = [
    {
      id: { id: 'task-1', swarmId: 'swarm-1', sequence: 1, priority: 1 },
      type: 'coding' as const,
      name: 'Implement authentication',
      description: 'Build JWT-based authentication system',
      priority: 'high' as const,
      status: 'created' as const,
      requirements: {
        capabilities: ['code-generation', 'security'],
        tools: ['git', 'editor'],
        permissions: ['read', 'write'],
      },
      constraints: {
        dependencies: [],
        maxRetries: 3,
        timeoutAfter: 3600000,
      },
      input: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: 0,
      maxRetries: 3,
    },
    {
      id: { id: 'task-2', swarmId: 'swarm-1', sequence: 2, priority: 2 },
      type: 'testing' as const,
      name: 'Write authentication tests',
      description: 'Create comprehensive test suite',
      priority: 'medium' as const,
      status: 'created' as const,
      requirements: {
        capabilities: ['testing', 'quality-assurance'],
        tools: ['jest', 'test-runner'],
        permissions: ['read', 'execute'],
      },
      constraints: {
        dependencies: [],
        maxRetries: 3,
        timeoutAfter: 1800000,
      },
      input: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: 0,
      maxRetries: 3,
    },
  ];

  for (const task of tasks) {
    await distributor.queueTask(task);
  }

  // Check queue status
  const status = distributor.getQueueStatus();
  console.log('Queue Status:', status);

  // Monitor task events
  distributor.on('task:assigned', ({ taskId, agentId, agentName }) => {
    console.log(`Task ${taskId} assigned to ${agentName} (${agentId})`);
  });

  distributor.on('task:completed', ({ taskId, duration }) => {
    console.log(`Task ${taskId} completed in ${duration}ms`);
  });

  distributor.on('task:failed', ({ taskId, error, willRetry }) => {
    console.error(`Task ${taskId} failed:`, error, 'Retry:', willRetry);
  });

  return distributor;
}

/**
 * Example 6: Agent Type Selection
 */
export async function agentTypeExample() {
  const { AGENT_TYPES, getAgentTypesByCategory, findAgentTypesForCapabilities } = await import(
    './agentTypes'
  );

  // Get all development agents
  const devAgents = getAgentTypesByCategory('development');
  console.log('Development Agents:', devAgents.map((a) => a.name));

  // Find agents with specific capabilities
  const fullStackAgents = findAgentTypesForCapabilities([
    'typescript',
    'react',
    'api-development',
  ]);
  console.log('Full-stack Agents:', fullStackAgents);

  // Get specific agent capabilities
  const coderAgent = AGENT_TYPES['coder'];
  console.log('Coder Agent Capabilities:', {
    languages: coderAgent.capabilities.languages,
    frameworks: coderAgent.capabilities.frameworks,
    tools: coderAgent.capabilities.tools,
    maxConcurrent: coderAgent.capabilities.maxConcurrentTasks,
  });

  return { devAgents, fullStackAgents };
}

/**
 * Example 7: Health Monitoring and Alerting
 */
export async function healthMonitoringExample() {
  const coordinator = new SwarmCoordinator();
  await coordinator.initialize();

  const swarmId = await coordinator.createSwarm('Complex multi-agent task', {
    strategy: 'auto',
  });

  await coordinator.startSwarm(swarmId);

  // Set up health monitoring
  const healthMonitor = setInterval(async () => {
    const health = await coordinator.getHealth();

    // Check for critical issues
    const criticalIssues = health.issues.filter((issue) => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      console.error('CRITICAL ISSUES DETECTED:', criticalIssues);
      // Send alert/notification here
    }

    // Check agent health
    if (health.agents.unhealthy > health.agents.healthy) {
      console.warn('More unhealthy agents than healthy ones!');
    }

    // Check task failure rate
    const totalTasks = health.tasks.completed + health.tasks.failed;
    const failureRate = totalTasks > 0 ? health.tasks.failed / totalTasks : 0;
    if (failureRate > 0.2) {
      console.warn(`High task failure rate: ${(failureRate * 100).toFixed(1)}%`);
    }

    // Check overall health
    if (health.overall < 0.5) {
      console.error('SYSTEM HEALTH CRITICAL:', health.overall);
      // Consider stopping swarm or taking corrective action
    }
  }, 30000); // Check every 30 seconds

  // Cleanup
  setTimeout(() => clearInterval(healthMonitor), 3600000); // Stop after 1 hour

  return swarmId;
}

/**
 * Example 8: Metrics Collection and Analysis
 */
export async function metricsExample() {
  const coordinator = new SwarmCoordinator();
  await coordinator.initialize();

  const swarmId = await coordinator.createSwarm('Test swarm for metrics', {
    strategy: 'development',
  });

  await coordinator.startSwarm(swarmId);

  // Collect metrics periodically
  const metricsCollector = setInterval(() => {
    const metrics = coordinator.getMetrics();

    console.log('Global Metrics:', {
      throughput: metrics.global.throughput,
      efficiency: metrics.global.efficiency,
      reliability: metrics.global.reliability,
      agentUtilization: metrics.global.agentUtilization,
      errorRate: metrics.global.errorRate,
    });

    // Per-swarm metrics
    Object.entries(metrics.swarms).forEach(([id, swarmMetrics]) => {
      console.log(`Swarm ${id} Metrics:`, {
        throughput: swarmMetrics.throughput,
        efficiency: swarmMetrics.efficiency,
        quality: swarmMetrics.averageQuality,
      });
    });

    // Alert if metrics degrade
    if (metrics.global.efficiency < 0.5) {
      console.warn('Low efficiency detected:', metrics.global.efficiency);
    }

    if (metrics.global.errorRate > 0.1) {
      console.warn('High error rate detected:', metrics.global.errorRate);
    }
  }, 10000);

  // Cleanup
  setTimeout(() => clearInterval(metricsCollector), 3600000);

  return swarmId;
}

/**
 * Example 9: Graceful Shutdown
 */
export async function gracefulShutdownExample() {
  const coordinator = new SwarmCoordinator();
  await coordinator.initialize();

  // Create and start swarm
  const swarmId = await coordinator.createSwarm('Long-running task', {
    strategy: 'auto',
  });

  await coordinator.startSwarm(swarmId);

  // Set up signal handlers for graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');

    // Stop all active swarms
    const activeSwarms = coordinator.getAllSwarmStatuses();
    for (const swarm of activeSwarms) {
      await coordinator.stopSwarm(swarm.swarmId, 'Process termination');
    }

    // Shutdown coordinator
    await coordinator.shutdown();

    console.log('Shutdown complete');
    process.exit(0);
  });

  return swarmId;
}

/**
 * Example 10: Integration with tRPC
 */
export async function trpcIntegrationExample() {
  // This example shows how to use the swarm via tRPC API

  // In your client code:
  /*
  import { trpc } from '@/client/trpc';

  // Create and start swarm
  const result = await trpc.swarm.executeQuick.mutate({
    objective: 'Build a complete CRUD API with TypeScript and PostgreSQL',
    strategy: 'development',
    maxAgents: 6,
    autoScaling: true,
  });

  console.log('Swarm ID:', result.swarmId);

  // Monitor progress
  const interval = setInterval(async () => {
    const status = await trpc.swarm.getStatus.query({
      swarmId: result.swarmId,
    });

    console.log('Progress:', status.swarm.progress);

    if (status.swarm.status === 'completed' || status.swarm.status === 'failed') {
      clearInterval(interval);
      console.log('Final status:', status.swarm.status);
    }
  }, 5000);

  // Get health
  const health = await trpc.swarm.getHealth.query();
  console.log('Health:', health);

  // Get metrics
  const metrics = await trpc.swarm.getMetrics.query();
  console.log('Metrics:', metrics);

  // Get available agent types
  const agentTypes = await trpc.swarm.getAgentTypes.query();
  console.log('Available agents:', agentTypes.agentTypes.length);

  // List all active swarms
  const swarms = await trpc.swarm.listActive.query();
  console.log('Active swarms:', swarms.swarms);
  */
}

// Export all examples
export const swarmExamples = {
  basic: basicSwarmExample,
  research: researchSwarmExample,
  analysis: analysisSwarmExample,
  multiSwarm: multiSwarmExample,
  taskDistribution: taskDistributionExample,
  agentTypes: agentTypeExample,
  healthMonitoring: healthMonitoringExample,
  metrics: metricsExample,
  gracefulShutdown: gracefulShutdownExample,
  trpcIntegration: trpcIntegrationExample,
};
