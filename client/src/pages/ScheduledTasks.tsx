import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ActiveExecutionsWidget } from '@/components/widgets/ActiveExecutionsWidget';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  TrendingUp,
  Globe,
  FileText,
  Activity,
  ChevronDown,
  RefreshCw,
  Download,
  Copy,
  Filter,
  Save,
  Star,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { useSavedViewsStore, SavedView } from '@/stores/savedViewsStore';
import { BulkOperationsToolbar } from '@/components/BulkOperationsToolbar';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';

// PLACEHOLDER: Import the actual types from schema once available
type ScheduledBrowserTask = {
  id: number;
  name: string;
  description: string | null;
  automationType: string;
  automationConfig: any;
  scheduleType: string;
  cronExpression: string;
  timezone: string;
  status: string;
  lastRun: Date | null;
  nextRun: Date;
  lastRunStatus: string | null;
  lastRunError: string | null;
  lastRunDuration: number | null;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  retryOnFailure: boolean;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ScheduledTaskExecution = {
  id: number;
  taskId: number;
  status: string;
  triggerType: string;
  attemptNumber: number;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  output: any;
  error: string | null;
  logs: any;
  stepsCompleted: number;
  stepsTotal: number | null;
};

const AUTOMATION_TYPES = [
  { value: 'chat', label: 'Chat Mode', description: 'Natural language browser automation' },
  { value: 'observe', label: 'Observe', description: 'Watch for changes on pages' },
  { value: 'extract', label: 'Extract Data', description: 'Scrape structured data' },
  { value: 'workflow', label: 'Workflow', description: 'Multi-step automation' },
];

const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'cron', label: 'Custom (Cron)' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
];

export default function ScheduledTasksPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [automationTypeFilter, setAutomationTypeFilter] = useState<string>('all');
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledBrowserTask | null>(null);
  const [isSaveViewDialogOpen, setIsSaveViewDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Bulk operations
  const {
    selectedIds,
    selectedCount,
    toggleSelection,
    selectAll,
    deselectAll,
    isSelected,
    isAllSelected,
    isSomeSelected,
  } = useBulkOperations<ScheduledBrowserTask>();

  // Saved views
  const { views, addView, removeView } = useSavedViewsStore();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    automationType: 'chat',
    url: '',
    instruction: '',
    scheduleType: 'daily',
    cronExpression: '0 9 * * *',
    timezone: 'UTC',
    timeout: 300,
    retryOnFailure: true,
    maxRetries: 3,
    retryDelay: 60,
    notifyOnSuccess: false,
    notifyOnFailure: true,
  });

  // tRPC queries and mutations
  const { data: tasksData, isLoading, refetch } = trpc.scheduledTasks.list.useQuery({
    page: 1,
    pageSize: 100,
  });

  const { data: executionsData } = trpc.scheduledTasks.getExecutionHistory.useQuery(
    { taskId: selectedTask?.id!, page: 1, pageSize: 20 },
    { enabled: !!selectedTask }
  );

  const createTaskMutation = trpc.scheduledTasks.create.useMutation({
    onSuccess: () => {
      toast.success('Task created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const updateTaskMutation = trpc.scheduledTasks.update.useMutation({
    onSuccess: () => {
      toast.success('Task updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const deleteTaskMutation = trpc.scheduledTasks.delete.useMutation({
    onSuccess: () => {
      toast.success('Task deleted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  const pauseTaskMutation = trpc.scheduledTasks.pause.useMutation({
    onSuccess: () => {
      toast.success('Task paused');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to pause task: ${error.message}`);
    },
  });

  const resumeTaskMutation = trpc.scheduledTasks.resume.useMutation({
    onSuccess: () => {
      toast.success('Task resumed');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to resume task: ${error.message}`);
    },
  });

  const executeNowMutation = trpc.scheduledTasks.executeNow.useMutation({
    onSuccess: () => {
      toast.success('Task execution queued successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to execute task: ${error.message}`);
    },
  });

  const tasks: ScheduledBrowserTask[] = tasksData?.tasks || [];
  const executions: ScheduledTaskExecution[] = executionsData?.executions || [];

  // Filter and search
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesAutomationType = automationTypeFilter === 'all' || task.automationType === automationTypeFilter;
      const matchesScheduleType = scheduleTypeFilter === 'all' || task.scheduleType === scheduleTypeFilter;
      return matchesSearch && matchesStatus && matchesAutomationType && matchesScheduleType;
    });
  }, [tasks, searchQuery, statusFilter, automationTypeFilter, scheduleTypeFilter]);

  // Handlers
  const handleCreateTask = async () => {
    await createTaskMutation.mutateAsync({
      name: formData.name,
      description: formData.description,
      automationType: formData.automationType as any,
      automationConfig: {
        url: formData.url,
        instruction: formData.instruction,
      },
      scheduleType: formData.scheduleType as any,
      cronExpression: formData.cronExpression,
      timezone: formData.timezone,
      timeout: formData.timeout,
      retryOnFailure: formData.retryOnFailure,
      maxRetries: formData.maxRetries,
      retryDelay: formData.retryDelay,
      notifyOnSuccess: formData.notifyOnSuccess,
      notifyOnFailure: formData.notifyOnFailure,
    });
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    await updateTaskMutation.mutateAsync({
      id: selectedTask.id,
      name: formData.name,
      description: formData.description,
      automationType: formData.automationType as any,
      automationConfig: {
        url: formData.url,
        instruction: formData.instruction,
      },
      scheduleType: formData.scheduleType as any,
      cronExpression: formData.cronExpression,
      timezone: formData.timezone,
      timeout: formData.timeout,
      retryOnFailure: formData.retryOnFailure,
      maxRetries: formData.maxRetries,
      retryDelay: formData.retryDelay,
      notifyOnSuccess: formData.notifyOnSuccess,
      notifyOnFailure: formData.notifyOnFailure,
    });
  };

  const handleDeleteTask = async (taskId: number) => {
    await deleteTaskMutation.mutateAsync({ id: taskId });
  };

  const handleRunNow = async (taskId: number) => {
    await executeNowMutation.mutateAsync({ id: taskId });
  };

  const handleToggleTask = async (taskId: number, currentStatus: string) => {
    if (currentStatus === 'active') {
      await pauseTaskMutation.mutateAsync({ id: taskId });
    } else {
      await resumeTaskMutation.mutateAsync({ id: taskId });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      automationType: 'chat',
      url: '',
      instruction: '',
      scheduleType: 'daily',
      cronExpression: '0 9 * * *',
      timezone: 'UTC',
      timeout: 300,
      retryOnFailure: true,
      maxRetries: 3,
      retryDelay: 60,
      notifyOnSuccess: false,
      notifyOnFailure: true,
    });
  };

  const openEditDialog = (task: ScheduledBrowserTask) => {
    setSelectedTask(task);
    setFormData({
      name: task.name,
      description: task.description || '',
      automationType: task.automationType,
      url: task.automationConfig?.url || '',
      instruction: task.automationConfig?.instruction || '',
      scheduleType: task.scheduleType,
      cronExpression: task.cronExpression,
      timezone: task.timezone,
      timeout: task.timeout,
      retryOnFailure: task.retryOnFailure,
      maxRetries: task.maxRetries,
      retryDelay: task.retryDelay,
      notifyOnSuccess: task.notifyOnSuccess,
      notifyOnFailure: task.notifyOnFailure,
    });
    setIsEditDialogOpen(true);
  };

  const openDetailDialog = (task: ScheduledBrowserTask) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; color: string }> = {
      active: { variant: 'default', icon: CheckCircle, color: 'text-green-500' },
      paused: { variant: 'secondary', icon: Pause, color: 'text-yellow-500' },
      failed: { variant: 'destructive', icon: XCircle, color: 'text-red-500' },
    };
    const config = variants[status] || variants.active;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const getLastRunBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Never run</Badge>;

    const variants: Record<string, { variant: any; icon: any }> = {
      success: { variant: 'default', icon: CheckCircle },
      failed: { variant: 'destructive', icon: XCircle },
      timeout: { variant: 'destructive', icon: Clock },
      partial: { variant: 'secondary', icon: AlertCircle },
    };
    const config = variants[status] || variants.success;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const calculateSuccessRate = (task: ScheduledBrowserTask) => {
    if (task.executionCount === 0) return 0;
    return Math.round((task.successCount / task.executionCount) * 100);
  };

  // Bulk operation handlers
  const handleBulkPause = async () => {
    const selectedTasks = Array.from(selectedIds);
    try {
      await Promise.all(
        selectedTasks.map((id) => pauseTaskMutation.mutateAsync({ id: id as number }))
      );
      toast.success(`Paused ${selectedTasks.length} task(s)`);
      deselectAll();
    } catch (error) {
      toast.error('Failed to pause some tasks');
    }
  };

  const handleBulkResume = async () => {
    const selectedTasks = Array.from(selectedIds);
    try {
      await Promise.all(
        selectedTasks.map((id) => resumeTaskMutation.mutateAsync({ id: id as number }))
      );
      toast.success(`Resumed ${selectedTasks.length} task(s)`);
      deselectAll();
    } catch (error) {
      toast.error('Failed to resume some tasks');
    }
  };

  const handleBulkDelete = async () => {
    const selectedTasks = Array.from(selectedIds);
    try {
      await Promise.all(
        selectedTasks.map((id) => deleteTaskMutation.mutateAsync({ id: id as number }))
      );
      toast.success(`Deleted ${selectedTasks.length} task(s)`);
      deselectAll();
      setBulkDeleteConfirmOpen(false);
    } catch (error) {
      toast.error('Failed to delete some tasks');
    }
  };

  const handleBulkExport = () => {
    const selectedTasks = tasks.filter((task) => selectedIds.has(task.id));
    const dataStr = JSON.stringify(selectedTasks, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `tasks-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success(`Exported ${selectedTasks.length} task(s)`);
  };

  // Task duplication handler
  const handleDuplicateTask = (task: ScheduledBrowserTask) => {
    setFormData({
      name: `${task.name} (Copy)`,
      description: task.description || '',
      automationType: task.automationType,
      url: task.automationConfig?.url || '',
      instruction: task.automationConfig?.instruction || '',
      scheduleType: task.scheduleType,
      cronExpression: task.cronExpression,
      timezone: task.timezone,
      timeout: task.timeout,
      retryOnFailure: task.retryOnFailure,
      maxRetries: task.maxRetries,
      retryDelay: task.retryDelay,
      notifyOnSuccess: task.notifyOnSuccess,
      notifyOnFailure: task.notifyOnFailure,
    });
    setIsCreateDialogOpen(true);
  };

  // Saved view handlers
  const handleSaveCurrentView = () => {
    if (!newViewName.trim()) {
      toast.error('Please enter a view name');
      return;
    }

    addView({
      name: newViewName,
      filters: {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        automationType: automationTypeFilter !== 'all' ? automationTypeFilter : undefined,
        scheduleType: scheduleTypeFilter !== 'all' ? scheduleTypeFilter : undefined,
      },
    });

    toast.success(`Saved view "${newViewName}"`);
    setNewViewName('');
    setIsSaveViewDialogOpen(false);
  };

  const handleLoadView = (viewId: string) => {
    const view = views.find((v: SavedView) => v.id === viewId);
    if (!view) return;

    setStatusFilter(view.filters.status || 'all');
    setAutomationTypeFilter(view.filters.automationType || 'all');
    setScheduleTypeFilter(view.filters.scheduleType || 'all');
    toast.success(`Loaded view "${view.name}"`);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setAutomationTypeFilter('all');
    setScheduleTypeFilter('all');
    setSearchQuery('');
    deselectAll();
    toast.success('Filters cleared');
  };

  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between" data-tour="tasks-header">
          <div>
            <Breadcrumb
              items={[
                { label: 'Dashboard', onClick: () => setLocation('/') },
                { label: 'Scheduled Tasks' },
              ]}
            />
            <h1 className="text-3xl font-bold text-slate-900 mt-4">Scheduled Tasks</h1>
            <p className="text-slate-600 mt-1">Automate browser tasks on a schedule</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2" data-tour="tasks-create-button">
            <Plus className="h-4 w-4" />
            Create New Task
          </Button>
        </div>

        {/* Real-Time Execution Monitor Widget */}
        <ActiveExecutionsWidget maxExecutions={5} showConnectionStatus={true} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tasks.reduce((sum, t) => sum + t.executionCount, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {tasks.length > 0
                  ? Math.round(
                      (tasks.reduce((sum, t) => sum + t.successCount, 0) /
                        tasks.reduce((sum, t) => sum + t.executionCount, 0)) * 100
                    )
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Saved Views */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search tasks by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={automationTypeFilter} onValueChange={setAutomationTypeFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {AUTOMATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={scheduleTypeFilter} onValueChange={setScheduleTypeFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schedules</SelectItem>
                      {SCHEDULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Saved Views Dropdown */}
                  {views.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Star className="h-4 w-4" />
                          Saved Views
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Your Saved Views</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {views.map((view: SavedView) => (
                          <DropdownMenuItem
                            key={view.id}
                            className="flex items-center justify-between gap-4"
                          >
                            <span
                              onClick={() => handleLoadView(view.id)}
                              className="flex-1 cursor-pointer"
                            >
                              {view.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeView(view.id);
                                toast.success('View deleted');
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSaveViewDialogOpen(true)}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Current View
                  </Button>

                  {(statusFilter !== 'all' ||
                    automationTypeFilter !== 'all' ||
                    scheduleTypeFilter !== 'all' ||
                    searchQuery) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Filter className="h-4 w-4" />
                  <span>
                    {filteredTasks.length} of {tasks.length} tasks
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardContent className="p-0" data-tour="tasks-list">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks found</h3>
                <p className="text-slate-600 mb-6">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first scheduled task to get started'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Task
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected(filteredTasks)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAll(filteredTasks);
                          } else {
                            deselectAll();
                          }
                        }}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-slate-50">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected(task.id)}
                          onCheckedChange={() => toggleSelection(task.id)}
                          aria-label={`Select ${task.name}`}
                        />
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => openDetailDialog(task)}>
                        <div>
                          <div className="font-medium text-slate-900">{task.name}</div>
                          {task.description && (
                            <div className="text-sm text-slate-500 truncate max-w-xs">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {task.automationType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span className="capitalize">{task.scheduleType}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getLastRunBadge(task.lastRunStatus)}
                          {task.lastRunDuration && (
                            <div className="text-xs text-slate-500">
                              {formatDuration(task.lastRunDuration)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-600">
                          {formatDate(task.nextRun)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium">
                            {calculateSuccessRate(task)}%
                          </div>
                          <div className="text-xs text-slate-500">
                            ({task.successCount}/{task.executionCount})
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailDialog(task)}>
                              <FileText className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRunNow(task.id)}>
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Run Now
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDialog(task)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTask(task)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleTask(task.id, task.status)}>
                              {task.status === 'active' ? (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Resume
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Operations Toolbar */}
      <BulkOperationsToolbar
        selectedCount={selectedCount}
        onPause={handleBulkPause}
        onResume={handleBulkResume}
        onDelete={() => setBulkDeleteConfirmOpen(true)}
        onExport={handleBulkExport}
        onDeselectAll={deselectAll}
      />

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        onNewTask={() => setIsCreateDialogOpen(true)}
        onSave={() => {
          if (isCreateDialogOpen) handleCreateTask();
          else if (isEditDialogOpen) handleUpdateTask();
        }}
      />

      {/* Save View Dialog */}
      <Dialog open={isSaveViewDialogOpen} onOpenChange={setIsSaveViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>
              Give this filter configuration a name to quickly access it later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="e.g., Active Chat Tasks"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveCurrentView();
                  }
                }}
              />
            </div>
            <div className="rounded-md bg-slate-50 p-3 space-y-2">
              <p className="text-sm font-medium text-slate-700">Current Filters:</p>
              <div className="flex flex-wrap gap-2">
                {statusFilter !== 'all' && (
                  <Badge variant="secondary">Status: {statusFilter}</Badge>
                )}
                {automationTypeFilter !== 'all' && (
                  <Badge variant="secondary">Type: {automationTypeFilter}</Badge>
                )}
                {scheduleTypeFilter !== 'all' && (
                  <Badge variant="secondary">Schedule: {scheduleTypeFilter}</Badge>
                )}
                {statusFilter === 'all' &&
                  automationTypeFilter === 'all' &&
                  scheduleTypeFilter === 'all' && (
                    <span className="text-sm text-slate-500">No filters applied</span>
                  )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveViewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCurrentView}>Save View</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} task(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected tasks
              and all their execution history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Task Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
          setSelectedTask(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              Configure your scheduled browser automation task
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Task Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Daily Lead Scraper"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of what this task does"
                  rows={2}
                />
              </div>
            </div>

            {/* Automation Config */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="automationType">Automation Type *</Label>
                <Select
                  value={formData.automationType}
                  onValueChange={(value) => setFormData({ ...formData, automationType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-slate-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="url">Starting URL *</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="instruction">Instruction / Prompt *</Label>
                <Textarea
                  id="instruction"
                  value={formData.instruction}
                  onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
                  placeholder="Natural language instruction for what the automation should do"
                  rows={3}
                />
              </div>
            </div>

            {/* Schedule Config */}
            <div className="space-y-4" data-tour="tasks-schedule-config">
              <h3 className="font-semibold text-sm">Schedule</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduleType">Schedule Type *</Label>
                  <Select
                    value={formData.scheduleType}
                    onValueChange={(value) => setFormData({ ...formData, scheduleType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone *</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="cronExpression">
                  Cron Expression {formData.scheduleType === 'cron' && '*'}
                </Label>
                <Input
                  id="cronExpression"
                  value={formData.cronExpression}
                  onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                  placeholder="0 9 * * *"
                  disabled={formData.scheduleType !== 'cron'}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Format: minute hour day month weekday (e.g., "0 9 * * *" = 9 AM daily)
                </p>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Advanced Options</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={formData.timeout}
                    onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                    min={30}
                    max={3600}
                  />
                </div>

                <div>
                  <Label htmlFor="maxRetries">Max Retries</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    value={formData.maxRetries}
                    onChange={(e) => setFormData({ ...formData, maxRetries: parseInt(e.target.value) })}
                    min={0}
                    max={10}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="retryOnFailure">Retry on Failure</Label>
                    <p className="text-xs text-slate-500">Automatically retry failed executions</p>
                  </div>
                  <Switch
                    id="retryOnFailure"
                    checked={formData.retryOnFailure}
                    onCheckedChange={(checked) => setFormData({ ...formData, retryOnFailure: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifyOnSuccess">Notify on Success</Label>
                    <p className="text-xs text-slate-500">Send notification when task succeeds</p>
                  </div>
                  <Switch
                    id="notifyOnSuccess"
                    checked={formData.notifyOnSuccess}
                    onCheckedChange={(checked) => setFormData({ ...formData, notifyOnSuccess: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifyOnFailure">Notify on Failure</Label>
                    <p className="text-xs text-slate-500">Send notification when task fails</p>
                  </div>
                  <Switch
                    id="notifyOnFailure"
                    checked={formData.notifyOnFailure}
                    onCheckedChange={(checked) => setFormData({ ...formData, notifyOnFailure: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedTask(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={isEditDialogOpen ? handleUpdateTask : handleCreateTask}>
              {isEditDialogOpen ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.name}</DialogTitle>
            <DialogDescription>{selectedTask?.description}</DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">Execution History</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getStatusBadge(selectedTask.status)}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {calculateSuccessRate(selectedTask)}%
                      </div>
                      <p className="text-xs text-slate-500">
                        {selectedTask.successCount} of {selectedTask.executionCount} runs
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Next Run</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">{formatDate(selectedTask.nextRun)}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Average Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold">
                        {formatDuration(selectedTask.averageDuration)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedTask.lastRunError && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-sm text-red-900">Last Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-red-800">{selectedTask.lastRunError}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4" data-tour="tasks-history">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Started</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Steps</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell>{formatDate(execution.startedAt)}</TableCell>
                        <TableCell>{getLastRunBadge(execution.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {execution.triggerType}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDuration(execution.duration)}</TableCell>
                        <TableCell>
                          {execution.stepsCompleted}/{execution.stepsTotal || '?'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="config" className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500">Automation Type</Label>
                    <p className="text-sm font-medium capitalize">{selectedTask.automationType}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">URL</Label>
                    <p className="text-sm font-medium break-all">{selectedTask.automationConfig?.url}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Schedule</Label>
                    <p className="text-sm font-medium">
                      {selectedTask.scheduleType} - {selectedTask.cronExpression} ({selectedTask.timezone})
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Timeout</Label>
                    <p className="text-sm font-medium">{selectedTask.timeout}s</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Retry Configuration</Label>
                    <p className="text-sm font-medium">
                      {selectedTask.retryOnFailure ? `Up to ${selectedTask.maxRetries} retries` : 'Disabled'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Notifications</Label>
                    <div className="flex gap-2 mt-1">
                      {selectedTask.notifyOnSuccess && (
                        <Badge variant="outline">On Success</Badge>
                      )}
                      {selectedTask.notifyOnFailure && (
                        <Badge variant="outline">On Failure</Badge>
                      )}
                      {!selectedTask.notifyOnSuccess && !selectedTask.notifyOnFailure && (
                        <span className="text-sm text-slate-500">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsDetailDialogOpen(false);
              if (selectedTask) openEditDialog(selectedTask);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
