import React from 'react';
import { motion } from 'framer-motion';
import { GradientText } from '../effects/GradientText';

interface MissionSectionProps {
  mission: string;
  vision: string;
  className?: string;
}

export const MissionSection: React.FC<MissionSectionProps> = ({
  mission,
  vision,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${className}`}>
      {/* Mission */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-8"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 block">
            Our Mission
          </span>
          <h3 className="text-2xl font-bold mb-4">
            <GradientText gradient="from-blue-400 to-cyan-500">
              What We Do
            </GradientText>
          </h3>
          <p className="text-slate-300 leading-relaxed">{mission}</p>
        </div>
      </motion.div>

      {/* Vision */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-8"
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <div className="relative">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2 block">
            Our Vision
          </span>
          <h3 className="text-2xl font-bold mb-4">
            <GradientText gradient="from-purple-400 to-pink-500">
              Where We're Going
            </GradientText>
          </h3>
          <p className="text-slate-300 leading-relaxed">{vision}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default MissionSection;
