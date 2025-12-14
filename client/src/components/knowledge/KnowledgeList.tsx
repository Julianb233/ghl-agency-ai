/**
 * Knowledge List Component
 *
 * Displays all knowledge entries in categorized tabs with search and filter functionality.
 * Provides quick edit/delete actions and shows usage statistics.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { trpc } from '@/lib/trpc';
import {
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Workflow,
  MessageSquare,
  Settings,
  FileCode,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type KnowledgeCategory = 'workflow' | 'brand_voice' | 'preference' | 'process' | 'technical';

interface KnowledgeEntry {
  id: number;
  category: KnowledgeCategory;
  title: string;
  content: string;
  context?: string;
  examples?: string[];
  confidence: number;
  usageCount: number;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;
}

interface KnowledgeListProps {
  onEdit?: (entry: KnowledgeEntry) => void;
  onView?: (entry: KnowledgeEntry) => void;
}

const categoryConfig = {
  workflow: {
    label: 'Workflows',
    icon: Workflow,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  brand_voice: {
    label: 'Brand Voice',
    icon: MessageSquare,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
  preference: {
    label: 'Preferences',
    icon: Settings,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  process: {
    label: 'Processes',
    icon: FileCode,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
  },
  technical: {
    label: 'Technical',
    icon: Wrench,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950',
  },
};

export function KnowledgeList({ onEdit, onView }: KnowledgeListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategory>('workflow');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<KnowledgeEntry | null>(null);

  // Fetch knowledge entries (using patterns as a proxy for now)
  const { data: patternsData, isLoading, refetch } = trpc.knowledge.listPatterns.useQuery();
  const deleteMutation = trpc.knowledge.deletePattern.useMutation({
    onSuccess: () => {
      toast.success('Knowledge entry deleted');
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Transform patterns to knowledge entries (mock data structure)
  const knowledgeEntries: KnowledgeEntry[] = useMemo(() => {
    if (!patternsData?.patterns) return [];

    return patternsData.patterns.map((pattern, idx) => ({
      id: idx,
      category: 'workflow' as KnowledgeCategory,
      title: pattern.taskName,
      content: `Action pattern for ${pattern.taskType}`,
      context: pattern.pageUrl,
      examples: pattern.steps.map(s => s.instruction || s.action).filter(Boolean),
      confidence: pattern.successCount && pattern.failureCount
        ? pattern.successCount / (pattern.successCount + pattern.failureCount)
        : 0.5,
      usageCount: (pattern.successCount || 0) + (pattern.failureCount || 0),
      successRate: pattern.successCount && pattern.failureCount
        ? pattern.successCount / (pattern.successCount + pattern.failureCount)
        : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }, [patternsData]);

  const filteredEntries = useMemo(() => {
    return knowledgeEntries.filter((entry) => {
      const matchesCategory = entry.category === selectedCategory;
      const matchesSearch = searchTerm === '' ||
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [knowledgeEntries, selectedCategory, searchTerm]);

  const handleDelete = (entry: KnowledgeEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (entryToDelete) {
      // Use the task type from the patterns data
      const pattern = patternsData?.patterns[entryToDelete.id];
      if (pattern) {
        deleteMutation.mutate({ taskType: pattern.taskType });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as KnowledgeCategory)}>
        <TabsList className="grid w-full grid-cols-5">
          {(Object.keys(categoryConfig) as KnowledgeCategory[]).map((category) => {
            const config = categoryConfig[category];
            const Icon = config.icon;
            const count = knowledgeEntries.filter(e => e.category === category).length;

            return (
              <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {config.label}
                <Badge variant="secondary" className="ml-auto">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(categoryConfig) as KnowledgeCategory[]).map((category) => {
          const CategoryIcon = categoryConfig[category].icon;
          return (
          <TabsContent key={category} value={category} className="mt-4">
            {filteredEntries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CategoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No {categoryConfig[category].label.toLowerCase()} entries found</p>
                  {searchTerm && (
                    <p className="text-sm">Try adjusting your search terms</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredEntries.map((entry) => (
                    <KnowledgeEntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={() => onEdit?.(entry)}
                      onView={() => onView?.(entry)}
                      onDelete={() => handleDelete(entry)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
          );
        })}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{entryToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Knowledge Entry Card Component
interface KnowledgeEntryCardProps {
  entry: KnowledgeEntry;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
}

function KnowledgeEntryCard({ entry, onEdit, onView, onDelete }: KnowledgeEntryCardProps) {
  const config = categoryConfig[entry.category];
  const Icon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('p-2 rounded-lg', config.bgColor)}>
              <Icon className={cn('h-5 w-5', config.color)} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{entry.title}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {entry.content}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {/* Confidence Score */}
          <div>
            <div className="text-muted-foreground text-xs mb-1">Confidence</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all',
                    entry.confidence >= 0.7 ? 'bg-green-500' :
                    entry.confidence >= 0.4 ? 'bg-yellow-500' :
                    'bg-red-500'
                  )}
                  style={{ width: `${entry.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium">
                {Math.round(entry.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* Usage Count */}
          <div>
            <div className="text-muted-foreground text-xs mb-1">Usage</div>
            <div className="flex items-center gap-1 font-medium">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              {entry.usageCount} times
            </div>
          </div>

          {/* Success Rate */}
          <div>
            <div className="text-muted-foreground text-xs mb-1">Success Rate</div>
            <div className="flex items-center gap-1 font-medium">
              {entry.successRate >= 0.7 ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              )}
              {Math.round(entry.successRate * 100)}%
            </div>
          </div>
        </div>

        {/* Context */}
        {entry.context && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-muted-foreground text-xs mb-1">Context</div>
            <p className="text-xs truncate">{entry.context}</p>
          </div>
        )}

        {/* Examples Preview */}
        {entry.examples && entry.examples.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-muted-foreground text-xs mb-1">Examples</div>
            <div className="flex flex-wrap gap-1">
              {entry.examples.slice(0, 3).map((example, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {example}
                </Badge>
              ))}
              {entry.examples.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{entry.examples.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
