/**
 * Agent SSE Integration Example Component
 *
 * This component demonstrates how to use the Agent SSE integration
 * to display real-time updates during agent task execution.
 *
 * Features demonstrated:
 * - Starting an agent execution
 * - Subscribing to real-time SSE updates
 * - Displaying execution plan and phases
 * - Showing thinking steps as they happen
 * - Tool execution tracking
 * - Error handling
 * - Cancellation
 */

import React, { useState } from 'react';
import { useAgentSSE, useAgentExecution } from '@/hooks/useAgentSSE';
import { useAgentStore } from '@/stores/agentStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Brain, Wrench } from 'lucide-react';

export function AgentSSEExample() {
  const [taskInput, setTaskInput] = useState('Create a landing page for a SaaS product');

  const {
    startExecution,
    cancelExecution,
    currentExecution,
    thinkingSteps,
    isExecuting,
    error: executionError,
  } = useAgentExecution();

  // Subscribe to SSE updates for current execution
  useAgentSSE({ autoConnect: false, sessionId: currentExecution?.id });

  const handleStart = async () => {
    if (!taskInput.trim()) {
      alert('Please enter a task description');
      return;
    }

    const executionId = await startExecution(taskInput, {
      timestamp: new Date().toISOString(),
    });

    if (executionId) {
      console.log('Started execution:', executionId);
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this execution?')) {
      await cancelExecution();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-blue-500';
      case 'executing':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getPhaseStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'thinking':
        return <Brain className="h-4 w-4 text-purple-500" />;
      case 'tool_use':
      case 'tool_result':
        return <Wrench className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent SSE Integration Demo</CardTitle>
          <CardDescription>
            Watch agent execution in real-time with Server-Sent Events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Task Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter task description..."
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              disabled={isExecuting}
              className="flex-1"
            />
            <Button
              onClick={handleStart}
              disabled={isExecuting || !taskInput.trim()}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                'Start Agent'
              )}
            </Button>
            {isExecuting && (
              <Button variant="destructive" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>

          {/* Error Display */}
          {executionError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900">Error</h4>
                  <p className="text-red-700">{executionError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Execution Status */}
          {currentExecution && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge className={getStatusColor(currentExecution.status)}>
                  {currentExecution.status}
                </Badge>
                {currentExecution.metadata?.duration && (
                  <span className="text-sm text-gray-500">
                    Duration: {(currentExecution.metadata.duration / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              {/* Task Description */}
              <div>
                <h4 className="text-sm font-semibold mb-1">Task</h4>
                <p className="text-sm text-gray-600">{currentExecution.task}</p>
              </div>

              {/* Execution Plan */}
              {currentExecution.plan && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Plan</h4>
                  <div className="space-y-2">
                    {currentExecution.plan.phases.map((phase, idx) => (
                      <div
                        key={phase.id}
                        className={`p-3 rounded-lg border ${
                          phase.status === 'in_progress'
                            ? 'border-blue-300 bg-blue-50'
                            : phase.status === 'completed'
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {getPhaseStatusIcon(phase.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-medium">
                                Phase {idx + 1}: {phase.name}
                              </h5>
                              {phase.progress !== undefined && (
                                <span className="text-xs text-gray-500">
                                  {phase.progress}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {phase.description}
                            </p>
                            {phase.steps && phase.steps.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {phase.steps.map((step, stepIdx) => (
                                  <li
                                    key={stepIdx}
                                    className="text-xs text-gray-600 flex items-center gap-2"
                                  >
                                    <div className="h-1 w-1 rounded-full bg-gray-400" />
                                    {step}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thinking Steps */}
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  Real-time Activity ({thinkingSteps.length} steps)
                </h4>
                <ScrollArea className="h-[400px] rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="space-y-3">
                    {thinkingSteps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        {getStepIcon(step.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {step.type}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {step.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-gray-700 break-words">
                            {step.content}
                          </p>
                          {step.toolName && (
                            <div className="mt-1 text-xs text-gray-500">
                              Tool: <code className="font-mono">{step.toolName}</code>
                            </div>
                          )}
                          {step.toolParams && (
                            <details className="mt-1">
                              <summary className="text-xs text-blue-600 cursor-pointer">
                                View parameters
                              </summary>
                              <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                                {JSON.stringify(step.toolParams, null, 2)}
                              </pre>
                            </details>
                          )}
                          {step.toolResult && (
                            <details className="mt-1">
                              <summary className="text-xs text-green-600 cursor-pointer">
                                View result
                              </summary>
                              <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-x-auto">
                                {JSON.stringify(step.toolResult, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                    {thinkingSteps.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No activity yet. Start an execution to see real-time updates.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Result */}
              {currentExecution.result && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Result</h4>
                  <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(currentExecution.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {!currentExecution && (
            <div className="text-center py-12 text-gray-500">
              <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No active execution. Start a task to see real-time updates.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-gray-600">
          <p>
            This component demonstrates the complete Agent SSE integration:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Uses <code>useAgentExecution()</code> hook to control execution</li>
            <li>Uses <code>useAgentSSE(executionId)</code> hook to subscribe to real-time updates</li>
            <li>Displays execution plan with phases and progress</li>
            <li>Shows thinking steps, tool usage, and results in real-time</li>
            <li>Handles errors and cancellation</li>
            <li>All state managed through <code>agentStore</code></li>
          </ul>
          <p className="mt-4">
            The SSE connection is automatically managed - it connects when an execution
            starts and disconnects when complete or cancelled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
