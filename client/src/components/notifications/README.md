# Notification System

A comprehensive notification system for the Bottleneck Bots project with toast notifications, notification center, sound alerts, and SSE integration.

## Features

- **Toast Notifications**: Immediate feedback using Sonner
- **Notification Center**: History panel with bell icon and badge count
- **Sound Alerts**: User-configurable audio notifications
- **SSE Integration**: Automatic notifications from agent events
- **Persistent Storage**: Unread notifications saved to localStorage
- **Notification Grouping**: Similar notifications grouped together
- **Accessibility**: Full ARIA support and keyboard navigation

## Installation

The notification system is already integrated into the project. All required components are in `/client/src/components/notifications/`.

## Usage

### 1. Wrap your app with NotificationProvider

```tsx
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

function App() {
  return (
    <NotificationProvider>
      <YourApp />
      <NotificationCenter />
    </NotificationProvider>
  );
}
```

### 2. Use the hook to trigger notifications

```tsx
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { addNotification } = useNotifications();

  const handleSuccess = () => {
    addNotification({
      type: 'success',
      title: 'Task completed',
      message: 'Your task has been completed successfully',
    });
  };

  const handleError = () => {
    addNotification({
      type: 'error',
      title: 'Failed to save',
      message: 'Please try again',
    });
  };

  return (
    <div>
      <button onClick={handleSuccess}>Success</button>
      <button onClick={handleError}>Error</button>
    </div>
  );
}
```

### 3. Notification Types

- `success`: Green checkmark icon, success sound
- `error`: Red alert icon, error sound
- `warning`: Amber warning icon, warning sound
- `info`: Blue info icon, info sound
- `agent-update`: Purple bot icon, agent update sound

### 4. Access notification context

```tsx
import { useNotifications } from '@/hooks/useNotifications';

function NotificationManager() {
  const {
    notifications,      // All notifications
    unreadCount,        // Number of unread notifications
    settings,           // Current settings
    addNotification,    // Add a new notification
    markAsRead,         // Mark single as read
    markAllAsRead,      // Mark all as read
    removeNotification, // Remove single notification
    clearAll,           // Clear all notifications
    updateSettings,     // Update notification settings
  } = useNotifications();

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      <button onClick={markAllAsRead}>Mark all as read</button>
    </div>
  );
}
```

### 5. Configure settings

```tsx
import { useNotifications } from '@/hooks/useNotifications';

function SettingsPanel() {
  const { settings, updateSettings } = useNotifications();

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
        />
        Enable sound alerts
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.groupSimilar}
          onChange={(e) => updateSettings({ groupSimilar: e.target.checked })}
        />
        Group similar notifications
      </label>
    </div>
  );
}
```

## Integration with Agent SSE

The notification system automatically converts agent logs to notifications:

- **success logs** → success notifications
- **error logs** → error notifications
- **warning logs** → warning notifications
- **info logs** (with "completed" or "started") → agent-update notifications
- **system logs** → agent-update notifications

This happens automatically when using `NotificationProvider` with the agent store.

## Customization

### Custom Metadata

You can attach custom metadata to notifications:

```tsx
addNotification({
  type: 'success',
  title: 'Task completed',
  metadata: {
    taskId: '123',
    userId: 'abc',
    customField: 'value',
  },
});
```

### Grouped Notifications

Similar notifications are automatically grouped within a 1-minute window:

```tsx
// These will be grouped into one notification with count: 3
addNotification({ type: 'success', title: 'File uploaded' });
addNotification({ type: 'success', title: 'File uploaded' });
addNotification({ type: 'success', title: 'File uploaded' });
```

### Max Notifications

Configure the maximum number of stored notifications:

```tsx
updateSettings({ maxNotifications: 50 });
```

## Testing

Run tests with:

```bash
npm test -- notifications
```

Test files:
- `/client/src/components/notifications/__tests__/NotificationProvider.test.tsx`
- `/client/src/components/notifications/__tests__/NotificationCenter.test.tsx`
- `/client/src/hooks/__tests__/useNotifications.test.tsx`
- `/client/src/lib/__tests__/notificationSounds.test.ts`

## Accessibility

The notification system follows WCAG 2.1 AA standards:

- **ARIA live regions** for screen reader announcements
- **Keyboard navigation** for all interactive elements
- **Focus management** in the notification center
- **Color contrast** meets AA standards
- **Clear labels** and descriptions

## API Reference

### NotificationProvider Props

| Prop | Type | Description |
|------|------|-------------|
| children | ReactNode | Child components |

### NotificationCenter Props

No props required. The component manages its own state.

### useNotifications Return Value

| Property | Type | Description |
|----------|------|-------------|
| notifications | Notification[] | All notifications |
| unreadCount | number | Count of unread notifications |
| settings | NotificationSettings | Current settings |
| addNotification | (notification) => void | Add notification |
| markAsRead | (id) => void | Mark as read |
| markAllAsRead | () => void | Mark all as read |
| removeNotification | (id) => void | Remove notification |
| clearAll | () => void | Clear all notifications |
| updateSettings | (settings) => void | Update settings |

### Notification Interface

```typescript
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'agent-update';
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
  grouped?: boolean;
  groupCount?: number;
  metadata?: {
    agentId?: string;
    taskId?: string;
    sessionId?: string;
    [key: string]: any;
  };
}
```

### NotificationSettings Interface

```typescript
interface NotificationSettings {
  soundEnabled: boolean;
  groupSimilar: boolean;
  maxNotifications: number;
  autoMarkReadDelay?: number;
}
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 13+)
- Web Audio API required for sounds (gracefully degrades without)

## Performance

- Notifications are limited to `maxNotifications` (default: 100)
- Only unread notifications are persisted to localStorage
- Grouping reduces duplicate notifications
- Efficient re-renders using React context

## Troubleshooting

### Sounds not playing

1. Check that `settings.soundEnabled` is `true`
2. Ensure browser autoplay policy allows sounds
3. User interaction may be required to initialize AudioContext

### Notifications not persisting

1. Check localStorage is available and not full
2. Verify browser privacy settings allow localStorage
3. Check console for serialization errors

### Notifications not appearing from SSE

1. Verify `useAgentSSE` is connected
2. Check agent store logs are being added
3. Ensure `NotificationProvider` is mounted before SSE connection
