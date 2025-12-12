# Swarm Coordinator Service

A production-ready multi-agent swarm coordination system adapted from [claude-flow-foundation](https://github.com/ruvnet/claude-flow) for the GHL Agency AI platform.

## Overview

The Swarm Coordinator provides intelligent orchestration of multiple AI agents working collaboratively to complete complex tasks. It implements a hive-mind queen-worker pattern with sophisticated task distribution, agent lifecycle management, and result aggregation.

## Features

- **64 Specialized Agent Types** - From researchers to architects to testers
- **Intelligent Task Distribution** - Capability-based agent selection and load balancing
- **Adaptive Coordination** - Multiple coordination strategies (hierarchical, mesh, adaptive, hybrid)
- **Agent Lifecycle Management** - Automatic spawning, monitoring, and termination
- **Real-time Health Monitoring** - Track agent health, task progress, and system metrics
- **Result Aggregation** - Collect and synthesize results from multiple agents
- **Fault Tolerance** - Automatic retry, error handling, and recovery
- **Auto-scaling** - Dynamic agent scaling based on workload

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Swarm Coordinator                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Agent Registry (64 types)                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Task Distributor                            │  │
│  │  • Capability Matching                                │  │
│  │  • Load Balancing                                     │  │
│  │  • Priority Scheduling                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Active Swarms                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │ Agent 1  │  │ Agent 2  │  │ Agent N  │            │  │
│  │  └──────────┘  └──────────┘  └──────────┘            │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Health Monitor & Metrics                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Basic Usage

```typescript
import { SwarmCoordinator } from '@/server/services/swarm';

// Initialize coordinator
const coordinator = new SwarmCoordinator({
  maxAgents: 10,
  maxTasks: 100,
  coordinationStrategy: 'adaptive',
  autoScaling: true,
});

await coordinator.initialize();

// Create and start a swarm
const swarmId = await coordinator.createSwarm(
  'Build a REST API with authentication and database integration',
  {
    strategy: 'development',
    maxAgents: 5,
  }
);

await coordinator.startSwarm(swarmId);

// Monitor progress
const status = coordinator.getSwarmStatus(swarmId);
console.log('Progress:', status?.objective.progress);

// Get health
const health = await coordinator.getHealth();
console.log('System Health:', health);
```

### 2. Using via tRPC API

```typescript
import { trpc } from '@/client/trpc';

// Create and execute a swarm
const result = await trpc.swarm.executeQuick.mutate({
  objective: 'Research and analyze competitor pricing strategies',
  strategy: 'research',
  maxAgents: 3,
});

// Check status
const status = await trpc.swarm.getStatus.query({
  swarmId: result.swarmId,
});

// Get all active swarms
const swarms = await trpc.swarm.listActive.query();

// Get available agent types
const agentTypes = await trpc.swarm.getAgentTypes.query();
```

### 3. Custom Agent Configuration

```typescript
import { AGENT_TYPES, getAgentTypeDefinition } from '@/server/services/swarm';

// Get specific agent capabilities
const coderAgent = getAgentTypeDefinition('coder');
console.log('Coder capabilities:', coderAgent?.capabilities);

// List all agent types by category
const { getAgentTypesByCategory } = await import('@/server/services/swarm');
const developmentAgents = getAgentTypesByCategory('development');
```

## Agent Types

### Core Development
- **coordinator** - Orchestrates and manages other agents
- **researcher** - Performs research and data gathering
- **coder** - Writes and maintains code
- **developer** - Full-stack development
- **analyst** - Analyzes data and generates insights

### Architecture & Design
- **architect** - Designs system architecture
- **design-architect** - UI/UX and component design
- **system-architect** - System-level architecture
- **database-architect** - Database design and optimization

### Testing & Quality
- **tester** - Tests and validates functionality
- **qa-engineer** - Quality assurance specialist
- **reviewer** - Code and content review
- **test-automation-engineer** - Test automation

### DevOps & Infrastructure
- **cicd-engineer** - CI/CD pipeline management
- **cloud-architect** - Cloud infrastructure design
- **security-engineer** - Security and compliance
- **performance-engineer** - Performance optimization

### Specialized
- **task-planner** - Project management and task breakdown
- **requirements-engineer** - Requirements analysis
- **documenter** - Documentation specialist
- **monitor** - System monitoring

...and 40+ more specialized agent types!

## Coordination Strategies

### 1. Hierarchical
Queen-worker pattern with centralized coordination.

```typescript
const swarm = new SwarmCoordinator({
  coordinationStrategy: 'hierarchical',
});
```

### 2. Mesh
Peer-to-peer coordination with agents collaborating directly.

```typescript
const swarm = new SwarmCoordinator({
  coordinationStrategy: 'mesh',
});
```

### 3. Adaptive
Dynamically adapts coordination based on task complexity.

```typescript
const swarm = new SwarmCoordinator({
  coordinationStrategy: 'adaptive',
});
```

### 4. Hybrid
Combines multiple strategies for optimal performance.

```typescript
const swarm = new SwarmCoordinator({
  coordinationStrategy: 'hybrid',
});
```

## Task Distribution

The Task Distributor intelligently assigns tasks to agents based on:

1. **Capability Matching** - Ensures agent has required skills
2. **Workload Balancing** - Prevents agent overload
3. **Priority Scheduling** - High-priority tasks first
4. **Health-based Selection** - Prefers healthy, reliable agents

```typescript
import { TaskDistributor } from '@/server/services/swarm';

const distributor = new TaskDistributor('capability-based');

// Queue a task
await distributor.queueTask(taskDefinition);

// Distribute to available agents
const assignedCount = await distributor.distributeTasks(availableAgents);

// Check queue status
const queueStatus = distributor.getQueueStatus();
```

## Health Monitoring

Real-time monitoring of swarm and agent health:

```typescript
const health = await coordinator.getHealth();

console.log({
  overall: health.overall, // 0-1 health score
  agents: {
    healthy: health.agents.healthy,
    unhealthy: health.agents.unhealthy,
    offline: health.agents.offline,
  },
  tasks: {
    completed: health.tasks.completed,
    running: health.tasks.running,
    failed: health.tasks.failed,
  },
  issues: health.issues, // Detected problems
});
```

## Metrics & Analytics

Track swarm performance and efficiency:

```typescript
const metrics = coordinator.getMetrics();

console.log({
  global: {
    throughput: metrics.global.throughput,
    efficiency: metrics.global.efficiency,
    reliability: metrics.global.reliability,
    agentUtilization: metrics.global.agentUtilization,
  },
  swarms: metrics.swarms, // Per-swarm metrics
});
```

## Events

The coordinator emits events for monitoring:

```typescript
coordinator.on('swarm:created', ({ swarmId, objective }) => {
  console.log('Swarm created:', swarmId);
});

coordinator.on('swarm:started', ({ swarmId, taskCount, agentCount }) => {
  console.log('Swarm started with', agentCount, 'agents and', taskCount, 'tasks');
});

coordinator.on('swarm:completed', ({ swarmId, results }) => {
  console.log('Swarm completed:', results);
});

coordinator.on('health:warning', (health) => {
  console.warn('Health issues detected:', health.issues);
});
```

## API Endpoints

### Swarm Management

- `swarm.initialize` - Initialize the coordinator
- `swarm.create` - Create a new swarm
- `swarm.start` - Start a swarm
- `swarm.stop` - Stop a swarm
- `swarm.getStatus` - Get swarm status
- `swarm.listActive` - List all active swarms
- `swarm.executeQuick` - Create and start in one call

### Monitoring

- `swarm.getHealth` - Get health status
- `swarm.getMetrics` - Get performance metrics
- `swarm.getQueueStatus` - Get task queue status

### Configuration

- `swarm.getAgentTypes` - List available agent types
- `swarm.shutdown` - Shutdown coordinator

## Advanced Configuration

### Custom Swarm Config

```typescript
const coordinator = new SwarmCoordinator({
  name: 'Production Swarm',
  description: 'High-performance swarm for production workloads',
  maxAgents: 50,
  maxTasks: 500,
  maxConcurrentTasks: 20,
  taskTimeoutMinutes: 60,
  coordinationStrategy: 'hybrid',
  autoScaling: true,
  loadBalancing: true,
  faultTolerance: true,
});
```

### Task Distribution Strategy

```typescript
// Capability-based (default) - Best for complex tasks
const distributor = new TaskDistributor('capability-based');

// Least-loaded - Best for uniform tasks
const distributor = new TaskDistributor('least-loaded');

// Round-robin - Simple and fair
const distributor = new TaskDistributor('round-robin');
```

## Error Handling

The swarm system includes robust error handling:

```typescript
try {
  const swarmId = await coordinator.createSwarm(objective);
  await coordinator.startSwarm(swarmId);
} catch (error) {
  if (error.message.includes('not found')) {
    // Swarm doesn't exist
  } else if (error.message.includes('not in planning state')) {
    // Invalid state transition
  } else {
    // Other error
  }
}
```

## Performance Optimization

### Auto-scaling

Automatically adjusts agent count based on workload:

```typescript
const coordinator = new SwarmCoordinator({
  autoScaling: true,
  maxAgents: 50,
});
```

### Load Balancing

Distributes tasks evenly across agents:

```typescript
const coordinator = new SwarmCoordinator({
  loadBalancing: true,
  maxConcurrentTasks: 20,
});
```

### Fault Tolerance

Automatic retry and recovery:

```typescript
const coordinator = new SwarmCoordinator({
  faultTolerance: true,
  maxRetries: 3,
});
```

## Integration Examples

### With Workflows

```typescript
import { WorkflowExecutionService } from '@/server/services/workflowExecution.service';
import { SwarmCoordinator } from '@/server/services/swarm';

// Execute workflow with swarm
const workflow = await workflowService.execute(workflowId);
const swarmId = await coordinator.createSwarm(workflow.objective);
await coordinator.startSwarm(swarmId);
```

### With Agent Service

```typescript
import { AgentOrchestrator } from '@/server/services/agentOrchestrator.service';
import { SwarmCoordinator } from '@/server/services/swarm';

// Use swarm for complex agent tasks
const coordinator = new SwarmCoordinator();
await coordinator.initialize();

// Execute multi-agent task
const result = await coordinator.executeQuick({
  objective: 'Complex task requiring multiple specialized agents',
  strategy: 'auto',
});
```

## Best Practices

1. **Initialize Once** - Create a single coordinator instance and reuse it
2. **Monitor Health** - Regularly check health status and act on warnings
3. **Use Appropriate Strategy** - Choose coordination strategy based on task type
4. **Set Reasonable Limits** - Configure maxAgents and maxTasks for your workload
5. **Handle Events** - Listen to coordinator events for monitoring and debugging
6. **Clean Up** - Always shutdown coordinator when done to free resources

## Troubleshooting

### Swarm Not Starting

```typescript
// Check if coordinator is initialized
if (!coordinator.isRunning) {
  await coordinator.initialize();
}

// Verify swarm status
const status = coordinator.getSwarmStatus(swarmId);
console.log('Swarm status:', status?.objective.status);
```

### Agents Not Being Assigned

```typescript
// Check queue status
const queueStatus = distributor.getQueueStatus();
console.log('Queue length:', queueStatus.queueLength);

// Verify agent availability
const health = await coordinator.getHealth();
console.log('Available agents:', health.agents.healthy);
```

### Performance Issues

```typescript
// Check metrics
const metrics = coordinator.getMetrics();
console.log('Agent utilization:', metrics.global.agentUtilization);

// Enable auto-scaling
const coordinator = new SwarmCoordinator({
  autoScaling: true,
  loadBalancing: true,
});
```

## Related Documentation

- [Agent Orchestrator](/root/github-repos/active/ghl-agency-ai/server/services/AGENT_ORCHESTRATOR_README.md)
- [Workflow Execution](/root/github-repos/active/ghl-agency-ai/server/services/README_WORKFLOW_EXECUTION.md)
- [claude-flow-foundation](https://github.com/ruvnet/claude-flow)

## License

Adapted from claude-flow-foundation under MIT License.
