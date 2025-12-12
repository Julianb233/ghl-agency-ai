import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTourStore } from '@/stores/tourStore';
import { tours } from '@/config/tours';
import { Check, Clock, Keyboard, Lightbulb, RotateCcw, ExternalLink, Play } from 'lucide-react';

interface HelpCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpCenter({ open, onOpenChange }: HelpCenterProps) {
  const { startTour, isTourCompleted, resetProgress } = useTourStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleStartTour = (tourId: string) => {
    startTour(tourId);
    onOpenChange(false);
  };

  const handleResetProgress = () => {
    resetProgress();
    setShowResetConfirm(false);
  };

  const keyboardShortcuts = [
    { key: 'Esc', description: 'Close current tour or dialog' },
    { key: '←/→', description: 'Navigate between tour steps' },
    { key: '?', description: 'Open Help Center' },
  ];

  const quickTips = [
    'Use keyboard shortcuts to navigate tours faster',
    'Tours can be restarted anytime from the Help Center',
    'Completed tours are marked with a checkmark badge',
    'Your tour progress is automatically saved',
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-lg pointer-events-none" />
        
        <div className="relative">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Help Center</DialogTitle>
            <DialogDescription className="text-slate-400">
              Explore guided tours and learn how to use the platform
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 mt-6">
            <motion.section
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.h3
                variants={itemVariants}
                className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
              >
                <Play className="w-5 h-5 text-indigo-400" />
                Available Tours
              </motion.h3>
              <motion.div
                variants={containerVariants}
                className="grid gap-4"
              >
                {tours.map((tour, index) => {
                  const isCompleted = isTourCompleted(tour.id);
                  return (
                    <motion.div
                      key={tour.id}
                      variants={itemVariants}
                      whileHover={prefersReducedMotion ? {} : {
                        scale: 1.02,
                        y: -4,
                        transition: { duration: 0.2 },
                      }}
                      className="group relative bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:border-indigo-500/50 transition-colors duration-200 cursor-pointer"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 rounded-lg"
                        whileHover={prefersReducedMotion ? {} : {
                          background: 'linear-gradient(to bottom right, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))',
                          transition: { duration: 0.3 },
                        }}
                      />

                      <div className="relative flex items-start gap-4">
                        <motion.div
                          whileHover={prefersReducedMotion ? {} : {
                            rotate: [0, -10, 10, -10, 0],
                            scale: 1.1,
                          }}
                          transition={{ duration: 0.5 }}
                          className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl bg-slate-700/50 rounded-lg"
                        >
                          {tour.icon}
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-semibold text-white">{tour.name}</h4>
                              <AnimatePresence>
                                {isCompleted && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{
                                      type: 'spring',
                                      stiffness: 500,
                                      damping: 20,
                                    }}
                                  >
                                    <Badge variant="success" className="gap-1">
                                      <Check className="w-3 h-3" />
                                      Completed
                                    </Badge>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <motion.div
                              whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                            >
                              <Button
                                onClick={() => handleStartTour(tour.id)}
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
                              >
                                {isCompleted ? 'Restart' : 'Start'}
                              </Button>
                            </motion.div>
                          </div>

                          <p className="text-sm text-slate-400 mb-2">{tour.description}</p>

                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {tour.estimatedTime}
                            </div>
                            <div className="flex items-center gap-1">
                              {tour.steps.length} steps
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.section>

            <motion.section
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.h3
                variants={itemVariants}
                className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
              >
                <Keyboard className="w-5 h-5 text-indigo-400" />
                Keyboard Shortcuts
              </motion.h3>
              <motion.div
                variants={itemVariants}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4"
              >
                <motion.div
                  variants={containerVariants}
                  className="space-y-3"
                >
                  {keyboardShortcuts.map((shortcut, index) => (
                    <motion.div
                      key={index}
                      variants={itemVariants}
                      whileHover={prefersReducedMotion ? {} : {
                        x: 4,
                        transition: { duration: 0.2 },
                      }}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-slate-400">{shortcut.description}</span>
                      <motion.kbd
                        whileHover={prefersReducedMotion ? {} : {
                          scale: 1.1,
                          backgroundColor: 'rgba(71, 85, 105, 1)',
                        }}
                        transition={{ duration: 0.2 }}
                        className="px-3 py-1 text-xs font-semibold text-white bg-slate-700 border border-slate-600 rounded"
                      >
                        {shortcut.key}
                      </motion.kbd>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </motion.section>

            <motion.section
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.h3
                variants={itemVariants}
                className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
              >
                <Lightbulb className="w-5 h-5 text-indigo-400" />
                Quick Tips
              </motion.h3>
              <motion.div
                variants={itemVariants}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4"
              >
                <motion.ul
                  variants={containerVariants}
                  className="space-y-2"
                >
                  {quickTips.map((tip, index) => (
                    <motion.li
                      key={index}
                      variants={itemVariants}
                      whileHover={prefersReducedMotion ? {} : {
                        x: 4,
                        transition: { duration: 0.2 },
                      }}
                      className="flex items-start gap-2 text-sm text-slate-400"
                    >
                      <motion.div
                        animate={prefersReducedMotion ? {} : {
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: index * 0.3,
                        }}
                        className="flex-shrink-0 w-1.5 h-1.5 mt-2 bg-indigo-400 rounded-full"
                      />
                      {tip}
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: prefersReducedMotion ? 0 : 0.3 }}
              className="flex items-center justify-between pt-4 border-t border-slate-700/50"
            >
              <AnimatePresence mode="wait">
                {!showResetConfirm ? (
                  <motion.div
                    key="reset-button"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                  >
                    <motion.div
                      whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                    >
                      <Button
                        onClick={() => setShowResetConfirm(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2 text-slate-400 hover:text-white"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset All Progress
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="reset-confirm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                    className="flex items-center gap-2"
                  >
                    <motion.span
                      animate={prefersReducedMotion ? {} : {
                        opacity: [1, 0.7, 1],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                      }}
                      className="text-sm text-slate-400"
                    >
                      Are you sure?
                    </motion.span>
                    <motion.div
                      whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                    >
                      <Button
                        onClick={handleResetProgress}
                        variant="destructive"
                        size="sm"
                      >
                        Yes, Reset
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                    >
                      <Button
                        onClick={() => setShowResetConfirm(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.a
                href="#"
                whileHover={prefersReducedMotion ? {} : {
                  scale: 1.05,
                  x: 4,
                }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View Documentation
                <motion.div
                  animate={prefersReducedMotion ? {} : {
                    x: [0, 4, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                </motion.div>
              </motion.a>
            </motion.section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
