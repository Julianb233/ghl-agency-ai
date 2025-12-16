/**
 * Enhanced Progress Display Component
 *
 * Shows real-time execution progress with:
 * - Step count and visual progress bar
 * - ETA with elapsed time
 * - Current action display
 * - Phase timeline
 * - Confidence indicator
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  Target,
  TrendingUp,
  AlertCircle,
  Zap,
  Timer,
} from 'lucide-react';

// ========================================
// TYPES
// ========================================

export interface ProgressData {
  currentStep: number;
  totalSteps: number;
  percentComplete: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  currentAction: string;
  currentPhase?: string;
  confidence?: number;
}

export interface PhaseInfo {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  steps?: number;
  duration?: number;
}

interface EnhancedProgressDisplayProps {
  progress: ProgressData;
  phases?: PhaseInfo[];
  isComplete?: boolean;
  isError?: boolean;
  className?: string;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-emerald-600';
  if (confidence >= 0.6) return 'text-blue-600';
  if (confidence >= 0.4) return 'text-amber-600';
  return 'text-gray-500';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Good';
  if (confidence >= 0.4) return 'Fair';
  return 'Low';
}

// ========================================
// SUBCOMPONENTS
// ========================================

function StepCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
        <Target className="w-4 h-4 text-purple-600" />
      </div>
      <div>
        <div className="text-sm font-medium">
          Step {current} of {total}
        </div>
        <div className="text-xs text-muted-foreground">
          {total - current} steps remaining
        </div>
      </div>
    </div>
  );
}

function TimeEstimate({
  elapsed,
  remaining,
  confidence,
}: {
  elapsed: number;
  remaining: number;
  confidence?: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {formatDuration(elapsed)} elapsed
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          ~{formatDuration(remaining)} remaining
        </span>
        {confidence !== undefined && (
          <span className={`text-xs ${getConfidenceColor(confidence)}`}>
            ({getConfidenceLabel(confidence)} confidence)
          </span>
        )}
      </div>
    </div>
  );
}

function CurrentActionDisplay({ action }: { action: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 animate-pulse">
        <Zap className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-purple-600 font-medium mb-0.5">Current Action</div>
        <div className="text-sm font-medium text-foreground truncate">{action}</div>
      </div>
    </div>
  );
}

function PhaseTimeline({ phases, currentPhase }: { phases: PhaseInfo[]; currentPhase?: string }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground mb-2">Execution Phases</div>
      <div className="flex items-center gap-1">
        {phases.map((phase, idx) => {
          const isActive = phase.name === currentPhase || phase.status === 'in_progress';
          const isComplete = phase.status === 'completed';

          return (
            <React.Fragment key={phase.id}>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : isComplete
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isActive ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isComplete ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
                <span className="font-medium">{phase.name}</span>
              </div>
              {idx < phases.length - 1 && (
                <div
                  className={`w-4 h-0.5 ${
                    isComplete ? 'bg-emerald-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);

  return (
    <div className="flex items-center gap-2">
      <TrendingUp className={`w-4 h-4 ${getConfidenceColor(confidence)}`} />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Estimate accuracy:</span>
        <span className={`text-xs font-medium ${getConfidenceColor(confidence)}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export function EnhancedProgressDisplay({
  progress,
  phases = [],
  isComplete = false,
  isError = false,
  className = '',
}: EnhancedProgressDisplayProps) {
  // Animate progress for smoother UX
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    const target = isComplete ? 100 : progress.percentComplete;
    const step = (target - displayPercent) / 10;

    if (Math.abs(target - displayPercent) > 0.5) {
      const timer = setTimeout(() => {
        setDisplayPercent((prev) => prev + step);
      }, 50);
      return () => clearTimeout(timer);
    }
    setDisplayPercent(target);
    return undefined;
  }, [progress.percentComplete, isComplete, displayPercent]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-base">Execution Progress</CardTitle>
          </div>
          {isComplete ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          ) : isError ? (
            <Badge
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              Error
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-purple-200 bg-purple-50 text-purple-700"
            >
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Running
            </Badge>
          )}
        </div>
        <CardDescription>
          {isComplete
            ? 'Task completed successfully'
            : isError
            ? 'Task encountered an error'
            : 'Real-time execution tracking'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <StepCounter current={progress.currentStep} total={progress.totalSteps} />
            <span className="text-lg font-bold text-purple-600">
              {Math.round(displayPercent)}%
            </span>
          </div>
          <Progress
            value={displayPercent}
            className="h-3"
            aria-label={`Progress: ${Math.round(displayPercent)}%`}
          />
        </div>

        {/* Time Estimates */}
        <TimeEstimate
          elapsed={progress.elapsedTime}
          remaining={progress.estimatedTimeRemaining}
          confidence={progress.confidence}
        />

        {/* Current Action */}
        <CurrentActionDisplay action={progress.currentAction} />

        {/* Phase Timeline */}
        {phases.length > 0 && (
          <PhaseTimeline phases={phases} currentPhase={progress.currentPhase} />
        )}

        {/* Confidence Indicator */}
        {progress.confidence !== undefined && !isComplete && (
          <ConfidenceIndicator confidence={progress.confidence} />
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// COMPACT VARIANT
// ========================================

interface CompactProgressProps {
  progress: ProgressData;
  className?: string;
}

export function CompactProgress({ progress, className = '' }: CompactProgressProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {progress.currentAction}
          </span>
          <span className="text-xs font-medium text-purple-600">
            {Math.round(progress.percentComplete)}%
          </span>
        </div>
        <Progress value={progress.percentComplete} className="h-1.5" />
      </div>
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDuration(progress.estimatedTimeRemaining)} left
      </div>
    </div>
  );
}

// ========================================
// HOOK FOR SSE INTEGRATION
// ========================================

export function useProgressFromSSE(executionId: string): {
  progress: ProgressData | null;
  isConnected: boolean;
} {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!executionId) return;

    const eventSource = new EventSource(`/api/agent/executions/${executionId}/events`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener('progress', (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress({
          currentStep: data.currentStep,
          totalSteps: data.totalSteps,
          percentComplete: data.percentComplete,
          elapsedTime: data.elapsedTime,
          estimatedTimeRemaining: data.estimatedTimeRemaining,
          currentAction: data.currentAction,
          currentPhase: data.currentPhase,
          confidence: data.confidence,
        });
      } catch (e) {
        console.error('Failed to parse progress event:', e);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [executionId]);

  return { progress, isConnected };
}

export default EnhancedProgressDisplay;
