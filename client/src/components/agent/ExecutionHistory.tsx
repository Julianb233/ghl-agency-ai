import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import type { AgentExecutionListItem } from '@/types/agent';

interface ExecutionHistoryProps {
  onSelectExecution?: (executionId: string) => void;
  selectedExecutionId?: string;
}

export function ExecutionHistory({
  onSelectExecution,
  selectedExecutionId
}: ExecutionHistoryProps) {
  const { data: executions, isLoading } = trpc.agent.listExecutions.useQuery({
    limit: 20
  });

  const getStatusIcon = (status: AgentExecutionListItem['status']) => {
    switch (status) {
      case 'planning':
      case 'executing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: AgentExecutionListItem['status']) => {
    switch (status) {
      case 'planning':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'executing':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled':
        return 'text-orange-600 bg-orange-50 border-orange-200';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="h-full flex flex-col border-r border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="font-bold text-sm text-gray-900">Execution History</h2>
        <p className="text-xs text-gray-500 mt-1">Recent agent executions</p>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            <p className="text-xs text-gray-500 mt-2">Loading executions...</p>
          </div>
        ) : !executions || executions.length === 0 ? (
          <div className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-gray-300" />
            <p className="text-sm text-gray-500 mt-2">No executions yet</p>
            <p className="text-xs text-gray-400 mt-1">Submit a task to get started</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {executions.map((execution) => (
              <button
                key={execution.id}
                onClick={() => onSelectExecution?.(execution.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-all',
                  'hover:shadow-sm hover:border-emerald-300',
                  selectedExecutionId === execution.id
                    ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                    : 'bg-white border-gray-200'
                )}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className={cn('mt-0.5', getStatusColor(execution.status))}>
                    {getStatusIcon(execution.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {execution.task}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatRelativeTime(execution.createdAt)}</span>
                  {execution.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(execution.duration)}
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                    getStatusColor(execution.status)
                  )}>
                    {execution.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
