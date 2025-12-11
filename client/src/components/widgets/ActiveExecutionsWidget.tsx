/**
 * ActiveExecutionsWidget Component
 * Dashboard widget showing currently running task executions
 */

import React, { useState, useEffect } from 'react';
import { useWebSocketStore } from '@/stores/websocketStore';
import { ExecutionMonitor } from '@/components/ExecutionMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ExecutionState } from '@/stores/websocketStore';

interface ActiveExecutionsWidgetProps {
  maxExecutions?: number;
  showConnectionStatus?: boolean;
}

export function ActiveExecutionsWidget({
  maxExecutions = 5,
  showConnectionStatus = true,
}: ActiveExecutionsWidgetProps) {
  const {
    executions,
    connectionState,
    isConnected,
    connect,
    disconnect,
    subscribeToAll,
  } = useWebSocketStore();

  const [selectedExecutionId, setSelectedExecutionId] = useState<number | null>(null);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    subscribeToAll();

    return () => {
      disconnect();
    };
  }, []);

  // Show toast notifications for execution status changes
  useEffect(() => {
    const executionList = Array.from(executions.values()) as ExecutionState[];

    executionList.forEach((execution) => {
      // Only show notifications for recently updated executions (within last 2 seconds)
      const timeSinceUpdate = Date.now() - new Date(execution.updatedAt).getTime();
      if (timeSinceUpdate > 2000) return;

      switch (execution.status) {
        case 'success':
          toast.success(`Task "${execution.taskName}" completed successfully`, {
            description: `Execution ID: ${execution.executionId}`,
          });
          break;
        case 'failed':
          toast.error(`Task "${execution.taskName}" failed`, {
            description: execution.error || 'Unknown error',
          });
          break;
        case 'timeout':
          toast.error(`Task "${execution.taskName}" timed out`, {
            description: `Execution ID: ${execution.executionId}`,
          });
          break;
      }
    });
  }, [executions]);

  const activeExecutions = (Array.from(executions.values()) as ExecutionState[])
    .filter((exec) => exec.status === 'running' || exec.status === 'queued')
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, maxExecutions);

  const recentCompletedExecutions = (Array.from(executions.values()) as ExecutionState[])
    .filter((exec) => exec.status === 'success' || exec.status === 'failed' || exec.status === 'timeout')
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 3);

  const getStatusIcon = (status: ExecutionState['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-slate-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'timeout':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-slate-500" />;
    }
  };

  const getConnectionBadge = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <Wifi className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="outline" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Disconnected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const ms = Date.now() - new Date(timestamp).getTime();
    const seconds = Math.floor(ms / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active Executions
              </CardTitle>
              <CardDescription>
                Currently running and queued tasks
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {showConnectionStatus && getConnectionBadge()}
              {!isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={connect}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reconnect
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {activeExecutions.length === 0 && recentCompletedExecutions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-1">No active executions</p>
              <p className="text-xs text-slate-500">
                Tasks will appear here when they start running
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Executions */}
              {activeExecutions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Running ({activeExecutions.length})
                  </h4>
                  <ScrollArea className="max-h-80">
                    <div className="space-y-2">
                      {activeExecutions.map((execution) => (
                        <div
                          key={execution.executionId}
                          className="rounded-lg border bg-white p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedExecutionId(execution.executionId)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getStatusIcon(execution.status)}
                                <span className="font-medium text-sm">{execution.taskName}</span>
                                <Badge variant="outline" className="text-xs">
                                  ID: {execution.executionId}
                                </Badge>
                              </div>
                              {execution.currentStep && (
                                <p className="text-xs text-slate-600 truncate">
                                  {execution.currentStep}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExecutionId(execution.executionId);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>
                                {execution.stepsCompleted} / {execution.stepsTotal} steps
                              </span>
                              <span>{execution.progress}%</span>
                            </div>
                            <Progress value={execution.progress} className="h-1.5" />
                          </div>

                          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Started {formatTimeAgo(execution.startedAt)}
                            </span>
                            {execution.logs.length > 0 && (
                              <span>{execution.logs.length} logs</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Recent Completed */}
              {recentCompletedExecutions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Recent ({recentCompletedExecutions.length})
                  </h4>
                  <div className="space-y-2">
                    {recentCompletedExecutions.map((execution) => (
                      <div
                        key={execution.executionId}
                        className="rounded-lg border bg-slate-50 p-3 hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => setSelectedExecutionId(execution.executionId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            {getStatusIcon(execution.status)}
                            <span className="font-medium text-sm truncate">
                              {execution.taskName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">
                              {formatTimeAgo(execution.startedAt)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExecutionId(execution.executionId);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Monitor Dialog */}
      {selectedExecutionId !== null && (
        <ExecutionMonitor
          executionId={selectedExecutionId}
          open={selectedExecutionId !== null}
          onClose={() => setSelectedExecutionId(null)}
        />
      )}
    </>
  );
}
