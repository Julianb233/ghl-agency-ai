import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useTourStore } from '@/stores/tourStore';

interface HelpMenuProps {
  onOpenHelpCenter: () => void;
}

export function HelpMenu({ onOpenHelpCenter }: HelpMenuProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { getUncompletedToursCount } = useTourStore();
  const uncompletedCount = getUncompletedToursCount();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.4,
        type: 'spring',
        stiffness: 200,
        damping: 20,
      }}
      className="fixed bottom-6 right-6 z-50"
    >
      <motion.button
        data-tour="help-menu"
        onClick={onOpenHelpCenter}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={prefersReducedMotion ? {} : {
          scale: 1.1,
          rotate: [0, -10, 10, -10, 0],
        }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
        transition={{
          scale: { duration: 0.2 },
          rotate: { duration: 0.5, ease: 'easeInOut' },
        }}
        className="group relative flex items-center justify-center w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-colors duration-200"
        aria-label="Open help center"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-indigo-500/50 to-purple-500/50 rounded-full blur-xl"
          animate={prefersReducedMotion ? {} : {
            opacity: isHovered ? 1 : 0,
            scale: isHovered ? 1.2 : 1,
          }}
          transition={{ duration: 0.3 }}
        />

        <motion.div
          animate={prefersReducedMotion ? {} : {
            rotate: isHovered ? 360 : 0,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <HelpCircle className="w-6 h-6 relative z-10" />
        </motion.div>

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className="absolute right-full mr-3 px-3 py-2 bg-slate-900/95 backdrop-blur-sm text-white text-sm rounded-lg whitespace-nowrap shadow-lg border border-slate-700/50"
            >
              Help Center
              <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-900/95 border-r border-b border-slate-700/50 rotate-[-45deg]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {uncompletedCount > 0 && (
        <motion.div
          initial={prefersReducedMotion ? {} : { scale: 0 }}
          animate={prefersReducedMotion ? {} : { scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 15,
            delay: 0.3,
          }}
          className="absolute -top-1 -right-1"
        >
          <motion.div
            animate={prefersReducedMotion ? {} : {
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-slate-900"
          >
            {uncompletedCount}
          </motion.div>

          {/* Pulsing ring effect */}
          {!prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 bg-red-500 rounded-full"
              animate={{
                scale: [1, 1.8, 2.2],
                opacity: [0.6, 0.3, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
