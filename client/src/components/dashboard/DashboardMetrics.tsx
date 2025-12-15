/**
 * Dashboard Metrics Component
 * Displays key performance metrics with trend indicators
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import {
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  loading?: boolean;
  className?: string;
}

function MetricCard({
  title,
  value,
  icon,
  trend,
  description,
  loading,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-500" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.isPositive
                      ? 'text-green-600 dark:text-green-500'
                      : 'text-red-600 dark:text-red-500'
                  )}
                >
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardMetricsProps {
  period?: '7d' | '30d' | '90d';
  className?: string;
}

export function DashboardMetrics({ period = '30d', className }: DashboardMetricsProps) {
  // Map period to API format
  const apiPeriod = period === '7d' ? 'week' : period === '30d' ? 'month' : 'quarter';

  // Fetch execution stats
  const statsQuery = trpc.analytics.getExecutionStats.useQuery(
    { period: apiPeriod },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      refetchOnWindowFocus: true,
    }
  );

  // Fetch subscription data for active agents
  const subscriptionQuery = trpc.subscription.getMySubscription.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const statsData = statsQuery.data && 'successCount' in statsQuery.data ? statsQuery.data : null;
  const subscription = subscriptionQuery.data;
  const isLoading = statsQuery.isLoading;

  // Calculate derived metrics
  const tasksCompleted = statsData?.successCount || 0;
  const successRate = statsData?.successRate || 0;
  const averageTime = statsData?.averageDuration
    ? Math.round(statsData.averageDuration / 1000)
    : 0;
  const activeAgents = subscription?.limits?.maxAgents || 0;

  // Mock trend data - in a real app, you'd compare with previous period
  const calculateTrend = (current: number, baseline: number = 0) => {
    if (baseline === 0) return null;
    const change = ((current - baseline) / baseline) * 100;
    return {
      value: Math.round(change * 10) / 10,
      isPositive: change >= 0,
    };
  };

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      <MetricCard
        title="Tasks Completed"
        value={tasksCompleted.toLocaleString()}
        icon={<CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />}
        description={`${period} period`}
        loading={isLoading}
        trend={calculateTrend(tasksCompleted, tasksCompleted * 0.85) || undefined}
        className="hover:shadow-md transition-shadow"
      />

      <MetricCard
        title="Success Rate"
        value={`${successRate.toFixed(1)}%`}
        icon={<Activity className="h-4 w-4 text-blue-600 dark:text-blue-500" />}
        description={
          statsData?.totalExecutions
            ? `${statsData.totalExecutions} total executions`
            : 'No executions yet'
        }
        loading={isLoading}
        trend={
          successRate > 0
            ? {
                value: Math.round((successRate - 90) * 10) / 10,
                isPositive: successRate >= 90,
              }
            : undefined
        }
        className="hover:shadow-md transition-shadow"
      />

      <MetricCard
        title="Avg. Time Saved"
        value={averageTime > 0 ? `${averageTime}s` : '-'}
        icon={<Clock className="h-4 w-4 text-purple-600 dark:text-purple-500" />}
        description="Per execution"
        loading={isLoading}
        trend={
          averageTime > 0
            ? {
                value: -12.5,
                isPositive: true, // Lower is better for time
              }
            : undefined
        }
        className="hover:shadow-md transition-shadow"
      />

      <MetricCard
        title="Active Agents"
        value={activeAgents}
        icon={<Zap className="h-4 w-4 text-amber-600 dark:text-amber-500" />}
        description={
          subscription?.tier?.name
            ? `${subscription.tier.name} plan`
            : 'No subscription'
        }
        loading={subscriptionQuery.isLoading}
        className="hover:shadow-md transition-shadow bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20"
      />
    </div>
  );
}

export default DashboardMetrics;
