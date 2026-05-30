import React from 'react';
import { motion, Variants, HTMLMotionProps } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

type MotionTag = 'div' | 'section' | 'article' | 'main' | 'aside' | 'nav' | 'header' | 'footer' | 'ul' | 'ol' | 'li' | 'span' | 'p';
import {
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  scaleInBounce,
  reducedMotionVariants,
} from '@/lib/animations';

type AnimationVariant =
  | 'fadeIn'
  | 'fadeInUp'
  | 'fadeInDown'
  | 'fadeInLeft'
  | 'fadeInRight'
  | 'scaleIn'
  | 'scaleInBounce';

const variantMap: Record<AnimationVariant, Variants> = {
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  scaleInBounce,
};

interface ScrollRevealProps {
  /** Content to reveal */
  children: React.ReactNode;
  /** Animation variant to use */
  variant?: AnimationVariant;
  /** Custom variants (overrides variant prop) */
  customVariants?: Variants;
  /** Delay before animation in ms */
  delay?: number;
  /** Only animate once (default: true) */
  once?: boolean;
  /** Viewport margin for trigger */
  margin?: string;
  /** Percentage of element visible to trigger (0-1) */
  threshold?: number;
  /** Additional className */
  className?: string;
  /** HTML element to render as */
  as?: MotionTag;
}

/**
 * Component that reveals children with animation when scrolled into view
 * Automatically respects prefers-reduced-motion
 */
export function ScrollReveal({
  children,
  variant = 'fadeInUp',
  customVariants,
  delay = 0,
  once = true,
  margin = '-80px',
  threshold = 0.2,
  className = '',
  as = 'div',
}: ScrollRevealProps) {
  const { ref, isInView, prefersReducedMotion } = useScrollAnimation({
    once,
    margin,
    threshold,
    delay,
  });

  const variants = customVariants || variantMap[variant];
  
  const MotionComponent = motion[as] as React.ComponentType<{
    ref: React.Ref<HTMLElement>;
    initial: string;
    animate: string;
    variants: Variants;
    className?: string;
    children?: React.ReactNode;
  }>;

  return (
    <MotionComponent
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={prefersReducedMotion ? reducedMotionVariants : variants}
      className={className}
    >
      {children}
    </MotionComponent>
  );
}

interface StaggerRevealProps {
  /** Items to reveal with stagger */
  children: React.ReactNode;
  /** Animation variant for children */
  childVariant?: AnimationVariant;
  /** Stagger delay between children in seconds */
  stagger?: number;
  /** Delay before container starts */
  delay?: number;
  /** Additional className for container */
  className?: string;
  /** HTML element for container */
  as?: MotionTag;
}

/**
 * Container that reveals children with staggered animations
 */
export function StaggerReveal({
  children,
  childVariant = 'fadeInUp',
  stagger = 0.1,
  delay = 0.1,
  className = '',
  as = 'div',
}: StaggerRevealProps) {
  const { ref, isInView, prefersReducedMotion } = useScrollAnimation({
    once: true,
    margin: '-60px',
    threshold: 0.1,
  });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : stagger,
        delayChildren: prefersReducedMotion ? 0 : delay,
      },
    },
  };

  const MotionComponent = motion[as] as React.ComponentType<{
    ref: React.Ref<HTMLElement>;
    initial: string;
    animate: string;
    variants: Variants;
    className?: string;
    children?: React.ReactNode;
  }>;
  const childVariants = variantMap[childVariant];

  return (
    <MotionComponent
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={containerVariants}
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={prefersReducedMotion ? reducedMotionVariants : childVariants}
        >
          {child}
        </motion.div>
      ))}
    </MotionComponent>
  );
}

/**
 * Grid container with staggered reveal animations
 */
export function StaggerGrid({
  children,
  columns = 3,
  gap = 6,
  stagger = 0.08,
  className = '',
}: {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  stagger?: number;
  className?: string;
}) {
  const { ref, isInView, prefersReducedMotion } = useScrollAnimation({
    once: true,
    margin: '-40px',
    threshold: 0.1,
  });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : stagger,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={containerVariants}
      className={`grid gap-${gap} ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={prefersReducedMotion ? reducedMotionVariants : itemVariants}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export default ScrollReveal;
