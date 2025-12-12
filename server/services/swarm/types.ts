/**
 * Swarm Coordinator Types for GHL Agency AI
 * Adapted from claude-flow-foundation swarm system
 */

// Core Swarm IDs
export interface SwarmId {
  id: string;
  timestamp: number;
  namespace: string;
}

export interface AgentId {
  id: string;
  swarmId: string;
  type: AgentType;
  instance: number;
}

export interface TaskId {
  id: string;
  swarmId: string;
  sequence: number;
  priority: number;
}

// Agent Types - 64 specialized types from claude-flow
export type AgentType =
  // Core Development
  | 'coordinator'
  | 'researcher'
  | 'coder'
  | 'analyst'
  | 'architect'
  | 'tester'
  | 'reviewer'
  | 'optimizer'
  | 'documenter'
  | 'monitor'
  | 'specialist'
  // System Architecture
  | 'design-architect'
  | 'system-architect'
  | 'task-planner'
  | 'developer'
  | 'requirements-engineer'
  | 'steering-author'
  // Backend Development
  | 'backend-dev'
  | 'api-designer'
  | 'database-architect'
  | 'microservices-engineer'
  // Frontend Development
  | 'frontend-dev'
  | 'ui-designer'
  | 'mobile-dev'
  // DevOps & Infrastructure
  | 'cicd-engineer'
  | 'cloud-architect'
  | 'security-engineer'
  | 'performance-engineer'
  // Data & AI
  | 'data-scientist'
  | 'ml-engineer'
  | 'data-engineer'
  | 'analytics-engineer'
  // Quality Assurance
  | 'qa-engineer'
  | 'test-automation-engineer'
  | 'security-tester'
  // Project Management
  | 'project-manager'
  | 'product-owner'
  | 'scrum-master'
  // Business & Strategy
  | 'business-analyst'
  | 'technical-writer'
  | 'seo-specialist'
  | 'marketing-specialist';

export type AgentStatus =
  | 'initializing'
  | 'idle'
  | 'busy'
  | 'paused'
  | 'error'
  | 'offline'
  | 'terminating'
  | 'terminated';

export type TaskType =
  | 'research'
  | 'analysis'
  | 'coding'
  | 'testing'
  | 'review'
  | 'documentation'
  | 'deployment'
  | 'monitoring'
  | 'coordination'
  | 'optimization'
  | 'integration'
  | 'custom';

export type TaskStatus =
  | 'created'
  | 'queued'
  | 'assigned'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout'
  | 'retrying'
  | 'blocked';

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

// Swarm Configuration
export interface SwarmConfig {
  name: string;
  description?: string;
  maxAgents: number;
  maxTasks: number;
  maxConcurrentTasks: number;
  taskTimeoutMinutes: number;
  coordinationStrategy: 'hierarchical' | 'mesh' | 'adaptive' | 'hybrid';
  autoScaling: boolean;
  loadBalancing: boolean;
  faultTolerance: boolean;
}

// Agent Capabilities
export interface AgentCapabilities {
  codeGeneration: boolean;
  codeReview: boolean;
  testing: boolean;
  documentation: boolean;
  research: boolean;
  analysis: boolean;
  webSearch: boolean;
  apiIntegration: boolean;
  fileSystem: boolean;
  terminalAccess: boolean;
  languages: string[];
  frameworks: string[];
  domains: string[];
  tools: string[];
  maxConcurrentTasks: number;
  maxMemoryUsage: number;
  maxExecutionTime: number;
  reliability: number;
  speed: number;
  quality: number;
}

// Agent Metrics
export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  averageExecutionTime: number;
  successRate: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  codeQuality: number;
  testCoverage: number;
  lastActivity: Date;
  responseTime: number;
}

// Agent State
export interface AgentState {
  id: AgentId;
  name: string;
  type: AgentType;
  status: AgentStatus;
  capabilities: AgentCapabilities;
  metrics: AgentMetrics;
  currentTask?: TaskId;
  workload: number;
  health: number;
  lastHeartbeat: Date;
  errorHistory: AgentError[];
  taskHistory: TaskId[];
}

export interface AgentError {
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

// Task Definition
export interface TaskDefinition {
  id: TaskId;
  type: TaskType;
  name: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  requirements: TaskRequirements;
  constraints: TaskConstraints;
  input: Record<string, any>;
  output?: Record<string, any>;
  assignedAgent?: AgentId;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxRetries: number;
  error?: string;
}

export interface TaskRequirements {
  agentType?: AgentType;
  capabilities: string[];
  tools: string[];
  permissions: string[];
  estimatedDuration?: number;
  maxDuration?: number;
  memoryRequired?: number;
}

export interface TaskConstraints {
  dependencies: TaskId[];
  maxRetries: number;
  timeoutAfter: number;
  requiredApprovals?: string[];
}

// Task Result
export interface TaskResult {
  taskId: TaskId;
  status: TaskStatus;
  output: Record<string, any>;
  artifacts?: Record<string, any>;
  executionTime: number;
  resourcesUsed: {
    cpu: number;
    memory: number;
    disk: number;
  };
  quality: number;
  error?: string;
}

// Swarm Objective
export interface SwarmObjective {
  id: string;
  name: string;
  description: string;
  strategy: 'research' | 'development' | 'analysis' | 'deployment' | 'auto';
  requirements: {
    minAgents: number;
    maxAgents: number;
    agentTypes: AgentType[];
    estimatedDuration: number;
    maxDuration: number;
    qualityThreshold: number;
  };
  constraints: {
    maxCost?: number;
    deadline?: Date;
    requiredApprovals: string[];
    allowedFailures: number;
  };
  status: 'planning' | 'initializing' | 'executing' | 'completed' | 'failed' | 'cancelled';
  progress: SwarmProgress;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results?: SwarmResults;
}

export interface SwarmProgress {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
  percentComplete: number;
  estimatedCompletion: Date;
  timeRemaining: number;
  averageQuality: number;
  activeAgents: number;
  idleAgents: number;
  resourceUtilization: Record<string, number>;
}

export interface SwarmResults {
  outputs: Record<string, any>;
  artifacts: Record<string, any>;
  reports: Record<string, any>;
  overallQuality: number;
  totalExecutionTime: number;
  resourcesUsed: Record<string, number>;
  efficiency: number;
  objectivesMet: any[];
  objectivesFailed: any[];
  improvements: string[];
  nextActions: string[];
}

// Swarm Events
export type SwarmEventType =
  | 'swarm:created'
  | 'swarm:started'
  | 'swarm:completed'
  | 'swarm:failed'
  | 'swarm:cancelled'
  | 'agent:spawned'
  | 'agent:terminated'
  | 'agent:error'
  | 'task:created'
  | 'task:assigned'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'task:retry';

export interface SwarmEvent {
  type: SwarmEventType;
  timestamp: Date;
  swarmId: string;
  agentId?: string;
  taskId?: string;
  data: Record<string, any>;
}

// Coordination Strategies
export interface CoordinationStrategy {
  name: string;
  description: string;
  agentSelection: 'round-robin' | 'least-loaded' | 'capability-based' | 'random';
  taskScheduling: 'priority' | 'fifo' | 'deadline' | 'adaptive';
  loadBalancing: 'static' | 'dynamic' | 'work-stealing';
  faultTolerance: 'retry' | 'failover' | 'redundancy';
  communication: 'direct' | 'queue-based' | 'event-driven';
}

// Health Monitoring
export interface SwarmHealth {
  overall: number;
  agents: {
    healthy: number;
    unhealthy: number;
    offline: number;
  };
  tasks: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
  lastCheck: Date;
  issues: HealthIssue[];
}

export interface HealthIssue {
  type: 'agent' | 'task' | 'resource' | 'communication';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  affectedComponents: string[];
  recommendedAction?: string;
}

// Swarm Metrics
export interface SwarmMetrics {
  throughput: number;
  latency: number;
  efficiency: number;
  reliability: number;
  averageQuality: number;
  resourceUtilization: Record<string, number>;
  agentUtilization: number;
  taskCompletionRate: number;
  errorRate: number;
}
