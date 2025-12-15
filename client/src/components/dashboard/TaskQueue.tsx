/**
 * Task Queue Component
 * Displays pending and running tasks with real-time status updates
 * Connected to agencyTasks.getTaskQueue API endpoint
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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc';
import {
  Layers,
  Loader2,
  Pause,
  X,
  Play,
  AlertCircle,
  Clock,
  ArrowRight,
  Zap,
  ListOrdered,
  CalendarClock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TaskQueueItemProps {
  task: {
    id: number;
    title: string;
    status: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    progress?: number;
    scheduledFor?: Date | null;
    isRunning?: boolean;
    queuePosition?: number;
  };
  onPause?: (id: number) => void;
  onCancel?: (id: number) => void;
  onStart?: (id: number) => void;
}

function TaskQueueItem({ task, onPause, onCancel, onStart }: TaskQueueItemProps) {
  const priorityConfig = {
    critical: {
      color: 'text-red-600 dark:text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      variant: 'destructive' as const,
      label: 'Critical',
    },
    high: {
      color: 'text-orange-600 dark:text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      variant: 'warning' as const,
      label: 'High',
    },
    medium: {
      color: 'text-blue-600 dark:text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      variant: 'info' as const,
      label: 'Medium',
    },
    low: {
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950/20',
      variant: 'outline' as const,
      label: 'Low',
    },
  };

  const priority = task.priority
    ? priorityConfig[task.priority]
    : priorityConfig.medium;

  const isRunning = task.isRunning || task.status === 'in_progress';
  const isPending = task.status === 'pending' || task.status === 'queued';
  const isScheduled = task.status === 'deferred' && task.scheduledFor;

  const nextRunTime = task.scheduledFor
    ? format(new Date(task.scheduledFor), 'MMM d, h:mm a')
    : null;

  return (
    <div
      className={cn(
        'group relative p-4 rounded-lg border transition-all',
        isRunning && 'border-blue-500 dark:border-blue-600 shadow-sm',
        'hover:shadow-md'
      )}
    >
      {/* Priority Indicator Bar */}
      {task.priority && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 rounded-l-lg',
            priority.bgColor.replace('bg-', 'bg-gradient-to-b from-')
          )}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
            isRunning ? 'bg-blue-50 dark:bg-blue-950/20' : priority.bgColor
          )}
        >
          {isRunning ? (
            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-500 animate-spin" />
          ) : isScheduled ? (
            <CalendarClock className="h-5 w-5 text-purple-600 dark:text-purple-500" />
          ) : isPending ? (
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          ) : (
            <Layers className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{task.title}</h4>
            {task.priority && (
              <Badge variant={priority.variant} className="text-xs">
                {priority.label}
              </Badge>
            )}
            {task.queuePosition !== undefined && !isRunning && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <ListOrdered className="h-3 w-3" />
                #{task.queuePosition}
              </Badge>
            )}
          </div>

          {/* Status Info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span className="capitalize">{task.status.replace('_', ' ')}</span>
            {nextRunTime && (
              <>
                <ArrowRight className="h-3 w-3" />
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {nextRunTime}
                </span>
              </>
            )}
          </div>

          {/* Progress Bar (for running tasks) */}
          {isRunning && task.progress !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {isRunning && onPause && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPause(task.id)}
              className="h-8 w-8 p-0"
              title="Pause task"
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {isPending && onStart && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStart(task.id)}
              className="h-8 w-8 p-0"
              title="Start task now"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(task.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Cancel task"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TaskQueueProps {
  className?: string;
  maxItems?: number;
}

export function TaskQueue({ className, maxItems = 5 }: TaskQueueProps) {
  const [filter, setFilter] = useState<'all' | 'running' | 'pending' | 'scheduled'>('all');

  // Fetch task queue from API
  const { data, isLoading, error, refetch } = trpc.agencyTasks.getTaskQueue.useQuery(
    { filter, limit: maxItems },
    {
      refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
      refetchOnWindowFocus: true,
    }
  );

  // Mutations
  const executeMutation = trpc.agencyTasks.execute.useMutation({
    onSuccess: () => {
      toast.success('Task execution started');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to start task: ${error.message}`);
    },
  });

  const cancelMutation = trpc.agencyTasks.delete.useMutation({
    onSuccess: () => {
      toast.success('Task cancelled');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to cancel task: ${error.message}`);
    },
  });

  const handlePause = (id: number) => {
    // TODO: Implement pause functionality when backend supports it
    console.log('Pause task:', id);
    toast.info('Pause functionality coming soon');
  };

  const handleCancel = (id: number) => {
    if (confirm('Are you sure you want to cancel this task?')) {
      cancelMutation.mutate({ id });
    }
  };

  const handleStart = (id: number) => {
    executeMutation.mutate({ id });
  };

  const tasks = data?.tasks || [];
  const counts = data?.counts || { running: 0, pending: 0, scheduled: 0 };

  const filteredTasks = tasks;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Task Queue
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3" />
                {counts.running} running
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {counts.pending} pending
              </span>
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {counts.scheduled} scheduled
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
              title="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs"
          >
            All
          </Button>
          <Button
            variant={filter === 'running' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('running')}
            className="text-xs"
          >
            Running
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className="text-xs"
          >
            Pending
          </Button>
          <Button
            variant={filter === 'scheduled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('scheduled')}
            className="text-xs"
          >
            Scheduled
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-sm text-red-500">Failed to load tasks</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No tasks in queue</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter !== 'all'
                ? `No ${filter} tasks found`
                : 'Schedule tasks to see them here'}
            </p>
          </div>
        )}

        {/* Task List */}
        {!isLoading && !error && filteredTasks.length > 0 && (
          <div className="space-y-3">
            {filteredTasks.slice(0, maxItems).map((task: any) => (
              <TaskQueueItem
                key={task.id}
                task={{
                  id: task.id,
                  title: task.title,
                  status: task.status,
                  priority: task.priority as 'low' | 'medium' | 'high' | 'critical',
                  scheduledFor: task.scheduledFor,
                  isRunning: task.isRunning,
                  queuePosition: task.queuePosition,
                }}
                onPause={handlePause}
                onCancel={handleCancel}
                onStart={handleStart}
              />
            ))}
          </div>
        )}

        {filteredTasks.length > maxItems && (
          <Button variant="outline" className="w-full mt-4" size="sm">
            View All Tasks ({filteredTasks.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default TaskQueue;
