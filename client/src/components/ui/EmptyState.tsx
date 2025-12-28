import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      {/* Animated Icon Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="relative mb-6"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-slate-500/20 rounded-full blur-xl" />

        {/* Icon circle */}
        <div className="relative w-20 h-20 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
          <Icon className="w-8 h-8 text-slate-500" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-xl font-semibold text-white mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="text-sm text-slate-400 max-w-sm mb-6"
      >
        {description}
      </motion.p>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="flex items-center gap-3"
      >
        {action && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            {action.icon && <action.icon className="w-4 h-4" />}
            {action.label}
          </motion.button>
        )}
        {secondaryAction && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={secondaryAction.onClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
          >
            {secondaryAction.label}
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
};

// Pre-configured empty states for common scenarios
export const NoAgentsEmpty: React.FC<{ onLaunch: () => void }> = ({ onLaunch }) => {
  const { Bot, Play } = require('lucide-react');
  return (
    <EmptyState
      icon={Bot}
      title="No Agents Running"
      description="Launch your first browser automation agent to start automating tasks."
      action={{
        label: 'Launch Agent',
        onClick: onLaunch,
        icon: Play,
      }}
      secondaryAction={{
        label: 'Browse Templates',
        onClick: () => {},
      }}
    />
  );
};

export const NoWorkflowsEmpty: React.FC<{ onCreate: () => void }> = ({ onCreate }) => {
  const { Workflow, Plus } = require('lucide-react');
  return (
    <EmptyState
      icon={Workflow}
      title="No Workflows Yet"
      description="Create automated workflows to handle repetitive tasks effortlessly."
      action={{
        label: 'Create Workflow',
        onClick: onCreate,
        icon: Plus,
      }}
    />
  );
};

export const NoResultsEmpty: React.FC<{ onClear?: () => void }> = ({ onClear }) => {
  const { Search } = require('lucide-react');
  return (
    <EmptyState
      icon={Search}
      title="No Results Found"
      description="Try adjusting your search or filter criteria to find what you're looking for."
      secondaryAction={onClear ? {
        label: 'Clear Filters',
        onClick: onClear,
      } : undefined}
    />
  );
};

export default EmptyState;
