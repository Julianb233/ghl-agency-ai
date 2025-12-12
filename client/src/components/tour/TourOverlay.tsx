import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TourOverlayProps {
  targetRect: DOMRect | null;
}

export function TourOverlay({ targetRect }: TourOverlayProps) {
  const [animatedRect, setAnimatedRect] = useState<DOMRect | null>(targetRect);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (targetRect) {
      setAnimatedRect(targetRect);
    }
  }, [targetRect]);

  if (!targetRect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] pointer-events-none"
      />
    );
  }

  const padding = 8;
  const borderRadius = 8;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
      className="fixed inset-0 z-[9998] pointer-events-none"
    >
      <motion.svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
        initial={false}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.rect
              animate={{
                x: (animatedRect?.left ?? 0) - padding,
                y: (animatedRect?.top ?? 0) - padding,
                width: (animatedRect?.width ?? 0) + padding * 2,
                height: (animatedRect?.height ?? 0) + padding * 2,
              }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.5,
                ease: [0.4, 0, 0.2, 1], // Custom easing for smooth motion
              }}
              rx={borderRadius}
              fill="black"
            />
          </mask>

          {/* Gradient for subtle glow effect */}
          <radialGradient id="spotlight-glow">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.4)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
          </radialGradient>
        </defs>

        {/* Backdrop with blur */}
        <motion.rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#tour-spotlight-mask)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
        />

        {/* Animated border with pulsing effect */}
        <motion.rect
          animate={{
            x: (animatedRect?.left ?? 0) - padding,
            y: (animatedRect?.top ?? 0) - padding,
            width: (animatedRect?.width ?? 0) + padding * 2,
            height: (animatedRect?.height ?? 0) + padding * 2,
          }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.5,
            ease: [0.4, 0, 0.2, 1],
          }}
          rx={borderRadius}
          fill="none"
          stroke="rgba(99, 102, 241, 0.8)"
          strokeWidth="2"
        />

        {/* Pulsing glow ring around highlighted element */}
        {!prefersReducedMotion && (
          <motion.rect
            animate={{
              x: (animatedRect?.left ?? 0) - padding,
              y: (animatedRect?.top ?? 0) - padding,
              width: (animatedRect?.width ?? 0) + padding * 2,
              height: (animatedRect?.height ?? 0) + padding * 2,
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.02, 1],
            }}
            transition={{
              x: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
              y: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
              width: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
              height: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            }}
            rx={borderRadius}
            fill="none"
            stroke="url(#spotlight-glow)"
            strokeWidth="8"
            style={{
              filter: 'blur(8px)',
            }}
          />
        )}
      </motion.svg>
    </motion.div>
  );
}
