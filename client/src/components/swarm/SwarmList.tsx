/**
 * Swarm List Component
 *
 * Displays a list of active swarms with controls to view, stop, or manage them.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import {
  Network,
  Play,
  Square,
  RefreshCw,
  Eye,
  Trash2,
  Clock,
  Bot,
  ListTodo,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface SwarmListProps {
  swarms: any[];
  onRefresh: () => void;
}

export function SwarmList({ swarms, onRefresh }: SwarmListProps) {
  const [selectedSwarmId, setSelectedSwarmId] = useState<string | null>(null);

  const { data: swarmDetail, isLoading: detailLoading } = trpc.swarm.getStatus.useQuery(
    { swarmId: selectedSwarmId! },
    { enabled: !!selectedSwarmId }
  );

  const stopSwarm = trpc.swarm.stop.useMutation({
    onSuccess: () => {
      onRefresh();
    },
  });

  if (swarms.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Swarms</h3>
            <p className="text-muted-foreground mb-4">
              Create a new swarm to start multi-agent coordination
            </p>
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Active Swarms ({swarms.length})</h2>
          <p className="text-sm text-muted-foreground">Manage running swarm coordinations</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {swarms.map((swarm) => (
          <SwarmCard
            key={swarm.id}
            swarm={swarm}
            onView={() => setSelectedSwarmId(swarm.id)}
            onStop={() => stopSwarm.mutate({ swarmId: swarm.id })}
            isStoping={stopSwarm.isPending}
          />
        ))}
      </div>

      {/* Swarm Detail Dialog */}
      <Dialog open={!!selectedSwarmId} onOpenChange={(open) => !open && setSelectedSwarmId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Swarm Details
            </DialogTitle>
            <DialogDescription>
              Detailed view of swarm agents and tasks
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : swarmDetail?.swarm ? (
            <SwarmDetailView swarm={swarmDetail.swarm} />
          ) : (
            <p className="text-muted-foreground text-center py-4">Failed to load swarm details</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Swarm Card Component
function SwarmCard({
  swarm,
  onView,
  onStop,
  isStoping,
}: {
  swarm: any;
  onView: () => void;
  onStop: () => void;
  isStoping: boolean;
}) {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    running: { color: 'bg-blue-100 text-blue-700', icon: <Play className="h-3 w-3" /> },
    completed: { color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
    failed: { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
    pending: { color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3 w-3" /> },
    cancelled: { color: 'bg-gray-100 text-gray-700', icon: <Square className="h-3 w-3" /> },
  };

  const config = statusConfig[swarm.status] || statusConfig.pending;

  return (
    <Card className="hover:border-purple-200 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
              <Network className="h-6 w-6 text-purple-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">
                  {swarm.name || `Swarm ${swarm.id.slice(0, 8)}`}
                </h3>
                <Badge className={config.color}>
                  {config.icon}
                  <span className="ml-1">{swarm.status}</span>
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Bot className="h-3.5 w-3.5" />
                  {swarm.agentCount} agents
                </span>
                <span className="flex items-center gap-1">
                  <ListTodo className="h-3.5 w-3.5" />
                  {swarm.taskCount} tasks
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {swarm.startTime ? new Date(swarm.startTime).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>

            <div className="w-32">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(swarm.progress * 100)}%</span>
              </div>
              <Progress value={swarm.progress * 100} className="h-2" />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            {swarm.status === 'running' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onStop}
                disabled={isStoping}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isStoping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Swarm Detail View Component
function SwarmDetailView({ swarm }: { swarm: any }) {
  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-muted rounded-lg text-center">
          <p className="text-2xl font-bold">{swarm.agents?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Agents</p>
        </div>
        <div className="p-3 bg-muted rounded-lg text-center">
          <p className="text-2xl font-bold">{swarm.tasks?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Tasks</p>
        </div>
        <div className="p-3 bg-muted rounded-lg text-center">
          <p className="text-2xl font-bold">{Math.round(swarm.progress * 100)}%</p>
          <p className="text-xs text-muted-foreground">Progress</p>
        </div>
      </div>

      {/* Agents List */}
      <div>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Agents ({swarm.agents?.length || 0})
        </h4>
        <ScrollArea className="h-[150px]">
          <div className="space-y-2">
            {swarm.agents?.map((agent: any) => (
              <div key={agent.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">{agent.name || agent.type}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {agent.status}
                </Badge>
              </div>
            )) || <p className="text-sm text-muted-foreground">No agents</p>}
          </div>
        </ScrollArea>
      </div>

      {/* Tasks List */}
      <div>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          Tasks ({swarm.tasks?.length || 0})
        </h4>
        <ScrollArea className="h-[150px]">
          <div className="space-y-2">
            {swarm.tasks?.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`ml-2 ${
                    task.status === 'completed'
                      ? 'text-green-600'
                      : task.status === 'failed'
                      ? 'text-red-600'
                      : task.status === 'running'
                      ? 'text-blue-600'
                      : ''
                  }`}
                >
                  {task.status}
                </Badge>
              </div>
            )) || <p className="text-sm text-muted-foreground">No tasks</p>}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
