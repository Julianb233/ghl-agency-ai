import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  Eye,
  GitCompare,
  Calendar,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { SOPVersion, SOPVersionHistoryProps } from '@/types/sop';

export const SOPVersionHistory: React.FC<SOPVersionHistoryProps> = ({
  sopId,
  versions = [],
  onRestore,
  onCompare
}) => {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [selectedVersions, setSelectedVersions] = useState<SOPVersion[]>([]);
  const [showDiffDialog, setShowDiffDialog] = useState(false);

  // Mock data - replace with tRPC query
  const { data: versionHistory = versions, isLoading } = useMockVersions(sopId);

  const toggleVersionExpanded = (versionId: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  const handleVersionSelect = (version: SOPVersion, checked: boolean) => {
    if (checked) {
      if (selectedVersions.length < 2) {
        setSelectedVersions(prev => [...prev, version]);
      }
    } else {
      setSelectedVersions(prev => prev.filter(v => v.id !== version.id));
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      onCompare?.(selectedVersions[0], selectedVersions[1]);
      setShowDiffDialog(true);
    }
  };

  const handleRestore = (version: SOPVersion) => {
    onRestore?.(version);
    setSelectedVersions([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-200 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (versionHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No version history</h3>
            <p className="text-sm text-muted-foreground">
              Changes to this SOP will be tracked here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Version History
              </CardTitle>
              <CardDescription className="mt-1">
                {versionHistory.length} version{versionHistory.length !== 1 ? 's' : ''} available
              </CardDescription>
            </div>
            {selectedVersions.length === 2 && (
              <Button onClick={handleCompare} variant="outline" className="gap-2">
                <GitCompare className="h-4 w-4" />
                Compare Selected
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            {/* Version entries */}
            <div className="space-y-6">
              {versionHistory.map((version, index) => (
                <VersionEntry
                  key={version.id}
                  version={version}
                  isLatest={index === 0}
                  isExpanded={expandedVersions.has(version.id)}
                  isSelected={selectedVersions.some(v => v.id === version.id)}
                  onToggleExpand={() => toggleVersionExpanded(version.id)}
                  onSelect={(checked) => handleVersionSelect(version, checked)}
                  onRestore={() => handleRestore(version)}
                  canSelect={selectedVersions.length < 2 || selectedVersions.some(v => v.id === version.id)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diff Dialog */}
      {showDiffDialog && selectedVersions.length === 2 && (
        <Dialog open={showDiffDialog} onOpenChange={setShowDiffDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Version Comparison</DialogTitle>
              <DialogDescription>
                Comparing version {selectedVersions[0].version} and version {selectedVersions[1].version}
              </DialogDescription>
            </DialogHeader>
            <VersionDiff versionA={selectedVersions[0]} versionB={selectedVersions[1]} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

interface VersionEntryProps {
  version: SOPVersion;
  isLatest: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: (checked: boolean) => void;
  onRestore: () => void;
  canSelect: boolean;
}

const VersionEntry: React.FC<VersionEntryProps> = ({
  version,
  isLatest,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  onRestore,
  canSelect
}) => {
  const formattedDate = new Date(version.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="relative pl-14">
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-[1.3rem] top-2 w-3 h-3 rounded-full border-2 border-background',
          isLatest
            ? 'bg-green-500 shadow-lg shadow-green-500/50'
            : 'bg-slate-400'
        )}
      />

      {/* Checkbox for comparison */}
      <div className="absolute left-0 top-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          disabled={!canSelect}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
        />
      </div>

      <Card className={cn(
        'transition-all',
        isSelected && 'ring-2 ring-primary'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={isLatest ? 'success' : 'secondary'}>
                  v{version.version}
                </Badge>
                {isLatest && (
                  <Badge variant="default">Current</Badge>
                )}
              </div>
              <CardTitle className="text-base line-clamp-1">
                {version.title}
              </CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {version.description}
              </CardDescription>
            </div>

            <div className="flex gap-1">
              {!isLatest && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon-sm" title="Restore this version">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Restore Version {version.version}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will create a new version based on version {version.version}.
                        The current version will be preserved in history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onRestore}>
                        Restore Version
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onToggleExpand}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-3 pt-0 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{version.changedByName || version.changedBy}</span>
              </div>
            </div>

            {version.changes && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Changes Made</Label>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  {version.changes}
                </div>
              </div>
            )}

            {version.snapshot && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Version Details</Label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {version.snapshot.status && (
                    <div>
                      <span className="text-muted-foreground">Status:</span>{' '}
                      <Badge variant="outline" className="ml-1">
                        {version.snapshot.status}
                      </Badge>
                    </div>
                  )}
                  {version.snapshot.priority && (
                    <div>
                      <span className="text-muted-foreground">Priority:</span>{' '}
                      <Badge variant="outline" className="ml-1">
                        {version.snapshot.priority}
                      </Badge>
                    </div>
                  )}
                  {version.snapshot.steps && (
                    <div>
                      <span className="text-muted-foreground">Steps:</span>{' '}
                      <span className="ml-1">{version.snapshot.steps.length}</span>
                    </div>
                  )}
                  {version.snapshot.automationLevel && (
                    <div>
                      <span className="text-muted-foreground">Automation:</span>{' '}
                      <Badge variant="outline" className="ml-1">
                        {version.snapshot.automationLevel}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

interface VersionDiffProps {
  versionA: SOPVersion;
  versionB: SOPVersion;
}

const VersionDiff: React.FC<VersionDiffProps> = ({ versionA, versionB }) => {
  const [older, newer] = versionA.version < versionB.version
    ? [versionA, versionB]
    : [versionB, versionA];

  const getDiff = (field: string, oldVal: any, newVal: any) => {
    if (oldVal === newVal) return null;
    return { field, old: oldVal, new: newVal };
  };

  const diffs = [
    getDiff('Title', older.snapshot.title, newer.snapshot.title),
    getDiff('Description', older.snapshot.description, newer.snapshot.description),
    getDiff('Status', older.snapshot.status, newer.snapshot.status),
    getDiff('Priority', older.snapshot.priority, newer.snapshot.priority),
    getDiff('Category', older.snapshot.category, newer.snapshot.category),
    getDiff('Automation Level', older.snapshot.automationLevel, newer.snapshot.automationLevel),
    getDiff('AI Enabled', older.snapshot.aiEnabled, newer.snapshot.aiEnabled),
    getDiff('Steps Count', older.snapshot.steps?.length, newer.snapshot.steps?.length)
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 pb-4 border-b">
        <div>
          <Badge variant="secondary">v{older.version}</Badge>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(older.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <Badge variant="success">v{newer.version}</Badge>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(newer.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {diffs.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No differences found between these versions
        </div>
      ) : (
        <div className="space-y-3">
          {diffs.map((diff, index) => (
            <div key={index} className="grid grid-cols-2 gap-4 p-3 rounded-lg border">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  {diff!.field}
                </div>
                <div className="text-sm bg-red-50 text-red-900 p-2 rounded border border-red-200">
                  {diff!.old !== undefined ? String(diff!.old) : '(not set)'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  {diff!.field}
                </div>
                <div className="text-sm bg-green-50 text-green-900 p-2 rounded border border-green-200">
                  {diff!.new !== undefined ? String(diff!.new) : '(not set)'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Change Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Changes by: {newer.changedByName || newer.changedBy}</p>
            <p className="text-muted-foreground">Date: {new Date(newer.createdAt).toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            {newer.changes && (
              <div className="p-2 rounded bg-muted/50">
                {newer.changes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Label: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('text-sm font-medium', className)}>{children}</div>
);

// Mock hook - replace with actual tRPC query
function useMockVersions(sopId: string) {
  // This would be replaced with:
  // const { data, isLoading } = trpc.sop.versions.useQuery({ sopId });
  return {
    data: [] as SOPVersion[],
    isLoading: false
  };
}
