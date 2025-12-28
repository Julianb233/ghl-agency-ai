import { useState, useCallback, TouchEvent } from 'react';

interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number;
  preventScroll?: boolean;
}

interface SwipeGestureHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
}

/**
 * Custom hook for handling swipe gestures on mobile devices
 *
 * @param config - Configuration object with swipe handlers
 * @returns Touch event handlers to attach to your element
 *
 * @example
 * ```tsx
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 *   minSwipeDistance: 50,
 * });
 *
 * return <div {...swipeHandlers}>Swipeable content</div>;
 * ```
 */
export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minSwipeDistance = 50,
  preventScroll = false,
}: SwipeGestureConfig): SwipeGestureHandlers => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      setTouchEnd({
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      });

      // Prevent scroll if configured
      if (preventScroll && touchStart) {
        const xDiff = Math.abs(e.targetTouches[0].clientX - touchStart.x);
        const yDiff = Math.abs(e.targetTouches[0].clientY - touchStart.y);

        // If horizontal swipe is dominant, prevent vertical scroll
        if (xDiff > yDiff) {
          e.preventDefault();
        }
      }
    },
    [touchStart, preventScroll]
  );

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const xDiff = touchStart.x - touchEnd.x;
    const yDiff = touchStart.y - touchEnd.y;
    const xDiffAbs = Math.abs(xDiff);
    const yDiffAbs = Math.abs(yDiff);

    // Determine if horizontal or vertical swipe
    if (xDiffAbs > yDiffAbs) {
      // Horizontal swipe
      if (xDiffAbs > minSwipeDistance) {
        if (xDiff > 0) {
          // Swiped left
          onSwipeLeft?.();
        } else {
          // Swiped right
          onSwipeRight?.();
        }
      }
    } else {
      // Vertical swipe
      if (yDiffAbs > minSwipeDistance) {
        if (yDiff > 0) {
          // Swiped up
          onSwipeUp?.();
        } else {
          // Swiped down
          onSwipeDown?.();
        }
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, minSwipeDistance, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

/**
 * Hook for detecting horizontal swipes only
 * Useful for carousels, drawers, etc.
 */
export const useHorizontalSwipe = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  minSwipeDistance = 50
) => {
  return useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance,
    preventScroll: true,
  });
};

/**
 * Hook for detecting vertical swipes only
 * Useful for pull-to-refresh, dismiss gestures, etc.
 */
export const useVerticalSwipe = (
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  minSwipeDistance = 50
) => {
  return useSwipeGesture({
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance,
    preventScroll: false,
  });
};
