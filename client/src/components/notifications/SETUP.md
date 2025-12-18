# Notification System - Quick Setup Guide

Follow these steps to integrate the notification system into your Bottleneck Bots application.

## Step 1: Verify Installation

All required files should be in place:
- `/client/src/components/notifications/NotificationProvider.tsx`
- `/client/src/components/notifications/NotificationCenter.tsx`
- `/client/src/hooks/useNotifications.ts`
- `/client/src/lib/notificationSounds.ts`
- `/client/src/types/notifications.ts`

## Step 2: Wrap Your App

Find your main app component (typically `client/src/App.tsx` or similar) and wrap it with `NotificationProvider`:

```tsx
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <NotificationProvider>
      {/* Your existing app structure */}
      <YourAppContent />

      {/* Sonner toaster (already included in your project) */}
      <Toaster />
    </NotificationProvider>
  );
}
```

## Step 3: Add NotificationCenter to Layout

Add the `NotificationCenter` component to your header/navbar so users can access notifications:

```tsx
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

function Header() {
  return (
    <header>
      <nav>
        <Logo />
        <NavLinks />

        {/* Add notification bell icon */}
        <NotificationCenter />

        <UserMenu />
      </nav>
    </header>
  );
}
```

## Step 4: Use in Components

Use the `useNotifications` hook anywhere in your app:

```tsx
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { addNotification } = useNotifications();

  const handleAction = async () => {
    try {
      await performAction();

      addNotification({
        type: 'success',
        title: 'Action completed',
        message: 'Your action was successful',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Action failed',
        message: error.message,
      });
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

## Step 5: SSE Integration (Automatic)

The notification system automatically converts agent logs to notifications when `NotificationProvider` is used. No additional setup required!

Agent events will automatically trigger notifications:
- Task started → agent-update notification
- Task completed → success notification
- Task failed → error notification
- Agent errors → error notification

## Step 6: Test It

1. **Test basic notifications**: Use the example components in `examples/IntegrationExample.tsx`
2. **Test sound**: Click a notification button and verify sound plays
3. **Test persistence**: Trigger notifications, refresh page, verify unread notifications persist
4. **Test SSE integration**: Start an agent task and verify notifications appear

## Optional Customization

### Disable sounds by default

```tsx
import { useNotifications } from '@/hooks/useNotifications';

function Settings() {
  const { updateSettings } = useNotifications();

  useEffect(() => {
    updateSettings({ soundEnabled: false });
  }, []);
}
```

### Change max notifications

```tsx
updateSettings({ maxNotifications: 50 });
```

### Disable grouping

```tsx
updateSettings({ groupSimilar: false });
```

## Troubleshooting

### Notifications not appearing
- Verify `NotificationProvider` wraps your app
- Check console for errors
- Verify sonner is installed (`npm list sonner`)

### Sounds not playing
- User interaction may be required to initialize AudioContext
- Check browser autoplay policies
- Verify sounds are enabled in settings

### SSE notifications not working
- Verify agent store is properly set up
- Check that logs are being added to the store
- Ensure `NotificationProvider` is mounted before SSE connection

## Example Code Snippets

### Complete App.tsx

```tsx
import React from 'react';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <NotificationProvider>
      <div className="flex h-screen flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h1>Bottleneck Bots</h1>
          <div className="flex items-center gap-4">
            <NotificationCenter />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <YourRoutes />
        </main>
      </div>

      <Toaster />
    </NotificationProvider>
  );
}

export default App;
```

### Usage in a Form

```tsx
import { useNotifications } from '@/hooks/useNotifications';

function ContactForm() {
  const { addNotification } = useNotifications();

  const handleSubmit = async (data) => {
    try {
      await submitForm(data);

      addNotification({
        type: 'success',
        title: 'Form submitted',
        message: 'We will get back to you soon',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Submission failed',
        message: 'Please try again later',
      });
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Next Steps

- Read the full [README.md](./README.md) for detailed API documentation
- Check out [examples/IntegrationExample.tsx](./examples/IntegrationExample.tsx) for more examples
- Run tests: `npm test -- notifications`
- Customize styling in `NotificationCenter.tsx` to match your design system
