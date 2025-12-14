/**
 * Quick Actions Component
 * Provides quick access to common tasks and recent task templates
 */

import React from 'react';
import { useLocation } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  FileText,
  BookOpen,
  Plus,
  Globe,
  Mail,
  Phone,
  Database,
  Clock,
  Sparkles,
  Calendar,
  PlayCircle,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  badge?: string;
  disabled?: boolean;
}

function ActionButton({
  icon,
  title,
  description,
  onClick,
  variant = 'default',
  badge,
  disabled,
}: ActionButtonProps) {
  const variantStyles = {
    default: 'bg-background hover:bg-muted',
    primary: 'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 hover:shadow-md border-purple-200 dark:border-purple-800',
    success: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 hover:shadow-md border-green-200 dark:border-green-800',
    warning: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 hover:shadow-md border-amber-200 dark:border-amber-800',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative p-4 rounded-lg border transition-all text-left w-full',
        'hover:scale-[1.02] active:scale-[0.98]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        variantStyles[variant]
      )}
    >
      {badge && (
        <Badge
          variant="default"
          className="absolute -top-2 -right-2 text-xs px-2 shadow-sm"
        >
          {badge}
        </Badge>
      )}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-background/50 flex items-center justify-center flex-shrink-0 shadow-sm">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

interface RecentTaskProps {
  name: string;
  timestamp: string;
  status: 'success' | 'failed';
  onRerun: () => void;
}

function RecentTask({ name, timestamp, status, onRerun }: RecentTaskProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
          status === 'success'
            ? 'bg-green-50 dark:bg-green-950/20'
            : 'bg-red-50 dark:bg-red-950/20'
        )}
      >
        <Clock
          className={cn(
            'h-4 w-4',
            status === 'success'
              ? 'text-green-600 dark:text-green-500'
              : 'text-red-600 dark:text-red-500'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{timestamp}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRerun}
        className="h-8 px-2 text-xs"
        title="Run again"
      >
        <PlayCircle className="h-4 w-4 mr-1" />
        Rerun
      </Button>
    </div>
  );
}

interface QuickActionsProps {
  className?: string;
  showRecentTasks?: boolean;
}

export function QuickActions({
  className,
  showRecentTasks = true,
}: QuickActionsProps) {
  const [, setLocation] = useLocation();

  const actions = [
    {
      icon: <Plus className="h-5 w-5 text-purple-600 dark:text-purple-500" />,
      title: 'New SOP',
      description: 'Create a standard operating procedure',
      onClick: () => setLocation('/workflows/new'),
      variant: 'primary' as const,
    },
    {
      icon: <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-500" />,
      title: 'New Automation',
      description: 'Build an automated workflow',
      onClick: () => setLocation('/workflows'),
      variant: 'primary' as const,
      badge: 'Popular',
    },
    {
      icon: <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-500" />,
      title: 'View Knowledge',
      description: 'Browse knowledge base and documentation',
      onClick: () => setLocation('/knowledge'),
      variant: 'default' as const,
    },
    {
      icon: <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />,
      title: 'Browser Session',
      description: 'Start a new browser automation',
      onClick: () => setLocation('/browser-sessions'),
      variant: 'success' as const,
    },
    {
      icon: <Mail className="h-5 w-5 text-amber-600 dark:text-amber-500" />,
      title: 'Email Campaign',
      description: 'Create and manage email campaigns',
      onClick: () => setLocation('/ai-campaigns'),
      variant: 'default' as const,
    },
    {
      icon: <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-500" />,
      title: 'Lead Import',
      description: 'Upload and enrich lead data',
      onClick: () => setLocation('/lead-lists'),
      variant: 'default' as const,
    },
  ];

  // Mock recent tasks - in a real app, this would come from local storage or API
  const recentTasks = [
    {
      id: 1,
      name: 'Daily CRM Sync',
      timestamp: '2 hours ago',
      status: 'success' as const,
    },
    {
      id: 2,
      name: 'Lead Enrichment',
      timestamp: '5 hours ago',
      status: 'success' as const,
    },
    {
      id: 3,
      name: 'Website Monitoring',
      timestamp: 'Yesterday',
      status: 'failed' as const,
    },
  ];

  const handleRerun = (taskId: number) => {
    console.log('Rerun task:', taskId);
    // TODO: Implement rerun functionality
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Quick Actions Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription className="mt-1">
                Common tasks and workflows to get started
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/workflows')}
              className="text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {actions.map((action, index) => (
              <ActionButton key={index} {...action} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      {showRecentTasks && recentTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Tasks
            </CardTitle>
            <CardDescription className="mt-1">
              Quick access to recently executed tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <RecentTask
                  key={task.id}
                  name={task.name}
                  timestamp={task.timestamp}
                  status={task.status}
                  onRerun={() => handleRerun(task.id)}
                />
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              size="sm"
              onClick={() => setLocation('/scheduled-tasks')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              View All Scheduled Tasks
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default QuickActions;
