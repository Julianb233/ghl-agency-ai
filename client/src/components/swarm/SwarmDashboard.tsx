/**
 * Swarm Coordination Dashboard
 *
 * Comprehensive dashboard for multi-agent swarm orchestration.
 * Displays active swarms, agent types, task queues, health metrics,
 * and provides controls for creating and managing swarms.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc';
import {
  Users,
  Play,
  Square,
  RefreshCw,
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Bot,
  Network,
  ListTodo,
  Heart,
  BarChart3,
  Cpu,
  Search,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { SwarmList } from './SwarmList';
import { AgentTypesBrowser } from './AgentTypesBrowser';
import { SwarmMetrics } from './SwarmMetrics';

export function SwarmDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Queries
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = trpc.swarm.getHealth.useQuery(
    undefined,
    { refetchInterval: 10000 }
  );

  const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics } = trpc.swarm.getMetrics.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  const { data: swarmsData, isLoading: swarmsLoading, refetch: refetchSwarms } = trpc.swarm.listActive.useQuery(
    undefined,
    { refetchInterval: 3000 }
  );

  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue } = trpc.swarm.getQueueStatus.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );

  const handleRefreshAll = () => {
    refetchHealth();
    refetchMetrics();
    refetchSwarms();
    refetchQueue();
  };

  const isLoading = healthLoading || metricsLoading || swarmsLoading;
  const health = healthData?.health;
  const metrics = metricsData?.metrics;
  const swarms = swarmsData?.swarms || [];
  const queue = queueData?.queue;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <Network className="h-5 w-5 text-white" />
            </div>
            Swarm Coordination
          </h1>
          <p className="text-muted-foreground mt-1">
            Multi-agent orchestration with 64+ specialized agent types
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={health?.status === 'healthy' ? 'default' : 'destructive'}
            className={health?.status === 'healthy' ? 'bg-green-500' : ''}
          >
            <span className={`w-2 h-2 rounded-full mr-2 ${health?.status === 'healthy' ? 'bg-green-200 animate-pulse' : 'bg-red-200'}`} />
            {health?.status === 'healthy' ? 'System Healthy' : 'System Unhealthy'}
          </Badge>
          <Button variant="outline" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Active Swarms"
          value={swarms.length.toString()}
          icon={Network}
          status={swarms.length > 0 ? 'info' : 'neutral'}
          description="Running coordinations"
        />
        <StatCard
          title="Total Agents"
          value={metrics?.totalAgentsSpawned?.toString() || '0'}
          icon={Bot}
          status="success"
          description="Spawned agents"
        />
        <StatCard
          title="Tasks Completed"
          value={metrics?.totalTasksCompleted?.toString() || '0'}
          icon={CheckCircle2}
          status="success"
          description="Successfully finished"
        />
        <StatCard
          title="Queue Depth"
          value={queue?.pending?.toString() || '0'}
          icon={ListTodo}
          status={queue?.pending && queue.pending > 10 ? 'warning' : 'info'}
          description="Pending tasks"
        />
        <StatCard
          title="Success Rate"
          value={metrics?.successRate ? `${(metrics.successRate * 100).toFixed(1)}%` : 'N/A'}
          icon={Zap}
          status={metrics?.successRate && metrics.successRate > 0.9 ? 'success' : 'warning'}
          description="Task completion"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="swarms" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Active Swarms
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agent Types
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Swarm
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SwarmOverview
            health={health}
            metrics={metrics}
            swarms={swarms}
            queue={queue}
          />
        </TabsContent>

        <TabsContent value="swarms">
          <SwarmList swarms={swarms} onRefresh={refetchSwarms} />
        </TabsContent>

        <TabsContent value="agents">
          <AgentTypesBrowser />
        </TabsContent>

        <TabsContent value="create">
          <CreateSwarmForm onSuccess={refetchSwarms} />
        </TabsContent>

        <TabsContent value="metrics">
          <SwarmMetrics metrics={metrics} health={health} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  status,
  description,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  description: string;
}) {
  const statusColors = {
    success: 'text-green-500 bg-green-50',
    error: 'text-red-500 bg-red-50',
    warning: 'text-amber-500 bg-amber-50',
    info: 'text-blue-500 bg-blue-50',
    neutral: 'text-gray-500 bg-gray-50',
  };

  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
    neutral: 'text-gray-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${statusColors[status]}`}>
            <Icon className={`h-6 w-6 ${iconColors[status]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Swarm Overview Component
function SwarmOverview({
  health,
  metrics,
  swarms,
  queue,
}: {
  health: any;
  metrics: any;
  swarms: any[];
  queue: any;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            System Health
          </CardTitle>
          <CardDescription>Current coordinator status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={health?.status === 'healthy' ? 'default' : 'destructive'}>
                {health?.status || 'Unknown'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Agents</p>
              <p className="text-lg font-semibold">{health?.activeAgents || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Swarms</p>
              <p className="text-lg font-semibold">{health?.activeSwarms || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending Tasks</p>
              <p className="text-lg font-semibold">{health?.pendingTasks || 0}</p>
            </div>
          </div>
          {health?.lastError && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Last Error</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{health.lastError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-blue-500" />
            Task Queue
          </CardTitle>
          <CardDescription>Current task distribution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <QueueItem label="Pending" value={queue?.pending || 0} color="bg-amber-500" />
            <QueueItem label="In Progress" value={queue?.inProgress || 0} color="bg-blue-500" />
            <QueueItem label="Completed" value={queue?.completed || 0} color="bg-green-500" />
            <QueueItem label="Failed" value={queue?.failed || 0} color="bg-red-500" />
          </div>
        </CardContent>
      </Card>

      {/* Active Swarms Preview */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-purple-500" />
            Active Swarms
          </CardTitle>
          <CardDescription>Currently running coordinations</CardDescription>
        </CardHeader>
        <CardContent>
          {swarms.length === 0 ? (
            <div className="text-center py-8">
              <Network className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No active swarms</p>
              <p className="text-sm text-muted-foreground">Create a new swarm to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {swarms.slice(0, 5).map((swarm) => (
                <SwarmPreviewCard key={swarm.id} swarm={swarm} />
              ))}
              {swarms.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{swarms.length - 5} more swarms
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Queue Item Component
function QueueItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

// Swarm Preview Card
function SwarmPreviewCard({ swarm }: { swarm: any }) {
  const statusColors: Record<string, string> = {
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <p className="font-medium text-sm">{swarm.name || `Swarm ${swarm.id.slice(0, 8)}`}</p>
          <p className="text-xs text-muted-foreground">{swarm.strategy} strategy</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">{swarm.agentCount} agents</p>
          <p className="text-xs text-muted-foreground">{swarm.taskCount} tasks</p>
        </div>
        <Badge className={statusColors[swarm.status] || 'bg-gray-100 text-gray-700'}>
          {swarm.status}
        </Badge>
        <div className="w-16">
          <Progress value={swarm.progress * 100} className="h-2" />
        </div>
      </div>
    </div>
  );
}

// Create Swarm Form
function CreateSwarmForm({ onSuccess }: { onSuccess: () => void }) {
  const [objective, setObjective] = useState('');
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState<string>('auto');
  const [maxAgents, setMaxAgents] = useState(10);
  const [autoScaling, setAutoScaling] = useState(true);

  const executeQuick = trpc.swarm.executeQuick.useMutation({
    onSuccess: () => {
      setObjective('');
      setName('');
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim()) return;

    executeQuick.mutate({
      objective,
      name: name || undefined,
      strategy: strategy as any,
      maxAgents,
      autoScaling,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-emerald-500" />
          Create New Swarm
        </CardTitle>
        <CardDescription>
          Launch a multi-agent swarm to accomplish complex objectives
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="objective">Objective *</Label>
            <Textarea
              id="objective"
              placeholder="Describe what you want the swarm to accomplish... (min 10 characters)"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Be specific about the goal. The swarm will automatically determine the best agents and tasks.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Swarm Name (optional)</Label>
              <Input
                id="name"
                placeholder="My Research Swarm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Recommended)</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                  <SelectItem value="deployment">Deployment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAgents">Max Agents</Label>
              <Input
                id="maxAgents"
                type="number"
                min={1}
                max={50}
                value={maxAgents}
                onChange={(e) => setMaxAgents(parseInt(e.target.value) || 10)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label htmlFor="autoScaling">Auto Scaling</Label>
                <p className="text-xs text-muted-foreground">Automatically adjust agent count</p>
              </div>
              <Switch
                id="autoScaling"
                checked={autoScaling}
                onCheckedChange={setAutoScaling}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={objective.length < 10 || executeQuick.isPending}
          >
            {executeQuick.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Swarm...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Create & Start Swarm
              </>
            )}
          </Button>

          {executeQuick.isError && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-600">
                {executeQuick.error?.message || 'Failed to create swarm'}
              </p>
            </div>
          )}

          {executeQuick.isSuccess && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-600">
                Swarm created and started successfully!
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
