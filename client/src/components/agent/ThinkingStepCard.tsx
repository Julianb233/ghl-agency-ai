import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Clock, AlertCircle, CheckCircle2, Cpu, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThinkingStep } from '@/types/agent';

interface ThinkingStepCardProps {
  step: ThinkingStep;
}

export function ThinkingStepCard({ step }: ThinkingStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStepIcon = () => {
    switch (step.type) {
      case 'thinking':
        return <Cpu className="w-4 h-4" />;
      case 'tool_use':
        return <Wrench className="w-4 h-4" />;
      case 'tool_result':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'plan':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStepColor = () => {
    switch (step.type) {
      case 'thinking':
        return 'border-blue-200 bg-blue-50';
      case 'tool_use':
        return 'border-purple-200 bg-purple-50';
      case 'tool_result':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'plan':
        return 'border-emerald-200 bg-emerald-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTextColor = () => {
    switch (step.type) {
      case 'thinking':
        return 'text-blue-700';
      case 'tool_use':
        return 'text-purple-700';
      case 'tool_result':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'plan':
        return 'text-emerald-700';
      default:
        return 'text-gray-700';
    }
  };

  const hasDetails = step.toolParams || step.toolResult || step.metadata;

  return (
    <Card className={cn('border-l-4 transition-all', getStepColor())}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5', getTextColor())}>
            {getStepIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs font-bold uppercase tracking-wide', getTextColor())}>
                {step.type === 'tool_use' && step.toolName
                  ? `Tool: ${step.toolName}`
                  : step.type.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-500">
                {step.timestamp.toLocaleTimeString()}
              </span>
            </div>

            <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
              {step.content}
            </div>

            {hasDetails && (
              <>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 mt-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  {isExpanded ? 'Hide details' : 'Show details'}
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    {step.toolParams && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-xs font-semibold text-gray-500 mb-1">
                          Parameters:
                        </div>
                        <pre className="text-xs text-gray-700 overflow-x-auto">
                          {JSON.stringify(step.toolParams, null, 2)}
                        </pre>
                      </div>
                    )}

                    {step.toolResult && (
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-xs font-semibold text-gray-500 mb-1">
                          Result:
                        </div>
                        <pre className="text-xs text-gray-700 overflow-x-auto max-h-64 overflow-y-auto">
                          {typeof step.toolResult === 'string'
                            ? step.toolResult
                            : JSON.stringify(step.toolResult, null, 2)}
                        </pre>
                      </div>
                    )}

                    {step.metadata?.duration && (
                      <div className="text-xs text-gray-600">
                        Duration: {step.metadata.duration}ms
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
