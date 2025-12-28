import type { Variants, Transition } from 'framer-motion';

/**
 * Web 3.0 Animation Variants Library
 * Subtle & Professional - smooth, refined effects
 */

// Custom easing curves
export const easings = {
  // Smooth ease out - great for entrances
  easeOut: [0.25, 0.1, 0.25, 1],
  // Smooth ease in-out - great for hovers
  easeInOut: [0.4, 0, 0.2, 1],
  // Slight bounce - adds life without being distracting
  softBounce: [0.34, 1.56, 0.64, 1],
  // Spring-like - natural movement
  spring: [0.43, 0.13, 0.23, 0.96],
} as const;

// Default transition settings
export const defaultTransition: Transition = {
  duration: 0.5,
  ease: easings.easeOut,
};

// ============================================
// FADE ANIMATIONS
// ============================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: easings.easeOut },
  },
};

export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 24
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easings.easeOut },
  },
};

export const fadeInDown: Variants = {
  hidden: {
    opacity: 0,
    y: -24
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easings.easeOut },
  },
};

export const fadeInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -24
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: easings.easeOut },
  },
};

export const fadeInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 24
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: easings.easeOut },
  },
};

// ============================================
// SCALE ANIMATIONS
// ============================================

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.92
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: easings.easeOut },
  },
};

export const scaleInBounce: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: easings.softBounce
    },
  },
};

// ============================================
// STAGGER CONTAINERS
// ============================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.15,
    },
  },
};

// ============================================
// LIST ITEM ANIMATIONS
// ============================================

export const listItem: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: easings.easeOut },
  },
};

export const gridItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: easings.easeOut },
  },
};

// ============================================
// HOVER ANIMATIONS
// ============================================

export const hoverLift: Variants = {
  rest: {
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: easings.easeOut },
  },
  hover: {
    y: -8,
    scale: 1.02,
    transition: { duration: 0.3, ease: easings.easeOut },
  },
};

export const hoverGlow: Variants = {
  rest: {
    boxShadow: '0 0 0 rgba(16, 185, 129, 0)',
    transition: { duration: 0.3 },
  },
  hover: {
    boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
    transition: { duration: 0.3 },
  },
};

export const hoverScale: Variants = {
  rest: {
    scale: 1,
    transition: { duration: 0.2 },
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// ============================================
// 3D CARD ANIMATIONS
// ============================================

export const card3D: Variants = {
  rest: {
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: easings.easeOut,
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.3,
      ease: easings.easeOut,
    },
  },
};

// ============================================
// PAGE TRANSITIONS
// ============================================

export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easings.easeOut,
      when: 'beforeChildren',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.3, ease: easings.easeInOut },
  },
};

// ============================================
// BLOB ANIMATIONS (for backgrounds)
// ============================================

export const blobFloat: Variants = {
  initial: {
    x: 0,
    y: 0,
    scale: 1,
  },
  animate: {
    x: [0, 15, -10, 0],
    y: [0, -20, 10, 0],
    scale: [1, 1.05, 0.95, 1],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const blobFloatSlow: Variants = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: [0, -20, 15, 0],
    y: [0, 15, -10, 0],
    transition: {
      duration: 12,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================
// COUNT UP ANIMATION
// ============================================

export const countUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easings.easeOut,
    },
  },
};

// ============================================
// PARALLAX HELPERS
// ============================================

export const parallaxSlow: Variants = {
  initial: { y: 0 },
  animate: (scrollY: number) => ({
    y: scrollY * 0.3,
    transition: { duration: 0 },
  }),
};

export const parallaxFast: Variants = {
  initial: { y: 0 },
  animate: (scrollY: number) => ({
    y: scrollY * 0.6,
    transition: { duration: 0 },
  }),
};

// ============================================
// REDUCED MOTION VARIANTS
// ============================================

export const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0 },
  },
};

// ============================================
// UTILITY: Get appropriate variants
// ============================================

export function getVariants(
  variants: Variants,
  prefersReducedMotion: boolean
): Variants {
  return prefersReducedMotion ? reducedMotionVariants : variants;
}
