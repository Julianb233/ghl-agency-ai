/**
 * Enhanced Reasoning Display Component
 *
 * World-class reasoning visibility with:
 * - Real-time thought streaming
 * - Confidence indicators with visual gauges
 * - Decision explanation overlays
 * - Alternative options display
 * - Evidence linking
 * - Collapsible reasoning chains
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Brain,
  Lightbulb,
  Target,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
  Scale,
  Info,
  Eye,
  MessageSquare,
  Loader2,
} from 'lucide-react';

// ========================================
// TYPES
// ========================================

export interface ReasoningStep {
  id: string;
  step: number;
  thought: string;
  evidence: string[];
  hypothesis: string;
  decision: string;
  alternatives: string[];
  confidence: number; // 0-1
  timestamp: string;
  executionTime?: number;
  toolsConsidered?: string[];
  contextUsed?: string[];
}

export interface ThinkingStream {
  id: string;
  content: string;
  timestamp: string;
  isComplete: boolean;
}

interface EnhancedReasoningDisplayProps {
  steps: ReasoningStep[];
  currentThinking?: ThinkingStream;
  overallConfidence?: number;
  className?: string;
  showDetails?: boolean;
  onStepClick?: (step: ReasoningStep) => void;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function getConfidenceColor(confidence: number): {
  text: string;
  bg: string;
  border: string;
  fill: string;
} {
  if (confidence >= 0.8) {
    return {
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      fill: 'bg-emerald-500',
    };
  }
  if (confidence >= 0.6) {
    return {
      text: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      fill: 'bg-blue-500',
    };
  }
  if (confidence >= 0.4) {
    return {
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      fill: 'bg-amber-500',
    };
  }
  return {
    text: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    fill: 'bg-gray-400',
  };
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Good';
  if (confidence >= 0.4) return 'Moderate';
  if (confidence >= 0.2) return 'Low';
  return 'Very Low';
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ========================================
// CONFIDENCE GAUGE COMPONENT
// ========================================

interface ConfidenceGaugeProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

function ConfidenceGauge({
  confidence,
  size = 'md',
  showLabel = true,
  animate = true,
}: ConfidenceGaugeProps) {
  const colors = getConfidenceColor(confidence);
  const percentage = Math.round(confidence * 100);

  const sizeClasses = {
    sm: { gauge: 'w-12 h-12', text: 'text-xs' },
    md: { gauge: 'w-16 h-16', text: 'text-sm' },
    lg: { gauge: 'w-20 h-20', text: 'text-base' },
  };

  const circumference = 2 * Math.PI * 18; // radius = 18
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (confidence * circumference);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${sizeClasses[size].gauge}`}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
          {/* Background circle */}
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className={colors.text}
            style={{
              strokeDasharray,
              strokeDashoffset,
              transition: animate ? 'stroke-dashoffset 0.5s ease-out' : 'none',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${sizeClasses[size].text} ${colors.text}`}>
            {percentage}%
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={`${sizeClasses[size].text} text-muted-foreground`}>
          {getConfidenceLabel(confidence)}
        </span>
      )}
    </div>
  );
}

// ========================================
// THINKING STREAM COMPONENT
// ========================================

interface ThinkingStreamDisplayProps {
  stream: ThinkingStream;
}

function ThinkingStreamDisplay({ stream }: ThinkingStreamDisplayProps) {
  const [displayedText, setDisplayedText] = useState('');
  const textRef = useRef(stream.content);

  useEffect(() => {
    textRef.current = stream.content;
    if (stream.isComplete) {
      setDisplayedText(stream.content);
      return;
    }

    // Streaming animation
    let index = displayedText.length;
    const interval = setInterval(() => {
      if (index < textRef.current.length) {
        setDisplayedText(textRef.current.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [stream.content, stream.isComplete]);

  return (
    <div className="relative p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
      {/* Thinking indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Brain className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">Thinking...</span>
        </div>
        {!stream.isComplete && (
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* Streamed text */}
      <p className="text-sm text-foreground leading-relaxed">
        {displayedText}
        {!stream.isComplete && (
          <span className="inline-block w-2 h-4 bg-purple-600 ml-0.5 animate-pulse" />
        )}
      </p>

      {/* Timestamp */}
      <div className="mt-2 text-xs text-muted-foreground">
        {formatTime(stream.timestamp)}
      </div>
    </div>
  );
}

// ========================================
// REASONING STEP CARD COMPONENT
// ========================================

interface ReasoningStepCardProps {
  step: ReasoningStep;
  isLatest: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onClick?: () => void;
}

function ReasoningStepCard({
  step,
  isLatest,
  isExpanded,
  onToggle,
  onClick,
}: ReasoningStepCardProps) {
  const colors = getConfidenceColor(step.confidence);

  return (
    <div
      className={`group relative rounded-lg border transition-all cursor-pointer ${
        isLatest
          ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-sm'
          : `${colors.border} ${colors.bg} hover:shadow-sm`
      }`}
      onClick={onClick}
    >
      {/* Step number indicator */}
      <div
        className={`absolute -left-3 top-6 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${
          isLatest ? 'bg-purple-600' : colors.fill
        }`}
      >
        {step.step}
      </div>

      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="p-4 pl-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Brain className="h-4 w-4 text-purple-600 shrink-0" />
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {step.thought.substring(0, 60)}
                  {step.thought.length > 60 ? '...' : ''}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ConfidenceGauge confidence={step.confidence} size="sm" showLabel={false} />
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Decision preview */}
            <div className="mt-2 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {step.decision.substring(0, 80)}
                {step.decision.length > 80 ? '...' : ''}
              </span>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pl-6 space-y-4 border-t border-gray-100 pt-4">
            {/* Full Thought */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-muted-foreground">Full Thought</span>
              </div>
              <p className="text-sm text-foreground pl-5">{step.thought}</p>
            </div>

            {/* Evidence */}
            {step.evidence.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Evidence ({step.evidence.length})
                  </span>
                </div>
                <ul className="space-y-1 pl-5">
                  {step.evidence.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hypothesis */}
            {step.hypothesis && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Target className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-xs font-medium text-muted-foreground">Hypothesis</span>
                </div>
                <p className="text-sm text-foreground pl-5 italic">{step.hypothesis}</p>
              </div>
            )}

            {/* Decision (Full) */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">Decision</span>
              </div>
              <p className="text-sm text-emerald-900 pl-5 font-medium">{step.decision}</p>
            </div>

            {/* Alternatives */}
            {step.alternatives.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-gray-600" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Alternatives Considered ({step.alternatives.length})
                  </span>
                </div>
                <ul className="space-y-1 pl-5">
                  {step.alternatives.map((alt, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-gray-400 shrink-0">→</span>
                      <span>{alt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tools & Context */}
            {(step.toolsConsidered?.length || step.contextUsed?.length) && (
              <div className="flex flex-wrap gap-2">
                {step.toolsConsidered?.map((tool) => (
                  <Badge key={tool} variant="outline" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    {tool}
                  </Badge>
                ))}
                {step.contextUsed?.map((ctx) => (
                  <Badge key={ctx} variant="secondary" className="text-xs">
                    <Info className="h-3 w-3 mr-1" />
                    {ctx}
                  </Badge>
                ))}
              </div>
            )}

            {/* Timestamp & Execution Time */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs text-muted-foreground">
                {formatTime(step.timestamp)}
              </span>
              {step.executionTime && (
                <span className="text-xs text-muted-foreground">
                  Took {step.executionTime}ms
                </span>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ========================================
// OVERALL CONFIDENCE PANEL
// ========================================

interface OverallConfidencePanelProps {
  confidence: number;
  stepsCount: number;
  averageStepConfidence: number;
}

function OverallConfidencePanel({
  confidence,
  stepsCount,
  averageStepConfidence,
}: OverallConfidencePanelProps) {
  const colors = getConfidenceColor(confidence);

  return (
    <div className={`p-4 rounded-lg ${colors.bg} ${colors.border} border`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`text-sm font-semibold ${colors.text}`}>
            Overall Confidence
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Based on {stepsCount} reasoning steps
          </p>
        </div>
        <ConfidenceGauge confidence={confidence} size="lg" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Average step confidence</span>
          <span className={`font-medium ${colors.text}`}>
            {Math.round(averageStepConfidence * 100)}%
          </span>
        </div>
        <Progress
          value={averageStepConfidence * 100}
          className="h-1.5"
        />
      </div>
    </div>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export function EnhancedReasoningDisplay({
  steps,
  currentThinking,
  overallConfidence,
  className = '',
  showDetails = true,
  onStepClick,
}: EnhancedReasoningDisplayProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-expand latest step
  useEffect(() => {
    if (steps.length > 0) {
      const latestStep = steps[steps.length - 1];
      setExpandedSteps((prev) => new Set([...Array.from(prev), latestStep.id]));
    }
  }, [steps]);

  // Auto-scroll to bottom when new content appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, currentThinking]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const averageConfidence = steps.length > 0
    ? steps.reduce((acc, s) => acc + s.confidence, 0) / steps.length
    : 0;

  const effectiveOverallConfidence = overallConfidence ?? averageConfidence;

  // Empty state
  if (steps.length === 0 && !currentThinking) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Agent Reasoning
          </CardTitle>
          <CardDescription>
            Real-time thought process and decision-making
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No reasoning steps yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The agent's thought process will appear here
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
              Agent Reasoning
            </CardTitle>
            <CardDescription>
              {steps.length} reasoning step{steps.length !== 1 ? 's' : ''} recorded
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={`${getConfidenceColor(effectiveOverallConfidence).text} ${
              getConfidenceColor(effectiveOverallConfidence).border
            } ${getConfidenceColor(effectiveOverallConfidence).bg}`}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {Math.round(effectiveOverallConfidence * 100)}% confident
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Confidence Panel */}
        {showDetails && steps.length > 0 && (
          <OverallConfidencePanel
            confidence={effectiveOverallConfidence}
            stepsCount={steps.length}
            averageStepConfidence={averageConfidence}
          />
        )}

        {/* Reasoning Steps */}
        <ScrollArea className="h-[500px] pr-4" ref={scrollRef}>
          <div className="space-y-4 relative">
            {/* Connection line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-purple-200 via-purple-300 to-transparent" />

            {steps.map((step, idx) => (
              <ReasoningStepCard
                key={step.id}
                step={step}
                isLatest={idx === steps.length - 1}
                isExpanded={expandedSteps.has(step.id)}
                onToggle={() => toggleStep(step.id)}
                onClick={() => onStepClick?.(step)}
              />
            ))}

            {/* Current thinking stream */}
            {currentThinking && (
              <ThinkingStreamDisplay stream={currentThinking} />
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ========================================
// SSE INTEGRATION HOOK
// ========================================

export function useReasoningFromSSE(executionId: string): {
  steps: ReasoningStep[];
  currentThinking: ThinkingStream | undefined;
  overallConfidence: number | undefined;
  isConnected: boolean;
} {
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [currentThinking, setCurrentThinking] = useState<ThinkingStream>();
  const [overallConfidence, setOverallConfidence] = useState<number>();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!executionId) return;

    const eventSource = new EventSource(`/api/agent/executions/${executionId}/events`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener('thinking', (event) => {
      try {
        const data = JSON.parse(event.data);
        setCurrentThinking({
          id: `thinking-${Date.now()}`,
          content: data.thought || data.content,
          timestamp: data.timestamp || new Date().toISOString(),
          isComplete: false,
        });
      } catch (e) {
        console.error('Failed to parse thinking event:', e);
      }
    });

    eventSource.addEventListener('reasoning', (event) => {
      try {
        const data = JSON.parse(event.data);
        const newStep: ReasoningStep = {
          id: `step-${data.step}-${Date.now()}`,
          step: data.step,
          thought: data.thought,
          evidence: data.evidence || [],
          hypothesis: data.hypothesis || '',
          decision: data.decision,
          alternatives: data.alternatives || [],
          confidence: data.confidence,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setSteps((prev) => [...prev, newStep]);
        setCurrentThinking(undefined);

        // Update overall confidence
        setOverallConfidence(data.confidence);
      } catch (e) {
        console.error('Failed to parse reasoning event:', e);
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

  return { steps, currentThinking, overallConfidence, isConnected };
}

export default EnhancedReasoningDisplay;
