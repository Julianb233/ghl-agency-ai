import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskInputProps {
  onSubmit: (task: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function TaskInput({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = 'Describe the task you want the agent to perform...'
}: TaskInputProps) {
  const [task, setTask] = useState('');

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
            <label htmlFor="task-input" className="block text-xs font-semibold text-gray-700 mb-2">
              Agent Task
            </label>
            <textarea
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
                'transition-all'
              )}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Press <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 font-mono">Ctrl+Enter</kbd> to submit
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
