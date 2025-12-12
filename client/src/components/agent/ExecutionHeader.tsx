import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentExecution } from '@/types/agent';

interface ExecutionHeaderProps {
  execution: AgentExecution | null;
  isExecuting: boolean;
}

export function ExecutionHeader({ execution, isExecuting }: ExecutionHeaderProps) {
  if (!execution) {
    return (
      <Card className="mb-4 border-gray-200">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p className="text-sm">No active execution</p>
            <p className="text-xs mt-1">Submit a task to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (execution.status) {
      case 'planning':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case 'executing':
        return <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (execution.status) {
      case 'planning':
        return 'border-blue-200 bg-blue-50';
      case 'executing':
        return 'border-emerald-200 bg-emerald-50';
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'cancelled':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusText = () => {
    switch (execution.status) {
      case 'planning':
        return 'Planning execution...';
      case 'executing':
        return 'Executing task...';
      case 'completed':
        return 'Completed successfully';
      case 'failed':
        return 'Execution failed';
      case 'cancelled':
        return 'Execution cancelled';
      default:
        return execution.status;
    }
  };

  const duration = execution.completedAt
    ? Math.round((execution.completedAt.getTime() - execution.createdAt.getTime()) / 1000)
    : Math.round((new Date().getTime() - execution.createdAt.getTime()) / 1000);

  return (
    <Card className={cn('mb-4 border-l-4', getStatusColor())}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {execution.task}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {getStatusText()}
                </p>
              </div>

              <div className="text-right text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{duration}s</span>
                </div>
              </div>
            </div>

            {execution.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-900 mb-1">Error:</p>
                <p className="text-sm text-red-700">{execution.error}</p>
              </div>
            )}

            {execution.metadata && (
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                {execution.metadata.model && (
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">Model:</span>
                    <span>{execution.metadata.model}</span>
                  </div>
                )}
                {execution.metadata.tokensUsed && (
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">Tokens:</span>
                    <span>{execution.metadata.tokensUsed.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
