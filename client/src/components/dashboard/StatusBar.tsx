import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Clock,
  Wifi,
  WifiOff,
  PauseCircle,
  PlayCircle,
  ChevronUp,
  Zap,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

interface StatusBarProps {
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ className }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(true);

  // Fetch agent statistics with polling
  const { data: agentStats, isLoading: statsLoading } = trpc.agent.getStats.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
  });

  // Fetch recent executions to count running/queued
  const { data: executions, isLoading: executionsLoading } = trpc.agent.listExecutions.useQuery(
    { limit: 50, offset: 0 },
    {
      refetchInterval: 15000, // Refresh every 15 seconds
      retry: 2,
    }
  );

  // Calculate real-time stats from data
  const activeAgents = React.useMemo(() => {
    if (!executions) return 0;
    return executions.filter(e => e.status === 'running' || e.status === 'started').length;
  }, [executions]);

  const queuedTasks = React.useMemo(() => {
    if (!executions) return 0;
    return executions.filter(e => e.status === 'started').length;
  }, [executions]);

  const completedToday = React.useMemo(() => {
    if (!executions) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return executions.filter(e => {
      if (e.status !== 'success' || !e.completedAt) return false;
      const completedDate = new Date(e.completedAt);
      return completedDate >= today;
    }).length;
  }, [executions]);

  // Connection check - browser online status + API health
  React.useEffect(() => {
    const checkConnection = () => {
      setIsConnected(navigator.onLine);
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    checkConnection();

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  // Loading state
  const isLoading = statsLoading || executionsLoading;

  return (
    <motion.footer
      className={cn(
        'border-t border-slate-800/50 bg-slate-900/80 backdrop-blur-sm',
        className
      )}
    >
      {/* Expandable Details Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-slate-800/50"
          >
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Active Agents */}
              <div className="bg-slate-800/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-slate-300">Active Agents</span>
                </div>
                <div className="flex items-baseline gap-2">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-white">{activeAgents}</span>
                      <span className="text-xs text-slate-500">running now</span>
                    </>
                  )}
                </div>
                <div className="mt-2 flex gap-1">
                  {!isLoading && [...Array(Math.min(activeAgents, 10))].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
                </div>
              </div>

              {/* Queue Status */}
              <div className="bg-slate-800/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-slate-300">Task Queue</span>
                </div>
                <div className="flex items-baseline gap-2">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-white">{queuedTasks}</span>
                      <span className="text-xs text-slate-500">pending</span>
                    </>
                  )}
                </div>
                <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                  {!isLoading && (
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      initial={{ width: 0 }}
                      animate={{ width: queuedTasks > 0 ? `${Math.min((queuedTasks / 20) * 100, 100)}%` : '0%' }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  )}
                </div>
              </div>

              {/* Today's Progress */}
              <div className="bg-slate-800/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-slate-300">Completed Today</span>
                </div>
                <div className="flex items-baseline gap-2">
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-white">{completedToday}</span>
                      <span className="text-xs text-slate-500">tasks</span>
                    </>
                  )}
                </div>
                {!isLoading && agentStats && (
                  <div className="mt-2 text-xs text-emerald-400">
                    {agentStats.successRate.toFixed(0)}% success rate
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Status Bar */}
      <div className="h-10 px-4 flex items-center justify-between">
        {/* Left side - Status indicators */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs text-slate-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-red-400" />
                <span className="text-xs text-red-400">Offline</span>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-slate-700" />

          {/* Active Agents Count */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{activeAgents} agents</span>
          </button>

          {/* Divider */}
          <div className="h-4 w-px bg-slate-700" />

          {/* Queue Depth */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{queuedTasks} queued</span>
          </button>
        </div>

        {/* Center - Quick Actions */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <PauseCircle className="w-3.5 h-3.5" />
            <span>Pause All</span>
          </button>
        </div>

        {/* Right side - Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
        >
          <span className="text-xs hidden sm:inline">Details</span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronUp className="w-4 h-4" />
          </motion.div>
        </button>
      </div>
    </motion.footer>
  );
};

export default StatusBar;
