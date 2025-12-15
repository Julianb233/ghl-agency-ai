// Agent execution and thinking types

export interface AgentExecution {
  id: string;
  task: string;
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'cancelled';
  plan?: AgentPlan;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    duration?: number;
  };
}

export interface AgentPlan {
  id: string;
  name?: string;
  phases: AgentPhase[];
  currentPhase?: number;
  currentPhaseId?: number;
  estimatedDuration?: string;
}

export interface AgentPhase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  steps?: string[];
  progress?: number;
  duration?: number;
  successCriteria?: string[];
}

export interface ThinkingStep {
  id: string;
  type: 'thinking' | 'tool_use' | 'tool_result' | 'plan' | 'message' | 'error';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolParams?: any;
  toolResult?: any;
  metadata?: {
    duration?: number;
    error?: string;
  };
}

export interface AgentExecutionListItem {
  id: string;
  task: string;
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  duration?: number;
}
