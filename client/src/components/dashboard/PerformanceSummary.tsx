/**
 * Performance Summary Component
 *
 * Health score dashboard with key metrics and trend indicators.
 * Part of the Dashboard Intelligence feature set.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Heart,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PerformanceSummaryProps {
  period?: '24h' | '7d' | '30d';
}

export function PerformanceSummary({ period = '7d' }: PerformanceSummaryProps) {
  // Map UI period to API period
  const apiPeriod = period === '24h' ? 'day' : period === '7d' ? 'week' : 'month';

  const { data, isLoading } = trpc.analytics.getExecutionStats.useQuery(
    { period: apiPeriod },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const stats = data && 'successRate' in data ? data : null;

  // Calculate health score based on multiple metrics
  const calculateHealthScore = () => {
    if (!stats) return { score: 0, status: 'unknown' as const };

    const successWeight = 0.5;
    const responseTimeWeight = 0.3;
    const executionWeight = 0.2;

    // Success rate contribution (0-100)
    const successContrib = (stats.successRate || 0) * successWeight;

    // Response time contribution (assuming <500ms is ideal)
    const avgDuration = stats.averageDuration || 0;
    const responseScore = Math.max(0, 100 - (avgDuration / 10)); // Penalty for slow responses
    const responseContrib = responseScore * responseTimeWeight;

    // Execution count contribution (higher is better)
    const executionScore = Math.min(100, (stats.totalExecutions / 10) * 100);
    const executionContrib = executionScore * executionWeight;

    const totalScore = Math.round(successContrib + responseContrib + executionContrib);

    let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (totalScore >= 90) status = 'excellent';
    else if (totalScore >= 70) status = 'good';
    else if (totalScore >= 50) status = 'fair';

    return { score: totalScore, status };
  };

  const { score, status } = calculateHealthScore();

  const getStatusConfig = () => {
    switch (status) {
      case 'excellent':
        return {
          color: 'text-green-600 dark:text-green-500',
          bgColor: 'bg-green-500',
          label: 'Excellent',
          icon: <CheckCircle2 className="w-5 h-5" />,
        };
      case 'good':
        return {
          color: 'text-blue-600 dark:text-blue-500',
          bgColor: 'bg-blue-500',
          label: 'Good',
          icon: <Activity className="w-5 h-5" />,
        };
      case 'fair':
        return {
          color: 'text-yellow-600 dark:text-yellow-500',
          bgColor: 'bg-yellow-500',
          label: 'Fair',
          icon: <AlertTriangle className="w-5 h-5" />,
        };
      default:
        return {
          color: 'text-red-600 dark:text-red-500',
          bgColor: 'bg-red-500',
          label: 'Needs Attention',
          icon: <AlertTriangle className="w-5 h-5" />,
        };
    }
  };

  const statusConfig = getStatusConfig();

  const metrics = [
    {
      label: 'Success Rate',
      value: stats?.successRate || 0,
      unit: '%',
      icon: <CheckCircle2 className="w-4 h-4" />,
      trend: 0, // TODO: Calculate trend from historical data
      target: 95,
    },
    {
      label: 'Avg Response',
      value: stats?.averageDuration ? (stats.averageDuration / 1000).toFixed(1) : '0',
      unit: 's',
      icon: <Clock className="w-4 h-4" />,
      trend: 0, // TODO: Calculate trend from historical data
      target: null, // Lower is better
      invertTrend: true,
    },
    {
      label: 'Tasks/Day',
      value: stats ? Math.round(stats.totalExecutions / 7) : 0,
      unit: '',
      icon: <Zap className="w-4 h-4" />,
      trend: 0, // TODO: Calculate trend from historical data
      target: null,
    },
  ];

  return (
    <Card className="relative overflow-hidden">
      {/* Background gradient based on health */}
      <div
        className={cn(
          'absolute inset-0 opacity-5',
          status === 'excellent' && 'bg-gradient-to-br from-green-500 to-emerald-500',
          status === 'good' && 'bg-gradient-to-br from-blue-500 to-cyan-500',
          status === 'fair' && 'bg-gradient-to-br from-yellow-500 to-orange-500',
          status === 'poor' && 'bg-gradient-to-br from-red-500 to-pink-500'
        )}
      />

      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          System Health
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Health Score Circle */}
            <div className="flex items-center gap-6 mb-6">
              <div className="relative">
                <svg className="w-24 h-24 transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/20"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={statusConfig.color}
                    strokeDasharray={`${score * 2.51} 251`}
                    initial={{ strokeDasharray: '0 251' }}
                    animate={{ strokeDasharray: `${score * 2.51} 251` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{score}</span>
                  <span className="text-xs text-muted-foreground">Score</span>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={statusConfig.color}>{statusConfig.icon}</span>
                  <span className={cn('font-semibold', statusConfig.color)}>
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on success rate, response time, and task throughput over the past {period}
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              {metrics.map((metric) => {
                const trendIsPositive = metric.invertTrend
                  ? metric.trend < 0
                  : metric.trend > 0;

                return (
                  <div
                    key={metric.label}
                    className="p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      {metric.icon}
                      <span className="text-[10px] font-medium uppercase tracking-wider">
                        {metric.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">{metric.value}</span>
                      <span className="text-xs text-muted-foreground">
                        {metric.unit}
                      </span>
                    </div>
                    {metric.trend !== 0 && (
                      <div
                        className={cn(
                          'flex items-center gap-0.5 mt-1 text-xs',
                          trendIsPositive ? 'text-green-600' : 'text-red-600'
                        )}
                      >
                        {trendIsPositive ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        <span>{Math.abs(metric.trend)}%</span>
                      </div>
                    )}
                    {metric.target && (
                      <Progress
                        value={(Number(metric.value) / metric.target) * 100}
                        className="h-1 mt-2"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
