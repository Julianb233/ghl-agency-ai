import { useRef, useEffect, useState, useCallback, RefObject } from 'react';
import { useReducedMotion } from './useReducedMotion';

interface UseScrollAnimationOptions {
  /** Trigger animation only once (default: true) */
  once?: boolean;
  /** Margin around the viewport to trigger earlier/later (default: '-100px') */
  margin?: string;
  /** Percentage of element visible to trigger (0-1, default: 0.2) */
  threshold?: number;
  /** Delay before animation starts in ms (default: 0) */
  delay?: number;
}

interface UseScrollAnimationReturn<T extends HTMLElement> {
  ref: RefObject<T>;
  isInView: boolean;
  hasAnimated: boolean;
  prefersReducedMotion: boolean;
}

/**
 * Hook for detecting when an element enters the viewport
 * Used for scroll-triggered animations
 */
export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
): UseScrollAnimationReturn<T> {
  const {
    once = true,
    margin = '-100px',
    threshold = 0.2,
    delay = 0,
  } = options;

  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If reduced motion, immediately show without animation
    if (prefersReducedMotion) {
      setIsInView(true);
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Apply delay if specified
            if (delay > 0) {
              setTimeout(() => {
                setIsInView(true);
                setHasAnimated(true);
              }, delay);
            } else {
              setIsInView(true);
              setHasAnimated(true);
            }

            // Disconnect if we only want to trigger once
            if (once) {
              observer.disconnect();
            }
          } else if (!once) {
            setIsInView(false);
          }
        });
      },
      {
        rootMargin: margin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [once, margin, threshold, delay, prefersReducedMotion]);

  return { ref, isInView, hasAnimated, prefersReducedMotion };
}

/**
 * Hook for staggered animations on multiple children
 */
export function useStaggeredAnimation(
  itemCount: number,
  baseDelay: number = 100
): number[] {
  return Array.from({ length: itemCount }, (_, i) => i * baseDelay);
}

export default useScrollAnimation;
