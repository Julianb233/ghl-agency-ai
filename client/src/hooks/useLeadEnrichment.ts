import { trpc } from '@/lib/trpc';

export function useLeadEnrichment() {
  const createList = trpc.leadEnrichment.createList.useMutation();
  const uploadLeads = trpc.leadEnrichment.uploadLeads.useMutation();
  const enrichList = trpc.leadEnrichment.enrichList.useMutation();
  const getLists = trpc.leadEnrichment.getLists.useQuery;
  const getList = trpc.leadEnrichment.getList.useQuery;
  const getLeads = trpc.leadEnrichment.getLeads.useQuery;
  const enrichLead = trpc.leadEnrichment.enrichLead.useMutation();
  const exportLeads = trpc.leadEnrichment.exportLeads.useQuery;
  const deleteList = trpc.leadEnrichment.deleteList.useMutation();
  // deleteLead doesn't exist - would need to be implemented in router
  // reEnrichLeads doesn't exist - use enrichLead instead for individual re-enrichment

  return {
    createList,
    uploadLeads,
    enrichList,
    getLists,
    getList,
    getLeads,
    enrichLead,
    exportLeads,
    deleteList
  };
}
