import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface Value {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}

interface ValuesGridProps {
  values: Value[];
  className?: string;
}

export const ValuesGrid: React.FC<ValuesGridProps> = ({
  values,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {values.map((value, index) => (
        <motion.div
          key={value.title}
          className="relative group"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <div className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-6 h-full">
            {/* Gradient overlay on hover */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br ${value.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
            />

            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${value.gradient} flex items-center justify-center mb-4`}>
              <value.icon className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
            <p className="text-sm text-slate-400">{value.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ValuesGrid;
