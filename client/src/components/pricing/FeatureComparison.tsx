import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, HelpCircle } from 'lucide-react';

interface FeatureRow {
  feature: string;
  tooltip?: string;
  starter: boolean | string;
  professional: boolean | string;
  agency: boolean | string;
  enterprise: boolean | string;
}

interface FeatureComparisonProps {
  className?: string;
}

const features: FeatureRow[] = [
  // Core Features
  {
    feature: 'AI Workflow Automations',
    starter: '5/month',
    professional: '50/month',
    agency: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Browser Agents',
    starter: '1',
    professional: '5',
    agency: '25',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Credential Vault',
    tooltip: 'Secure AES-256 encrypted storage for API keys and credentials',
    starter: '10 credentials',
    professional: '100 credentials',
    agency: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Team Members',
    starter: '1',
    professional: '3',
    agency: '10',
    enterprise: 'Unlimited',
  },
  // AI Features
  {
    feature: 'GPT-4 Integration',
    starter: true,
    professional: true,
    agency: true,
    enterprise: true,
  },
  {
    feature: 'Claude Integration',
    starter: false,
    professional: true,
    agency: true,
    enterprise: true,
  },
  {
    feature: 'Custom AI Models',
    starter: false,
    professional: false,
    agency: true,
    enterprise: true,
  },
  // Automation
  {
    feature: 'GHL Sub-account Sync',
    starter: '1 account',
    professional: '10 accounts',
    agency: '100 accounts',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Workflow Templates',
    starter: 'Basic',
    professional: 'Advanced',
    agency: 'Premium',
    enterprise: 'Custom',
  },
  {
    feature: 'Scheduled Automations',
    starter: false,
    professional: true,
    agency: true,
    enterprise: true,
  },
  {
    feature: 'Webhook Integration',
    starter: false,
    professional: true,
    agency: true,
    enterprise: true,
  },
  // Support
  {
    feature: 'Email Support',
    starter: true,
    professional: true,
    agency: true,
    enterprise: true,
  },
  {
    feature: 'Priority Support',
    starter: false,
    professional: true,
    agency: true,
    enterprise: true,
  },
  {
    feature: 'Dedicated Account Manager',
    starter: false,
    professional: false,
    agency: false,
    enterprise: true,
  },
  {
    feature: 'Custom Onboarding',
    starter: false,
    professional: false,
    agency: true,
    enterprise: true,
  },
  // Advanced
  {
    feature: 'API Access',
    starter: false,
    professional: true,
    agency: true,
    enterprise: true,
  },
  {
    feature: 'White-label Option',
    starter: false,
    professional: false,
    agency: true,
    enterprise: true,
  },
  {
    feature: 'SSO / SAML',
    starter: false,
    professional: false,
    agency: false,
    enterprise: true,
  },
  {
    feature: 'Custom Integrations',
    starter: false,
    professional: false,
    agency: false,
    enterprise: true,
  },
  {
    feature: 'SLA Guarantee',
    starter: false,
    professional: false,
    agency: '99.5%',
    enterprise: '99.9%',
  },
];

const tiers = ['Starter', 'Professional', 'Agency', 'Enterprise'];

const renderValue = (value: boolean | string) => {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="w-5 h-5 text-emerald-400 mx-auto" />
    ) : (
      <X className="w-5 h-5 text-slate-600 mx-auto" />
    );
  }
  return <span className="text-slate-300 text-sm">{value}</span>;
};

export const FeatureComparison: React.FC<FeatureComparisonProps> = ({
  className = '',
}) => {
  return (
    <motion.div
      className={`overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm ${className}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <div className="grid grid-cols-5 bg-slate-800/50 border-b border-slate-700/50">
        <div className="p-6">
          <span className="text-slate-400 font-medium">Features</span>
        </div>
        {tiers.map((tier, index) => (
          <div
            key={tier}
            className={`p-6 text-center ${
              index === 1 ? 'bg-slate-700/30' : ''
            }`}
          >
            <span className="font-semibold text-white">{tier}</span>
          </div>
        ))}
      </div>

      {/* Feature rows */}
      {features.map((row, index) => (
        <motion.div
          key={row.feature}
          className={`grid grid-cols-5 border-b border-slate-700/30 last:border-0 ${
            index % 2 === 0 ? 'bg-slate-800/20' : ''
          }`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.02 }}
        >
          <div className="p-4 flex items-center gap-2">
            <span className="text-slate-300 text-sm">{row.feature}</span>
            {row.tooltip && (
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-slate-500 cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 rounded-lg text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
                  {row.tooltip}
                </div>
              </div>
            )}
          </div>
          <div className="p-4 flex items-center justify-center">
            {renderValue(row.starter)}
          </div>
          <div className="p-4 flex items-center justify-center bg-slate-700/10">
            {renderValue(row.professional)}
          </div>
          <div className="p-4 flex items-center justify-center">
            {renderValue(row.agency)}
          </div>
          <div className="p-4 flex items-center justify-center">
            {renderValue(row.enterprise)}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default FeatureComparison;
