/**
 * Knowledge History Component
 *
 * Displays edit history for knowledge entries with diff viewer and revert functionality.
 * Shows who made changes, when, and why.
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  User,
  RotateCcw,
  FileText,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface HistoryEntry {
  id: number;
  version: number;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  editedBy: string;
  editedAt: Date;
  editReason?: string;
  source: 'manual' | 'ai_suggestion' | 'feedback' | 'automated';
}

interface KnowledgeHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: number;
  entryTitle: string;
  onRevert?: (versionId: number) => void;
}

// Mock history data generator
const generateMockHistory = (entryId: number): HistoryEntry[] => {
  return [
    {
      id: 1,
      version: 3,
      changes: [
        {
          field: 'content',
          oldValue: 'Original workflow description for email campaigns',
          newValue: 'Updated workflow description for email campaigns with enhanced personalization',
        },
        {
          field: 'confidence',
          oldValue: '0.7',
          newValue: '0.85',
        },
      ],
      editedBy: 'John Doe',
      editedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      editReason: 'Improved accuracy based on recent successful executions',
      source: 'manual',
    },
    {
      id: 2,
      version: 2,
      changes: [
        {
          field: 'examples',
          oldValue: '["Send welcome email", "Schedule follow-up"]',
          newValue: '["Send welcome email", "Schedule follow-up", "Track engagement"]',
        },
      ],
      editedBy: 'AI Assistant',
      editedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      editReason: 'Added example based on user feedback',
      source: 'ai_suggestion',
    },
    {
      id: 3,
      version: 1,
      changes: [
        {
          field: 'title',
          oldValue: '',
          newValue: 'Email Campaign Workflow',
        },
        {
          field: 'content',
          oldValue: '',
          newValue: 'Original workflow description for email campaigns',
        },
      ],
      editedBy: 'Jane Smith',
      editedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      editReason: 'Initial creation',
      source: 'manual',
    },
  ];
};

export function KnowledgeHistory({
  open,
  onOpenChange,
  entryId,
  entryTitle,
  onRevert,
}: KnowledgeHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  const history = useMemo(() => generateMockHistory(entryId), [entryId]);

  const handleRevert = async (versionId: number) => {
    setIsReverting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      onRevert?.(versionId);
      toast.success('Successfully reverted to previous version');
      setRevertDialogOpen(false);
      setSelectedVersion(null);
    } catch (error) {
      toast.error('Failed to revert changes');
    } finally {
      setIsReverting(false);
    }
  };

  const getSourceBadge = (source: HistoryEntry['source']) => {
    switch (source) {
      case 'manual':
        return <Badge variant="default">Manual</Badge>;
      case 'ai_suggestion':
        return <Badge variant="secondary">AI Suggested</Badge>;
      case 'feedback':
        return <Badge variant="outline">From Feedback</Badge>;
      case 'automated':
        return <Badge className="bg-purple-500">Automated</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Edit History: {entryTitle}
            </DialogTitle>
            <DialogDescription>
              View all changes made to this knowledge entry and revert if needed
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={entry.id}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">Version {entry.version}</h4>
                              {index === 0 && (
                                <Badge variant="default">Current</Badge>
                              )}
                              {getSourceBadge(entry.source)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {entry.editedBy}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(entry.editedAt, { addSuffix: true })}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(entry.editedAt, 'PPpp')}
                            </p>
                          </div>
                        </div>

                        {index !== 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVersion(entry.version);
                              setRevertDialogOpen(true);
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Revert
                          </Button>
                        )}
                      </div>

                      {/* Edit Reason */}
                      {entry.editReason && (
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">Reason: </span>
                            {entry.editReason}
                          </p>
                        </div>
                      )}

                      {/* Changes */}
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium">Changes</h5>
                        {entry.changes.map((change, changeIndex) => (
                          <div key={changeIndex} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {change.field}
                              </Badge>
                            </div>

                            {/* Diff View */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {/* Old Value */}
                              <div className="border rounded-lg overflow-hidden">
                                <div className="bg-red-50 dark:bg-red-950 px-3 py-1 border-b">
                                  <span className="text-xs font-medium text-red-900 dark:text-red-100">
                                    Before
                                  </span>
                                </div>
                                <div className="p-3">
                                  <DiffText
                                    text={change.oldValue}
                                    highlight="remove"
                                  />
                                </div>
                              </div>

                              {/* New Value */}
                              <div className="border rounded-lg overflow-hidden">
                                <div className="bg-green-50 dark:bg-green-950 px-3 py-1 border-b">
                                  <span className="text-xs font-medium text-green-900 dark:text-green-100">
                                    After
                                  </span>
                                </div>
                                <div className="p-3">
                                  <DiffText
                                    text={change.newValue}
                                    highlight="add"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline Connector */}
                  {index < history.length - 1 && (
                    <div className="flex items-center justify-center py-2">
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-px bg-border" />
                        <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                        <div className="h-6 w-px bg-border" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Dialog */}
      <AlertDialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Revert to Previous Version?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the knowledge entry to version {selectedVersion}. The current
              version will be saved in history and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedVersion && handleRevert(selectedVersion)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isReverting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reverting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Revert
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Diff Text Component
interface DiffTextProps {
  text: string;
  highlight: 'add' | 'remove';
}

function DiffText({ text, highlight }: DiffTextProps) {
  const bgClass = highlight === 'add'
    ? 'bg-green-100 dark:bg-green-900/30'
    : 'bg-red-100 dark:bg-red-900/30';

  // Simple word-level diff highlighting
  // In production, you'd use a proper diff library
  const words = text.split(' ');

  return (
    <div className="whitespace-pre-wrap break-words">
      {words.map((word, index) => (
        <span
          key={index}
          className={cn(
            'transition-colors',
            index % 3 === 0 && bgClass // Simple mock highlighting
          )}
        >
          {word}{' '}
        </span>
      ))}
    </div>
  );
}
