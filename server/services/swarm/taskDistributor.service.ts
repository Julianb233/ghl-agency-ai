/**
 * Task Distributor Service
 * Handles intelligent task assignment and load balancing across agents
 */

import { EventEmitter } from 'events';
import type {
  TaskDefinition,
  AgentState,
  AgentType,
  TaskId,
  TaskResult,
  TaskStatus,
} from './types';
import { getAgentTypeDefinition } from './agentTypes';

export interface TaskAssignment {
  taskId: string;
  agentId: string;
  assignedAt: Date;
  priority: number;
  estimatedDuration: number;
}

export interface DistributionStrategy {
  name: string;
  selectAgent: (task: TaskDefinition, availableAgents: AgentState[]) => AgentState | null;
}

/**
 * Task Distributor
 * Intelligently assigns tasks to agents based on capabilities, workload, and priority
 */
export class TaskDistributor extends EventEmitter {
  private assignments: Map<string, TaskAssignment> = new Map();
  private taskQueue: TaskDefinition[] = [];
  private strategy: DistributionStrategy;

  constructor(strategyName: 'capability-based' | 'least-loaded' | 'round-robin' = 'capability-based') {
    super();
    this.strategy = this.getStrategy(strategyName);
  }

  /**
   * Add task to distribution queue
   */
  async queueTask(task: TaskDefinition): Promise<void> {
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => {
      // Sort by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.id.priority - b.id.priority;
      }
      // Then by creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    this.emit('task:queued', { taskId: task.id.id, priority: task.priority });
    console.log(`[TaskDistributor] Queued task: ${task.id.id}`, {
      priority: task.priority,
      queueLength: this.taskQueue.length,
    });
  }

  /**
   * Assign task to most suitable agent
   */
  async assignTask(task: TaskDefinition, availableAgents: AgentState[]): Promise<AgentState | null> {
    // Filter agents by capability requirements
    const capableAgents = this.filterCapableAgents(task, availableAgents);

    if (capableAgents.length === 0) {
      console.warn(`[TaskDistributor] No capable agents for task: ${task.id.id}`);
      return null;
    }

    // Select best agent using strategy
    const selectedAgent = this.strategy.selectAgent(task, capableAgents);

    if (!selectedAgent) {
      console.warn(`[TaskDistributor] Strategy failed to select agent for task: ${task.id.id}`);
      return null;
    }

    // Create assignment
    const assignment: TaskAssignment = {
      taskId: task.id.id,
      agentId: selectedAgent.id.id,
      assignedAt: new Date(),
      priority: task.id.priority,
      estimatedDuration: task.requirements.estimatedDuration || 0,
    };

    this.assignments.set(task.id.id, assignment);

    // Update task and agent state
    task.status = 'assigned';
    task.assignedAgent = selectedAgent.id;
    selectedAgent.workload = Math.min(1.0, selectedAgent.workload + 0.2);
    selectedAgent.status = 'busy';

    this.emit('task:assigned', {
      taskId: task.id.id,
      agentId: selectedAgent.id.id,
      agentName: selectedAgent.name,
    });

    console.log(`[TaskDistributor] Assigned task ${task.id.id} to agent ${selectedAgent.name}`);

    return selectedAgent;
  }

  /**
   * Distribute queued tasks to available agents
   */
  async distributeTasks(availableAgents: AgentState[]): Promise<number> {
    let assignedCount = 0;

    while (this.taskQueue.length > 0 && this.hasAvailableAgents(availableAgents)) {
      const task = this.taskQueue.shift();
      if (!task) break;

      const agent = await this.assignTask(task, availableAgents);
      if (agent) {
        assignedCount++;
      } else {
        // Put task back in queue if assignment failed
        this.taskQueue.unshift(task);
        break;
      }
    }

    return assignedCount;
  }

  /**
   * Complete a task assignment
   */
  async completeTask(taskId: string, result: TaskResult): Promise<void> {
    const assignment = this.assignments.get(taskId);
    if (!assignment) {
      console.warn(`[TaskDistributor] No assignment found for task: ${taskId}`);
      return;
    }

    this.assignments.delete(taskId);

    this.emit('task:completed', {
      taskId,
      agentId: assignment.agentId,
      duration: Date.now() - assignment.assignedAt.getTime(),
      result,
    });

    console.log(`[TaskDistributor] Task completed: ${taskId}`);
  }

  /**
   * Fail a task assignment
   */
  async failTask(taskId: string, error: string, retry: boolean = true): Promise<void> {
    const assignment = this.assignments.get(taskId);
    if (!assignment) {
      console.warn(`[TaskDistributor] No assignment found for task: ${taskId}`);
      return;
    }

    this.assignments.delete(taskId);

    this.emit('task:failed', {
      taskId,
      agentId: assignment.agentId,
      error,
      willRetry: retry,
    });

    console.log(`[TaskDistributor] Task failed: ${taskId}`, { error, retry });
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    activeAssignments: number;
    tasksByPriority: Record<string, number>;
  } {
    const tasksByPriority: Record<string, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
      background: 0,
    };

    for (const task of this.taskQueue) {
      tasksByPriority[task.priority] = (tasksByPriority[task.priority] || 0) + 1;
    }

    return {
      queueLength: this.taskQueue.length,
      activeAssignments: this.assignments.size,
      tasksByPriority,
    };
  }

  /**
   * Get task assignment
   */
  getAssignment(taskId: string): TaskAssignment | null {
    return this.assignments.get(taskId) || null;
  }

  /**
   * Get all assignments for an agent
   */
  getAgentAssignments(agentId: string): TaskAssignment[] {
    return Array.from(this.assignments.values()).filter((a) => a.agentId === agentId);
  }

  // Private methods

  private filterCapableAgents(task: TaskDefinition, agents: AgentState[]): AgentState[] {
    return agents.filter((agent) => {
      // Check if agent is available
      if (agent.status !== 'idle' && agent.status !== 'busy') {
        return false;
      }

      // Check workload capacity
      if (agent.workload >= 0.9) {
        return false;
      }

      // Check concurrent task limit
      if (agent.capabilities.maxConcurrentTasks <= 0) {
        return false;
      }

      // Check capability requirements
      const requiredCapabilities = task.requirements.capabilities;
      const agentCapabilities = [
        ...agent.capabilities.languages,
        ...agent.capabilities.frameworks,
        ...agent.capabilities.domains,
        ...agent.capabilities.tools,
      ];

      // Check if agent has required capabilities
      const hasCapabilities = requiredCapabilities.every((required) =>
        agentCapabilities.some((cap) => cap.toLowerCase().includes(required.toLowerCase()))
      );

      if (!hasCapabilities) {
        return false;
      }

      // Check agent type if specified
      if (task.requirements.agentType && task.requirements.agentType !== agent.type) {
        return false;
      }

      return true;
    });
  }

  private hasAvailableAgents(agents: AgentState[]): boolean {
    return agents.some(
      (agent) =>
        (agent.status === 'idle' || agent.status === 'busy') &&
        agent.workload < 0.9 &&
        agent.capabilities.maxConcurrentTasks > 0
    );
  }

  private getStrategy(strategyName: string): DistributionStrategy {
    const strategies: Record<string, DistributionStrategy> = {
      'capability-based': {
        name: 'Capability-Based',
        selectAgent: (task, agents) => {
          // Score agents by capability match and availability
          const scored = agents.map((agent) => ({
            agent,
            score: this.scoreAgent(agent, task),
          }));

          scored.sort((a, b) => b.score - a.score);
          return scored[0]?.agent || null;
        },
      },

      'least-loaded': {
        name: 'Least Loaded',
        selectAgent: (task, agents) => {
          // Select agent with lowest workload
          let best = agents[0];
          for (const agent of agents) {
            if (agent.workload < best.workload) {
              best = agent;
            }
          }
          return best;
        },
      },

      'round-robin': {
        name: 'Round Robin',
        selectAgent: (task, agents) => {
          // Simple round-robin selection
          const index = this.assignments.size % agents.length;
          return agents[index] || agents[0];
        },
      },
    };

    return strategies[strategyName] || strategies['capability-based'];
  }

  private scoreAgent(agent: AgentState, task: TaskDefinition): number {
    let score = 0;

    // Health score (0-30 points)
    score += agent.health * 30;

    // Success rate score (0-25 points)
    score += agent.metrics.successRate * 25;

    // Availability score (0-20 points)
    const availability = 1 - agent.workload;
    score += availability * 20;

    // Quality score (0-15 points)
    score += agent.capabilities.quality * 15;

    // Reliability score (0-10 points)
    score += agent.capabilities.reliability * 10;

    return score;
  }
}
