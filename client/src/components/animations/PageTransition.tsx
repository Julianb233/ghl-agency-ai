import React from 'react';
import { motion, AnimatePresence, type Variants, type Transition } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const pageVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 8 
  },
  animate: { 
    opacity: 1, 
    y: 0 
  },
  exit: { 
    opacity: 0, 
    y: -8 
  }
};

const reducedMotionVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const transition: Transition = {
  duration: 0.2,
  ease: 'easeOut' as Transition['ease']
};

export function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={prefersReducedMotion ? reducedMotionVariants : pageVariants}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface PageTransitionWrapperProps {
  children: React.ReactNode;
  locationKey: string;
}

export function PageTransitionWrapper({ children, locationKey }: PageTransitionWrapperProps) {
  return (
    <AnimatePresence mode="wait">
      <PageTransition key={locationKey}>
        {children}
      </PageTransition>
    </AnimatePresence>
  );
}
