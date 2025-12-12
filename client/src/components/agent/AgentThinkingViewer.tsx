import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, XCircle } from 'lucide-react';
import { ExecutionHeader } from './ExecutionHeader';
import { PlanDisplay } from './PlanDisplay';
import { ThinkingStepCard } from './ThinkingStepCard';
import type { AgentExecution, ThinkingStep } from '@/types/agent';

interface AgentThinkingViewerProps {
  execution: AgentExecution | null;
  thinkingSteps: ThinkingStep[];
  isExecuting: boolean;
  onCancel?: () => void;
}

export function AgentThinkingViewer({
  execution,
  thinkingSteps,
  isExecuting,
  onCancel
}: AgentThinkingViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new steps are added
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thinkingSteps.length]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Execution header with status */}
          <ExecutionHeader execution={execution} isExecuting={isExecuting} />

          {/* Plan display */}
          {execution?.plan && (
            <PlanDisplay plan={execution.plan} />
          )}

          {/* Thinking steps */}
          {thinkingSteps.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Execution Log
              </h3>
              {thinkingSteps.map((step) => (
                <ThinkingStepCard key={step.id} step={step} />
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {isExecuting && (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Agent is thinking...</span>
            </div>
          )}

          {/* Empty state */}
          {!execution && thinkingSteps.length === 0 && !isExecuting && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to Execute
              </h3>
              <p className="text-sm text-gray-600">
                Submit a task above to start an agent execution
              </p>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Cancel button */}
      {isExecuting && onCancel && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="destructive"
              onClick={onCancel}
              className="w-full"
            >
              <XCircle className="w-4 h-4" />
              Cancel Execution
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
