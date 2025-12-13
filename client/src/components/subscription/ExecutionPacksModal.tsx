/**
 * Execution Packs Modal
 * Purchase additional execution credits
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  X,
  Zap,
  Infinity,
  Loader2,
  Check,
  ShoppingCart,
} from 'lucide-react';

interface ExecutionPacksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExecutionPacksModal({ isOpen, onClose }: ExecutionPacksModalProps) {
  const [selectedPack, setSelectedPack] = useState<string | null>(null);

  const { data: packsData, isLoading } = trpc.subscription.getExecutionPacks.useQuery();

  const purchasePack = trpc.subscription.purchasePack.useMutation({
    onSuccess: () => {
      onClose();
      window.location.reload();
    },
  });

  if (!isOpen) return null;

  const handlePurchase = () => {
    if (!selectedPack) return;
    purchasePack.mutate({ packSlug: selectedPack });
  };

  const getPackIcon = (slug: string) => {
    if (slug === 'unlimited_month') {
      return <Infinity className="w-6 h-6 text-white" />;
    }
    return <Zap className="w-6 h-6 text-white" />;
  };

  const getPackColor = (slug: string) => {
    switch (slug) {
      case 'boost':
        return 'from-emerald-500 to-teal-600';
      case 'power':
        return 'from-blue-500 to-cyan-600';
      case 'unlimited_month':
        return 'from-purple-500 to-indigo-600';
      default:
        return 'from-slate-500 to-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Execution Packs</h2>
            <p className="text-sm text-slate-500 mt-1">
              Get more executions to keep your agents running
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Packs Grid */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {packsData?.packs?.map((pack) => {
                const isSelected = pack.slug === selectedPack;
                const colorClass = getPackColor(pack.slug);

                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.slug)}
                    className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-offset-2 ring-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    {/* Pack Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center mb-4`}>
                      {getPackIcon(pack.slug)}
                    </div>

                    {/* Pack Name */}
                    <h3 className="font-bold text-slate-800 text-lg">{pack.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-4">{pack.description}</p>

                    {/* Pack Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Executions</span>
                        <span className="font-semibold text-slate-800">
                          {pack.executionCount ? pack.executionCount.toLocaleString() : 'Unlimited'}
                        </span>
                      </div>
                      {pack.validForDays && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Valid for</span>
                          <span className="font-semibold text-slate-800">
                            {pack.validForDays} days
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-slate-800">
                          ${pack.price}
                        </span>
                        <span className="text-slate-500 text-sm">one-time</span>
                      </div>
                      {pack.executionCount && (
                        <p className="text-xs text-slate-500 mt-1">
                          ${(pack.price / pack.executionCount).toFixed(2)} per execution
                        </p>
                      )}
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Best Value Badge */}
                    {pack.slug === 'power' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-medium rounded-full">
                          Best Value
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={!selectedPack || purchasePack.isPending}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            {purchasePack.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                Purchase Pack
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExecutionPacksModal;
