/**
 * Knowledge Feedback Component
 *
 * Manages feedback submission and resolution for knowledge entries.
 * Displays feedback items, suggested corrections, and resolution workflow.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Send,
  Loader2,
  Star,
  Edit,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

type FeedbackType = 'success' | 'partial' | 'failure' | 'suggestion';
type FeedbackStatus = 'pending' | 'acknowledged' | 'resolved' | 'rejected';

interface FeedbackItem {
  id: number;
  entryId: number;
  entryTitle: string;
  userId: number;
  userName: string;
  rating: number;
  feedbackType: FeedbackType;
  comment: string;
  corrections?: string;
  status: FeedbackStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
}

interface KnowledgeFeedbackProps {
  entryId?: number;
  entryTitle?: string;
  showSubmitForm?: boolean;
  onFeedbackSubmitted?: () => void;
}

// Mock feedback data
const generateMockFeedback = (): FeedbackItem[] => {
  return [
    {
      id: 1,
      entryId: 12,
      entryTitle: 'Email Campaign Workflow',
      userId: 101,
      userName: 'John Doe',
      rating: 4,
      feedbackType: 'partial',
      comment: 'The workflow works well but could include more detailed steps for A/B testing.',
      corrections: 'Add steps: 1. Create variant A, 2. Create variant B, 3. Split audience 50/50',
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: 2,
      entryId: 12,
      entryTitle: 'Email Campaign Workflow',
      userId: 102,
      userName: 'Jane Smith',
      rating: 5,
      feedbackType: 'success',
      comment: 'Perfect! This saved me hours of work.',
      status: 'acknowledged',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      id: 3,
      entryId: 34,
      entryTitle: 'Lead Nurturing Process',
      userId: 103,
      userName: 'Bob Johnson',
      rating: 2,
      feedbackType: 'failure',
      comment: 'The timing recommendations don\'t work for our industry. B2B needs longer cycles.',
      corrections: 'Increase wait times: 48h → 5 days, 1 week → 2 weeks',
      status: 'resolved',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      resolvedBy: 'Admin',
      resolutionNote: 'Updated timing recommendations based on feedback',
    },
    {
      id: 4,
      entryId: 45,
      entryTitle: 'Brand Voice Guidelines',
      userId: 104,
      userName: 'Sarah Wilson',
      rating: 3,
      feedbackType: 'suggestion',
      comment: 'Consider adding industry-specific tone variations.',
      status: 'pending',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ];
};

export function KnowledgeFeedback({
  entryId,
  entryTitle,
  showSubmitForm = true,
  onFeedbackSubmitted,
}: KnowledgeFeedbackProps) {
  const [feedback] = useState<FeedbackItem[]>(generateMockFeedback());
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState({
    rating: 3,
    feedbackType: 'suggestion' as FeedbackType,
    comment: '',
    corrections: '',
  });

  const [resolutionNote, setResolutionNote] = useState('');

  const submitMutation = trpc.knowledge.submitFeedback.useMutation({
    onSuccess: () => {
      toast.success('Feedback submitted successfully');
      setSubmitDialogOpen(false);
      resetForm();
      onFeedbackSubmitted?.();
    },
    onError: (error) => {
      toast.error(`Failed to submit feedback: ${error.message}`);
    },
  });

  const filteredFeedback = useMemo(() => {
    let items = feedback;

    if (entryId) {
      items = items.filter(f => f.entryId === entryId);
    }

    if (filterStatus !== 'all') {
      items = items.filter(f => f.status === filterStatus);
    }

    return items;
  }, [feedback, entryId, filterStatus]);

  const resetForm = () => {
    setFormData({
      rating: 3,
      feedbackType: 'suggestion',
      comment: '',
      corrections: '',
    });
  };

  const handleSubmit = () => {
    if (!formData.comment) {
      toast.error('Please provide a comment');
      return;
    }

    submitMutation.mutate({
      executionId: entryId || 1,
      userId: 1, // Should come from auth context
      rating: formData.rating,
      feedbackType: formData.feedbackType,
      comment: formData.comment,
      taskType: 'knowledge_entry',
      corrections: formData.corrections || undefined,
    });
  };

  const handleResolve = async () => {
    if (!selectedFeedback) return;

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast.success('Feedback resolved');
    setResolveDialogOpen(false);
    setSelectedFeedback(null);
    setResolutionNote('');
  };

  const getFeedbackTypeIcon = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'failure':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      case 'suggestion':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50">Pending</Badge>;
      case 'acknowledged':
        return <Badge variant="outline" className="bg-blue-50">Acknowledged</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-50">Resolved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50">Rejected</Badge>;
    }
  };

  const stats = useMemo(() => ({
    total: filteredFeedback.length,
    pending: filteredFeedback.filter(f => f.status === 'pending').length,
    resolved: filteredFeedback.filter(f => f.status === 'resolved').length,
    avgRating: filteredFeedback.length > 0
      ? filteredFeedback.reduce((acc, f) => acc + f.rating, 0) / filteredFeedback.length
      : 0,
  }), [filteredFeedback]);

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Feedback</h3>
          <p className="text-sm text-muted-foreground">
            {entryTitle ? `For: ${entryTitle}` : 'All knowledge entries'}
          </p>
        </div>
        {showSubmitForm && (
          <Button onClick={() => setSubmitDialogOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Feedback</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
            </div>
            <p className="text-xs text-muted-foreground">Average Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Label>Filter by status:</Label>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No feedback available</p>
            <p className="text-sm">Be the first to provide feedback</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {filteredFeedback.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getFeedbackTypeIcon(item.feedbackType)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{item.entryTitle}</CardTitle>
                          {getStatusBadge(item.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.userName}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {item.rating}/5
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Comment */}
                  <div className="mb-3">
                    <p className="text-sm">{item.comment}</p>
                  </div>

                  {/* Corrections */}
                  {item.corrections && (
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Edit className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Suggested Corrections</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.corrections}</p>
                    </div>
                  )}

                  {/* Resolution Info */}
                  {item.status === 'resolved' && item.resolvedAt && (
                    <div className="mb-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Resolved</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>By: {item.resolvedBy}</div>
                        <div>On: {format(item.resolvedAt, 'PPpp')}</div>
                        {item.resolutionNote && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            {item.resolutionNote}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {item.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFeedback(item);
                          setResolveDialogOpen(true);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast.info('Feedback acknowledged')}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Acknowledge
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Submit Feedback Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
            <DialogDescription>
              Help us improve the knowledge base with your feedback
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Rating */}
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating })}
                    className="transition-colors"
                  >
                    <Star
                      className={cn(
                        'h-6 w-6',
                        rating <= formData.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.feedbackType}
                onValueChange={(v) => setFormData({ ...formData, feedbackType: v as FeedbackType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="partial">Partial Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label>Comment *</Label>
              <Textarea
                placeholder="Describe your experience or suggestion..."
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={4}
              />
            </div>

            {/* Corrections */}
            <div className="space-y-2">
              <Label>Suggested Corrections (optional)</Label>
              <Textarea
                placeholder="What would you change or improve?"
                value={formData.corrections}
                onChange={(e) => setFormData({ ...formData, corrections: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Feedback Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Feedback</DialogTitle>
            <DialogDescription>
              Mark this feedback as resolved and add a resolution note
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedFeedback && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Feedback:</p>
                <p className="text-sm text-muted-foreground">{selectedFeedback.comment}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Resolution Note</Label>
              <Textarea
                placeholder="Describe how this feedback was addressed..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
