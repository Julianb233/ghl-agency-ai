import React from 'react';
import { X } from 'lucide-react';
import { getDefaultShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Badge } from './badge';

export interface ShortcutOverlayProps {
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

/**
 * Keyboard shortcut reference overlay
 *
 * Displays all available keyboard shortcuts grouped by category.
 * Automatically detects OS and shows appropriate modifier keys (⌘ vs Ctrl).
 *
 * @example
 * ```tsx
 * const [showShortcuts, setShowShortcuts] = useState(false);
 * const { isMac } = useKeyboardShortcuts({
 *   onShowShortcuts: () => setShowShortcuts(true)
 * });
 *
 * return (
 *   <ShortcutOverlay
 *     open={showShortcuts}
 *     onClose={() => setShowShortcuts(false)}
 *     isMac={isMac}
 *   />
 * );
 * ```
 */
export function ShortcutOverlay({
  open,
  onClose,
  isMac = false,
  customShortcuts,
}: ShortcutOverlayProps) {
  const shortcuts = customShortcuts || getDefaultShortcuts(isMac);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Keyboard Shortcuts</span>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Navigation Section */}
          {shortcuts.navigation && shortcuts.navigation.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-border" />
                <span>Navigation</span>
                <span className="h-px flex-1 bg-border" />
              </h3>
              <div className="space-y-2">
                {shortcuts.navigation.map((shortcut, index) => (
                  <ShortcutRow
                    key={`nav-${index}`}
                    shortcut={shortcut.key}
                    description={shortcut.description}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Actions Section */}
          {shortcuts.actions && shortcuts.actions.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-border" />
                <span>Actions</span>
                <span className="h-px flex-1 bg-border" />
              </h3>
              <div className="space-y-2">
                {shortcuts.actions.map((shortcut, index) => (
                  <ShortcutRow
                    key={`action-${index}`}
                    shortcut={shortcut.key}
                    description={shortcut.description}
                  />
                ))}
              </div>
            </section>
          )}

          {/* General Section */}
          {shortcuts.general && shortcuts.general.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-border" />
                <span>General</span>
                <span className="h-px flex-1 bg-border" />
              </h3>
              <div className="space-y-2">
                {shortcuts.general.map((shortcut, index) => (
                  <ShortcutRow
                    key={`general-${index}`}
                    shortcut={shortcut.key}
                    description={shortcut.description}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer hint */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <Badge variant="outline" className="mx-1 px-2 py-0.5 text-xs">?</Badge>
            anytime to view this reference
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual shortcut row component
 */
interface ShortcutRowProps {
  shortcut: string;
  description: string;
}

function ShortcutRow({ shortcut, description }: ShortcutRowProps) {
  // Parse the shortcut to create individual key badges
  const keys = shortcut.split('+').map((k) => k.trim());

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-xs font-medium text-foreground shadow-sm">
              {key}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-xs text-muted-foreground">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * Lightweight shortcut hint component for inline display
 *
 * @example
 * ```tsx
 * <button>
 *   Open Settings
 *   <ShortcutHint shortcut="⌘," />
 * </button>
 * ```
 */
export interface ShortcutHintProps {
  shortcut: string;
  className?: string;
}

export function ShortcutHint({ shortcut, className = '' }: ShortcutHintProps) {
  const keys = shortcut.split('+').map((k) => k.trim());

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-[10px] text-muted-foreground">+</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}
