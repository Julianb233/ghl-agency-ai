import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Sparkles, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskTemplate } from './TaskTemplates';

interface TaskInputProps {
  onSubmit: (task: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  selectedTemplate?: TaskTemplate | null;
  onClearTemplate?: () => void;
  onShowTemplates?: () => void;
}

export function TaskInput({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = 'Describe the task you want the agent to perform...',
  selectedTemplate,
  onClearTemplate,
  onShowTemplates,
}: TaskInputProps) {
  const [task, setTask] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-fill task from selected template
  useEffect(() => {
    if (selectedTemplate) {
      setTask(selectedTemplate.prompt);
      textareaRef.current?.focus();
    }
  }, [selectedTemplate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim() && !isLoading && !disabled) {
      onSubmit(task.trim());
      setTask('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="border-emerald-200">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="task-input" className="block text-xs font-semibold text-gray-700">
                Agent Task
              </label>
              {selectedTemplate && onClearTemplate && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-700 gap-1 cursor-pointer hover:bg-emerald-100"
                  onClick={onClearTemplate}
                >
                  <Sparkles className="w-3 h-3" />
                  {selectedTemplate.name}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}
            </div>
            <textarea
              ref={textareaRef}
              id="task-input"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading || disabled}
              className={cn(
                'w-full px-4 py-3 rounded-lg border border-gray-300 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                'disabled:bg-gray-100 disabled:cursor-not-allowed',
                'text-sm text-gray-900 placeholder:text-gray-400',
                'transition-all',
                selectedTemplate && 'border-emerald-300 bg-emerald-50/30'
              )}
              rows={4}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onShowTemplates && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onShowTemplates}
                  className="text-xs gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Templates
                  <ChevronDown className="w-3 h-3" />
                </Button>
              )}
              <span className="text-xs text-gray-500">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 font-mono text-xs">Ctrl+Enter</kbd> to submit
              </span>
            </div>

            <Button
              type="submit"
              disabled={!task.trim() || isLoading || disabled}
              className={cn(
                'bg-emerald-600 hover:bg-emerald-700 text-white',
                'disabled:bg-gray-300 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Execute Task</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
