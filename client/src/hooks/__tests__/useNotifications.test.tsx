/**
 * useNotifications Hook Tests
 *
 * Unit tests for the useNotifications custom hook.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { act } from 'react';
import { useNotifications } from '../useNotifications';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';

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

describe('useNotifications', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('throws error when used outside NotificationProvider', () => {
    // Suppress console.error for this test
    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useNotifications());
    }).toThrow('useNotifications must be used within NotificationProvider');

    console.error = consoleError;
  });

  it('returns notification context when used within provider', () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: NotificationProvider,
    });

    expect(result.current).toBeDefined();
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(typeof result.current.addNotification).toBe('function');
    expect(typeof result.current.markAsRead).toBe('function');
    expect(typeof result.current.markAllAsRead).toBe('function');
    expect(typeof result.current.removeNotification).toBe('function');
    expect(typeof result.current.clearAll).toBe('function');
    expect(typeof result.current.updateSettings).toBe('function');
  });

  it('adds notification via hook', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: NotificationProvider,
    });

    await act(async () => {
      result.current.addNotification({
        type: 'success',
        title: 'Test Notification',
        message: 'This is a test',
      });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Test Notification');
      expect(result.current.unreadCount).toBe(1);
    });
  });

  it('marks notification as read via hook', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: NotificationProvider,
    });

    let notificationId: string | undefined;

    await act(async () => {
      result.current.addNotification({
        type: 'info',
        title: 'Test',
      });
    });

    await waitFor(() => {
      notificationId = result.current.notifications[0]?.id;
      expect(notificationId).toBeDefined();
    });

    await act(async () => {
      if (notificationId) {
        result.current.markAsRead(notificationId);
      }
    });

    await waitFor(() => {
      expect(result.current.notifications[0].read).toBe(true);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  it('updates settings via hook', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: NotificationProvider,
    });

    expect(result.current.settings.soundEnabled).toBe(true);

    await act(async () => {
      result.current.updateSettings({ soundEnabled: false });
    });

    await waitFor(() => {
      expect(result.current.settings.soundEnabled).toBe(false);
    });
  });

  it('clears all notifications via hook', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: NotificationProvider,
    });

    await act(async () => {
      result.current.addNotification({ type: 'info', title: 'Test 1' });
      result.current.addNotification({ type: 'info', title: 'Test 2' });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    await act(async () => {
      result.current.clearAll();
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(0);
      expect(result.current.unreadCount).toBe(0);
    });
  });
});
