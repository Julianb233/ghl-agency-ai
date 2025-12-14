/**
 * Knowledge Editor Component
 *
 * Modal/dialog for creating and editing knowledge entries.
 * Includes rich text editor, category selector, context fields, and examples management.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import {
  Plus,
  X,
  Loader2,
  Save,
  Sparkles,
  FileText,
  Tag,
  Book,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type KnowledgeCategory = 'workflow' | 'brand_voice' | 'preference' | 'process' | 'technical';

interface KnowledgeEntry {
  id?: number;
  category: KnowledgeCategory;
  title: string;
  content: string;
  context?: string;
  examples?: string[];
  confidence: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

interface KnowledgeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: KnowledgeEntry | null;
  onSave?: (entry: KnowledgeEntry) => void;
}

const categoryOptions: { value: KnowledgeCategory; label: string; description: string }[] = [
  {
    value: 'workflow',
    label: 'Workflow',
    description: 'Automated sequences and task flows',
  },
  {
    value: 'brand_voice',
    label: 'Brand Voice',
    description: 'Tone, style, and communication guidelines',
  },
  {
    value: 'preference',
    label: 'Preference',
    description: 'User or system preferences',
  },
  {
    value: 'process',
    label: 'Process',
    description: 'Business processes and procedures',
  },
  {
    value: 'technical',
    label: 'Technical',
    description: 'Technical knowledge and configurations',
  },
];

export function KnowledgeEditor({ open, onOpenChange, entry, onSave }: KnowledgeEditorProps) {
  const [formData, setFormData] = useState<KnowledgeEntry>({
    category: 'workflow',
    title: '',
    content: '',
    context: '',
    examples: [],
    confidence: 0.7,
    tags: [],
  });

  const [newExample, setNewExample] = useState('');
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  const saveMutation = trpc.knowledge.savePattern.useMutation({
    onSuccess: () => {
      toast.success('Knowledge entry saved successfully');
      onSave?.(formData);
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        ...entry,
        examples: entry.examples || [],
        tags: entry.tags || [],
      });
    } else {
      resetForm();
    }
  }, [entry, open]);

  const resetForm = () => {
    setFormData({
      category: 'workflow',
      title: '',
      content: '',
      context: '',
      examples: [],
      confidence: 0.7,
      tags: [],
    });
    setActiveTab('basic');
  };

  const handleSave = () => {
    if (!formData.title || !formData.content) {
      toast.error('Title and content are required');
      return;
    }

    // Convert to pattern format for the API
    const pattern = {
      taskType: formData.category,
      taskName: formData.title,
      pageUrl: formData.context || '',
      steps: formData.examples?.map((example, idx) => ({
        order: idx,
        action: 'click' as const,
        instruction: example,
      })) || [],
      successCount: 0,
      failureCount: 0,
    };

    saveMutation.mutate(pattern);
  };

  const addExample = () => {
    if (newExample.trim() && !formData.examples?.includes(newExample.trim())) {
      setFormData({
        ...formData,
        examples: [...(formData.examples || []), newExample.trim()],
      });
      setNewExample('');
    }
  };

  const removeExample = (index: number) => {
    setFormData({
      ...formData,
      examples: formData.examples?.filter((_, i) => i !== index) || [],
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()],
      });
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((_, i) => i !== index) || [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {entry ? 'Edit Knowledge Entry' : 'Create Knowledge Entry'}
          </DialogTitle>
          <DialogDescription>
            {entry
              ? 'Update the knowledge entry details below'
              : 'Add a new knowledge entry to improve AI agent behavior'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              Examples
            </TabsTrigger>
            <TabsTrigger value="metadata" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Metadata
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[450px] mt-4">
            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4 pr-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value as KnowledgeCategory })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter a descriptive title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Describe the knowledge, process, or guideline..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.content.length} characters
                </p>
              </div>

              {/* Context */}
              <div className="space-y-2">
                <Label htmlFor="context">Context</Label>
                <Textarea
                  id="context"
                  placeholder="When should this knowledge be applied? What are the conditions?"
                  value={formData.context}
                  onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Confidence Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="confidence">Confidence Level</Label>
                  <span className="text-sm font-medium">
                    {Math.round(formData.confidence * 100)}%
                  </span>
                </div>
                <Slider
                  id="confidence"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[formData.confidence]}
                  onValueChange={(value) =>
                    setFormData({ ...formData, confidence: value[0] })
                  }
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>
            </TabsContent>

            {/* Examples Tab */}
            <TabsContent value="examples" className="space-y-4 pr-4">
              <div>
                <Label>Examples</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Provide examples to help the AI understand how to apply this knowledge
                </p>

                {/* Add Example Input */}
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add an example..."
                    value={newExample}
                    onChange={(e) => setNewExample(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addExample();
                      }
                    }}
                  />
                  <Button type="button" onClick={addExample} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Examples List */}
                {formData.examples && formData.examples.length > 0 ? (
                  <div className="space-y-2">
                    {formData.examples.map((example, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 bg-muted rounded-lg group"
                      >
                        <div className="flex-1">
                          <p className="text-sm">{example}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExample(index)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No examples added yet</p>
                    <p className="text-xs">Add examples to improve understanding</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Metadata Tab */}
            <TabsContent value="metadata" className="space-y-4 pr-4">
              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Add tags to categorize and search for this entry
                </p>

                {/* Add Tag Input */}
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTag} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Tags List */}
                {formData.tags && formData.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeTag(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tags added yet</p>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <AlertCircle className="h-4 w-4" />
                  <h4 className="font-medium text-sm">Tips for Better Knowledge Entries</h4>
                </div>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-6 list-disc">
                  <li>Use clear, concise language</li>
                  <li>Provide specific examples when possible</li>
                  <li>Set appropriate confidence levels</li>
                  <li>Add relevant tags for easy discovery</li>
                  <li>Update entries based on feedback</li>
                </ul>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Entry
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
