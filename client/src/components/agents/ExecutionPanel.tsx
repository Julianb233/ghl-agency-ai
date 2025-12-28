import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Maximize2,
  Minimize2,
  Terminal,
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
  ChevronRight,
  Send,
  Bot,
  Globe,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Copy,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

// WebSocket Configuration
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5174/ws';

// Types
interface ExecutionStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  details?: string;
  screenshot?: string;
}

interface ExecutionMessage {
  id: string;
  type: 'thought' | 'action' | 'observation' | 'error' | 'user';
  content: string;
  timestamp: Date;
}

interface WSMessage {
  type: 'step_update' | 'message' | 'status_change' | 'error';
  taskId: string;
  payload: ExecutionStep | ExecutionMessage | { status: string } | { error: string };
}

interface ExecutionPanelProps {
  taskId: string;
  taskName: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  browserUrl?: string;
  steps: ExecutionStep[];
  messages: ExecutionMessage[];
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
  onSendMessage?: (message: string) => void;
  onStatusChange?: (status: ExecutionPanelProps['status']) => void;
  className?: string;
}

// WebSocket Hook for Real-time Updates
const useExecutionWebSocket = (
  taskId: string,
  status: ExecutionPanelProps['status'],
  initialSteps: ExecutionStep[],
  initialMessages: ExecutionMessage[],
  onStatusChange?: (status: ExecutionPanelProps['status']) => void
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [steps, setSteps] = useState<ExecutionStep[]>(initialSteps);
  const [messages, setMessages] = useState<ExecutionMessage[]>(initialMessages);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  // Update local state when props change
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const connect = useCallback(() => {
    // Only connect when task is running
    if (status !== 'running') {
      return;
    }

    // Don't connect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${WS_URL}?taskId=${taskId}`);

      ws.onopen = () => {
        console.log('[WebSocket] Connected to execution stream');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);

          // Only process messages for our task
          if (data.taskId !== taskId) {
            return;
          }

          switch (data.type) {
            case 'step_update': {
              const stepUpdate = data.payload as ExecutionStep;
              setSteps((prev) => {
                const existingIndex = prev.findIndex((s) => s.id === stepUpdate.id);
                if (existingIndex >= 0) {
                  // Update existing step
                  const updated = [...prev];
                  updated[existingIndex] = {
                    ...stepUpdate,
                    startedAt: stepUpdate.startedAt ? new Date(stepUpdate.startedAt) : undefined,
                    completedAt: stepUpdate.completedAt ? new Date(stepUpdate.completedAt) : undefined,
                  };
                  return updated;
                } else {
                  // Add new step
                  return [
                    ...prev,
                    {
                      ...stepUpdate,
                      startedAt: stepUpdate.startedAt ? new Date(stepUpdate.startedAt) : undefined,
                      completedAt: stepUpdate.completedAt ? new Date(stepUpdate.completedAt) : undefined,
                    },
                  ];
                }
              });
              break;
            }

            case 'message': {
              const messageUpdate = data.payload as ExecutionMessage;
              setMessages((prev) => {
                // Avoid duplicates
                if (prev.some((m) => m.id === messageUpdate.id)) {
                  return prev;
                }
                return [
                  ...prev,
                  {
                    ...messageUpdate,
                    timestamp: new Date(messageUpdate.timestamp),
                  },
                ];
              });
              break;
            }

            case 'status_change': {
              const statusUpdate = data.payload as { status: string };
              if (onStatusChange) {
                onStatusChange(statusUpdate.status as ExecutionPanelProps['status']);
              }
              break;
            }

            case 'error': {
              const errorUpdate = data.payload as { error: string };
              console.error('[WebSocket] Error:', errorUpdate.error);
              setMessages((prev) => [
                ...prev,
                {
                  id: `error-${Date.now()}`,
                  type: 'error',
                  content: errorUpdate.error,
                  timestamp: new Date(),
                },
              ]);
              break;
            }
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);

        // Attempt to reconnect if task is still running
        if (status === 'running' && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(`[WebSocket] Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      setIsConnected(false);
    }
  }, [taskId, status, onStatusChange]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Connect when task is running
  useEffect(() => {
    if (status === 'running') {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [status, connect, disconnect]);

  return {
    isConnected,
    steps,
    messages,
  };
};

// Mock browser preview component
const BrowserPreview: React.FC<{
  url?: string;
  status: ExecutionPanelProps['status'];
  isConnected?: boolean;
}> = ({ url, status, isConnected = false }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className={cn(
      'relative bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col',
      isFullscreen ? 'fixed inset-4 z-50' : 'h-full'
    )}>
      {/* Browser Chrome */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-b border-slate-700/50">
        {/* Window Controls */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>

        {/* URL Bar */}
        <div className="flex-1 flex items-center gap-2 mx-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700/50">
          {status === 'running' && (
            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          )}
          {status === 'completed' && (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          )}
          {status === 'failed' && (
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          )}
          {status === 'idle' && (
            <Globe className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span className="text-xs text-slate-400 truncate">
            {url || 'about:blank'}
          </span>
          {url && (
            <button className="ml-auto p-1 hover:bg-slate-700/50 rounded">
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </button>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-1.5 rounded hover:bg-slate-700/50 transition-colors"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-slate-400" />
          ) : (
            <Maximize2 className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* Browser Content */}
      <div className="flex-1 flex items-center justify-center bg-slate-950 relative">
        {status === 'idle' ? (
          <div className="text-center px-6">
            <Globe className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Browser preview will appear here</p>
            <p className="text-slate-600 text-xs mt-1">Start the task to see the agent in action</p>
          </div>
        ) : (
          <>
            {/* Simulated browser content - would be actual preview in production */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {status === 'running' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-32 h-32 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                  </motion.div>
                )}
                <Bot className={cn(
                  'w-16 h-16',
                  status === 'running' ? 'text-emerald-400' :
                  status === 'completed' ? 'text-blue-400' :
                  status === 'failed' ? 'text-red-400' : 'text-slate-600'
                )} />
              </div>
            </div>

            {/* Live indicator with WebSocket status */}
            {status === 'running' && (
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {/* LIVE Badge */}
                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-xs text-red-400 font-medium">LIVE</span>
                </div>
                {/* WebSocket Connection Status */}
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-full border',
                    isConnected
                      ? 'bg-emerald-500/20 border-emerald-500/30'
                      : 'bg-slate-700/50 border-slate-600/30'
                  )}
                  title={isConnected ? 'WebSocket connected' : 'WebSocket disconnected (using fallback)'}
                >
                  {isConnected ? (
                    <Wifi className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-slate-500" />
                  )}
                  <span className={cn(
                    'text-xs font-medium',
                    isConnected ? 'text-emerald-400' : 'text-slate-500'
                  )}>
                    {isConnected ? 'WS' : 'OFF'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  taskId,
  taskName,
  status,
  browserUrl,
  steps: initialSteps,
  messages: initialMessages,
  onStart,
  onPause,
  onStop,
  onRestart,
  onSendMessage,
  onStatusChange,
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'steps' | 'log'>('steps');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocket integration for real-time updates
  const { isConnected, steps, messages } = useExecutionWebSocket(
    taskId,
    status,
    initialSteps,
    initialMessages,
    onStatusChange
  );

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const getStepIcon = (stepStatus: ExecutionStep['status']) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Circle className="w-4 h-4 text-slate-600" />;
    }
  };

  const getMessageIcon = (type: ExecutionMessage['type']) => {
    switch (type) {
      case 'thought':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'action':
        return <ArrowRight className="w-4 h-4 text-blue-400" />;
      case 'observation':
        return <Eye className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'user':
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      default:
        return null;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px] lg:h-[600px]', className)}>
      {/* Left Panel: Browser Preview */}
      <div className="flex flex-col">
        <BrowserPreview url={browserUrl} status={status} isConnected={isConnected} />
      </div>

      {/* Right Panel: Activity Log */}
      <div className="flex flex-col bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Header with Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-medium text-white text-sm">{taskName}</h3>
              <span className={cn(
                'text-xs',
                status === 'running' ? 'text-emerald-400' :
                status === 'completed' ? 'text-blue-400' :
                status === 'failed' ? 'text-red-400' :
                status === 'paused' ? 'text-yellow-400' : 'text-slate-500'
              )}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {status === 'idle' && (
              <button
                onClick={onStart}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                aria-label="Start task execution"
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                Start
              </button>
            )}
            {status === 'running' && (
              <>
                <button
                  onClick={onPause}
                  className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition-colors"
                  aria-label="Pause execution"
                >
                  <Pause className="w-4 h-4" />
                </button>
                <button
                  onClick={onStop}
                  className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  aria-label="Stop execution"
                >
                  <Square className="w-4 h-4" />
                </button>
              </>
            )}
            {status === 'paused' && (
              <>
                <button
                  onClick={onStart}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                  aria-label="Resume task execution"
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  Resume
                </button>
                <button
                  onClick={onStop}
                  className="p-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                  aria-label="Stop execution"
                >
                  <Square className="w-4 h-4" />
                </button>
              </>
            )}
            {(status === 'completed' || status === 'failed') && (
              <button
                onClick={onRestart}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                aria-label="Restart task"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Restart
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 pt-3" role="tablist" aria-label="Execution view">
          <button
            onClick={() => setActiveTab('steps')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'steps'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            )}
            role="tab"
            aria-selected={activeTab === 'steps'}
            aria-controls="steps-panel"
          >
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
            Steps
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'log'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            )}
            role="tab"
            aria-selected={activeTab === 'log'}
            aria-controls="log-panel"
          >
            <Terminal className="w-4 h-4" aria-hidden="true" />
            Log
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {activeTab === 'steps' ? (
              <motion.div
                key="steps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
                role="tabpanel"
                id="steps-panel"
                aria-labelledby="steps-tab"
              >
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg transition-colors',
                      step.status === 'running' ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getStepIcon(step.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        'text-sm font-medium',
                        step.status === 'completed' ? 'text-slate-400' :
                        step.status === 'running' ? 'text-white' :
                        step.status === 'failed' ? 'text-red-400' : 'text-slate-500'
                      )}>
                        {step.label}
                      </div>
                      {step.details && (
                        <div className="text-xs text-slate-500 mt-0.5">{step.details}</div>
                      )}
                      {step.startedAt && (
                        <div className="text-xs text-slate-600 mt-1">
                          Started: {formatTime(step.startedAt)}
                          {step.completedAt && ` • Duration: ${Math.round((step.completedAt.getTime() - step.startedAt.getTime()) / 1000)}s`}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {steps.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No steps yet. Start the task to begin.
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="log"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2 font-mono text-sm"
                role="tabpanel"
                id="log-panel"
                aria-labelledby="log-tab"
              >
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'flex items-start gap-2 py-1.5',
                      message.type === 'error' && 'text-red-400'
                    )}
                  >
                    <span className="flex-shrink-0 mt-0.5">
                      {getMessageIcon(message.type)}
                    </span>
                    <span className={cn(
                      message.type === 'thought' ? 'text-purple-300' :
                      message.type === 'action' ? 'text-blue-300' :
                      message.type === 'observation' ? 'text-emerald-300' :
                      message.type === 'error' ? 'text-red-300' :
                      message.type === 'user' ? 'text-cyan-300' : 'text-slate-300'
                    )}>
                      {message.content}
                    </span>
                    <span className="flex-shrink-0 text-slate-600 text-xs ml-auto">
                      {formatTime(message.timestamp)}
                    </span>
                  </motion.div>
                ))}

                {messages.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    Log output will appear here
                  </div>
                )}

                <div ref={messagesEndRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Command Input */}
        <div className="p-3 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <label htmlFor="agent-message-input" className="sr-only">Send message to agent</label>
            <input
              id="agent-message-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Send a message to the agent..."
              disabled={status === 'idle' || status === 'completed' || status === 'failed'}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || status === 'idle' || status === 'completed' || status === 'failed'}
              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionPanel;
