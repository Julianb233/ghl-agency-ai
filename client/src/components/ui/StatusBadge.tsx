import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Info, XCircle, LucideIcon } from 'lucide-react';

type StatusVariant = 'success' | 'warning' | 'info' | 'error' | 'default';

interface StatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

const variantConfig: Record<StatusVariant, { 
  bg: string; 
  text: string; 
  border: string;
  icon: LucideIcon;
}> = {
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
    icon: Info,
  },
  error: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/20',
    icon: XCircle,
  },
  default: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    icon: Info,
  },
};

export function StatusBadge({ 
  variant = 'default', 
  children, 
  showIcon = true,
  className 
}: StatusBadgeProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function SuccessBadge({ children, ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="success" {...props}>{children}</StatusBadge>;
}

export function WarningBadge({ children, ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="warning" {...props}>{children}</StatusBadge>;
}

export function InfoBadge({ children, ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="info" {...props}>{children}</StatusBadge>;
}

export function ErrorBadge({ children, ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="error" {...props}>{children}</StatusBadge>;
}
