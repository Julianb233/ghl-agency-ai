import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { TourStep } from '@/stores/tourStore';

interface TourTooltipProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function TourTooltip({
  step,
  currentStep,
  totalSteps,
  targetRect,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
}: TourTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!targetRect || !tooltipRef.current) {
      setPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      return;
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const placement = step.placement || 'bottom';
    const offset = 16;
    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = targetRect.top - tooltipRect.height - offset;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + offset;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.left - tooltipRect.width - offset;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.right + offset;
        break;
    }

    const padding = 16;
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding));
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

    setPosition({ top, left });
  }, [targetRect, step.placement]);

  // Get directional animation based on placement
  const getPlacementAnimation = () => {
    const placement = step.placement || 'bottom';
    const distance = 20;

    if (prefersReducedMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    }

    switch (placement) {
      case 'top':
        return {
          initial: { opacity: 0, y: distance },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: distance },
        };
      case 'bottom':
        return {
          initial: { opacity: 0, y: -distance },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -distance },
        };
      case 'left':
        return {
          initial: { opacity: 0, x: distance },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: distance },
        };
      case 'right':
        return {
          initial: { opacity: 0, x: -distance },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -distance },
        };
      default:
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.95 },
        };
    }
  };

  const placementAnimation = getPlacementAnimation();

  return (
    <motion.div
      ref={tooltipRef}
      key={currentStep}
      className="fixed z-[9999] w-full max-w-md transform -translate-x-1/2 -translate-y-1/2"
      initial={placementAnimation.initial}
      animate={{
        top: position.top,
        left: position.left,
        ...placementAnimation.animate,
      }}
      exit={placementAnimation.exit}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: prefersReducedMotion ? 0 : 0.4,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.2, delay: 0.1 }}
        className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl p-6"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-lg" />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <motion.h3
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: 0.2 }}
              className="text-lg font-semibold text-white pr-8"
            >
              {step.title}
            </motion.h3>
            <motion.button
              onClick={onSkip}
              whileHover={prefersReducedMotion ? {} : { scale: 1.1, rotate: 90 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 right-0 text-slate-400 hover:text-white transition-colors"
              aria-label="Skip tour"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: 0.3 }}
            className="text-slate-300 text-sm mb-6 leading-relaxed"
          >
            {step.content}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: 0.4 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {currentStep + 1} / {totalSteps}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <motion.div
                    key={index}
                    initial={prefersReducedMotion ? {} : { scale: 0 }}
                    animate={prefersReducedMotion ? {} : { scale: 1 }}
                    transition={{
                      duration: 0.2,
                      delay: 0.5 + index * 0.05,
                      type: 'spring',
                      stiffness: 400,
                      damping: 20,
                    }}
                    className={'w-1.5 h-1.5 rounded-full transition-all duration-300 ' + (
                      index === currentStep
                        ? 'bg-indigo-500 scale-125'
                        : index < currentStep
                        ? 'bg-indigo-600/50'
                        : 'bg-slate-600'
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <AnimatePresence mode="wait">
                {!isFirstStep && (
                  <motion.div
                    initial={prefersReducedMotion ? {} : { opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={prefersReducedMotion ? {} : { opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      onClick={onPrevious}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              >
                {isLastStep ? (
                  <Button
                    onClick={onComplete}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Complete
                  </Button>
                ) : (
                  <Button
                    onClick={onNext}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
