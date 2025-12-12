import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Search, Star, ChevronDown, X, Filter, Save } from 'lucide-react';
import { SavedView } from '@/stores/savedViewsStore';

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

interface TaskFiltersProps {
  searchQuery: string;
  statusFilter: string;
  automationTypeFilter: string;
  scheduleTypeFilter: string;
  filteredCount: number;
  totalCount: number;
  views: SavedView[];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onAutomationTypeFilterChange: (value: string) => void;
  onScheduleTypeFilterChange: (value: string) => void;
  onSaveView: () => void;
  onLoadView: (viewId: string) => void;
  onRemoveView: (viewId: string) => void;
  onClearFilters: () => void;
}

export const TaskFilters = React.memo<TaskFiltersProps>(({
  searchQuery,
  statusFilter,
  automationTypeFilter,
  scheduleTypeFilter,
  filteredCount,
  totalCount,
  views,
  onSearchChange,
  onStatusFilterChange,
  onAutomationTypeFilterChange,
  onScheduleTypeFilterChange,
  onSaveView,
  onLoadView,
  onRemoveView,
  onClearFilters,
}) => {
  const hasActiveFilters = statusFilter !== 'all' ||
    automationTypeFilter !== 'all' ||
    scheduleTypeFilter !== 'all' ||
    searchQuery;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search tasks by name or description..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
                aria-label="Search tasks"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="w-full md:w-40" aria-label="Filter by status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={automationTypeFilter} onValueChange={onAutomationTypeFilterChange}>
                <SelectTrigger className="w-full md:w-40" aria-label="Filter by type">
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

              <Select value={scheduleTypeFilter} onValueChange={onScheduleTypeFilterChange}>
                <SelectTrigger className="w-full md:w-40" aria-label="Filter by schedule">
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
                          onClick={() => onLoadView(view.id)}
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
                            onRemoveView(view.id);
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
                onClick={onSaveView}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save Current View
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
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
                {filteredCount} of {totalCount} tasks
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

TaskFilters.displayName = 'TaskFilters';
