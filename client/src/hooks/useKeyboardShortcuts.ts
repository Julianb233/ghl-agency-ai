import { useEffect, useCallback, useState } from 'react';

/**
 * Global keyboard shortcuts hook for the application
 * Provides centralized keyboard shortcut management with OS detection
 */

export interface UseKeyboardShortcutsOptions {
  /** Callback for command palette toggle (⌘K / Ctrl+K) */
  onCommandPalette?: () => void;
  /** Callback for new task creation (⌘N / Ctrl+N) */
  onNewTask?: () => void;
  /** Callback for help panel toggle (⌘/ / Ctrl+/) */
  onHelp?: () => void;
  /** Callback for settings (⌘, / Ctrl+,) */
  onSettings?: () => void;
  /** Callback for section navigation (⌘1-5 / Ctrl+1-5) */
  onNavigate?: (section: number) => void;
  /** Callback for escape key (close modals/panels) */
  onEscape?: () => void;
  /** Callback for showing shortcut reference (?) */
  onShowShortcuts?: () => void;
  /** Enable/disable shortcuts globally */
  enabled?: boolean;
}

export interface UseKeyboardShortcutsReturn {
  /** Whether the current platform is Mac */
  isMac: boolean;
  /** Whether shortcuts are currently enabled */
  enabled: boolean;
}

// Detect if we're on Mac
const detectMac = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
         /Mac/.test(navigator.userAgent);
};

// Elements that should not trigger shortcuts when focused
const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];
const CONTENTEDITABLE_ATTR = 'contenteditable';

/**
 * Check if the current focused element should prevent shortcuts
 */
const shouldIgnoreEvent = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement;
  if (!target) return false;

  // Ignore if typing in input/textarea/select
  if (INPUT_TAGS.includes(target.tagName)) {
    return true;
  }

  // Ignore if element has contenteditable
  if (target.hasAttribute(CONTENTEDITABLE_ATTR) &&
      target.getAttribute(CONTENTEDITABLE_ATTR) !== 'false') {
    return true;
  }

  return false;
};

/**
 * Global keyboard shortcuts hook
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isMac } = useKeyboardShortcuts({
 *     onCommandPalette: () => setShowCommandPalette(true),
 *     onNewTask: () => setShowNewTaskModal(true),
 *     onNavigate: (section) => navigate(ROUTES[section]),
 *     enabled: !isModalOpen
 *   });
 *
 *   return <div>Use {isMac ? '⌘' : 'Ctrl'}+K to open command palette</div>;
 * }
 * ```
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {}
): UseKeyboardShortcutsReturn {
  const {
    onCommandPalette,
    onNewTask,
    onHelp,
    onSettings,
    onNavigate,
    onEscape,
    onShowShortcuts,
    enabled = true,
  } = options;

  const [isMac] = useState(detectMac);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle if disabled
      if (!enabled) return;

      // Don't handle if typing in an input field
      if (shouldIgnoreEvent(event)) {
        // Allow Escape even in input fields
        if (event.key === 'Escape' && onEscape) {
          event.preventDefault();
          onEscape();
        }
        return;
      }

      const isMacPlatform = isMac;
      const modKey = isMacPlatform ? event.metaKey : event.ctrlKey;
      const key = event.key.toLowerCase();

      // ⌘K / Ctrl+K - Command Palette
      if (modKey && key === 'k' && onCommandPalette) {
        event.preventDefault();
        onCommandPalette();
        return;
      }

      // ⌘N / Ctrl+N - New Task
      if (modKey && key === 'n' && onNewTask) {
        event.preventDefault();
        onNewTask();
        return;
      }

      // ⌘/ / Ctrl+/ - Help
      if (modKey && key === '/' && onHelp) {
        event.preventDefault();
        onHelp();
        return;
      }

      // ⌘, / Ctrl+, - Settings
      if (modKey && key === ',' && onSettings) {
        event.preventDefault();
        onSettings();
        return;
      }

      // ⌘1-5 / Ctrl+1-5 - Quick Navigation
      if (modKey && /^[1-5]$/.test(key) && onNavigate) {
        event.preventDefault();
        const section = parseInt(key, 10);
        onNavigate(section);
        return;
      }

      // Escape - Close modals/panels
      if (key === 'escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      // ? - Show keyboard shortcuts (Shift+/)
      if (event.shiftKey && key === '/' && onShowShortcuts) {
        event.preventDefault();
        onShowShortcuts();
        return;
      }
    },
    [
      enabled,
      isMac,
      onCommandPalette,
      onNewTask,
      onHelp,
      onSettings,
      onNavigate,
      onEscape,
      onShowShortcuts,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    isMac,
    enabled,
  };
}

/**
 * Format a keyboard shortcut for display
 */
export function formatShortcutKey(
  key: string,
  options: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    isMac?: boolean;
  } = {}
): string {
  const { ctrl = false, shift = false, alt = false, isMac = detectMac() } = options;
  const parts: string[] = [];

  if (ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }

  if (shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  if (alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format special keys
  const formattedKey = key === '/' && shift ? '?' : key.toUpperCase();
  parts.push(formattedKey);

  return parts.join(isMac ? '' : '+');
}

/**
 * Get all default keyboard shortcuts
 */
export function getDefaultShortcuts(isMac: boolean) {
  const modKey = isMac ? '⌘' : 'Ctrl';

  return {
    navigation: [
      { key: `${modKey}+K`, description: 'Open command palette' },
      { key: `${modKey}+1`, description: 'Go to Home' },
      { key: `${modKey}+2`, description: 'Go to Agents' },
      { key: `${modKey}+3`, description: 'Go to Swarms' },
      { key: `${modKey}+4`, description: 'Go to Workflows' },
      { key: `${modKey}+5`, description: 'Go to Settings' },
    ],
    actions: [
      { key: `${modKey}+N`, description: 'Create new task' },
      { key: `${modKey}+/`, description: 'Toggle help panel' },
      { key: `${modKey}+,`, description: 'Open settings' },
    ],
    general: [
      { key: 'Esc', description: 'Close modal/panel' },
      { key: '?', description: 'Show keyboard shortcuts' },
    ],
  };
}
