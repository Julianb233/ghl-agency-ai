/**
 * SwarmView Component
 *
 * Real-time swarm coordination visualization and control panel
 * Features:
 * - Visual representation of swarm agents (queen + workers)
 * - Real-time task distribution visualization
 * - Agent status indicators and health metrics
 * - Task queue display with priority levels
 * - Communication flow visualization between agents
 * - Metrics: tasks completed, failures, average execution time
 * - Controls: pause swarm, redistribute tasks, add/remove workers
 */

import * as React from 'react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  StopCircle,
  TrendingUp,
  Users,
  XCircle,
  Zap,
  Network,
  BarChart3,
} from 'lucide-react';

// Types from server
type AgentStatus = 'initializing' | 'idle' | 'busy' | 'paused' | 'error' | 'offline' | 'terminating' | 'terminated';
type TaskStatus = 'created' | 'queued' | 'assigned' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'retrying' | 'blocked';
type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

interface SwarmViewProps {
  swarmId?: string;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function SwarmView({
  swarmId,
  className,
  autoRefresh = true,
  refreshInterval = 2000,
}: SwarmViewProps) {
  const [selectedSwarmId, setSelectedSwarmId] = React.useState<string | undefined>(swarmId);
  const [isPaused, setIsPaused] = React.useState(false);

  // tRPC queries
  const { data: activeSwarms, refetch: refetchSwarms } = trpc.swarm.listActive.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const { data: swarmStatus, refetch: refetchStatus } = trpc.swarm.getStatus.useQuery(
    { swarmId: selectedSwarmId || '' },
    {
      enabled: !!selectedSwarmId,
      refetchInterval: autoRefresh && !isPaused ? refreshInterval : false,
    }
  );

  const { data: healthData } = trpc.swarm.getHealth.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const { data: metricsData } = trpc.swarm.getMetrics.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const { data: queueData } = trpc.swarm.getQueueStatus.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Mutations
  const stopSwarm = trpc.swarm.stop.useMutation({
    onSuccess: () => {
      refetchSwarms();
      refetchStatus();
    },
  });

  const startSwarm = trpc.swarm.start.useMutation({
    onSuccess: () => {
      refetchSwarms();
      refetchStatus();
    },
  });

  // Auto-select first swarm if none selected
  React.useEffect(() => {
    if (!selectedSwarmId && activeSwarms?.swarms && activeSwarms.swarms.length > 0) {
      setSelectedSwarmId(activeSwarms.swarms[0].id);
    }
  }, [activeSwarms, selectedSwarmId]);

  const swarm = swarmStatus?.swarm;
  const agents = swarm?.agents || [];
  const tasks = swarm?.tasks || [];
  const metrics = swarm?.metrics || metricsData?.metrics;
  const health = healthData?.health;

  // Calculate statistics
  const agentsByStatus = React.useMemo(() => {
    const counts: Record<AgentStatus, number> = {
      initializing: 0,
      idle: 0,
      busy: 0,
      paused: 0,
      error: 0,
      offline: 0,
      terminating: 0,
      terminated: 0,
    };
    agents.forEach((agent: any) => {
      counts[agent.status as AgentStatus] = (counts[agent.status as AgentStatus] || 0) + 1;
    });
    return counts;
  }, [agents]);

  const tasksByStatus = React.useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      created: 0,
      queued: 0,
      assigned: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      timeout: 0,
      retrying: 0,
      blocked: 0,
    };
    tasks.forEach((task: any) => {
      counts[task.status as TaskStatus] = (counts[task.status as TaskStatus] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  const tasksByPriority = React.useMemo(() => {
    const counts: Record<TaskPriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
      background: 0,
    };
    tasks.forEach((task: any) => {
      counts[task.priority as TaskPriority] = (counts[task.priority as TaskPriority] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  const handleStopSwarm = () => {
    if (selectedSwarmId) {
      stopSwarm.mutate({ swarmId: selectedSwarmId, reason: 'User requested stop' });
    }
  };

  const handleStartSwarm = () => {
    if (selectedSwarmId) {
      startSwarm.mutate({ swarmId: selectedSwarmId });
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  if (!activeSwarms?.swarms || activeSwarms.swarms.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-12', className)}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Network className="h-16 w-16 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">No Active Swarms</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Create a swarm to start coordinating agents
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6', className)}>
      {/* Header with Swarm Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Swarm Coordination</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 truncate">
            Monitor and control your multi-agent swarms in real-time
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              refetchSwarms();
              refetchStatus();
            }}
            aria-label="Refresh data"
            className="min-h-[44px] min-w-[44px]"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Swarm Selector */}
      {activeSwarms.swarms.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
          {activeSwarms.swarms.map((s: any) => (
            <Button
              key={s.id}
              variant={selectedSwarmId === s.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSwarmId(s.id)}
              className="whitespace-nowrap min-h-[44px] shrink-0"
            >
              {s.name}
              <Badge variant="secondary" className="ml-2">
                {s.agentCount} agents
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left Column - Overview & Controls */}
        <div className="space-y-6 lg:col-span-2">
          {/* Swarm Overview Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    {swarm?.name || 'Swarm Overview'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Status: {swarm?.status || 'Unknown'}
                  </CardDescription>
                </div>
                <StatusBadge status={swarm?.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {swarm?.progress?.percentComplete?.toFixed(1) || 0}%
                  </span>
                </div>
                <Progress value={swarm?.progress?.percentComplete || 0} />
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <MetricCard
                  icon={Users}
                  label="Active Agents"
                  value={agentsByStatus.busy + agentsByStatus.idle}
                  total={agents.length}
                  variant="default"
                />
                <MetricCard
                  icon={Activity}
                  label="Running Tasks"
                  value={tasksByStatus.running}
                  total={tasks.length}
                  variant="info"
                />
                <MetricCard
                  icon={CheckCircle2}
                  label="Completed"
                  value={tasksByStatus.completed}
                  variant="success"
                />
                <MetricCard
                  icon={XCircle}
                  label="Failed"
                  value={tasksByStatus.failed}
                  variant={tasksByStatus.failed > 0 ? 'destructive' : 'default'}
                />
              </div>

              {/* Control Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {swarm?.status === 'executing' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePauseResume}
                      disabled={stopSwarm.isPending}
                      className="min-h-[44px]"
                    >
                      {isPaused ? (
                        <>
                          <Play className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">Resume Monitoring</span>
                          <span className="ml-2 sm:hidden">Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">Pause Monitoring</span>
                          <span className="ml-2 sm:hidden">Pause</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopSwarm}
                      isLoading={stopSwarm.isPending}
                      loadingText="Stopping..."
                      className="min-h-[44px]"
                    >
                      <StopCircle className="h-4 w-4" />
                      <span className="ml-2">Stop Swarm</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleStartSwarm}
                    isLoading={startSwarm.isPending}
                    loadingText="Starting..."
                    className="min-h-[44px]"
                  >
                    <Play className="h-4 w-4" />
                    <span className="ml-2">Start Swarm</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" className="min-h-[44px]">
                  <Plus className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Add Agent</span>
                  <span className="ml-2 sm:hidden">Add</span>
                </Button>
                <Button variant="outline" size="sm" className="min-h-[44px]">
                  <RefreshCw className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Redistribute Tasks</span>
                  <span className="ml-2 sm:hidden">Redistribute</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Agent Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agent Status
                <Badge variant="secondary">{agents.length}</Badge>
              </CardTitle>
              <CardDescription>Real-time agent health and workload</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {agents.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      No agents spawned yet
                    </div>
                  ) : (
                    agents.map((agent: any) => (
                      <AgentCard key={agent.id.id} agent={agent} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Task Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Task Queue
                <Badge variant="secondary">{tasks.length}</Badge>
              </CardTitle>
              <CardDescription>All tasks with priority levels</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Priority Summary */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-3 sm:-mx-0 px-3 sm:px-0">
                <PriorityBadge priority="critical" count={tasksByPriority.critical} />
                <PriorityBadge priority="high" count={tasksByPriority.high} />
                <PriorityBadge priority="normal" count={tasksByPriority.normal} />
                <PriorityBadge priority="low" count={tasksByPriority.low} />
                <PriorityBadge priority="background" count={tasksByPriority.background} />
              </div>

              <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4">
                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      No tasks in queue
                    </div>
                  ) : (
                    tasks.map((task: any) => <TaskCard key={task.id.id} task={task} />)
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Metrics & Health */}
        <div className="space-y-6">
          {/* Health Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <HealthMetric
                label="Overall Health"
                value={health?.overall || 0}
                icon={Zap}
              />
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Healthy Agents</span>
                  <span className="font-medium">{health?.agents.healthy || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Unhealthy Agents</span>
                  <span className="font-medium text-destructive">
                    {health?.agents.unhealthy || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Offline Agents</span>
                  <span className="font-medium text-muted-foreground">
                    {health?.agents.offline || 0}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <HealthMetric
                  label="CPU Usage"
                  value={health?.resources.cpu || 0}
                  icon={Cpu}
                  unit="%"
                />
                <HealthMetric
                  label="Memory Usage"
                  value={health?.resources.memory || 0}
                  icon={BarChart3}
                  unit="%"
                />
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Throughput</span>
                <span className="text-sm font-medium">
                  {(metrics && 'global' in metrics ? metrics.global.throughput : metrics?.throughput)?.toFixed(2) || '0.00'} tasks/min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Latency</span>
                <span className="text-sm font-medium">
                  {(metrics && 'global' in metrics ? metrics.global.latency : metrics?.latency)?.toFixed(0) || '0'}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="text-sm font-medium">
                  {((1 - ((metrics && 'global' in metrics ? metrics.global.errorRate : metrics?.errorRate) || 0)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Efficiency</span>
                <span className="text-sm font-medium">
                  {(((metrics && 'global' in metrics ? metrics.global.efficiency : metrics?.efficiency) || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Agent Utilization</span>
                <span className="text-sm font-medium">
                  {(((metrics && 'global' in metrics ? metrics.global.agentUtilization : metrics?.agentUtilization) || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Queue Status */}
          {queueData?.queue && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Queue Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total in Queue</span>
                  <Badge variant="secondary">{queueData.queue.queueLength || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="text-sm font-medium">
                    {queueData.queue.queueLength || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Processing</span>
                  <span className="text-sm font-medium">
                    {queueData.queue.activeAssignments || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Communication Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Communication Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">Queen to Worker</span>
                  <span className="text-xs text-muted-foreground ml-auto">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm">Worker to Queen</span>
                  <span className="text-xs text-muted-foreground ml-auto">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-sm">Worker to Worker</span>
                  <span className="text-xs text-muted-foreground ml-auto">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function StatusBadge({ status }: { status?: string }) {
  const variants: Record<string, { variant: any; icon: any }> = {
    planning: { variant: 'secondary', icon: Clock },
    initializing: { variant: 'secondary', icon: Loader2 },
    executing: { variant: 'success', icon: Activity },
    completed: { variant: 'success', icon: CheckCircle2 },
    failed: { variant: 'destructive', icon: XCircle },
    cancelled: { variant: 'outline', icon: StopCircle },
  };

  const config = variants[status || ''] || variants.initializing;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={cn('h-3 w-3', status === 'executing' && 'animate-spin')} />
      {status || 'Unknown'}
    </Badge>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  total,
  variant = 'default',
}: {
  icon: any;
  label: string;
  value: number;
  total?: number;
  variant?: 'default' | 'success' | 'destructive' | 'info';
}) {
  const variantClasses = {
    default: 'bg-muted/50',
    success: 'bg-green-500/10',
    destructive: 'bg-red-500/10',
    info: 'bg-blue-500/10',
  };

  return (
    <div className={cn('rounded-lg border p-3', variantClasses[variant])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-xl font-bold">
        {value}
        {total !== undefined && (
          <span className="text-sm text-muted-foreground font-normal">/{total}</span>
        )}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: any }) {
  const statusColors: Record<AgentStatus, string> = {
    initializing: 'bg-gray-500',
    idle: 'bg-blue-500',
    busy: 'bg-green-500 animate-pulse',
    paused: 'bg-yellow-500',
    error: 'bg-red-500',
    offline: 'bg-gray-400',
    terminating: 'bg-orange-500',
    terminated: 'bg-gray-600',
  };

  const healthColor =
    agent.health >= 80 ? 'text-green-600' : agent.health >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
      <div className={cn('h-3 w-3 rounded-full', statusColors[agent.status as AgentStatus])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{agent.name}</span>
          <Badge variant="outline" className="text-xs">
            {agent.type}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>Health: <span className={healthColor}>{agent.health}%</span></span>
          <span>Workload: {agent.workload}%</span>
          <span>Tasks: {agent.metrics?.tasksCompleted || 0}</span>
        </div>
      </div>
      {agent.currentTask && (
        <Badge variant="secondary" className="text-xs">
          Active
        </Badge>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  const statusColors: Record<TaskStatus, string> = {
    created: 'bg-gray-500',
    queued: 'bg-blue-500',
    assigned: 'bg-cyan-500',
    running: 'bg-green-500 animate-pulse',
    paused: 'bg-yellow-500',
    completed: 'bg-green-600',
    failed: 'bg-red-500',
    cancelled: 'bg-gray-400',
    timeout: 'bg-orange-500',
    retrying: 'bg-purple-500',
    blocked: 'bg-red-400',
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-accent/50 transition-colors">
      <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', statusColors[task.status as TaskStatus])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{task.name}</span>
          <PriorityBadge priority={task.priority} />
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
      </div>
      <Badge variant="outline" className="text-xs whitespace-nowrap">
        {task.status}
      </Badge>
    </div>
  );
}

function PriorityBadge({ priority, count }: { priority: TaskPriority; count?: number }) {
  const variants: Record<TaskPriority, any> = {
    critical: 'destructive',
    high: 'warning',
    normal: 'secondary',
    low: 'outline',
    background: 'outline',
  };

  return (
    <Badge variant={variants[priority]} className="text-xs">
      {priority}
      {count !== undefined && count > 0 && ` (${count})`}
    </Badge>
  );
}

function HealthMetric({
  label,
  value,
  icon: Icon,
  unit = '%',
}: {
  label: string;
  value: number;
  icon: any;
  unit?: string;
}) {
  const percentage = Math.min(100, Math.max(0, value));
  const color =
    percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <span className={cn('text-sm font-medium', color)}>
          {value.toFixed(1)}
          {unit}
        </span>
      </div>
      <Progress value={percentage} />
    </div>
  );
}
