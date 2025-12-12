import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { CallHistoryTable } from '@/components/leads/CallHistoryTable';
import { useAICalling } from '@/hooks/useAICalling';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Download,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Line, Pie } from 'react-chartjs-2';
import { FeatureTip } from '@/components/tour/FeatureTip';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function CampaignDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [transcriptDialogOpen, setTranscriptDialogOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);

  const { getCampaign, getCalls, startCampaign, pauseCampaign } =
    useAICalling();

  const { data: campaign, isLoading } = getCampaign(Number(id!));
  const { data: callsData } = getCalls({ campaignId: Number(id!) });

  // Extract calls array from response object
  const calls = callsData?.calls ?? [];

  const startMutation = startCampaign;
  const pauseMutation = pauseCampaign;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-2xl font-bold mb-2">Campaign not found</h2>
        <Button onClick={() => setLocation('/ai-campaigns')}>
          Go back to Campaigns
        </Button>
      </div>
    );
  }

  const handleControlAction = async (action: 'start' | 'pause' | 'stop') => {
    try {
      switch (action) {
        case 'start':
          await startMutation.mutateAsync({ campaignId: Number(id!) });
          toast.success('Campaign started');
          break;
        case 'pause':
          await pauseMutation.mutateAsync({ campaignId: Number(id!) });
          toast.success('Campaign paused');
          break;
        case 'stop':
          await pauseMutation.mutateAsync({ campaignId: Number(id!) });
          toast.success('Campaign stopped');
          break;
      }
    } catch (error) {
      toast.error(`Failed to ${action} campaign`);
    }
  };

  const handleExportResults = () => {
    // Export campaign results as CSV
    if (calls.length === 0) {
      toast.error('No calls to export');
      return;
    }

    const csvData = calls.map((call: any) => ({
      'Lead Name': call.leadName,
      'Phone Number': call.phoneNumber,
      Status: call.status,
      Duration: call.duration,
      Outcome: call.outcome || '-',
      Timestamp: call.timestamp.toISOString(),
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map((row: any) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.name}-results.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Results exported successfully');
  };

  const handlePlayRecording = (call: any) => {
    // Play audio recording
    if (call.recordingUrl) {
      const audio = new Audio(call.recordingUrl);
      audio.play();
    }
  };

  const handleViewTranscript = (call: any) => {
    setSelectedCall(call);
    setTranscriptDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'running':
        return <Badge className="bg-green-500">Running</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">Paused</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      default:
        return null;
    }
  };

  // Chart data - using campaign data since getCampaignStats doesn't exist
  const callsOverTimeData = {
    labels: [],
    datasets: [
      {
        label: 'Calls Made',
        data: [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const outcomeDistributionData = {
    labels: ['Successful', 'Failed', 'No Answer'],
    datasets: [
      {
        data: [campaign.successful || 0, campaign.failed || 0, (campaign.callsMade - campaign.successful - campaign.failed) || 0],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 191, 36, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(251, 191, 36)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b -mx-4 px-4 py-4 mb-4">
        <Breadcrumb
          items={[
            { label: 'Campaigns', onClick: () => setLocation('/ai-campaigns') },
            { label: campaign.name },
          ]}
        />

        <div className="flex items-start justify-between mt-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            {campaign.description && (
              <p className="text-muted-foreground mt-2">{campaign.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {campaign.status === 'draft' && (
              <Button onClick={() => handleControlAction('start')}>
                <Play className="h-4 w-4 mr-2" />
                Start Campaign
              </Button>
            )}
            {campaign.status === 'running' && (
              <Button variant="outline" onClick={() => handleControlAction('pause')}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            {campaign.status === 'paused' && (
              <>
                <Button onClick={() => handleControlAction('start')}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
                <Button variant="outline" onClick={() => handleControlAction('stop')}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
            <Button variant="outline" onClick={handleExportResults}>
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Calls Made</p>
                <p className="text-2xl font-bold">{campaign.callsMade}</p>
                <p className="text-xs text-muted-foreground">
                  of {campaign.totalLeads} total
                </p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Successful</p>
                  <FeatureTip
                    tipId="campaign-call-status"
                    title="Call Status"
                    content="Successful calls are those where contact was made and the conversation completed. Failed calls include disconnects or errors, while others may be no answer or voicemail."
                    dismissible={true}
                  />
                </div>
                <p className="text-2xl font-bold">{campaign.successful}</p>
                <p className="text-xs text-muted-foreground">
                  {campaign.callsMade > 0
                    ? ((campaign.successful / campaign.callsMade) * 100).toFixed(1)
                    : 0}
                  % success rate
                </p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{campaign.failed}</p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">0:00</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calls Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <Line data={callsOverTimeData} options={{ responsive: true, maintainAspectRatio: true }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outcome Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Pie data={outcomeDistributionData} options={{ responsive: true, maintainAspectRatio: true }} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Call History</TabsTrigger>
          <TabsTrigger value="script">Call Script</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call History ({calls.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <CallHistoryTable
                calls={calls}
                onPlayRecording={handlePlayRecording}
                onViewTranscript={handleViewTranscript}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="script" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Call Script</CardTitle>
                <FeatureTip
                  tipId="campaign-ai-script"
                  title="AI Script"
                  content="The AI uses this script as a guide for conversations. It adapts dynamically based on responses while maintaining your brand voice and objectives."
                  dismissible={true}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-accent rounded-lg font-mono text-sm whitespace-pre-wrap">
                {campaign.callScript}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Voice Type</p>
                  <p className="font-medium">{campaign.voiceType || 'Alloy'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Voice Speed</p>
                  <p className="font-medium">{campaign.voiceSpeed || '1.0'}x</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Language</p>
                  <p className="font-medium">{campaign.language || 'en-US'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Credits Used</p>
                  <p className="font-medium">{campaign.creditsCost}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={transcriptDialogOpen} onOpenChange={setTranscriptDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Transcript</DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-accent rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Lead Name</p>
                  <p className="font-medium">{selectedCall.leadName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-medium">{selectedCall.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {Math.floor(selectedCall.duration / 60)}:
                    {(selectedCall.duration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outcome</p>
                  <p className="font-medium">{selectedCall.outcome || '-'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Transcript</h4>
                <div className="p-4 bg-accent rounded-lg whitespace-pre-wrap text-sm">
                  {selectedCall.transcript || 'No transcript available'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
