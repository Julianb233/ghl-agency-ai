/**
 * Swarm Metrics Component
 *
 * Displays detailed metrics and analytics for the swarm system.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Bot,
  Network,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Heart,
  Cpu,
  HardDrive,
  Timer,
} from 'lucide-react';

interface SwarmMetricsProps {
  metrics: any;
  health: any;
}

export function SwarmMetrics({ metrics, health }: SwarmMetricsProps) {
  if (!metrics && !health) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No metrics available</p>
            <p className="text-sm">Start a swarm to begin collecting metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = metrics?.successRate || 0;
  const avgDuration = metrics?.averageTaskDuration || 0;
  const totalTasks = metrics?.totalTasksCompleted || 0;
  const totalAgents = metrics?.totalAgentsSpawned || 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Success Rate"
          value={`${(successRate * 100).toFixed(1)}%`}
          icon={successRate > 0.9 ? TrendingUp : TrendingDown}
          trend={successRate > 0.9 ? 'up' : 'down'}
          description="Task completion rate"
        />
        <MetricCard
          title="Avg Duration"
          value={formatDuration(avgDuration)}
          icon={Timer}
          trend="neutral"
          description="Per task average"
        />
        <MetricCard
          title="Total Tasks"
          value={totalTasks.toLocaleString()}
          icon={CheckCircle2}
          trend="up"
          description="Completed successfully"
        />
        <MetricCard
          title="Agents Spawned"
          value={totalAgents.toLocaleString()}
          icon={Bot}
          trend="up"
          description="Total lifetime"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Performance Overview
            </CardTitle>
            <CardDescription>System performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PerformanceBar
              label="Task Success Rate"
              value={successRate * 100}
              color="bg-green-500"
            />
            <PerformanceBar
              label="Agent Utilization"
              value={metrics?.agentUtilization ? metrics.agentUtilization * 100 : 75}
              color="bg-blue-500"
            />
            <PerformanceBar
              label="Queue Efficiency"
              value={metrics?.queueEfficiency ? metrics.queueEfficiency * 100 : 85}
              color="bg-purple-500"
            />
            <PerformanceBar
              label="Resource Usage"
              value={metrics?.resourceUsage ? metrics.resourceUsage * 100 : 60}
              color="bg-amber-500"
            />
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              System Health
            </CardTitle>
            <CardDescription>Current system status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthIndicator
              label="Coordinator Status"
              status={health?.status === 'healthy' ? 'healthy' : 'unhealthy'}
              icon={Cpu}
            />
            <HealthIndicator
              label="Memory Usage"
              status={health?.memoryUsage && health.memoryUsage > 0.9 ? 'warning' : 'healthy'}
              icon={HardDrive}
              value={health?.memoryUsage ? `${(health.memoryUsage * 100).toFixed(0)}%` : 'N/A'}
            />
            <HealthIndicator
              label="Active Connections"
              status="healthy"
              icon={Network}
              value={health?.activeSwarms?.toString() || '0'}
            />
            <HealthIndicator
              label="Error Rate"
              status={metrics?.errorRate && metrics.errorRate > 0.1 ? 'warning' : 'healthy'}
              icon={XCircle}
              value={metrics?.errorRate ? `${(metrics.errorRate * 100).toFixed(1)}%` : '0%'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Detailed Statistics
          </CardTitle>
          <CardDescription>Comprehensive swarm metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem
              label="Tasks Created"
              value={metrics?.totalTasksCreated?.toLocaleString() || '0'}
            />
            <StatItem
              label="Tasks Completed"
              value={metrics?.totalTasksCompleted?.toLocaleString() || '0'}
            />
            <StatItem
              label="Tasks Failed"
              value={metrics?.totalTasksFailed?.toLocaleString() || '0'}
            />
            <StatItem
              label="Tasks Cancelled"
              value={metrics?.totalTasksCancelled?.toLocaleString() || '0'}
            />
            <StatItem
              label="Swarms Created"
              value={metrics?.totalSwarmsCreated?.toLocaleString() || '0'}
            />
            <StatItem
              label="Active Swarms"
              value={health?.activeSwarms?.toLocaleString() || '0'}
            />
            <StatItem
              label="Active Agents"
              value={health?.activeAgents?.toLocaleString() || '0'}
            />
            <StatItem
              label="Pending Tasks"
              value={health?.pendingTasks?.toLocaleString() || '0'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Timing Analysis
          </CardTitle>
          <CardDescription>Task duration breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TimingCard
              label="Min Duration"
              value={formatDuration(metrics?.minTaskDuration || 0)}
              icon={Zap}
              color="text-green-500"
            />
            <TimingCard
              label="Max Duration"
              value={formatDuration(metrics?.maxTaskDuration || 0)}
              icon={Clock}
              color="text-red-500"
            />
            <TimingCard
              label="Avg Duration"
              value={formatDuration(metrics?.averageTaskDuration || 0)}
              icon={Timer}
              color="text-blue-500"
            />
            <TimingCard
              label="Total Runtime"
              value={formatDuration(metrics?.totalRuntime || 0)}
              icon={Activity}
              color="text-purple-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'up' | 'down' | 'neutral';
  description: string;
}) {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500',
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
          <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${trendColors[trend]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Performance Bar Component
function PerformanceBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(1)}%</span>
      </div>
      <Progress value={value} className="h-2" indicatorClassName={color} />
    </div>
  );
}

// Health Indicator Component
function HealthIndicator({
  label,
  status,
  icon: Icon,
  value,
}: {
  label: string;
  status: 'healthy' | 'warning' | 'unhealthy';
  icon: React.ComponentType<{ className?: string }>;
  value?: string;
}) {
  const statusConfig = {
    healthy: { color: 'text-green-500', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
    warning: { color: 'text-amber-500', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700' },
    unhealthy: { color: 'text-red-500', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${config.bg}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${config.color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm font-medium">{value}</span>}
        <Badge className={config.badge}>{status}</Badge>
      </div>
    </div>
  );
}

// Stat Item Component
function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}

// Timing Card Component
function TimingCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

// Helper to format duration
function formatDuration(ms: number): string {
  if (!ms || ms === 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
