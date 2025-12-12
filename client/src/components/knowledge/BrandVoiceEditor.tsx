/**
 * Brand Voice Editor Component
 *
 * Allows configuration of brand voice settings for content generation.
 * Manages tone, vocabulary, and examples for each client.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus,
  Edit,
  Trash2,
  Mic2,
  Wand2,
  Loader2,
  X,
  Check,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

export function BrandVoiceEditor() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: voicesData, isLoading, refetch } = trpc.knowledge.listBrandVoices.useQuery();
  const voices = voicesData?.brandVoices || [];

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Brand Voices</h3>
          <p className="text-sm text-muted-foreground">
            Configure tone and vocabulary for content generation
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Brand Voice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Brand Voice</DialogTitle>
              <DialogDescription>
                Define tone, vocabulary, and examples for a client
              </DialogDescription>
            </DialogHeader>
            <BrandVoiceForm
              onSuccess={() => {
                setIsCreateOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Voice Cards */}
      {voices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Mic2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No brand voices configured</p>
            <p className="text-sm">Create a brand voice to personalize content generation</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {voices.map((voice) => (
            <BrandVoiceCard
              key={voice.clientId}
              voice={voice}
              onEdit={() => setSelectedClientId(voice.clientId)}
              onRefetch={refetch}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {selectedClientId && (
        <Dialog
          open={!!selectedClientId}
          onOpenChange={(open) => !open && setSelectedClientId(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Brand Voice</DialogTitle>
              <DialogDescription>
                Update tone, vocabulary, and examples
              </DialogDescription>
            </DialogHeader>
            <BrandVoiceForm
              clientId={selectedClientId}
              onSuccess={() => {
                setSelectedClientId(null);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Brand Voice Card
function BrandVoiceCard({
  voice,
  onEdit,
  onRefetch,
}: {
  voice: any;
  onEdit: () => void;
  onRefetch: () => void;
}) {
  const { data: promptData } = trpc.knowledge.generateBrandPrompt.useQuery({
    clientId: voice.clientId,
    contentType: 'general',
  });

  const handleCopyPrompt = () => {
    if (promptData?.prompt) {
      navigator.clipboard.writeText(promptData.prompt);
      toast.success('Brand prompt copied to clipboard');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{voice.name}</CardTitle>
            <CardDescription>Client #{voice.clientId}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleCopyPrompt}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Tone */}
          <div>
            <Label className="text-xs text-muted-foreground">Tone</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {voice.tone.slice(0, 4).map((t: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
              {voice.tone.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{voice.tone.length - 4}
                </Badge>
              )}
            </div>
          </div>

          {/* Industry & Audience */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {voice.industry && (
              <div>
                <span className="text-muted-foreground">Industry:</span>{' '}
                {voice.industry}
              </div>
            )}
            {voice.targetAudience && (
              <div>
                <span className="text-muted-foreground">Audience:</span>{' '}
                {voice.targetAudience}
              </div>
            )}
          </div>

          {/* Vocabulary Preview */}
          <div>
            <Label className="text-xs text-muted-foreground">Key Words</Label>
            <p className="text-sm truncate">
              {voice.vocabulary.slice(0, 5).join(', ')}
              {voice.vocabulary.length > 5 && '...'}
            </p>
          </div>

          {/* Examples Count */}
          <div className="text-xs text-muted-foreground">
            {voice.examples.length} example{voice.examples.length !== 1 ? 's' : ''} defined
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Brand Voice Form
function BrandVoiceForm({
  clientId,
  onSuccess,
}: {
  clientId?: number;
  onSuccess: () => void;
}) {
  const { data: existingData } = trpc.knowledge.getBrandVoice.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  const existingVoice = existingData?.brandVoice;

  const [formData, setFormData] = useState({
    clientId: existingVoice?.clientId || 0,
    name: existingVoice?.name || '',
    tone: existingVoice?.tone || [],
    vocabulary: existingVoice?.vocabulary || [],
    avoidWords: existingVoice?.avoidWords || [],
    industry: existingVoice?.industry || '',
    targetAudience: existingVoice?.targetAudience || '',
    examples: existingVoice?.examples || [],
  });

  const [newTone, setNewTone] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newAvoid, setNewAvoid] = useState('');

  const saveMutation = trpc.knowledge.saveBrandVoice.useMutation({
    onSuccess: () => {
      toast.success('Brand voice saved');
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!formData.clientId || !formData.name) {
      toast.error('Client ID and name are required');
      return;
    }

    saveMutation.mutate({
      ...formData,
      examples: formData.examples.length > 0 ? formData.examples : [
        { type: 'general' as const, good: '', bad: '' }
      ],
    });
  };

  const addTone = () => {
    if (newTone && !formData.tone.includes(newTone)) {
      setFormData({ ...formData, tone: [...formData.tone, newTone] });
      setNewTone('');
    }
  };

  const addWord = () => {
    if (newWord && !formData.vocabulary.includes(newWord)) {
      setFormData({ ...formData, vocabulary: [...formData.vocabulary, newWord] });
      setNewWord('');
    }
  };

  const addAvoid = () => {
    if (newAvoid && !formData.avoidWords.includes(newAvoid)) {
      setFormData({ ...formData, avoidWords: [...formData.avoidWords, newAvoid] });
      setNewAvoid('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Client ID</Label>
          <Input
            type="number"
            value={formData.clientId || ''}
            onChange={(e) => setFormData({ ...formData, clientId: parseInt(e.target.value) || 0 })}
            placeholder="123"
            disabled={!!clientId}
          />
        </div>
        <div>
          <Label>Voice Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Professional & Friendly"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Industry</Label>
          <Input
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            placeholder="Healthcare, Tech, etc."
          />
        </div>
        <div>
          <Label>Target Audience</Label>
          <Input
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            placeholder="Small business owners"
          />
        </div>
      </div>

      {/* Tone */}
      <div>
        <Label>Tone</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={newTone}
            onChange={(e) => setNewTone(e.target.value)}
            placeholder="Add tone (e.g., friendly, professional)"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTone())}
          />
          <Button type="button" variant="secondary" onClick={addTone}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {formData.tone.map((t, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {t}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setFormData({
                  ...formData,
                  tone: formData.tone.filter((_, idx) => idx !== i),
                })}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Vocabulary */}
      <div>
        <Label>Preferred Vocabulary</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Add preferred word"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWord())}
          />
          <Button type="button" variant="secondary" onClick={addWord}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {formData.vocabulary.map((w, i) => (
            <Badge key={i} variant="outline" className="gap-1 bg-green-50">
              {w}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setFormData({
                  ...formData,
                  vocabulary: formData.vocabulary.filter((_, idx) => idx !== i),
                })}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Avoid Words */}
      <div>
        <Label>Words to Avoid</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={newAvoid}
            onChange={(e) => setNewAvoid(e.target.value)}
            placeholder="Add word to avoid"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAvoid())}
          />
          <Button type="button" variant="secondary" onClick={addAvoid}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {formData.avoidWords.map((w, i) => (
            <Badge key={i} variant="outline" className="gap-1 bg-red-50">
              {w}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setFormData({
                  ...formData,
                  avoidWords: formData.avoidWords.filter((_, idx) => idx !== i),
                })}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Brand Voice
        </Button>
      </div>
    </div>
  );
}
