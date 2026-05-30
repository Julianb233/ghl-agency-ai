import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { LucideIcon, Inbox, Search, FileX, AlertCircle, Plus } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
  /** Children for custom content */
  children?: React.ReactNode;
  /** Enable animation (default: true) */
  animated?: boolean;
}

const sizeStyles = {
  sm: {
    container: 'py-6',
    iconContainer: 'w-12 h-12',
    icon: 'w-5 h-5',
    title: 'text-sm font-medium',
    description: 'text-xs',
  },
  md: {
    container: 'py-12',
    iconContainer: 'w-16 h-16',
    icon: 'w-6 h-6',
    title: 'text-lg font-semibold',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    iconContainer: 'w-20 h-20',
    icon: 'w-8 h-8',
    title: 'text-xl font-bold',
    description: 'text-base',
  },
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className,
  children,
  animated = true,
}: EmptyStateProps) {
  const styles = sizeStyles[size];
  const ActionIcon = action?.icon || Plus;

  const Wrapper = animated ? motion.div : 'div';
  const wrapperProps = animated
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' as const },
      }
    : {};

  const renderActionButton = () => {
    if (!action) return null;

    const buttonContent = (
      <Button>
        <ActionIcon className="h-4 w-4 mr-2" aria-hidden="true" />
        {action.label}
      </Button>
    );

    if (action.href) {
      return (
        <Link href={action.href}>
          {buttonContent}
        </Link>
      );
    }

    return (
      <Button onClick={action.onClick}>
        <ActionIcon className="h-4 w-4 mr-2" aria-hidden="true" />
        {action.label}
      </Button>
    );
  };

  const renderSecondaryButton = () => {
    if (!secondaryAction) return null;

    if (secondaryAction.href) {
      return (
        <Link href={secondaryAction.href}>
          <Button variant="ghost">{secondaryAction.label}</Button>
        </Link>
      );
    }

    return (
      <Button variant="ghost" onClick={secondaryAction.onClick}>
        {secondaryAction.label}
      </Button>
    );
  };

  return (
    <Wrapper
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        styles.container,
        className
      )}
      {...wrapperProps}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-muted/50 rounded-full blur-xl" />
        <div
          className={cn(
            'relative rounded-full bg-muted border border-border flex items-center justify-center',
            styles.iconContainer
          )}
        >
          <Icon className={cn('text-muted-foreground', styles.icon)} aria-hidden="true" />
        </div>
      </div>

      <h3 className={cn('text-foreground mb-1', styles.title)}>{title}</h3>

      {description && (
        <p className={cn('text-muted-foreground max-w-sm mb-4', styles.description)}>
          {description}
        </p>
      )}

      {children}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
          {renderActionButton()}
          {renderSecondaryButton()}
        </div>
      )}
    </Wrapper>
  );
}

export function NoResultsEmpty({
  searchQuery,
  onClear,
}: {
  searchQuery?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        searchQuery
          ? `No matches for "${searchQuery}". Try adjusting your search.`
          : 'Try adjusting your filters or search terms.'
      }
      action={onClear ? { label: 'Clear search', onClick: onClear } : undefined}
    />
  );
}

export function NoDataEmpty({
  resourceName,
  onAdd,
  addHref,
}: {
  resourceName: string;
  onAdd?: () => void;
  addHref?: string;
}) {
  return (
    <EmptyState
      icon={FileX}
      title={`No ${resourceName} yet`}
      description={`Get started by creating your first ${resourceName.toLowerCase()}.`}
      action={
        onAdd || addHref
          ? { label: `Add ${resourceName}`, onClick: onAdd, href: addHref }
          : undefined
      }
    />
  );
}

export function ErrorEmpty({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description={message || "We couldn't load this content. Please try again."}
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
    />
  );
}

export function NoAgentsEmpty({ onLaunch }: { onLaunch: () => void }) {
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
}

export function NoWorkflowsEmpty({ onCreate }: { onCreate: () => void }) {
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
}

export default EmptyState;
