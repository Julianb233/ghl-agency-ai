import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent
} from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrowserSessionCard } from '@/components/browser/BrowserSessionCard';
import { SessionLogsViewer } from '@/components/browser/SessionLogsViewer';
import { LiveBrowserView } from '@/components/browser/LiveBrowserView';
import { useBrowserSessions } from '@/hooks/useBrowserSessions';
import { useWebSocketStore } from '@/stores/websocketStore';
import {
  Globe,
  Plus,
  Search,
  Filter,
  Trash2,
  XCircle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { TourPrompt } from '@/components/tour';
import { useLocation } from 'wouter';

type SessionStatus = 'all' | 'running' | 'completed' | 'failed' | 'expired';
type DateRange = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function BrowserSessions() {
  const [, setLocation] = useLocation();
  const {
    sessions,
    isLoading,
    refetch,
    terminateSession,
    deleteSession,
    bulkTerminate,
    bulkDelete,
  } = useBrowserSessions();

  const { connectionState } = useWebSocketStore();

  // Filters
  const [statusFilter, setStatusFilter] = useState<SessionStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [liveViewDialogOpen, setLiveViewDialogOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((session: any) => {
      // Status filter
      if (statusFilter !== 'all' && session.status !== statusFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = session.sessionId?.toLowerCase().includes(query);
        const matchesUrl = session.url?.toLowerCase().includes(query);
        if (!matchesId && !matchesUrl) return false;
      }

      // Date range filter
      if (dateRange !== 'all') {
        const sessionDate = new Date(session.createdAt);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateRange) {
          case 'today':
            if (sessionDate < today) return false;
            break;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (sessionDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            if (sessionDate < monthAgo) return false;
            break;
        }
      }

      return true;
    });
  }, [sessions, statusFilter, searchQuery, dateRange]);

  // Paginate
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSessions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSessions, currentPage]);

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

  // Selection handlers
  const toggleSessionSelection = (sessionId: string) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(paginatedSessions.map((s: any) => s.sessionId));
    setSelectedSessions(allIds);
  };

  const clearSelection = () => {
    setSelectedSessions(new Set());
  };

  // Action handlers
  const handleLiveView = (session: any) => {
    if (session.debugUrl) {
      window.open(session.debugUrl, '_blank');
    } else {
      setCurrentSession(session);
      setLiveViewDialogOpen(true);
    }
  };

  const handleViewRecording = (session: any) => {
    if (session.recordingUrl) {
      window.open(session.recordingUrl, '_blank');
    } else {
      toast.error('No recording available for this session');
    }
  };

  const handleViewLogs = (session: any) => {
    setCurrentSession(session);
    setLogsDialogOpen(true);
  };

  const handleViewData = (session: any) => {
    toast.info('Data viewer not yet implemented');
  };

  const handleTerminate = (session: any) => {
    setCurrentSession(session);
    setTerminateDialogOpen(true);
  };

  const handleDelete = (session: any) => {
    setCurrentSession(session);
    setDeleteDialogOpen(true);
  };

  const confirmTerminate = async () => {
    if (currentSession) {
      await terminateSession(currentSession.sessionId);
      setTerminateDialogOpen(false);
      setCurrentSession(null);
    }
  };

  const confirmDelete = async () => {
    if (currentSession) {
      await deleteSession(currentSession.sessionId);
      setDeleteDialogOpen(false);
      setCurrentSession(null);
    }
  };

  const handleBulkTerminate = async () => {
    await bulkTerminate(Array.from(selectedSessions));
    clearSelection();
  };

  const handleBulkDelete = async () => {
    await bulkDelete(Array.from(selectedSessions));
    clearSelection();
  };

  const handleNewSession = () => {
    toast.info('Navigate to AI Browser Panel to create a new session');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between" data-tour="browser-header">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', onClick: () => setLocation('/') },
              { label: 'Browser Sessions' },
            ]}
          />
          <h1 className="text-3xl font-bold flex items-center gap-2 mt-4">
            <Globe className="h-8 w-8" />
            Browser Sessions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all browser automation sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={connectionState === 'connected' ? 'default' : 'secondary'}
            className="gap-1"
          >
            <span className={`h-2 w-2 rounded-full ${connectionState === 'connected' ? 'bg-green-500' : 'bg-slate-400'}`} />
            {connectionState}
          </Badge>
          <Button onClick={handleNewSession} className="gap-2" data-tour="browser-create-session">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </div>
      </div>

      <TourPrompt tourId="browser-sessions" featureName="Browser Automation" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" data-tour="browser-stats">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {sessions.filter((s: any) => s.status === 'running').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {sessions.filter((s: any) => s.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {sessions.filter((s: any) => s.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card data-tour="browser-filters">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by session ID or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v: SessionStatus) => setStatusFilter(v)}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
              <SelectTrigger className="w-full md:w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedSessions.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default">{selectedSessions.size} selected</Badge>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkTerminate} className="gap-1">
                  <XCircle className="h-4 w-4" />
                  Terminate Selected
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-1 text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <div className="space-y-3" data-tour="browser-sessions-list">
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-slate-600">Loading sessions...</p>
            </CardContent>
          </Card>
        ) : paginatedSessions.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Globe className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No sessions found</EmptyTitle>
              <EmptyDescription>
                {searchQuery || statusFilter !== 'all' || dateRange !== 'all'
                  ? 'No sessions match your filters. Try adjusting your search or filter criteria.'
                  : 'Create your first browser automation session to start automating tasks and workflows.'}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={handleNewSession} className="gap-2">
                <Plus className="h-4 w-4" />
                New Session
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          paginatedSessions.map((session: any) => (
            <BrowserSessionCard
              key={session.id}
              session={session}
              onLiveView={handleLiveView}
              onViewRecording={handleViewRecording}
              onViewLogs={handleViewLogs}
              onViewData={handleViewData}
              onTerminate={handleTerminate}
              onDelete={handleDelete}
              isSelected={selectedSessions.has(session.sessionId)}
              onSelect={(selected) => toggleSessionSelection(session.sessionId)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredSessions.length)} of{' '}
                {filteredSessions.length} sessions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={i}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Session Logs</DialogTitle>
          </DialogHeader>
          {currentSession && (
            <SessionLogsViewer sessionId={currentSession.sessionId} />
          )}
        </DialogContent>
      </Dialog>

      {/* Live View Dialog */}
      <Dialog open={liveViewDialogOpen} onOpenChange={setLiveViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Live Browser View</DialogTitle>
          </DialogHeader>
          {currentSession && (
            <LiveBrowserView
              sessionId={currentSession.sessionId}
              debugUrl={currentSession.debugUrl}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Terminate Confirmation */}
      <AlertDialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the browser session immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTerminate} className="bg-orange-600 hover:bg-orange-700">
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the session and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
