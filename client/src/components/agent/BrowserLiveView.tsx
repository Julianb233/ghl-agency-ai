/**
 * Browser Live View Component
 *
 * Embeds the Browserbase debug URL in an iframe for live browser viewing.
 * Shows the agent's browser session in real-time.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Monitor,
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

interface BrowserLiveViewProps {
  debugUrl?: string;
  sessionId?: string;
  isActive?: boolean;
  className?: string;
}

export function BrowserLiveView({
  debugUrl,
  sessionId,
  isActive = true,
  className = '',
}: BrowserLiveViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (debugUrl) {
      setIsLoading(true);
    }
  }, [debugUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    setIsLoading(true);
  };

  const handleOpenExternal = () => {
    if (debugUrl) {
      window.open(debugUrl, '_blank');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev);
  };

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

  return (
    <Card
      className={`${className} ${
        isFullscreen
          ? 'fixed inset-4 z-50 shadow-2xl'
          : ''
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
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVisibility}
              title={isVisible ? 'Hide view' : 'Show view'}
            >
              {isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
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
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
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
          <div
            className={`relative bg-gray-100 ${
              isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-[500px]'
            }`}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  <p className="text-sm text-muted-foreground">Loading browser view...</p>
                </div>
              </div>
            )}
            <iframe
              key={refreshKey}
              src={debugUrl}
              className="w-full h-full border-0 rounded-b-lg"
              title="Browser Live View"
              onLoad={handleIframeLoad}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              allow="fullscreen"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
