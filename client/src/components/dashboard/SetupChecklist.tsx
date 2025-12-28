import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  X,
  ChevronRight,
  Plug,
  Palette,
  Bot,
  Workflow,
  Users,
  Sparkles,
  PartyPopper
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { trpc } from '@/lib/trpc';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  action: () => void;
}

interface SetupChecklistProps {
  onNavigate: (path: string) => void;
  className?: string;
}

export const SetupChecklist: React.FC<SetupChecklistProps> = ({
  onNavigate,
  className,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'ghl',
      label: 'Connect GoHighLevel',
      description: 'Link your GHL account for full automation',
      icon: Plug,
      completed: false,
      action: () => onNavigate('/dashboard/integrations'),
    },
    {
      id: 'brand',
      label: 'Upload Brand Guidelines',
      description: 'Help AI match your voice and style',
      icon: Palette,
      completed: false,
      action: () => onNavigate('/dashboard/settings'),
    },
    {
      id: 'first-task',
      label: 'Run Your First Agent',
      description: 'Experience the magic of browser automation',
      icon: Bot,
      completed: false,
      action: () => onNavigate('/dashboard/agents'),
    },
    {
      id: 'workflow',
      label: 'Create a Workflow',
      description: 'Automate repetitive tasks',
      icon: Workflow,
      completed: false,
      action: () => onNavigate('/dashboard/workflows'),
    },
    {
      id: 'team',
      label: 'Invite Team Members',
      description: 'Collaborate with your team',
      icon: Users,
      completed: false,
      action: () => onNavigate('/dashboard/settings'),
    },
  ]);

  // Fetch onboarding status from backend
  const { data: onboardingStatus } = trpc.onboarding.getStatus.useQuery(undefined, {
    retry: 2,
  });

  // Fetch user profile to check for GHL connection
  const { data: profile } = trpc.onboarding.getProfile.useQuery(undefined, {
    retry: 2,
  });

  // Fetch agent executions to check if first agent was run
  const { data: executions } = trpc.agent.listExecutions.useQuery(
    { limit: 1, offset: 0 },
    { retry: 2 }
  );

  // Load completion state from localStorage AND sync with backend data
  useEffect(() => {
    const saved = localStorage.getItem('setup-checklist');
    if (saved) {
      const { dismissed: savedDismissed, completedItems } = JSON.parse(saved);
      setDismissed(savedDismissed);

      // Merge localStorage with real backend state
      setItems(prev => prev.map(item => {
        // Check localStorage first
        let completed = completedItems?.includes(item.id) || false;

        // Override with real backend data
        if (item.id === 'ghl' && profile?.data?.goals) {
          // GHL connected if profile has goals (from onboarding)
          completed = true;
        }
        if (item.id === 'first-task' && executions && executions.length > 0) {
          // First agent run if any executions exist
          completed = true;
        }

        return { ...item, completed };
      }));
    } else {
      // Initialize from backend data only
      setItems(prev => prev.map(item => {
        let completed = false;

        if (item.id === 'ghl' && profile?.data?.goals) {
          completed = true;
        }
        if (item.id === 'first-task' && executions && executions.length > 0) {
          completed = true;
        }

        return { ...item, completed };
      }));
    }
  }, [profile, executions]);

  // Save completion state
  useEffect(() => {
    const completedItems = items.filter(i => i.completed).map(i => i.id);
    localStorage.setItem('setup-checklist', JSON.stringify({
      dismissed,
      completedItems,
    }));
  }, [items, dismissed]);

  // Celebrate completion
  useEffect(() => {
    const allCompleted = items.every(i => i.completed);
    if (allCompleted && items.length > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [items]);

  const completedCount = items.filter(i => i.completed).length;
  const progress = (completedCount / items.length) * 100;
  const allCompleted = completedCount === items.length;

  const handleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              {allCompleted ? (
                <PartyPopper className="w-5 h-5 text-white" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {allCompleted ? 'Setup Complete!' : 'Complete Your Setup'}
              </h3>
              <p className="text-sm text-slate-400">
                {allCompleted
                  ? 'You\'re ready to automate everything'
                  : `${completedCount} of ${items.length} steps completed`
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            aria-label="Dismiss setup checklist"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Progress Bar */}
        <div
          className="mt-4 h-2 bg-slate-700/50 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Setup progress: ${completedCount} of ${items.length} completed`}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="p-2">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={item.action}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200',
                'hover:bg-slate-800/50',
                item.completed && 'opacity-60'
              )}
            >
              {/* Completion Toggle */}
              <button
                onClick={(e) => handleComplete(item.id, e)}
                className={cn(
                  'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                  item.completed
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-slate-600 hover:border-emerald-500'
                )}
                aria-label={`Mark ${item.label} as ${item.completed ? 'incomplete' : 'complete'}`}
                aria-checked={item.completed}
                role="checkbox"
              >
                {item.completed && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </button>

              {/* Icon */}
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                item.completed ? 'bg-slate-800' : 'bg-slate-800/80'
              )}>
                <Icon className={cn(
                  'w-4 h-4',
                  item.completed ? 'text-slate-500' : 'text-emerald-400'
                )} />
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className={cn(
                  'text-sm font-medium',
                  item.completed ? 'text-slate-400 line-through' : 'text-white'
                )}>
                  {item.label}
                </div>
                <div className="text-xs text-slate-500">
                  {item.description}
                </div>
              </div>

              {/* Arrow */}
              {!item.completed && (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      {allCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-t border-slate-700/50 text-center"
        >
          <button
            onClick={() => setDismissed(true)}
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Dismiss this panel
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SetupChecklist;
