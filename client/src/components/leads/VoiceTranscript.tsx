import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  Search,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Bot,
  FileText,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface TranscriptSegment {
  id: string;
  speaker: 'agent' | 'lead' | 'system';
  text: string;
  timestamp: number; // seconds from start
  duration: number; // duration in seconds
  confidence?: number; // 0-1 confidence score
}

export interface VoiceTranscriptData {
  id: string;
  callId: string;
  leadName: string;
  phoneNumber: string;
  duration: number; // total duration in seconds
  recordingUrl?: string;
  transcript: TranscriptSegment[];
  metadata?: {
    callDate: Date;
    outcome?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    keywords?: string[];
  };
}

interface VoiceTranscriptProps {
  data: VoiceTranscriptData;
  onClose?: () => void;
  autoPlay?: boolean;
}

export const VoiceTranscript: React.FC<VoiceTranscriptProps> = ({
  data,
  onClose,
  autoPlay = false
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(data.duration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [highlightedSegments, setHighlightedSegments] = useState<Set<string>>(new Set());
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Initialize audio element if recording URL exists
  useEffect(() => {
    if (data.recordingUrl && !audioRef.current) {
      const audio = new Audio(data.recordingUrl);
      audio.volume = volume;
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        updateActiveSegment(audio.currentTime);
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });

      if (autoPlay) {
        audio.play().catch(console.error);
      }

      return () => {
        audio.pause();
        audio.src = '';
      };
    }
    return undefined;
  }, [data.recordingUrl]);

  // Update active segment based on current time
  const updateActiveSegment = (time: number) => {
    const segment = data.transcript.find(
      seg => time >= seg.timestamp && time <= seg.timestamp + seg.duration
    );
    if (segment && segment.id !== activeSegmentId) {
      setActiveSegmentId(segment.id);
      // Auto-scroll to active segment
      const element = segmentRefs.current.get(segment.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matches = new Set(
        data.transcript
          .filter(seg => seg.text.toLowerCase().includes(query))
          .map(seg => seg.id)
      );
      setHighlightedSegments(matches);
    } else {
      setHighlightedSegments(new Set());
    }
  }, [searchQuery, data.transcript]);

  // Playback controls
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipBackward = () => {
    handleSeek(Math.max(0, currentTime - 10));
  };

  const skipForward = () => {
    handleSeek(Math.min(duration, currentTime + 10));
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  // Jump to specific segment
  const jumpToSegment = (segment: TranscriptSegment) => {
    handleSeek(segment.timestamp);
    if (!isPlaying && audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  // Export transcript
  const exportTranscript = () => {
    const transcriptText = data.transcript
      .map(seg => {
        const time = formatTime(seg.timestamp);
        const speaker = seg.speaker.toUpperCase();
        return `[${time}] ${speaker}: ${seg.text}`;
      })
      .join('\n\n');

    const metadata = data.metadata
      ? `Call Details:
Lead: ${data.leadName}
Phone: ${data.phoneNumber}
Date: ${data.metadata.callDate.toLocaleString()}
Duration: ${formatTime(data.duration)}
Outcome: ${data.metadata.outcome || 'N/A'}

---

`
      : '';

    const fullText = metadata + transcriptText;

    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${data.leadName.replace(/\s+/g, '-')}-${data.callId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy transcript to clipboard
  const copyToClipboard = () => {
    const text = data.transcript.map(seg => `${seg.speaker}: ${seg.text}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get speaker icon and color
  const getSpeakerStyle = (speaker: TranscriptSegment['speaker']) => {
    switch (speaker) {
      case 'agent':
        return {
          icon: <Bot className="h-4 w-4" />,
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgLight: 'bg-blue-50',
          border: 'border-blue-200'
        };
      case 'lead':
        return {
          icon: <User className="h-4 w-4" />,
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgLight: 'bg-green-50',
          border: 'border-green-200'
        };
      case 'system':
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgLight: 'bg-gray-50',
          border: 'border-gray-200'
        };
      default:
        return {
          icon: <User className="h-4 w-4" />,
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgLight: 'bg-gray-50',
          border: 'border-gray-200'
        };
    }
  };

  // Highlight search matches
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 font-semibold">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">Voice Transcript</CardTitle>
              {data.metadata?.sentiment && (
                <Badge
                  variant="outline"
                  className={cn(
                    data.metadata.sentiment === 'positive' && 'bg-green-50 text-green-700 border-green-200',
                    data.metadata.sentiment === 'neutral' && 'bg-gray-50 text-gray-700 border-gray-200',
                    data.metadata.sentiment === 'negative' && 'bg-red-50 text-red-700 border-red-200'
                  )}
                >
                  {data.metadata.sentiment}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-2">
              <div className="flex flex-col gap-1">
                <span className="font-medium">{data.leadName}</span>
                <span className="text-sm">{data.phoneNumber}</span>
                {data.metadata?.callDate && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(data.metadata.callDate, { addSuffix: true })}
                  </span>
                )}
              </div>
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={exportTranscript}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {highlightedSegments.size > 0 && (
          <div className="text-sm text-muted-foreground">
            Found {highlightedSegments.size} match{highlightedSegments.size !== 1 ? 'es' : ''}
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        {/* Audio Player */}
        {data.recordingUrl && (
          <div className="p-4 bg-muted/30">
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-12">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={skipBackward}>
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button variant="default" size="icon" onClick={togglePlayPause}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={skipForward}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={toggleMute}>
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Content */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {data.transcript.map((segment) => {
              const style = getSpeakerStyle(segment.speaker);
              const isActive = activeSegmentId === segment.id;
              const isHighlighted = highlightedSegments.has(segment.id);

              return (
                <div
                  key={segment.id}
                  ref={(el) => {
                    if (el) segmentRefs.current.set(segment.id, el);
                  }}
                  className={cn(
                    'flex gap-3 p-3 rounded-lg transition-all cursor-pointer hover:shadow-sm',
                    isActive && 'ring-2 ring-primary ring-offset-2',
                    isHighlighted && 'ring-2 ring-yellow-400 ring-offset-2',
                    style.bgLight,
                    style.border,
                    'border'
                  )}
                  onClick={() => jumpToSegment(segment)}
                >
                  {/* Speaker Icon */}
                  <div className={cn('rounded-full p-2 text-white shrink-0', style.color)}>
                    {style.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-sm font-semibold capitalize', style.textColor)}>
                        {segment.speaker}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(segment.timestamp)}
                      </span>
                      {segment.confidence && segment.confidence < 0.8 && (
                        <Badge variant="outline" className="text-xs">
                          Low Confidence
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {searchQuery ? highlightText(segment.text, searchQuery) : segment.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Metadata Footer */}
        {data.metadata && (
          <>
            <Separator />
            <div className="p-4 bg-muted/30">
              <div className="flex flex-wrap gap-4 text-sm">
                {data.metadata.outcome && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Outcome:</span>
                    <Badge variant="secondary">{data.metadata.outcome}</Badge>
                  </div>
                )}
                {data.metadata.keywords && data.metadata.keywords.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground">Keywords:</span>
                    {data.metadata.keywords.map((keyword, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Example usage component
export const VoiceTranscriptExample: React.FC = () => {
  const mockData: VoiceTranscriptData = {
    id: '1',
    callId: 'call-123',
    leadName: 'John Smith',
    phoneNumber: '+1 (555) 123-4567',
    duration: 245,
    recordingUrl: 'https://example.com/recording.mp3',
    transcript: [
      {
        id: 'seg-1',
        speaker: 'agent',
        text: 'Hello, this is Sarah from ABC Company. May I speak with John?',
        timestamp: 0,
        duration: 5,
        confidence: 0.95
      },
      {
        id: 'seg-2',
        speaker: 'lead',
        text: 'Yes, this is John speaking.',
        timestamp: 5,
        duration: 3,
        confidence: 0.98
      },
      {
        id: 'seg-3',
        speaker: 'agent',
        text: 'Great! I\'m calling today to discuss our new product offering that could help streamline your business operations.',
        timestamp: 8,
        duration: 7,
        confidence: 0.93
      },
      {
        id: 'seg-4',
        speaker: 'lead',
        text: 'Interesting. What kind of product are we talking about?',
        timestamp: 15,
        duration: 4,
        confidence: 0.96
      }
    ],
    metadata: {
      callDate: new Date(),
      outcome: 'Booked Meeting',
      sentiment: 'positive',
      keywords: ['product', 'business', 'operations']
    }
  };

  return (
    <div className="h-screen p-4">
      <VoiceTranscript data={mockData} autoPlay={false} />
    </div>
  );
};
