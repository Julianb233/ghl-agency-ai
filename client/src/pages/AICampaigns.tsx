import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent
} from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CampaignForm } from '@/components/leads/CampaignForm';
import { useAICalling } from '@/hooks/useAICalling';
import { useLeadEnrichment } from '@/hooks/useLeadEnrichment';
import {
  Plus,
  Phone,
  Play,
  Pause,
  Square,
  Eye,
  Trash2,
  MoreVertical,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, isThisMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { TourPrompt } from '@/components/tour';

export default function AICampaigns() {
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);

  const { getCampaigns, createCampaign, startCampaign, pauseCampaign, deleteCampaign } =
    useAICalling();
  const { getLists } = useLeadEnrichment();

  const { data: campaignsData, isLoading } = getCampaigns();
  const { data: leadListsData } = getLists();

  // Extract arrays from response objects
  const campaigns = campaignsData?.campaigns ?? [];
  const leadLists = Array.isArray(leadListsData) ? leadListsData : (leadListsData?.lists ?? []);

  const createMutation = createCampaign;
  const startMutation = startCampaign;
  const pauseMutation = pauseCampaign;
  const deleteMutation = deleteCampaign;

  const handleCreateCampaign = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Campaign created successfully');
      setCreateDialogOpen(false);
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  const handleStartCampaign = async (campaignId: number) => {
    try {
      await startMutation.mutateAsync({ campaignId });
      toast.success('Campaign started');
    } catch (error) {
      toast.error('Failed to start campaign');
    }
  };

  const handlePauseCampaign = async (campaignId: number) => {
    try {
      await pauseMutation.mutateAsync({ campaignId });
      toast.success('Campaign paused');
    } catch (error) {
      toast.error('Failed to pause campaign');
    }
  };

  const handleStopCampaign = async (campaignId: number) => {
    try {
      await pauseMutation.mutateAsync({ campaignId });
      toast.success('Campaign stopped');
    } catch (error) {
      toast.error('Failed to stop campaign');
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaignId) return;

    try {
      await deleteMutation.mutateAsync({ campaignId: selectedCampaignId });
      toast.success('Campaign deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedCampaignId(null);
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const confirmDelete = (campaignId: number) => {
    setSelectedCampaignId(campaignId);
    setDeleteDialogOpen(true);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between" data-tour="campaigns-header">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', onClick: () => setLocation('/') },
              { label: 'AI Campaigns' },
            ]}
          />
          <h1 className="text-3xl font-bold mt-4">AI Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage AI calling campaigns
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-tour="campaigns-create-button">
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      <TourPrompt tourId="campaigns" featureName="AI Campaigns" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-tour="campaigns-stats">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Campaigns</p>
          <p className="text-2xl font-bold">{campaigns?.filter(c => c.status === 'running').length || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-bold">{campaigns?.reduce((sum, c) => sum + (c.totalLeads || 0), 0) || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Conversion Rate</p>
          <p className="text-2xl font-bold">-</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">This Month</p>
          <p className="text-2xl font-bold">{campaigns?.filter(c => isThisMonth(new Date(c.createdAt))).length || 0}</p>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Phone className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No campaigns yet</EmptyTitle>
            <EmptyDescription>
              Create your first AI calling campaign to start reaching out to leads automatically with intelligent conversations.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-4" data-tour="campaigns-list">
          {campaigns.map((campaign: any) => {
            const progress =
              campaign.totalLeads > 0
                ? (campaign.callsMade / campaign.totalLeads) * 100
                : 0;

            return (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold">{campaign.name}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground">
                          {campaign.description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Lead List:{' '}
                        <span
                          className="text-primary cursor-pointer hover:underline"
                          onClick={() =>
                            setLocation(`/lead-lists/${campaign.leadListId}`)
                          }
                        >
                          {campaign.leadListName}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {campaign.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartCampaign(campaign.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                      )}
                      {campaign.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePauseCampaign(campaign.id)}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      )}
                      {campaign.status === 'paused' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStartCampaign(campaign.id)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStopCampaign(campaign.id)}
                          >
                            <Square className="h-4 w-4 mr-2" />
                            Stop
                          </Button>
                        </>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setLocation(`/ai-campaigns/${campaign.id}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => confirmDelete(campaign.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-teal-500" />
                      <div>
                        <p className="text-2xl font-bold">{campaign.callsMade}</p>
                        <p className="text-xs text-muted-foreground">Calls Made</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{campaign.successful}</p>
                        <p className="text-xs text-muted-foreground">Successful</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold">{campaign.failed}</p>
                        <p className="text-xs text-muted-foreground">Failed</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-500" />
                      <div>
                        <p className="text-2xl font-bold">{campaign.answered}</p>
                        <p className="text-xs text-muted-foreground">Answered</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-2xl font-bold">{campaign.creditsCost}</p>
                        <p className="text-xs text-muted-foreground">Credits Used</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {campaign.callsMade} / {campaign.totalLeads} ({progress.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(campaign.createdAt, { addSuffix: true })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/ai-campaigns/${campaign.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create AI Campaign</DialogTitle>
          </DialogHeader>
          <CampaignForm
            leadLists={leadLists}
            onSubmit={handleCreateCampaign}
            onCancel={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this campaign and all associated call data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCampaign}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
