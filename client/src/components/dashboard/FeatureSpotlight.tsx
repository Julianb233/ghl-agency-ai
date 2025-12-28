import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'ghl-feature-spotlights-seen';

// Hook for managing feature spotlight state
export const useFeatureSpotlight = () => {
  const hasSeenFeature = (featureId: string): boolean => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) return false;
      const seenIds: string[] = JSON.parse(seen);
      return seenIds.includes(featureId);
    } catch {
      return false;
    }
  };

  const markAsSeen = (featureId: string): void => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      const seenIds: string[] = seen ? JSON.parse(seen) : [];
      if (!seenIds.includes(featureId)) {
        seenIds.push(featureId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seenIds));
      }
    } catch (error) {
      console.error('Failed to mark feature as seen:', error);
    }
  };

  const resetAll = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset feature spotlights:', error);
    }
  };

  return { hasSeenFeature, markAsSeen, resetAll };
};

interface FeatureSpotlightProps {
  featureId: string;
  title: string;
  description: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  onDismiss?: () => void;
}

export const FeatureSpotlight: React.FC<FeatureSpotlightProps> = ({
  featureId,
  title,
  description,
  shortcut,
  position = 'bottom',
  children,
  onDismiss,
}) => {
  const { hasSeenFeature, markAsSeen } = useFeatureSpotlight();
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // Show spotlight if not seen before
    if (!hasSeenFeature(featureId)) {
      // Small delay for smooth appearance after mount
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [featureId, hasSeenFeature]);

  useEffect(() => {
    if (isVisible && containerRef.current) {
      calculatePosition();
    }
  }, [isVisible]);

  const calculatePosition = () => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const tooltipWidth = 320; // Approximate tooltip width
    const tooltipHeight = 150; // Approximate tooltip height
    const offset = 12; // Gap between element and tooltip

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - offset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - offset;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + offset;
        break;
    }

    // Keep tooltip within viewport bounds
    const padding = 16;
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

    setTooltipPosition({ top, left });
  };

  const handleDismiss = () => {
    if (dontShowAgain) {
      markAsSeen(featureId);
    }
    setIsVisible(false);
    onDismiss?.();
  };

  const handleGotIt = () => {
    markAsSeen(featureId);
    setIsVisible(false);
    onDismiss?.();
  };

  const getArrowClasses = () => {
    const baseClasses = "absolute w-3 h-3 bg-slate-800 border";
    switch (position) {
      case 'top':
        return cn(baseClasses, "bottom-[-6px] left-1/2 -translate-x-1/2 border-b border-r border-slate-700/50 rotate-45");
      case 'bottom':
        return cn(baseClasses, "top-[-6px] left-1/2 -translate-x-1/2 border-t border-l border-slate-700/50 rotate-45");
      case 'left':
        return cn(baseClasses, "right-[-6px] top-1/2 -translate-y-1/2 border-r border-b border-slate-700/50 rotate-45");
      case 'right':
        return cn(baseClasses, "left-[-6px] top-1/2 -translate-y-1/2 border-l border-t border-slate-700/50 rotate-45");
      default:
        return baseClasses;
    }
  };

  return (
    <>
      {/* The feature element */}
      <div ref={containerRef} className="relative inline-block">
        {children}
      </div>

      {/* Spotlight overlay portal */}
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Subtle backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[60]"
              onClick={handleDismiss}
            />

            {/* Tooltip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              style={{
                position: 'fixed',
                top: `${tooltipPosition.top}px`,
                left: `${tooltipPosition.left}px`,
              }}
              className="z-[70] w-80"
            >
              <div className="relative bg-slate-800 border border-slate-700/50 rounded-lg shadow-2xl p-4">
                {/* Arrow */}
                <div className={getArrowClasses()} />

                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white mb-1">
                      {title}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {description}
                    </p>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 w-6 h-6 rounded hover:bg-slate-700 flex items-center justify-center transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Shortcut hint */}
                {shortcut && (
                  <div className="mb-3 px-3 py-2 rounded-md bg-slate-900/50 border border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Keyboard shortcut:</span>
                      <kbd className="px-2 py-1 rounded bg-slate-700 text-slate-300 text-xs font-mono">
                        {shortcut}
                      </kbd>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    onClick={handleGotIt}
                    className="w-full px-3 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                  >
                    Got it!
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 focus:ring-2"
                    />
                    <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                      Don't show this again
                    </span>
                  </label>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeatureSpotlight;
