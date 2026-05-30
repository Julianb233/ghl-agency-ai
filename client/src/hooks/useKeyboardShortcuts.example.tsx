/**
 * Example usage of useKeyboardShortcuts hook
 * Demonstrates integration with command palette, modals, and navigation
 */

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { ShortcutOverlay, ShortcutHint } from '../components/ui/ShortcutOverlay';

// Example: Main App Component with Global Shortcuts
export function AppWithKeyboardShortcuts() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);

  // Modal states
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [anyModalOpen, setAnyModalOpen] = useState(false);

  // Route mapping for quick navigation
  const SECTION_ROUTES = {
    1: '/home',
    2: '/agents',
    3: '/swarms',
    4: '/workflows',
    5: '/settings',
  };

  // Register global keyboard shortcuts
  const { isMac } = useKeyboardShortcuts({
    onCommandPalette: () => {
      setShowCommandPalette(true);
      setAnyModalOpen(true);
    },

    onNewTask: () => {
      setShowNewTaskModal(true);
      setAnyModalOpen(true);
    },

    onHelp: () => {
      setShowHelpPanel((prev) => !prev);
    },

    onSettings: () => {
      navigate('/settings');
    },

    onNavigate: (section) => {
      const route = SECTION_ROUTES[section as keyof typeof SECTION_ROUTES];
      if (route) {
        navigate(route);
      }
    },

    onEscape: () => {
      // Close any open modal/panel
      setShowCommandPalette(false);
      setShowNewTaskModal(false);
      setShowHelpPanel(false);
      setShowShortcuts(false);
      setAnyModalOpen(false);
    },

    onShowShortcuts: () => {
      setShowShortcuts(true);
      setAnyModalOpen(true);
    },

    // Disable shortcuts when any modal is open (except Escape)
    enabled: !anyModalOpen,
  });

  return (
    <div className="app">
      {/* Main content */}
      <main>
        {/* Example button with shortcut hint */}
        <button onClick={() => setShowCommandPalette(true)}>
          Open Command Palette
          <ShortcutHint shortcut={isMac ? '⌘K' : 'Ctrl+K'} className="ml-2" />
        </button>

        <button onClick={() => setShowNewTaskModal(true)}>
          New Task
          <ShortcutHint shortcut={isMac ? '⌘N' : 'Ctrl+N'} className="ml-2" />
        </button>
      </main>

      {/* Modals */}
      {showCommandPalette && (
        <div className="command-palette">
          {/* Command palette implementation */}
        </div>
      )}

      {showNewTaskModal && (
        <div className="new-task-modal">
          {/* New task modal implementation */}
        </div>
      )}

      {showHelpPanel && (
        <aside className="help-panel">
          {/* Help panel implementation */}
        </aside>
      )}

      {/* Keyboard shortcut reference overlay */}
      <ShortcutOverlay
        open={showShortcuts}
        onClose={() => {
          setShowShortcuts(false);
          setAnyModalOpen(false);
        }}
        isMac={isMac}
      />
    </div>
  );
}

// Example: Component with custom shortcuts overlay
export function ComponentWithCustomShortcuts() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { isMac } = useKeyboardShortcuts({
    onShowShortcuts: () => setShowShortcuts(true),
  });

  // Custom shortcuts for this component
  const customShortcuts = {
    navigation: [
      { key: `${isMac ? '⌘' : 'Ctrl'}+K`, description: 'Search' },
      { key: `${isMac ? '⌘' : 'Ctrl'}+B`, description: 'Toggle sidebar' },
    ],
    actions: [
      { key: `${isMac ? '⌘' : 'Ctrl'}+S`, description: 'Save changes' },
      { key: `${isMac ? '⌘' : 'Ctrl'}+Enter`, description: 'Submit form' },
    ],
    general: [
      { key: 'Esc', description: 'Cancel' },
    ],
  };

  return (
    <div>
      <button onClick={() => setShowShortcuts(true)}>
        Show Shortcuts
      </button>

      <ShortcutOverlay
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        isMac={isMac}
        customShortcuts={customShortcuts}
      />
    </div>
  );
}

// Example: Conditionally enable shortcuts
export function ConditionalShortcuts() {
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const { isMac } = useKeyboardShortcuts({
    onCommandPalette: () => {
      console.log('Command palette opened');
    },

    // Disable shortcuts while editing to avoid conflicts
    enabled: !isEditing,
  });

  return (
    <div>
      <button onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? 'Stop Editing' : 'Start Editing'}
      </button>

      <p className="text-sm text-muted-foreground">
        Shortcuts {isEditing ? 'disabled' : 'enabled'}
        {!isEditing && (
          <span>
            {' - Press '}
            <ShortcutHint shortcut={isMac ? '⌘K' : 'Ctrl+K'} />
            {' to test'}
          </span>
        )}
      </p>
    </div>
  );
}

// Example: Navigation with shortcuts
export function NavigationWithShortcuts() {
  const [, setLocation] = useLocation();
  const navigateTo = (path: string) => setLocation(path);
  const [currentSection, setCurrentSection] = useState(1);

  const { isMac } = useKeyboardShortcuts({
    onNavigate: (section) => {
      setCurrentSection(section);

      const routes = {
        1: '/home',
        2: '/agents',
        3: '/swarms',
        4: '/workflows',
        5: '/settings',
      };

      const route = routes[section as keyof typeof routes];
      if (route) {
        navigateTo(route);
      }
    },
  });

  const sections = [
    { id: 1, name: 'Home', icon: '🏠' },
    { id: 2, name: 'Agents', icon: '🤖' },
    { id: 3, name: 'Swarms', icon: '🐝' },
    { id: 4, name: 'Workflows', icon: '🔄' },
    { id: 5, name: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="flex gap-2">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => setCurrentSection(section.id)}
          className={currentSection === section.id ? 'active' : ''}
        >
          <span>{section.icon}</span>
          <span>{section.name}</span>
          <ShortcutHint
            shortcut={`${isMac ? '⌘' : 'Ctrl'}+${section.id}`}
            className="ml-auto"
          />
        </button>
      ))}
    </nav>
  );
}
