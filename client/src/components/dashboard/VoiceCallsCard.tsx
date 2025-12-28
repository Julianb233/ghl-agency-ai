import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, FileText, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { CallHistoryWithTranscript, VoiceTranscriptPanel } from '@/components/leads';
import type { TranscriptSegment } from '@/components/leads';

interface RecentCall {
  id: string;
  leadName: string;
  phoneNumber: string;
  status: 'completed' | 'failed' | 'in_progress' | 'no_answer';
  duration: number;
  outcome?: string;
  timestamp: Date;
  recordingUrl?: string;
  transcript?: string;
  transcriptSegments?: TranscriptSegment[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  keywords?: string[];
}

interface VoiceCallsCardProps {
  recentCalls?: RecentCall[];
  totalCalls?: number;
  completedCalls?: number;
  averageDuration?: number;
}

export const VoiceCallsCard: React.FC<VoiceCallsCardProps> = ({
  recentCalls = [],
  totalCalls = 0,
  completedCalls = 0,
  averageDuration = 0
}) => {
  const [, setLocation] = useLocation();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (sentiment?: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'negative':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'neutral':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: RecentCall['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'no_answer':
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <CardTitle>Voice Calls</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/campaigns')}
            className="text-primary"
          >
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Recent AI-powered voice interactions</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Calls</p>
            <p className="text-2xl font-bold">{totalCalls}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Completed</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{completedCalls}</p>
              {totalCalls > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({Math.round((completedCalls / totalCalls) * 100)}%)
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg Duration</p>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{formatDuration(averageDuration)}</p>
            </div>
          </div>
        </div>

        {/* Recent Calls */}
        {recentCalls.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Recent Activity</h4>
            {recentCalls.slice(0, 3).map((call) => (
              <div
                key={call.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setLocation('/campaigns')}
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(call.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{call.leadName}</p>
                    {call.sentiment && (
                      <Badge variant="outline" className={`text-xs ${getSentimentColor(call.sentiment)}`}>
                        {call.sentiment}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{call.phoneNumber}</p>
                  {call.outcome && (
                    <p className="text-xs text-primary mt-1">{call.outcome}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="text-xs text-muted-foreground">{formatDuration(call.duration)}</p>
                  {call.transcriptSegments && (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No calls yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setLocation('/campaigns')}
            >
              Start Campaign
            </Button>
          </div>
        )}

        {/* Quick Action */}
        {recentCalls.length > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation('/campaigns')}
          >
            <FileText className="mr-2 h-4 w-4" />
            View All Transcripts
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Example with mock data
export const VoiceCallsCardExample: React.FC = () => {
  const mockCalls: RecentCall[] = [
    {
      id: '1',
      leadName: 'John Smith',
      phoneNumber: '+1 (555) 123-4567',
      status: 'completed',
      duration: 245,
      outcome: 'Meeting Booked',
      timestamp: new Date(Date.now() - 3600000),
      sentiment: 'positive',
      keywords: ['interested', 'meeting', 'next week'],
      transcriptSegments: [
        {
          id: 'seg-1',
          speaker: 'agent',
          text: 'Hello, this is Sarah from ABC Company.',
          timestamp: 0,
          duration: 3,
          confidence: 0.95
        }
      ]
    },
    {
      id: '2',
      leadName: 'Jane Doe',
      phoneNumber: '+1 (555) 987-6543',
      status: 'completed',
      duration: 180,
      outcome: 'Follow-up Required',
      timestamp: new Date(Date.now() - 7200000),
      sentiment: 'neutral',
      keywords: ['callback', 'busy'],
      transcriptSegments: []
    },
    {
      id: '3',
      leadName: 'Bob Johnson',
      phoneNumber: '+1 (555) 456-7890',
      status: 'no_answer',
      duration: 30,
      timestamp: new Date(Date.now() - 10800000),
      sentiment: undefined
    }
  ];

  return (
    <div className="p-4 max-w-md">
      <VoiceCallsCard
        recentCalls={mockCalls}
        totalCalls={15}
        completedCalls={12}
        averageDuration={195}
      />
    </div>
  );
};
