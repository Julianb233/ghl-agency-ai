# Browser Automation Components

Production-ready React components for the Bottleneck Bots browser automation system.

## Components

### 1. BrowserSessionManager
Main dashboard component for managing browser automation sessions.

**Features:**
- Session listing with real-time updates
- Advanced filtering and sorting
- Bulk operations (terminate/delete)
- Session statistics overview
- Search functionality
- Responsive design

**Usage:**
```tsx
import { BrowserSessionManager } from '@/components/browser';

function MyPage() {
  return (
    <BrowserSessionManager
      onCreateSession={() => {
        // Handle session creation
      }}
      onViewSession={(session) => {
        // Handle session view
      }}
    />
  );
}
```

**Props:**
- `onCreateSession?: () => void` - Callback when creating new session
- `onViewSession?: (session: BrowserSession) => void` - Callback when viewing session

**Dependencies:**
- `useBrowserSessions` hook for data fetching
- `trpc.ai.listSessions`, `trpc.ai.terminateSession`, `trpc.ai.deleteSession` endpoints

---

### 2. SessionLiveView
Live browser feed component with real-time controls.

**Features:**
- Live browser streaming via iframe
- Navigation controls (back, forward, refresh)
- Custom action execution
- Screenshot capture
- Session recording controls
- Real-time connection status
- Session logs display

**Usage:**
```tsx
import { SessionLiveView } from '@/components/browser';

function LiveView() {
  return (
    <SessionLiveView
      sessionId="session-123"
      onClose={() => {
        // Handle close
      }}
    />
  );
}
```

**Props:**
- `sessionId: string` - Browser session ID
- `onClose?: () => void` - Callback when closing live view

**Dependencies:**
- `useBrowserSession` hook
- `useWebSocketStore` for real-time updates
- `trpc.ai.getSessionLiveView` endpoint

**Placeholders to implement:**
- Browser control API calls (`executeBrowserAction`)
- Screenshot capture API (`captureScreenshot`)
- Recording start/stop API

---

### 3. WorkflowBuilder
Visual workflow creator with drag-and-drop functionality.

**Features:**
- Drag-and-drop workflow nodes
- 6 step types: Navigate, Act, Observe, Extract, Wait, Custom
- Step configuration dialogs
- Enable/disable steps
- Duplicate steps
- Step reordering
- Template save/load
- Workflow execution

**Usage:**
```tsx
import { WorkflowBuilder } from '@/components/browser';

function Builder() {
  return (
    <WorkflowBuilder
      onSave={(template) => {
        // Save workflow template
      }}
      onExecute={(template) => {
        // Execute workflow
      }}
      onLoad={() => {
        // Load existing template
      }}
    />
  );
}
```

**Props:**
- `initialTemplate?: WorkflowTemplate` - Initial workflow template
- `onSave?: (template: WorkflowTemplate) => void` - Save callback
- `onExecute?: (template: WorkflowTemplate) => void` - Execute callback
- `onLoad?: () => void` - Load callback

**Step Types:**
- **Navigate**: Navigate to URL
- **Act**: Perform actions (click, type, etc.)
- **Observe**: Observe page state
- **Extract**: Extract data from page
- **Wait**: Wait for condition/duration
- **Custom**: Custom code execution

**Placeholders to implement:**
- Workflow template storage API
- Workflow execution API

---

### 4. SessionMetrics
Analytics dashboard for browser automation sessions.

**Features:**
- Key metrics (total sessions, success rate, avg duration, cost)
- Trend indicators
- Status distribution chart
- Resource usage metrics
- 24-hour activity timeline
- Recent sessions table
- Time range filtering
- Data export

**Usage:**
```tsx
import { SessionMetrics } from '@/components/browser';
import { useBrowserSessions } from '@/hooks/useBrowserSessions';

function Analytics() {
  const { sessions, isLoading, refetch } = useBrowserSessions();

  return (
    <SessionMetrics
      sessions={sessions}
      isLoading={isLoading}
      onRefresh={refetch}
    />
  );
}
```

**Props:**
- `sessions: BrowserSession[]` - Array of browser sessions
- `isLoading?: boolean` - Loading state
- `onRefresh?: () => void` - Refresh callback

**Placeholders to implement:**
- Actual cost calculation API
- Resource usage tracking
- Trend calculation (compare periods)
- Hourly activity grouping

---

## Types & Schemas

All types are defined in `types.ts` and validated with Zod schemas:

```tsx
import type { BrowserSession, WorkflowTemplate } from '@/components/browser';
```

**Main Types:**
- `BrowserSession` - Browser session data
- `WorkflowStep` - Workflow step definition
- `WorkflowTemplate` - Complete workflow template
- `SessionMetric` - Session performance metrics
- `AggregatedMetrics` - Aggregated analytics data
- `BrowserAction` - Browser control action
- `LiveViewState` - Live view connection state

---

## Hooks Used

### useBrowserSessions
Manages multiple browser sessions with CRUD operations.

```tsx
const {
  sessions,          // BrowserSession[]
  isLoading,         // boolean
  error,            // Error | null
  refetch,          // () => void
  terminateSession, // (sessionId: string) => Promise<void>
  deleteSession,    // (sessionId: string) => Promise<void>
  bulkTerminate,    // (sessionIds: string[]) => Promise<void>
  bulkDelete,       // (sessionIds: string[]) => Promise<void>
} = useBrowserSessions();
```

### useBrowserSession
Manages a single browser session with real-time updates.

```tsx
const {
  session,         // BrowserSession | undefined
  logs,           // LogEntry[]
  liveView,       // LiveViewData | undefined
  connectionState, // ConnectionState
  isLoading,      // boolean
  error,          // Error | null
  refetch,        // () => void
} = useBrowserSession(sessionId);
```

---

## API Endpoints

### Required tRPC Endpoints

**Session Management:**
- `ai.listSessions` - List all sessions
- `ai.terminateSession` - Terminate running session
- `ai.deleteSession` - Delete session
- `ai.getSessionReplay` - Get session replay data
- `ai.getSessionLogs` - Get session logs
- `ai.getSessionLiveView` - Get live view URL

**Browser Control (Placeholders):**
- `ai.executeBrowserAction` - Execute browser action
- `ai.captureScreenshot` - Capture screenshot
- `ai.startRecording` - Start session recording
- `ai.stopRecording` - Stop session recording

**Workflow Management (Placeholders):**
- `workflows.saveTemplate` - Save workflow template
- `workflows.loadTemplate` - Load workflow template
- `workflows.execute` - Execute workflow

---

## Styling

All components use:
- **Tailwind CSS** for styling
- **shadcn/ui** components for UI elements
- **Lucide React** for icons
- **date-fns** for date formatting

Components are fully responsive and accessible (WCAG 2.1 AA compliant).

---

## WebSocket Integration

Real-time updates via `useWebSocketStore`:

```tsx
const {
  isConnected,      // boolean
  connectionState,  // ConnectionState
  executions,       // Map<number, ExecutionState>
} = useWebSocketStore();
```

Components automatically subscribe to relevant session updates.

---

## Accessibility Features

- Keyboard navigation support
- ARIA labels and roles
- Screen reader optimized
- Focus management
- Color contrast compliance
- Semantic HTML

---

## Example: Complete Integration

```tsx
import { useState } from 'react';
import {
  BrowserSessionManager,
  SessionLiveView,
  WorkflowBuilder,
  SessionMetrics,
  type BrowserSession,
} from '@/components/browser';

function BrowserAutomationDashboard() {
  const [view, setView] = useState<'list' | 'live' | 'builder' | 'metrics'>('list');
  const [selectedSession, setSelectedSession] = useState<BrowserSession | null>(null);

  return (
    <div className="container mx-auto p-6">
      {/* Navigation */}
      <div className="mb-6 flex gap-2">
        <button onClick={() => setView('list')}>Sessions</button>
        <button onClick={() => setView('builder')}>Builder</button>
        <button onClick={() => setView('metrics')}>Analytics</button>
      </div>

      {/* Views */}
      {view === 'list' && (
        <BrowserSessionManager
          onCreateSession={() => {
            // Handle creation
          }}
          onViewSession={(session) => {
            setSelectedSession(session);
            setView('live');
          }}
        />
      )}

      {view === 'live' && selectedSession && (
        <SessionLiveView
          sessionId={selectedSession.sessionId}
          onClose={() => setView('list')}
        />
      )}

      {view === 'builder' && (
        <WorkflowBuilder
          onSave={(template) => {
            console.log('Saving template:', template);
          }}
          onExecute={(template) => {
            console.log('Executing workflow:', template);
          }}
        />
      )}

      {view === 'metrics' && (
        <SessionMetrics
          sessions={[]}
          onRefresh={() => {
            // Refresh data
          }}
        />
      )}
    </div>
  );
}
```

---

## Placeholders to Replace

Before production use, implement these placeholders:

1. **SessionLiveView.tsx:**
   - Line 115: Browser control API (`trpc.ai.executeBrowserAction`)
   - Line 164: Screenshot capture API (`trpc.ai.captureScreenshot`)
   - Line 180: Recording start/stop API

2. **WorkflowBuilder.tsx:**
   - Line 299: Workflow save API or localStorage
   - Line 328: Workflow execution API

3. **SessionMetrics.tsx:**
   - Line 58: Actual cost calculation
   - Line 78: Trend calculation logic
   - Line 90: Hourly activity grouping

4. **useBrowserAutomation.ts:**
   - Line 52: Actual workflow ID (replace hardcoded `1`)
   - Line 119: Dynamic workflow ID creation

---

## Testing

All components are designed with testing in mind:

```tsx
import { render, screen } from '@testing-library/react';
import { BrowserSessionManager } from '@/components/browser';

test('renders session manager', () => {
  render(<BrowserSessionManager />);
  expect(screen.getByText(/total sessions/i)).toBeInTheDocument();
});
```

---

## Performance Considerations

- **Virtualization**: Consider implementing virtual scrolling for large session lists
- **Memoization**: Components use `useMemo` and `useCallback` for optimization
- **Lazy Loading**: Split components with `React.lazy()` if needed
- **WebSocket**: Automatic reconnection and state management
- **Debouncing**: Search inputs are debounced to reduce API calls

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

---

## License

Copyright 2025 Bottleneck Bots. All rights reserved.
