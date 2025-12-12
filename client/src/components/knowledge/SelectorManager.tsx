/**
 * Selector Manager Component
 *
 * Manages element selectors for browser automation.
 * Shows selector performance and provides fallback management.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { trpc } from '@/lib/trpc';
import {
  Search,
  Plus,
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Code,
  Copy,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

export function SelectorManager() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: selectorsData, isLoading, refetch } = trpc.knowledge.listAllSelectors.useQuery();
  const selectors = selectorsData?.selectors || [];

  // Group selectors by page
  const groupedSelectors = selectors.reduce((acc: Record<string, typeof selectors>, selector) => {
    const page = selector.pagePath || 'unknown';
    if (!acc[page]) {
      acc[page] = [];
    }
    acc[page].push(selector);
    return acc;
  }, {});

  const filteredPages = Object.keys(groupedSelectors).filter(
    (page) =>
      page.toLowerCase().includes(searchQuery.toLowerCase()) ||
      groupedSelectors[page].some((s) =>
        s.elementName.toLowerCase().includes(searchQuery.toLowerCase())
      )
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search selectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Selector
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Element Selector</DialogTitle>
              <DialogDescription>
                Define a selector with fallbacks for reliable element targeting
              </DialogDescription>
            </DialogHeader>
            <SelectorForm
              onSuccess={() => {
                setIsCreateOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Selectors by Page */}
      {filteredPages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No selectors configured</p>
            <p className="text-sm">Add selectors to improve automation reliability</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filteredPages.map((page) => {
            const pageSelectors = groupedSelectors[page];
            const avgSuccessRate =
              pageSelectors.reduce((sum, s) => sum + s.successRate, 0) / pageSelectors.length;

            return (
              <AccordionItem key={page} value={page} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-4 flex-1">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{page}</span>
                    <Badge variant="outline" className="ml-auto mr-2">
                      {pageSelectors.length} selector{pageSelectors.length !== 1 ? 's' : ''}
                    </Badge>
                    <SuccessRateBadge rate={avgSuccessRate} />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {pageSelectors.map((selector) => (
                      <SelectorCard
                        key={`${selector.pagePath}:${selector.elementName}`}
                        selector={selector}
                        onRefetch={refetch}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

// Success Rate Badge
function SuccessRateBadge({ rate }: { rate: number }) {
  const percentage = rate * 100;
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let color = 'text-muted-foreground';

  if (percentage >= 90) {
    color = 'text-green-600 bg-green-50';
  } else if (percentage >= 70) {
    color = 'text-yellow-600 bg-yellow-50';
  } else if (percentage < 70) {
    color = 'text-red-600 bg-red-50';
  }

  return (
    <Badge variant={variant} className={color}>
      {percentage.toFixed(0)}%
    </Badge>
  );
}

// Individual Selector Card
function SelectorCard({
  selector,
  onRefetch,
}: {
  selector: any;
  onRefetch: () => void;
}) {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">{selector.elementName}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {selector.totalAttempts} attempts
                </span>
              </div>
            </div>
            <SuccessRateBadge rate={selector.successRate} />
          </div>

          {/* Success Rate Bar */}
          <div>
            <Progress value={selector.successRate * 100} className="h-2" />
          </div>

          {/* Primary Selector */}
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Primary Selector
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                {selector.primarySelector}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleCopy(selector.primarySelector)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Fallback Selectors */}
          {selector.fallbackSelectors.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                Fallbacks ({selector.fallbackSelectors.length})
              </Label>
              <div className="space-y-1 mt-1">
                {selector.fallbackSelectors.map((fallback: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                    <code className="flex-1 text-xs bg-muted p-1.5 rounded overflow-x-auto">
                      {fallback}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopy(fallback)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Verified */}
          {selector.lastVerified && (
            <p className="text-xs text-muted-foreground">
              Last verified: {new Date(selector.lastVerified).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Selector Form
function SelectorForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    pagePath: '',
    elementName: '',
    primarySelector: '',
    fallbackSelectors: [] as string[],
  });
  const [newFallback, setNewFallback] = useState('');

  const saveMutation = trpc.knowledge.saveSelector.useMutation({
    onSuccess: () => {
      toast.success('Selector saved');
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const addFallback = () => {
    if (newFallback && !formData.fallbackSelectors.includes(newFallback)) {
      setFormData({
        ...formData,
        fallbackSelectors: [...formData.fallbackSelectors, newFallback],
      });
      setNewFallback('');
    }
  };

  const removeFallback = (index: number) => {
    setFormData({
      ...formData,
      fallbackSelectors: formData.fallbackSelectors.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    if (!formData.pagePath || !formData.elementName || !formData.primarySelector) {
      toast.error('Page path, element name, and primary selector are required');
      return;
    }

    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Page Path</Label>
        <Input
          value={formData.pagePath}
          onChange={(e) => setFormData({ ...formData, pagePath: e.target.value })}
          placeholder="/workflows, /contacts, etc."
        />
      </div>

      <div>
        <Label>Element Name</Label>
        <Input
          value={formData.elementName}
          onChange={(e) => setFormData({ ...formData, elementName: e.target.value })}
          placeholder="create_button, name_input, etc."
        />
      </div>

      <div>
        <Label>Primary Selector</Label>
        <Input
          value={formData.primarySelector}
          onChange={(e) => setFormData({ ...formData, primarySelector: e.target.value })}
          placeholder="button[data-testid='create']"
          className="font-mono text-sm"
        />
      </div>

      <div>
        <Label>Fallback Selectors</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={newFallback}
            onChange={(e) => setNewFallback(e.target.value)}
            placeholder="Add fallback selector"
            className="font-mono text-sm"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFallback())}
          />
          <Button type="button" variant="secondary" onClick={addFallback}>
            Add
          </Button>
        </div>
        {formData.fallbackSelectors.length > 0 && (
          <div className="space-y-1 mt-2">
            {formData.fallbackSelectors.map((fb, index) => (
              <div key={index} className="flex items-center gap-2 bg-muted p-2 rounded">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <code className="flex-1 text-xs">{fb}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeFallback(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Selector
        </Button>
      </div>
    </div>
  );
}
