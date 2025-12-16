/**
 * NotificationProvider Tests
 *
 * Unit tests for the NotificationProvider component.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import { act } from 'react';
import { NotificationProvider, NotificationContext } from '../NotificationProvider';
import { useContext } from 'react';
import type { NotificationContextValue } from '@/types/notifications';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/notificationSounds', () => ({
  notificationSounds: {
    play: vi.fn(),
    setEnabled: vi.fn(),
  },
}));

vi.mock('@/stores/agentStore', () => ({
  useAgentStore: vi.fn((selector?: (state: { logs: unknown[] }) => unknown) => {
    const state = { logs: [] };
    return selector ? selector(state) : state;
  }),
}));

// Test component to access context
function TestConsumer({ onRender }: { onRender: (value: NotificationContextValue) => void }) {
  const context = useContext(NotificationContext);
  if (context) {
    onRender(context);
  }
  return null;
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('provides notification context to children', () => {
    let contextValue: NotificationContextValue | null = null;

    render(
      <NotificationProvider>
        <TestConsumer onRender={(value) => (contextValue = value)} />
      </NotificationProvider>
    );

    expect(contextValue).not.toBeNull();
    expect(contextValue!.notifications).toEqual([]);
    expect(contextValue!.unreadCount).toBe(0);
  });

  it('adds notifications correctly', async () => {
    let contextValue: NotificationContextValue | null = null;

    render(
      <NotificationProvider>
        <TestConsumer onRender={(value) => (contextValue = value)} />
      </NotificationProvider>
    );

    await act(async () => {
      contextValue?.addNotification({
        type: 'success',
        title: 'Test Notification',
        message: 'Test message',
      });
    });

    await waitFor(() => {
      expect(contextValue?.notifications).toHaveLength(1);
      expect(contextValue?.notifications[0].title).toBe('Test Notification');
      expect(contextValue?.notifications[0].type).toBe('success');
      expect(contextValue?.notifications[0].read).toBe(false);
      expect(contextValue?.unreadCount).toBe(1);
    });
  });

  it('marks notification as read', async () => {
    let contextValue: NotificationContextValue | null = null;

    render(
      <NotificationProvider>
        <TestConsumer onRender={(value) => (contextValue = value)} />
      </NotificationProvider>
    );

    let notificationId: string | undefined;

    await act(async () => {
      contextValue?.addNotification({
        type: 'info',
        title: 'Test',
      });
    });

    await waitFor(() => {
      notificationId = contextValue?.notifications[0]?.id;
      expect(notificationId).toBeDefined();
    });

    await act(async () => {
      if (notificationId) {
        contextValue?.markAsRead(notificationId);
      }
    });

    await waitFor(() => {
      expect(contextValue?.notifications[0].read).toBe(true);
      expect(contextValue?.unreadCount).toBe(0);
    });
  });

  it('marks all notifications as read', async () => {
    let contextValue: NotificationContextValue | null = null;

    render(
      <NotificationProvider>
        <TestConsumer onRender={(value) => (contextValue = value)} />
      </NotificationProvider>
    );

    await act(async () => {
      contextValue?.addNotification({ type: 'info', title: 'Test 1' });
      contextValue?.addNotification({ type: 'info', title: 'Test 2' });
      contextValue?.addNotification({ type: 'info', title: 'Test 3' });
    });

    await waitFor(() => {
      expect(contextValue?.notifications).toHaveLength(3);
      expect(contextValue?.unreadCount).toBe(3);
    });

    await act(async () => {
      contextValue?.markAllAsRead();
    });

    await waitFor(() => {
      expect(contextValue?.unreadCount).toBe(0);
      expect(contextValue?.notifications.every((n) => n.read)).toBe(true);
    });
  });

  it('removes notification', async () => {
    let contextValue: NotificationContextValue | null = null;

    render(
      <NotificationProvider>
        <TestConsumer onRender={(value) => (contextValue = value)} />
      </NotificationProvider>
    );

    let notificationId: string | undefined;

    await act(async () => {
      contextValue?.addNotification({ type: 'info', title: 'Test' });
    });

    await waitFor(() => {
      notificationId = contextValue?.notifications[0]?.id;
      expect(contextValue?.notifications).toHaveLength(1);
    });

    await act(async () => {
      if (notificationId) {
        contextValue?.removeNotification(notificationId);
      }
    });

    await waitFor(() => {
      expect(contextValue?.notifications).toHaveLength(0);
    });
  });

  it('clears all notifications', async () => {
    let contextValue: NotificationContextValue | null = null;

    render(
      <NotificationProvider>
        <TestConsumer onRender={(value) => (contextValue = value)} />
      </NotificationProvider>
    );

    await act(async () => {
      contextValue?.addNotification({ type: 'info', title: 'Test 1' });
      contextValue?.addNotification({ type: 'info', title: 'Test 2' });
    });

    await waitFor(() => {
      expect(contextValue?.notifications).toHaveLength(2);
    });

    await act(async () => {
      contextValue?.clearAll();
    });

    await waitFor(() => {
      expect(contextValue?.notifications).toHaveLength(0);
    });
  });

  it('updates settings correctly', async () => {
    let contextValue: NotificationContextValue | null = null;

    render(
      <NotificationProvider>
        <TestConsumer onRender={(value) => (contextValue = value)} />
      </NotificationProvider>
    );

    expect(contextValue!.settings.soundEnabled).toBe(true);

    await act(async () => {
      contextValue?.updateSettings({ soundEnabled: false });
    });

    await waitFor(() => {
      expect(contextValue?.settings.soundEnabled).toBe(false);
    });
  });

  it('persists unread notifications to localStorage', async () => {
    let contextValue: NotificationContextValue | null = null;

    render(
      <NotificationProvider>
        <TestConsumer onRender={(value) => (contextValue = value)} />
      </NotificationProvider>
    );

    await act(async () => {
      contextValue?.addNotification({
        type: 'success',
        title: 'Persisted Notification',
      });
    });

    await waitFor(() => {
      const stored = localStorage.getItem('ghl-notifications');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Persisted Notification');
    });
  });

  it('loads notifications from localStorage on mount', async () => {
    const mockNotifications = [
      {
        id: 'test-1',
        type: 'info' as const,
        title: 'Loaded Notification',
        timestamp: Date.now(),
        read: false,
      },
    ];

    localStorage.setItem('ghl-notifications', JSON.stringify(mockNotifications));

    let contextValue: NotificationContextValue | null = null;

    render(
      <NotificationProvider>
        <TestConsumer onRender={(value) => (contextValue = value)} />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(contextValue?.notifications).toHaveLength(1);
      expect(contextValue?.notifications[0].title).toBe('Loaded Notification');
    });
  });

  it('respects maxNotifications setting', async () => {
    let contextValue: NotificationContextValue | null = null;

    render(
      <NotificationProvider>
        <TestConsumer onRender={(value) => (contextValue = value)} />
      </NotificationProvider>
    );

    await act(async () => {
      contextValue?.updateSettings({ maxNotifications: 3 });
    });

    await act(async () => {
      for (let i = 0; i < 5; i++) {
        contextValue?.addNotification({
          type: 'info',
          title: `Notification ${i}`,
        });
      }
    });

    await waitFor(() => {
      expect(contextValue?.notifications.length).toBeLessThanOrEqual(3);
    });
  });
});
