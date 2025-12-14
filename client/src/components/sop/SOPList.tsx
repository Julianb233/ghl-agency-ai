import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Copy,
  Archive,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileText,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  SOP,
  SOPFilters,
  SOPListProps,
  SOPCategory,
  SOPStatus,
  SOPPriority,
  AutomationLevel
} from '@/types/sop';

const CATEGORY_LABELS: Record<SOPCategory, string> = {
  CLIENT_ONBOARDING: 'Client Onboarding',
  SALES: 'Sales',
  SUPPORT: 'Support',
  MARKETING: 'Marketing',
  OPERATIONS: 'Operations',
  TECHNICAL: 'Technical',
  OTHER: 'Other'
};

const STATUS_CONFIG: Record<SOPStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'secondary' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  ACTIVE: { label: 'Active', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'warning' },
  DEPRECATED: { label: 'Deprecated', variant: 'secondary' }
};

const PRIORITY_CONFIG: Record<SOPPriority, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'text-slate-600' },
  MEDIUM: { label: 'Medium', color: 'text-blue-600' },
  HIGH: { label: 'High', color: 'text-orange-600' },
  CRITICAL: { label: 'Critical', color: 'text-red-600' }
};

const AUTOMATION_LABELS: Record<AutomationLevel, string> = {
  MANUAL: 'Manual',
  SEMI_AUTOMATED: 'Semi-Automated',
  FULLY_AUTOMATED: 'Fully Automated'
};

export const SOPList: React.FC<SOPListProps> = ({
  filters: initialFilters,
  onSelectSOP,
  onEditSOP,
  onDuplicateSOP,
  onArchiveSOP,
  onCreateNew
}) => {
  const [filters, setFilters] = useState<SOPFilters>(initialFilters || {});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Mock data - replace with tRPC query
  const { data: sops = [], isLoading } = useMockSOPs();

  const filteredSOPs = useMemo(() => {
    return sops.filter((sop) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          sop.title.toLowerCase().includes(searchLower) ||
          sop.description.toLowerCase().includes(searchLower) ||
          sop.tags?.some(tag => tag.name.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      if (filters.category && sop.category !== filters.category) return false;
      if (filters.status && sop.status !== filters.status) return false;
      if (filters.priority && sop.priority !== filters.priority) return false;
      if (filters.automationLevel && sop.automationLevel !== filters.automationLevel) return false;
      if (filters.aiEnabled !== undefined && sop.aiEnabled !== filters.aiEnabled) return false;

      if (filters.tags && filters.tags.length > 0) {
        const sopTagNames = sop.tags?.map(tag => tag.name) || [];
        const hasMatchingTag = filters.tags.some(filterTag => sopTagNames.includes(filterTag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [sops, filters]);

  const handleUpdateFilter = (key: keyof SOPFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
          <div className="h-10 w-32 bg-slate-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-slate-200 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Standard Operating Procedures</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredSOPs.length} {filteredSOPs.length === 1 ? 'procedure' : 'procedures'} found
          </p>
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Create SOP
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SOPs by title, description, or tags..."
              value={filters.search || ''}
              onChange={(e) => handleUpdateFilter('search', e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {Object.keys(filters).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {Object.keys(filters).filter(k => filters[k as keyof SOPFilters]).length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={filters.category || 'all'}
                    onValueChange={(value) => handleUpdateFilter('category', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) => handleUpdateFilter('status', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    value={filters.priority || 'all'}
                    onValueChange={(value) => handleUpdateFilter('priority', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Automation</label>
                  <Select
                    value={filters.automationLevel || 'all'}
                    onValueChange={(value) => handleUpdateFilter('automationLevel', value === 'all' ? undefined : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All levels</SelectItem>
                      {Object.entries(AUTOMATION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {Object.keys(filters).length > 0 && (
                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear all filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* SOP Grid/List */}
      {filteredSOPs.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No SOPs found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filters.search || Object.keys(filters).length > 0
                ? 'Try adjusting your filters or search query'
                : 'Get started by creating your first SOP'
              }
            </p>
            {!filters.search && Object.keys(filters).length === 0 && (
              <Button onClick={onCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First SOP
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          'grid gap-4',
          viewMode === 'grid'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1'
        )}>
          {filteredSOPs.map((sop) => (
            <SOPCard
              key={sop.id}
              sop={sop}
              onSelect={() => onSelectSOP?.(sop)}
              onEdit={() => onEditSOP?.(sop)}
              onDuplicate={() => onDuplicateSOP?.(sop)}
              onArchive={() => onArchiveSOP?.(sop)}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SOPCardProps {
  sop: SOP;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  viewMode: 'grid' | 'list';
}

const SOPCard: React.FC<SOPCardProps> = ({
  sop,
  onSelect,
  onEdit,
  onDuplicate,
  onArchive,
  viewMode
}) => {
  const statusConfig = STATUS_CONFIG[sop.status];
  const priorityConfig = PRIORITY_CONFIG[sop.priority];

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0" onClick={onSelect}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={statusConfig.variant}>
                {statusConfig.label}
              </Badge>
              {sop.aiEnabled && (
                <Badge variant="info" className="gap-1">
                  <Zap className="h-3 w-3" />
                  AI
                </Badge>
              )}
            </div>
            <CardTitle className="line-clamp-2">{sop.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {sop.description}
            </CardDescription>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent onClick={onSelect}>
        <div className="space-y-3">
          {/* Tags */}
          {sop.tags && sop.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sop.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
              {sop.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{sop.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{sop.steps?.length || 0} steps</span>
            </div>
            {sop.estimatedDuration && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{sop.estimatedDuration}min</span>
              </div>
            )}
            {sop.usageCount !== undefined && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>{sop.usageCount} runs</span>
              </div>
            )}
            {sop.successRate !== undefined && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span>{sop.successRate}% success</span>
              </div>
            )}
          </div>

          {/* Category & Priority */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[sop.category]}
            </span>
            <span className={cn("text-xs font-medium", priorityConfig.color)}>
              {priorityConfig.label} Priority
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mock hook - replace with actual tRPC query
function useMockSOPs() {
  // This would be replaced with:
  // const { data, isLoading } = trpc.sop.list.useQuery();
  return {
    data: [] as SOP[],
    isLoading: false
  };
}
