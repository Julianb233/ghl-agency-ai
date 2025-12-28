import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Phone } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  VoiceTranscript,
  CallHistoryWithTranscript,
  VoiceTranscriptPanel,
  type VoiceTranscriptData,
  type TranscriptSegment
} from '@/components/leads';
import { VoiceCallsCard } from '@/components/dashboard';

// Mock data for demonstrations
const mockTranscriptSegments: TranscriptSegment[] = [
  {
    id: 'seg-1',
    speaker: 'agent',
    text: 'Hello, this is Sarah from ABC Company. May I speak with John Smith?',
    timestamp: 0,
    duration: 5,
    confidence: 0.95
  },
  {
    id: 'seg-2',
    speaker: 'lead',
    text: 'Yes, this is John speaking. How can I help you?',
    timestamp: 5,
    duration: 3,
    confidence: 0.98
  },
  {
    id: 'seg-3',
    speaker: 'agent',
    text: 'Great! I\'m calling today to discuss our new product offering that could help streamline your business operations and reduce costs by up to 30%.',
    timestamp: 8,
    duration: 8,
    confidence: 0.93
  },
  {
    id: 'seg-4',
    speaker: 'lead',
    text: 'Interesting. What kind of product are we talking about exactly?',
    timestamp: 16,
    duration: 4,
    confidence: 0.96
  },
  {
    id: 'seg-5',
    speaker: 'agent',
    text: 'We offer an AI-powered automation platform that integrates with your existing systems. It handles repetitive tasks, manages workflows, and provides intelligent insights.',
    timestamp: 20,
    duration: 9,
    confidence: 0.94
  },
  {
    id: 'seg-6',
    speaker: 'lead',
    text: 'That sounds promising. We\'ve been looking for something like this. What\'s the implementation process like?',
    timestamp: 29,
    duration: 6,
    confidence: 0.97
  },
  {
    id: 'seg-7',
    speaker: 'agent',
    text: 'The implementation is quite straightforward. We provide a dedicated onboarding team, and most clients are fully operational within 2-3 weeks. Would you be interested in scheduling a demo?',
    timestamp: 35,
    duration: 10,
    confidence: 0.95
  },
  {
    id: 'seg-8',
    speaker: 'lead',
    text: 'Yes, I think a demo would be helpful. I\'d like to see it in action before making any decisions.',
    timestamp: 45,
    duration: 5,
    confidence: 0.98
  },
  {
    id: 'seg-9',
    speaker: 'agent',
    text: 'Perfect! I have availability next Tuesday at 2 PM or Wednesday at 10 AM. Which time works better for you?',
    timestamp: 50,
    duration: 6,
    confidence: 0.96
  },
  {
    id: 'seg-10',
    speaker: 'lead',
    text: 'Tuesday at 2 PM works great for me.',
    timestamp: 56,
    duration: 3,
    confidence: 0.99
  },
  {
    id: 'seg-11',
    speaker: 'agent',
    text: 'Excellent! I\'ve scheduled a demo for Tuesday, December 19th at 2 PM. You\'ll receive a calendar invite shortly with the meeting link. Is there anything specific you\'d like us to focus on during the demo?',
    timestamp: 59,
    duration: 12,
    confidence: 0.94
  },
  {
    id: 'seg-12',
    speaker: 'lead',
    text: 'Yes, I\'m particularly interested in the workflow automation and how it integrates with our CRM system.',
    timestamp: 71,
    duration: 6,
    confidence: 0.97
  },
  {
    id: 'seg-13',
    speaker: 'agent',
    text: 'Noted! We\'ll prepare a customized demo focusing on workflow automation and CRM integration. I\'ll also send over some relevant case studies. Thank you for your time, John!',
    timestamp: 77,
    duration: 10,
    confidence: 0.95
  },
  {
    id: 'seg-14',
    speaker: 'lead',
    text: 'Thank you, Sarah. Looking forward to the demo!',
    timestamp: 87,
    duration: 3,
    confidence: 0.98
  },
  {
    id: 'seg-15',
    speaker: 'system',
    text: 'Call ended. Total duration: 1 minute 30 seconds.',
    timestamp: 90,
    duration: 3,
    confidence: 1.0
  }
];

const mockTranscriptData: VoiceTranscriptData = {
  id: 'transcript-demo-1',
  callId: 'call-12345',
  leadName: 'John Smith',
  phoneNumber: '+1 (555) 123-4567',
  duration: 93,
  transcript: mockTranscriptSegments,
  metadata: {
    callDate: new Date(Date.now() - 3600000),
    outcome: 'Demo Scheduled',
    sentiment: 'positive',
    keywords: ['automation', 'workflow', 'CRM', 'demo', 'integration']
  }
};

const mockCalls = [
  {
    id: '1',
    leadName: 'John Smith',
    phoneNumber: '+1 (555) 123-4567',
    status: 'completed' as const,
    duration: 93,
    outcome: 'Demo Scheduled',
    timestamp: new Date(Date.now() - 3600000),
    transcriptSegments: mockTranscriptSegments,
    sentiment: 'positive' as const,
    keywords: ['automation', 'workflow', 'CRM']
  },
  {
    id: '2',
    leadName: 'Jane Doe',
    phoneNumber: '+1 (555) 987-6543',
    status: 'completed' as const,
    duration: 180,
    outcome: 'Callback Requested',
    timestamp: new Date(Date.now() - 7200000),
    sentiment: 'neutral' as const,
    transcriptSegments: [
      {
        id: 'seg-j1',
        speaker: 'agent' as const,
        text: 'Hello, this is Sarah from ABC Company. Is Jane available?',
        timestamp: 0,
        duration: 4,
        confidence: 0.95
      },
      {
        id: 'seg-j2',
        speaker: 'lead' as const,
        text: 'This is Jane. I\'m actually in a meeting right now. Can you call back later?',
        timestamp: 4,
        duration: 5,
        confidence: 0.97
      }
    ]
  },
  {
    id: '3',
    leadName: 'Bob Johnson',
    phoneNumber: '+1 (555) 456-7890',
    status: 'no_answer' as const,
    duration: 30,
    timestamp: new Date(Date.now() - 10800000),
    transcriptSegments: undefined
  },
  {
    id: '4',
    leadName: 'Alice Williams',
    phoneNumber: '+1 (555) 321-0987',
    status: 'completed' as const,
    duration: 420,
    outcome: 'Not Interested',
    timestamp: new Date(Date.now() - 14400000),
    sentiment: 'negative' as const,
    transcriptSegments: []
  }
];

export default function VoiceTranscriptDemo() {
  const [, setLocation] = useLocation();
  const [selectedCall, setSelectedCall] = useState(mockCalls[0]);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voice Transcript System</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered voice call transcription with real-time playback and search
          </p>
        </div>
      </div>

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Features
          </CardTitle>
          <CardDescription>
            Comprehensive voice transcript management for AI calling campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Audio Playback</h3>
              <p className="text-sm text-muted-foreground">
                Synchronized audio playback with transcript highlighting
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Search & Filter</h3>
              <p className="text-sm text-muted-foreground">
                Full-text search across transcripts with keyword highlighting
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Export Options</h3>
              <p className="text-sm text-muted-foreground">
                Download transcripts as text files or copy to clipboard
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Sentiment Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Automatic sentiment detection for call quality assessment
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Speaker Detection</h3>
              <p className="text-sm text-muted-foreground">
                Distinguish between agent, lead, and system messages
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Timestamp Navigation</h3>
              <p className="text-sm text-muted-foreground">
                Click any segment to jump to that point in the recording
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Demo */}
      <Tabs defaultValue="standalone" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="standalone">Standalone Viewer</TabsTrigger>
          <TabsTrigger value="table">Call History Integration</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard Card</TabsTrigger>
        </TabsList>

        {/* Standalone Transcript Viewer */}
        <TabsContent value="standalone" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Standalone Transcript Viewer</CardTitle>
              <CardDescription>
                Full-featured transcript viewer for detailed call analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[600px]">
              <VoiceTranscript data={mockTranscriptData} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call History Table with Modal */}
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call History with Transcripts</CardTitle>
              <CardDescription>
                Click the transcript icon to view full call details in a modal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CallHistoryWithTranscript calls={mockCalls} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Card */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Voice Calls Dashboard Card</CardTitle>
                <CardDescription>
                  Overview card for dashboard integration with recent call activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceCallsCard
                  recentCalls={mockCalls}
                  totalCalls={24}
                  completedCalls={20}
                  averageDuration={195}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Side Panel Viewer</CardTitle>
                <CardDescription>
                  Compact transcript panel for split-view interfaces
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[500px]">
                <VoiceTranscriptPanel call={selectedCall} />
              </CardContent>
            </Card>
          </div>

          {/* Call Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select a Call</CardTitle>
              <CardDescription>
                Click a call to preview in the side panel above
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mockCalls.map((call) => (
                  <Button
                    key={call.id}
                    variant={selectedCall.id === call.id ? 'default' : 'outline'}
                    className="justify-start h-auto py-3 px-4"
                    onClick={() => setSelectedCall(call)}
                  >
                    <div className="flex items-start gap-3 text-left">
                      <Phone className="h-5 w-5 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{call.leadName}</p>
                        <p className="text-xs opacity-80">{call.phoneNumber}</p>
                        {call.outcome && (
                          <Badge variant="secondary" className="mt-1">
                            {call.outcome}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Integration Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
          <CardDescription>How to use these components in your application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">1. Import Components</h3>
            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
{`import {
  VoiceTranscript,
  CallHistoryWithTranscript,
  VoiceTranscriptPanel,
  type VoiceTranscriptData
} from '@/components/leads';

import { VoiceCallsCard } from '@/components/dashboard';`}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">2. Prepare Your Data</h3>
            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
{`const transcriptData: VoiceTranscriptData = {
  id: 'unique-id',
  callId: 'call-id',
  leadName: 'Lead Name',
  phoneNumber: '+1 (555) 123-4567',
  duration: 120, // seconds
  recordingUrl: 'https://...', // optional
  transcript: [
    {
      id: 'seg-1',
      speaker: 'agent' | 'lead' | 'system',
      text: 'Transcript text',
      timestamp: 0, // seconds from start
      duration: 5, // segment duration
      confidence: 0.95 // optional
    }
  ],
  metadata: {
    callDate: new Date(),
    outcome: 'Meeting Booked',
    sentiment: 'positive',
    keywords: ['keyword1', 'keyword2']
  }
};`}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">3. Use the Components</h3>
            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
{`// Standalone viewer
<VoiceTranscript data={transcriptData} autoPlay={false} />

// With call history
<CallHistoryWithTranscript calls={callsArray} />

// Dashboard card
<VoiceCallsCard
  recentCalls={recentCallsArray}
  totalCalls={24}
  completedCalls={20}
  averageDuration={195}
/>

// Side panel
<VoiceTranscriptPanel call={selectedCall} />`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
