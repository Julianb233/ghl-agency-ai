import React from 'react';
import { Shield, Lock, CreditCard, RefreshCcw, Award, CheckCircle } from 'lucide-react';

interface TrustBadgesProps {
  variant?: 'light' | 'dark';
  showAll?: boolean;
}

export const TrustBadges: React.FC<TrustBadgesProps> = ({
  variant = 'light',
  showAll = false
}) => {
  const isDark = variant === 'dark';

  const badges = [
    { icon: Shield, label: '256-bit SSL', sublabel: 'Encrypted' },
    { icon: RefreshCcw, label: '30-Day', sublabel: 'Money Back' },
    { icon: Lock, label: 'SOC 2', sublabel: 'Compliant' },
    { icon: CreditCard, label: 'Secure', sublabel: 'Checkout' },
  ];

  const allBadges = showAll ? [
    ...badges,
    { icon: Award, label: '5-Star', sublabel: 'Rated' },
    { icon: CheckCircle, label: '99.9%', sublabel: 'Uptime' },
  ] : badges;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
      {allBadges.map((badge, i) => (
        <div
          key={i}
          className={`flex items-center gap-1.5 sm:gap-2 ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          <badge.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${
            isDark ? 'text-green-400' : 'text-green-600'
          }`} />
          <div className="text-left">
            <div className={`text-xs sm:text-xs font-bold leading-tight ${
              isDark ? 'text-white' : 'text-slate-800'
            }`}>
              {badge.label}
            </div>
            <div className={`text-xs sm:text-xs leading-tight ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {badge.sublabel}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Compact inline version for CTAs
export const TrustBadgesInline: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-4 text-xs text-slate-500 ${className}`}>
    <span className="flex items-center gap-1">
      <Shield className="w-3.5 h-3.5 text-green-500" />
      SSL Secure
    </span>
    <span className="flex items-center gap-1">
      <RefreshCcw className="w-3.5 h-3.5 text-green-500" />
      30-Day Guarantee
    </span>
    <span className="flex items-center gap-1">
      <Lock className="w-3.5 h-3.5 text-green-500" />
      No Card Required
    </span>
  </div>
);
