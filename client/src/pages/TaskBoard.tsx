/**
 * TaskBoard - Unified Task Dashboard
 * Combines ad-hoc tasks with scheduled recurring tasks
 * Supports Kanban and List views with toggle
 */

import React, { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Kanban,
  List,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Clock,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  CalendarClock,
  ArrowRight,
  RefreshCw,
  Loader2,
  GripVertical,
  Timer,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, addHours, addDays, addMinutes } from 'date-fns';

// Types
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
type TaskStatus = 'pending' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'deferred';
type ViewMode = 'kanban' | 'list';

interface Task {
  id: number;
  taskUuid: string;
  title: string;
  description: string | null;
  taskType: string;
  priority: TaskPriority;
  urgency: string;
  status: TaskStatus;
  scheduledFor: Date | null;
  deadline: Date | null;
  createdAt: Date;
  completedAt?: Date | null;
  tags?: string[] | null;
  queuePosition?: number;
  isRunning?: boolean;
}

interface KanbanColumn {
  id: string;
  title: string;
  tasks: Task[];
  count: number;
}

// Priority badge configuration
const priorityConfig: Record<TaskPriority, { label: string; variant: 'destructive' | 'warning' | 'default' | 'secondary' }> = {
  critical: { label: 'Critical', variant: 'destructive' },
  high: { label: 'High', variant: 'warning' },
  medium: { label: 'Medium', variant: 'default' },
  low: { label: 'Low', variant: 'secondary' },
};

// Status configuration
const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'Pending', icon: <Clock className="h-4 w-4" />, color: 'text-amber-500' },
  queued: { label: 'Queued', icon: <Timer className="h-4 w-4" />, color: 'text-blue-500' },
  in_progress: { label: 'In Progress', icon: <Loader2 className="h-4 w-4 animate-spin" />, color: 'text-blue-600' },
  completed: { label: 'Completed', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500' },
  failed: { label: 'Failed', icon: <XCircle className="h-4 w-4" />, color: 'text-red-500' },
  cancelled: { label: 'Cancelled', icon: <XCircle className="h-4 w-4" />, color: 'text-gray-500' },
  deferred: { label: 'Scheduled', icon: <CalendarClock className="h-4 w-4" />, color: 'text-purple-500' },
};

// Task Card Component
function TaskCard({
  task,
  onExecute,
  onDefer,
  onCancel,
  onView,
  isDragging = false,
}: {
  task: Task;
  onExecute: (id: number) => void;
  onDefer: (task: Task) => void;
  onCancel: (id: number) => void;
  onView: (id: number) => void;
  isDragging?: boolean;
}) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const status = statusConfig[task.status] || statusConfig.pending;
  const isRunning = task.status === 'in_progress';
  const isScheduled = task.status === 'deferred' || !!task.scheduledFor;

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md',
        isDragging && 'opacity-50 rotate-2 scale-105',
        isRunning && 'border-blue-500 shadow-blue-100'
      )}
      onClick={() => onView(task.id)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm line-clamp-2 flex-1">{task.title}</h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(task.id); }}>
                View Details
              </DropdownMenuItem>
              {!isRunning && task.status !== 'completed' && task.status !== 'cancelled' && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExecute(task.id); }}>
                    <Play className="h-4 w-4 mr-2" />
                    Execute Now
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDefer(task); }}>
                    <CalendarClock className="h-4 w-4 mr-2" />
                    Schedule for Later
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Cancel Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={priority.variant} className="text-xs">
              {priority.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {task.taskType.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Schedule info */}
        {isScheduled && task.scheduledFor && (
          <div className="flex items-center gap-1 mt-2 text-xs text-purple-600">
            <CalendarClock className="h-3 w-3" />
            <span>{format(new Date(task.scheduledFor), 'MMM d, h:mm a')}</span>
          </div>
        )}

        {/* Running indicator */}
        {isRunning && (
          <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Running...</span>
          </div>
        )}

        {/* Queue position */}
        {task.queuePosition && !isRunning && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <span>Queue position: #{task.queuePosition}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Kanban Column Component
function KanbanColumnComponent({
  column,
  onExecute,
  onDefer,
  onCancel,
  onView,
}: {
  column: KanbanColumn;
  onExecute: (id: number) => void;
  onDefer: (task: Task) => void;
  onCancel: (id: number) => void;
  onView: (id: number) => void;
}) {
  const status = statusConfig[column.id] || statusConfig.pending;

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-muted/50 rounded-lg p-3">
        {/* Column Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={status.color}>{status.icon}</span>
            <h3 className="font-semibold text-sm">{column.title}</h3>
            <Badge variant="secondary" className="text-xs">
              {column.count}
            </Badge>
          </div>
        </div>

        {/* Task Cards */}
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-3 pr-2">
            {column.tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No tasks
              </div>
            ) : (
              column.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onExecute={onExecute}
                  onDefer={onDefer}
                  onCancel={onCancel}
                  onView={onView}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// List View Row Component
function TaskListRow({
  task,
  onExecute,
  onDefer,
  onCancel,
  onView,
}: {
  task: Task;
  onExecute: (id: number) => void;
  onDefer: (task: Task) => void;
  onCancel: (id: number) => void;
  onView: (id: number) => void;
}) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const status = statusConfig[task.status] || statusConfig.pending;
  const isRunning = task.status === 'in_progress';

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors',
        isRunning && 'bg-blue-50 dark:bg-blue-950/20'
      )}
      onClick={() => onView(task.id)}
    >
      {/* Status Icon */}
      <div className={cn('flex-shrink-0', status.color)}>
        {status.icon}
      </div>

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{task.title}</h4>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate">{task.description}</p>
        )}
      </div>

      {/* Type Badge */}
      <Badge variant="outline" className="text-xs flex-shrink-0">
        {task.taskType.replace('_', ' ')}
      </Badge>

      {/* Priority Badge */}
      <Badge variant={priority.variant} className="text-xs flex-shrink-0">
        {priority.label}
      </Badge>

      {/* Schedule */}
      <div className="w-32 text-xs text-muted-foreground flex-shrink-0">
        {task.scheduledFor ? (
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {format(new Date(task.scheduledFor), 'MMM d, h:mm a')}
          </span>
        ) : (
          <span>—</span>
        )}
      </div>

      {/* Created */}
      <div className="w-24 text-xs text-muted-foreground flex-shrink-0">
        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(task.id); }}>
            View Details
          </DropdownMenuItem>
          {!isRunning && task.status !== 'completed' && task.status !== 'cancelled' && (
            <>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExecute(task.id); }}>
                <Play className="h-4 w-4 mr-2" />
                Execute Now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDefer(task); }}>
                <CalendarClock className="h-4 w-4 mr-2" />
                Schedule for Later
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cancel Task
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Defer Task Dialog
function DeferTaskDialog({
  task,
  open,
  onOpenChange,
  onDefer,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDefer: (id: number, scheduledFor: string, reason?: string) => void;
}) {
  const [scheduleOption, setScheduleOption] = useState<'preset' | 'custom'>('preset');
  const [preset, setPreset] = useState<string>('1h');
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const handleSubmit = () => {
    if (!task) return;

    let scheduledFor: Date;

    if (scheduleOption === 'preset') {
      const now = new Date();
      switch (preset) {
        case '30m':
          scheduledFor = addMinutes(now, 30);
          break;
        case '1h':
          scheduledFor = addHours(now, 1);
          break;
        case '3h':
          scheduledFor = addHours(now, 3);
          break;
        case 'tomorrow':
          scheduledFor = addDays(now, 1);
          scheduledFor.setHours(9, 0, 0, 0);
          break;
        case 'next_week':
          scheduledFor = addDays(now, 7);
          scheduledFor.setHours(9, 0, 0, 0);
          break;
        default:
          scheduledFor = addHours(now, 1);
      }
    } else {
      if (!customDate || !customTime) {
        toast.error('Please select a date and time');
        return;
      }
      scheduledFor = new Date(`${customDate}T${customTime}`);
    }

    if (scheduledFor <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    onDefer(task.id, scheduledFor.toISOString(), reason || undefined);
    onOpenChange(false);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Task for Later</DialogTitle>
          <DialogDescription>
            {task?.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Schedule Type */}
          <Tabs value={scheduleOption} onValueChange={(v) => setScheduleOption(v as 'preset' | 'custom')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preset">Quick Options</TabsTrigger>
              <TabsTrigger value="custom">Custom Time</TabsTrigger>
            </TabsList>

            <TabsContent value="preset" className="space-y-3 mt-4">
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select when to run" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30m">In 30 minutes</SelectItem>
                  <SelectItem value="1h">In 1 hour</SelectItem>
                  <SelectItem value="3h">In 3 hours</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow at 9 AM</SelectItem>
                  <SelectItem value="next_week">Next week</SelectItem>
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="custom" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why are you scheduling this for later?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <CalendarClock className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Stats Cards Component
function StatsCards({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            <span className="text-sm text-muted-foreground">Running</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats?.byStatus?.in_progress || 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold mt-1">{(stats?.byStatus?.pending || 0) + (stats?.byStatus?.queued || 0)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Scheduled</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats?.scheduledToday || 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats?.byStatus?.completed || 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-muted-foreground">Failed</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats?.byStatus?.failed || 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">Needs Review</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats?.pendingReview || 0}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main TaskBoard Component
export function TaskBoard() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [deferDialogOpen, setDeferDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch data
  const statsQuery = trpc.agencyTasks.getStats.useQuery();
  const kanbanQuery = trpc.agencyTasks.getKanbanBoard.useQuery({ includeClosed: statusFilter === 'all' });
  const listQuery = trpc.agencyTasks.list.useQuery({
    status: statusFilter !== 'all' ? statusFilter as TaskStatus : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter as TaskPriority : undefined,
    search: searchQuery || undefined,
    limit: 100,
    offset: 0,
  });

  // Mutations
  const executeMutation = trpc.agencyTasks.execute.useMutation({
    onSuccess: () => {
      toast.success('Task execution started');
      kanbanQuery.refetch();
      listQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to execute task: ${error.message}`);
    },
  });

  const deferMutation = trpc.agencyTasks.defer.useMutation({
    onSuccess: () => {
      toast.success('Task scheduled successfully');
      kanbanQuery.refetch();
      listQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to schedule task: ${error.message}`);
    },
  });

  const cancelMutation = trpc.agencyTasks.delete.useMutation({
    onSuccess: () => {
      toast.success('Task cancelled');
      kanbanQuery.refetch();
      listQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to cancel task: ${error.message}`);
    },
  });

  // Handlers
  const handleExecute = (id: number) => {
    executeMutation.mutate({ id });
  };

  const handleDefer = (task: Task) => {
    setSelectedTask(task);
    setDeferDialogOpen(true);
  };

  const handleDeferSubmit = (id: number, scheduledFor: string, reason?: string) => {
    deferMutation.mutate({ id, scheduledFor, reason });
  };

  const handleCancel = (id: number) => {
    if (confirm('Are you sure you want to cancel this task?')) {
      cancelMutation.mutate({ id });
    }
  };

  const handleView = (id: number) => {
    // TODO: Open task detail modal or navigate to task detail page
    console.log('View task:', id);
  };

  const handleRefresh = () => {
    kanbanQuery.refetch();
    listQuery.refetch();
    statsQuery.refetch();
  };

  const isLoading = kanbanQuery.isLoading || listQuery.isLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Task Board</h1>
              <p className="text-sm text-muted-foreground">
                Manage and track all your tasks in one place
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                >
                  <Kanban className="h-4 w-4 mr-1" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4 mr-1" />
                  List
                </Button>
              </div>

              {/* Refresh */}
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>

              {/* Add Task */}
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <StatsCards stats={statsQuery.data} />

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="deferred">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Kanban View */}
        {!isLoading && viewMode === 'kanban' && kanbanQuery.data && (
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
              {kanbanQuery.data.columns.map((column) => (
                <KanbanColumnComponent
                  key={column.id}
                  column={column as KanbanColumn}
                  onExecute={handleExecute}
                  onDefer={handleDefer}
                  onCancel={handleCancel}
                  onView={handleView}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* List View */}
        {!isLoading && viewMode === 'list' && listQuery.data && (
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center text-xs font-medium text-muted-foreground">
                <div className="w-10">Status</div>
                <div className="flex-1">Title</div>
                <div className="w-24">Type</div>
                <div className="w-20">Priority</div>
                <div className="w-32">Scheduled</div>
                <div className="w-24">Created</div>
                <div className="w-10"></div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {listQuery.data.tasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tasks found</p>
                </div>
              ) : (
                listQuery.data.tasks.map((task) => (
                  <TaskListRow
                    key={task.id}
                    task={task as Task}
                    onExecute={handleExecute}
                    onDefer={handleDefer}
                    onCancel={handleCancel}
                    onView={handleView}
                  />
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Defer Dialog */}
      <DeferTaskDialog
        task={selectedTask}
        open={deferDialogOpen}
        onOpenChange={setDeferDialogOpen}
        onDefer={handleDeferSubmit}
      />
    </div>
  );
}

export default TaskBoard;
