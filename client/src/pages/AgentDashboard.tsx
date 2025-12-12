import React, { useEffect, useState } from 'react';
import { useAgentStore } from '@/stores/agentStore';
import {
  AgentThinkingViewer,
  ExecutionHistory,
  TaskInput
} from '@/components/agent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

export function AgentDashboard() {
  const {
    currentExecution,
    thinkingSteps,
    isExecuting,
    startExecution,
    cancelExecution,
    clearCurrentExecution,
    loadExecutionHistory
  } = useAgentStore();

  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  // Load execution history on mount
  useEffect(() => {
    loadExecutionHistory();
  }, [loadExecutionHistory]);

  // Update selected execution ID when current execution changes
  useEffect(() => {
    if (currentExecution) {
      setSelectedExecutionId(currentExecution.id);
    }
  }, [currentExecution]);

  const handleSubmitTask = async (task: string) => {
    await startExecution(task);
  };

  const handleCancelExecution = async () => {
    await cancelExecution();
  };

  const handleNewExecution = () => {
    clearCurrentExecution();
    setSelectedExecutionId(null);
  };

  const handleSelectExecution = (executionId: string) => {
    setSelectedExecutionId(executionId);
    // Load the selected execution
    useAgentStore.getState().loadExecution(executionId);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with execution history */}
      <aside className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900">Agent Dashboard</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => loadExecutionHistory()}
              title="Refresh history"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <Button
            onClick={handleNewExecution}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4" />
            New Execution
          </Button>
        </div>

        <ExecutionHistory
          onSelectExecution={handleSelectExecution}
          selectedExecutionId={selectedExecutionId}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Task input */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <TaskInput
            onSubmit={handleSubmitTask}
            isLoading={isExecuting}
            disabled={isExecuting}
          />
        </div>

        {/* Thinking visualization */}
        <div className="flex-1 overflow-hidden">
          <AgentThinkingViewer
            execution={currentExecution}
            thinkingSteps={thinkingSteps}
            isExecuting={isExecuting}
            onCancel={handleCancelExecution}
          />
        </div>
      </main>

      {/* Right panel - Active project preview (future feature) */}
      <aside className="hidden xl:block w-96 border-l border-gray-200 bg-white">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-sm">Active Project</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-center text-gray-500 py-12">
              <p className="text-sm">No active project</p>
              <p className="text-xs mt-1">
                Start a webdev task to see live preview
              </p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
