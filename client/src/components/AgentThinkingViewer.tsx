import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Loader2, CheckCircle2, XCircle, Wrench } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * Agent Thinking Viewer Component
 * 
 * Displays real-time agent thinking steps with:
 * - Thinking bubbles showing reasoning
 * - Tool usage indicators
 * - Result visualization
 * - Progress tracking
 * 
 * Manus-style UI with mobile-responsive design
 */

interface ThinkingStep {
  timestamp: Date;
  phase: string;
  thought: string;
  toolUsed?: string;
  result?: any;
}

interface AgentThinkingViewerProps {
  thinkingSteps: ThinkingStep[];
  currentPhase?: string;
  isExecuting: boolean;
}

export function AgentThinkingViewer({
  thinkingSteps,
  currentPhase,
  isExecuting,
}: AgentThinkingViewerProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Agent Thinking</CardTitle>
          </div>
          {isExecuting && (
            <Badge variant="default" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Executing
            </Badge>
          )}
        </div>
        {currentPhase && (
          <CardDescription>Current Phase: {currentPhase}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {thinkingSteps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Brain className="h-12 w-12 mb-4 opacity-50" />
                <p>No thinking steps yet</p>
                <p className="text-sm">Agent will start thinking soon...</p>
              </div>
            ) : (
              thinkingSteps.map((step, index) => (
                <ThinkingStepCard key={index} step={step} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ThinkingStepCard({ step }: { step: ThinkingStep }) {
  const getStepIcon = () => {
    if (step.toolUsed) {
      return <Wrench className="h-4 w-4" />;
    }
    if (step.result) {
      return step.result.success !== false ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      );
    }
    return <Brain className="h-4 w-4" />;
  };

  const getStepColor = () => {
    if (step.toolUsed) return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
    if (step.result) {
      return step.result.success !== false
        ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
        : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
    }
    return "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800";
  };

  return (
    <div className={`p-4 rounded-lg border ${getStepColor()} transition-all duration-200`}>
      <div className="flex items-start gap-3">
        <div className="mt-1">{getStepIcon()}</div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs">
              {step.phase}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(step.timestamp), { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-sm leading-relaxed">{step.thought}</p>
          
          {step.toolUsed && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wrench className="h-3 w-3" />
              <span>Tool: {step.toolUsed}</span>
            </div>
          )}
          
          {step.result && (
            <div className="mt-2 p-2 bg-background/50 rounded border text-xs font-mono">
              <pre className="whitespace-pre-wrap">
                {typeof step.result === "string"
                  ? step.result
                  : JSON.stringify(step.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for mobile or sidebar
 */
export function AgentThinkingCompact({
  thinkingSteps,
  isExecuting,
}: Omit<AgentThinkingViewerProps, "currentPhase">) {
  const latestStep = thinkingSteps[thinkingSteps.length - 1];

  if (!latestStep && !isExecuting) {
    return null;
  }

  return (
    <div className="p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-start gap-2">
        {isExecuting ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary mt-0.5" />
        ) : (
          <Brain className="h-4 w-4 text-primary mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1">
            {isExecuting ? "Thinking..." : "Latest Thought"}
          </p>
          {latestStep && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {latestStep.thought}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
