/**
 * Usage Chart Component
 * Line chart showing daily execution usage with time period toggles
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { Calendar, Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

type TimePeriod = '7d' | '30d' | '90d';

const periodConfig = {
  '7d': { label: '7 Days', apiPeriod: 'week' as const, groupBy: 'day' as const },
  '30d': { label: '30 Days', apiPeriod: 'month' as const, groupBy: 'day' as const },
  '90d': { label: '90 Days', apiPeriod: 'quarter' as const, groupBy: 'week' as const },
};

interface UsageChartProps {
  className?: string;
  showLimit?: boolean;
}

export function UsageChart({ className, showLimit = true }: UsageChartProps) {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const config = periodConfig[period];

  // Fetch usage statistics
  const usageQuery = trpc.analytics.getUsageStats.useQuery(
    {
      period: config.apiPeriod,
      groupBy: config.groupBy,
    },
    {
      refetchInterval: 60000, // Refetch every minute
      refetchOnWindowFocus: true,
    }
  );

  // Fetch subscription data for limit line
  const subscriptionQuery = trpc.subscription.getMySubscription.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const isLoading = usageQuery.isLoading;
  const data = (usageQuery.data && 'data' in usageQuery.data) ? usageQuery.data.data : [];
  const executionLimit = subscriptionQuery.data?.usage?.executionLimit || 0;
  const dailyLimit = executionLimit / 30; // Approximate daily limit

  // Format data for chart
  const chartData = data.map((item: any) => ({
    date: new Date(item.period as string).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    executions: item.totalExecutions,
    successful: item.successCount,
    failed: item.failedCount,
    limit: showLimit ? dailyLimit : undefined,
  }));

  // Chart configuration
  const chartConfig = {
    executions: {
      label: 'Total Executions',
      color: 'hsl(var(--primary))',
    },
    successful: {
      label: 'Successful',
      color: 'hsl(142.1 76.2% 36.3%)', // Green
    },
    failed: {
      label: 'Failed',
      color: 'hsl(0 84.2% 60.2%)', // Red
    },
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Execution Usage
            </CardTitle>
            <CardDescription className="mt-1">
              Track your daily execution usage over time
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {(Object.keys(periodConfig) as TimePeriod[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
                className="text-xs"
              >
                {periodConfig[p].label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No execution data available for this period
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start running tasks to see usage analytics
            </p>
          </div>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(142.1 76.2% 36.3%)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(142.1 76.2% 36.3%)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <div className="font-medium mb-2">{payload[0].payload.date}</div>
                        <div className="space-y-1">
                          {payload.map((entry, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-4 text-sm"
                            >
                              <span
                                className="flex items-center gap-2"
                                style={{ color: entry.color }}
                              >
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.name}:
                              </span>
                              <span className="font-medium">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-sm text-muted-foreground">{value}</span>
                  )}
                />
                {showLimit && dailyLimit > 0 && (
                  <ReferenceLine
                    y={dailyLimit}
                    stroke="hsl(0 84.2% 60.2%)"
                    strokeDasharray="5 5"
                    label={{
                      value: 'Daily Limit',
                      position: 'right',
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 12,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="successful"
                  stroke="hsl(142.1 76.2% 36.3%)"
                  fill="url(#colorSuccessful)"
                  strokeWidth={2}
                  name="Successful"
                  dot={{ fill: 'hsl(142.1 76.2% 36.3%)', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="executions"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorExecutions)"
                  strokeWidth={2}
                  name="Total Executions"
                  dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {!isLoading && usageQuery.data && 'summary' in usageQuery.data && (
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">
                {usageQuery.data.summary.totalExecutions.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Successful</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-500">
                {usageQuery.data.summary.totalSuccess.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-lg font-semibold text-red-600 dark:text-red-500">
                {usageQuery.data.summary.totalFailed.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default UsageChart;
