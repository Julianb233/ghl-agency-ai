import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const AUTOMATION_TYPES = [
  { value: 'chat', label: 'Chat Mode', description: 'Natural language browser automation' },
  { value: 'observe', label: 'Observe', description: 'Watch for changes on pages' },
  { value: 'extract', label: 'Extract Data', description: 'Scrape structured data' },
  { value: 'workflow', label: 'Workflow', description: 'Multi-step automation' },
];

const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'cron', label: 'Custom (Cron)' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
];

interface FormData {
  name: string;
  description: string;
  automationType: string;
  url: string;
  instruction: string;
  scheduleType: string;
  cronExpression: string;
  timezone: string;
  timeout: number;
  retryOnFailure: boolean;
  maxRetries: number;
  retryDelay: number;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
}

interface TaskFormDialogProps {
  open: boolean;
  isEdit: boolean;
  formData: FormData;
  onOpenChange: (open: boolean) => void;
  onFormDataChange: (data: FormData) => void;
  onSubmit: () => void;
}

export const TaskFormDialog = React.memo<TaskFormDialogProps>(({
  open,
  isEdit,
  formData,
  onOpenChange,
  onFormDataChange,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            Configure your scheduled browser automation task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Task Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                placeholder="e.g., Daily Lead Scraper"
                aria-required="true"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                placeholder="Optional description of what this task does"
                rows={2}
              />
            </div>
          </div>

          {/* Automation Config */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="automationType">Automation Type *</Label>
              <Select
                value={formData.automationType}
                onValueChange={(value) => onFormDataChange({ ...formData, automationType: value })}
              >
                <SelectTrigger id="automationType" aria-required="true">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-slate-500">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="url">Starting URL *</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => onFormDataChange({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
                aria-required="true"
              />
            </div>

            <div>
              <Label htmlFor="instruction">Instruction / Prompt *</Label>
              <Textarea
                id="instruction"
                value={formData.instruction}
                onChange={(e) => onFormDataChange({ ...formData, instruction: e.target.value })}
                placeholder="Natural language instruction for what the automation should do"
                rows={3}
                aria-required="true"
              />
            </div>
          </div>

          {/* Schedule Config */}
          <div className="space-y-4" data-tour="tasks-schedule-config">
            <h3 className="font-semibold text-sm">Schedule</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduleType">Schedule Type *</Label>
                <Select
                  value={formData.scheduleType}
                  onValueChange={(value) => onFormDataChange({ ...formData, scheduleType: value })}
                >
                  <SelectTrigger id="scheduleType" aria-required="true">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone *</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => onFormDataChange({ ...formData, timezone: value })}
                >
                  <SelectTrigger id="timezone" aria-required="true">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="cronExpression">
                Cron Expression {formData.scheduleType === 'cron' && '*'}
              </Label>
              <Input
                id="cronExpression"
                value={formData.cronExpression}
                onChange={(e) => onFormDataChange({ ...formData, cronExpression: e.target.value })}
                placeholder="0 9 * * *"
                disabled={formData.scheduleType !== 'cron'}
                aria-required={formData.scheduleType === 'cron'}
              />
              <p className="text-xs text-slate-500 mt-1">
                Format: minute hour day month weekday (e.g., "0 9 * * *" = 9 AM daily)
              </p>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Advanced Options</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={formData.timeout}
                  onChange={(e) => onFormDataChange({ ...formData, timeout: parseInt(e.target.value) })}
                  min={30}
                  max={3600}
                />
              </div>

              <div>
                <Label htmlFor="maxRetries">Max Retries</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  value={formData.maxRetries}
                  onChange={(e) => onFormDataChange({ ...formData, maxRetries: parseInt(e.target.value) })}
                  min={0}
                  max={10}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="retryOnFailure">Retry on Failure</Label>
                  <p className="text-xs text-slate-500">Automatically retry failed executions</p>
                </div>
                <Switch
                  id="retryOnFailure"
                  checked={formData.retryOnFailure}
                  onCheckedChange={(checked) => onFormDataChange({ ...formData, retryOnFailure: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifyOnSuccess">Notify on Success</Label>
                  <p className="text-xs text-slate-500">Send notification when task succeeds</p>
                </div>
                <Switch
                  id="notifyOnSuccess"
                  checked={formData.notifyOnSuccess}
                  onCheckedChange={(checked) => onFormDataChange({ ...formData, notifyOnSuccess: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifyOnFailure">Notify on Failure</Label>
                  <p className="text-xs text-slate-500">Send notification when task fails</p>
                </div>
                <Switch
                  id="notifyOnFailure"
                  checked={formData.notifyOnFailure}
                  onCheckedChange={(checked) => onFormDataChange({ ...formData, notifyOnFailure: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            {isEdit ? 'Update Task' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

TaskFormDialog.displayName = 'TaskFormDialog';
