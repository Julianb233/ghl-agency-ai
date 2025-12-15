/**
 * Comprehensive Agent Dashboard Component
 *
 * Comprehensive dashboard for AI agent orchestration.
 * Shows agent status, execution logs, swarm coordination, task management,
 * and subscription usage/limits.
 *
 * Features:
 * - Real-time agent status monitoring via SSE
 * - Agent metrics: completion rate, execution time, success/failure stats
 * - Recent agent executions with status indicators
 * - Quick actions: start, pause, resume, terminate agents
 * - Swarm coordination status for multi-agent scenarios
 * - Subscription usage tracking and upgrade prompts
 * - Production-ready with TypeScript and shadcn/ui components
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAgentSSE } from '@/hooks/useAgentSSE';
import { useAgentStore, type AgentStatus } from '@/stores/agentStore';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  SubscriptionUsageCard,
  UpgradeModal,
  ExecutionPacksModal,
} from '@/components/subscription';
import {
  Bot,
  Play,
  Square,
  Pause,
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
  TrendingUp,
  AlertCircle,
  BarChart3,
  Brain,
  Wrench,
  ArrowRight,
  Circle,
} from 'lucide-react';

// Types
interface AgentMetrics {
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  completionRate: number;
  activeAgents: number;
}

interface RecentExecution {
  id: string;
  task: string;
  status: AgentStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
}

// Status Badge Component
function StatusBadge({ status }: { status: AgentStatus }) {
  const statusConfig: Record<
    AgentStatus,
    { color: string; icon: React.ReactNode; label: string }
  > = {
    idle: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: <Circle className="w-3 h-3" />,
      label: 'Idle',
    },
    planning: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: <Brain className="w-3 h-3 animate-pulse" />,
      label: 'Planning',
    },
    executing: {
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: 'Executing',
    },
    completed: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: 'Completed',
    },
    error: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: <XCircle className="w-3 h-3" />,
      label: 'Error',
    },
    paused: {
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: <Pause className="w-3 h-3" />,
      label: 'Paused',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 ${config.color}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

// Metrics Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'purple',
  trend,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color?: 'purple' | 'emerald' | 'blue' | 'amber' | 'red';
  trend?: number;
}) {
  const colorClasses = {
    purple: 'bg-purple-100 text-purple-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-4 flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3 text-emerald-600" />
            <span className="font-medium text-emerald-600">
              {trend > 0 ? '+' : ''}
              {trend}%
            </span>
            <span className="text-muted-foreground">from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Execution Item Component
function ExecutionItem({ execution }: { execution: RecentExecution }) {
  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50">
      <div className="mt-1">
        <StatusBadge status={execution.status} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {execution.task}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(execution.startedAt)}
          </span>
          {execution.duration && (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {formatDuration(execution.duration)}
            </span>
          )}
        </div>
        {execution.error && (
          <p className="mt-2 text-xs text-red-600 line-clamp-1">
            Error: {execution.error}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Log Entry Component
function LogEntry({ entry }: { entry: { id: string; timestamp: string; level: string; message: string; detail?: string } }) {
  const levelConfig = {
    info: { color: 'text-blue-600', icon: <Activity className="h-3 w-3" /> },
    success: { color: 'text-emerald-600', icon: <CheckCircle2 className="h-3 w-3" /> },
    warning: { color: 'text-amber-600', icon: <AlertCircle className="h-3 w-3" /> },
    error: { color: 'text-red-600', icon: <XCircle className="h-3 w-3" /> },
    system: { color: 'text-gray-600', icon: <Terminal className="h-3 w-3" /> },
  };

  const config = levelConfig[entry.level as keyof typeof levelConfig] || levelConfig.info;

  return (
    <div className="flex gap-2 py-2 text-sm border-b border-gray-100 last:border-0">
      <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
        {entry.timestamp}
      </span>
      <div className={`shrink-0 mt-1 ${config.color}`}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{entry.message}</p>
        {entry.detail && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {entry.detail}
          </p>
        )}
      </div>
    </div>
  );
}

// Main Dashboard Component
export function AgentDashboard() {
  const [taskInput, setTaskInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPacksModal, setShowPacksModal] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);

  // Agent store state
  const { currentExecution, isExecuting, logs, connectedAgents, setStatus } = useAgentStore();
  const status = currentExecution?.status || (isExecuting ? 'executing' : 'idle');
  const currentTask = currentExecution?.taskDescription;

  // SSE connection for real-time updates
  const { isConnected, connect, disconnect } = useAgentSSE({ autoConnect: true });

  // Get subscription info for tier slug
  const { data: subscriptionData } = trpc.subscription.getMySubscription.useQuery();
  const currentTierSlug = subscriptionData?.tier?.slug;

  // Calculate metrics from logs and executions
  const metrics = useMemo<AgentMetrics>(() => {
    const completed = recentExecutions.filter((e) => e.status === 'completed').length;
    const failed = recentExecutions.filter((e) => e.status === 'error').length;
    const total = recentExecutions.length;
    const avgTime =
      recentExecutions
        .filter((e) => e.duration)
        .reduce((acc, e) => acc + (e.duration || 0), 0) /
      (recentExecutions.filter((e) => e.duration).length || 1);

    return {
      totalExecutions: total,
      completedExecutions: completed,
      failedExecutions: failed,
      averageExecutionTime: avgTime,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      activeAgents: connectedAgents,
    };
  }, [recentExecutions, connectedAgents]);

  // tRPC mutations
  const executeTask = trpc.agent.executeTask.useMutation({
    onSuccess: (data) => {
      setTaskInput('');
      setIsSubmitting(false);
      setSubscriptionError(null);
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

  // Demo data for recent executions
  useEffect(() => {
    // In production, this would fetch from API
    const demoExecutions: RecentExecution[] = [
      {
        id: '1',
        task: 'Analyze landing page performance and SEO metrics',
        status: 'completed',
        startedAt: new Date(Date.now() - 300000),
        completedAt: new Date(Date.now() - 240000),
        duration: 60000,
      },
      {
        id: '2',
        task: 'Generate social media content for product launch',
        status: 'completed',
        startedAt: new Date(Date.now() - 600000),
        completedAt: new Date(Date.now() - 480000),
        duration: 120000,
      },
      {
        id: '3',
        task: 'Update contact form validation logic',
        status: 'error',
        startedAt: new Date(Date.now() - 900000),
        duration: 45000,
        error: 'Form element not found on page',
      },
      {
        id: '4',
        task: 'Create A/B test variants for pricing page',
        status: 'completed',
        startedAt: new Date(Date.now() - 1200000),
        completedAt: new Date(Date.now() - 1080000),
        duration: 120000,
      },
      {
        id: '5',
        task: 'Monitor competitor pricing changes',
        status: 'completed',
        startedAt: new Date(Date.now() - 1500000),
        completedAt: new Date(Date.now() - 1380000),
        duration: 120000,
      },
    ];

    // Add current task if executing
    if (currentTask && (status === 'executing' || status === 'planning')) {
      demoExecutions.unshift({
        id: 'current',
        task: currentTask,
        status,
        startedAt: new Date(),
      });
    }

    setRecentExecutions(demoExecutions);
  }, [currentTask, status]);

  // Handle task submission
  const handleSubmitTask = async () => {
    if (!taskInput.trim() || isSubmitting) return;
    setSubscriptionError(null);
    setIsSubmitting(true);
    executeTask.mutate({ taskDescription: taskInput });
  };

  // Handle pause/resume
  const handlePauseResume = () => {
    if (status === 'executing') {
      setStatus('paused');
    } else if (status === 'paused') {
      setStatus('executing');
    }
  };

  // Handle terminate
  const handleTerminate = () => {
    if (confirm('Are you sure you want to terminate the current execution?')) {
      setStatus('cancelled');
    }
  };

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/20">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Agent Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Monitor and control AI agent execution
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${
                isConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <span
                className={`mr-1.5 h-2 w-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Subscription Error Alert */}
        {subscriptionError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">{subscriptionError}</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPacksModal(true)}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Buy Execution Pack
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Upgrade Plan
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSubscriptionError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Active Tasks"
            value={status === 'executing' || status === 'planning' ? 1 : 0}
            subtitle="Currently running"
            icon={Activity}
            color="purple"
          />
          <MetricCard
            title="Completion Rate"
            value={`${metrics.completionRate.toFixed(1)}%`}
            subtitle={`${metrics.completedExecutions}/${metrics.totalExecutions} completed`}
            icon={CheckCircle2}
            color="emerald"
            trend={12}
          />
          <MetricCard
            title="Avg Response Time"
            value={formatDuration(metrics.averageExecutionTime)}
            subtitle="Per execution"
            icon={Clock}
            color="blue"
            trend={-8}
          />
          <MetricCard
            title="Swarm Agents"
            value={connectedAgents || 0}
            subtitle="Connected agents"
            icon={Users}
            color="amber"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Task Control & Executions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Input Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  New Task
                </CardTitle>
                <CardDescription>
                  Describe what you want the agent to accomplish
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Create a landing page for a SaaS product..."
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitTask()}
                    disabled={isSubmitting || status === 'executing'}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSubmitTask}
                    disabled={
                      isSubmitting ||
                      !taskInput.trim() ||
                      status === 'executing' ||
                      status === 'planning'
                    }
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span className="ml-2">Execute</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Execution Card */}
            {(status === 'executing' || status === 'planning' || status === 'paused') &&
              currentTask && (
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-purple-700">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Current Execution
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePauseResume}
                          className="border-purple-200"
                        >
                          {status === 'paused' ? (
                            <>
                              <Play className="h-4 w-4" />
                              <span className="ml-2">Resume</span>
                            </>
                          ) : (
                            <>
                              <Pause className="h-4 w-4" />
                              <span className="ml-2">Pause</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTerminate}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Square className="h-4 w-4" />
                          <span className="ml-2">Terminate</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-purple-800 mb-3">{currentTask}</p>
                    <StatusBadge status={status} />
                    <Progress value={45} className="mt-3" />
                  </CardContent>
                </Card>
              )}

            {/* Recent Executions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Recent Executions
                    </CardTitle>
                    <CardDescription>
                      Last {recentExecutions.length} agent tasks
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {recentExecutions.map((execution) => (
                      <ExecutionItem key={execution.id} execution={execution} />
                    ))}
                    {recentExecutions.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Brain className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          No executions yet
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Start a new task to see it here
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Logs, Subscription & Controls */}
          <div className="space-y-6">
            {/* Subscription Usage */}
            <SubscriptionUsageCard
              onUpgradeClick={() => setShowUpgradeModal(true)}
              onBuyPackClick={() => setShowPacksModal(true)}
            />

            {/* Execution Logs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Execution Log
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Real-time execution events</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1">
                    {logs.length > 0 ? (
                      logs.map((entry) => <LogEntry key={entry.id} entry={entry} />)
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Terminal className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          No logs yet
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Logs will appear when you start a task
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="mr-2 h-4 w-4" />
                  View All Executions
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Swarm Configuration
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Wrench className="mr-2 h-4 w-4" />
                  Tool Library
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Agent Settings
                </Button>
              </CardContent>
            </Card>
          </div>
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
