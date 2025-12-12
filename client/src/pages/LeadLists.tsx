import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent
} from '@/components/ui/empty';
import { LeadListCard } from '@/components/leads/LeadListCard';
import { CreditBalance } from '@/components/leads/CreditBalance';
import { useLeadEnrichment } from '@/hooks/useLeadEnrichment';
import { Plus, Search, Users, CheckCircle2, Coins, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
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
import { TourPrompt } from '@/components/tour';

interface LeadList {
  id: string;
  name: string;
  totalLeads: number;
  enrichedCount: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  creditsCost: number;
  createdAt: Date;
  description?: string;
}

export default function LeadLists() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const { getLists, deleteList, exportLeads } = useLeadEnrichment();
  const { data: listsData, isLoading } = getLists();
  const deleteListMutation = deleteList;

  // Handle response structure - could be array or { lists, total, hasMore }
  const lists = Array.isArray(listsData) ? listsData : (listsData?.lists || []);

  const filteredLists = lists?.filter((list: LeadList) => {
    const matchesSearch = list.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || list.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const stats = {
    totalLists: lists?.length || 0,
    totalLeads: lists?.reduce((sum: number, list: LeadList) => sum + list.totalLeads, 0) || 0,
    enrichedLeads: lists?.reduce((sum: number, list: LeadList) => sum + list.enrichedCount, 0) || 0,
    creditsUsed: lists?.reduce((sum: number, list: LeadList) => sum + list.creditsCost, 0) || 0,
  };

  const handleDelete = async () => {
    if (!selectedListId) return;

    try {
      await deleteListMutation.mutateAsync({ listId: Number(selectedListId) });
      toast.success('Lead list deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedListId(null);
    } catch (error) {
      toast.error('Failed to delete lead list');
    }
  };

  const handleExport = async (listId: string) => {
    try {
      // exportLeads is a query, not a mutation - call it directly
      const result = await exportLeads({ listId: Number(listId), format: 'csv' });

      if (result.data) {
        // Create download link
        const blob = new Blob([result.data.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        a.click();
        window.URL.revokeObjectURL(url);

        toast.success('Lead list exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export lead list');
    }
  };

  const confirmDelete = (listId: string) => {
    setSelectedListId(listId);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between" data-tour="leads-header">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', onClick: () => setLocation('/') },
              { label: 'Lead Lists' },
            ]}
          />
          <h1 className="text-3xl font-bold mt-4">Lead Lists</h1>
          <p className="text-muted-foreground mt-1">
            Upload, enrich, and manage your lead lists
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreditBalance creditType="enrichment" onBuyCredits={() => setLocation('/credits')} />
          <Button onClick={() => setLocation('/lead-lists/upload')} data-tour="leads-create-button">
            <Plus className="h-4 w-4 mr-2" />
            Upload New List
          </Button>
        </div>
      </div>

      <TourPrompt tourId="leads" featureName="Lead Management" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Lists</p>
                <p className="text-2xl font-bold">{stats.totalLists}</p>
              </div>
              <div className="rounded-full bg-teal-100 p-3">
                <Users className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{stats.totalLeads.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-3">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enriched Leads</p>
                <p className="text-2xl font-bold">{stats.enrichedLeads.toLocaleString()}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Credits Used</p>
                <p className="text-2xl font-bold">{stats.creditsUsed.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-yellow-100 p-3">
                <Coins className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lead lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="uploading">Uploading</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLists.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No lead lists yet</EmptyTitle>
            <EmptyDescription>
              {searchQuery || statusFilter !== 'all'
                ? 'No lists match your search criteria. Try adjusting your filters.'
                : 'Upload your first lead list to get started with enrichment and unlock powerful lead management features.'}
            </EmptyDescription>
          </EmptyHeader>
          {!searchQuery && statusFilter === 'all' && (
            <EmptyContent>
              <Button onClick={() => setLocation('/lead-lists/upload')}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Lead List
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-tour="leads-list">
          {filteredLists.map((list: LeadList) => (
            <LeadListCard
              key={list.id}
              leadList={list}
              onView={() => setLocation(`/lead-lists/${list.id}`)}
              onEnrich={() => setLocation(`/lead-lists/${list.id}?tab=enrich`)}
              onExport={() => handleExport(list.id)}
              onDelete={() => confirmDelete(list.id)}
            />
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this lead list and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
