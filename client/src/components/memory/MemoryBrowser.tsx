/**
 * Memory Browser Component
 *
 * Browse and manage agent memory entries and reasoning patterns.
 * Provides search, filtering, and visualization of stored context.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import {
  Brain,
  Search,
  Database,
  RefreshCw,
  Loader2,
  Trash2,
  Eye,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  Tag,
  Lightbulb,
  Zap,
  Box,
  Archive,
} from 'lucide-react';

export function MemoryBrowser() {
  const [activeTab, setActiveTab] = useState('entries');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  // Queries
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = trpc.memory.getStats.useQuery({});

  const { data: entriesData, isLoading: entriesLoading, refetch: refetchEntries } = trpc.memory.search.useQuery({
    limit: 50,
    type: selectedType === 'all' ? undefined : selectedType,
  });

  const { data: patternsData, isLoading: patternsLoading, refetch: refetchPatterns } = trpc.memory.getTopPatterns.useQuery({
    limit: 20,
  });

  // Mutations
  const cleanup = trpc.memory.cleanup.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchEntries();
    },
  });

  const clearCaches = trpc.memory.clearCaches.useMutation({
    onSuccess: () => {
      refetchStats();
    },
  });

  const handleRefreshAll = () => {
    refetchStats();
    refetchEntries();
    refetchPatterns();
  };

  const stats = statsData?.stats;
  const entries = entriesData?.entries || [];
  const patterns = patternsData?.patterns || [];

  const isLoading = statsLoading || entriesLoading || patternsLoading;

  if (isLoading && !stats && !entries.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            Memory Browser
          </h1>
          <p className="text-muted-foreground mt-1">
            Agent context, reasoning patterns, and knowledge storage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => cleanup.mutate({ cleanupExpired: true, cleanupLowPerformance: false })}
            disabled={cleanup.isPending}
          >
            {cleanup.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Cleanup
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Memory Entries"
          value={stats?.totalEntries?.toLocaleString() || '0'}
          icon={Database}
          status="info"
          description="Stored context entries"
        />
        <StatCard
          title="Reasoning Patterns"
          value={stats?.totalReasoningPatterns?.toLocaleString() || '0'}
          icon={Lightbulb}
          status="success"
          description="Learned patterns"
        />
        <StatCard
          title="Avg Confidence"
          value={stats?.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(1)}%` : 'N/A'}
          icon={Zap}
          status={stats?.avgConfidence && stats.avgConfidence > 0.7 ? 'success' : 'warning'}
          description="Pattern confidence"
        />
        <StatCard
          title="Cache Hit Rate"
          value={stats?.hitRate ? `${(stats.hitRate * 100).toFixed(1)}%` : 'N/A'}
          icon={CheckCircle2}
          status={stats?.hitRate && stats.hitRate > 0.8 ? 'success' : 'warning'}
          description="Retrieval efficiency"
        />
        <StatCard
          title="Domains"
          value={stats?.domains?.length?.toString() || '0'}
          icon={Box}
          status="info"
          description="Knowledge domains"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="entries" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Memory Entries
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Reasoning Patterns
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <MemoryEntriesView
            entries={entries}
            onSelectEntry={setSelectedEntry}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            isLoading={entriesLoading}
          />
        </TabsContent>

        <TabsContent value="patterns">
          <ReasoningPatternsView patterns={patterns} isLoading={patternsLoading} />
        </TabsContent>

        <TabsContent value="search">
          <MemorySearchView />
        </TabsContent>

        <TabsContent value="analytics">
          <MemoryAnalyticsView stats={stats} />
        </TabsContent>
      </Tabs>

      {/* Entry Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Memory Entry Details
            </DialogTitle>
            <DialogDescription>
              Full details of the selected memory entry
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && <MemoryEntryDetail entry={selectedEntry} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  status,
  description,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  description: string;
}) {
  const statusColors = {
    success: 'text-green-500 bg-green-50',
    error: 'text-red-500 bg-red-50',
    warning: 'text-amber-500 bg-amber-50',
    info: 'text-blue-500 bg-blue-50',
    neutral: 'text-gray-500 bg-gray-50',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${statusColors[status]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Memory Entries View
function MemoryEntriesView({
  entries,
  onSelectEntry,
  selectedType,
  onTypeChange,
  isLoading,
}: {
  entries: any[];
  onSelectEntry: (entry: any) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Memory Entries ({entries.length})</CardTitle>
            <CardDescription>Stored agent context and state</CardDescription>
          </div>
          <Select value={selectedType} onValueChange={onTypeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="context">Context</SelectItem>
              <SelectItem value="reasoning">Reasoning</SelectItem>
              <SelectItem value="knowledge">Knowledge</SelectItem>
              <SelectItem value="state">State</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No memory entries found</p>
            <p className="text-sm">Entries will appear here as agents store context</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {entries.map((entry) => (
                <MemoryEntryCard
                  key={entry.id}
                  entry={entry}
                  onClick={() => onSelectEntry(entry)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Memory Entry Card
function MemoryEntryCard({ entry, onClick }: { entry: any; onClick: () => void }) {
  const typeColors: Record<string, string> = {
    context: 'bg-blue-100 text-blue-700',
    reasoning: 'bg-purple-100 text-purple-700',
    knowledge: 'bg-green-100 text-green-700',
    state: 'bg-amber-100 text-amber-700',
  };

  return (
    <div
      className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{entry.key}</span>
            <Badge className={typeColors[entry.metadata?.type] || 'bg-gray-100 text-gray-700'}>
              {entry.metadata?.type || 'unknown'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Session: {entry.sessionId?.slice(0, 12)}...
          </p>
          {entry.metadata?.tags?.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {entry.metadata.tags.slice(0, 3).join(', ')}
                {entry.metadata.tags.length > 3 && `+${entry.metadata.tags.length - 3}`}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(entry.createdAt).toLocaleDateString()}
          </span>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// Memory Entry Detail
function MemoryEntryDetail({ entry }: { entry: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground">Key</Label>
          <p className="font-medium">{entry.key}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Type</Label>
          <Badge>{entry.metadata?.type || 'unknown'}</Badge>
        </div>
        <div>
          <Label className="text-muted-foreground">Session ID</Label>
          <p className="font-mono text-sm">{entry.sessionId}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Created</Label>
          <p className="text-sm">{new Date(entry.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div>
        <Label className="text-muted-foreground">Value</Label>
        <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto max-h-48">
          {JSON.stringify(entry.value, null, 2)}
        </pre>
      </div>

      {entry.metadata && (
        <div>
          <Label className="text-muted-foreground">Metadata</Label>
          <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto max-h-32">
            {JSON.stringify(entry.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Reasoning Patterns View
function ReasoningPatternsView({ patterns, isLoading }: { patterns: any[]; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Top Reasoning Patterns
        </CardTitle>
        <CardDescription>
          Learned patterns ranked by success rate and usage
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : patterns.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No reasoning patterns found</p>
            <p className="text-sm">Patterns will appear as agents learn from tasks</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {patterns.map((pattern, index) => (
                <ReasoningPatternCard key={pattern.id} pattern={pattern} rank={index + 1} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Reasoning Pattern Card
function ReasoningPatternCard({ pattern, rank }: { pattern: any; rank: number }) {
  const successRate = pattern.successRate || 0;

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
            {rank}
          </span>
          <span className="font-medium text-sm truncate max-w-md">{pattern.pattern}</span>
        </div>
        <Badge variant={successRate > 0.8 ? 'default' : 'secondary'}>
          {(successRate * 100).toFixed(0)}% success
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-3">
        <div>
          <p className="text-xs text-muted-foreground">Usage Count</p>
          <p className="font-semibold">{pattern.usageCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Confidence</p>
          <p className="font-semibold">{(pattern.confidence * 100).toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Domain</p>
          <p className="font-semibold">{pattern.domain || 'General'}</p>
        </div>
      </div>

      <div className="mt-3">
        <Progress value={successRate * 100} className="h-2" />
      </div>

      {pattern.tags?.length > 0 && (
        <div className="flex gap-1 mt-2">
          {pattern.tags.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Memory Search View
function MemorySearchView() {
  const [searchPattern, setSearchPattern] = useState('');

  const { data, isLoading, refetch } = trpc.memory.findSimilarPatterns.useQuery(
    { pattern: searchPattern, limit: 10 },
    { enabled: searchPattern.length > 3 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-blue-500" />
          Search Memory
        </CardTitle>
        <CardDescription>
          Find similar reasoning patterns and context
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter a pattern or query to search..."
            value={searchPattern}
            onChange={(e) => setSearchPattern(e.target.value)}
            className="flex-1"
          />
          <Button onClick={() => refetch()} disabled={searchPattern.length < 3}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {data?.results && data.results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Results ({data.results.length})</h4>
            {data.results.map((result: any) => (
              <div key={result.id} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{result.data?.pattern}</span>
                  <Badge variant="secondary">
                    {(result.similarity * 100).toFixed(0)}% match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Confidence: {(result.data?.confidence * 100).toFixed(0)}% |
                  Usage: {result.data?.usageCount}
                </p>
              </div>
            ))}
          </div>
        )}

        {data?.results?.length === 0 && searchPattern.length > 3 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No matching patterns found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Memory Analytics View
function MemoryAnalyticsView({ stats }: { stats: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Memory Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnalyticsBar
            label="Context Entries"
            value={stats?.totalEntries || 0}
            max={1000}
            color="bg-blue-500"
          />
          <AnalyticsBar
            label="Reasoning Patterns"
            value={stats?.totalReasoningPatterns || 0}
            max={500}
            color="bg-purple-500"
          />
          <AnalyticsBar
            label="Domains"
            value={stats?.domains?.length || 0}
            max={20}
            color="bg-green-500"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">Average Confidence</span>
              <span className="font-bold">
                {stats?.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <Progress
              value={stats?.avgConfidence ? stats.avgConfidence * 100 : 0}
              className="h-2 mt-2"
            />
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">Cache Hit Rate</span>
              <span className="font-bold">
                {stats?.hitRate ? `${(stats.hitRate * 100).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <Progress
              value={stats?.hitRate ? stats.hitRate * 100 : 0}
              className="h-2 mt-2"
            />
          </div>
          {stats?.domains?.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Active Domains</span>
              <div className="flex flex-wrap gap-1 mt-2">
                {stats.domains.map((domain: string) => (
                  <Badge key={domain} variant="outline" className="text-xs">
                    {domain}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Analytics Bar Component
function AnalyticsBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
