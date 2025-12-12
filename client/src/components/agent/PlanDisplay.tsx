import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentPlan } from '@/types/agent';

interface PlanDisplayProps {
  plan: AgentPlan;
}

export function PlanDisplay({ plan }: PlanDisplayProps) {
  const currentPhaseIndex = plan.currentPhase ?? 0;

  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardHeader>
        <CardTitle className="text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Execution Plan
          {plan.estimatedDuration && (
            <span className="text-sm font-normal text-emerald-600">
              (Est. {plan.estimatedDuration})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {plan.phases.map((phase, index) => {
          const isCompleted = phase.status === 'completed';
          const isInProgress = phase.status === 'in_progress';
          const isCurrent = index === currentPhaseIndex;
          const progress = phase.progress ?? 0;

          return (
            <div
              key={phase.id}
              className={cn(
                'rounded-lg border p-3 transition-all',
                isCompleted && 'bg-emerald-50 border-emerald-200',
                isInProgress && 'bg-blue-50 border-blue-200 shadow-sm',
                !isCompleted && !isInProgress && 'bg-white border-gray-200'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'mt-0.5',
                  isCompleted && 'text-emerald-600',
                  isInProgress && 'text-blue-600',
                  !isCompleted && !isInProgress && 'text-gray-400'
                )}>
                  {isCompleted && <CheckCircle2 className="w-5 h-5" />}
                  {isInProgress && <Loader2 className="w-5 h-5 animate-spin" />}
                  {!isCompleted && !isInProgress && <Circle className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn(
                      'font-semibold text-sm',
                      isCompleted && 'text-emerald-900',
                      isInProgress && 'text-blue-900',
                      !isCompleted && !isInProgress && 'text-gray-700'
                    )}>
                      Phase {index + 1}: {phase.name}
                    </h4>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded">
                        CURRENT
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 mb-2">
                    {phase.description}
                  </p>

                  {phase.steps && phase.steps.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {phase.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="text-gray-400">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {isInProgress && (
                    <div className="space-y-1">
                      <Progress value={progress} className="h-2" />
                      <div className="text-xs text-gray-600 text-right">
                        {progress}%
                      </div>
                    </div>
                  )}

                  {phase.status === 'failed' && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      Phase failed
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
