/**
 * Cost Dashboard Component
 * Comprehensive cost tracking and analytics display for API usage monitoring
 *
 * Features:
 * - Overview of all cost categories (Claude, Gemini, Browserbase, Storage)
 * - Cost trends over time
 * - Budget status and alerts
 * - Detailed breakdowns by provider and model
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Cpu,
  HardDrive,
  Globe,
  AlertTriangle,
  BarChart3,
  Zap,
  Settings,
} from "lucide-react";

type TimePeriod = "day" | "week" | "month" | "quarter" | "year";

/**
 * Format currency with appropriate precision
 */
function formatCurrency(amount: number): string {
  if (amount < 0.01) {
    return `$${amount.toFixed(6)}`;
  }
  if (amount < 1) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Budget Settings Dialog
 */
interface BudgetSettingsDialogProps {
  budget: {
    hasBudget: boolean;
    dailyLimit?: number;
    weeklyLimit?: number;
    monthlyLimit?: number;
    alertThreshold?: number;
    autoStopOnLimit?: boolean;
  };
  onSave: (data: {
    dailyBudget?: number;
    weeklyBudget?: number;
    monthlyBudget?: number;
    alertThreshold: number;
    autoStopOnLimit: boolean;
  }) => void;
}

function BudgetSettingsDialog({ budget, onSave }: BudgetSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [dailyBudget, setDailyBudget] = useState(budget.dailyLimit?.toString() || "");
  const [weeklyBudget, setWeeklyBudget] = useState(budget.weeklyLimit?.toString() || "");
  const [monthlyBudget, setMonthlyBudget] = useState(budget.monthlyLimit?.toString() || "");
  const [alertThreshold, setAlertThreshold] = useState((budget.alertThreshold || 80).toString());
  const [autoStopOnLimit, setAutoStopOnLimit] = useState(budget.autoStopOnLimit || false);

  const setBudgetMutation = trpc.costs.setBudget.useMutation({
    onSuccess: () => {
      setOpen(false);
    },
  });

  const handleSave = () => {
    const data = {
      dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined,
      weeklyBudget: weeklyBudget ? parseFloat(weeklyBudget) : undefined,
      monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
      alertThreshold: parseFloat(alertThreshold) || 80,
      autoStopOnLimit,
    };

    setBudgetMutation.mutate(data);
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Budget Settings</DialogTitle>
          <DialogDescription>
            Set spending limits and configure budget alerts. Leave fields empty to disable that budget limit.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="daily-budget">Daily Budget ($)</Label>
            <Input
              id="daily-budget"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 10.00"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weekly-budget">Weekly Budget ($)</Label>
            <Input
              id="weekly-budget"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 50.00"
              value={weeklyBudget}
              onChange={(e) => setWeeklyBudget(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="monthly-budget">Monthly Budget ($)</Label>
            <Input
              id="monthly-budget"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 200.00"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="alert-threshold">Alert Threshold (%)</Label>
            <Input
              id="alert-threshold"
              type="number"
              step="1"
              min="1"
              max="100"
              placeholder="80"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Receive alerts when spending reaches this percentage of your budget
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-stop">Auto-stop on limit</Label>
              <p className="text-xs text-muted-foreground">
                Automatically disable API access when budget limit is reached
              </p>
            </div>
            <Switch
              id="auto-stop"
              checked={autoStopOnLimit}
              onCheckedChange={setAutoStopOnLimit}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={setBudgetMutation.isPending}>
            {setBudgetMutation.isPending ? "Saving..." : "Save Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Cost Overview Card
 */
function CostOverviewCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = "text-blue-500",
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; isUp: boolean };
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp
              className={`h-3 w-3 ${trend.isUp ? "text-green-500" : "text-red-500"}`}
            />
            <span
              className={`text-xs ${trend.isUp ? "text-green-500" : "text-red-500"}`}
            >
              {trend.isUp ? "+" : "-"}{Math.abs(trend.value).toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Budget Status Component
 */
function BudgetStatus({ budget }: { budget: {
  hasBudget: boolean;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  dailySpend: number;
  weeklySpend: number;
  monthlySpend: number;
  dailyRemaining?: number;
  weeklyRemaining?: number;
  monthlyRemaining?: number;
  isOverBudget: boolean;
  shouldAlert: boolean;
  alertThreshold?: number;
  autoStopOnLimit?: boolean;
} }) {
  const utils = trpc.useUtils();

  const handleBudgetSave = () => {
    // Refetch budget data after save
    utils.costs.getBudget.invalidate();
  };

  if (!budget.hasBudget) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <BudgetSettingsDialog budget={budget} onSave={handleBudgetSave} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No budget configured. Set spending limits in settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getBudgetProgress = (spent: number, limit?: number) => {
    if (!limit) return 0;
    return Math.min((spent / limit) * 100, 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Budget Status</CardTitle>
            <BudgetSettingsDialog budget={budget} onSave={handleBudgetSave} />
          </div>
          <div className="flex items-center gap-2">
            {budget.isOverBudget && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Over Budget
              </Badge>
            )}
            {!budget.isOverBudget && budget.shouldAlert && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Near Limit
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {budget.dailyLimit && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Daily</span>
              <span>
                {formatCurrency(budget.dailySpend)} / {formatCurrency(budget.dailyLimit)}
              </span>
            </div>
            <Progress value={getBudgetProgress(budget.dailySpend, budget.dailyLimit)} />
          </div>
        )}
        {budget.weeklyLimit && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Weekly</span>
              <span>
                {formatCurrency(budget.weeklySpend)} / {formatCurrency(budget.weeklyLimit)}
              </span>
            </div>
            <Progress value={getBudgetProgress(budget.weeklySpend, budget.weeklyLimit)} />
          </div>
        )}
        {budget.monthlyLimit && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Monthly</span>
              <span>
                {formatCurrency(budget.monthlySpend)} / {formatCurrency(budget.monthlyLimit)}
              </span>
            </div>
            <Progress value={getBudgetProgress(budget.monthlySpend, budget.monthlyLimit)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Cost Breakdown by Provider
 */
function ProviderBreakdown({ costByProvider }: { costByProvider: Record<string, number> }) {
  const providers = [
    { key: "anthropic", label: "Claude API", icon: Cpu, color: "bg-orange-500" },
    { key: "google", label: "Gemini API", icon: Zap, color: "bg-blue-500" },
    { key: "browserbase", label: "Browserbase", icon: Globe, color: "bg-green-500" },
    { key: "storage", label: "Storage", icon: HardDrive, color: "bg-purple-500" },
  ];

  const total = Object.values(costByProvider).reduce((sum, val) => sum + val, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Cost by Provider</CardTitle>
        <CardDescription>Breakdown of costs by service provider</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {providers.map(({ key, label, icon: Icon, color }) => {
          const cost = costByProvider[key] || 0;
          const percentage = total > 0 ? (cost / total) * 100 : 0;

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(cost)}</span>
                  <span className="text-muted-foreground">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Cost Trends Chart Component
 * Displays cost trends over time with stacked areas for each provider
 */
function CostTrendsChart({
  trends
}: {
  trends: Array<{
    period: Date;
    totalCost: number;
    apiCost: number;
    geminiCost: number;
    browserbaseCost: number;
    storageCost: number;
    totalApiCalls: number;
    totalGeminiCalls: number;
    totalSessions: number;
    totalStorageOperations: number;
    totalTokens: number;
    totalGeminiTokens: number;
  }>
}) {
  // Chart configuration for colors and labels
  const chartConfig = {
    apiCost: {
      label: "Claude API",
      color: "hsl(24, 100%, 60%)", // Orange
    },
    geminiCost: {
      label: "Gemini API",
      color: "hsl(217, 91%, 60%)", // Blue
    },
    browserbaseCost: {
      label: "Browserbase",
      color: "hsl(142, 71%, 45%)", // Green
    },
    storageCost: {
      label: "Storage",
      color: "hsl(271, 81%, 56%)", // Purple
    },
  } satisfies ChartConfig;

  // Transform data for the chart
  const chartData = trends.map((trend) => ({
    date: new Date(trend.period).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    }),
    apiCost: Number(trend.apiCost.toFixed(4)),
    geminiCost: Number(trend.geminiCost.toFixed(4)),
    browserbaseCost: Number(trend.browserbaseCost.toFixed(4)),
    storageCost: Number(trend.storageCost.toFixed(4)),
  }));

  // Custom tooltip formatter for currency
  const formatTooltipValue = (value: number) => formatCurrency(value);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Cost Trends</CardTitle>
        <CardDescription>Daily cost breakdown by service provider</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillApiCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(24, 100%, 60%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(24, 100%, 60%)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillGeminiCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillBrowserbaseCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillStorageCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(271, 81%, 56%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(271, 81%, 56%)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `Date: ${value}`}
                  formatter={(value) => formatTooltipValue(value as number)}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="storageCost"
              stackId="1"
              stroke="hsl(271, 81%, 56%)"
              fill="url(#fillStorageCost)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="browserbaseCost"
              stackId="1"
              stroke="hsl(142, 71%, 45%)"
              fill="url(#fillBrowserbaseCost)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="geminiCost"
              stackId="1"
              stroke="hsl(217, 91%, 60%)"
              fill="url(#fillGeminiCost)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="apiCost"
              stackId="1"
              stroke="hsl(24, 100%, 60%)"
              fill="url(#fillApiCost)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Main Cost Dashboard Component
 */
export function CostDashboard() {
  const [period, setPeriod] = useState<TimePeriod>("month");

  // Fetch cost overview
  const { data: overview, isLoading: overviewLoading } = trpc.costs.getOverview.useQuery({
    period,
  });

  // Fetch Claude token stats
  const { data: claudeStats } = trpc.costs.getTokenUsageStats.useQuery({
    period,
  });

  // Fetch Gemini token stats
  const { data: geminiStats } = trpc.costs.getGeminiTokenUsageStats.useQuery({
    period,
  });

  // Fetch storage costs
  const { data: storageCosts } = trpc.costs.getStorageCosts.useQuery({
    period,
  });

  // Fetch budget status
  const { data: budget } = trpc.costs.getBudget.useQuery();

  // Fetch cost trends
  const { data: costTrends } = trpc.costs.getCostTrends.useQuery({
    period,
    groupBy: "day",
  });

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const analytics = overview?.analytics;
  const costByProvider = analytics?.costByProvider || {
    anthropic: analytics?.apiCost || 0,
    google: analytics?.geminiCost || 0,
    browserbase: analytics?.browserbaseCost || 0,
    storage: analytics?.storageCost || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cost Analytics</h2>
          <p className="text-muted-foreground">
            Monitor API usage and spending across all services
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Last 24 hours</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="quarter">Last 3 months</SelectItem>
            <SelectItem value="year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CostOverviewCard
          title="Total Cost"
          value={formatCurrency(analytics?.totalCost || 0)}
          icon={DollarSign}
          description={`${formatNumber(analytics?.totalApiCalls || 0)} API calls`}
          color="text-green-500"
        />
        <CostOverviewCard
          title="Claude API"
          value={formatCurrency(analytics?.apiCost || 0)}
          icon={Cpu}
          description={`${formatNumber(analytics?.totalTokens || 0)} tokens`}
          color="text-orange-500"
        />
        <CostOverviewCard
          title="Gemini API"
          value={formatCurrency(analytics?.geminiCost || 0)}
          icon={Zap}
          description={`${formatNumber(analytics?.totalGeminiTokens || 0)} tokens`}
          color="text-blue-500"
        />
        <CostOverviewCard
          title="Infrastructure"
          value={formatCurrency((analytics?.browserbaseCost || 0) + (analytics?.storageCost || 0))}
          icon={BarChart3}
          description={`${analytics?.totalSessions || 0} sessions, ${analytics?.totalStorageOperations || 0} ops`}
          color="text-purple-500"
        />
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="claude">Claude API</TabsTrigger>
          <TabsTrigger value="gemini">Gemini API</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {budget && <BudgetStatus budget={budget} />}
            <ProviderBreakdown costByProvider={costByProvider} />
          </div>
          {costTrends && costTrends.trends.length > 0 && (
            <CostTrendsChart trends={costTrends.trends} />
          )}
        </TabsContent>

        <TabsContent value="claude" className="space-y-4">
          {claudeStats && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(claudeStats.overall.totalCalls)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(claudeStats.overall.totalTokens)}</div>
                  <p className="text-xs text-muted-foreground">
                    In: {formatNumber(claudeStats.overall.totalInputTokens)} |
                    Out: {formatNumber(claudeStats.overall.totalOutputTokens)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(claudeStats.overall.totalCost)}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg: {formatCurrency(claudeStats.overall.avgCostPerCall)}/call
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="gemini" className="space-y-4">
          {geminiStats && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(geminiStats.overall.totalCalls)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(geminiStats.overall.totalTokens)}</div>
                  <p className="text-xs text-muted-foreground">
                    In: {formatNumber(geminiStats.overall.totalInputTokens)} |
                    Out: {formatNumber(geminiStats.overall.totalOutputTokens)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(geminiStats.overall.totalCost)}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg: {formatCurrency(geminiStats.overall.avgCostPerCall)}/call
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-4">
          {storageCosts && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Storage Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(storageCosts.overall.totalOperations)}</div>
                  <p className="text-xs text-muted-foreground">
                    {storageCosts.overall.totalSizeMb.toFixed(2)} MB transferred
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Storage Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(storageCosts.overall.totalCost)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">By Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {storageCosts.byProvider.map((p) => (
                      <div key={p.provider} className="flex justify-between text-sm">
                        <span className="capitalize">{p.provider}</span>
                        <span>{formatCurrency(p.totalCost)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CostDashboard;
