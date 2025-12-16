/**
 * NotificationCenter Tests
 *
 * Unit tests for the NotificationCenter UI component.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { NotificationCenter } from '../NotificationCenter';
import { NotificationProvider } from '../NotificationProvider';

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

describe('NotificationCenter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders notification bell icon', () => {
    render(
      <NotificationProvider>
        <NotificationCenter />
      </NotificationProvider>
    );

    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
  });

  it('shows badge with unread count', async () => {
    const { container } = render(
      <NotificationProvider>
        <NotificationCenter />
      </NotificationProvider>
    );

    // Trigger notification by setting up localStorage
    const mockNotifications = [
      {
        id: 'test-1',
        type: 'info' as const,
        title: 'Test Notification',
        timestamp: Date.now(),
        read: false,
      },
    ];

    localStorage.setItem('ghl-notifications', JSON.stringify(mockNotifications));

    // Re-render to pick up localStorage
    const { container: newContainer } = render(
      <NotificationProvider>
        <NotificationCenter />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('opens dialog when bell is clicked', async () => {
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <NotificationCenter />
      </NotificationProvider>
    );

    const button = screen.getByLabelText(/notifications/i);
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('displays empty state when no notifications', async () => {
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <NotificationCenter />
      </NotificationProvider>
    );

    const button = screen.getByLabelText(/notifications/i);
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });

  it('throws error when used outside NotificationProvider', () => {
    // Suppress console.error for this test
    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<NotificationCenter />);
    }).toThrow('NotificationCenter must be used within NotificationProvider');

    console.error = consoleError;
  });
});
