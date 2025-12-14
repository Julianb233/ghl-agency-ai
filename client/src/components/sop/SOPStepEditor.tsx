import React, { useState } from 'react';
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Link as LinkIcon,
  Image,
  Video,
  File,
  AlertCircle,
  GitBranch,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type {
  SOPStep,
  SOPStepEditorProps,
  ActionType,
  SOPResource,
  SOPCondition,
  SOPAlternative
} from '@/types/sop';

const ACTION_TYPE_OPTIONS: { value: ActionType; label: string; icon: React.ReactNode }[] = [
  { value: 'MANUAL', label: 'Manual Action', icon: <FileText className="h-4 w-4" /> },
  { value: 'API_CALL', label: 'API Call', icon: <LinkIcon className="h-4 w-4" /> },
  { value: 'WEBHOOK', label: 'Webhook', icon: <LinkIcon className="h-4 w-4" /> },
  { value: 'EMAIL', label: 'Send Email', icon: <FileText className="h-4 w-4" /> },
  { value: 'NOTIFICATION', label: 'Send Notification', icon: <AlertCircle className="h-4 w-4" /> },
  { value: 'DATA_TRANSFORM', label: 'Data Transform', icon: <FileText className="h-4 w-4" /> },
  { value: 'APPROVAL', label: 'Approval Gate', icon: <AlertCircle className="h-4 w-4" /> },
  { value: 'CONDITIONAL', label: 'Conditional Logic', icon: <GitBranch className="h-4 w-4" /> },
  { value: 'OTHER', label: 'Other', icon: <FileText className="h-4 w-4" /> }
];

const RESOURCE_TYPE_OPTIONS = [
  { value: 'DOCUMENT', label: 'Document', icon: <FileText className="h-4 w-4" /> },
  { value: 'LINK', label: 'Link', icon: <LinkIcon className="h-4 w-4" /> },
  { value: 'VIDEO', label: 'Video', icon: <Video className="h-4 w-4" /> },
  { value: 'IMAGE', label: 'Image', icon: <Image className="h-4 w-4" /> },
  { value: 'FILE', label: 'File', icon: <File className="h-4 w-4" /> }
];

export const SOPStepEditor: React.FC<SOPStepEditorProps> = ({
  steps,
  onStepsChange,
  onAddStep,
  onRemoveStep,
  onReorderSteps
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const toggleStepExpanded = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const handleStepChange = (stepId: string, field: keyof SOPStep, value: any) => {
    const updatedSteps = steps.map(step =>
      step.id === stepId ? { ...step, [field]: value } : step
    );
    onStepsChange?.(updatedSteps);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    onReorderSteps?.(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleAddNewStep = () => {
    onAddStep?.();
    // Auto-expand the new step
    setTimeout(() => {
      const newStep = steps[steps.length];
      if (newStep) {
        setExpandedSteps(prev => new Set(prev).add(newStep.id));
      }
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">SOP Steps</h3>
          <p className="text-sm text-muted-foreground">
            Define the steps to execute this procedure
          </p>
        </div>
        <Button onClick={handleAddNewStep} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Step
        </Button>
      </div>

      {steps.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No steps added yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get started by adding your first step to this SOP
            </p>
            <Button onClick={handleAddNewStep} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Step
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              isExpanded={expandedSteps.has(step.id)}
              onToggleExpand={() => toggleStepExpanded(step.id)}
              onChange={(field, value) => handleStepChange(step.id, field, value)}
              onRemove={() => onRemoveStep?.(step.id)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              isDragging={draggedIndex === index}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface StepCardProps {
  step: SOPStep;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChange: (field: keyof SOPStep, value: any) => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  isExpanded,
  onToggleExpand,
  onChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging
}) => {
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showConditionDialog, setShowConditionDialog] = useState(false);

  const actionTypeOption = ACTION_TYPE_OPTIONS.find(opt => opt.value === step.actionType);

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        'transition-all',
        isDragging && 'opacity-50 shadow-lg',
        'hover:shadow-md cursor-move'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 mt-1">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
            <Badge variant="outline" className="font-mono">
              {index + 1}
            </Badge>
          </div>

          <div className="flex-1 min-w-0">
            {isExpanded ? (
              <Input
                value={step.title}
                onChange={(e) => onChange('title', e.target.value)}
                placeholder="Step title..."
                className="font-semibold"
              />
            ) : (
              <div className="space-y-1">
                <div className="font-semibold line-clamp-1">{step.title || 'Untitled Step'}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {actionTypeOption && (
                    <div className="flex items-center gap-1">
                      {actionTypeOption.icon}
                      <span>{actionTypeOption.label}</span>
                    </div>
                  )}
                  {step.estimatedDuration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{step.estimatedDuration}min</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
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
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label>Instructions</Label>
            <Textarea
              value={step.instructions}
              onChange={(e) => onChange('instructions', e.target.value)}
              placeholder="Detailed instructions for this step..."
              className="min-h-24"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select
                value={step.actionType}
                onValueChange={(value: ActionType) => onChange('actionType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estimated Duration (minutes)</Label>
              <Input
                type="number"
                min="0"
                value={step.estimatedDuration || ''}
                onChange={(e) => onChange('estimatedDuration', parseInt(e.target.value) || undefined)}
                placeholder="e.g., 15"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expected Outcome</Label>
            <Textarea
              value={step.expectedOutcome || ''}
              onChange={(e) => onChange('expectedOutcome', e.target.value)}
              placeholder="What should happen after completing this step?"
              className="min-h-16"
            />
          </div>

          <div className="space-y-2">
            <Label>Validation Criteria</Label>
            <Textarea
              value={step.validationCriteria || ''}
              onChange={(e) => onChange('validationCriteria', e.target.value)}
              placeholder="How to verify this step was completed successfully?"
              className="min-h-16"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <Label htmlFor={`optional-${step.id}`} className="cursor-pointer">
                Optional Step
              </Label>
              <Switch
                id={`optional-${step.id}`}
                checked={step.isOptional || false}
                onCheckedChange={(checked) => onChange('isOptional', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <Label htmlFor={`approval-${step.id}`} className="cursor-pointer">
                Requires Approval
              </Label>
              <Switch
                id={`approval-${step.id}`}
                checked={step.requiresApproval || false}
                onCheckedChange={(checked) => onChange('requiresApproval', checked)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Role</Label>
            <Input
              value={step.assignedRole || ''}
              onChange={(e) => onChange('assignedRole', e.target.value)}
              placeholder="e.g., Account Manager, Developer"
            />
          </div>

          {/* Resources */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label>Resources</Label>
              <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-3 w-3" />
                    Add Resource
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Resource</DialogTitle>
                    <DialogDescription>
                      Add a supporting document, link, or file for this step
                    </DialogDescription>
                  </DialogHeader>
                  <ResourceForm
                    onAdd={(resource) => {
                      onChange('resources', [...(step.resources || []), resource]);
                      setShowResourceDialog(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {step.resources && step.resources.length > 0 && (
              <div className="space-y-2">
                {step.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-2 rounded border bg-muted/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {RESOURCE_TYPE_OPTIONS.find(opt => opt.value === resource.type)?.icon}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{resource.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{resource.url}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        onChange('resources', step.resources?.filter(r => r.id !== resource.id) || []);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conditional Logic */}
          {step.actionType === 'CONDITIONAL' && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <Label>Conditional Logic</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowConditionDialog(true)}
              >
                <Plus className="h-3 w-3" />
                Add Condition
              </Button>

              {step.conditions && step.conditions.length > 0 && (
                <div className="space-y-2">
                  {step.conditions.map((condition) => (
                    <div key={condition.id} className="p-2 rounded border bg-muted/50 text-sm">
                      <code className="text-xs">
                        {condition.field} {condition.operator} {String(condition.value)}
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

interface ResourceFormProps {
  onAdd: (resource: SOPResource) => void;
}

const ResourceForm: React.FC<ResourceFormProps> = ({ onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'LINK' as const,
    url: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.url) return;

    const resource: SOPResource = {
      id: `resource-${Date.now()}`,
      ...formData
    };

    onAdd(resource);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Resource Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_TYPE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Resource name..."
        />
      </div>

      <div className="space-y-2">
        <Label>URL</Label>
        <Input
          value={formData.url}
          onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Additional details..."
          className="min-h-16"
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={!formData.name || !formData.url}>
          Add Resource
        </Button>
      </DialogFooter>
    </form>
  );
};
