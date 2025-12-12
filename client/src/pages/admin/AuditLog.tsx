import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Activity,
  Users,
  Globe,
  Briefcase,
  LogIn,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type EventType = 'all' | 'api_request' | 'workflow' | 'browser_session' | 'job' | 'user_signin';

interface AuditLogEntry {
  id: string | number;
  type: string;
  timestamp: Date;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  details: Record<string, any>;
  metadata?: any;
}

const getEventTypeBadge = (eventType: string) => {
  const styles: Record<string, string> = {
    api_request: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    workflow: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    browser_session: 'bg-green-500/20 text-green-400 border-green-500/30',
    job: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    user_signin: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    all: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const icons: Record<string, React.ComponentType<any>> = {
    api_request: Globe,
    workflow: Activity,
    browser_session: FileText,
    job: Briefcase,
    user_signin: LogIn,
    all: Activity,
  };

  const labels: Record<string, string> = {
    api_request: 'API Request',
    workflow: 'Workflow',
    browser_session: 'Browser Session',
    job: 'Job',
    user_signin: 'User Sign In',
    all: 'All',
  };

  const Icon = icons[eventType] || Activity;
  const style = styles[eventType] || styles.all;
  const label = labels[eventType] || eventType;

  return (
    <Badge className={style}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
};

export const AuditLog: React.FC = () => {
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [userIdFilter, setUserIdFilter] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  // Pagination - using offset-based pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const currentOffset = (currentPage - 1) * itemsPerPage;

  // Parse userId filter (must be a number)
  const parsedUserId = userIdFilter ? parseInt(userIdFilter, 10) : undefined;
  const validUserId = parsedUserId && !isNaN(parsedUserId) ? parsedUserId : undefined;

  // Fetch audit logs
  const {
    data: auditData,
    isLoading: isLoadingLogs,
    error: logsError
  } = trpc.admin.audit.list.useQuery({
    eventType: eventTypeFilter === 'all' ? 'all' : eventTypeFilter,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    userId: validUserId,
    limit: itemsPerPage,
    offset: currentOffset,
    sortOrder: 'desc',
  });

  // Fetch stats (no parameters needed - backend calculates internally)
  const {
    data: stats,
    error: statsError
  } = trpc.admin.audit.getStats.useQuery();

  // Show error toasts
  React.useEffect(() => {
    if (logsError) {
      toast.error('Failed to load audit logs', {
        description: logsError.message,
      });
    }
  }, [logsError]);

  React.useEffect(() => {
    if (statsError) {
      toast.error('Failed to load audit statistics', {
        description: statsError.message,
      });
    }
  }, [statsError]);

  // Extract data from response
  const entries = auditData?.entries || [];
  const total = auditData?.pagination?.total || 0;
  const hasMore = auditData?.pagination?.hasMore || false;

  // Calculate total pages
  const totalPages = Math.ceil(total / itemsPerPage);

  const toggleRowExpanded = (id: string | number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      setExpandedRows(new Set()); // Clear expanded rows on page change
    }
  };

  const handleNextPage = () => {
    if (hasMore && currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      setExpandedRows(new Set()); // Clear expanded rows on page change
    }
  };

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setExpandedRows(new Set());
  }, [eventTypeFilter, startDate, endDate, validUserId]);

  const formatTimestamp = (timestamp: Date) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'MMM d, yyyy h:mm:ss a');
    } catch {
      return String(timestamp);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Audit Log</h2>
            <p className="text-slate-400 mt-1">View and monitor system activity</p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Last 24 Hours</CardTitle>
              <CardDescription>Event summary from the past day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">API Requests</span>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {stats.apiRequests.last24Hours}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Workflows</span>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {stats.workflows.last24Hours}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Browser Sessions</span>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {stats.browserSessions.last24Hours}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">User Sign-ins</span>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {stats.userSignins.last24Hours}
                      </Badge>
                    </div>
                  </>
                ) : statsError ? (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Failed to load stats</span>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Loading stats...</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Last 7 Days</CardTitle>
              <CardDescription>Event summary from the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">API Requests</span>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {stats.apiRequests.last7Days}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Workflows</span>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {stats.workflows.last7Days}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Browser Sessions</span>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {stats.browserSessions.last7Days}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">User Sign-ins</span>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {stats.userSignins.last7Days}
                      </Badge>
                    </div>
                  </>
                ) : statsError ? (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Failed to load stats</span>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Loading stats...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Row 1: Event Type and Date Range */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <Select value={eventTypeFilter} onValueChange={(value) => setEventTypeFilter(value as EventType)}>
                  <SelectTrigger className="w-full md:w-[200px] bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="api_request">API Request</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                    <SelectItem value="browser_session">Browser Session</SelectItem>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="user_signin">User Sign In</SelectItem>
                  </SelectContent>
                </Select>

                {/* Start Date */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full md:w-[200px] justify-start text-left font-normal bg-slate-800 border-slate-700 text-white hover:bg-slate-700',
                        !startDate && 'text-slate-400'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'MMM d, yyyy') : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="bg-slate-900"
                    />
                  </PopoverContent>
                </Popover>

                {/* End Date */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full md:w-[200px] justify-start text-left font-normal bg-slate-800 border-slate-700 text-white hover:bg-slate-700',
                        !endDate && 'text-slate-400'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'MMM d, yyyy') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="bg-slate-900"
                    />
                  </PopoverContent>
                </Popover>

                {/* Clear Dates */}
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDate(undefined);
                      setEndDate(undefined);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Clear dates
                  </Button>
                )}
              </div>

              {/* Row 2: User ID Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Filter by user ID (numeric)..."
                  value={userIdFilter}
                  onChange={(e) => setUserIdFilter(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white"
                />
                {userIdFilter && !validUserId && (
                  <p className="text-xs text-red-400 mt-1">User ID must be a number</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">
              Audit Entries ({total})
            </CardTitle>
            <CardDescription>
              A detailed log of all system events and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Failed to load audit logs</h3>
                <p className="text-slate-400 text-sm max-w-md">{logsError.message}</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400 w-[50px]"></TableHead>
                      <TableHead className="text-slate-400">Timestamp</TableHead>
                      <TableHead className="text-slate-400">Event Type</TableHead>
                      <TableHead className="text-slate-400">User</TableHead>
                      <TableHead className="text-slate-400">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingLogs ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-slate-400 py-8"
                        >
                          Loading audit logs...
                        </TableCell>
                      </TableRow>
                    ) : entries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-slate-400 py-8"
                        >
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry: AuditLogEntry) => {
                        const isExpanded = expandedRows.has(entry.id);
                        return (
                          <React.Fragment key={entry.id}>
                            <TableRow className="border-slate-800">
                              <TableCell>
                                <Collapsible open={isExpanded} onOpenChange={() => toggleRowExpanded(entry.id)}>
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                </Collapsible>
                              </TableCell>
                              <TableCell className="text-slate-300 text-sm">
                                {formatTimestamp(entry.timestamp)}
                              </TableCell>
                              <TableCell>
                                {getEventTypeBadge(entry.type)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium text-white text-sm">
                                    {entry.userName || 'Unknown'}
                                  </span>
                                  <span className="text-slate-400 text-xs">
                                    {entry.userEmail || (entry.userId ? `ID: ${entry.userId}` : 'System')}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-400 text-sm">
                                {Object.keys(entry.details || {}).length > 0 ? (
                                  <span className="text-slate-500">
                                    Click to expand
                                  </span>
                                ) : (
                                  <span className="text-slate-600">No details</span>
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className="border-slate-800">
                                <TableCell colSpan={5} className="bg-slate-950/50">
                                  <Collapsible open={isExpanded}>
                                    <CollapsibleContent>
                                      <div className="p-4 rounded-md bg-slate-900/50 border border-slate-800">
                                        <h4 className="text-sm font-semibold text-white mb-2">
                                          Event Details
                                        </h4>
                                        <pre className="text-xs text-slate-300 overflow-x-auto">
                                          {JSON.stringify(entry.details, null, 2)}
                                        </pre>
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      Page {currentPage} of {totalPages} ({total} total entries)
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={handlePreviousPage}
                            className={cn(
                              'cursor-pointer bg-slate-800 border-slate-700 text-white hover:bg-slate-700',
                              currentPage === 1 && 'opacity-50 cursor-not-allowed'
                            )}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={handleNextPage}
                            className={cn(
                              'cursor-pointer bg-slate-800 border-slate-700 text-white hover:bg-slate-700',
                              (!hasMore || currentPage === totalPages) && 'opacity-50 cursor-not-allowed'
                            )}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};
