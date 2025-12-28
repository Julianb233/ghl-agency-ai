# Keyboard Shortcuts System

A comprehensive global keyboard shortcuts system for the application with OS-aware keybindings and a built-in reference overlay.

## Features

- **Global shortcuts** across the entire application
- **OS detection** - automatically uses ⌘ (Command) on Mac, Ctrl on Windows/Linux
- **Context-aware** - respects input focus (won't trigger while typing)
- **Keyboard shortcut reference** - built-in overlay showing all shortcuts (press `?`)
- **Customizable** - easy to add new shortcuts or disable temporarily
- **TypeScript** - fully typed with comprehensive interfaces

## Quick Start

### Basic Usage

```typescript
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const { isMac } = useKeyboardShortcuts({
    onCommandPalette: () => setShowCommandPalette(true),
    onNewTask: () => console.log('New task'),
    onSettings: () => navigate('/settings'),
  });

  return (
    <div>
      Press {isMac ? '⌘K' : 'Ctrl+K'} to open command palette
    </div>
  );
}
```

### With Shortcut Overlay

```typescript
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ShortcutOverlay } from './components/ui/ShortcutOverlay';

function App() {
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { isMac } = useKeyboardShortcuts({
    onShowShortcuts: () => setShowShortcuts(true),
    // ... other shortcuts
  });

  return (
    <>
      {/* Your app content */}
      <ShortcutOverlay
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        isMac={isMac}
      />
    </>
  );
}
```

## Default Shortcuts

### Navigation
- **⌘K / Ctrl+K** - Open command palette
- **⌘1 / Ctrl+1** - Navigate to Home
- **⌘2 / Ctrl+2** - Navigate to Agents
- **⌘3 / Ctrl+3** - Navigate to Swarms
- **⌘4 / Ctrl+4** - Navigate to Workflows
- **⌘5 / Ctrl+5** - Navigate to Settings

### Actions
- **⌘N / Ctrl+N** - Create new task
- **⌘/ / Ctrl+/** - Toggle help panel
- **⌘, / Ctrl+,** - Open settings

### General
- **Esc** - Close any modal/panel
- **?** (Shift+/) - Show keyboard shortcuts reference

## API Reference

### `useKeyboardShortcuts(options)`

The main hook for registering global keyboard shortcuts.

#### Options

```typescript
interface UseKeyboardShortcutsOptions {
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
```

#### Returns

```typescript
interface UseKeyboardShortcutsReturn {
  /** Whether the current platform is Mac */
  isMac: boolean;

  /** Whether shortcuts are currently enabled */
  enabled: boolean;
}
```

### `ShortcutOverlay`

Modal component displaying all available keyboard shortcuts.

#### Props

```typescript
interface ShortcutOverlayProps {
  /** Whether the overlay is visible */
  open: boolean;

  /** Callback when overlay should close */
  onClose: () => void;

  /** Whether the current platform is Mac */
  isMac?: boolean;

  /** Custom shortcuts to display (optional) */
  customShortcuts?: {
    navigation?: Array<{ key: string; description: string }>;
    actions?: Array<{ key: string; description: string }>;
    general?: Array<{ key: string; description: string }>;
  };
}
```

### `ShortcutHint`

Lightweight component for displaying shortcut hints inline.

```typescript
interface ShortcutHintProps {
  shortcut: string;
  className?: string;
}
```

Example:
```tsx
<button>
  Save
  <ShortcutHint shortcut="⌘S" className="ml-2" />
</button>
```

### Helper Functions

#### `formatShortcutKey(key, options)`

Formats a keyboard shortcut for display.

```typescript
formatShortcutKey('K', { ctrl: true, isMac: true })
// Returns: "⌘K"

formatShortcutKey('K', { ctrl: true, isMac: false })
// Returns: "Ctrl+K"
```

#### `getDefaultShortcuts(isMac)`

Returns the default shortcut configuration.

```typescript
const shortcuts = getDefaultShortcuts(true);
// Returns object with navigation, actions, and general shortcuts
```

## Advanced Usage

### Conditional Shortcuts

Disable shortcuts when certain conditions are met:

```typescript
const [isModalOpen, setIsModalOpen] = useState(false);

useKeyboardShortcuts({
  onCommandPalette: () => setShowPalette(true),
  // Disable all shortcuts except Escape when modal is open
  enabled: !isModalOpen,
  // Escape still works to close modal
  onEscape: () => setIsModalOpen(false),
});
```

### Navigation Integration

```typescript
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();

  const ROUTES = {
    1: '/home',
    2: '/agents',
    3: '/swarms',
    4: '/workflows',
    5: '/settings',
  };

  useKeyboardShortcuts({
    onNavigate: (section) => {
      const route = ROUTES[section];
      if (route) navigate(route);
    },
    onSettings: () => navigate('/settings'),
  });
}
```

### Custom Shortcut Overlay

Display custom shortcuts for specific contexts:

```typescript
const customShortcuts = {
  navigation: [
    { key: '⌘K', description: 'Search items' },
    { key: '⌘B', description: 'Toggle sidebar' },
  ],
  actions: [
    { key: '⌘S', description: 'Save changes' },
    { key: '⌘Enter', description: 'Submit form' },
  ],
};

<ShortcutOverlay
  open={showShortcuts}
  onClose={() => setShowShortcuts(false)}
  isMac={isMac}
  customShortcuts={customShortcuts}
/>
```

### Multiple Modals Management

```typescript
function App() {
  const [modals, setModals] = useState({
    commandPalette: false,
    newTask: false,
    help: false,
  });

  const anyModalOpen = Object.values(modals).some(Boolean);

  useKeyboardShortcuts({
    onCommandPalette: () => setModals({ ...modals, commandPalette: true }),
    onNewTask: () => setModals({ ...modals, newTask: true }),
    onHelp: () => setModals({ ...modals, help: !modals.help }),
    onEscape: () => setModals({ commandPalette: false, newTask: false, help: false }),
    enabled: !anyModalOpen,
  });
}
```

## Input Context Handling

The hook automatically ignores shortcuts when the user is typing in:
- `<input>` elements
- `<textarea>` elements
- `<select>` elements
- Elements with `contenteditable` attribute

The only exception is the **Escape** key, which always works (useful for closing modals even when an input is focused).

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

OS detection works on:
- macOS
- Windows
- Linux
- iOS (shows Mac shortcuts)
- Android (shows Ctrl shortcuts)

## Files

- **`hooks/useKeyboardShortcuts.ts`** - Main hook implementation
- **`components/ui/ShortcutOverlay.tsx`** - Shortcut reference overlay component
- **`hooks/useKeyboardShortcuts.example.tsx`** - Usage examples
- **`hooks/index.ts`** - Barrel exports for all hooks

## Migration from Old Hook

If you're using the existing `useKeyboardShortcut` hook:

**Old:**
```typescript
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';

useKeyboardShortcut({
  key: 'k',
  meta: true,
  action: () => openCommandPalette(),
});
```

**New:**
```typescript
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

useKeyboardShortcuts({
  onCommandPalette: () => openCommandPalette(),
});
```

The old hook is still available for custom one-off shortcuts. The new hook is specifically for global app-wide shortcuts.

## Best Practices

1. **Use semantic callbacks** - Name callbacks after their purpose, not their key
2. **Provide visual hints** - Use `ShortcutHint` component to show shortcuts in UI
3. **Respect focus context** - The hook does this automatically
4. **Disable when appropriate** - Use `enabled` prop when shortcuts conflict
5. **Document custom shortcuts** - Use `ShortcutOverlay` to show users what's available
6. **Keep Escape functional** - Always provide an `onEscape` handler for modals
7. **Use OS detection** - Show correct modifier key in UI with `isMac`

## Examples

See `hooks/useKeyboardShortcuts.example.tsx` for comprehensive usage examples including:
- Main app integration
- Modal management
- Navigation shortcuts
- Conditional enabling
- Custom shortcut overlays
