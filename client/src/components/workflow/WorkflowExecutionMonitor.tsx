import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  X,
  AlertCircle,
  Filter,
  Search,
  StopCircle,
} from 'lucide-react';
import { WorkflowStepCard, StepStatus, WorkflowStepType } from './WorkflowStepCard';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface WorkflowExecutionMonitorProps {
  executionId: number;
  workflowId: number;
  open: boolean;
  onClose: () => void;
  onCancel?: (executionId: number) => void;
  className?: string;
}

type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ExecutionStep {
  id: number;
  stepIndex: number;
  type: WorkflowStepType;
  status: StepStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number | null;
  result: unknown;
  error?: string;
}

interface ExecutionLog {
  id: number;
  level: LogLevel;
  message: string;
  timestamp: Date;
}

interface ExecutionData {
  id: number;
  workflowId: number;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt: Date | null;
  steps: ExecutionStep[];
  logs: ExecutionLog[];
}

// ============================================
// CONSTANTS
// ============================================

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-gray-500 bg-gray-500/10',
  info: 'text-blue-500 bg-blue-500/10',
  warn: 'text-amber-500 bg-amber-500/10',
  error: 'text-red-500 bg-red-500/10',
};

const STATUS_CONFIG: Record<ExecutionStatus, {
  icon: React.ElementType;
  color: string;
  label: string;
}> = {
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    label: 'Pending',
  },
  running: {
    icon: Loader2,
    color: 'text-blue-500',
    label: 'Running',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Failed',
  },
  cancelled: {
    icon: StopCircle,
    color: 'text-amber-500',
    label: 'Cancelled',
  },
};

const POLLING_INTERVAL = 2000; // 2 seconds

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function calculateProgress(steps: ExecutionStep[]): number {
  if (steps.length === 0) return 0;
  const completedCount = steps.filter(
    (s) => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped'
  ).length;
  return Math.round((completedCount / steps.length) * 100);
}

function getElapsedTime(startedAt: Date, completedAt: Date | null): number {
  const end = completedAt ? new Date(completedAt) : new Date();
  return end.getTime() - new Date(startedAt).getTime();
}

// ============================================
// COMPONENT
// ============================================

export const WorkflowExecutionMonitor: React.FC<WorkflowExecutionMonitorProps> = ({
  executionId,
  workflowId,
  open,
  onClose,
  onCancel,
  className,
}) => {
  const [executionData, setExecutionData] = useState<ExecutionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [logFilter, setLogFilter] = useState<LogLevel | 'all'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch execution data
  const fetchExecutionData = useCallback(async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/executions/${executionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load execution');
      }

      const data = await response.json();
      setExecutionData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, executionId]);

  // Initial fetch and polling setup
  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    fetchExecutionData();

    // Set up polling for running executions
    pollingIntervalRef.current = setInterval(() => {
      fetchExecutionData();
    }, POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [open, fetchExecutionData]);

  // Update elapsed time
  useEffect(() => {
    if (!executionData || executionData.status === 'completed' || executionData.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(getElapsedTime(executionData.startedAt, executionData.completedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [executionData]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [executionData?.logs]);

  // Handle cancel execution
  const handleCancel = useCallback(async () => {
    if (!onCancel) return;

    setIsCancelling(true);
    try {
      await onCancel(executionId);
      setShowCancelDialog(false);
    } finally {
      setIsCancelling(false);
    }
  }, [onCancel, executionId]);

  // Filter logs
  const filteredLogs = executionData?.logs.filter((log) => {
    const matchesLevel = logFilter === 'all' || log.level === logFilter;
    const matchesSearch = !logSearch || log.message.toLowerCase().includes(logSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  }) || [];

  // Calculate progress
  const progress = executionData ? calculateProgress(executionData.steps) : 0;
  const completedSteps = executionData?.steps.filter(
    (s) => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped'
  ).length || 0;
  const totalSteps = executionData?.steps.length || 0;

  const statusConfig = executionData ? STATUS_CONFIG[executionData.status] : null;
  const StatusIcon = statusConfig?.icon;

  const isRunning = executionData?.status === 'running';
  const canCancel = isRunning && onCancel;

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className={cn('max-w-4xl max-h-[90vh] flex flex-col', className)}
          aria-labelledby="execution-monitor-title"
          aria-describedby="execution-monitor-description"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading execution data...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-lg font-medium text-red-500 mb-2">Failed to load execution</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={fetchExecutionData} className="mt-4" variant="outline">
                Retry
              </Button>
            </div>
          ) : executionData ? (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {StatusIcon && (
                      <StatusIcon
                        className={cn(
                          'h-6 w-6',
                          statusConfig?.color,
                          executionData.status === 'running' && 'animate-spin'
                        )}
                      />
                    )}
                    <div>
                      <DialogTitle id="execution-monitor-title">
                        Execution #{executionId}
                      </DialogTitle>
                      <DialogDescription id="execution-monitor-description">
                        Started {formatTime(executionData.startedAt)}
                        {executionData.completedAt && ` • Completed ${formatTime(executionData.completedAt)}`}
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn(statusConfig?.color)}>
                      {statusConfig?.label}
                    </Badge>
                    {isRunning && (
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(elapsedTime)}
                      </span>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {completedSteps} of {totalSteps} steps completed
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress
                  value={progress}
                  max={100}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label="Execution progress"
                  className="h-2"
                />
              </div>

              {/* Steps */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Steps</h3>
                {executionData.steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No steps found for this execution
                  </p>
                ) : (
                  <div className="space-y-2">
                    {executionData.steps.map((step) => (
                      <WorkflowStepCard
                        key={step.id}
                        stepIndex={step.stepIndex}
                        stepType={step.type}
                        status={step.status}
                        result={
                          step.result || step.error
                            ? {
                                stepIndex: step.stepIndex,
                                type: step.type,
                                success: step.status === 'completed',
                                result: step.result,
                                error: step.error,
                                duration: step.duration || undefined,
                                timestamp: step.completedAt || undefined,
                              }
                            : undefined
                        }
                        compact
                        showStepNumber
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Logs */}
              <div className="space-y-2 flex-1 min-h-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Logs</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search logs..."
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        className="pl-8 h-8 w-48"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" aria-haspopup="true">
                          <Filter className="h-4 w-4 mr-2" />
                          Filter
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setLogFilter('all')}>
                          All Levels
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLogFilter('debug')}>
                          Debug
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLogFilter('info')}>
                          Info
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLogFilter('warn')}>
                          Warning
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLogFilter('error')}>
                          Error
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div role="region" aria-label="Execution logs">
                  <ScrollArea
                    ref={scrollAreaRef}
                    className="h-64 rounded-lg border bg-muted/30"
                  >
                  <div className="p-4 space-y-2 font-mono text-xs">
                    {filteredLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No logs available
                      </p>
                    ) : (
                      filteredLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2">
                          <span className="text-muted-foreground whitespace-nowrap">
                            {formatTime(log.timestamp)}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn('text-xs uppercase', LOG_LEVEL_COLORS[log.level])}
                          >
                            {log.level}
                          </Badge>
                          <span className="flex-1">{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Live status region for screen readers */}
              <div
                role="status"
                aria-live="polite"
                aria-label="Execution status"
                className="sr-only"
              >
                {statusConfig?.label} - {completedSteps} of {totalSteps} steps completed
              </div>

              <DialogFooter>
                {canCancel && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isCancelling}
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Cancel Execution
                  </Button>
                )}
                <Button variant="outline" onClick={onClose}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Execution?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this workflow execution? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancel'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

WorkflowExecutionMonitor.displayName = 'WorkflowExecutionMonitor';

export default WorkflowExecutionMonitor;
