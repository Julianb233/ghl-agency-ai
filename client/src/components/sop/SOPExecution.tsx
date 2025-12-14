import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Star,
  MessageSquare,
  ChevronRight,
  User,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type {
  SOPExecution,
  SOPExecutionProps,
  SOPExecutionStep,
  ExecutionStatus,
  StepStatus
} from '@/types/sop';

const EXECUTION_STATUS_CONFIG: Record<ExecutionStatus, {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary';
  icon: React.ReactNode;
}> = {
  PENDING: {
    label: 'Pending',
    variant: 'secondary',
    icon: <Clock className="h-4 w-4" />
  },
  IN_PROGRESS: {
    label: 'In Progress',
    variant: 'default',
    icon: <Loader2 className="h-4 w-4 animate-spin" />
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'success',
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  FAILED: {
    label: 'Failed',
    variant: 'destructive',
    icon: <XCircle className="h-4 w-4" />
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'secondary',
    icon: <Square className="h-4 w-4" />
  },
  WAITING_APPROVAL: {
    label: 'Waiting Approval',
    variant: 'warning',
    icon: <AlertTriangle className="h-4 w-4" />
  }
};

const STEP_STATUS_CONFIG: Record<StepStatus, {
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}> = {
  PENDING: {
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    icon: <Clock className="h-4 w-4" />
  },
  IN_PROGRESS: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: <Loader2 className="h-4 w-4 animate-spin" />
  },
  COMPLETED: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  FAILED: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: <XCircle className="h-4 w-4" />
  },
  SKIPPED: {
    color: 'text-slate-400',
    bgColor: 'bg-slate-50',
    icon: <ChevronRight className="h-4 w-4" />
  }
};

export const SOPExecution: React.FC<SOPExecutionProps> = ({
  execution,
  onStepComplete,
  onStepFail,
  onExecutionComplete,
  onCancel
}) => {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedStep, setSelectedStep] = useState<SOPExecutionStep | null>(null);
  const [stepResult, setStepResult] = useState('');

  // Calculate progress
  const completedSteps = execution?.steps?.filter(s => s.status === 'COMPLETED').length || 0;
  const totalSteps = execution?.steps?.length || 0;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  // Calculate duration
  const startTime = execution?.startedAt ? new Date(execution.startedAt) : null;
  const endTime = execution?.completedAt ? new Date(execution.completedAt) : null;
  const currentTime = new Date();
  const duration = startTime
    ? endTime
      ? endTime.getTime() - startTime.getTime()
      : currentTime.getTime() - startTime.getTime()
    : 0;
  const durationMinutes = Math.floor(duration / 60000);

  useEffect(() => {
    if (execution?.status === 'COMPLETED') {
      setShowFeedbackDialog(true);
    }
  }, [execution?.status]);

  const handleStepComplete = (step: SOPExecutionStep) => {
    onStepComplete?.(step.stepId, stepResult);
    setSelectedStep(null);
    setStepResult('');
  };

  const handleStepFail = (step: SOPExecutionStep, error: string) => {
    onStepFail?.(step.stepId, error);
    setSelectedStep(null);
    setStepResult('');
  };

  const handleSubmitFeedback = () => {
    onExecutionComplete?.(rating, feedback);
    setShowFeedbackDialog(false);
  };

  if (!execution) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No active execution</h3>
            <p className="text-sm text-muted-foreground">
              Start an SOP execution to track progress here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = EXECUTION_STATUS_CONFIG[execution.status];

  return (
    <div className="space-y-6">
      {/* Execution Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={statusConfig.variant} className="gap-1">
                  {statusConfig.icon}
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline">v{execution.sopVersion}</Badge>
              </div>
              <CardTitle>{execution.sopTitle}</CardTitle>
              <CardDescription className="mt-1">
                {execution.clientName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {execution.clientName}
                  </span>
                )}
              </CardDescription>
            </div>

            <div className="flex gap-2">
              {execution.status === 'IN_PROGRESS' && (
                <>
                  <Button variant="outline" onClick={onCancel}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button variant="destructive" onClick={onCancel}>
                    <Square className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {completedSteps} / {totalSteps} steps completed
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Execution Meta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Started</div>
              <div className="text-sm font-medium">
                {startTime?.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {startTime?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Duration</div>
              <div className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {durationMinutes}min
              </div>
            </div>

            {execution.executedByName && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Executed By</div>
                <div className="text-sm font-medium flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {execution.executedByName}
                </div>
              </div>
            )}

            {execution.rating && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Rating</div>
                <div className="text-sm font-medium flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {execution.rating}/5
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Steps</CardTitle>
          <CardDescription>
            Follow each step in sequence to complete the SOP
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!execution.steps || execution.steps.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No steps defined for this execution
            </div>
          ) : (
            <div className="relative space-y-4">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

              {execution.steps.map((step, index) => (
                <ExecutionStepCard
                  key={step.id}
                  step={step}
                  index={index}
                  onComplete={() => {
                    setSelectedStep(step);
                  }}
                  onFail={(error) => handleStepFail(step, error)}
                  canExecute={
                    execution.status === 'IN_PROGRESS' &&
                    step.status === 'IN_PROGRESS'
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Summary */}
      {execution.status === 'COMPLETED' && execution.result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Execution Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-green-50 text-green-900 border border-green-200">
              {execution.result}
            </div>
            {execution.feedback && (
              <div className="mt-4 space-y-2">
                <Label>Feedback</Label>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  {execution.feedback}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step Result Dialog */}
      <Dialog
        open={!!selectedStep}
        onOpenChange={(open) => !open && setSelectedStep(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Step {selectedStep?.stepNumber}</DialogTitle>
            <DialogDescription>{selectedStep?.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Result / Notes</Label>
              <Textarea
                value={stepResult}
                onChange={(e) => setStepResult(e.target.value)}
                placeholder="Enter the outcome or any notes about this step..."
                className="min-h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedStep) {
                  handleStepFail(selectedStep, 'Step failed or encountered issues');
                }
              }}
            >
              Mark Failed
            </Button>
            <Button
              onClick={() => {
                if (selectedStep) {
                  handleStepComplete(selectedStep);
                }
              }}
              disabled={!stepResult.trim()}
            >
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execution Completed</DialogTitle>
            <DialogDescription>
              How would you rate this SOP execution?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={cn(
                      'p-2 rounded transition-colors',
                      star <= rating
                        ? 'text-yellow-400'
                        : 'text-slate-300 hover:text-slate-400'
                    )}
                  >
                    <Star
                      className={cn(
                        'h-8 w-8',
                        star <= rating && 'fill-current'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Feedback (optional)</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience or suggestions for improvement..."
                className="min-h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Skip
            </Button>
            <Button onClick={handleSubmitFeedback} disabled={rating === 0}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface ExecutionStepCardProps {
  step: SOPExecutionStep;
  index: number;
  onComplete: () => void;
  onFail: (error: string) => void;
  canExecute: boolean;
}

const ExecutionStepCard: React.FC<ExecutionStepCardProps> = ({
  step,
  index,
  onComplete,
  onFail,
  canExecute
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusConfig = STEP_STATUS_CONFIG[step.status];

  const duration = step.startedAt && step.completedAt
    ? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
    : null;
  const durationMinutes = duration ? Math.floor(duration / 60000) : null;

  return (
    <div className="relative pl-14">
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-[1.3rem] top-3 w-3 h-3 rounded-full border-2 border-background',
          statusConfig.bgColor
        )}
      />

      <Card
        className={cn(
          'transition-all',
          step.status === 'IN_PROGRESS' && 'ring-2 ring-primary shadow-lg'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono">
                  {index + 1}
                </Badge>
                <div className={cn('flex items-center gap-1', statusConfig.color)}>
                  {statusConfig.icon}
                  <span className="text-xs font-medium uppercase">
                    {step.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <h4 className="font-semibold mb-1">{step.title}</h4>

              {step.status === 'IN_PROGRESS' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={onComplete} className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onFail('Step encountered an error')}
                    className="gap-1"
                  >
                    <XCircle className="h-3 w-3" />
                    Fail
                  </Button>
                </div>
              )}

              {step.result && (
                <div className="mt-2 p-2 rounded bg-muted/50 text-sm">
                  <div className="text-xs text-muted-foreground mb-1">Result:</div>
                  {step.result}
                </div>
              )}

              {step.error && (
                <div className="mt-2 p-2 rounded bg-red-50 text-red-900 text-sm border border-red-200">
                  <div className="text-xs font-medium mb-1">Error:</div>
                  {step.error}
                </div>
              )}

              {step.notes && (
                <div className="mt-2 p-2 rounded bg-blue-50 text-blue-900 text-sm border border-blue-200">
                  <div className="text-xs font-medium mb-1">Notes:</div>
                  {step.notes}
                </div>
              )}
            </div>

            <div className="text-right text-sm text-muted-foreground">
              {durationMinutes !== null && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {durationMinutes}min
                </div>
              )}
              {step.executedByName && (
                <div className="flex items-center gap-1 mt-1">
                  <User className="h-3 w-3" />
                  {step.executedByName}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
