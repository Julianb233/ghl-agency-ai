import { trpc } from '@/lib/trpc';

export function useAICalling() {
  const createCampaign = trpc.aiCalling.createCampaign.useMutation();
  const startCampaign = trpc.aiCalling.startCampaign.useMutation();
  const pauseCampaign = trpc.aiCalling.pauseCampaign.useMutation();
  // stopCampaign doesn't exist - use pauseCampaign instead
  const getCampaign = trpc.aiCalling.getCampaign.useQuery;
  const getCampaigns = trpc.aiCalling.getCampaigns.useQuery;
  // getCampaignStats doesn't exist - campaign stats are included in getCampaigns response
  const getCalls = trpc.aiCalling.getCalls.useQuery;
  const getCall = trpc.aiCalling.getCall.useQuery;
  const makeCall = trpc.aiCalling.makeCall.useMutation();
  const updateCall = trpc.aiCalling.updateCall.useMutation();
  const updateCampaign = trpc.aiCalling.updateCampaign.useMutation();
  const syncCallStatus = trpc.aiCalling.syncCallStatus.useMutation();
  const deleteCampaign = trpc.aiCalling.deleteCampaign.useMutation();

  return {
    createCampaign,
    startCampaign,
    pauseCampaign,
    getCampaign,
    getCampaigns,
    getCalls,
    getCall,
    makeCall,
    updateCall,
    updateCampaign,
    syncCallStatus,
    deleteCampaign
  };
}
