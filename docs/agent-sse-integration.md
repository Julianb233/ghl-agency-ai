# Agent SSE Integration - Phase 5 Complete

This document describes the real-time Server-Sent Events (SSE) integration for the Agent System, providing live updates during task execution.

## Overview

The SSE integration enables real-time communication between the backend agent orchestrator and frontend clients. Clients receive live updates about:

- Execution start/completion
- Planning and phase changes
- Agent thinking steps
- Tool execution (start and completion)
- Errors and failures

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend      │         │   SSE Manager    │         │   Agent         │
│   (React)       │         │   (Express)      │         │   Orchestrator  │
├─────────────────┤         ├──────────────────┤         ├─────────────────┤
│                 │         │                  │         │                 │
│ useAgentSSE()   │────────>│ /api/agent/      │         │ executeTask()   │
│                 │  HTTP   │  stream/:id      │         │                 │
│                 │         │                  │         │                 │
│ agentStore      │<────────│ EventSource      │<────────│ SSEEmitter      │
│                 │   SSE   │ Connections      │  emit   │                 │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

## Components

### 1. Backend - SSE Manager (`server/_core/sse-manager.ts`)

Manages SSE connections and broadcasts events to connected clients.

**Key Functions:**
- `addAgentConnection(userId, executionId, response)` - Register a new SSE client
- `removeAgentConnection(userId, executionId, response)` - Remove a client connection
- `sendAgentEvent(userId, executionId, event)` - Send event to specific user's clients
- `broadcastAgentEvent(executionId, event)` - Broadcast to all clients watching an execution
- `cleanupAgentExecution(userId, executionId)` - Clean up all connections for an execution

**Event Types:**
```typescript
type AgentSSEEventType =
  | 'execution:started'
  | 'plan:created'
  | 'phase:start'
  | 'thinking'
  | 'tool:start'
  | 'tool:complete'
  | 'phase:complete'
  | 'execution:complete'
  | 'execution:error';
```

### 2. Backend - SSE Event Emitters (`server/_core/agent-sse-events.ts`)

Provides helper functions and a convenient class for emitting agent events.

**AgentSSEEmitter Class:**
```typescript
const emitter = new AgentSSEEmitter(userId, executionId);

// Emit events during execution
emitter.executionStarted({ task: 'Create landing page' });
emitter.planCreated({ plan: { goal: '...', phases: [...] } });
emitter.thinking({ thought: 'Planning the page structure...' });
emitter.toolStart({ toolName: 'create_file', params: { ... } });
emitter.toolComplete({ toolName: 'create_file', result: { ... } });
emitter.phaseComplete({ phaseId: '1', phaseName: 'Setup' });
emitter.executionComplete({ result: { success: true } });
```

### 3. Backend - SSE Routes (`server/_core/sse-routes.ts`)

Express routes for SSE endpoint with authentication.

**Endpoint:** `GET /api/agent/stream/:executionId`

**Features:**
- Authentication required (validates user owns the execution)
- Automatic heartbeat every 30 seconds
- Connection cleanup on disconnect
- Proper SSE headers and CORS configuration

### 4. Backend - Agent Orchestrator Integration (`server/services/agentOrchestrator.service.ts`)

The agent orchestrator now emits SSE events at key points:

```typescript
// Create emitter at start of execution
const emitter = this.createSSEEmitter(userId, execution.id);

// Emit execution started
emitter.executionStarted({ task: taskDescription, startedAt: new Date() });

// During agent loop:
// - Emit thinking when agent produces text
// - Emit tool:start before tool execution
// - Emit tool:complete after tool execution
// - Emit plan:created when agent creates a plan
// - Emit phase:start/phase:complete when advancing phases

// On completion
emitter.executionComplete({ result: state.context, duration });

// On error
emitter.executionError({ error: errorMessage, stack });
```

### 5. Frontend - Agent Store (`client/src/stores/agentStore.ts`)

Zustand store that manages agent state and SSE event handling.

**Key Methods:**
- `subscribeToExecution(executionId)` - Connect to SSE stream
- `unsubscribeFromExecution()` - Disconnect from SSE stream
- `handleExecutionStarted(data)` - Process execution:started event
- `handlePlanCreated(data)` - Process plan:created event
- `handleThinking(data)` - Process thinking event
- `handleToolStart(data)` - Process tool:start event
- `handleToolComplete(data)` - Process tool:complete event
- `handlePhaseStart(data)` - Process phase:start event
- `handlePhaseComplete(data)` - Process phase:complete event
- `handleExecutionComplete(data)` - Process execution:complete event
- `handleExecutionError(data)` - Process execution:error event

### 6. Frontend - useAgentSSE Hook (`client/src/hooks/useAgentSSE.ts`)

React hooks for consuming SSE streams.

**Usage:**

```tsx
import { useAgentSSE, useAgentExecution } from '@/hooks/useAgentSSE';
import { useAgentStore } from '@/stores/agentStore';

function AgentExecutionView({ executionId }: { executionId: string }) {
  // Subscribe to SSE updates
  useAgentSSE(executionId);

  // Access current state
  const { currentExecution, thinkingSteps, isExecuting } = useAgentStore();

  return (
    <div>
      <h2>{currentExecution?.task}</h2>
      <p>Status: {currentExecution?.status}</p>

      {/* Display plan phases */}
      {currentExecution?.plan && (
        <div>
          <h3>Plan</h3>
          {currentExecution.plan.phases.map((phase, idx) => (
            <div key={phase.id}>
              <span>{phase.name}</span>
              <span>{phase.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Display thinking steps in real-time */}
      <div>
        <h3>Thinking Steps</h3>
        {thinkingSteps.map(step => (
          <div key={step.id}>
            <span>{step.type}</span>
            <span>{step.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Control Execution:**

```tsx
function AgentControl() {
  const {
    startExecution,
    cancelExecution,
    currentExecution,
    isExecuting,
    error
  } = useAgentExecution();

  const handleStart = async () => {
    const executionId = await startExecution(
      'Create a landing page with hero section',
      { theme: 'modern' }
    );

    if (executionId) {
      console.log('Started execution:', executionId);
    }
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isExecuting}>
        Start Agent
      </button>
      <button onClick={cancelExecution} disabled={!isExecuting}>
        Cancel
      </button>
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## Event Flow Example

Here's a typical execution flow with SSE events:

```
1. Client calls startExecution()
   → POST /api/agent/execute
   → Returns executionId

2. Client connects to SSE stream
   → GET /api/agent/stream/:executionId
   → Connection established

3. Backend starts execution
   → Event: execution:started
   → Data: { task, startedAt }

4. Agent creates plan
   → Event: plan:created
   → Data: { plan: { goal, phases } }

5. Agent starts first phase
   → Event: phase:start
   → Data: { phaseId, phaseName, phaseIndex }

6. Agent thinks
   → Event: thinking
   → Data: { thought, iteration }

7. Agent executes tool
   → Event: tool:start
   → Data: { toolName, params }
   → Event: tool:complete
   → Data: { toolName, result, duration }

8. Agent completes phase
   → Event: phase:complete
   → Data: { phaseId, phaseName }

9. Agent starts next phase
   → Event: phase:start
   → Data: { phaseId, phaseName }

10. (Repeat steps 6-9 as needed)

11. Agent completes execution
    → Event: execution:complete
    → Data: { result, duration, tokensUsed }
    → Connection closes
```

## Error Handling

**Connection Errors:**
- Automatic reconnection with exponential backoff
- Maximum 5 reconnection attempts by default
- Visual feedback to user on connection status

**Execution Errors:**
```typescript
// Backend emits error event
emitter.executionError({
  error: 'Tool execution failed',
  stack: error.stack
});

// Frontend receives and displays
handleExecutionError(data) {
  set(state => ({
    currentExecution: {
      ...state.currentExecution,
      status: 'failed',
      error: data.error
    }
  }));
}
```

## Security

1. **Authentication:** All SSE connections require valid user authentication
2. **Authorization:** Users can only connect to their own executions
3. **Connection Isolation:** Each user's connections are isolated by userId
4. **Automatic Cleanup:** Connections are cleaned up on disconnect or completion

## Performance Considerations

1. **Connection Pooling:** Multiple clients can watch the same execution
2. **Heartbeat:** 30-second heartbeat prevents connection timeout
3. **Event Batching:** Events are sent immediately (no artificial delays)
4. **Memory Management:** Connections are cleaned up automatically
5. **Scalability:** Consider Redis pub/sub for multi-server deployments

## Testing

**Backend Test:**
```typescript
import { AgentSSEEmitter } from '../_core/agent-sse-events';

// Create emitter
const emitter = new AgentSSEEmitter(userId, executionId);

// Emit events
emitter.executionStarted({ task: 'Test task' });
emitter.thinking({ thought: 'Test thinking' });
emitter.executionComplete({ result: { success: true } });

// Check that events were sent to connected clients
```

**Frontend Test:**
```typescript
import { renderHook, act } from '@testing-library/react';
import { useAgentSSE } from '@/hooks/useAgentSSE';

test('subscribes to SSE stream', () => {
  const { result } = renderHook(() => useAgentSSE('exec-123'));

  // Simulate SSE events
  act(() => {
    // Trigger execution:started event
    // Trigger thinking event
    // etc.
  });

  // Assert store state updated correctly
});
```

## Future Enhancements

1. **Reconnection State Preservation:** Resume from last received event after reconnection
2. **Event Replay:** Replay missed events for clients that reconnect
3. **Compression:** Compress large event payloads
4. **Filtering:** Allow clients to subscribe to specific event types only
5. **Multi-server Support:** Use Redis pub/sub for horizontal scaling
6. **Metrics:** Track connection counts, event throughput, latency
7. **Rate Limiting:** Prevent abuse of SSE connections

## Troubleshooting

**Problem:** SSE connection fails immediately

**Solution:**
- Check authentication token is valid
- Verify execution belongs to the authenticated user
- Check server logs for errors

**Problem:** Events not being received

**Solution:**
- Verify executionId is correct
- Check browser console for SSE errors
- Ensure execution is still running
- Verify backend is emitting events

**Problem:** Connection drops frequently

**Solution:**
- Check network stability
- Verify heartbeat is working (30s interval)
- Check proxy/load balancer SSE timeout settings
- Consider increasing reconnection attempts

## Summary

Phase 5 implementation provides:

✅ Real-time SSE integration for agent executions
✅ Type-safe event system with 9 event types
✅ Automatic connection management and cleanup
✅ Authentication and authorization
✅ Error handling and reconnection logic
✅ Clean separation of concerns (Manager → Emitter → Store → Hook)
✅ Production-ready with heartbeat, cleanup, and security

The integration is complete and ready for production use. Frontend clients can now receive live updates during agent execution, providing a responsive and interactive user experience.
