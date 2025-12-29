import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc';
import { formatDistanceToNow } from 'date-fns';
import {
  Users,
  Activity,
  Database,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  FileText,
  Globe,
  Briefcase,
  LogIn,
  RefreshCw,
  Server,
  Zap,
  Wifi,
  WifiOff,
  CloudOff,
  Cloud,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, trend, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-8 w-16 mt-2 bg-slate-800" />
              <Skeleton className="h-3 w-32 mt-1 bg-slate-800" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg bg-slate-800" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-2">{value}</p>
            {change && (
              <p className={`text-sm mt-1 flex items-center gap-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {trend === 'up' ? '↑' : '↓'} {change}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600/20">
            <Icon className="h-6 w-6 text-indigo-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ActivityItemProps {
  id: string | number;
  type: string;
  timestamp: Date;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  details: any;
  metadata?: any;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'api_request':
      return Globe;
    case 'workflow':
      return Activity;
    case 'browser_session':
      return FileText;
    case 'job':
      return Briefcase;
    case 'user_signin':
      return LogIn;
    default:
      return Activity;
  }
};

const getActivityStatusIcon = (type: string, details: any) => {
  if (type === 'workflow') {
    if (details.status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (details.status === 'failed' || details.error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (details.status === 'running') return <Clock className="h-4 w-4 text-yellow-500" />;
  }
  if (type === 'browser_session') {
    if (details.status === 'active') return <Clock className="h-4 w-4 text-yellow-500" />;
    if (details.status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (details.status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
  }
  if (type === 'api_request') {
    if (details.statusCode >= 200 && details.statusCode < 300) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (details.statusCode >= 400) return <XCircle className="h-4 w-4 text-red-500" />;
  }
  return <CheckCircle className="h-4 w-4 text-green-500" />;
};

const getActivityDescription = (type: string, details: any, userName: string | null) => {
  const user = userName || 'Unknown user';

  switch (type) {
    case 'api_request':
      return `${user} made ${details.method} request to ${details.endpoint}`;
    case 'workflow':
      return `${user} ${details.status === 'completed' ? 'completed' : details.status === 'failed' ? 'failed' : 'started'} workflow execution`;
    case 'browser_session':
      return `${user} ${details.status === 'active' ? 'started' : 'ended'} browser session${details.url ? ` for ${details.url}` : ''}`;
    case 'job':
      return `System ${details.status} job: ${details.jobType}`;
    case 'user_signin':
      return `${user} signed in via ${details.loginMethod}`;
    default:
      return `${user} performed an action`;
  }
};

const ActivityItem: React.FC<ActivityItemProps> = ({ type, timestamp, userId, userName, userEmail, details }) => {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800">
      <div className="mt-0.5">{getActivityStatusIcon(type, details)}</div>
      <div className="flex-1 space-y-1">
        <p className="text-sm text-slate-300">{getActivityDescription(type, details, userName)}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{userEmail || 'System'}</span>
          <span>•</span>
          <span>{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
};

interface ServiceStatusProps {
  name: string;
  status: string;
  message: string;
  icon?: React.ElementType;
}

const ServiceStatus: React.FC<ServiceStatusProps> = ({ name, status, message, icon: Icon }) => {
  const getStatusColor = () => {
    if (status === 'online' || status === 'configured') return 'bg-green-500';
    if (status === 'offline') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (status === 'online' || status === 'configured') return 'Operational';
    if (status === 'offline') return 'Offline';
    return 'Not Configured';
  };

  const getStatusBadge = () => {
    if (status === 'online' || status === 'configured') {
      return (
        <Badge className="bg-green-600/20 text-green-400 border-green-600/30 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {getStatusText()}
        </Badge>
      );
    }
    if (status === 'offline') {
      return (
        <Badge className="bg-red-600/20 text-red-400 border-red-600/30 flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          {getStatusText()}
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {getStatusText()}
      </Badge>
    );
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-800/30 transition-all hover:bg-slate-800/50">
      <div className="flex items-center gap-3">
        <div className={`relative h-2 w-2 rounded-full ${getStatusColor()}`}>
          <div className={`absolute inset-0 rounded-full ${getStatusColor()} animate-ping opacity-75`}></div>
        </div>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10">
            <Icon className="h-4 w-4 text-indigo-400" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-slate-500">{message}</p>
        </div>
      </div>
      {getStatusBadge()}
    </div>
  );
};

interface MCPServerStatusProps {
  name: string;
  connected: boolean;
  lastPing?: Date;
}

const MCPServerStatus: React.FC<MCPServerStatusProps> = ({ name, connected, lastPing }) => {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-800/30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="h-4 w-4 text-green-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}
          <span className="text-sm font-medium text-white">{name}</span>
        </div>
        {lastPing && (
          <span className="text-xs text-slate-500">
            Last ping: {formatDistanceToNow(lastPing, { addSuffix: true })}
          </span>
        )}
      </div>
      <Badge className={connected ? "bg-green-600/20 text-green-400 border-green-600/30" : "bg-red-600/20 text-red-400 border-red-600/30"}>
        {connected ? 'Connected' : 'Disconnected'}
      </Badge>
    </div>
  );
};

interface DeploymentStatusProps {
  environment: string;
  status: 'ready' | 'building' | 'error';
  lastDeployment?: Date;
  url?: string;
}

const DeploymentStatus: React.FC<DeploymentStatusProps> = ({ environment, status, lastDeployment, url }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'ready':
        return <Cloud className="h-4 w-4 text-green-400" />;
      case 'building':
        return <RefreshCw className="h-4 w-4 text-yellow-400 animate-spin" />;
      case 'error':
        return <CloudOff className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Ready</Badge>;
      case 'building':
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">Building</Badge>;
      case 'error':
        return <Badge className="bg-red-600/20 text-red-400 border-red-600/30">Error</Badge>;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-800/30">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <p className="text-sm font-medium text-white">{environment}</p>
          {lastDeployment && (
            <p className="text-xs text-slate-500">
              Deployed {formatDistanceToNow(lastDeployment, { addSuffix: true })}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        {url && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-indigo-400 hover:text-indigo-300"
            onClick={() => window.open(url, '_blank')}
          >
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const [, setLocation] = useLocation();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch data with auto-refresh every 30 seconds
  const { data: stats, isLoading: statsLoading } = trpc.admin.system.getStats.useQuery(
    undefined,
    {
      refetchInterval: 30000
    }
  );

  // Update lastUpdate when stats changes
  if (stats) {
    setLastUpdate(new Date());
  }

  const { data: serviceStatus, isLoading: servicesLoading } = trpc.admin.system.getServiceStatus.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const { data: auditData, isLoading: auditLoading } = trpc.admin.audit.list.useQuery(
    { limit: 5 },
    { refetchInterval: 30000 }
  );

  const { data: userStats, isLoading: userStatsLoading } = trpc.admin.users.getStats.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const { data: healthData, isLoading: healthLoading } = trpc.admin.system.getHealth.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const isLoading = statsLoading || servicesLoading || auditLoading || userStatsLoading || healthLoading;

  // Simulate MCP server status (would be replaced with actual MCP server checks)
  const mcpServers: MCPServerStatusProps[] = [
    { name: 'GitHub MCP', connected: true, lastPing: new Date(Date.now() - 5000) },
    { name: 'Notion MCP', connected: true, lastPing: new Date(Date.now() - 8000) },
    { name: 'Slack MCP', connected: false },
  ];

  // Simulate deployment status (would be replaced with actual Vercel API calls)
  const deployments: DeploymentStatusProps[] = [
    {
      environment: 'Production',
      status: 'ready',
      lastDeployment: new Date(Date.now() - 3600000),
      url: 'https://bottleneckbots.com'
    },
    {
      environment: 'Preview',
      status: 'ready',
      lastDeployment: new Date(Date.now() - 1800000),
      url: 'https://preview.bottleneckbots.com'
    },
  ];

  // Get overall system health status
  const getSystemHealthStatus = () => {
    if (!healthData) return { color: 'text-slate-400', bg: 'bg-slate-600/20', border: 'border-slate-600/30', text: 'Unknown' };
    if (healthData.status === 'healthy') return { color: 'text-green-400', bg: 'bg-green-600/20', border: 'border-green-600/30', text: 'Healthy' };
    return { color: 'text-yellow-400', bg: 'bg-yellow-600/20', border: 'border-yellow-600/30', text: 'Degraded' };
  };

  const systemHealth = getSystemHealthStatus();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white">Dashboard Overview</h2>
              <p className="text-slate-400 mt-1">Monitor system health and user activity</p>
            </div>
            <Badge className={`${systemHealth.bg} ${systemHealth.color} ${systemHealth.border} flex items-center gap-2 px-3 py-1.5`}>
              <Server className="h-3.5 w-3.5" />
              System {systemHealth.text}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Refreshing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Last update: {formatDistanceToNow(lastUpdate, { addSuffix: true })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={userStats?.total.toLocaleString() || 0}
            change={userStats?.newThisMonth ? `+${userStats.newThisMonth} this month` : undefined}
            icon={Users}
            trend="up"
            isLoading={userStatsLoading}
          />
          <StatCard
            title="Active Sessions"
            value={stats?.sessions.active || 0}
            change={stats?.sessions.activeBrowserSessions ? `${stats.sessions.activeBrowserSessions} browser sessions` : undefined}
            icon={Activity}
            trend="up"
            isLoading={statsLoading}
          />
          <StatCard
            title="Running Workflows"
            value={stats?.workflows.running || 0}
            icon={TrendingUp}
            isLoading={statsLoading}
          />
          <StatCard
            title="Pending Jobs"
            value={stats?.jobs.pending || 0}
            icon={AlertCircle}
            isLoading={statsLoading}
          />
        </div>

        {/* MCP Servers & Deployment Status */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* MCP Server Connections */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="h-5 w-5 text-indigo-400" />
                    MCP Server Connections
                  </CardTitle>
                  <CardDescription>Real-time status of Model Context Protocol servers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mcpServers.map((server, idx) => (
                  <MCPServerStatus key={idx} {...server} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Deployment Status */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-indigo-400" />
                    Deployment Status
                  </CardTitle>
                  <CardDescription>Current deployment status on Vercel</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deployments.map((deployment, idx) => (
                  <DeploymentStatus key={idx} {...deployment} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed and Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                  <CardDescription>Latest actions across the system</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300"
                  onClick={() => setLocation('/admin/audit')}
                >
                  View All
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                      <Skeleton className="h-4 w-4 rounded-full bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 bg-slate-700" />
                        <Skeleton className="h-3 w-1/2 bg-slate-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : auditData?.entries && auditData.entries.length > 0 ? (
                <div className="space-y-4">
                  {auditData.entries.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      {...activity}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
              <CardDescription>Common admin tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start bg-indigo-600 hover:bg-indigo-700"
                size="lg"
                onClick={() => setLocation('/admin/users')}
              >
                <Users className="mr-2 h-5 w-5" />
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-700 text-slate-300 hover:bg-slate-800"
                size="lg"
                onClick={() => setLocation('/admin/system')}
              >
                <Database className="mr-2 h-5 w-5" />
                System Health
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-700 text-slate-300 hover:bg-slate-800"
                size="lg"
                onClick={() => setLocation('/admin/audit')}
              >
                <AlertCircle className="mr-2 h-5 w-5" />
                View Audit Logs
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-700 text-slate-300 hover:bg-slate-800"
                size="lg"
                onClick={() => setLocation('/admin/config')}
              >
                <TrendingUp className="mr-2 h-5 w-5" />
                Configuration
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-400" />
              System Status
            </CardTitle>
            <CardDescription>Current status of all external services and integrations</CardDescription>
          </CardHeader>
          <CardContent>
            {servicesLoading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-800/30">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-2 w-2 rounded-full bg-slate-700" />
                      <Skeleton className="h-8 w-8 rounded-lg bg-slate-700" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24 bg-slate-700" />
                        <Skeleton className="h-3 w-32 bg-slate-700" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full bg-slate-700" />
                  </div>
                ))}
              </div>
            ) : serviceStatus ? (
              <div className="grid gap-3 md:grid-cols-2">
                <ServiceStatus
                  name="Database"
                  status={serviceStatus.services.database.status}
                  message={serviceStatus.services.database.message}
                  icon={Database}
                />
                <ServiceStatus
                  name="Browserbase"
                  status={serviceStatus.services.browserbase.status}
                  message={serviceStatus.services.browserbase.message}
                  icon={Globe}
                />
                <ServiceStatus
                  name="OpenAI"
                  status={serviceStatus.services.openai.status}
                  message={serviceStatus.services.openai.message}
                  icon={Zap}
                />
                <ServiceStatus
                  name="Anthropic"
                  status={serviceStatus.services.anthropic.status}
                  message={serviceStatus.services.anthropic.message}
                  icon={Zap}
                />
                <ServiceStatus
                  name="Stripe"
                  status={serviceStatus.services.stripe.status}
                  message={serviceStatus.services.stripe.message}
                  icon={TrendingUp}
                />
                <ServiceStatus
                  name="Email Service"
                  status={serviceStatus.services.email.status}
                  message={serviceStatus.services.email.message}
                  icon={FileText}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Unable to load service status</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auto-refresh Notice */}
        <div className="flex items-center justify-center text-xs text-slate-500 gap-2">
          <RefreshCw className="h-3 w-3" />
          <span>Data refreshes automatically every 30 seconds</span>
        </div>
      </div>
    </AdminLayout>
  );
};
