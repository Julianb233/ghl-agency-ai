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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { trpc } from '@/lib/trpc';

type EventType = 'all' | 'api_request' | 'workflow' | 'browser_session' | 'job' | 'user_signin';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: EventType;
  userId: string;
  userName: string;
  userEmail: string;
  details: Record<string, any>;
}

const getEventTypeBadge = (eventType: EventType) => {
  const styles = {
    api_request: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    workflow: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    browser_session: 'bg-green-500/20 text-green-400 border-green-500/30',
    job: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    user_signin: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    all: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const icons = {
    api_request: Globe,
    workflow: Activity,
    browser_session: FileText,
    job: Briefcase,
    user_signin: LogIn,
    all: Activity,
  };

  const labels = {
    api_request: 'API Request',
    workflow: 'Workflow',
    browser_session: 'Browser Session',
    job: 'Job',
    user_signin: 'User Sign In',
    all: 'All',
  };

  const Icon = icons[eventType];

  return (
    <Badge className={styles[eventType]}>
      <Icon className="mr-1 h-3 w-3" />
      {labels[eventType]}
    </Badge>
  );
};

export const AuditLog: React.FC = () => {
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [userSearch, setUserSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch audit logs
  const { data: auditLogs, isLoading: isLoadingLogs } = trpc.admin.audit.list.useQuery({
    eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
    userSearch: userSearch || undefined,
    page: currentPage,
    limit: itemsPerPage,
  });

  // Fetch stats
  const { data: stats24h } = trpc.admin.audit.getStats.useQuery({
    period: '24h',
  });

  const { data: stats7d } = trpc.admin.audit.getStats.useQuery({
    period: '7d',
  });

  // Filter and pagination
  const totalPages = auditLogs?.totalPages || 1;
  const entries = auditLogs?.entries || [];

  const toggleRowExpanded = (id: string) => {
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
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'MMM d, yyyy h:mm:ss a');
    } catch {
      return timestamp;
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
                {stats24h ? (
                  Object.entries(stats24h).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">{type.replace(/_/g, ' ')}</span>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {count as number}
                      </Badge>
                    </div>
                  ))
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
                {stats7d ? (
                  Object.entries(stats7d).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">{type.replace(/_/g, ' ')}</span>
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700">
                        {count as number}
                      </Badge>
                    </div>
                  ))
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

              {/* Row 2: User Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">
              Audit Entries ({auditLogs?.total || 0})
            </CardTitle>
            <CardDescription>
              A detailed log of all system events and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                            {getEventTypeBadge(entry.eventType)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-white text-sm">
                                {entry.userName}
                              </span>
                              <span className="text-slate-400 text-xs">
                                {entry.userEmail}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {Object.keys(entry.details).length > 0 ? (
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
                  Page {currentPage} of {totalPages}
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
                          currentPage === totalPages && 'opacity-50 cursor-not-allowed'
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};
