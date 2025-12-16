/**
 * Enhanced Browser Live View Component
 *
 * World-class browser viewing with:
 * - Action overlay showing current agent action
 * - Real-time action timeline synchronized with browser
 * - Picture-in-Picture mode for multi-tasking
 * - Action history with replay indicators
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Monitor,
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MousePointer2,
  Type,
  Navigation,
  Search,
  Clock,
  Play,
  Pause,
  ChevronRight,
  Settings,
  PictureInPicture2,
  Crosshair,
  Hand,
} from 'lucide-react';

// ========================================
// TYPES
// ========================================

export interface BrowserAction {
  id: string;
  type: 'click' | 'type' | 'navigate' | 'scroll' | 'wait' | 'extract' | 'screenshot' | 'custom';
  description: string;
  selector?: string;
  value?: string;
  timestamp: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  duration?: number;
}

interface EnhancedBrowserLiveViewProps {
  debugUrl?: string;
  sessionId?: string;
  isActive?: boolean;
  currentAction?: BrowserAction;
  actionHistory?: BrowserAction[];
  className?: string;
  onActionClick?: (action: BrowserAction) => void;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function getActionIcon(type: BrowserAction['type']) {
  switch (type) {
    case 'click':
      return <MousePointer2 className="h-3.5 w-3.5" />;
    case 'type':
      return <Type className="h-3.5 w-3.5" />;
    case 'navigate':
      return <Navigation className="h-3.5 w-3.5" />;
    case 'scroll':
      return <Hand className="h-3.5 w-3.5" />;
    case 'extract':
      return <Search className="h-3.5 w-3.5" />;
    case 'wait':
      return <Clock className="h-3.5 w-3.5" />;
    case 'screenshot':
      return <Monitor className="h-3.5 w-3.5" />;
    default:
      return <Crosshair className="h-3.5 w-3.5" />;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getStatusColor(status: BrowserAction['status']): string {
  switch (status) {
    case 'executing':
      return 'bg-purple-500 animate-pulse';
    case 'completed':
      return 'bg-emerald-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-gray-300';
  }
}

// ========================================
// ACTION OVERLAY COMPONENT
// ========================================

interface ActionOverlayProps {
  action: BrowserAction;
  isVisible: boolean;
}

function ActionOverlay({ action, isVisible }: ActionOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
      {/* Gradient fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

      {/* Action info */}
      <div className="relative p-4">
        <div className="flex items-center gap-3">
          {/* Action icon with pulse */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 shadow-lg shadow-purple-500/30">
            <div className="text-white animate-pulse">
              {getActionIcon(action.type)}
            </div>
          </div>

          {/* Action details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium truncate">
                {action.description}
              </span>
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-white/30 text-xs"
              >
                {action.type}
              </Badge>
            </div>
            {action.selector && (
              <div className="flex items-center gap-1.5 mt-1">
                <Crosshair className="h-3 w-3 text-white/60" />
                <code className="text-xs text-white/70 font-mono truncate max-w-[300px]">
                  {action.selector}
                </code>
              </div>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(action.status)}`} />
            {action.duration && (
              <span className="text-xs text-white/70">
                {formatDuration(action.duration)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ACTION TIMELINE COMPONENT
// ========================================

interface ActionTimelineProps {
  actions: BrowserAction[];
  currentActionId?: string;
  onActionClick?: (action: BrowserAction) => void;
}

function ActionTimeline({ actions, currentActionId, onActionClick }: ActionTimelineProps) {
  return (
    <ScrollArea className="h-[200px]">
      <div className="p-3 space-y-2">
        {actions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No actions recorded yet
          </div>
        ) : (
          actions.map((action, idx) => {
            const isCurrent = action.id === currentActionId;
            return (
              <div
                key={action.id}
                className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-purple-100 border border-purple-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onActionClick?.(action)}
              >
                {/* Timeline indicator */}
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(action.status)}`} />
                  {idx < actions.length - 1 && (
                    <div className="w-px h-full min-h-[20px] bg-gray-200" />
                  )}
                </div>

                {/* Action content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">
                      {getActionIcon(action.type)}
                    </div>
                    <span className={`text-sm truncate ${isCurrent ? 'font-medium' : ''}`}>
                      {action.description}
                    </span>
                  </div>
                  {action.selector && (
                    <code className="text-xs text-muted-foreground font-mono truncate block mt-0.5">
                      {action.selector}
                    </code>
                  )}
                </div>

                {/* Duration */}
                {action.duration && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDuration(action.duration)}
                  </span>
                )}

                {/* Current indicator */}
                {isCurrent && (
                  <ChevronRight className="h-4 w-4 text-purple-600 shrink-0" />
                )}
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================

export function EnhancedBrowserLiveView({
  debugUrl,
  sessionId,
  isActive = true,
  currentAction,
  actionHistory = [],
  className = '',
  onActionClick,
}: EnhancedBrowserLiveViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [isPiP, setIsPiP] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debugUrl) {
      setIsLoading(true);
    }
  }, [debugUrl]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setIsLoading(true);
  }, []);

  const handleOpenExternal = useCallback(() => {
    if (debugUrl) {
      window.open(debugUrl, '_blank');
    }
  }, [debugUrl]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    setIsPiP(false);
  }, []);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const toggleOverlay = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  const toggleTimeline = useCallback(() => {
    setShowTimeline((prev) => !prev);
  }, []);

  const togglePiP = useCallback(() => {
    setIsPiP((prev) => !prev);
    if (!isPiP) {
      setIsFullscreen(false);
    }
  }, [isPiP]);

  // Empty state
  if (!debugUrl) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Browser Live View
          </CardTitle>
          <CardDescription>
            Live browser session will appear here when agent starts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-lg">
            <Monitor className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-muted-foreground">No active browser session</p>
            <p className="text-xs text-muted-foreground mt-1">
              Session will appear when agent creates a browser
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Picture-in-Picture mode
  if (isPiP) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 shadow-2xl rounded-lg overflow-hidden border border-gray-200">
        <div className="bg-gray-900 text-white px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="text-sm font-medium">Live View</span>
            {isActive && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePiP}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="relative h-48 bg-gray-800">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <iframe
            key={refreshKey}
            src={debugUrl}
            className="w-full h-full border-0"
            title="Browser Live View"
            onLoad={handleIframeLoad}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
          {/* Mini action overlay */}
          {currentAction && showOverlay && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
              <div className="flex items-center gap-2 text-white text-xs">
                {getActionIcon(currentAction.type)}
                <span className="truncate">{currentAction.description}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card
      ref={containerRef}
      className={`${className} ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              <CardTitle className="text-base">Browser Live View</CardTitle>
            </div>
            {isActive && (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </Badge>
            )}
            {currentAction && (
              <Badge variant="secondary" className="text-xs">
                {currentAction.type}: {currentAction.description.substring(0, 30)}
                {currentAction.description.length > 30 ? '...' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleOverlay}
              title={showOverlay ? 'Hide overlay' : 'Show overlay'}
              className={showOverlay ? 'bg-purple-100' : ''}
            >
              <Crosshair className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTimeline}
              title={showTimeline ? 'Hide timeline' : 'Show timeline'}
              className={showTimeline ? 'bg-purple-100' : ''}
            >
              <Clock className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVisibility}
              title={isVisible ? 'Hide view' : 'Show view'}
            >
              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePiP}
              title="Picture-in-Picture mode"
            >
              <PictureInPicture2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              title="Refresh view"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenExternal}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {sessionId && (
          <CardDescription className="text-xs">
            Session: {sessionId}
          </CardDescription>
        )}
      </CardHeader>

      {isVisible && (
        <CardContent className="p-0">
          <div className={`flex ${isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-[500px]'}`}>
            {/* Browser iframe with overlay */}
            <div className="relative flex-1 bg-gray-100">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <p className="text-sm text-muted-foreground">Loading browser view...</p>
                  </div>
                </div>
              )}
              <iframe
                ref={iframeRef}
                key={refreshKey}
                src={debugUrl}
                className="w-full h-full border-0"
                title="Browser Live View"
                onLoad={handleIframeLoad}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                allow="fullscreen"
              />

              {/* Action overlay */}
              {currentAction && (
                <ActionOverlay action={currentAction} isVisible={showOverlay} />
              )}
            </div>

            {/* Action timeline sidebar */}
            {showTimeline && (
              <div className="w-72 border-l bg-white flex flex-col">
                <div className="px-3 py-2 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Action Timeline</h4>
                    <Badge variant="secondary" className="text-xs">
                      {actionHistory.length}
                    </Badge>
                  </div>
                </div>
                <ActionTimeline
                  actions={actionHistory}
                  currentActionId={currentAction?.id}
                  onActionClick={onActionClick}
                />
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ========================================
// SSE INTEGRATION HOOK
// ========================================

export function useBrowserActions(executionId: string): {
  currentAction: BrowserAction | undefined;
  actionHistory: BrowserAction[];
  debugUrl: string | undefined;
  sessionId: string | undefined;
  isConnected: boolean;
} {
  const [currentAction, setCurrentAction] = useState<BrowserAction>();
  const [actionHistory, setActionHistory] = useState<BrowserAction[]>([]);
  const [debugUrl, setDebugUrl] = useState<string>();
  const [sessionId, setSessionId] = useState<string>();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!executionId) return;

    const eventSource = new EventSource(`/api/agent/executions/${executionId}/events`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener('browser:session', (event) => {
      try {
        const data = JSON.parse(event.data);
        setDebugUrl(data.debugUrl);
        setSessionId(data.sessionId);
      } catch (e) {
        console.error('Failed to parse browser:session event:', e);
      }
    });

    eventSource.addEventListener('tool:start', (event) => {
      try {
        const data = JSON.parse(event.data);
        const action: BrowserAction = {
          id: `${Date.now()}-${Math.random()}`,
          type: inferActionType(data.toolName),
          description: formatActionDescription(data.toolName, data.params),
          selector: data.params?.selector,
          value: data.params?.text || data.params?.url,
          timestamp: Date.now(),
          status: 'executing',
        };
        setCurrentAction(action);
        setActionHistory((prev) => [...prev, action]);
      } catch (e) {
        console.error('Failed to parse tool:start event:', e);
      }
    });

    eventSource.addEventListener('tool:complete', (event) => {
      try {
        const data = JSON.parse(event.data);
        setActionHistory((prev) => {
          const updated = [...prev];
          const lastAction = updated[updated.length - 1];
          if (lastAction && lastAction.status === 'executing') {
            lastAction.status = data.result?.error ? 'failed' : 'completed';
            lastAction.duration = data.duration;
          }
          return updated;
        });
        setCurrentAction(undefined);
      } catch (e) {
        console.error('Failed to parse tool:complete event:', e);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [executionId]);

  return { currentAction, actionHistory, debugUrl, sessionId, isConnected };
}

// Helper functions for action parsing
function inferActionType(toolName: string): BrowserAction['type'] {
  if (toolName.includes('click')) return 'click';
  if (toolName.includes('type') || toolName.includes('fill')) return 'type';
  if (toolName.includes('navigate') || toolName.includes('goto')) return 'navigate';
  if (toolName.includes('scroll')) return 'scroll';
  if (toolName.includes('extract')) return 'extract';
  if (toolName.includes('wait')) return 'wait';
  if (toolName.includes('screenshot')) return 'screenshot';
  return 'custom';
}

function formatActionDescription(toolName: string, params: any): string {
  if (params?.text) return `Type: "${params.text.substring(0, 50)}..."`;
  if (params?.url) return `Navigate to ${params.url}`;
  if (params?.selector) return `${toolName} on ${params.selector}`;
  return toolName.replace(/_/g, ' ');
}

export default EnhancedBrowserLiveView;
