/**
 * Pattern List Component
 *
 * Displays and manages action patterns for agent automation.
 * Shows pattern details, success metrics, and allows editing.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

export function PatternList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  const { data: patternsData, isLoading, refetch } = trpc.knowledge.listPatterns.useQuery();
  const deletePattern = trpc.knowledge.deletePattern.useMutation({
    onSuccess: () => {
      toast.success('Pattern deleted');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const patterns = patternsData?.patterns || [];
  const filteredPatterns = patterns.filter(
    (p) =>
      p.taskType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.taskName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patterns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Pattern
        </Button>
      </div>

      {/* Pattern Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatterns.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchQuery ? (
                <p>No patterns matching "{searchQuery}"</p>
              ) : (
                <p>No patterns defined yet. Create one to get started.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPatterns.map((pattern) => {
            const total = pattern.successCount + pattern.failureCount;
            const successRate = total > 0 ? (pattern.successCount / total) * 100 : 0;

            return (
              <Card
                key={pattern.taskType}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedPattern(pattern.taskType)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{pattern.taskName}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {pattern.taskType}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Play className="h-4 w-4 mr-2" />
                          Test Pattern
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this pattern?')) {
                              deletePattern.mutate({ taskType: pattern.taskType });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Success Rate */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Success Rate</span>
                        <span className="font-medium">{successRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={successRate} className="h-2" />
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        {pattern.successCount}
                      </div>
                      <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-3 w-3" />
                        {pattern.failureCount}
                      </div>
                      <Badge variant="outline" className="ml-auto">
                        {pattern.steps.length} steps
                      </Badge>
                    </div>

                    {/* Last Executed */}
                    {pattern.lastExecuted && (
                      <p className="text-xs text-muted-foreground">
                        Last run:{' '}
                        {new Date(pattern.lastExecuted).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pattern Detail Dialog */}
      <PatternDetailDialog
        taskType={selectedPattern}
        open={!!selectedPattern}
        onOpenChange={(open) => !open && setSelectedPattern(null)}
      />
    </div>
  );
}

// Pattern Detail Dialog
function PatternDetailDialog({
  taskType,
  open,
  onOpenChange,
}: {
  taskType: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: patternData } = trpc.knowledge.getPattern.useQuery(
    { taskType: taskType || '' },
    { enabled: !!taskType }
  );

  const pattern = patternData?.pattern;

  if (!pattern) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pattern.taskName}</DialogTitle>
          <DialogDescription className="font-mono">{pattern.taskType}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Page URL */}
          <div>
            <label className="text-sm font-medium">Target Page</label>
            <p className="text-sm text-muted-foreground font-mono">{pattern.pageUrl}</p>
          </div>

          {/* Steps */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Steps ({pattern.steps.length})
            </label>
            <ScrollArea className="h-[300px] border rounded-md p-4">
              <ol className="space-y-3">
                {pattern.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                      {step.order}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {step.action}
                        </Badge>
                        {step.selector && (
                          <code className="text-xs bg-muted px-1 rounded">
                            {step.selector}
                          </code>
                        )}
                      </div>
                      {step.instruction && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {step.instruction}
                        </p>
                      )}
                      {step.value && (
                        <p className="text-sm">
                          Value: <code className="bg-muted px-1 rounded">{step.value}</code>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button>
              <Play className="h-4 w-4 mr-2" />
              Test Pattern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
