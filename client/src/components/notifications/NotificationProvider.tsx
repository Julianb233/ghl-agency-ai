/**
 * NotificationProvider Component
 *
 * Context provider for managing notifications across the application.
 * Integrates with SSE agent events and manages notification state.
 */

import React, { createContext, useCallback, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';
import type {
  Notification,
  NotificationContextValue,
  NotificationSettings,
  NotificationType,
} from '@/types/notifications';
import { notificationSounds } from '@/lib/notificationSounds';
import { useAgentStore } from '@/stores/agentStore';
import type { LogEntry } from '@/stores/agentStore';

const STORAGE_KEY = 'ghl-notifications';
const SETTINGS_KEY = 'ghl-notification-settings';

export const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
}

const defaultSettings: NotificationSettings = {
  soundEnabled: true,
  groupSimilar: true,
  maxNotifications: 100,
  autoMarkReadDelay: 5000,
};

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const previousLogsRef = useRef<LogEntry[]>([]);

  const rawLogs = useAgentStore((state) => state.logs);
  const logs: LogEntry[] = Array.isArray(rawLogs) ? rawLogs : [];

  // Load persisted notifications and settings on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(Array.isArray(parsed) ? parsed : []);
      }

      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
        notificationSounds.setEnabled(parsedSettings.soundEnabled ?? true);
      }
    } catch (error) {
      console.error('Failed to load notifications from localStorage:', error);
    }
  }, []);

  // Persist notifications to localStorage
  useEffect(() => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unreadNotifications));
    } catch (error) {
      console.error('Failed to save notifications to localStorage:', error);
    }
  }, [notifications]);

  // Group similar notifications
  const shouldGroupWith = useCallback(
    (newNotif: Omit<Notification, 'id' | 'timestamp' | 'read'>, existing: Notification): boolean => {
      if (!settings.groupSimilar) return false;

      return (
        existing.type === newNotif.type &&
        existing.title === newNotif.title &&
        !existing.read &&
        Date.now() - existing.timestamp < 60000 // Group within 1 minute
      );
    },
    [settings.groupSimilar]
  );

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: nanoid(),
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => {
        // Check if we should group with existing notification
        const existingIndex = prev.findIndex((n) => shouldGroupWith(notification, n));

        if (existingIndex !== -1) {
          // Group with existing notification
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            grouped: true,
            groupCount: (updated[existingIndex].groupCount || 1) + 1,
            timestamp: Date.now(),
          };
          return updated;
        }

        // Add new notification
        const updated = [newNotification, ...prev];

        // Trim to max notifications
        if (updated.length > settings.maxNotifications) {
          return updated.slice(0, settings.maxNotifications);
        }

        return updated;
      });

      // Show toast notification
      const message = notification.message || '';
      const displayTitle = notification.grouped
        ? `${notification.title} (${notification.groupCount})`
        : notification.title;

      switch (notification.type) {
        case 'success':
          toast.success(displayTitle, { description: message });
          break;
        case 'error':
          toast.error(displayTitle, { description: message });
          break;
        case 'warning':
          toast.warning(displayTitle, { description: message });
          break;
        case 'info':
          toast.info(displayTitle, { description: message });
          break;
        case 'agent-update':
          toast(displayTitle, { description: message });
          break;
      }

      // Play sound
      if (settings.soundEnabled) {
        notificationSounds.play(notification.type);
      }
    },
    [settings.maxNotifications, settings.soundEnabled, shouldGroupWith]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };

      // Persist settings
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save settings:', error);
      }

      // Update sound enabled state
      if ('soundEnabled' in newSettings) {
        notificationSounds.setEnabled(newSettings.soundEnabled!);
      }

      return updated;
    });
  }, []);

  // Convert agent logs to notifications
  useEffect(() => {
    const newLogs = logs.filter(
      (log) => !previousLogsRef.current.some((prevLog) => prevLog.id === log.id)
    );

    previousLogsRef.current = logs;

    newLogs.forEach((log) => {
      let type: NotificationType = 'info';
      let shouldNotify = false;

      switch (log.level) {
        case 'success':
          type = 'success';
          shouldNotify = true;
          break;
        case 'error':
          type = 'error';
          shouldNotify = true;
          break;
        case 'warning':
          type = 'warning';
          shouldNotify = true;
          break;
        case 'info':
          // Only notify for important info messages
          shouldNotify = log.message.toLowerCase().includes('completed') ||
                        log.message.toLowerCase().includes('started');
          type = 'agent-update';
          break;
        case 'system':
          type = 'agent-update';
          shouldNotify = true;
          break;
      }

      if (shouldNotify) {
        addNotification({
          type,
          title: log.message,
          message: log.detail,
          metadata: {
            logId: log.id,
          },
        });
      }
    });
  }, [logs, addNotification]);

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updateSettings,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
