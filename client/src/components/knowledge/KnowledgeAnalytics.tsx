/**
 * Knowledge Analytics Component
 *
 * Visualizes knowledge base metrics including usage statistics, quality trends,
 * category breakdown, and most used entries.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Loader2,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  usageOverTime: {
    labels: string[];
    data: number[];
  };
  categoryBreakdown: {
    labels: string[];
    data: number[];
    colors: string[];
  };
  topEntries: {
    title: string;
    category: string;
    usageCount: number;
    successRate: number;
  }[];
  qualityTrend: {
    labels: string[];
    data: number[];
  };
  metrics: {
    totalEntries: number;
    totalUsage: number;
    avgSuccessRate: number;
    avgConfidence: number;
    growth: {
      entries: number;
      usage: number;
      quality: number;
    };
  };
}

export function KnowledgeAnalytics() {
  const { data: statsData, isLoading } = trpc.knowledge.getSystemStats.useQuery();

  // Mock analytics data (in production, this would come from the API)
  const analyticsData: AnalyticsData = useMemo(() => {
    const stats = statsData?.stats;

    return {
      usageOverTime: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: [45, 52, 48, 65, 72, 58, 43],
      },
      categoryBreakdown: {
        labels: ['Workflows', 'Brand Voice', 'Preferences', 'Processes', 'Technical'],
        data: [35, 25, 15, 15, 10],
        colors: ['#3b82f6', '#a855f7', '#22c55e', '#f97316', '#ef4444'],
      },
      topEntries: [
        {
          title: 'Email Campaign Workflow',
          category: 'workflow',
          usageCount: 156,
          successRate: 0.92,
        },
        {
          title: 'Lead Follow-up Process',
          category: 'process',
          usageCount: 134,
          successRate: 0.88,
        },
        {
          title: 'Professional Tone Guidelines',
          category: 'brand_voice',
          usageCount: 98,
          successRate: 0.95,
        },
        {
          title: 'CRM Data Validation',
          category: 'technical',
          usageCount: 87,
          successRate: 0.91,
        },
        {
          title: 'Response Time Preferences',
          category: 'preference',
          usageCount: 76,
          successRate: 0.85,
        },
      ],
      qualityTrend: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
        data: [0.72, 0.75, 0.78, 0.81, 0.84, 0.87],
      },
      metrics: {
        totalEntries: stats?.totalPatterns || 48,
        totalUsage: 1247,
        avgSuccessRate: stats?.avgPatternSuccessRate || 0.87,
        avgConfidence: 0.82,
        growth: {
          entries: 12,
          usage: 8,
          quality: 5,
        },
      },
    };
  }, [statsData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Entries"
          value={analyticsData.metrics.totalEntries}
          change={analyticsData.metrics.growth.entries}
          icon={BarChart3}
          trend="up"
        />
        <MetricCard
          title="Total Usage"
          value={analyticsData.metrics.totalUsage}
          change={analyticsData.metrics.growth.usage}
          icon={Activity}
          trend="up"
        />
        <MetricCard
          title="Avg Success Rate"
          value={`${Math.round(analyticsData.metrics.avgSuccessRate * 100)}%`}
          change={analyticsData.metrics.growth.quality}
          icon={Target}
          trend="up"
        />
        <MetricCard
          title="Avg Confidence"
          value={`${Math.round(analyticsData.metrics.avgConfidence * 100)}%`}
          change={3}
          icon={Award}
          trend="up"
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="categories">Category Breakdown</TabsTrigger>
          <TabsTrigger value="quality">Quality Trends</TabsTrigger>
          <TabsTrigger value="top">Top Entries</TabsTrigger>
        </TabsList>

        {/* Usage Over Time */}
        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Usage Over Time</CardTitle>
              <CardDescription>
                Knowledge entry usage in the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Line
                  data={{
                    labels: analyticsData.usageOverTime.labels,
                    datasets: [
                      {
                        label: 'Usage Count',
                        data: analyticsData.usageOverTime.data,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category Breakdown */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>
                Breakdown of knowledge entries by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <div className="h-[300px] flex items-center justify-center">
                  <Doughnut
                    data={{
                      labels: analyticsData.categoryBreakdown.labels,
                      datasets: [
                        {
                          data: analyticsData.categoryBreakdown.data,
                          backgroundColor: analyticsData.categoryBreakdown.colors,
                          borderWidth: 2,
                          borderColor: '#fff',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                      },
                    }}
                  />
                </div>

                {/* Category List */}
                <div className="space-y-3">
                  {analyticsData.categoryBreakdown.labels.map((label, idx) => (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: analyticsData.categoryBreakdown.colors[idx],
                            }}
                          />
                          <span>{label}</span>
                        </div>
                        <span className="font-medium">
                          {analyticsData.categoryBreakdown.data[idx]}%
                        </span>
                      </div>
                      <Progress
                        value={analyticsData.categoryBreakdown.data[idx]}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Trend */}
        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>Quality Trend</CardTitle>
              <CardDescription>
                Average success rate over the last 6 weeks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Bar
                  data={{
                    labels: analyticsData.qualityTrend.labels,
                    datasets: [
                      {
                        label: 'Success Rate',
                        data: analyticsData.qualityTrend.data,
                        backgroundColor: 'rgba(34, 197, 94, 0.5)',
                        borderColor: 'rgb(34, 197, 94)',
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                          callback: (value) => `${Math.round(Number(value) * 100)}%`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Entries */}
        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle>Most Used Entries</CardTitle>
              <CardDescription>
                Top 5 knowledge entries by usage count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {analyticsData.topEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        {idx + 1}
                      </div>

                      {/* Entry Info */}
                      <div className="flex-1">
                        <div className="font-medium">{entry.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {entry.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {entry.usageCount} uses
                          </span>
                        </div>
                      </div>

                      {/* Success Rate */}
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {Math.round(entry.successRate * 100)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          success
                        </div>
                      </div>

                      {/* Visual Indicator */}
                      <div className="w-16">
                        <Progress
                          value={entry.successRate * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number | string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, change, icon: Icon, trend }: MetricCardProps) {
  const trendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const TrendIcon = trendIcon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <TrendIcon
            className={cn(
              'h-3 w-3',
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500'
            )}
          />
          <span className={cn(
            trend === 'up' && 'text-green-500',
            trend === 'down' && 'text-red-500'
          )}>
            {change}%
          </span>
          <span>vs last period</span>
        </div>
      </CardContent>
    </Card>
  );
}
