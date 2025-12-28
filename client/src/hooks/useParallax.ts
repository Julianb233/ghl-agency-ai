import { useEffect, useState, useCallback, RefObject } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface UseParallaxOptions {
  /** Speed multiplier (0.1 = slow, 1 = match scroll, default: 0.5) */
  speed?: number;
  /** Direction of parallax effect (default: 'vertical') */
  direction?: 'vertical' | 'horizontal';
  /** Reverse the direction (default: false) */
  reverse?: boolean;
  /** Clamp the offset to prevent extreme values (default: 200) */
  maxOffset?: number;
}

interface UseParallaxReturn {
  /** CSS transform string to apply */
  transform: string;
  /** Raw offset value in pixels */
  offset: number;
  /** Whether parallax is disabled (reduced motion) */
  isDisabled: boolean;
}

/**
 * Hook for creating parallax scroll effects
 * Automatically respects prefers-reduced-motion
 */
export function useParallax(
  ref: RefObject<HTMLElement>,
  options: UseParallaxOptions = {}
): UseParallaxReturn {
  const {
    speed = 0.5,
    direction = 'vertical',
    reverse = false,
    maxOffset = 200,
  } = options;

  const [offset, setOffset] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const handleScroll = useCallback(() => {
    if (!ref.current || prefersReducedMotion) return;

    const rect = ref.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportCenter = viewportHeight / 2;
    const elementCenter = rect.top + rect.height / 2;
    const distanceFromCenter = elementCenter - viewportCenter;

    let parallaxOffset = distanceFromCenter * speed;
    if (reverse) parallaxOffset *= -1;

    // Clamp the offset to prevent extreme values
    parallaxOffset = Math.max(-maxOffset, Math.min(maxOffset, parallaxOffset));

    setOffset(parallaxOffset);
  }, [ref, speed, reverse, maxOffset, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setOffset(0);
      return;
    }

    // RAF-throttled scroll handler for performance
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial calculation
    handleScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [handleScroll, prefersReducedMotion]);

  const transform =
    direction === 'vertical'
      ? `translate3d(0, ${offset}px, 0)`
      : `translate3d(${offset}px, 0, 0)`;

  return {
    transform: prefersReducedMotion ? 'none' : transform,
    offset,
    isDisabled: prefersReducedMotion,
  };
}

/**
 * Simplified parallax hook that returns style object
 */
export function useParallaxStyle(
  ref: RefObject<HTMLElement>,
  speed: number = 0.5
): React.CSSProperties {
  const { transform, isDisabled } = useParallax(ref, { speed });

  return {
    transform: isDisabled ? undefined : transform,
    willChange: isDisabled ? undefined : 'transform',
  };
}

export default useParallax;
