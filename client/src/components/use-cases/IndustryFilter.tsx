import React from 'react';
import { motion } from 'framer-motion';

interface Industry {
  id: string;
  label: string;
  count: number;
}

interface IndustryFilterProps {
  industries: Industry[];
  activeIndustry: string;
  onSelect: (id: string) => void;
}

export const IndustryFilter: React.FC<IndustryFilterProps> = ({
  industries,
  activeIndustry,
  onSelect,
}) => {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {industries.map((industry) => (
        <motion.button
          key={industry.id}
          onClick={() => onSelect(industry.id)}
          className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeIndustry === industry.id
              ? 'text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {activeIndustry === industry.id && (
            <motion.div
              layoutId="activeIndustry"
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {industry.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeIndustry === industry.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {industry.count}
            </span>
          </span>
        </motion.button>
      ))}
    </div>
  );
};

export default IndustryFilter;
