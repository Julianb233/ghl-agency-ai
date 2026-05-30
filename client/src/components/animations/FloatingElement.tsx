import React from 'react';
import { motion, type Transition } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface FloatingElementProps {
  /** Content to float */
  children: React.ReactNode;
  /** Animation duration in seconds */
  duration?: number;
  /** Vertical float distance in pixels */
  distance?: number;
  /** Delay before animation starts */
  delay?: number;
  /** Whether to also add horizontal movement */
  horizontal?: boolean;
  /** Additional className */
  className?: string;
  /** Custom animation easing */
  ease?: Transition['ease'];
}

/**
 * Wrapper component that adds a gentle floating animation
 * Automatically respects prefers-reduced-motion
 */
export function FloatingElement({
  children,
  duration = 4,
  distance = 10,
  delay = 0,
  horizontal = false,
  className = '',
  ease = 'easeInOut',
}: FloatingElementProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const yAnimation = [-distance / 2, distance / 2, -distance / 2];
  const xAnimation = horizontal ? [-distance / 3, distance / 3, -distance / 3] : [0, 0, 0];

  return (
    <motion.div
      className={className}
      animate={{
        y: yAnimation,
        x: xAnimation,
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease,
        delay,
      }}
      style={{ willChange: 'transform' }}
    >
      {children}
    </motion.div>
  );
}

interface FloatingGroupProps {
  /** Items to float with staggered animations */
  children: React.ReactNode;
  /** Base duration for animations */
  baseDuration?: number;
  /** Base distance for floating */
  baseDistance?: number;
  /** Stagger delay between items */
  stagger?: number;
  /** Additional className for container */
  className?: string;
}

/**
 * Container for multiple floating elements with staggered animations
 */
export function FloatingGroup({
  children,
  baseDuration = 4,
  baseDistance = 10,
  stagger = 0.5,
  className = '',
}: FloatingGroupProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FloatingElement
          duration={baseDuration + (index % 3) * 0.5}
          distance={baseDistance + (index % 2) * 4}
          delay={index * stagger}
        >
          {child}
        </FloatingElement>
      ))}
    </div>
  );
}

/**
 * CSS-only floating element (lighter weight, uses CSS animation)
 */
export function FloatingElementCSS({
  children,
  slow = false,
  className = '',
}: {
  children: React.ReactNode;
  slow?: boolean;
  className?: string;
}) {
  return (
    <div className={`${slow ? 'float-gentle-slow' : 'float-gentle'} ${className}`}>
      {children}
    </div>
  );
}

export default FloatingElement;
