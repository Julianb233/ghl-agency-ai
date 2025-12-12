import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import {
  Cpu,
  HardDrive,
  Clock,
  Database,
  Activity,
  Globe,
  Mail,
  CreditCard,
  Key,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Users,
  GitBranch,
  Briefcase,
} from 'lucide-react';

interface HealthMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  percentage?: number;
  status?: 'healthy' | 'warning' | 'error';
}

const HealthMetricCard: React.FC<HealthMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  percentage,
  status = 'healthy',
}) => {
  const statusColors = {
    healthy: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  };

  const progressColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-2">{value}</p>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            {percentage !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">Usage</span>
                  <span className={`text-xs font-medium ${statusColors[status]}`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={percentage}
                  className={`h-2 ${progressColors[status]}`}
                />
              </div>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
            status === 'healthy' ? 'bg-green-600/20' :
            status === 'warning' ? 'bg-yellow-600/20' :
            'bg-red-600/20'
          }`}>
            <Icon className={`h-6 w-6 ${statusColors[status]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ServiceStatusItemProps {
  name: string;
  status: string;
  message: string;
  icon: React.ElementType;
}

const ServiceStatusItem: React.FC<ServiceStatusItemProps> = ({
  name,
  status,
  message,
  icon: Icon,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'online':
      case 'configured':
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
              {status === 'online' ? 'Online' : 'Configured'}
            </Badge>
          </div>
        );
      case 'offline':
        return (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
              Offline
            </Badge>
          </div>
        );
      case 'not_configured':
        return (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
              Not Configured
            </Badge>
          </div>
        );
      default:
        return (
          <Badge className="bg-slate-600/20 text-slate-400 border-slate-600/30">
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-800 bg-slate-800/50 transition-colors hover:bg-slate-800">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20">
          <Icon className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-slate-400">{message}</p>
        </div>
      </div>
      {getStatusBadge()}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'indigo' | 'green' | 'yellow' | 'blue';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color = 'indigo' }) => {
  const colorClasses = {
    indigo: 'bg-indigo-600/20 text-indigo-400',
    green: 'bg-green-600/20 text-green-400',
    yellow: 'bg-yellow-600/20 text-yellow-400',
    blue: 'bg-blue-600/20 text-blue-400',
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-2">{value}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface DatabaseTableRowProps {
  tableName: string;
  count: number;
}

const DatabaseTableRow: React.FC<DatabaseTableRowProps> = ({ tableName, count }) => {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <Database className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-300">{tableName}</span>
      </div>
      <Badge className="bg-slate-700/50 text-slate-200 border-slate-600">
        {count.toLocaleString()} rows
      </Badge>
    </div>
  );
};

export const SystemHealth: React.FC = () => {
  // Fetch all system data with auto-refresh every 30 seconds
  const { data: healthData, isLoading: healthLoading } = trpc.admin.system.getHealth.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const { data: statsData, isLoading: statsLoading } = trpc.admin.system.getStats.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const { data: serviceStatus, isLoading: servicesLoading } = trpc.admin.system.getServiceStatus.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const { data: dbStats, isLoading: dbStatsLoading } = trpc.admin.system.getDatabaseStats.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  const isLoading = healthLoading || statsLoading || servicesLoading || dbStatsLoading;

  // Determine system health status
  const getSystemHealthStatus = (): 'healthy' | 'warning' | 'error' => {
    if (!healthData) return 'error';
    if (healthData.status === 'healthy') return 'healthy';
    if (healthData.database.status === 'unhealthy') return 'error';
    return 'warning';
  };

  const getCpuStatus = (): 'healthy' | 'warning' | 'error' => {
    if (!healthData) return 'healthy';
    const usage = healthData.system.cpu.usagePercentage;
    if (usage < 70) return 'healthy';
    if (usage < 90) return 'warning';
    return 'error';
  };

  const getMemoryStatus = (): 'healthy' | 'warning' | 'error' => {
    if (!healthData) return 'healthy';
    const usage = healthData.system.memory.usagePercentage;
    if (usage < 70) return 'healthy';
    if (usage < 90) return 'warning';
    return 'error';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">System Health</h2>
            <p className="text-slate-400 mt-1">Real-time monitoring of system resources and services</p>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Refreshing...</span>
            </div>
          )}
        </div>

        {/* Overall Health Status */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {getSystemHealthStatus() === 'healthy' ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : getSystemHealthStatus() === 'warning' ? (
                <AlertCircle className="h-12 w-12 text-yellow-500" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {getSystemHealthStatus() === 'healthy' ? 'All Systems Operational' :
                   getSystemHealthStatus() === 'warning' ? 'System Degraded' :
                   'System Issues Detected'}
                </h3>
                <p className="text-slate-400">
                  Last updated: {healthData ? new Date(healthData.timestamp).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Resources */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">System Resources</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <HealthMetricCard
              title="CPU Usage"
              value={healthData ? `${healthData.system.cpu.count} Cores` : 'Loading...'}
              subtitle={healthData ? healthData.system.cpu.model : undefined}
              icon={Cpu}
              percentage={healthData?.system.cpu.usagePercentage || 0}
              status={getCpuStatus()}
            />
            <HealthMetricCard
              title="Memory Usage"
              value={healthData ? healthData.system.memory.used : 'Loading...'}
              subtitle={healthData ? `of ${healthData.system.memory.total}` : undefined}
              icon={HardDrive}
              percentage={healthData?.system.memory.usagePercentage || 0}
              status={getMemoryStatus()}
            />
            <HealthMetricCard
              title="System Uptime"
              value={healthData ? healthData.system.uptime.formatted : 'Loading...'}
              subtitle={healthData ? `${healthData.system.hostname}` : undefined}
              icon={Clock}
              status="healthy"
            />
          </div>
        </div>

        {/* Real-time Statistics */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Real-time Statistics</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Sessions"
              value={statsData?.sessions.active || 0}
              icon={Users}
              color="green"
            />
            <StatCard
              title="Running Workflows"
              value={statsData?.workflows.running || 0}
              icon={GitBranch}
              color="blue"
            />
            <StatCard
              title="Pending Jobs"
              value={statsData?.jobs.pending || 0}
              icon={Briefcase}
              color="yellow"
            />
            <StatCard
              title="API Requests/Hour"
              value={statsData?.api.requestsLastHour || 0}
              icon={Activity}
              color="indigo"
            />
          </div>
        </div>

        {/* Database and Services Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Database Statistics */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Database Statistics</CardTitle>
              <CardDescription>Table row counts and database health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {dbStats ? (
                  <>
                    <DatabaseTableRow tableName="Users" count={dbStats.tables.users} />
                    <DatabaseTableRow tableName="Sessions" count={dbStats.tables.sessions} />
                    <DatabaseTableRow tableName="Browser Sessions" count={dbStats.tables.browserSessions} />
                    <DatabaseTableRow tableName="Workflows" count={dbStats.tables.workflows} />
                    <DatabaseTableRow tableName="Jobs" count={dbStats.tables.jobs} />
                    <div className="pt-3 mt-3 border-t border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Total Records</span>
                        <Badge className="bg-indigo-600/20 text-indigo-400 border-indigo-600/30">
                          {dbStats.totalRecords.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Loading database statistics...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Status */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Service Status</CardTitle>
              <CardDescription>External services and integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {serviceStatus ? (
                  <>
                    <ServiceStatusItem
                      name="Database"
                      status={serviceStatus.services.database.status}
                      message={serviceStatus.services.database.message}
                      icon={Database}
                    />
                    <ServiceStatusItem
                      name="Browserbase"
                      status={serviceStatus.services.browserbase.status}
                      message={serviceStatus.services.browserbase.message}
                      icon={Globe}
                    />
                    <ServiceStatusItem
                      name="OpenAI"
                      status={serviceStatus.services.openai.status}
                      message={serviceStatus.services.openai.message}
                      icon={Key}
                    />
                    <ServiceStatusItem
                      name="Anthropic"
                      status={serviceStatus.services.anthropic.status}
                      message={serviceStatus.services.anthropic.message}
                      icon={Key}
                    />
                    <ServiceStatusItem
                      name="Stripe"
                      status={serviceStatus.services.stripe.status}
                      message={serviceStatus.services.stripe.message}
                      icon={CreditCard}
                    />
                    <ServiceStatusItem
                      name="Email Service"
                      status={serviceStatus.services.email.status}
                      message={serviceStatus.services.email.message}
                      icon={Mail}
                    />
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
                    <p className="text-sm">Loading service status...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional System Information */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">System Information</CardTitle>
            <CardDescription>Detailed environment and process information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Platform</p>
                <p className="text-sm text-white font-mono">
                  {healthData?.system.platform || 'Loading...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Architecture</p>
                <p className="text-sm text-white font-mono">
                  {healthData?.system.arch || 'Loading...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Node.js Version</p>
                <p className="text-sm text-white font-mono">
                  {healthData?.process.nodeVersion || 'Loading...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Environment</p>
                <p className="text-sm text-white font-mono">
                  {healthData?.environment.nodeEnv || 'Loading...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Process Uptime</p>
                <p className="text-sm text-white font-mono">
                  {healthData?.process.uptime.formatted || 'Loading...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Heap Used</p>
                <p className="text-sm text-white font-mono">
                  {healthData?.process.memory.heapUsed || 'Loading...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Heap Total</p>
                <p className="text-sm text-white font-mono">
                  {healthData?.process.memory.heapTotal || 'Loading...'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400">Database Response</p>
                <p className="text-sm text-white font-mono">
                  {healthData?.database.responseTime ? `${healthData.database.responseTime}ms` : 'N/A'}
                </p>
              </div>
            </div>
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
