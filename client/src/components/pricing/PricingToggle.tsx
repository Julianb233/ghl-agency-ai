import React from 'react';
import { motion } from 'framer-motion';

interface PricingToggleProps {
  isAnnual: boolean;
  onToggle: (isAnnual: boolean) => void;
  discount?: number;
}

export const PricingToggle: React.FC<PricingToggleProps> = ({
  isAnnual,
  onToggle,
  discount = 20,
}) => {
  return (
    <div className="flex items-center justify-center gap-4">
      <span
        className={`text-sm font-medium transition-colors ${
          !isAnnual ? 'text-white' : 'text-slate-400'
        }`}
      >
        Monthly
      </span>

      <button
        onClick={() => onToggle(!isAnnual)}
        className="relative w-16 h-8 rounded-full bg-slate-700 p-1 transition-colors hover:bg-slate-600"
        aria-label={`Switch to ${isAnnual ? 'monthly' : 'annual'} billing`}
      >
        <motion.div
          className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
          animate={{
            x: isAnnual ? 32 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        />
      </button>

      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium transition-colors ${
            isAnnual ? 'text-white' : 'text-slate-400'
          }`}
        >
          Annual
        </span>
        {discount > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white"
          >
            Save {discount}%
          </motion.span>
        )}
      </div>
    </div>
  );
};

export default PricingToggle;
