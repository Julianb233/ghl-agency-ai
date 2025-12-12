/**
 * Swarm Coordinator Service
 * Orchestrates multi-agent task distribution and lifecycle management
 * Adapted from claude-flow-foundation Advanced Swarm Orchestrator
 */

import { EventEmitter } from 'events';
import type {
  SwarmId,
  SwarmConfig,
  SwarmObjective,
  SwarmProgress,
  SwarmResults,
  SwarmHealth,
  SwarmMetrics,
  AgentState,
  AgentId,
  AgentType,
  TaskDefinition,
  TaskId,
  TaskResult,
  SwarmEvent,
  SwarmEventType,
  HealthIssue,
} from './types';
import { AGENT_TYPES, getAgentTypeDefinition } from './agentTypes';

export interface SwarmExecutionContext {
  swarmId: string;
  objective: SwarmObjective;
  agents: Map<string, AgentState>;
  tasks: Map<string, TaskDefinition>;
  startTime: Date;
  endTime?: Date;
  metrics: SwarmMetrics;
}

export interface CreateSwarmOptions {
  name?: string;
  strategy?: SwarmObjective['strategy'];
  maxAgents?: number;
  maxTasks?: number;
  autoScaling?: boolean;
  timeout?: number;
}

/**
 * Main Swarm Coordinator
 * Manages agent lifecycle, task distribution, and result aggregation
 */
export class SwarmCoordinator extends EventEmitter {
  private config: SwarmConfig;
  private activeSwarms: Map<string, SwarmExecutionContext> = new Map();
  private globalMetrics: SwarmMetrics;
  private isRunning: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCollectionInterval?: NodeJS.Timeout;

  constructor(config: Partial<SwarmConfig> = {}) {
    super();
    this.config = this.createDefaultConfig(config);
    this.globalMetrics = this.initializeMetrics();
  }

  /**
   * Initialize the coordinator
   */
  async initialize(): Promise<void> {
    if (this.isRunning) {
      console.warn('[SwarmCoordinator] Already running');
      return;
    }

    console.log('[SwarmCoordinator] Initializing...');

    // Start background processes
    this.startHealthChecks();
    this.startMetricsCollection();

    this.isRunning = true;
    this.emit('coordinator:initialized');
    console.log('[SwarmCoordinator] Initialized successfully');
  }

  /**
   * Shutdown the coordinator gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[SwarmCoordinator] Shutting down...');

    // Stop background processes
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.metricsCollectionInterval) clearInterval(this.metricsCollectionInterval);

    // Shutdown active swarms
    const shutdownPromises = Array.from(this.activeSwarms.keys()).map((swarmId) =>
      this.stopSwarm(swarmId, 'Coordinator shutdown')
    );
    await Promise.allSettled(shutdownPromises);

    this.isRunning = false;
    this.emit('coordinator:shutdown');
    console.log('[SwarmCoordinator] Shutdown complete');
  }

  /**
   * Create a new swarm
   */
  async createSwarm(
    objective: string,
    options: CreateSwarmOptions = {}
  ): Promise<string> {
    const swarmId = this.generateId('swarm');
    const strategy = options.strategy || 'auto';

    const swarmObjective: SwarmObjective = {
      id: swarmId,
      name: options.name || `Swarm-${swarmId.slice(0, 8)}`,
      description: objective,
      strategy,
      requirements: {
        minAgents: 1,
        maxAgents: options.maxAgents || this.config.maxAgents,
        agentTypes: this.getRequiredAgentTypes(strategy),
        estimatedDuration: 3600000, // 1 hour
        maxDuration: options.timeout || 7200000, // 2 hours
        qualityThreshold: 0.8,
      },
      constraints: {
        maxCost: 1000,
        requiredApprovals: [],
        allowedFailures: 2,
      },
      status: 'planning',
      progress: this.initializeProgress(),
      createdAt: new Date(),
    };

    // Create execution context
    const context: SwarmExecutionContext = {
      swarmId,
      objective: swarmObjective,
      agents: new Map(),
      tasks: new Map(),
      startTime: new Date(),
      metrics: this.initializeMetrics(),
    };

    this.activeSwarms.set(swarmId, context);

    this.emit('swarm:created', { swarmId, objective: swarmObjective });
    console.log(`[SwarmCoordinator] Created swarm: ${swarmId}`, {
      strategy,
      maxAgents: swarmObjective.requirements.maxAgents,
    });

    return swarmId;
  }

  /**
   * Start executing a swarm
   */
  async startSwarm(swarmId: string): Promise<void> {
    const context = this.activeSwarms.get(swarmId);
    if (!context) {
      throw new Error(`Swarm not found: ${swarmId}`);
    }

    if (context.objective.status !== 'planning') {
      throw new Error(`Swarm ${swarmId} is not in planning state`);
    }

    console.log(`[SwarmCoordinator] Starting swarm: ${swarmId}`);

    try {
      context.objective.status = 'initializing';
      context.objective.startedAt = new Date();

      // Decompose objective into tasks
      const tasks = await this.decomposeObjective(context.objective);
      tasks.forEach((task) => {
        context.tasks.set(task.id.id, task);
      });

      // Spawn required agents
      const agents = await this.spawnRequiredAgents(context);
      agents.forEach((agent) => {
        context.agents.set(agent.id.id, agent);
      });

      // Start task execution
      context.objective.status = 'executing';
      this.scheduleAndExecuteTasks(context);

      this.emit('swarm:started', { swarmId, taskCount: tasks.length, agentCount: agents.length });
      console.log(`[SwarmCoordinator] Swarm started: ${swarmId}`, {
        tasks: tasks.length,
        agents: agents.length,
      });
    } catch (error) {
      context.objective.status = 'failed';
      console.error(`[SwarmCoordinator] Failed to start swarm: ${swarmId}`, error);
      throw error;
    }
  }

  /**
   * Stop a running swarm
   */
  async stopSwarm(swarmId: string, reason: string = 'Manual stop'): Promise<void> {
    const context = this.activeSwarms.get(swarmId);
    if (!context) {
      throw new Error(`Swarm not found: ${swarmId}`);
    }

    console.log(`[SwarmCoordinator] Stopping swarm: ${swarmId}`, { reason });

    context.objective.status = 'cancelled';
    context.endTime = new Date();

    // Terminate all agents
    for (const agent of context.agents.values()) {
      this.terminateAgent(agent.id);
    }

    this.emit('swarm:stopped', { swarmId, reason });
    this.activeSwarms.delete(swarmId);
  }

  /**
   * Get swarm status
   */
  getSwarmStatus(swarmId: string): SwarmExecutionContext | null {
    return this.activeSwarms.get(swarmId) || null;
  }

  /**
   * Get all active swarms
   */
  getAllSwarmStatuses(): SwarmExecutionContext[] {
    return Array.from(this.activeSwarms.values());
  }

  /**
   * Get comprehensive health status
   */
  async getHealth(): Promise<SwarmHealth> {
    const swarms = Array.from(this.activeSwarms.values());
    const allAgents = swarms.flatMap((s) => Array.from(s.agents.values()));

    const health: SwarmHealth = {
      overall: 1.0,
      agents: {
        healthy: 0,
        unhealthy: 0,
        offline: 0,
      },
      tasks: {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
      },
      resources: {
        cpu: 0,
        memory: 0,
        disk: 0,
      },
      lastCheck: new Date(),
      issues: [],
    };

    // Count agent health
    for (const agent of allAgents) {
      if (agent.health > 0.7) health.agents.healthy++;
      else if (agent.health > 0.3) health.agents.unhealthy++;
      else health.agents.offline++;
    }

    // Count task statuses
    for (const swarm of swarms) {
      for (const task of swarm.tasks.values()) {
        if (task.status === 'completed') health.tasks.completed++;
        else if (task.status === 'failed') health.tasks.failed++;
        else if (task.status === 'running') health.tasks.running++;
        else health.tasks.pending++;
      }
    }

    // Calculate overall health
    const totalAgents = allAgents.length;
    if (totalAgents > 0) {
      health.overall = health.agents.healthy / totalAgents;
    }

    // Detect issues
    if (health.agents.unhealthy > 0) {
      health.issues.push({
        type: 'agent',
        severity: 'medium',
        message: `${health.agents.unhealthy} agents are unhealthy`,
        timestamp: new Date(),
        affectedComponents: [],
      });
    }

    if (health.tasks.failed > health.tasks.completed * 0.1) {
      health.issues.push({
        type: 'task',
        severity: 'high',
        message: 'High task failure rate detected',
        timestamp: new Date(),
        affectedComponents: [],
      });
    }

    return health;
  }

  /**
   * Get coordinator metrics
   */
  getMetrics(): { global: SwarmMetrics; swarms: Record<string, SwarmMetrics> } {
    const swarmMetrics: Record<string, SwarmMetrics> = {};
    for (const [swarmId, context] of this.activeSwarms) {
      swarmMetrics[swarmId] = context.metrics;
    }

    return {
      global: this.globalMetrics,
      swarms: swarmMetrics,
    };
  }

  // Private methods

  private async decomposeObjective(objective: SwarmObjective): Promise<TaskDefinition[]> {
    const tasks: TaskDefinition[] = [];
    const baseTaskId = this.generateId('task');

    switch (objective.strategy) {
      case 'research':
        tasks.push(
          this.createTaskDefinition(
            `${baseTaskId}-1`,
            'research',
            'Conduct comprehensive research',
            'high',
            []
          ),
          this.createTaskDefinition(
            `${baseTaskId}-2`,
            'analysis',
            'Analyze research findings',
            'high',
            [`${baseTaskId}-1`]
          ),
          this.createTaskDefinition(
            `${baseTaskId}-3`,
            'documentation',
            'Create research documentation',
            'medium',
            [`${baseTaskId}-2`]
          )
        );
        break;

      case 'development':
        tasks.push(
          this.createTaskDefinition(
            `${baseTaskId}-1`,
            'coding',
            'Design system architecture',
            'high',
            []
          ),
          this.createTaskDefinition(
            `${baseTaskId}-2`,
            'coding',
            'Generate core implementation',
            'high',
            [`${baseTaskId}-1`]
          ),
          this.createTaskDefinition(
            `${baseTaskId}-3`,
            'testing',
            'Create comprehensive tests',
            'high',
            [`${baseTaskId}-2`]
          ),
          this.createTaskDefinition(
            `${baseTaskId}-4`,
            'review',
            'Conduct code review',
            'medium',
            [`${baseTaskId}-3`]
          )
        );
        break;

      case 'analysis':
        tasks.push(
          this.createTaskDefinition(
            `${baseTaskId}-1`,
            'analysis',
            'Collect and prepare data',
            'high',
            []
          ),
          this.createTaskDefinition(
            `${baseTaskId}-2`,
            'analysis',
            'Perform statistical analysis',
            'high',
            [`${baseTaskId}-1`]
          ),
          this.createTaskDefinition(
            `${baseTaskId}-3`,
            'documentation',
            'Generate analysis report',
            'high',
            [`${baseTaskId}-2`]
          )
        );
        break;

      default: // auto
        tasks.push(
          this.createTaskDefinition(
            `${baseTaskId}-1`,
            'research',
            'Explore and understand requirements',
            'high',
            []
          ),
          this.createTaskDefinition(
            `${baseTaskId}-2`,
            'coding',
            'Execute main tasks',
            'high',
            [`${baseTaskId}-1`]
          ),
          this.createTaskDefinition(
            `${baseTaskId}-3`,
            'testing',
            'Validate and test results',
            'high',
            [`${baseTaskId}-2`]
          )
        );
    }

    return tasks;
  }

  private createTaskDefinition(
    id: string,
    type: any,
    description: string,
    priority: any,
    dependencies: string[]
  ): TaskDefinition {
    return {
      id: { id, swarmId: '', sequence: 0, priority: this.getPriorityNumber(priority) },
      type,
      name: `Task: ${type}`,
      description,
      requirements: {
        capabilities: [type],
        tools: ['bash', 'read', 'write', 'edit'],
        permissions: ['read', 'write', 'execute'],
        estimatedDuration: 1800000,
        maxDuration: 3600000,
      },
      constraints: {
        dependencies: dependencies.map((depId) => ({
          id: depId,
          swarmId: '',
          sequence: 0,
          priority: 0,
        })),
        maxRetries: 3,
        timeoutAfter: 3600000,
      },
      priority: priority as any,
      status: 'created',
      input: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: 0,
      maxRetries: 3,
    };
  }

  private async spawnRequiredAgents(context: SwarmExecutionContext): Promise<AgentState[]> {
    const agents: AgentState[] = [];
    const requiredTypes = context.objective.requirements.agentTypes;

    for (const agentType of requiredTypes) {
      const agentId = this.generateId('agent');
      const agentDef = getAgentTypeDefinition(agentType);

      if (!agentDef) {
        console.warn(`[SwarmCoordinator] Unknown agent type: ${agentType}`);
        continue;
      }

      const agent: AgentState = {
        id: { id: agentId, swarmId: context.swarmId, type: agentType, instance: 1 },
        name: `${agentDef.name}-${agentId.slice(0, 8)}`,
        type: agentType,
        status: 'idle',
        capabilities: { ...agentDef.capabilities },
        metrics: this.createDefaultMetrics(),
        workload: 0,
        health: 1.0,
        lastHeartbeat: new Date(),
        errorHistory: [],
        taskHistory: [],
      };

      agents.push(agent);
      console.log(`[SwarmCoordinator] Spawned agent: ${agent.name} (${agentType})`);
    }

    return agents;
  }

  private scheduleAndExecuteTasks(context: SwarmExecutionContext): void {
    // Simple task execution monitoring
    const monitorInterval = setInterval(() => {
      this.updateSwarmProgress(context);

      if (this.isSwarmComplete(context)) {
        clearInterval(monitorInterval);
        this.completeSwarm(context);
      }
    }, 5000);
  }

  private updateSwarmProgress(context: SwarmExecutionContext): void {
    const tasks = Array.from(context.tasks.values());
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const failedTasks = tasks.filter((t) => t.status === 'failed').length;
    const runningTasks = tasks.filter((t) => t.status === 'running').length;

    context.objective.progress = {
      totalTasks,
      completedTasks,
      failedTasks,
      runningTasks,
      percentComplete: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      estimatedCompletion: new Date(Date.now() + 3600000),
      timeRemaining: 3600000,
      averageQuality: 0.85,
      activeAgents: Array.from(context.agents.values()).filter((a) => a.status === 'busy').length,
      idleAgents: Array.from(context.agents.values()).filter((a) => a.status === 'idle').length,
      resourceUtilization: {},
    };
  }

  private isSwarmComplete(context: SwarmExecutionContext): boolean {
    const tasks = Array.from(context.tasks.values());
    return tasks.every((task) => task.status === 'completed' || task.status === 'failed');
  }

  private completeSwarm(context: SwarmExecutionContext): void {
    context.objective.status = 'completed';
    context.objective.completedAt = new Date();
    context.endTime = new Date();

    const results: SwarmResults = {
      outputs: {},
      artifacts: {},
      reports: {},
      overallQuality: 0.85,
      totalExecutionTime: context.endTime.getTime() - context.startTime.getTime(),
      resourcesUsed: {},
      efficiency: 0.8,
      objectivesMet: [],
      objectivesFailed: [],
      improvements: [],
      nextActions: [],
    };

    context.objective.results = results;

    this.emit('swarm:completed', { swarmId: context.swarmId, results });
    console.log(`[SwarmCoordinator] Swarm completed: ${context.swarmId}`);
  }

  private terminateAgent(agentId: AgentId): void {
    console.log(`[SwarmCoordinator] Terminating agent: ${agentId.id}`);
  }

  private getRequiredAgentTypes(strategy: SwarmObjective['strategy']): AgentType[] {
    switch (strategy) {
      case 'research':
        return ['researcher', 'analyst', 'documenter'];
      case 'development':
        return ['architect', 'coder', 'tester', 'reviewer'];
      case 'analysis':
        return ['analyst', 'researcher', 'documenter'];
      default:
        return ['coordinator', 'researcher', 'coder'];
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.getHealth();
      if (health.issues.length > 0) {
        this.emit('health:warning', health);
      }
    }, 60000); // Every minute
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.updateGlobalMetrics();
    }, 10000); // Every 10 seconds
  }

  private updateGlobalMetrics(): void {
    const swarms = Array.from(this.activeSwarms.values());
    this.globalMetrics = {
      throughput: swarms.reduce((sum, ctx) => sum + ctx.objective.progress.completedTasks, 0),
      latency: 1200000,
      efficiency: 0.8,
      reliability: 0.95,
      averageQuality: 0.85,
      resourceUtilization: {},
      agentUtilization: 0.7,
      taskCompletionRate: 0.9,
      errorRate: 0.05,
    };
  }

  private initializeProgress(): SwarmProgress {
    return {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      runningTasks: 0,
      estimatedCompletion: new Date(),
      timeRemaining: 0,
      percentComplete: 0,
      averageQuality: 0,
      activeAgents: 0,
      idleAgents: 0,
      resourceUtilization: {},
    };
  }

  private initializeMetrics(): SwarmMetrics {
    return {
      throughput: 0,
      latency: 0,
      efficiency: 0,
      reliability: 1,
      averageQuality: 0,
      resourceUtilization: {},
      agentUtilization: 0,
      taskCompletionRate: 0,
      errorRate: 0,
    };
  }

  private createDefaultMetrics(): any {
    return {
      tasksCompleted: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      successRate: 1.0,
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      codeQuality: 0.8,
      testCoverage: 0,
      lastActivity: new Date(),
      responseTime: 0,
    };
  }

  private createDefaultConfig(config: Partial<SwarmConfig>): SwarmConfig {
    return {
      name: 'Swarm Coordinator',
      description: 'Multi-agent swarm orchestration',
      maxAgents: 10,
      maxTasks: 100,
      maxConcurrentTasks: 10,
      taskTimeoutMinutes: 30,
      coordinationStrategy: 'adaptive',
      autoScaling: true,
      loadBalancing: true,
      faultTolerance: true,
      ...config,
    };
  }

  private getPriorityNumber(priority: string): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'medium':
        return 2;
      case 'low':
        return 3;
      default:
        return 2;
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
