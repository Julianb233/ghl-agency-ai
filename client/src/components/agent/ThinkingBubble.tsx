/**
 * ThinkingBubble Component
 *
 * Compact, animated bubble display for agent thinking steps.
 * Features slide-up animations and hover-to-expand behavior.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Wrench, CheckCircle2, AlertCircle, Lightbulb, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThinkingStep } from '@/types/agent';

interface ThinkingBubbleProps {
  step: ThinkingStep;
  index: number;
  isLatest?: boolean;
}

export function ThinkingBubble({ step, index, isLatest = false }: ThinkingBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStepConfig = () => {
    switch (step.type) {
      case 'thinking':
        return {
          icon: <Lightbulb className="w-3.5 h-3.5" />,
          bgColor: 'bg-blue-500',
          glowColor: 'shadow-blue-500/30',
          textColor: 'text-blue-50',
          label: 'Thinking',
        };
      case 'tool_use':
        return {
          icon: <Wrench className="w-3.5 h-3.5" />,
          bgColor: 'bg-purple-500',
          glowColor: 'shadow-purple-500/30',
          textColor: 'text-purple-50',
          label: step.toolName ? `Tool: ${step.toolName}` : 'Using Tool',
        };
      case 'tool_result':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          bgColor: 'bg-green-500',
          glowColor: 'shadow-green-500/30',
          textColor: 'text-green-50',
          label: 'Result',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          bgColor: 'bg-red-500',
          glowColor: 'shadow-red-500/30',
          textColor: 'text-red-50',
          label: 'Error',
        };
      case 'plan':
        return {
          icon: <Cpu className="w-3.5 h-3.5" />,
          bgColor: 'bg-emerald-500',
          glowColor: 'shadow-emerald-500/30',
          textColor: 'text-emerald-50',
          label: 'Planning',
        };
      default:
        return {
          icon: <MessageSquare className="w-3.5 h-3.5" />,
          bgColor: 'bg-gray-500',
          glowColor: 'shadow-gray-500/30',
          textColor: 'text-gray-50',
          label: 'Message',
        };
    }
  };

  const config = getStepConfig();
  const truncatedContent = step.content.length > 80
    ? step.content.substring(0, 80) + '...'
    : step.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="relative"
    >
      <motion.div
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'cursor-pointer rounded-2xl px-4 py-2.5 transition-all duration-200',
          config.bgColor,
          isLatest && `shadow-lg ${config.glowColor}`,
          'hover:shadow-md'
        )}
      >
        {/* Bubble header */}
        <div className="flex items-center gap-2">
          <div className={cn('p-1 rounded-full bg-white/20', config.textColor)}>
            {config.icon}
          </div>
          <span className={cn('text-xs font-semibold uppercase tracking-wide', config.textColor)}>
            {config.label}
          </span>
          <span className="text-xs text-white/60 ml-auto">
            {(step.timestamp instanceof Date ? step.timestamp : new Date(step.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Bubble content - always show truncated */}
        <p className={cn('mt-1.5 text-sm', config.textColor, 'opacity-90')}>
          {isExpanded ? step.content : truncatedContent}
        </p>

        {/* Expand indicator */}
        {step.content.length > 80 && (
          <div className="text-xs text-white/60 mt-1">
            {isExpanded ? 'Click to collapse' : 'Click to expand'}
          </div>
        )}
      </motion.div>

      {/* Expanded details panel */}
      <AnimatePresence>
        {isExpanded && (step.toolParams || step.toolResult) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 ml-4 overflow-hidden"
          >
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-3 border border-gray-700">
              {step.toolParams && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-gray-400 mb-1">Parameters:</div>
                  <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(step.toolParams, null, 2)}
                  </pre>
                </div>
              )}
              {step.toolResult && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1">Result:</div>
                  <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {typeof step.toolResult === 'string'
                      ? step.toolResult
                      : JSON.stringify(step.toolResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulsing dot for latest step */}
      {isLatest && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className={cn(
            'absolute -right-1 -top-1 w-3 h-3 rounded-full',
            config.bgColor,
            'ring-2 ring-white'
          )}
        />
      )}
    </motion.div>
  );
}

/**
 * ThinkingBubbleStream Component
 *
 * Container for displaying multiple thinking bubbles in a stream layout.
 */
interface ThinkingBubbleStreamProps {
  steps: ThinkingStep[];
  maxVisible?: number;
}

export function ThinkingBubbleStream({ steps, maxVisible = 50 }: ThinkingBubbleStreamProps) {
  const visibleSteps = steps.slice(-maxVisible);

  return (
    <div className="space-y-2 p-4">
      <AnimatePresence mode="popLayout">
        {visibleSteps.map((step, index) => (
          <ThinkingBubble
            key={step.id}
            step={step}
            index={index}
            isLatest={index === visibleSteps.length - 1}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
