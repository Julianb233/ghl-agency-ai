/**
 * ExecutionMonitor Component - Enhanced
 * Real-time monitoring of task execution with live logs, progress tracking, and visual enhancements
 */

import React, { useEffect, useRef, useState } from 'react';
import { useWebSocketStore } from '@/stores/websocketStore';
import type { ExecutionState } from '@/stores/websocketStore';
import type { ExecutionLogEntry } from '@/lib/websocket';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
  PlayCircle,
  PauseCircle,
  RefreshCw,
  Copy,
  Search,
  SkipBack,
  SkipForward,
  Maximize2,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { StepTimeline, type ExecutionStep } from './browser/StepTimeline';
import { ScreenshotGallery, type Screenshot } from './browser/ScreenshotGallery';
import { LiveBrowserView } from './browser/LiveBrowserView';

interface ExecutionMonitorProps {
  executionId: number;
  open: boolean;
  onClose: () => void;
}

export function ExecutionMonitor({ executionId, open, onClose }: ExecutionMonitorProps) {
  const { getExecution, clearExecution } = useWebSocketStore();
  const execution = getExecution(executionId);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState<'1x' | '2x' | '5x'>('1x');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Mock data for demonstration - in real implementation, this would come from execution state
  const mockSteps: ExecutionStep[] = [
    {
      id: '1',
      stepNumber: 1,
      action: 'Navigate to homepage',
      actionType: 'navigate',
      target: 'https://example.com',
      status: 'completed',
      duration: 1250,
      timestamp: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: '2',
      stepNumber: 2,
      action: 'Click login button',
      actionType: 'click',
      target: '#login-btn',
      status: 'completed',
      duration: 340,
      timestamp: new Date(Date.now() - 50000).toISOString(),
    },
    {
      id: '3',
      stepNumber: 3,
      action: 'Type username',
      actionType: 'type',
      target: 'input[name="username"]',
      status: execution?.status === 'running' ? 'running' : 'completed',
      duration: 520,
      timestamp: new Date(Date.now() - 40000).toISOString(),
    },
    {
      id: '4',
      stepNumber: 4,
      action: 'Type password',
      actionType: 'type',
      target: 'input[name="password"]',
      status: execution?.status === 'running' ? 'pending' : 'completed',
      timestamp: new Date(Date.now() - 30000).toISOString(),
    },
    {
      id: '5',
      stepNumber: 5,
      action: 'Submit form',
      actionType: 'click',
      target: 'button[type="submit"]',
      status: 'pending',
    },
  ];

  const mockScreenshots: Screenshot[] = [
    {
      id: '1',
      url: 'https://via.placeholder.com/1920x1080/3b82f6/ffffff?text=Step+1+Screenshot',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      stepNumber: 1,
      description: 'Homepage loaded',
    },
    {
      id: '2',
      url: 'https://via.placeholder.com/1920x1080/10b981/ffffff?text=Step+2+Screenshot',
      timestamp: new Date(Date.now() - 50000).toISOString(),
      stepNumber: 2,
      description: 'Login button clicked',
    },
    {
      id: '3',
      url: 'https://via.placeholder.com/1920x1080/f59e0b/ffffff?text=Step+3+Screenshot',
      timestamp: new Date(Date.now() - 40000).toISOString(),
      stepNumber: 3,
      description: 'Username entered',
    },
  ];

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [execution?.logs, autoScroll]);

  if (!execution) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execution Not Found</DialogTitle>
            <DialogDescription>
              The execution with ID {executionId} could not be found.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const getStatusBadge = (status: ExecutionState['status']) => {
    const config = {
      queued: { variant: 'secondary' as const, icon: Clock, color: 'text-slate-500', label: 'Queued' },
      running: { variant: 'default' as const, icon: Activity, color: 'text-blue-500', label: 'Running' },
      success: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-500', label: 'Success' },
      failed: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-500', label: 'Failed' },
      timeout: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-orange-500', label: 'Timeout' },
    };

    const { variant, icon: Icon, color, label } = config[status] || config.running;

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {label}
      </Badge>
    );
  };

  const getLogLevelColor = (level: ExecutionLogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warn':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'debug':
        return 'text-slate-600 bg-slate-50 border-slate-200';
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getLogLevelIcon = (level: ExecutionLogEntry['level']) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warn':
        return <AlertCircle className="h-4 w-4" />;
      case 'debug':
        return <Activity className="h-4 w-4" />;
      case 'info':
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const filteredLogs = execution.logs.filter((log: ExecutionLogEntry) => {
    // Filter by level
    if (logFilter !== 'all' && log.level !== logFilter) return false;

    // Filter by search query
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  const exportLogs = (format: 'json' | 'txt') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(
        {
          executionId: execution.executionId,
          taskId: execution.taskId,
          taskName: execution.taskName,
          status: execution.status,
          startedAt: execution.startedAt,
          duration: execution.duration,
          logs: execution.logs,
        },
        null,
        2
      );
      filename = `execution-${execution.executionId}-logs.json`;
      mimeType = 'application/json';
    } else {
      content = execution.logs
        .map(
          (log: ExecutionLogEntry) =>
            `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}${
              log.metadata ? `\nData: ${JSON.stringify(log.metadata, null, 2)}` : ''
            }`
        )
        .join('\n\n');
      filename = `execution-${execution.executionId}-logs.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Logs exported as ${format.toUpperCase()}`);
  };

  const copyAllLogs = () => {
    const content = filteredLogs
      .map(
        (log: ExecutionLogEntry) =>
          `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] ${log.message}`
      )
      .join('\n');

    navigator.clipboard.writeText(content);
    toast.success('Logs copied to clipboard');
  };

  const handleClearExecution = () => {
    clearExecution(executionId);
    toast.success('Execution cleared from view');
    onClose();
  };

  const handleStepBack = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setCurrentStepIndex((prev) => Math.min(mockSteps.length - 1, prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {execution.taskName}
                {getStatusBadge(execution.status)}
              </DialogTitle>
              <DialogDescription>
                Execution ID: {execution.executionId} | Task ID: {execution.taskId}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLogs('json')}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLogs('txt')}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                TXT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAllLogs}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              {execution.status !== 'running' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearExecution}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden px-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="steps">
              Steps ({mockSteps.length})
            </TabsTrigger>
            <TabsTrigger value="screenshots">
              Screenshots ({mockScreenshots.length})
            </TabsTrigger>
            <TabsTrigger value="logs">
              Logs ({execution.logs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-y-auto space-y-4 mt-4">
            {/* Live Browser Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Live Browser View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-100 rounded-lg border-2 border-slate-200 flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <Maximize2 className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Live browser view not available</p>
                    <p className="text-xs mt-1">Connect to an active session to see live view</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {execution.stepsCompleted} / {execution.stepsTotal} steps completed
                    </span>
                    <span className="text-sm text-slate-600">{execution.progress}%</span>
                  </div>
                  <Progress value={execution.progress} className="h-2" />
                </div>

                {execution.currentStep && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <p className="text-sm font-medium text-blue-900">Current Step:</p>
                    <p className="text-sm text-blue-700 mt-1">{execution.currentStep}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-600">Started At</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {new Date(execution.startedAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-600">Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {formatDuration(execution.duration)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error Display */}
            {execution.error && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-sm text-red-900 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Error Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-red-800 whitespace-pre-wrap font-mono">
                    {execution.error}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="steps" className="flex-1 overflow-hidden mt-4">
            {/* Action Replay Controls */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStepBack}
                  disabled={currentStepIndex === 0}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStepForward}
                  disabled={currentStepIndex === mockSteps.length - 1}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
                <Badge variant="outline">
                  Step {currentStepIndex + 1} of {mockSteps.length}
                </Badge>
              </div>
              <Select value={playbackSpeed} onValueChange={(v: any) => setPlaybackSpeed(v)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1x">1x</SelectItem>
                  <SelectItem value="2x">2x</SelectItem>
                  <SelectItem value="5x">5x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <StepTimeline steps={mockSteps} />
          </TabsContent>

          <TabsContent value="screenshots" className="flex-1 overflow-y-auto mt-4">
            <ScreenshotGallery screenshots={mockScreenshots} />
          </TabsContent>

          <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden space-y-4 mt-4">
            {/* Log Controls */}
            <div className="flex items-center gap-4">
              <Select value={logFilter} onValueChange={(value: any) => setLogFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter logs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs..."
                  className="pl-10"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoScroll(!autoScroll)}
                className="gap-2"
              >
                {autoScroll ? (
                  <PauseCircle className="h-4 w-4" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                {autoScroll ? 'Pause' : 'Resume'}
              </Button>

              <Badge variant="outline">
                {filteredLogs.length} / {execution.logs.length} logs
              </Badge>
            </div>

            {/* Logs Display */}
            <ScrollArea className="flex-1 rounded-lg border bg-slate-950 p-4">
              <div className="space-y-2 font-mono text-sm">
                {filteredLogs.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    No logs to display
                  </div>
                ) : (
                  filteredLogs.map((log: ExecutionLogEntry, index: number) => (
                    <div
                      key={index}
                      className={`rounded border p-3 ${getLogLevelColor(log.level)}`}
                    >
                      <div className="flex items-start gap-2">
                        {getLogLevelIcon(log.level)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs opacity-75">
                              {formatTimestamp(log.timestamp)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {log.level.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm">{log.message}</p>
                          {log.metadata && (
                            <pre className="mt-2 text-xs bg-black/5 rounded p-2 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
