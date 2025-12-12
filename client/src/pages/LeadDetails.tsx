import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { LeadTable } from '@/components/leads/LeadTable';
import { EnrichmentProgress } from '@/components/leads/EnrichmentProgress';
import { useLeadEnrichment } from '@/hooks/useLeadEnrichment';
import {
  ArrowLeft,
  Download,
  Trash2,
  Zap,
  Phone,
  Users,
  CheckCircle2,
  XCircle,
  Coins,
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { FeatureTip } from '@/components/tour/FeatureTip';

export default function LeadDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { getList, exportLeads, enrichLead } =
    useLeadEnrichment();

  const { data: leadList, isLoading } = getList(Number(id!));
  const enrichMutation = enrichLead;

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

  if (!leadList) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-2xl font-bold mb-2">Lead list not found</h2>
        <Button onClick={() => setLocation('/lead-lists')}>
          Go back to Lead Lists
        </Button>
      </div>
    );
  }

  const stats = {
    totalLeads: leadList.totalLeads || 0,
    enriched: leadList.enrichedCount || 0,
    failed: leadList.failedCount || 0,
    creditsUsed: leadList.creditsCost || 0,
  };

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      // exportLeads is a query, not a mutation - call it directly
      const result = await exportLeads({ listId: Number(id!), format });

      if (result.data) {
        const blob = new Blob([result.data.data], {
          type: format === 'csv' ? 'text/csv' : 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success('Leads exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export leads');
    }
  };

  const handleLeadAction = async (action: string, lead: any) => {
    switch (action) {
      case 'view':
        setSelectedLead(lead);
        setDetailsDialogOpen(true);
        break;

      case 'enrich':
        try {
          await enrichMutation.mutateAsync({
            listId: Number(id!),
            leadId: lead.id,
          });
          toast.success('Lead re-enrichment started');
        } catch (error) {
          toast.error('Failed to re-enrich lead');
        }
        break;

      case 'delete':
        // deleteLead doesn't exist in the router - would need to be implemented
        toast.info('Delete lead functionality not yet implemented');
        break;
    }
  };

  const allLeadsColumns = [
    { key: 'firstName', label: 'First Name', sortable: true },
    { key: 'lastName', label: 'Last Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone', sortable: false },
    { key: 'company', label: 'Company', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
  ];

  const enrichedLeadsColumns = [
    ...allLeadsColumns,
    { key: 'jobTitle', label: 'Job Title', sortable: true },
    {
      key: 'linkedIn',
      label: 'LinkedIn',
      sortable: false,
      render: (value: string) =>
        value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Profile
          </a>
        ) : (
          '-'
        ),
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b -mx-4 px-4 py-4 mb-4">
        <Breadcrumb
          items={[
            { label: 'Leads', onClick: () => setLocation('/lead-lists') },
            { label: leadList.name },
          ]}
        />

        <div className="flex items-start justify-between mt-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{leadList.name}</h1>
              {getStatusBadge(leadList.status)}
            </div>
            {leadList.description && (
              <p className="text-muted-foreground mt-2">{leadList.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/ai-campaigns/create?listId=${id}`)}
            >
              <Phone className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => handleExport('json')}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{stats.totalLeads}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enriched</p>
                <p className="text-2xl font-bold">{stats.enriched}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalLeads > 0
                    ? ((stats.enriched / stats.totalLeads) * 100).toFixed(1)
                    : 0}
                  %
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
                <p className="text-2xl font-bold">{stats.failed}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Credits Used</p>
                <p className="text-2xl font-bold">{stats.creditsUsed}</p>
              </div>
              <div className="rounded-full bg-yellow-100 p-3">
                <Coins className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <EnrichmentProgress
            total={stats.totalLeads}
            enriched={stats.enriched}
            failed={stats.failed}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Leads ({stats.totalLeads})</TabsTrigger>
          <TabsTrigger value="enriched">Enriched ({stats.enriched})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({stats.failed})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <LeadTable
            leads={leadList.leads || []}
            columns={allLeadsColumns}
            onLeadClick={(lead) => {
              setSelectedLead(lead);
              setDetailsDialogOpen(true);
            }}
            onLeadAction={handleLeadAction}
            selectable
          />
        </TabsContent>

        <TabsContent value="enriched" className="space-y-4">
          <LeadTable
            leads={(leadList.leads || []).filter((l: any) => l.status === 'enriched')}
            columns={enrichedLeadsColumns}
            onLeadClick={(lead) => {
              setSelectedLead(lead);
              setDetailsDialogOpen(true);
            }}
            onLeadAction={handleLeadAction}
          />
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <LeadTable
            leads={(leadList.leads || []).filter((l: any) => l.status === 'failed')}
            columns={allLeadsColumns}
            onLeadClick={(lead) => {
              setSelectedLead(lead);
              setDetailsDialogOpen(true);
            }}
            onLeadAction={handleLeadAction}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Original Data</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">
                        {selectedLead.firstName} {selectedLead.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedLead.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedLead.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Company</p>
                      <p className="font-medium">{selectedLead.company || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">Enriched Data</h3>
                    <FeatureTip
                      tipId="lead-data-sources"
                      title="Data Sources"
                      content="Enriched data comes from multiple public sources including LinkedIn, company databases, and professional networks to provide the most accurate information."
                      dismissible={true}
                    />
                  </div>
                  {selectedLead.status === 'enriched' && selectedLead.enrichedData ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Job Title</p>
                        <p className="font-medium">
                          {selectedLead.enrichedData.jobTitle || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">LinkedIn</p>
                        {selectedLead.enrichedData.linkedIn ? (
                          <a
                            href={selectedLead.enrichedData.linkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View Profile
                          </a>
                        ) : (
                          <p className="font-medium">-</p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Company Size</p>
                        <p className="font-medium">
                          {selectedLead.enrichedData.companySize || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Industry</p>
                        <p className="font-medium">
                          {selectedLead.enrichedData.industry || '-'}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-muted-foreground">Confidence Score</p>
                          <FeatureTip
                            tipId="lead-enrichment-score"
                            title="Enrichment Score"
                            content="Shows how complete and accurate the lead's data is. Higher scores mean more data points were found and verified from reliable sources."
                            dismissible={true}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-accent rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${(selectedLead.enrichedData.confidence || 0) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="font-medium">
                            {((selectedLead.enrichedData.confidence || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No enriched data available
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                {selectedLead.status !== 'enriched' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleLeadAction('enrich', selectedLead);
                      setDetailsDialogOpen(false);
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Re-enrich
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    handleLeadAction('delete', selectedLead);
                    setDetailsDialogOpen(false);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
