/**
 * Reasoning Chain Component
 *
 * Displays structured reasoning steps from the agent.
 * Shows thought process, evidence, hypotheses, decisions, and alternatives.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  Lightbulb,
  Target,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
} from 'lucide-react';

export interface ReasoningStep {
  step: number;
  thought: string;
  evidence: string[];
  hypothesis: string;
  decision: string;
  alternatives: string[];
  confidence: number; // 0-1
  timestamp?: string;
}

interface ReasoningChainProps {
  steps: ReasoningStep[];
  className?: string;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);

  let color = 'bg-gray-100 text-gray-700 border-gray-200';
  let icon = <AlertCircle className="h-3 w-3" />;

  if (confidence >= 0.8) {
    color = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    icon = <CheckCircle2 className="h-3 w-3" />;
  } else if (confidence >= 0.6) {
    color = 'bg-blue-100 text-blue-700 border-blue-200';
    icon = <TrendingUp className="h-3 w-3" />;
  } else if (confidence >= 0.4) {
    color = 'bg-amber-100 text-amber-700 border-amber-200';
    icon = <AlertCircle className="h-3 w-3" />;
  }

  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 ${color}`}>
      {icon}
      {percentage}% confident
    </Badge>
  );
}

function ReasoningStepCard({ step, isLatest }: { step: ReasoningStep; isLatest: boolean }) {
  return (
    <div
      className={`group relative rounded-lg border transition-all ${
        isLatest
          ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {/* Step indicator */}
      <div className="absolute -left-3 top-6 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white shadow-sm">
        {step.step}
      </div>

      <div className="p-4 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Brain className="h-4 w-4 text-purple-600 shrink-0" />
            <h4 className="text-sm font-semibold text-foreground">Reasoning Step {step.step}</h4>
          </div>
          <ConfidenceBadge confidence={step.confidence} />
        </div>

        {/* Thought */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-muted-foreground">Thought</span>
          </div>
          <p className="text-sm text-foreground pl-5">{step.thought}</p>
        </div>

        {/* Evidence */}
        {step.evidence.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">Evidence</span>
            </div>
            <ul className="space-y-1 pl-5">
              {step.evidence.map((item, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Hypothesis */}
        {step.hypothesis && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-xs font-medium text-muted-foreground">Hypothesis</span>
            </div>
            <p className="text-sm text-foreground pl-5 italic">{step.hypothesis}</p>
          </div>
        )}

        {/* Decision */}
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Decision</span>
          </div>
          <p className="text-sm text-emerald-900 pl-5 font-medium">{step.decision}</p>
        </div>

        {/* Alternatives */}
        {step.alternatives.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="h-3.5 w-3.5 text-gray-600" />
              <span className="text-xs font-medium text-muted-foreground">Alternatives Considered</span>
            </div>
            <ul className="space-y-1 pl-5">
              {step.alternatives.map((alt, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">→</span>
                  <span>{alt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp */}
        {step.timestamp && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-muted-foreground">
              {new Date(step.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReasoningChain({ steps, className = '' }: ReasoningChainProps) {
  if (steps.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Reasoning Chain
          </CardTitle>
          <CardDescription>
            Agent's thought process and decision-making
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No reasoning steps yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Structured reasoning will appear here during execution
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Reasoning Chain
            </CardTitle>
            <CardDescription>
              {steps.length} reasoning step{steps.length !== 1 ? 's' : ''} recorded
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4 relative">
            {/* Connection line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-purple-200 via-purple-300 to-transparent" />

            {steps.map((step, idx) => (
              <ReasoningStepCard
                key={step.step}
                step={step}
                isLatest={idx === steps.length - 1}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
