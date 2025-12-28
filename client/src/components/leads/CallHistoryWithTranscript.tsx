import React, { useState } from 'react';
import { CallHistoryTable } from './CallHistoryTable';
import { VoiceTranscript, VoiceTranscriptData, TranscriptSegment } from './VoiceTranscript';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';

interface Call {
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

interface CallHistoryWithTranscriptProps {
  calls: Call[];
  onPlayRecording?: (call: Call) => void;
}

export const CallHistoryWithTranscript: React.FC<CallHistoryWithTranscriptProps> = ({
  calls,
  onPlayRecording
}) => {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  const handleViewTranscript = (call: Call) => {
    setSelectedCall(call);
    setIsTranscriptOpen(true);
  };

  const handleCloseTranscript = () => {
    setIsTranscriptOpen(false);
    setSelectedCall(null);
  };

  // Convert Call to VoiceTranscriptData
  const getTranscriptData = (call: Call): VoiceTranscriptData | null => {
    if (!call.transcriptSegments || call.transcriptSegments.length === 0) {
      return null;
    }

    return {
      id: call.id,
      callId: call.id,
      leadName: call.leadName,
      phoneNumber: call.phoneNumber,
      duration: call.duration,
      recordingUrl: call.recordingUrl,
      transcript: call.transcriptSegments,
      metadata: {
        callDate: call.timestamp,
        outcome: call.outcome,
        sentiment: call.sentiment,
        keywords: call.keywords
      }
    };
  };

  return (
    <>
      <CallHistoryTable
        calls={calls}
        onPlayRecording={onPlayRecording}
        onViewTranscript={handleViewTranscript}
      />

      <Dialog open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0">
          {selectedCall && getTranscriptData(selectedCall) && (
            <VoiceTranscript
              data={getTranscriptData(selectedCall)!}
              onClose={handleCloseTranscript}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// Standalone component for use in campaigns page
export const VoiceTranscriptPanel: React.FC<{ call: Call | null }> = ({ call }) => {
  if (!call || !call.transcriptSegments || call.transcriptSegments.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <p>Select a call to view transcript</p>
      </Card>
    );
  }

  const transcriptData: VoiceTranscriptData = {
    id: call.id,
    callId: call.id,
    leadName: call.leadName,
    phoneNumber: call.phoneNumber,
    duration: call.duration,
    recordingUrl: call.recordingUrl,
    transcript: call.transcriptSegments,
    metadata: {
      callDate: call.timestamp,
      outcome: call.outcome,
      sentiment: call.sentiment,
      keywords: call.keywords
    }
  };

  return <VoiceTranscript data={transcriptData} />;
};
