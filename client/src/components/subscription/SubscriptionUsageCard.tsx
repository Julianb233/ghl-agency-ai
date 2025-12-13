/**
 * Subscription Usage Card
 * Displays current subscription tier, usage stats, and upgrade prompts
 */

import React from 'react';
import { trpc } from '@/lib/trpc';
import {
  Zap,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface SubscriptionUsageCardProps {
  onUpgradeClick?: () => void;
  onBuyPackClick?: () => void;
  compact?: boolean;
}

export function SubscriptionUsageCard({
  onUpgradeClick,
  onBuyPackClick,
  compact = false,
}: SubscriptionUsageCardProps) {
  const { data, isLoading, error } = trpc.subscription.getMySubscription.useQuery();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Failed to load subscription</span>
        </div>
      </div>
    );
  }

  if (!data.hasSubscription) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-800">No Active Subscription</h3>
            <p className="text-sm text-purple-600">Subscribe to unlock AI agent capabilities</p>
          </div>
        </div>
        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          >
            View Plans
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // At this point we know hasSubscription is true, so these should all exist
  const tier = data.tier!;
  const usage = data.usage!;
  const limits = data.limits!;

  const isNearLimit = usage.percentUsed >= 80;
  const isAtLimit = usage.executionsRemaining <= 0;

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">{tier.name}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              isAtLimit ? 'bg-red-100 text-red-600' :
              isNearLimit ? 'bg-amber-100 text-amber-600' :
              'bg-emerald-100 text-emerald-600'
            }`}>
              {usage.executionsRemaining} left
            </span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isAtLimit ? 'bg-red-500' :
              isNearLimit ? 'bg-amber-500' :
              'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              tier.slug === 'enterprise' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
              tier.slug === 'professional' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
              tier.slug === 'growth' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
              'bg-gradient-to-br from-slate-500 to-gray-600'
            }`}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{tier.name} Plan</h3>
              <p className="text-xs text-slate-500">${tier.monthlyPrice}/month</p>
            </div>
          </div>
          {tier.slug !== 'enterprise' && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1"
            >
              Upgrade
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="p-4 space-y-4">
        {/* Executions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Monthly Executions</span>
            <span className={`text-sm font-semibold ${
              isAtLimit ? 'text-red-600' :
              isNearLimit ? 'text-amber-600' :
              'text-slate-800'
            }`}>
              {usage.executionsUsed.toLocaleString()} / {(usage.executionLimit + usage.additionalExecutions).toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isAtLimit ? 'bg-red-500' :
                isNearLimit ? 'bg-amber-500' :
                'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
            />
          </div>
          {usage.additionalExecutions > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              Includes {usage.additionalExecutions} bonus executions
            </p>
          )}
        </div>

        {/* Agents */}
        <div className="flex items-center justify-between py-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">Agent Slots</span>
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {limits.maxAgents}{usage.additionalAgentSlots > 0 ? ` (+${usage.additionalAgentSlots})` : ''}
          </span>
        </div>

        {/* Period */}
        <div className="flex items-center justify-between py-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">Days Remaining</span>
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {usage.daysRemaining} days
          </span>
        </div>

        {/* Warning/Action */}
        {isAtLimit && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">Monthly limit reached</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Purchase an execution pack or upgrade to continue
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {onBuyPackClick && (
                <button
                  onClick={onBuyPackClick}
                  className="flex-1 px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium transition-colors"
                >
                  Buy Pack
                </button>
              )}
              {onUpgradeClick && (
                <button
                  onClick={onUpgradeClick}
                  className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700">Approaching limit</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {usage.executionsRemaining} executions remaining this period
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SubscriptionUsageCard;
