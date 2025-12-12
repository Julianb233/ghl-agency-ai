# Quick Integration Example

## Complete Example: Agent Execution with Real-Time Updates

### 1. React Component (Client)

\`\`\`tsx
// client/src/pages/AgentExecutionPage.tsx
import { useState } from 'react';
import { useAgentExecution, useAgentSSE } from '@/hooks/useAgentSSE';

export function AgentExecutionPage() {
  const [taskInput, setTaskInput] = useState('');
  const {
    startExecution,
    cancelExecution,
    currentExecution,
    thinkingSteps,
    isExecuting,
    error,
  } = useAgentExecution();

  // Auto-connect to SSE when execution starts
  useAgentSSE(currentExecution?.id);

  const handleStart = async () => {
    const executionId = await startExecution(taskInput, {
      context: 'landing page',
      style: 'modern',
    });

    if (executionId) {
      console.log('Started execution:', executionId);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Agent Execution</h1>

      {/* Input Section */}
      <div className="mb-8">
        <textarea
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder="Describe what you want the agent to do..."
          className="w-full p-4 border rounded-lg"
          rows={4}
          disabled={isExecuting}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleStart}
            disabled={isExecuting || !taskInput}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {isExecuting ? 'Executing...' : 'Start Agent'}
          </button>
          <button
            onClick={cancelExecution}
            disabled={!isExecuting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Current Execution */}
      {currentExecution && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Status: {currentExecution.status}
          </h2>

          {/* Plan Display */}
          {currentExecution.plan && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Execution Plan</h3>
              <div className="space-y-2">
                {currentExecution.plan.phases.map((phase, idx) => (
                  <div
                    key={phase.id}
                    className={`p-4 border rounded-lg ${
                      phase.status === 'in_progress'
                        ? 'border-blue-500 bg-blue-50'
                        : phase.status === 'completed'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>
                          Phase {idx + 1}: {phase.name}
                        </strong>
                        <p className="text-sm text-gray-600">{phase.description}</p>
                      </div>
                      <div>
                        {phase.status === 'completed' && '✅'}
                        {phase.status === 'in_progress' && '⏳'}
                        {phase.status === 'pending' && '⏸️'}
                      </div>
                    </div>
                    {phase.progress !== undefined && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${phase.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thinking Steps */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Activity Log</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {thinkingSteps.map((step) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg ${
                    step.type === 'thinking'
                      ? 'bg-purple-50 border border-purple-200'
                      : step.type === 'tool_use'
                      ? 'bg-blue-50 border border-blue-200'
                      : step.type === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-xs font-semibold uppercase text-gray-600">
                        {step.type}
                      </span>
                      <p className="mt-1">{step.content}</p>
                      {step.toolName && (
                        <span className="text-sm text-gray-600">
                          Tool: {step.toolName}
                        </span>
                      )}
                    </div>
                    <time className="text-xs text-gray-500">
                      {step.timestamp.toLocaleTimeString()}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
\`\`\`

### 2. Server Integration (Agent Orchestrator)

\`\`\`typescript
// server/services/agentOrchestrator.service.ts
import { AgentSSEEmitter } from '../_core/agent-sse-events';
import Anthropic from '@anthropic-ai/sdk';

export async function executeAgentTask(
  userId: number,
  executionId: number,
  taskDescription: string,
  context?: Record<string, unknown>
) {
  const emitter = new AgentSSEEmitter(userId, executionId.toString());

  try {
    // 1. Start execution
    emitter.executionStarted({
      task: taskDescription,
      startedAt: new Date(),
    });

    // 2. Create plan
    const plan = await createExecutionPlan(taskDescription);
    emitter.planCreated({
      plan: {
        goal: taskDescription,
        phases: plan.phases,
        estimatedDuration: '10 minutes',
      },
    });

    // 3. Execute each phase
    for (const [idx, phase] of plan.phases.entries()) {
      emitter.phaseStart({
        phaseId: phase.id,
        phaseName: phase.name,
        phaseIndex: idx,
      });

      // Execute phase with Claude
      await executePhase(phase, emitter);

      emitter.phaseComplete({
        phaseId: phase.id,
        phaseName: phase.name,
        phaseIndex: idx,
      });
    }

    // 4. Complete
    emitter.executionComplete({
      result: {
        success: true,
        message: 'Task completed successfully',
      },
      duration: Date.now() - startTime,
    });

  } catch (error) {
    emitter.executionError({
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function executePhase(phase: any, emitter: AgentSSEEmitter) {
  const anthropic = new Anthropic();

  // Start thinking
  emitter.thinking({
    thought: `Starting phase: ${phase.name}`,
  });

  // Use Claude with tools
  const response = await anthropic.messages.create({
    model: 'claude-opus-4',
    max_tokens: 4096,
    tools: [
      {
        name: 'create_file',
        description: 'Create a new file',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['path', 'content'],
        },
      },
    ],
    messages: [
      {
        role: 'user',
        content: phase.description,
      },
    ],
  });

  // Process tool calls
  for (const content of response.content) {
    if (content.type === 'tool_use') {
      emitter.toolStart({
        toolName: content.name,
        params: content.input,
      });

      const result = await executeTool(content.name, content.input);

      emitter.toolComplete({
        toolName: content.name,
        result,
      });
    } else if (content.type === 'text') {
      emitter.thinking({
        thought: content.text,
      });
    }
  }
}

async function createExecutionPlan(task: string) {
  return {
    phases: [
      {
        id: 'phase-1',
        name: 'Requirements Analysis',
        description: 'Analyze task requirements and dependencies',
      },
      {
        id: 'phase-2',
        name: 'Implementation',
        description: 'Implement the solution',
      },
      {
        id: 'phase-3',
        name: 'Verification',
        description: 'Verify the implementation',
      },
    ],
  };
}

async function executeTool(toolName: string, params: any) {
  // Implement tool execution
  if (toolName === 'create_file') {
    // Create file logic
    return { success: true, path: params.path };
  }
  return { success: false };
}
\`\`\`

### 3. API Route Setup

Make sure the SSE routes are registered in your main server file:

\`\`\`typescript
// server/_core/index.ts or server/index.ts
import { registerSSERoutes } from './_core/sse-routes';

// ... other setup

// Register SSE routes
registerSSERoutes(app);

// ... rest of setup
\`\`\`

### 4. Testing the Integration

\`\`\`bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Test SSE endpoint
curl -N -H "Cookie: your-session-cookie" \\
  http://localhost:3000/api/agent/stream/12345

# In browser console:
const { startExecution } = useAgentStore.getState();
const id = await startExecution('Create a landing page');
console.log('Execution ID:', id);
\`\`\`

## That's It!

You now have:
- ✅ Real-time agent execution streaming
- ✅ Multi-phase plan visualization
- ✅ Tool usage tracking
- ✅ Type-safe event system
- ✅ Automatic reconnection
- ✅ Full TypeScript support
