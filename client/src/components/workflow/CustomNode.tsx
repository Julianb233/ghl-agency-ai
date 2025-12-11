import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Compass,
  MousePointer2,
  Database,
  Clock,
  GitBranch,
  Repeat,
  Keyboard,
  ArrowDown,
  Camera,
  Webhook,
  Variable,
  Wand2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowNodeData } from '@/types/workflow';

const NODE_ICONS = {
  navigate: Compass,
  click: MousePointer2,
  extract: Database,
  wait: Clock,
  condition: GitBranch,
  loop: Repeat,
  input: Keyboard,
  scroll: ArrowDown,
  screenshot: Camera,
  api_call: Webhook,
  variable: Variable,
  transform: Wand2,
};

const NODE_COLORS = {
  navigate: 'from-blue-500 to-blue-600',
  click: 'from-purple-500 to-purple-600',
  extract: 'from-green-500 to-green-600',
  wait: 'from-yellow-500 to-yellow-600',
  condition: 'from-orange-500 to-orange-600',
  loop: 'from-pink-500 to-pink-600',
  input: 'from-indigo-500 to-indigo-600',
  scroll: 'from-cyan-500 to-cyan-600',
  screenshot: 'from-teal-500 to-teal-600',
  api_call: 'from-red-500 to-red-600',
  variable: 'from-violet-500 to-violet-600',
  transform: 'from-fuchsia-500 to-fuchsia-600',
};

export const CustomNode: React.FC<NodeProps<WorkflowNodeData>> = ({ data, selected }) => {
  const Icon = NODE_ICONS[data.type as keyof typeof NODE_ICONS] || Compass;
  const gradient = NODE_COLORS[data.type as keyof typeof NODE_COLORS] || 'from-gray-500 to-gray-600';

  return (
    <div
      className={cn(
        'relative min-w-[200px] rounded-lg border-2 bg-background shadow-lg transition-all',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
        !data.enabled && 'opacity-50'
      )}
    >
      {/* Input Handle */}
      {data.type !== 'navigate' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !bg-primary"
        />
      )}

      {/* Node Header */}
      <div className={cn('flex items-center gap-2 rounded-t-md bg-gradient-to-r p-3 text-white', gradient)}>
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-sm font-semibold">{data.label}</span>
        {data.enabled ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Node Content */}
      <div className="p-3 space-y-2">
        {/* Navigate */}
        {data.type === 'navigate' && (
          <div className="text-xs">
            <div className="text-muted-foreground">URL:</div>
            <div className="truncate font-mono">{data.url || 'Not set'}</div>
          </div>
        )}

        {/* Click */}
        {data.type === 'click' && (
          <div className="text-xs">
            <div className="text-muted-foreground">Selector:</div>
            <div className="truncate font-mono">{data.selector || 'Not set'}</div>
          </div>
        )}

        {/* Extract */}
        {data.type === 'extract' && (
          <div className="text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Type:</span> {data.extractType}
            </div>
            <div>
              <span className="text-muted-foreground">Variable:</span> {data.variableName}
            </div>
          </div>
        )}

        {/* Wait */}
        {data.type === 'wait' && (
          <div className="text-xs">
            <div className="text-muted-foreground">Condition:</div>
            <div>
              {data.waitCondition === 'time' && `${data.duration}ms`}
              {data.waitCondition === 'element' && data.selector}
              {data.waitCondition === 'network' && 'Network idle'}
            </div>
          </div>
        )}

        {/* Condition */}
        {data.type === 'condition' && (
          <div className="text-xs">
            <div className="font-mono truncate">
              {data.variable || '?'} {data.operator} {data.value || '?'}
            </div>
          </div>
        )}

        {/* Loop */}
        {data.type === 'loop' && (
          <div className="text-xs">
            <div className="text-muted-foreground">Type:</div>
            <div>
              {data.loopType === 'count' && `${data.iterations} times`}
              {data.loopType === 'while' && 'While condition'}
              {data.loopType === 'foreach' && `Each in ${data.arrayVariable}`}
            </div>
          </div>
        )}

        {/* Input */}
        {data.type === 'input' && (
          <div className="text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Type:</span> {data.inputType}
            </div>
            <div className="truncate font-mono">{data.selector || 'Not set'}</div>
          </div>
        )}

        {/* Scroll */}
        {data.type === 'scroll' && (
          <div className="text-xs">
            <div className="text-muted-foreground">Type:</div>
            <div>{data.scrollType}</div>
          </div>
        )}

        {/* Screenshot */}
        {data.type === 'screenshot' && (
          <div className="text-xs">
            <div>{data.fullPage ? 'Full page' : 'Viewport'}</div>
          </div>
        )}

        {/* API Call */}
        {data.type === 'api_call' && (
          <div className="text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Method:</span> {data.method}
            </div>
            <div className="truncate font-mono">{data.url || 'Not set'}</div>
          </div>
        )}

        {/* Variable */}
        {data.type === 'variable' && (
          <div className="text-xs">
            <div className="truncate font-mono">
              {data.variableName} = {data.value}
            </div>
          </div>
        )}

        {/* Transform */}
        {data.type === 'transform' && (
          <div className="text-xs">
            <div className="text-muted-foreground">Type:</div>
            <div>{data.transformType}</div>
          </div>
        )}

        {/* Description */}
        {data.description && (
          <div className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
            {data.description}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-primary"
      />

      {/* Condition nodes have two outputs */}
      {data.type === 'condition' && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!h-3 !w-3 !bg-green-500 !left-[30%]"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!h-3 !w-3 !bg-red-500 !left-[70%]"
          />
          <div className="absolute bottom-1 left-0 right-0 flex justify-around text-[10px] text-muted-foreground">
            <span>True</span>
            <span>False</span>
          </div>
        </>
      )}
    </div>
  );
};
