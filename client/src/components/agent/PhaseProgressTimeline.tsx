/**
 * PhaseProgressTimeline Component
 *
 * Horizontal timeline visualization of execution phases with
 * real-time progress indicators and animations.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentPlan, AgentPhase } from '@/types/agent';

interface PhaseProgressTimelineProps {
  plan: AgentPlan;
  compact?: boolean;
}

export function PhaseProgressTimeline({ plan, compact = false }: PhaseProgressTimelineProps) {
  const currentPhaseIndex = (plan.currentPhaseId ?? 1) - 1;
  const completedCount = plan.phases.filter(p => p.status === 'completed').length;
  const totalPhases = plan.phases.length;
  const overallProgress = totalPhases > 0 ? Math.round((completedCount / totalPhases) * 100) : 0;

  const getPhaseStatus = (phase: AgentPhase, index: number) => {
    if (phase.status === 'completed') return 'completed';
    if (phase.status === 'failed') return 'failed';
    if (phase.status === 'in_progress' || index === currentPhaseIndex) return 'active';
    if (index < currentPhaseIndex) return 'completed';
    return 'pending';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500',
          ringColor: 'ring-emerald-500/30',
          lineColor: 'bg-emerald-500',
        };
      case 'active':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500',
          ringColor: 'ring-blue-500/30',
          lineColor: 'bg-blue-500',
        };
      case 'failed':
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: 'text-red-500',
          bgColor: 'bg-red-500',
          ringColor: 'ring-red-500/30',
          lineColor: 'bg-red-500',
        };
      default:
        return {
          icon: <Circle className="w-5 h-5" />,
          color: 'text-gray-400',
          bgColor: 'bg-gray-400',
          ringColor: 'ring-gray-400/30',
          lineColor: 'bg-gray-300',
        };
    }
  };

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-700">
        {/* Compact header with overall progress */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white">Execution Progress</span>
          <span className="text-sm text-gray-400">{completedCount}/{totalPhases} phases</span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
          />
        </div>

        {/* Compact phase indicators */}
        <div className="flex justify-between">
          {plan.phases.map((phase, index) => {
            const status = getPhaseStatus(phase, index);
            const config = getStatusConfig(status);

            return (
              <motion.div
                key={phase.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  status === 'active' && 'ring-4',
                  config.ringColor,
                  status === 'completed' ? 'bg-emerald-500/20' : 'bg-gray-700'
                )}
              >
                <div className={config.color}>
                  {config.icon}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Execution Timeline</h3>
          <p className="text-sm text-gray-400 mt-0.5">{plan.name || 'Agent Task Execution'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{overallProgress}%</div>
            <div className="text-xs text-gray-400">Complete</div>
          </div>
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className={cn(
              'w-12 h-12 rounded-full border-4 border-gray-700',
              overallProgress === 100 ? 'border-emerald-500' : 'border-t-blue-500'
            )}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-6 left-6 right-6 h-1 bg-gray-700 rounded-full" />

        {/* Progress line */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${overallProgress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute top-6 left-6 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full"
          style={{ maxWidth: 'calc(100% - 48px)' }}
        />

        {/* Phase nodes */}
        <div className="relative flex justify-between px-3">
          {plan.phases.map((phase, index) => {
            const status = getPhaseStatus(phase, index);
            const config = getStatusConfig(status);

            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                className="flex flex-col items-center"
              >
                {/* Node */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className={cn(
                    'relative w-12 h-12 rounded-full flex items-center justify-center z-10',
                    'border-4 border-gray-800 shadow-lg',
                    status === 'active' && 'ring-4 ring-blue-500/30',
                    status === 'completed' && 'bg-emerald-500',
                    status === 'failed' && 'bg-red-500',
                    status === 'active' && 'bg-blue-500',
                    status === 'pending' && 'bg-gray-700'
                  )}
                >
                  <div className={status !== 'pending' ? 'text-white' : config.color}>
                    {config.icon}
                  </div>

                  {/* Active pulse */}
                  {status === 'active' && (
                    <motion.div
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-blue-500"
                    />
                  )}
                </motion.div>

                {/* Label */}
                <div className="mt-3 text-center max-w-[100px]">
                  <div className={cn(
                    'text-xs font-semibold',
                    status === 'completed' && 'text-emerald-400',
                    status === 'active' && 'text-blue-400',
                    status === 'failed' && 'text-red-400',
                    status === 'pending' && 'text-gray-500'
                  )}>
                    Phase {index + 1}
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5" title={phase.name}>
                    {phase.name}
                  </div>
                </div>

                {/* Duration badge for completed phases */}
                {status === 'completed' && phase.duration && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-1 flex items-center gap-1 text-xs text-gray-500"
                  >
                    <Clock className="w-3 h-3" />
                    {formatDuration(phase.duration)}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Current phase details */}
      {plan.phases[currentPhaseIndex] && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm font-semibold text-blue-400">Currently Executing</span>
          </div>
          <h4 className="text-white font-semibold">{plan.phases[currentPhaseIndex].name}</h4>
          <p className="text-sm text-gray-400 mt-1">{plan.phases[currentPhaseIndex].description}</p>

          {plan.phases[currentPhaseIndex].successCriteria && plan.phases[currentPhaseIndex].successCriteria!.length > 0 && (
            <div className="mt-3 space-y-1">
              {plan.phases[currentPhaseIndex].successCriteria!.map((criterion, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className="text-gray-600">-</span>
                  <span>{criterion}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
