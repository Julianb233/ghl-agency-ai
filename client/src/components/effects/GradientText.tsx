import React, { ElementType } from 'react';
import { motion } from 'framer-motion';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  animated?: boolean;
  shimmer?: boolean;
  as?: ElementType;
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = '',
  gradient = 'from-blue-400 via-purple-500 to-pink-500',
  animated = false,
  shimmer = false,
  as = 'span',
}) => {
  const baseClasses = `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`;
  const Tag = as;

  if (shimmer) {
    return (
      <Tag
        className={`relative inline-block ${baseClasses} ${className}`}
        style={{
          backgroundSize: '200% auto',
          animation: 'shimmer 3s linear infinite',
        }}
      >
        {children}
      </Tag>
    );
  }

  if (animated) {
    return (
      <motion.span
        className={`${baseClasses} ${className}`}
        style={{
          backgroundSize: '200% auto',
        }}
        animate={{
          backgroundPosition: ['0% center', '200% center'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {children}
      </motion.span>
    );
  }

  return (
    <Tag className={`${baseClasses} ${className}`}>
      {children}
    </Tag>
  );
};

// Predefined gradient variants
export const GradientPresets = {
  primary: 'from-blue-400 via-purple-500 to-pink-500',
  ocean: 'from-cyan-400 via-blue-500 to-indigo-600',
  sunset: 'from-orange-400 via-pink-500 to-purple-600',
  aurora: 'from-green-400 via-cyan-500 to-blue-600',
  fire: 'from-yellow-400 via-orange-500 to-red-600',
  emerald: 'from-emerald-400 via-teal-500 to-cyan-600',
  royal: 'from-indigo-400 via-purple-500 to-pink-600',
  gold: 'from-yellow-300 via-amber-400 to-orange-500',
  silver: 'from-slate-300 via-gray-400 to-zinc-500',
  neon: 'from-green-300 via-cyan-400 to-blue-500',
};

export default GradientText;
