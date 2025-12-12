# Agent SSE Event Flow Diagram

## Complete Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND CLIENT                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. User clicks "Start Agent"                                            │
│     │                                                                     │
│     ├──> useAgentExecution().startExecution('Create landing page')      │
│     │                                                                     │
│     └──> POST /api/agent/execute                                         │
│              │                                                            │
│              └──> Returns: { executionId: '123' }                        │
│                                                                           │
│  2. Auto-subscribe to SSE stream                                         │
│     │                                                                     │
│     ├──> useAgentSSE(executionId)                                       │
│     │                                                                     │
│     └──> EventSource: GET /api/agent/stream/123                         │
│                                                                           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                │ SSE Connection
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                           BACKEND SERVER                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  SSE Route: /api/agent/stream/:executionId                              │
│     │                                                                     │
│     ├──> Authenticate user                                              │
│     ├──> Verify user owns execution                                      │
│     ├──> addAgentConnection(userId, executionId, response)              │
│     └──> Send: event: connected                                          │
│                                                                           │
│  Agent Execution: AgentOrchestrator.executeTask()                       │
│     │                                                                     │
│     ├──> const emitter = new AgentSSEEmitter(userId, executionId)      │
│     │                                                                     │
│     ├──> 1. emitter.executionStarted({ task, startedAt })              │
│     │       └──> SSE Event: execution:started ──────────────────┐       │
│     │                                                             │       │
│     ├──> 2. Agent analyzes task and creates plan                │       │
│     │       Tool: update_plan                                    │       │
│     │       └──> emitter.planCreated({ plan })                  │       │
│     │           └──> SSE Event: plan:created ────────────────────┼──┐   │
│     │           └──> emitter.phaseStart({ phaseId, name })      │  │   │
│     │               └──> SSE Event: phase:start ─────────────────┼──┼─┐ │
│     │                                                             │  │ │ │
│     ├──> 3. Agent thinks and reasons                             │  │ │ │
│     │       └──> emitter.thinking({ thought })                   │  │ │ │
│     │           └──> SSE Event: thinking ────────────────────────┼──┼─┼─┤
│     │                                                             │  │ │ │
│     ├──> 4. Agent selects and executes tool                      │  │ │ │
│     │       │                                                     │  │ │ │
│     │       ├──> emitter.toolStart({ toolName, params })        │  │ │ │
│     │       │   └──> SSE Event: tool:start ──────────────────────┼──┼─┼─┼─┐
│     │       │                                                     │  │ │ │ │
│     │       ├──> Execute tool logic                              │  │ │ │ │
│     │       │                                                     │  │ │ │ │
│     │       └──> emitter.toolComplete({ toolName, result })     │  │ │ │ │
│     │           └──> SSE Event: tool:complete ──────────────────┼──┼─┼─┼─┼─┐
│     │                                                             │  │ │ │ │ │
│     ├──> 5. Agent completes phase                                │  │ │ │ │ │
│     │       Tool: advance_phase                                  │  │ │ │ │ │
│     │       ├──> emitter.phaseComplete({ phaseId, name })       │  │ │ │ │ │
│     │       │   └──> SSE Event: phase:complete ──────────────────┼──┼─┼─┼─┼─┼─┐
│     │       └──> emitter.phaseStart({ nextPhaseId, name })      │  │ │ │ │ │ │
│     │           └──> SSE Event: phase:start ──────────────────────┼──┼─┼─┼─┼─┼─┤
│     │                                                             │  │ │ │ │ │ │
│     ├──> 6. Repeat steps 3-5 for remaining phases               │  │ │ │ │ │ │
│     │                                                             │  │ │ │ │ │ │
│     └──> 7. Task complete                                        │  │ │ │ │ │ │
│           emitter.executionComplete({ result, duration })        │  │ │ │ │ │ │
│           └──> SSE Event: execution:complete ────────────────────┼──┼─┼─┼─┼─┼─┼─┐
│               └──> Connection closed                             │  │ │ │ │ │ │ │
│                                                                   │  │ │ │ │ │ │ │
└───────────────────────────────────────────────────────────────────┼──┼─┼─┼─┼─┼─┼─┘
                                                                    │  │ │ │ │ │ │
                             SSE Events Flow Back                  │  │ │ │ │ │ │
                                                                    │  │ │ │ │ │ │
┌───────────────────────────────────────────────────────────────────┼──┼─┼─┼─┼─┼─┼─┐
│                           FRONTEND CLIENT                         │  │ │ │ │ │ │ │
├───────────────────────────────────────────────────────────────────┼──┼─┼─┼─┼─┼─┼─┤
│                                                                   │  │ │ │ │ │ │ │
│  agentStore Event Handlers:                                      │  │ │ │ │ │ │ │
│     │                                                             │  │ │ │ │ │ │ │
│     ├──> handleExecutionStarted(data) ◄───────────────────────────┘  │ │ │ │ │ │ │
│     │     └──> Update: status = 'planning'                           │ │ │ │ │ │ │
│     │                                                                 │ │ │ │ │ │ │
│     ├──> handlePlanCreated(data) ◄────────────────────────────────────┘ │ │ │ │ │ │
│     │     └──> Set: currentExecution.plan                               │ │ │ │ │ │
│     │     └──> Update: status = 'executing'                             │ │ │ │ │ │
│     │                                                                     │ │ │ │ │ │
│     ├──> handlePhaseStart(data) ◄─────────────────────────────────────────┘ │ │ │ │ │
│     │     └──> Update: phase[i].status = 'in_progress'                      │ │ │ │ │
│     │                                                                         │ │ │ │ │
│     ├──> handleThinking(data) ◄──────────────────────────────────────────────┘ │ │ │ │
│     │     └──> Append to: thinkingSteps[]                                      │ │ │ │
│     │                                                                           │ │ │ │
│     ├──> handleToolStart(data) ◄───────────────────────────────────────────────┘ │ │ │
│     │     └──> Append: { type: 'tool_use', toolName, params }                   │ │ │
│     │                                                                             │ │ │
│     ├──> handleToolComplete(data) ◄──────────────────────────────────────────────┘ │ │
│     │     └──> Append: { type: 'tool_result', toolName, result }                   │ │
│     │                                                                                 │ │
│     ├──> handlePhaseComplete(data) ◄─────────────────────────────────────────────────┘ │
│     │     └──> Update: phase[i].status = 'completed'                                    │
│     │                                                                                     │
│     └──> handleExecutionComplete(data) ◄─────────────────────────────────────────────────┘
│           └──> Update: status = 'completed', result = data
│           └──> Close SSE connection
│
│  React Components Re-render with Updated State:
│     │
│     ├──> ExecutionStatus shows: "Completed"
│     ├──> PlanView shows: All phases completed ✓
│     ├──> ThinkingLog shows: All steps with timestamps
│     └──> ResultDisplay shows: Final execution result
│
└─────────────────────────────────────────────────────────────────────────┘
```

## Event Timeline Example

```
Time    Event                    Frontend State Update
────────────────────────────────────────────────────────────────────────
00:00   execution:started        status = 'planning'
                                 thinkingSteps += "Execution started"

00:02   plan:created             plan = { phases: [...] }
                                 status = 'executing'
                                 thinkingSteps += "Created plan"

00:02   phase:start              phases[0].status = 'in_progress'
                                 thinkingSteps += "Starting phase: Setup"

00:03   thinking                 thinkingSteps += "Analyzing requirements..."

00:04   thinking                 thinkingSteps += "Creating file structure..."

00:05   tool:start               thinkingSteps += "Using tool: create_file"

00:06   tool:complete            thinkingSteps += "Tool completed"

00:07   phase:complete           phases[0].status = 'completed'
                                 thinkingSteps += "Completed phase: Setup"

00:07   phase:start              phases[1].status = 'in_progress'
                                 thinkingSteps += "Starting phase: Build"

00:08   thinking                 thinkingSteps += "Implementing features..."

...     (repeat for each action)

01:30   execution:complete       status = 'completed'
                                 result = { ... }
                                 thinkingSteps += "Completed successfully"
                                 [SSE connection closed]
```

## Data Flow Architecture

```
┌──────────────┐
│   Browser    │
│  (Client)    │
└──────┬───────┘
       │
       │ HTTP POST /api/agent/execute
       │ { taskDescription: "..." }
       ▼
┌──────────────┐
│  Express     │
│  API Router  │
└──────┬───────┘
       │
       │ tRPC: agentRouter.executeTask
       ▼
┌──────────────────┐
│ AgentOrchestrator│◄─────┐
│  .executeTask()  │      │
└──────┬───────────┘      │
       │                  │
       │ 1. Create        │
       │    emitter       │
       ▼                  │
┌──────────────────┐      │
│  AgentSSEEmitter │      │
│                  │      │
│ - executionStarted      │
│ - planCreated    │      │
│ - thinking       │      │
│ - toolStart      │      │
│ - toolComplete   │      │
│ - phaseComplete  │      │
│ - executionComplete     │
└──────┬───────────┘      │
       │                  │
       │ 2. Emit events   │
       ▼                  │
┌──────────────────┐      │
│   SSE Manager    │      │
│  - sendAgentEvent│      │
│  - Connections   │      │
│    map by userId │      │
└──────┬───────────┘      │
       │                  │
       │ 3. Broadcast     │
       │    to clients    │
       ▼                  │
┌──────────────────┐      │
│  EventSource     │      │
│  Connection      │      │
│  (HTTP Stream)   │      │
└──────┬───────────┘      │
       │                  │
       │ 4. Receive       │
       │    events        │
       ▼                  │
┌──────────────────┐      │
│   agentStore     │      │
│  Event Handlers  │      │
│                  │      │
│ - handleExecutionStarted
│ - handlePlanCreated     │
│ - handleThinking │      │
│ - etc...         │      │
└──────┬───────────┘      │
       │                  │
       │ 5. Update state  │
       ▼                  │
┌──────────────────┐      │
│  React           │      │
│  Components      │      │
│  (Re-render)     │      │
└──────────────────┘      │
                          │
       ┌──────────────────┘
       │
       │ Agent Loop
       │ (continues
       │  emitting
       │  events)
       │
```

## Error Flow

```
Backend Error Occurs
       │
       ├──> catch (error) in tool execution
       │       │
       │       └──> emitter.toolComplete({ result: { error } })
       │           └──> SSE: tool:complete (with error)
       │               └──> Frontend: handleToolComplete()
       │                   └──> Display error in thinking steps
       │
       └──> catch (error) in agent loop
               │
               └──> emitter.executionError({ error, stack })
                   └──> SSE: execution:error
                       └──> Frontend: handleExecutionError()
                           ├──> status = 'failed'
                           ├──> error = data.error
                           ├──> Display error to user
                           └──> Close SSE connection
```

## Key Takeaways

1. **One SSE Connection Per Execution:** Each execution has its own SSE stream
2. **Automatic Subscription:** Frontend auto-subscribes when execution starts
3. **Real-Time Updates:** Events stream immediately as they occur
4. **Clean Cleanup:** Connection closes automatically on completion/error
5. **Type-Safe:** Full TypeScript types throughout the flow
6. **Error Resilient:** Automatic reconnection with exponential backoff
7. **Secure:** Authentication and authorization at every step
