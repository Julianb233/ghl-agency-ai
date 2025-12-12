/**
 * MCP Metrics Component
 *
 * Display metrics and analytics for MCP server performance.
 * Shows tool usage, response times, and error rates.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Zap,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  AlertTriangle,
} from 'lucide-react';

interface MCPMetricsProps {
  metrics?: {
    uptime?: number;
    toolsExecuted?: number;
    totalRequests?: number;
    errorRate?: number;
    avgResponseTime?: number;
    toolUsage?: Record<string, number>;
  };
}

export function MCPMetrics({ metrics }: MCPMetricsProps) {
  // Default/mock metrics if not provided
  const defaultMetrics = {
    uptime: 86400, // 1 day in seconds
    toolsExecuted: 1234,
    totalRequests: 5678,
    errorRate: 0.02,
    avgResponseTime: 145,
    toolUsage: {
      'file/read': 450,
      'shell/execute': 320,
      'web/request': 280,
      'database/query': 184,
    },
  };

  const data = metrics || defaultMetrics;

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Requests"
          value={data.totalRequests?.toLocaleString() || '0'}
          icon={Activity}
          description="All-time requests"
        />
        <MetricCard
          title="Tools Executed"
          value={data.toolsExecuted?.toLocaleString() || '0'}
          icon={Zap}
          description="Successful executions"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${data.avgResponseTime || 0}ms`}
          icon={Clock}
          description="Average latency"
        />
        <MetricCard
          title="Error Rate"
          value={`${((data.errorRate || 0) * 100).toFixed(2)}%`}
          icon={AlertTriangle}
          description="Request failures"
          status={data.errorRate && data.errorRate < 0.05 ? 'success' : 'warning'}
        />
      </div>

      {/* Tool Usage */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tool Usage
            </CardTitle>
            <CardDescription>Most frequently used tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.toolUsage || {}).map(([tool, count]) => {
                const maxCount = Math.max(...Object.values(data.toolUsage || {}));
                const percentage = (count / maxCount) * 100;

                return (
                  <div key={tool}>
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm">{tool}</code>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Trends
            </CardTitle>
            <CardDescription>System health indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Success Rate */}
              <HealthIndicator
                label="Success Rate"
                value={100 - (data.errorRate || 0) * 100}
                threshold={{ good: 95, warning: 90 }}
              />

              {/* Response Time */}
              <HealthIndicator
                label="Response Time"
                value={data.avgResponseTime || 0}
                threshold={{ good: 200, warning: 500 }}
                unit="ms"
                inverse
              />

              {/* Uptime */}
              <HealthIndicator
                label="Uptime"
                value={99.9}
                threshold={{ good: 99, warning: 95 }}
                unit="%"
              />

              {/* Throughput */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Requests/Hour</span>
                  <span className="text-sm font-medium">
                    {((data.totalRequests || 0) / ((data.uptime || 1) / 3600)).toFixed(0)}
                  </span>
                </div>
                <Badge variant="secondary">Normal Load</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Usage by Category
          </CardTitle>
          <CardDescription>Tool execution distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CategoryStat
              name="File Operations"
              count={450}
              total={data.toolsExecuted || 1}
              color="bg-blue-500"
            />
            <CategoryStat
              name="Shell Commands"
              count={320}
              total={data.toolsExecuted || 1}
              color="bg-green-500"
            />
            <CategoryStat
              name="Web Operations"
              count={280}
              total={data.toolsExecuted || 1}
              color="bg-purple-500"
            />
            <CategoryStat
              name="Database"
              count={184}
              total={data.toolsExecuted || 1}
              color="bg-orange-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  status = 'default',
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  status?: 'success' | 'warning' | 'error' | 'default';
}) {
  const statusColors = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    default: 'text-muted-foreground',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${statusColors[status]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// Health Indicator Component
function HealthIndicator({
  label,
  value,
  threshold,
  unit = '%',
  inverse = false,
}: {
  label: string;
  value: number;
  threshold: { good: number; warning: number };
  unit?: string;
  inverse?: boolean;
}) {
  const getStatus = () => {
    if (inverse) {
      if (value <= threshold.good) return 'good';
      if (value <= threshold.warning) return 'warning';
      return 'bad';
    }
    if (value >= threshold.good) return 'good';
    if (value >= threshold.warning) return 'warning';
    return 'bad';
  };

  const status = getStatus();
  const colors = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    bad: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-medium">
          {value.toFixed(unit === '%' ? 1 : 0)}{unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${colors[status]} transition-all`}
            style={{ width: `${Math.min((value / threshold.good) * 100, 100)}%` }}
          />
        </div>
        <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      </div>
    </div>
  );
}

// Category Stat Component
function CategoryStat({
  name,
  count,
  total,
  color,
}: {
  name: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = (count / total) * 100;

  return (
    <div className="text-center p-3 border rounded-lg">
      <div className={`w-12 h-12 mx-auto mb-2 rounded-full ${color} opacity-20`} />
      <div className="text-lg font-bold">{count}</div>
      <div className="text-xs text-muted-foreground">{name}</div>
      <Badge variant="outline" className="mt-1">
        {percentage.toFixed(1)}%
      </Badge>
    </div>
  );
}
