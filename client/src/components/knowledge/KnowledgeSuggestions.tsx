/**
 * Knowledge Suggestions Component
 *
 * Lists pending AI-generated suggestions for new knowledge entries.
 * Shows confidence scores, reasoning, and comparison with similar entries.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Check,
  X,
  Eye,
  TrendingUp,
  AlertCircle,
  Loader2,
  Brain,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SuggestedEntry {
  id: number;
  category: string;
  title: string;
  content: string;
  context?: string;
  examples: string[];
  confidence: number;
  reasoning: string;
  source: string;
  suggestedAt: Date;
  similarEntries?: {
    id: number;
    title: string;
    similarity: number;
  }[];
  metrics?: {
    potentialUsage: number;
    impactScore: number;
  };
}

interface KnowledgeSuggestionsProps {
  onApprove?: (suggestionId: number) => void;
  onReject?: (suggestionId: number) => void;
}

// Mock suggestions data
const generateMockSuggestions = (): SuggestedEntry[] => {
  return [
    {
      id: 1,
      category: 'workflow',
      title: 'Lead Follow-up Automation',
      content: 'Automatically send follow-up emails to leads who haven\'t responded within 48 hours. Include personalized content based on their initial inquiry.',
      context: 'When a lead is created but no response is received',
      examples: [
        'Send personalized email after 48 hours',
        'Include original inquiry context',
        'Add relevant case studies',
      ],
      confidence: 0.85,
      reasoning: 'Detected pattern in 15 successful manual follow-ups. High engagement rate (73%) suggests this should be automated.',
      source: 'Pattern analysis from successful campaigns',
      suggestedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      similarEntries: [
        { id: 12, title: 'Email Campaign Workflow', similarity: 0.67 },
        { id: 34, title: 'Lead Nurturing Process', similarity: 0.52 },
      ],
      metrics: {
        potentialUsage: 45,
        impactScore: 8.5,
      },
    },
    {
      id: 2,
      category: 'brand_voice',
      title: 'Casual Friday Communication Style',
      content: 'Use a more relaxed, conversational tone in Friday communications. Include light humor and emoji usage is acceptable.',
      context: 'For emails and messages sent on Fridays',
      examples: [
        'Hey team! 👋',
        'Hope you\'re having a great Friday!',
        'Let\'s wrap this up before the weekend',
      ],
      confidence: 0.72,
      reasoning: 'Analysis of successful Friday communications shows 40% higher engagement with casual tone.',
      source: 'Feedback analysis from client communications',
      suggestedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      similarEntries: [
        { id: 45, title: 'Professional Communication Guidelines', similarity: 0.45 },
      ],
      metrics: {
        potentialUsage: 20,
        impactScore: 6.8,
      },
    },
    {
      id: 3,
      category: 'technical',
      title: 'CRM Field Validation Rules',
      content: 'Email addresses must be validated before saving. Phone numbers should be formatted as (XXX) XXX-XXXX.',
      context: 'When creating or updating contact records',
      examples: [
        'Validate email format using regex',
        'Auto-format phone numbers',
        'Show validation errors inline',
      ],
      confidence: 0.91,
      reasoning: 'Prevents 95% of data entry errors based on historical analysis.',
      source: 'Error pattern analysis',
      suggestedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      similarEntries: [],
      metrics: {
        potentialUsage: 120,
        impactScore: 9.2,
      },
    },
  ];
};

export function KnowledgeSuggestions({ onApprove, onReject }: KnowledgeSuggestionsProps) {
  const [suggestions] = useState<SuggestedEntry[]>(generateMockSuggestions());
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedEntry | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredSuggestions = useMemo(() => {
    if (filterStatus === 'all') return suggestions;

    return suggestions.filter(s => {
      if (filterStatus === 'high') return s.confidence >= 0.8;
      if (filterStatus === 'medium') return s.confidence >= 0.6 && s.confidence < 0.8;
      if (filterStatus === 'low') return s.confidence < 0.6;
      return true;
    });
  }, [suggestions, filterStatus]);

  const handleApprove = async (suggestionId: number) => {
    setProcessingId(suggestionId);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      onApprove?.(suggestionId);
      toast.success('Suggestion approved and added to knowledge base');
    } catch (error) {
      toast.error('Failed to approve suggestion');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (suggestionId: number) => {
    setProcessingId(suggestionId);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      onReject?.(suggestionId);
      toast.success('Suggestion rejected');
    } catch (error) {
      toast.error('Failed to reject suggestion');
    } finally {
      setProcessingId(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge className="bg-green-500">High Confidence</Badge>;
    if (confidence >= 0.6) return <Badge className="bg-yellow-500">Medium Confidence</Badge>;
    return <Badge className="bg-red-500">Low Confidence</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">AI Suggestions</h3>
          <p className="text-sm text-muted-foreground">
            Review and approve AI-generated knowledge entries
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          {suggestions.length} pending
        </Badge>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            All ({suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="high">
            High Confidence ({suggestions.filter(s => s.confidence >= 0.8).length})
          </TabsTrigger>
          <TabsTrigger value="medium">
            Medium ({suggestions.filter(s => s.confidence >= 0.6 && s.confidence < 0.8).length})
          </TabsTrigger>
          <TabsTrigger value="low">
            Low ({suggestions.filter(s => s.confidence < 0.6).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Suggestions List */}
      {filteredSuggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No suggestions available</p>
            <p className="text-sm">Check back later for AI-generated recommendations</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {filteredSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                        <Brain className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{suggestion.title}</CardTitle>
                          {getConfidenceBadge(suggestion.confidence)}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {suggestion.content}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                      <div className="flex items-center gap-2">
                        <Progress value={suggestion.confidence * 100} className="flex-1" />
                        <span className={cn('text-sm font-medium', getConfidenceColor(suggestion.confidence))}>
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Potential Usage</div>
                      <div className="flex items-center gap-1 font-medium">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        {suggestion.metrics?.potentialUsage || 0}/month
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Impact Score</div>
                      <div className="flex items-center gap-1 font-medium">
                        <span className="text-green-500">
                          {suggestion.metrics?.impactScore || 0}/10
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">AI Reasoning</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {suggestion.reasoning}
                    </p>
                  </div>

                  {/* Similar Entries */}
                  {suggestion.similarEntries && suggestion.similarEntries.length > 0 && (
                    <Accordion type="single" collapsible className="mb-4">
                      <AccordionItem value="similar" className="border-0">
                        <AccordionTrigger className="text-sm py-2">
                          Similar Entries ({suggestion.similarEntries.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {suggestion.similarEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between p-2 bg-muted rounded"
                              >
                                <span className="text-sm">{entry.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(entry.similarity * 100)}% similar
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSuggestion(suggestion);
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(suggestion.id)}
                      disabled={processingId === suggestion.id}
                    >
                      {processingId === suggestion.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(suggestion.id)}
                      disabled={processingId === suggestion.id}
                    >
                      {processingId === suggestion.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Preview Dialog */}
      {selectedSuggestion && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Preview: {selectedSuggestion.title}
              </DialogTitle>
              <DialogDescription>
                Review how this entry will appear in the knowledge base
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {/* Category */}
                <div>
                  <Label>Category</Label>
                  <Badge variant="outline" className="mt-1">
                    {selectedSuggestion.category}
                  </Badge>
                </div>

                {/* Content */}
                <div>
                  <Label>Content</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedSuggestion.content}
                  </p>
                </div>

                {/* Context */}
                {selectedSuggestion.context && (
                  <div>
                    <Label>Context</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedSuggestion.context}
                    </p>
                  </div>
                )}

                {/* Examples */}
                {selectedSuggestion.examples.length > 0 && (
                  <div>
                    <Label>Examples</Label>
                    <div className="mt-2 space-y-2">
                      {selectedSuggestion.examples.map((example, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span>{example}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Metadata */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div>Source: {selectedSuggestion.source}</div>
                  <div>Suggested: {format(selectedSuggestion.suggestedAt, 'PPpp')}</div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Label component (if not already defined)
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('text-sm font-medium', className)}>
      {children}
    </div>
  );
}
