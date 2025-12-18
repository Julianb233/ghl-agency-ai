# ExecutionViewer Component

A comprehensive, real-time execution viewer component for the Bottleneck Bots project. This component provides a rich interface for monitoring agent task executions with live updates via Server-Sent Events (SSE).

## Features

- **Real-time Updates**: Live streaming of execution steps via SSE integration
- **Collapsible Details**: Expandable step cards with input/output data
- **Status Indicators**: Visual feedback for pending, running, completed, and error states
- **Time Tracking**: Display elapsed time per step and overall execution duration
- **Log Streaming**: Auto-scrolling log viewer with automatic updates
- **Copy Functionality**: One-click copying of logs, outputs, and results
- **Log Filtering**: Filter logs by level (info, debug, warning, error, system)
- **Execution Plans**: Visual representation of multi-phase execution plans
- **Thinking Steps**: Display agent reasoning and tool usage
- **Responsive Design**: Fully responsive layout using Tailwind CSS
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation

## Installation

The component is located at `/root/github-repos/active/ghl-agency-ai/client/src/components/agent/ExecutionViewer.tsx`

Import it in your application:

```tsx
import { ExecutionViewer } from '@/components/agent/ExecutionViewer';
// or
import { ExecutionViewer } from '@/components/agent';
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `execution` | `AgentExecution \| undefined` | `undefined` | The execution object to display |
| `thinkingSteps` | `ThinkingStep[]` | `[]` | Array of thinking steps from the agent |
| `className` | `string` | `''` | Additional CSS classes to apply |
| `showFilters` | `boolean` | `true` | Show filter controls and expand/collapse buttons |
| `autoScroll` | `boolean` | `true` | Automatically scroll to newest logs |
| `maxHeight` | `string` | `'600px'` | Maximum height for scrollable areas |

## Basic Usage

### Minimal Example

```tsx
import { ExecutionViewer } from '@/components/agent';

function MyComponent() {
  const execution = {
    id: 'exec-123',
    task: 'Create a landing page',
    status: 'executing',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return <ExecutionViewer execution={execution} />;
}
```

### With SSE Integration

```tsx
import { ExecutionViewer } from '@/components/agent';
import { useAgentSSE } from '@/hooks/useAgentSSE';
import { useState } from 'react';

function LiveExecutionViewer() {
  const [execution, setExecution] = useState(null);
  const [thinkingSteps, setThinkingSteps] = useState([]);

  // Connect to SSE stream
  const { isConnected } = useAgentSSE({
    autoConnect: true,
    sessionId: execution?.id,
  });

  return (
    <ExecutionViewer
      execution={execution}
      thinkingSteps={thinkingSteps}
      autoScroll={true}
    />
  );
}
```

## Advanced Usage

### With Execution Plan

```tsx
const executionWithPlan = {
  id: 'exec-456',
  task: 'Build checkout flow',
  status: 'executing',
  createdAt: new Date(),
  updatedAt: new Date(),
  plan: {
    id: 'plan-1',
    phases: [
      {
        id: 'phase-1',
        name: 'Analysis',
        description: 'Analyze requirements',
        status: 'completed',
        steps: ['Review specs', 'Design system'],
        progress: 100,
      },
      {
        id: 'phase-2',
        name: 'Implementation',
        description: 'Build components',
        status: 'in_progress',
        steps: ['Create cart', 'Add payment'],
        progress: 50,
      },
    ],
    currentPhase: 1,
  },
};

<ExecutionViewer execution={executionWithPlan} />
```

### With Thinking Steps

```tsx
const thinkingSteps = [
  {
    id: 'step-1',
    type: 'thinking',
    content: 'Analyzing the requirements',
    timestamp: new Date(),
    metadata: { duration: 1000 },
  },
  {
    id: 'step-2',
    type: 'tool_use',
    content: 'Creating file',
    timestamp: new Date(),
    toolName: 'write_file',
    toolParams: { path: 'index.tsx', content: '...' },
    metadata: { duration: 2000 },
  },
  {
    id: 'step-3',
    type: 'tool_result',
    content: 'File created successfully',
    timestamp: new Date(),
    toolName: 'write_file',
    toolResult: { success: true, path: '/project/index.tsx' },
  },
];

<ExecutionViewer thinkingSteps={thinkingSteps} />
```

### Custom Styling

```tsx
<ExecutionViewer
  execution={execution}
  className="border-2 border-blue-500 shadow-xl"
  maxHeight="800px"
  showFilters={false}
  autoScroll={false}
/>
```

## Type Definitions

### AgentExecution

```typescript
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
```

### AgentPlan

```typescript
interface AgentPlan {
  id: string;
  phases: AgentPhase[];
  currentPhase?: number;
  estimatedDuration?: string;
}
```

### AgentPhase

```typescript
interface AgentPhase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  steps?: string[];
  progress?: number;
}
```

### ThinkingStep

```typescript
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

## Features in Detail

### Status Indicators

The component displays different colors for execution statuses:

- **Planning**: Blue badge
- **Executing**: Yellow badge with spinner
- **Completed**: Green badge with checkmark
- **Failed**: Red badge with X icon
- **Cancelled**: Gray badge

### Log Filtering

Filter logs by level using the dropdown selector:

- **All**: Show all log entries
- **Info**: Information messages
- **Success**: Successful operations
- **Warning**: Warning messages
- **Error**: Error messages
- **System**: System-level messages

### Copy Functionality

Click the copy icon to copy:

- Tool input parameters (JSON formatted)
- Tool output results (JSON formatted)
- Log details
- Execution results

The button shows a checkmark for 2 seconds after copying.

### Collapsible Steps

- Click any step or log entry to expand/collapse details
- Use "Expand All" to open all entries at once
- Use "Collapse All" to close all entries

### Auto-scroll

When `autoScroll={true}`, the log area automatically scrolls to show the newest entries as they arrive. This is especially useful for live executions.

### Duration Formatting

The component intelligently formats durations:

- **< 1s**: Shows in milliseconds (e.g., "500ms")
- **1s - 60s**: Shows in seconds (e.g., "5.5s")
- **> 60s**: Shows in minutes and seconds (e.g., "2m 5s")

## Integration with SSE

The ExecutionViewer integrates seamlessly with the `useAgentSSE` hook:

```tsx
import { ExecutionViewer } from '@/components/agent';
import { useAgentSSE } from '@/hooks/useAgentSSE';
import { useAgentStore } from '@/stores/agentStore';

function AgentExecutionPage() {
  const [execution, setExecution] = useState(null);
  const { logs } = useAgentStore();

  // SSE hook automatically updates the agentStore
  const { isConnected } = useAgentSSE({
    autoConnect: true,
    sessionId: execution?.id,
  });

  return (
    <div>
      <div className="mb-2 text-sm text-gray-500">
        {isConnected ? 'Connected to stream' : 'Disconnected'}
      </div>
      <ExecutionViewer execution={execution} />
    </div>
  );
}
```

The `useAgentSSE` hook populates the `agentStore` with logs, which the ExecutionViewer automatically displays.

## Accessibility

The component follows WCAG 2.1 AA standards:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **ARIA Labels**: Proper ARIA labels for screen readers
- **Color Contrast**: All text meets minimum contrast ratios
- **Focus Indicators**: Clear focus indicators for keyboard navigation
- **Semantic HTML**: Uses semantic HTML elements

## Styling

The component uses Tailwind CSS and shadcn/ui components:

- **Card**: Main container
- **Badge**: Status and level indicators
- **Button**: Action buttons
- **ScrollArea**: Scrollable log containers
- **Collapsible**: Expandable step details
- **Select**: Log level filter
- **Separator**: Visual dividers

## Performance

The component is optimized for performance:

- **Memoized Filters**: Log filtering uses `useMemo` to prevent unnecessary re-renders
- **Efficient Re-renders**: Only re-renders when props or filtered logs change
- **Virtualization Ready**: The ScrollArea can be extended with virtual scrolling for thousands of logs
- **Lazy Expansion**: Step details are only rendered when expanded

## Testing

Comprehensive tests are available at `/root/github-repos/active/ghl-agency-ai/client/src/components/agent/ExecutionViewer.test.tsx`

Run tests with:

```bash
npm test ExecutionViewer.test.tsx
```

Test coverage includes:

- Rendering all states
- Log filtering
- Step expansion/collapse
- Copy functionality
- Status indicators
- Duration formatting
- Edge cases

## Examples

See `/root/github-repos/active/ghl-agency-ai/client/src/components/agent/ExecutionViewer.example.tsx` for comprehensive examples including:

- Basic usage
- SSE integration
- Custom styling
- With execution plan
- With thinking steps
- Failed executions
- Multiple viewers

## Troubleshooting

### Logs not updating

- Ensure `useAgentSSE` is connected
- Check that the SSE endpoint is returning data
- Verify the `agentStore` is being updated

### Auto-scroll not working

- Make sure `autoScroll={true}` is set
- Check that the ScrollArea ref is attached
- Verify logs are actually being added (not just updated)

### Copy function not working

- Ensure the browser supports `navigator.clipboard`
- Check that the site is served over HTTPS (required for clipboard API)
- Verify clipboard permissions are granted

### Performance issues with many logs

- Consider reducing the log retention in `agentStore` (currently keeps last 100)
- Implement virtual scrolling for very large log lists
- Use log filtering to reduce visible entries

## Contributing

When making changes to the ExecutionViewer:

1. Update the component in `ExecutionViewer.tsx`
2. Add/update tests in `ExecutionViewer.test.tsx`
3. Update examples in `ExecutionViewer.example.tsx`
4. Update this README with any new features or breaking changes

## License

Part of the Bottleneck Bots project.
