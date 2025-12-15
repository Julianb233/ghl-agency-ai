/**
 * Agent Performance Component
 * Displays recent agent execution history with status indicators
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Eye,
  Play,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionItemProps {
  execution: {
    id: number;
    status: string;
    triggerType: string | null;
    startedAt: Date | null;
    duration: number | null;
    error: string | null;
    progress: string | null;
  };
  onReplay?: (id: number) => void;
  onView?: (id: number) => void;
}

function ExecutionItem({ execution, onReplay, onView }: ExecutionItemProps) {
  const statusConfig = {
    success: {
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      variant: 'success' as const,
      label: 'Success',
      animate: undefined,
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      variant: 'destructive' as const,
      label: 'Failed',
      animate: undefined,
    },
    running: {
      icon: Loader2,
      color: 'text-blue-600 dark:text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      variant: 'info' as const,
      label: 'Running',
      animate: 'animate-spin' as const,
    },
    timeout: {
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      variant: 'warning' as const,
      label: 'Timeout',
      animate: undefined,
    },
  };

  const status = statusConfig[execution.status as keyof typeof statusConfig] || {
    icon: AlertCircle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
    variant: 'outline' as const,
    label: execution.status,
    animate: undefined,
  };

  const StatusIcon = status.icon;
  const duration = execution.duration
    ? execution.duration > 1000
      ? `${(execution.duration / 1000).toFixed(1)}s`
      : `${execution.duration}ms`
    : '-';

  const formattedDate = execution.startedAt
    ? new Date(execution.startedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md',
        status.bgColor,
        'hover:scale-[1.01]'
      )}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
          status.bgColor
        )}
      >
        <StatusIcon className={cn('h-5 w-5', status.color, status.animate)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={status.variant} className="text-xs">
            {status.label}
          </Badge>
          {execution.triggerType && (
            <span className="text-xs text-muted-foreground capitalize">
              {execution.triggerType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {duration}
          </span>
          {execution.progress && (
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {execution.progress} steps
            </span>
          )}
        </div>
        {execution.error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">
            Error: {execution.error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(execution.id)}
            className="h-8 w-8 p-0"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {onReplay && execution.status !== 'running' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReplay(execution.id)}
            className="h-8 w-8 p-0"
            title="Replay execution"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface AgentPerformanceProps {
  className?: string;
  limit?: number;
  taskId?: number;
}

export function AgentPerformance({
  className,
  limit = 10,
  taskId,
}: AgentPerformanceProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch task metrics which includes recent executions
  const metricsQuery = trpc.analytics.getTaskMetrics.useQuery(
    {
      taskId: taskId || 0,
      period: 'week',
    },
    {
      enabled: !!taskId,
      refetchInterval: 15000, // Refetch every 15 seconds
      refetchOnWindowFocus: true,
    }
  );

  // If no taskId provided, fetch general execution stats
  const statsQuery = trpc.analytics.getExecutionStats.useQuery(
    { period: 'week' },
    {
      enabled: !taskId,
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    }
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (taskId) {
      await metricsQuery.refetch();
    } else {
      await statsQuery.refetch();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleReplay = (id: number) => {
    console.log('Replay execution:', id);
    // TODO: Implement replay functionality
  };

  const handleView = (id: number) => {
    console.log('View execution:', id);
    // TODO: Navigate to execution details
  };

  const isLoading = taskId ? metricsQuery.isLoading : statsQuery.isLoading;
  const metricsData = metricsQuery.data && 'recentExecutions' in metricsQuery.data ? metricsQuery.data : null;
  const executions = metricsData?.recentExecutions || [];

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Executions
            </CardTitle>
            <CardDescription className="mt-1">
              {taskId
                ? `Recent runs for ${metricsData?.taskName || 'this task'}`
                : 'Latest agent execution history'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw
              className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No recent executions found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Executions will appear here once tasks start running
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.slice(0, limit).map((execution) => (
              <ExecutionItem
                key={execution.id}
                execution={execution}
                onReplay={handleReplay}
                onView={handleView}
              />
            ))}
          </div>
        )}

        {!isLoading && metricsData?.execution && (
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Runs</p>
              <p className="text-lg font-semibold">
                {metricsData.execution.total}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-500">
                {metricsData.execution.successRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Duration</p>
              <p className="text-lg font-semibold">
                {metricsData.duration.average > 1000
                  ? `${(metricsData.duration.average / 1000).toFixed(1)}s`
                  : `${metricsData.duration.average}ms`}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AgentPerformance;
