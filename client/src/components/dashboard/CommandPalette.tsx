import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bot,
  Network,
  Workflow,
  Settings,
  Key,
  Plug,
  HelpCircle,
  Home,
  Play,
  Clock,
  Zap,
  FileText,
  Users,
  Globe,
  ArrowRight,
  Command
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'navigation' | 'action' | 'recent';
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Define all available commands
  const commands: CommandItem[] = useMemo(() => [
    // Recent / Quick Actions
    {
      id: 'new-task',
      label: 'New Agent Task',
      description: 'Start a new browser automation task',
      icon: Play,
      category: 'action',
      action: () => {
        onNavigate('/dashboard/agents');
        onClose();
      },
      shortcut: '⌘N',
    },
    {
      id: 'view-running',
      label: 'View Running Agents',
      description: 'See all currently active agents',
      icon: Bot,
      category: 'action',
      action: () => {
        onNavigate('/dashboard/agents');
        onClose();
      },
    },
    {
      id: 'create-workflow',
      label: 'Create Workflow',
      description: 'Build a new automation workflow',
      icon: Workflow,
      category: 'action',
      action: () => {
        onNavigate('/dashboard/workflows');
        onClose();
      },
    },
    {
      id: 'spawn-swarm',
      label: 'Spawn Agent Swarm',
      description: 'Start a multi-agent coordination task',
      icon: Network,
      category: 'action',
      action: () => {
        onNavigate('/dashboard/swarms');
        onClose();
      },
    },

    // Navigation
    {
      id: 'nav-home',
      label: 'Go to Home',
      description: 'Dashboard overview',
      icon: Home,
      category: 'navigation',
      action: () => {
        onNavigate('/dashboard');
        onClose();
      },
      shortcut: '⌘H',
    },
    {
      id: 'nav-agents',
      label: 'Go to Agents',
      description: 'Browser automation agents',
      icon: Bot,
      category: 'navigation',
      action: () => {
        onNavigate('/dashboard/agents');
        onClose();
      },
    },
    {
      id: 'nav-swarms',
      label: 'Go to Swarms',
      description: 'Multi-agent coordination',
      icon: Network,
      category: 'navigation',
      action: () => {
        onNavigate('/dashboard/swarms');
        onClose();
      },
    },
    {
      id: 'nav-workflows',
      label: 'Go to Workflows',
      description: 'Automation workflows',
      icon: Workflow,
      category: 'navigation',
      action: () => {
        onNavigate('/dashboard/workflows');
        onClose();
      },
    },
    {
      id: 'nav-integrations',
      label: 'Go to Integrations',
      description: 'Connect services and APIs',
      icon: Plug,
      category: 'navigation',
      action: () => {
        onNavigate('/dashboard/integrations');
        onClose();
      },
    },
    {
      id: 'nav-credentials',
      label: 'Go to Credentials',
      description: 'Secure credential vault',
      icon: Key,
      category: 'navigation',
      action: () => {
        onNavigate('/dashboard/credentials');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Account and preferences',
      icon: Settings,
      category: 'navigation',
      action: () => {
        onNavigate('/dashboard/settings');
        onClose();
      },
      shortcut: '⌘,',
    },
    {
      id: 'nav-docs',
      label: 'Open Documentation',
      description: 'Help and guides',
      icon: HelpCircle,
      category: 'navigation',
      action: () => {
        onNavigate('/docs');
        onClose();
      },
      shortcut: '⌘/',
    },
  ], [onNavigate, onClose]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.description?.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {
      action: [],
      navigation: [],
      recent: [],
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, filteredCommands, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'action': return 'Quick Actions';
      case 'navigation': return 'Navigation';
      case 'recent': return 'Recent';
      default: return category;
    }
  };

  let globalIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-[15%] -translate-x-1/2 w-full max-w-xl z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
          >
            <div className="bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
                <Search className="w-5 h-5 text-slate-400" aria-hidden="true" />
                <label htmlFor="command-search" className="sr-only">Search commands</label>
                <input
                  id="command-search"
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
                  aria-autocomplete="list"
                  aria-controls="command-results"
                />
                <kbd className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-xs">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div
                id="command-results"
                ref={listRef}
                className="max-h-80 overflow-y-auto p-2"
                role="listbox"
                aria-label="Command results"
              >
                {filteredCommands.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No commands found</p>
                  </div>
                ) : (
                  <>
                    {['action', 'navigation', 'recent'].map(category => {
                      const items = groupedCommands[category];
                      if (items.length === 0) return null;

                      return (
                        <div key={category} className="mb-2">
                          <div className="px-2 py-1.5">
                            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                              {getCategoryLabel(category)}
                            </span>
                          </div>
                          {items.map((cmd) => {
                            globalIndex++;
                            const isSelected = globalIndex === selectedIndex;
                            const Icon = cmd.icon;
                            const itemIndex = globalIndex;

                            return (
                              <button
                                key={cmd.id}
                                data-index={itemIndex}
                                onClick={cmd.action}
                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                className={cn(
                                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                  isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                                )}
                                role="option"
                                aria-selected={isSelected}
                              >
                                <div className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center',
                                  isSelected ? 'bg-emerald-500/20' : 'bg-slate-800'
                                )}>
                                  <Icon className={cn(
                                    'w-4 h-4',
                                    isSelected ? 'text-emerald-400' : 'text-slate-400'
                                  )} />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="text-sm font-medium text-white">
                                    {cmd.label}
                                  </div>
                                  {cmd.description && (
                                    <div className="text-xs text-slate-500">
                                      {cmd.description}
                                    </div>
                                  )}
                                </div>
                                {cmd.shortcut && (
                                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-xs">
                                    {cmd.shortcut}
                                  </kbd>
                                )}
                                {isSelected && (
                                  <ArrowRight className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-slate-800">↑</kbd>
                    <kbd className="px-1 py-0.5 rounded bg-slate-800">↓</kbd>
                    <span>Navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 rounded bg-slate-800">↵</kbd>
                    <span>Select</span>
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <Command className="w-3 h-3" />
                  <span>K to toggle</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
