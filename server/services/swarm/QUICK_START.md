# Swarm Coordinator - Quick Start Guide

Get started with multi-agent swarm coordination in 5 minutes!

## Installation

No installation needed! The swarm system is already integrated into GHL Agency AI.

## Basic Usage (3 Steps)

### Step 1: Initialize via API

```typescript
import { trpc } from '@/client/trpc';

// Initialize the swarm coordinator
await trpc.swarm.initialize.mutate();
```

### Step 2: Create and Execute a Swarm

```typescript
// Quick execution - create and start in one call
const result = await trpc.swarm.executeQuick.mutate({
  objective: 'Build a REST API with user authentication and CRUD operations',
  strategy: 'development',
  maxAgents: 5,
});

console.log('Swarm ID:', result.swarmId);
// Output: Swarm ID: swarm_1234567890_abc123def
```

### Step 3: Monitor Progress

```typescript
// Check swarm status
const status = await trpc.swarm.getStatus.query({
  swarmId: result.swarmId,
});

console.log('Progress:', status.swarm.progress.percentComplete, '%');
console.log('Agents:', status.swarm.agents.length);
console.log('Tasks:', status.swarm.tasks.length);
console.log('Status:', status.swarm.status);
```

## Common Use Cases

### 1. Research & Analysis

```typescript
const swarm = await trpc.swarm.executeQuick.mutate({
  objective: 'Research top 10 SaaS pricing models and provide recommendations',
  strategy: 'research',
  maxAgents: 3,
});
```

### 2. Full-Stack Development

```typescript
const swarm = await trpc.swarm.executeQuick.mutate({
  objective: 'Build a React dashboard with charts, real-time updates, and data exports',
  strategy: 'development',
  maxAgents: 6,
});
```

### 3. Data Analysis

```typescript
const swarm = await trpc.swarm.executeQuick.mutate({
  objective: 'Analyze customer churn data, identify patterns, and create visualizations',
  strategy: 'analysis',
  maxAgents: 4,
});
```

### 4. Testing & QA

```typescript
const swarm = await trpc.swarm.executeQuick.mutate({
  objective: 'Create comprehensive test suite with unit, integration, and E2E tests',
  strategy: 'auto',
  maxAgents: 3,
});
```

## Monitoring Real-Time

```typescript
// Poll for updates
const interval = setInterval(async () => {
  const status = await trpc.swarm.getStatus.query({
    swarmId: swarm.swarmId,
  });

  console.log(`Progress: ${status.swarm.progress.percentComplete}%`);
  console.log(`Running tasks: ${status.swarm.progress.runningTasks}`);
  console.log(`Completed: ${status.swarm.progress.completedTasks}`);

  if (status.swarm.status === 'completed' || status.swarm.status === 'failed') {
    clearInterval(interval);
    console.log('Swarm finished!');
  }
}, 5000); // Check every 5 seconds
```

## Check System Health

```typescript
const health = await trpc.swarm.getHealth.query();

console.log('Overall Health:', health.health.overall);
console.log('Healthy Agents:', health.health.agents.healthy);
console.log('Active Tasks:', health.health.tasks.running);
```

## List All Active Swarms

```typescript
const swarms = await trpc.swarm.listActive.query();

console.log('Active Swarms:', swarms.swarms.length);
swarms.swarms.forEach((s) => {
  console.log(`- ${s.name}: ${s.progress.percentComplete}% complete`);
});
```

## Stop a Swarm

```typescript
await trpc.swarm.stop.mutate({
  swarmId: 'swarm_id_here',
  reason: 'User requested stop',
});
```

## View Available Agent Types

```typescript
const agents = await trpc.swarm.getAgentTypes.query();

console.log('Available Agents:', agents.agentTypes.length);
agents.agentTypes.forEach((agent) => {
  console.log(`- ${agent.name} (${agent.category})`);
  console.log(`  ${agent.description}`);
});
```

## Advanced: Using the Service Directly

For more control, use the service directly:

```typescript
import { SwarmCoordinator } from '@/server/services/swarm';

const coordinator = new SwarmCoordinator({
  maxAgents: 20,
  maxConcurrentTasks: 10,
  autoScaling: true,
  loadBalancing: true,
});

await coordinator.initialize();

const swarmId = await coordinator.createSwarm(
  'Your objective here',
  {
    name: 'My Custom Swarm',
    strategy: 'development',
    maxAgents: 8,
    timeout: 7200000, // 2 hours
  }
);

await coordinator.startSwarm(swarmId);

// Listen to events
coordinator.on('swarm:completed', ({ swarmId, results }) => {
  console.log('Swarm completed:', results);
});
```

## Configuration Options

### Strategies
- `research` - Research and analysis tasks
- `development` - Software development tasks
- `analysis` - Data analysis and insights
- `deployment` - Deployment and operations
- `auto` - Automatically determine best strategy

### Options
```typescript
{
  objective: string;        // What you want to accomplish
  name?: string;            // Custom swarm name
  strategy?: string;        // Coordination strategy
  maxAgents?: number;       // Max concurrent agents (1-50)
  maxTasks?: number;        // Max total tasks (1-500)
  autoScaling?: boolean;    // Enable auto-scaling
  timeout?: number;         // Max duration in ms
}
```

## Error Handling

```typescript
try {
  const result = await trpc.swarm.executeQuick.mutate({
    objective: 'Your task',
    strategy: 'development',
  });

  console.log('Success:', result.swarmId);
} catch (error) {
  console.error('Failed to create swarm:', error.message);
}
```

## Best Practices

1. **Start Small** - Begin with 3-5 agents
2. **Monitor Health** - Check health regularly
3. **Set Timeouts** - Prevent runaway swarms
4. **Use Strategies** - Pick the right strategy for your task
5. **Handle Errors** - Always wrap in try-catch
6. **Check Progress** - Poll status periodically
7. **Clean Up** - Stop swarms when done

## Troubleshooting

### Swarm Not Starting
```typescript
// Check if initialized
await trpc.swarm.initialize.mutate();

// Verify status
const status = await trpc.swarm.getStatus.query({ swarmId });
console.log('Status:', status.swarm.status);
```

### Low Performance
```typescript
// Check metrics
const metrics = await trpc.swarm.getMetrics.query();
console.log('Efficiency:', metrics.metrics.global.efficiency);

// Enable auto-scaling
const swarm = await trpc.swarm.executeQuick.mutate({
  objective: 'Your task',
  autoScaling: true,
  maxAgents: 20,
});
```

### Too Many Failures
```typescript
// Check health
const health = await trpc.swarm.getHealth.query();
console.log('Failure rate:', health.health.tasks.failed);

// Review issues
console.log('Issues:', health.health.issues);
```

## Next Steps

- Read the [Full Documentation](./README.md)
- Explore [Usage Examples](./examples.ts)
- Review [Implementation Details](./IMPLEMENTATION_SUMMARY.md)
- Check available [Agent Types](./agentTypes.ts)

## Support

For issues or questions:
1. Check the [Full Documentation](./README.md)
2. Review [Troubleshooting Guide](./README.md#troubleshooting)
3. Examine [Usage Examples](./examples.ts)

## Quick Reference

```typescript
// Initialize
await trpc.swarm.initialize.mutate();

// Execute
const { swarmId } = await trpc.swarm.executeQuick.mutate({ objective, strategy });

// Status
await trpc.swarm.getStatus.query({ swarmId });

// Health
await trpc.swarm.getHealth.query();

// Metrics
await trpc.swarm.getMetrics.query();

// List
await trpc.swarm.listActive.query();

// Stop
await trpc.swarm.stop.mutate({ swarmId });

// Shutdown
await trpc.swarm.shutdown.mutate();
```

That's it! You're now ready to use multi-agent swarm coordination in your GHL Agency AI application.
