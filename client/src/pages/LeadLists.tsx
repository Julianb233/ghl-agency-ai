import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Lists</h1>
          <p className="text-muted-foreground mt-1">
            Upload, enrich, and manage your lead lists
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreditBalance creditType="enrichment" onBuyCredits={() => setLocation('/credits')} />
          <Button onClick={() => setLocation('/lead-lists/upload')}>
            <Plus className="h-4 w-4 mr-2" />
            Upload New List
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Lists</p>
                <p className="text-2xl font-bold">{stats.totalLists}</p>
              </div>
              <div className="rounded-full bg-blue-100 dark:bg-blue-950 p-3">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
              <div className="rounded-full bg-purple-100 dark:bg-purple-950 p-3">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
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
              <div className="rounded-full bg-green-100 dark:bg-green-950 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
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
              <div className="rounded-full bg-yellow-100 dark:bg-yellow-950 p-3">
                <Coins className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-accent p-6 mb-4">
              <Users className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No lead lists yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              {searchQuery || statusFilter !== 'all'
                ? 'No lists match your search criteria'
                : 'Upload your first lead list to get started with enrichment'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setLocation('/lead-lists/upload')}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Lead List
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
