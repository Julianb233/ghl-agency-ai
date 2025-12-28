import React, { useEffect, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useReducedMotion, useIsTouchDevice } from '@/hooks/useReducedMotion';

interface CustomCursorProps {
  /** Size of the cursor in pixels */
  size?: number;
  /** Color of the cursor */
  color?: string;
  /** Scale when hovering interactive elements */
  hoverScale?: number;
  /** Whether to use mix-blend-mode */
  mixBlend?: boolean;
  /** Z-index for the cursor */
  zIndex?: number;
}

/**
 * Custom animated cursor that follows mouse and reacts to interactive elements
 * Automatically hidden on touch devices and when reduced motion is preferred
 */
export function CustomCursor({
  size = 24,
  color = 'rgba(16, 185, 129, 0.8)',
  hoverScale = 1.8,
  mixBlend = true,
  zIndex = 9999,
}: CustomCursorProps) {
  const prefersReducedMotion = useReducedMotion();
  const isTouchDevice = useIsTouchDevice();
  const isDisabled = prefersReducedMotion || isTouchDevice;

  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Motion values for position
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Spring config for smooth following
  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  // Track mouse position
  const moveCursor = useCallback(
    (e: MouseEvent) => {
      cursorX.set(e.clientX - size / 2);
      cursorY.set(e.clientY - size / 2);
      if (!isVisible) setIsVisible(true);
    },
    [cursorX, cursorY, size, isVisible]
  );

  // Track hover state on interactive elements
  useEffect(() => {
    if (isDisabled) return;

    const handleMouseMove = (e: MouseEvent) => moveCursor(e);

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);
    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeaveWindow = () => setIsVisible(false);
    const handleMouseEnterWindow = () => setIsVisible(true);

    // Add global listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeaveWindow);
    document.addEventListener('mouseenter', handleMouseEnterWindow);

    // Add hover listeners to interactive elements
    const interactiveElements = document.querySelectorAll(
      'a, button, [role="button"], input, textarea, select, [data-cursor-hover]'
    );

    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeaveWindow);
      document.removeEventListener('mouseenter', handleMouseEnterWindow);

      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [isDisabled, moveCursor]);

  // Re-bind listeners when DOM changes (for SPAs)
  useEffect(() => {
    if (isDisabled) return;

    const observer = new MutationObserver(() => {
      const handleMouseEnter = () => setIsHovering(true);
      const handleMouseLeave = () => setIsHovering(false);

      document
        .querySelectorAll('a, button, [role="button"], [data-cursor-hover]')
        .forEach((el) => {
          el.removeEventListener('mouseenter', handleMouseEnter);
          el.removeEventListener('mouseleave', handleMouseLeave);
          el.addEventListener('mouseenter', handleMouseEnter);
          el.addEventListener('mouseleave', handleMouseLeave);
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isDisabled]);

  // Don't render on touch devices or with reduced motion
  if (isDisabled) return null;

  return (
    <>
      {/* Hide default cursor on the body */}
      <style>{`
        body { cursor: none !important; }
        a, button, [role="button"], input, textarea, select { cursor: none !important; }
      `}</style>

      {/* Main cursor */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none rounded-full"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          width: size,
          height: size,
          backgroundColor: color,
          mixBlendMode: mixBlend ? 'difference' : undefined,
          zIndex,
          opacity: isVisible ? 1 : 0,
        }}
        animate={{
          scale: isClicking ? 0.8 : isHovering ? hoverScale : 1,
          opacity: isVisible ? (isHovering ? 0.9 : 0.7) : 0,
        }}
        transition={{
          scale: { type: 'spring', stiffness: 500, damping: 28 },
          opacity: { duration: 0.2 },
        }}
      />

      {/* Inner dot for precision */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none rounded-full bg-white"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          width: size / 4,
          height: size / 4,
          marginLeft: (size - size / 4) / 2,
          marginTop: (size - size / 4) / 2,
          zIndex: zIndex + 1,
          opacity: isVisible ? 1 : 0,
        }}
        animate={{
          scale: isHovering ? 0 : 1,
          opacity: isVisible ? (isHovering ? 0 : 0.9) : 0,
        }}
        transition={{ duration: 0.15 }}
      />
    </>
  );
}

/**
 * Simple cursor dot (lighter alternative)
 */
export function CursorDot({ color = 'oklch(0.65 0.2 160)' }: { color?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const isTouchDevice = useIsTouchDevice();

  if (prefersReducedMotion || isTouchDevice) return null;

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { stiffness: 500, damping: 30 });
  const springY = useSpring(cursorY, { stiffness: 500, damping: 30 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      cursorX.set(e.clientX - 4);
      cursorY.set(e.clientY - 4);
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-2 h-2 rounded-full pointer-events-none z-[9999]"
      style={{ x: springX, y: springY, backgroundColor: color }}
    />
  );
}

export default CustomCursor;
