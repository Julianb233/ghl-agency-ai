import React from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  FileText,
  Copy,
} from 'lucide-react';

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

interface TaskTableProps {
  tasks: ScheduledBrowserTask[];
  selectedIds: Set<number>;
  isAllSelected: boolean;
  isSelected: (id: number) => boolean;
  onToggleSelection: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpenDetail: (task: ScheduledBrowserTask) => void;
  onEdit: (task: ScheduledBrowserTask) => void;
  onDuplicate: (task: ScheduledBrowserTask) => void;
  onRunNow: (taskId: number) => void;
  onToggleTask: (taskId: number, currentStatus: string) => void;
  onDelete: (taskId: number) => void;
}

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

export const TaskTable = React.memo<TaskTableProps>(({
  tasks,
  selectedIds,
  isAllSelected,
  isSelected,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onOpenDetail,
  onEdit,
  onDuplicate,
  onRunNow,
  onToggleTask,
  onDelete,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={(checked) => {
                if (checked) {
                  onSelectAll();
                } else {
                  onDeselectAll();
                }
              }}
              aria-label="Select all tasks"
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
        {tasks.map((task) => (
          <TableRow key={task.id} className="hover:bg-slate-50">
            <TableCell onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected(task.id)}
                onCheckedChange={() => onToggleSelection(task.id)}
                aria-label={`Select ${task.name}`}
              />
            </TableCell>
            <TableCell className="cursor-pointer" onClick={() => onOpenDetail(task)}>
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
                  <Button variant="ghost" size="sm" aria-label={`Actions for ${task.name}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpenDetail(task)}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRunNow(task.id)}>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Run Now
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(task)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onToggleTask(task.id, task.status)}>
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
                    onClick={() => onDelete(task.id)}
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
  );
});

TaskTable.displayName = 'TaskTable';
