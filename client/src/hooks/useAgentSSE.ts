/**
 * useAgentSSE Hook
 *
 * React hook for connecting to agent SSE (Server-Sent Events) stream.
 * Provides real-time updates for agent execution status.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAgentStore } from '@/stores/agentStore';

interface SSEMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp?: string;
}

interface UseAgentSSEOptions {
  autoConnect?: boolean;
  sessionId?: string;
}

export function useAgentSSE(options: UseAgentSSEOptions = {}) {
  const { autoConnect = true, sessionId } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const { setStatus, addLog, setConnectedAgents, handleSSEEvent } = useAgentStore();

  const connect = useCallback((sid?: string) => {
    const targetSessionId = sid || sessionId;
    if (!targetSessionId) {
      // Connect to general agent stream
      const es = new EventSource('/api/agent/stream');

      es.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      es.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('[SSE] Failed to parse message:', e);
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        setError('Connection lost');
        es.close();
      };

      setEventSource(es);
      return;
    }

    // Connect to session-specific stream
    const es = new EventSource(`/api/agent/stream/${targetSessionId}`);

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (e) {
        console.error('[SSE] Failed to parse message:', e);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      setError('Connection lost');
      es.close();
    };

    setEventSource(es);
  }, [sessionId]);

  const disconnect = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setIsConnected(false);
    }
  }, [eventSource]);

  const handleMessage = (message: SSEMessage) => {
    const timestamp = message.timestamp || new Date().toLocaleTimeString();

    switch (message.type) {
      case 'connected':
        addLog({
          id: crypto.randomUUID(),
          timestamp,
          level: 'system',
          message: 'Connected to agent stream',
        });
        break;

      case 'status':
        setStatus(message.data?.status || 'idle');
        break;

      case 'task_started':
        setStatus('executing');
        addLog({
          id: crypto.randomUUID(),
          timestamp,
          level: 'info',
          message: 'Task started',
          detail: message.data?.task,
        });
        break;

      case 'task_completed':
        setStatus('completed');
        addLog({
          id: crypto.randomUUID(),
          timestamp,
          level: 'success',
          message: 'Task completed',
          detail: message.message,
        });
        break;

      case 'task_failed':
        setStatus('failed');
        addLog({
          id: crypto.randomUUID(),
          timestamp,
          level: 'error',
          message: 'Task failed',
          detail: message.message,
        });
        break;

      case 'step':
        addLog({
          id: crypto.randomUUID(),
          timestamp,
          level: 'info',
          message: message.data?.action || 'Executing step',
          detail: message.data?.detail,
        });
        break;

      case 'tool_call':
        addLog({
          id: crypto.randomUUID(),
          timestamp,
          level: 'info',
          message: `Tool: ${message.data?.tool}`,
          detail: message.data?.args ? JSON.stringify(message.data.args) : undefined,
        });
        break;

      case 'tool_result':
        addLog({
          id: crypto.randomUUID(),
          timestamp,
          level: 'success',
          message: 'Tool completed',
          detail: message.data?.result?.substring(0, 100),
        });
        break;

      case 'thought':
        addLog({
          id: crypto.randomUUID(),
          timestamp,
          level: 'system',
          message: 'Agent thinking',
          detail: message.data?.thought,
        });
        break;

      case 'swarm_update':
        setConnectedAgents(message.data?.agentCount || 0);
        break;

      case 'progress':
      case 'reasoning':
      case 'browser:session':
      case 'execution:started':
      case 'plan:created':
      case 'phase:start':
      case 'phase:complete':
      case 'execution:complete':
      case 'execution:error':
        // Handle all these events through the store's central handler
        handleSSEEvent({
          type: message.type,
          data: message.data || message,
        });
        break;

      case 'error':
        addLog({
          id: crypto.randomUUID(),
          timestamp,
          level: 'error',
          message: message.message || 'An error occurred',
        });
        break;

      default:
        // Log unknown message types for debugging
        console.log('[SSE] Unknown message type:', message.type);
    }
  };

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
  };
}

// Re-export useAgentExecution for convenience
export { useAgentExecution } from './useAgentExecution';
