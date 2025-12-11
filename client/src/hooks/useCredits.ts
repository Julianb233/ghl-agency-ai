import { trpc } from '@/lib/trpc';

export function useCredits() {
  const getBalance = trpc.credits.getBalance.useQuery;
  const getBalances = trpc.credits.getBalances.useQuery;
  const checkBalance = trpc.credits.checkBalance.useQuery;
  const getTransactionHistory = trpc.credits.getTransactionHistory.useQuery;
  const getUsageStats = trpc.credits.getUsageStats.useQuery;
  const purchaseCredits = trpc.credits.purchaseCredits.useMutation();
  const getPackages = trpc.credits.getPackages.useQuery;
  const createPackage = trpc.credits.createPackage.useMutation();
  const updatePackage = trpc.credits.updatePackage.useMutation();
  const adjustCredits = trpc.credits.adjustCredits.useMutation();

  return {
    getBalance,
    getBalances,
    checkBalance,
    getTransactionHistory,
    getUsageStats,
    purchaseCredits,
    getPackages,
    createPackage,
    updatePackage,
    adjustCredits
  };
}
