import React, { useState, useEffect } from 'react';
import { Save, X, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type {
  SOP,
  SOPEditorProps,
  SOPCategory,
  SOPStatus,
  SOPPriority,
  AutomationLevel,
  SOPTag
} from '@/types/sop';

const CATEGORY_OPTIONS: { value: SOPCategory; label: string }[] = [
  { value: 'CLIENT_ONBOARDING', label: 'Client Onboarding' },
  { value: 'SALES', label: 'Sales' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OPERATIONS', label: 'Operations' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'OTHER', label: 'Other' }
];

const STATUS_OPTIONS: { value: SOPStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'DEPRECATED', label: 'Deprecated' }
];

const PRIORITY_OPTIONS: { value: SOPPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' }
];

const AUTOMATION_OPTIONS: { value: AutomationLevel; label: string; description: string }[] = [
  {
    value: 'MANUAL',
    label: 'Manual',
    description: 'All steps require human execution'
  },
  {
    value: 'SEMI_AUTOMATED',
    label: 'Semi-Automated',
    description: 'Mix of automated and manual steps'
  },
  {
    value: 'FULLY_AUTOMATED',
    label: 'Fully Automated',
    description: 'AI executes all steps automatically'
  }
];

export const SOPEditor: React.FC<SOPEditorProps> = ({
  sop,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<SOP>>({
    title: '',
    description: '',
    objective: '',
    category: 'OTHER',
    status: 'DRAFT',
    priority: 'MEDIUM',
    aiEnabled: false,
    humanApprovalRequired: true,
    automationLevel: 'MANUAL',
    tags: [],
    ...sop
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (sop) {
      setFormData({ ...sop });
    }
  }, [sop]);

  const handleChange = (field: keyof SOP, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;

    const newTag: SOPTag = {
      id: `tag-${Date.now()}`,
      name: tagInput.trim()
    };

    handleChange('tags', [...(formData.tags || []), newTag]);
    setTagInput('');
  };

  const handleRemoveTag = (tagId: string) => {
    handleChange('tags', formData.tags?.filter(t => t.id !== tagId) || []);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave?.(formData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{sop ? 'Edit SOP' : 'Create New SOP'}</CardTitle>
              <CardDescription className="mt-1">
                Define the standard operating procedure details and configuration
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !hasChanges}
                isLoading={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save SOP
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Client Onboarding Process"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                aria-invalid={!!errors.title}
                className={cn(errors.title && 'border-red-500')}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what this SOP covers and when to use it..."
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                aria-invalid={!!errors.description}
                className={cn(errors.description && 'border-red-500', 'min-h-24')}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">Objective</Label>
              <Textarea
                id="objective"
                placeholder="What should be achieved by following this SOP?"
                value={formData.objective || ''}
                onChange={(e) => handleChange('objective', e.target.value)}
                className="min-h-20"
              />
              <p className="text-xs text-muted-foreground">
                Define the expected outcome or goal of this procedure
              </p>
            </div>
          </div>

          {/* Classification */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Classification</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category || 'OTHER'}
                  onValueChange={(value: SOPCategory) => handleChange('category', value)}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || 'DRAFT'}
                  onValueChange={(value: SOPStatus) => handleChange('status', value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority || 'MEDIUM'}
                  onValueChange={(value: SOPPriority) => handleChange('priority', value)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Tags</h3>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  Add
                </Button>
              </div>

              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="gap-1 cursor-pointer"
                      onClick={() => handleRemoveTag(tag.id)}
                    >
                      {tag.name}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI & Automation Settings */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">AI & Automation Settings</h3>
              <Sparkles className="h-5 w-5 text-indigo-500" />
            </div>

            {formData.aiEnabled && formData.automationLevel === 'FULLY_AUTOMATED' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Fully automated SOPs will execute without human intervention.
                  Ensure all steps are properly configured and tested.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="ai-enabled" className="cursor-pointer">
                    Enable AI Execution
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow AI agents to execute this SOP
                  </p>
                </div>
                <Switch
                  id="ai-enabled"
                  checked={formData.aiEnabled || false}
                  onCheckedChange={(checked) => handleChange('aiEnabled', checked)}
                />
              </div>

              {formData.aiEnabled && (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                    <div className="space-y-0.5">
                      <Label htmlFor="approval-required" className="cursor-pointer">
                        Require Human Approval
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        AI must wait for approval before proceeding
                      </p>
                    </div>
                    <Switch
                      id="approval-required"
                      checked={formData.humanApprovalRequired || false}
                      onCheckedChange={(checked) => handleChange('humanApprovalRequired', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Automation Level</Label>
                    <div className="grid gap-3">
                      {AUTOMATION_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleChange('automationLevel', option.value)}
                          className={cn(
                            'p-4 rounded-lg border text-left transition-all',
                            formData.automationLevel === option.value
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {option.description}
                              </div>
                            </div>
                            {formData.automationLevel === option.value && (
                              <Badge variant="default">Selected</Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Meta Information */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Additional Information</h3>

            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                placeholder="e.g., 30"
                value={formData.estimatedDuration || ''}
                onChange={(e) => handleChange('estimatedDuration', parseInt(e.target.value) || undefined)}
              />
              <p className="text-xs text-muted-foreground">
                Approximate time to complete this SOP
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !hasChanges}
              isLoading={isLoading}
            >
              {sop ? 'Update SOP' : 'Create SOP'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};
