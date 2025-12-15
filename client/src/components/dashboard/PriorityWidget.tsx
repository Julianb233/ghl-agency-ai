/**
 * Priority Widget Component
 *
 * Displays high-priority tasks that need immediate attention.
 * Part of the Dashboard Intelligence feature set.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Loader2,
  Zap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PriorityTask {
  id: number;
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  scheduledFor?: string;
  createdAt: string;
}

interface PriorityWidgetProps {
  onViewAll?: () => void;
  maxItems?: number;
}

export function PriorityWidget({ onViewAll, maxItems = 4 }: PriorityWidgetProps) {
  const { data, isLoading, error } = trpc.agencyTasks.getTaskQueue.useQuery(
    {},
    {
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  );

  // Filter for critical and high priority tasks
  const priorityTasks: PriorityTask[] = React.useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks
      .filter((task: any) =>
        task.priority === 'critical' || task.priority === 'high'
      )
      .map((task: any): PriorityTask => ({
        id: task.id,
        name: task.title || task.name,
        priority: task.priority as 'critical' | 'high' | 'medium' | 'low',
        status: task.status,
        scheduledFor: task.scheduledFor ? new Date(task.scheduledFor).toISOString() : undefined,
        createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString(),
      }))
      .slice(0, maxItems);
  }, [data, maxItems]);

  const urgentCount = priorityTasks.filter(t => t.priority === 'critical').length;
  const highCount = priorityTasks.filter(t => t.priority === 'high').length;

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          color: 'text-red-600 dark:text-red-500',
          bgColor: 'bg-red-100 dark:bg-red-500/10',
          borderColor: 'border-l-red-500',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'Critical',
        };
      case 'high':
        return {
          color: 'text-orange-600 dark:text-orange-500',
          bgColor: 'bg-orange-100 dark:bg-orange-500/10',
          borderColor: 'border-l-orange-500',
          icon: <Zap className="w-4 h-4" />,
          label: 'High',
        };
      default:
        return {
          color: 'text-blue-600 dark:text-blue-500',
          bgColor: 'bg-blue-100 dark:bg-blue-500/10',
          borderColor: 'border-l-blue-500',
          icon: <Clock className="w-4 h-4" />,
          label: 'Medium',
        };
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Attention indicator */}
      {urgentCount > 0 && (
        <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-16 -right-16 w-32 h-32 bg-red-500 rotate-45"
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Priority Tasks
          </CardTitle>
          {(urgentCount > 0 || highCount > 0) && (
            <div className="flex items-center gap-2">
              {urgentCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {urgentCount} Critical
                </Badge>
              )}
              {highCount > 0 && (
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 text-xs">
                  {highCount} High
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <AlertCircle className="w-4 h-4" />
            Failed to load tasks
          </div>
        ) : priorityTasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              All Clear!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No urgent tasks requiring attention
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {priorityTasks.map((task, index) => {
                const config = getPriorityConfig(task.priority);
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'p-3 rounded-lg border-l-4 bg-muted/50',
                      config.borderColor
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={config.color}>{config.icon}</span>
                          <span className="text-sm font-medium truncate">
                            {task.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px]', config.color)}
                          >
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {task.status}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-7 px-2"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {priorityTasks.length > 0 && onViewAll && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={onViewAll}
          >
            View All Tasks
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
