/**
 * Upgrade Modal
 * Displays subscription tiers for upgrade selection
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  X,
  Check,
  Zap,
  Users,
  Sparkles,
  Star,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTierSlug?: string;
}

const TIER_FEATURES: Record<string, string[]> = {
  starter: [
    '5 AI Agent slots',
    '200 executions/month',
    '1 GHL account',
    'Basic automation',
    'Email support',
  ],
  growth: [
    '10 AI Agent slots',
    '500 executions/month',
    '5 GHL accounts',
    'Swarm access',
    'Research strategies',
    'Priority support',
  ],
  professional: [
    '25 AI Agent slots',
    '1,250 executions/month',
    '20 GHL accounts',
    'All swarm strategies',
    'Custom agents',
    'Priority support',
    'API access',
  ],
  enterprise: [
    '50 AI Agent slots',
    '3,000 executions/month',
    'Unlimited GHL accounts',
    'All features included',
    'Dedicated support',
    'Custom integrations',
    'SLA guarantee',
  ],
};

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; button: string }> = {
  starter: {
    bg: 'from-slate-50 to-gray-50',
    border: 'border-slate-200',
    text: 'text-slate-600',
    button: 'bg-slate-600 hover:bg-slate-700',
  },
  growth: {
    bg: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    button: 'bg-emerald-600 hover:bg-emerald-700',
  },
  professional: {
    bg: 'from-blue-50 to-cyan-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  enterprise: {
    bg: 'from-purple-50 to-indigo-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
};

export function UpgradeModal({ isOpen, onClose, currentTierSlug }: UpgradeModalProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [paymentFrequency, setPaymentFrequency] = useState<'monthly' | 'annual'>('annual');

  const { data: tiersData, isLoading } = trpc.subscription.getTiers.useQuery();

  const updateTier = trpc.subscription.updateTier.useMutation({
    onSuccess: () => {
      onClose();
      // Refresh subscription data
      window.location.reload();
    },
  });

  const createSubscription = trpc.subscription.create.useMutation({
    onSuccess: () => {
      onClose();
      window.location.reload();
    },
  });

  if (!isOpen) return null;

  const handleSelectTier = (tierSlug: string) => {
    if (tierSlug === currentTierSlug) return;
    setSelectedTier(tierSlug);
  };

  const handleConfirm = () => {
    if (!selectedTier) return;

    if (currentTierSlug) {
      // Upgrade existing subscription
      updateTier.mutate({ newTierSlug: selectedTier as any });
    } else {
      // Create new subscription
      createSubscription.mutate({
        tierSlug: selectedTier as any,
        paymentFrequency,
      });
    }
  };

  const getDiscountedPrice = (monthlyPrice: number) => {
    if (paymentFrequency === 'annual') {
      return monthlyPrice * 0.9; // 10% discount
    }
    return monthlyPrice;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {currentTierSlug ? 'Upgrade Your Plan' : 'Choose Your Plan'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Select the plan that best fits your agency's needs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Payment Frequency Toggle */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPaymentFrequency('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                paymentFrequency === 'monthly'
                  ? 'bg-white shadow text-slate-800'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPaymentFrequency('annual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                paymentFrequency === 'annual'
                  ? 'bg-white shadow text-slate-800'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Annual
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-xs rounded-full">
                Save 10%
              </span>
            </button>
          </div>
        </div>

        {/* Tiers Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tiersData?.tiers?.map((tier) => {
                const colors = TIER_COLORS[tier.slug] || TIER_COLORS.starter;
                const features = TIER_FEATURES[tier.slug] || [];
                const isCurrentTier = tier.slug === currentTierSlug;
                const isSelected = tier.slug === selectedTier;
                const displayPrice = getDiscountedPrice(tier.monthlyPrice);

                return (
                  <div
                    key={tier.id}
                    onClick={() => handleSelectTier(tier.slug)}
                    className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all ${
                      isCurrentTier
                        ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-60'
                        : isSelected
                        ? `${colors.border} bg-gradient-to-br ${colors.bg} ring-2 ring-offset-2 ring-purple-500`
                        : `${colors.border} bg-gradient-to-br ${colors.bg} hover:shadow-lg`
                    }`}
                  >
                    {/* Popular Badge */}
                    {tier.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Popular
                        </span>
                      </div>
                    )}

                    {/* Current Badge */}
                    {isCurrentTier && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 bg-gray-600 text-white text-xs font-medium rounded-full">
                          Current Plan
                        </span>
                      </div>
                    )}

                    {/* Tier Icon & Name */}
                    <div className="flex items-center gap-3 mb-4 mt-2">
                      <div className={`w-10 h-10 rounded-lg ${colors.button} flex items-center justify-center`}>
                        {tier.slug === 'enterprise' ? (
                          <Sparkles className="w-5 h-5 text-white" />
                        ) : tier.slug === 'professional' ? (
                          <Zap className="w-5 h-5 text-white" />
                        ) : (
                          <Users className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{tier.name}</h3>
                        <p className="text-xs text-slate-500">{tier.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-800">
                          ${Math.round(displayPrice).toLocaleString()}
                        </span>
                        <span className="text-slate-500">/mo</span>
                      </div>
                      {paymentFrequency === 'annual' && (
                        <p className="text-xs text-slate-500">
                          Billed annually (${Math.round(displayPrice * 12).toLocaleString()}/year)
                        </p>
                      )}
                      {tier.setupFee > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          + ${tier.setupFee.toLocaleString()} setup fee
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-4">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <Check className={`w-4 h-4 ${colors.text}`} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* Select indicator */}
                    {isSelected && !isCurrentTier && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
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
            onClick={handleConfirm}
            disabled={!selectedTier || updateTier.isPending || createSubscription.isPending}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            {updateTier.isPending || createSubscription.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {currentTierSlug ? 'Upgrade Now' : 'Subscribe'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
