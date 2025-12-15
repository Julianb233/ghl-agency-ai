/**
 * Session Replay Player Component
 * Displays Browserbase session recordings using rrweb-player
 *
 * PLACEHOLDER: Install rrweb-player package
 * Run: pnpm add rrweb-player rrweb
 */

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Spinner } from './ui/spinner';
import { Alert, AlertDescription } from './ui/alert';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

interface SessionReplayPlayerProps {
  sessionId: string;
  events?: any[]; // rrweb events
  width?: number | string;
  height?: number | string;
  autoPlay?: boolean;
  skipInactive?: boolean;
  showController?: boolean;
}

export function SessionReplayPlayer({
  sessionId,
  events = [],
  width = 1024,
  height = 576,
  autoPlay = false,
  skipInactive = true,
  showController = true,
}: SessionReplayPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerRef.current || events.length === 0) {
      return;
    }

    // Cleanup previous player instance
    if (playerRef.current.innerHTML !== '') {
      playerRef.current.innerHTML = '';
    }

    try {
      // Calculate actual dimensions if strings are provided
      const containerWidth = typeof width === 'number' ? width : playerRef.current.offsetWidth;
      const containerHeight = typeof height === 'number' ? height : playerRef.current.offsetHeight;

      // Initialize rrweb player
      const rrwebPlayerInstance = new rrwebPlayer({
        target: playerRef.current,
        props: {
          events,
          width: containerWidth,
          height: containerHeight,
          skipInactive,
          showController,
          autoPlay,
        },
      });

      // Add event listeners
      rrwebPlayerInstance.addEventListener('play', () => {
        console.log('Playback started');
        setIsPlaying(true);
      });

      rrwebPlayerInstance.addEventListener('pause', () => {
        console.log('Playback paused');
        setIsPlaying(false);
      });

      rrwebPlayerInstance.addEventListener('finish', () => {
        console.log('Playback finished');
        setIsPlaying(false);
      });

      setPlayer(rrwebPlayerInstance);

      return () => {
        // Cleanup is handled by clearing innerHTML above or we can try to destroy if method exists
        // rrwebPlayerInstance.destroy(); 
      };
    } catch (err) {
      console.error('Failed to initialize rrweb player:', err);
      setError(err instanceof Error ? err.message : 'Failed to load replay');
      return undefined;
    }
  }, [events, width, height, skipInactive, showController, autoPlay]);

  const handlePlay = () => {
    if (player) {
      player.play();
    }
  };

  const handlePause = () => {
    if (player) {
      player.pause();
    }
  };

  const handleJumpTo = (time: number) => {
    if (player) {
      player.goto(time);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Session Replay</CardTitle>
          <CardDescription>Session ID: {sessionId}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Spinner className="mb-4" />
            <p className="text-sm text-muted-foreground">
              Waiting for session recording... Replays typically become available ~30 seconds after session closure.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Replay</CardTitle>
        <CardDescription>
          Session ID: {sessionId} | {events.length} events recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={playerRef}
          className="border rounded-lg overflow-hidden bg-gray-50"
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height
          }}
        />

        {/* Custom playback controls if default controller is hidden */}
        {!showController && (
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleJumpTo(0)}
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            {isPlaying ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
              >
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlay}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleJumpTo(5000)}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Alert className="mt-4">
          <AlertDescription className="text-xs">
            <strong>Note:</strong> Session replays are designed for single-tab workflows only.
            Multi-tab recordings may be unreliable.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

/**
 * Alternative iframe-based player for simpler integration
 */
export function SessionReplayIframe({
  sessionId
}: {
  sessionId: string
}) {
  return (
    <div className="w-full">
      <iframe
        src={`/replay/${sessionId}`}
        width="100%"
        height="600px"
        className="border rounded-lg"
        allow="fullscreen"
        title={`Session Replay ${sessionId}`}
      />
      <p className="text-xs text-muted-foreground mt-2">
        PLACEHOLDER: Create /replay/:sessionId route that initializes rrweb player
      </p>
    </div>
  );
}
