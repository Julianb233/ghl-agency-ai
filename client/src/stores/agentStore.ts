/**
 * Agent Store
 *
 * Zustand store for managing agent state across the application.
 * Handles execution status, logs, and connected agents.
 */

import { create } from 'zustand';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'system';
  message: string;
  detail?: string;
}

export type AgentStatus = 'idle' | 'planning' | 'executing' | 'completed' | 'error' | 'paused';

interface AgentState {
  // Status
  status: AgentStatus;
  currentTask: string | null;

  // Logs
  logs: LogEntry[];

  // Swarm
  connectedAgents: number;

  // Actions
  setStatus: (status: AgentStatus) => void;
  setCurrentTask: (task: string | null) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  setConnectedAgents: (count: number) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as AgentStatus,
  currentTask: null,
  logs: [],
  connectedAgents: 0,
};

export const useAgentStore = create<AgentState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setCurrentTask: (task) => set({ currentTask: task }),

  addLog: (log) =>
    set((state) => ({
      logs: [...state.logs, log].slice(-100), // Keep last 100 logs
    })),

  clearLogs: () => set({ logs: [] }),

  setConnectedAgents: (count) => set({ connectedAgents: count }),

  reset: () => set(initialState),
}));
