/**
 * Agent Dashboard Component
 *
 * Comprehensive dashboard for AI agent orchestration.
 * Shows agent status, execution logs, swarm coordination, task management,
 * and subscription usage/limits.
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAgentSSE } from '@/hooks/useAgentSSE';
import { useAgentStore } from '@/stores/agentStore';
import {
  SubscriptionUsageCard,
  UpgradeModal,
  ExecutionPacksModal,
} from '@/components/subscription';
import {
  Bot,
  Play,
  Square,
  RefreshCw,
  Settings,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  Users,
  Zap,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

// Agent Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    idle: { color: 'bg-gray-100 text-gray-600', icon: <Clock className="w-3 h-3" />, label: 'Idle' },
    planning: { color: 'bg-blue-100 text-blue-600', icon: <Activity className="w-3 h-3 animate-pulse" />, label: 'Planning' },
    executing: { color: 'bg-amber-100 text-amber-600', icon: <Zap className="w-3 h-3 animate-pulse" />, label: 'Executing' },
    completed: { color: 'bg-emerald-100 text-emerald-600', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Completed' },
    error: { color: 'bg-red-100 text-red-600', icon: <XCircle className="w-3 h-3" />, label: 'Error' },
    paused: { color: 'bg-purple-100 text-purple-600', icon: <Square className="w-3 h-3" />, label: 'Paused' },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Execution Log Entry Component
function LogEntry({ entry }: { entry: { id: string; timestamp: string; level: string; message: string; detail?: string } }) {
  const levelColors: Record<string, string> = {
    info: 'text-blue-500',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    error: 'text-red-500',
    system: 'text-slate-400',
  };

  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-slate-400 font-mono shrink-0">{entry.timestamp}</span>
      <span className={`text-xs font-medium ${levelColors[entry.level] || 'text-slate-500'}`}>
        [{entry.level.toUpperCase()}]
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">{entry.message}</p>
        {entry.detail && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{entry.detail}</p>
        )}
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task }: { task: { id: string; name: string; status: string; progress?: number } }) {
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200 hover:border-emerald-200 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{task.name}</span>
        <StatusBadge status={task.status} />
      </div>
      {task.progress !== undefined && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function AgentDashboard() {
  const [taskInput, setTaskInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPacksModal, setShowPacksModal] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  // Agent store state
  const { currentExecution, isExecuting, logs, connectedAgents } = useAgentStore();
  const status = currentExecution?.status || (isExecuting ? 'executing' : 'idle');
  const currentTask = currentExecution?.taskDescription;

  // SSE connection for real-time updates
  const { isConnected } = useAgentSSE();

  // Track current execution ID for cancellation
  const [currentExecutionId, setCurrentExecutionId] = useState<number | null>(null);

  // Get subscription info for tier slug
  const { data: subscriptionData } = trpc.subscription.getMySubscription.useQuery();
  const currentTierSlug = subscriptionData?.tier?.slug;

  // tRPC mutations
  const executeTask = trpc.agent.executeTask.useMutation({
    onSuccess: (data) => {
      setTaskInput('');
      setIsSubmitting(false);
      setSubscriptionError(null);
      if (data.executionId) {
        setCurrentExecutionId(data.executionId);
      }
    },
    onError: (error: any) => {
      console.error('Execution failed:', error);
      setIsSubmitting(false);

      // Check if it's a subscription limit error
      if (error.data?.code === 'FORBIDDEN') {
        setSubscriptionError(error.message);
        const cause = error.data?.cause;
        if (cause?.suggestedAction === 'upgrade') {
          setShowUpgradeModal(true);
        } else if (cause?.suggestedAction === 'buy_pack') {
          setShowPacksModal(true);
        }
      }
    },
  });

  const cancelExecution = trpc.agent.cancelExecution.useMutation({
    onSuccess: () => {
      setCurrentExecutionId(null);
    },
  });

  const handleSubmitTask = async () => {
    if (!taskInput.trim()) return;
    setSubscriptionError(null);
    setIsSubmitting(true);
    executeTask.mutate({ taskDescription: taskInput });
  };

  const handleCancelExecution = () => {
    if (currentExecutionId) {
      cancelExecution.mutate({ executionId: currentExecutionId });
    }
  };

  // Demo data for visualization
  const demoTasks = [
    { id: '1', name: 'Analyze landing page SEO', status: 'completed', progress: 100 },
    { id: '2', name: 'Update contact forms', status: 'executing', progress: 65 },
    { id: '3', name: 'Generate social media posts', status: 'pending', progress: 0 },
  ];

  const demoLogs = [
    { id: '1', timestamp: '14:32:01', level: 'info', message: 'Agent initialized', detail: 'Session ID: abc123' },
    { id: '2', timestamp: '14:32:02', level: 'system', message: 'Connected to browser', detail: 'Browserbase session active' },
    { id: '3', timestamp: '14:32:05', level: 'success', message: 'Navigation complete', detail: 'https://example.com loaded' },
    { id: '4', timestamp: '14:32:08', level: 'info', message: 'Analyzing page structure' },
    { id: '5', timestamp: '14:32:12', level: 'warning', message: 'Missing meta description detected' },
  ];

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">AI Agent Dashboard</h1>
            <p className="text-sm text-slate-500">Autonomous task execution & orchestration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{status === 'executing' ? 1 : 0}</p>
              <p className="text-xs text-slate-500">Active Tasks</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">24</p>
              <p className="text-xs text-slate-500">Completed Today</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{connectedAgents || 3}</p>
              <p className="text-xs text-slate-500">Swarm Agents</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">2.3s</p>
              <p className="text-xs text-slate-500">Avg Response</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Task Input & Current Task */}
        <div className="md:col-span-2 space-y-4">
          {/* Task Input */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              New Task
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Describe what you want the agent to do..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitTask()}
                disabled={isSubmitting || status === 'executing'}
              />
              <button
                onClick={handleSubmitTask}
                disabled={isSubmitting || status === 'executing' || !taskInput.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Execute
              </button>
            </div>

            {/* Subscription Error Alert */}
            {subscriptionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700">{subscriptionError}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setShowPacksModal(true)}
                        className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        Buy Execution Pack
                      </button>
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Upgrade Plan
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setSubscriptionError(null)}
                    className="p-1 text-red-400 hover:text-red-600 rounded"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Execution */}
          {(status === 'executing' || status === 'planning') && currentTask && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                  <h2 className="font-semibold text-purple-700">Current Execution</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelExecution}
                    disabled={!currentExecutionId}
                    className="p-2 bg-white hover:bg-red-50 text-red-600 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
                    title="Cancel Execution"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-purple-800 mb-2">{currentTask}</p>
              <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: '45%' }} />
              </div>
            </div>
          )}

          {/* Task Queue */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Task Queue
            </h2>
            <div className="space-y-2">
              {demoTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        </div>

        {/* Execution Logs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Execution Log
            </h2>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {(logs.length > 0 ? logs : demoLogs).map((entry: any) => (
              <LogEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Agent Controls + Subscription */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Agent Controls */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="font-semibold text-slate-700 mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              View All Executions
            </button>
            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              Swarm Configuration
            </button>
            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              Knowledge Base
            </button>
            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              Tool Library
            </button>
          </div>
        </div>

        {/* Subscription Usage */}
        <div>
          <SubscriptionUsageCard
            onUpgradeClick={() => setShowUpgradeModal(true)}
            onBuyPackClick={() => setShowPacksModal(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTierSlug={currentTierSlug}
      />
      <ExecutionPacksModal
        isOpen={showPacksModal}
        onClose={() => setShowPacksModal(false)}
      />
    </div>
  );
}
