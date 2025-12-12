# Agent Dashboard Components

Complete implementation of the agent execution system with real-time thinking visualization.

## Components

### 1. AgentDashboard (Page)
**Location:** `/root/github-repos/active/ghl-agency-ai/client/src/pages/AgentDashboard.tsx`

Main dashboard page that orchestrates the entire agent execution experience.

**Features:**
- Full-page layout with sidebar history
- Task input at the top
- Real-time thinking visualization
- Execution history management
- Active project preview panel (right side, hidden on smaller screens)

**Usage:**
```tsx
import { AgentDashboard } from '@/pages/AgentDashboard';

// In your router
<Route path="/agent" component={AgentDashboard} />
```

### 2. AgentThinkingViewer
**Location:** `/root/github-repos/active/ghl-agency-ai/client/src/components/agent/AgentThinkingViewer.tsx`

Core component that displays the agent's thinking process in real-time.

**Features:**
- Auto-scrolls to latest thinking step
- Shows execution header with status
- Displays execution plan with progress
- Renders all thinking steps with animations
- Cancel execution button (when active)
- Empty state for new sessions

**Props:**
```tsx
interface AgentThinkingViewerProps {
  execution: AgentExecution | null;
  thinkingSteps: ThinkingStep[];
  isExecuting: boolean;
  onCancel?: () => void;
}
```

### 3. ThinkingStepCard
**Location:** `/root/github-repos/active/ghl-agency-ai/client/src/components/agent/ThinkingStepCard.tsx`

Individual step visualization with expandable details.

**Features:**
- Color-coded by step type (thinking, tool use, result, error)
- Expandable parameters and results
- Syntax highlighting for JSON
- Duration display
- Tool name and parameter visualization

**Step Types:**
- `thinking` - Agent reasoning (blue)
- `tool_use` - Tool invocation (purple)
- `tool_result` - Tool output (green)
- `error` - Error messages (red)
- `plan` - Plan creation (emerald)
- `message` - System messages (gray)

### 4. ExecutionHeader
**Location:** `/root/github-repos/active/ghl-agency-ai/client/src/components/agent/ExecutionHeader.tsx`

Header showing current execution status and metadata.

**Features:**
- Status indicator with animated icons
- Task description
- Duration counter
- Error display
- Metadata (model, tokens used)

### 5. ExecutionHistory
**Location:** `/root/github-repos/active/ghl-agency-ai/client/src/components/agent/ExecutionHistory.tsx`

Sidebar component showing past executions.

**Features:**
- Scrollable list of executions
- Status badges
- Relative timestamps
- Duration display
- Click to load past execution
- Loading and empty states
- Uses tRPC to fetch from backend

**Integration:**
```tsx
const { data: executions } = trpc.agent.listExecutions.useQuery({ limit: 20 });
```

### 6. TaskInput
**Location:** `/root/github-repos/active/ghl-agency-ai/client/src/components/agent/TaskInput.tsx`

Form for submitting new agent tasks.

**Features:**
- Multi-line textarea
- Keyboard shortcuts (Ctrl+Enter to submit)
- Loading states
- Disabled state management
- Submit button with icons

### 7. PlanDisplay
**Location:** `/root/github-repos/active/ghl-agency-ai/client/src/components/agent/PlanDisplay.tsx`

Visual representation of the execution plan.

**Features:**
- Phase-by-phase breakdown
- Progress bars for active phases
- Step lists for each phase
- Status indicators (pending, in progress, completed, failed)
- Current phase highlighting
- Estimated duration display

## State Management

### Agent Store
**Location:** `/root/github-repos/active/ghl-agency-ai/client/src/stores/agentStore.ts`

Zustand store managing all agent execution state.

**State:**
```tsx
{
  currentExecution: AgentExecution | null;
  thinkingSteps: ThinkingStep[];
  isExecuting: boolean;
  error: string | null;
  executions: AgentExecutionListItem[];
  eventSource: EventSource | null;
}
```

**Key Actions:**
- `startExecution(task, context)` - Start new execution
- `cancelExecution()` - Cancel current execution
- `clearCurrentExecution()` - Clear UI state
- `subscribeToExecution(id)` - Connect to SSE stream
- `loadExecution(id)` - Load past execution
- `loadExecutionHistory()` - Fetch execution list

**SSE Event Handlers:**
- `execution:started` - Execution began
- `plan:created` - Plan generated
- `phase:start` - Phase starting
- `thinking` - Agent thinking
- `tool:start` - Tool invocation
- `tool:complete` - Tool result
- `phase:complete` - Phase done
- `execution:complete` - Success
- `execution:error` - Failure

## Type Definitions

### Agent Types
**Location:** `/root/github-repos/active/ghl-agency-ai/client/src/types/agent.ts`

```tsx
interface AgentExecution {
  id: string;
  task: string;
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'cancelled';
  plan?: AgentPlan;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    duration?: number;
  };
}

interface AgentPlan {
  id: string;
  phases: AgentPhase[];
  currentPhase?: number;
  estimatedDuration?: string;
}

interface AgentPhase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  steps?: string[];
  progress?: number;
}

interface ThinkingStep {
  id: string;
  type: 'thinking' | 'tool_use' | 'tool_result' | 'plan' | 'message' | 'error';
  content: string;
  timestamp: Date;
  toolName?: string;
  toolParams?: any;
  toolResult?: any;
  metadata?: {
    duration?: number;
    error?: string;
  };
}
```

## Backend Integration

### Required tRPC Endpoints

```tsx
// Agent router
agent: {
  // Execute a new task
  executeTask: publicProcedure
    .input(z.object({
      taskDescription: z.string(),
      context: z.record(z.unknown()).optional()
    }))
    .mutation(async ({ input }) => {
      // Start execution, return executionId
      return { executionId: string };
    }),

  // List executions
  listExecutions: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      return AgentExecutionListItem[];
    }),

  // Get single execution
  getExecution: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return {
        execution: AgentExecution,
        steps: ThinkingStep[]
      };
    }),

  // Cancel execution
  cancelExecution: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Cancel the execution
    })
}
```

### SSE Endpoint

**Endpoint:** `GET /api/agent/stream/:executionId`

**Event Types:**
```typescript
// Events sent via SSE
type SSEEvent =
  | { type: 'execution:started', data: { task: string } }
  | { type: 'plan:created', data: { plan: AgentPlan } }
  | { type: 'phase:start', data: { phaseId: string, phaseName: string } }
  | { type: 'thinking', data: { thought: string } }
  | { type: 'tool:start', data: { toolName: string, params: any } }
  | { type: 'tool:complete', data: { toolName: string, result: any } }
  | { type: 'phase:complete', data: { phaseId: string, phaseName: string } }
  | { type: 'execution:complete', data: { result: any, duration: number, tokensUsed: number } }
  | { type: 'execution:error', data: { error: string } }
```

## Styling

All components use:
- **Tailwind CSS** for styling
- **shadcn/ui** components (Card, Button, ScrollArea, Progress)
- **lucide-react** for icons
- **class-variance-authority** for variant styling

### Color Scheme

**Status Colors:**
- Planning: Blue (`bg-blue-50`, `border-blue-200`, `text-blue-600`)
- Executing: Emerald (`bg-emerald-50`, `border-emerald-200`, `text-emerald-600`)
- Completed: Green (`bg-green-50`, `border-green-200`, `text-green-600`)
- Failed: Red (`bg-red-50`, `border-red-200`, `text-red-600`)
- Cancelled: Orange (`bg-orange-50`, `border-orange-200`, `text-orange-600`)

**Step Type Colors:**
- Thinking: Blue
- Tool Use: Purple
- Tool Result: Green
- Error: Red
- Plan: Emerald
- Message: Gray

## Accessibility

All components follow accessibility best practices:
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Color contrast compliance

## Performance

**Optimizations:**
- Auto-scroll uses `scrollIntoView` with smooth behavior
- SSE reconnection logic with exponential backoff
- Cleanup of event listeners on unmount
- Memoized step rendering
- Efficient Zustand store updates

## Testing

**Recommended Tests:**
1. Task submission flow
2. SSE event handling
3. Execution history loading
4. Cancel execution
5. Error handling
6. Empty states
7. Loading states
8. Auto-scroll behavior
9. Step expansion/collapse
10. Plan progress updates

## Future Enhancements

- [ ] Active project panel for webdev tasks
- [ ] File tree viewer for generated code
- [ ] Diff viewer for code changes
- [ ] Export execution logs
- [ ] Search executions
- [ ] Filter by status/date
- [ ] Execution templates
- [ ] Favorites/bookmarks
- [ ] Execution sharing
- [ ] Performance metrics dashboard
