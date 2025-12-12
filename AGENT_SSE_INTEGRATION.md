# Agent SSE Integration Guide

Complete implementation of real-time agent execution updates using Server-Sent Events (SSE) and Zustand state management.

## Overview

This integration provides real-time streaming of agent execution progress to the client, including:
- Execution lifecycle events (started, planning, executing, completed, failed)
- AI thinking steps and reasoning
- Tool usage and results
- Multi-phase plan execution tracking
- Automatic reconnection on connection loss

## Files Created

### Client-Side

1. **`/client/src/stores/agentStore.ts`** - Zustand store with SSE integration
2. **`/client/src/hooks/useAgentSSE.ts`** - React hooks for agent execution
3. **`/client/src/types/agent.ts`** - TypeScript types (already existed)

### Server-Side

4. **`/server/_core/sse-manager.ts`** - Extended with agent event types
5. **`/server/_core/sse-routes.ts`** - Added `/api/agent/stream/:executionId` route
6. **`/server/_core/agent-sse-events.ts`** - Event emitter helpers

## Quick Start

### Client Usage

\`\`\`tsx
import { useAgentSSE, useAgentExecution } from '@/hooks/useAgentSSE';

function AgentView({ executionId }: { executionId: string }) {
  const { currentExecution, thinkingSteps } = useAgentExecution();
  useAgentSSE(executionId); // Auto-connect to SSE

  return (
    <div>
      <h2>{currentExecution?.status}</h2>
      {thinkingSteps.map(step => (
        <div key={step.id}>{step.content}</div>
      ))}
    </div>
  );
}
\`\`\`

### Server Usage

\`\`\`typescript
import { AgentSSEEmitter } from '../../_core/agent-sse-events';

const emitter = new AgentSSEEmitter(userId, executionId.toString());

emitter.executionStarted({ task: 'Create landing page' });
emitter.thinking({ thought: 'Planning structure...' });
emitter.toolStart({ toolName: 'create_file', params: {} });
emitter.executionComplete({ result: { success: true } });
\`\`\`

## Event Types

1. **execution:started** - Execution begins
2. **plan:created** - Plan with phases created
3. **phase:start** - Phase begins
4. **thinking** - Agent reasoning step
5. **tool:start** - Tool invocation begins
6. **tool:complete** - Tool completes
7. **phase:complete** - Phase completes
8. **execution:complete** - Execution succeeds
9. **execution:error** - Execution fails

See full documentation in file for detailed event schemas and usage examples.
