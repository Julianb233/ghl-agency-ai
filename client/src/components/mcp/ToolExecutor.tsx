/**
 * Tool Executor Component
 *
 * Execute MCP tools with a user-friendly interface.
 * Provides parameter inputs, execution history, and result display.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import {
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Trash2,
  Clock,
  Code,
} from 'lucide-react';
import { toast } from 'sonner';

// Common tools for quick access
const QUICK_TOOLS = [
  { name: 'file/read', label: 'Read File' },
  { name: 'file/write', label: 'Write File' },
  { name: 'file/list', label: 'List Directory' },
  { name: 'shell/execute', label: 'Execute Command' },
  { name: 'web/fetch', label: 'Fetch URL' },
  { name: 'database/query', label: 'Database Query' },
];

interface ExecutionResult {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
  success: boolean;
  timestamp: Date;
  duration: number;
}

export function ToolExecutor() {
  const [selectedTool, setSelectedTool] = useState('');
  const [arguments_, setArguments] = useState('{}');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ExecutionResult[]>([]);

  const executeTool = trpc.mcp.executeTool.useMutation({
    onSuccess: (data) => {
      const newResult: ExecutionResult = {
        id: crypto.randomUUID(),
        toolName: selectedTool,
        arguments: JSON.parse(arguments_),
        result: data.result,
        success: true,
        timestamp: new Date(),
        duration: 0, // Would be calculated from actual timing
      };
      setExecutionHistory([newResult, ...executionHistory]);
      toast.success('Tool executed successfully');
    },
    onError: (error) => {
      const newResult: ExecutionResult = {
        id: crypto.randomUUID(),
        toolName: selectedTool,
        arguments: JSON.parse(arguments_),
        result: error.message,
        success: false,
        timestamp: new Date(),
        duration: 0,
      };
      setExecutionHistory([newResult, ...executionHistory]);
      toast.error(`Execution failed: ${error.message}`);
    },
    onSettled: () => {
      setIsExecuting(false);
    },
  });

  const handleExecute = () => {
    if (!selectedTool) {
      toast.error('Please select a tool');
      return;
    }

    try {
      const parsedArgs = JSON.parse(arguments_);
      setIsExecuting(true);
      executeTool.mutate({
        name: selectedTool,
        arguments: parsedArgs,
      });
    } catch (e) {
      toast.error('Invalid JSON in arguments');
    }
  };

  const clearHistory = () => {
    setExecutionHistory([]);
    toast.success('History cleared');
  };

  const copyResult = (result: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    toast.success('Result copied to clipboard');
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Execution Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Execute Tool</CardTitle>
          <CardDescription>Run MCP tools with custom parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tool Selection */}
          <div>
            <Label>Tool Name</Label>
            <Select value={selectedTool} onValueChange={setSelectedTool}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tool..." />
              </SelectTrigger>
              <SelectContent>
                {QUICK_TOOLS.map((tool) => (
                  <SelectItem key={tool.name} value={tool.name}>
                    {tool.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Tool Name Input */}
          <div>
            <Label>Or enter custom tool name</Label>
            <Input
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              placeholder="category/tool-name"
              className="font-mono"
            />
          </div>

          {/* Arguments Input */}
          <div>
            <Label>Arguments (JSON)</Label>
            <Textarea
              value={arguments_}
              onChange={(e) => setArguments(e.target.value)}
              placeholder='{"key": "value"}'
              className="font-mono h-32"
            />
          </div>

          {/* Execute Button */}
          <Button
            className="w-full"
            onClick={handleExecute}
            disabled={isExecuting || !selectedTool}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Execute Tool
              </>
            )}
          </Button>

          {/* Quick Actions */}
          <div>
            <Label className="text-xs text-muted-foreground">Quick Actions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_TOOLS.map((tool) => (
                <Button
                  key={tool.name}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTool(tool.name)}
                >
                  {tool.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>Recent tool executions</CardDescription>
            </div>
            {executionHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {executionHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No executions yet</p>
              <p className="text-sm">Execute a tool to see results here</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {executionHistory.map((execution) => (
                  <ExecutionResultCard
                    key={execution.id}
                    execution={execution}
                    onCopy={() => copyResult(execution.result)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Execution Result Card
function ExecutionResultCard({
  execution,
  onCopy,
}: {
  execution: ExecutionResult;
  onCopy: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className={`p-3 cursor-pointer ${
          execution.success ? 'bg-green-50' : 'bg-red-50'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {execution.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <code className="text-sm font-mono">{execution.toolName}</code>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={execution.success ? 'default' : 'destructive'}>
              {execution.success ? 'Success' : 'Failed'}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {execution.timestamp.toLocaleTimeString()}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-3 border-t bg-muted/30">
          {/* Arguments */}
          <div className="mb-3">
            <Label className="text-xs">Arguments</Label>
            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
              {JSON.stringify(execution.arguments, null, 2)}
            </pre>
          </div>

          {/* Result */}
          <div>
            <Label className="text-xs">Result</Label>
            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-48">
              {typeof execution.result === 'string'
                ? execution.result
                : JSON.stringify(execution.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
