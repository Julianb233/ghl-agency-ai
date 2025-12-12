/**
 * MCP Dashboard Component
 *
 * Main dashboard for Model Context Protocol integration.
 * Displays MCP server status, available tools, and provides
 * an interface for tool execution and monitoring.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import {
  Server,
  Wrench,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Terminal,
  Globe,
  Database,
  FileText,
  Loader2,
  Activity,
  Zap,
  Clock,
} from 'lucide-react';
import { ToolExplorer } from './ToolExplorer';
import { ToolExecutor } from './ToolExecutor';
import { MCPMetrics } from './MCPMetrics';

export function MCPDashboard() {
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = trpc.mcp.status.useQuery(
    undefined,
    { refetchInterval: 30000 } // Refetch every 30s
  );

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = statusData;
  const isHealthy = status?.healthy ?? false;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCP Integration</h1>
          <p className="text-muted-foreground">
            Model Context Protocol - 100+ tools for agent automation
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchStatus()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          title="Server Status"
          value={isHealthy ? 'Healthy' : 'Unhealthy'}
          icon={Server}
          status={isHealthy ? 'success' : 'error'}
        />
        <StatusCard
          title="Tools Available"
          value={status?.serverMetrics?.toolsExecuted?.toString() || '100+'}
          icon={Wrench}
          status="info"
        />
        <StatusCard
          title="Uptime"
          value={formatUptime(status?.serverMetrics?.uptime)}
          icon={Activity}
          status="success"
        />
        <StatusCard
          title="Last Updated"
          value={status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : 'N/A'}
          icon={Clock}
          status="info"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="tools" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tool Explorer
          </TabsTrigger>
          <TabsTrigger value="execute" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Execute Tools
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools">
          <ToolExplorer />
        </TabsContent>

        <TabsContent value="execute">
          <ToolExecutor />
        </TabsContent>

        <TabsContent value="metrics">
          <MCPMetrics metrics={status?.serverMetrics} />
        </TabsContent>

        <TabsContent value="logs">
          <MCPLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Status Card Component
function StatusCard({
  title,
  value,
  icon: Icon,
  status,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'success' | 'error' | 'warning' | 'info';
}) {
  const statusColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${statusColors[status]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

// MCP Logs Component
function MCPLogs() {
  // Mock logs - in production these would come from an API
  const mockLogs = [
    { timestamp: new Date(), level: 'info', message: 'MCP Server initialized', source: 'server' },
    { timestamp: new Date(), level: 'info', message: 'Tool registry loaded with 100+ tools', source: 'registry' },
    { timestamp: new Date(), level: 'debug', message: 'Health check passed', source: 'health' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP Server Logs</CardTitle>
        <CardDescription>Real-time logs from the MCP server</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] font-mono text-sm">
          <div className="space-y-2">
            {mockLogs.map((log, index) => (
              <div
                key={index}
                className={`p-2 rounded ${
                  log.level === 'error'
                    ? 'bg-red-50 text-red-900'
                    : log.level === 'warning'
                    ? 'bg-yellow-50 text-yellow-900'
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      log.level === 'error'
                        ? 'border-red-500 text-red-500'
                        : log.level === 'warning'
                        ? 'border-yellow-500 text-yellow-500'
                        : ''
                    }
                  >
                    {log.level}
                  </Badge>
                  <Badge variant="secondary">{log.source}</Badge>
                </div>
                <p className="mt-1">{log.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Helper function to format uptime
function formatUptime(seconds?: number): string {
  if (!seconds) return 'N/A';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
