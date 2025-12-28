import { useCallback, useEffect, useState, RefObject } from 'react';
import { useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion';
import { useReducedMotion, useIsTouchDevice } from './useReducedMotion';

interface Use3DMouseTrackingOptions {
  /** Maximum rotation in degrees (default: 8) */
  strength?: number;
  /** Spring stiffness for smoothness (default: 300) */
  stiffness?: number;
  /** Spring damping for smoothness (default: 30) */
  damping?: number;
  /** Whether to apply perspective transform (default: true) */
  perspective?: boolean;
  /** Perspective distance in px (default: 1000) */
  perspectiveDistance?: number;
}

interface Use3DMouseTrackingReturn {
  /** Ref to attach to the container element */
  containerRef: RefObject<HTMLDivElement>;
  /** Motion style object to spread on the animated element */
  motionStyle: {
    rotateX: MotionValue<number>;
    rotateY: MotionValue<number>;
    scale: MotionValue<number>;
  };
  /** Whether 3D effects are disabled (reduced motion/touch) */
  isDisabled: boolean;
  /** Event handlers to attach to the container */
  handlers: {
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseLeave: () => void;
    onMouseEnter: () => void;
  };
}

/**
 * Hook for creating 3D card tilt effects based on mouse position
 * Automatically disabled for touch devices and reduced motion
 */
export function use3DMouseTracking(
  ref: RefObject<HTMLDivElement>,
  options: Use3DMouseTrackingOptions = {}
): Use3DMouseTrackingReturn {
  const {
    strength = 8,
    stiffness = 300,
    damping = 30,
    perspective = true,
    perspectiveDistance = 1000,
  } = options;

  const prefersReducedMotion = useReducedMotion();
  const isTouchDevice = useIsTouchDevice();
  const isDisabled = prefersReducedMotion || isTouchDevice;

  // Raw mouse position values (-0.5 to 0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Hover state for scale
  const [isHovered, setIsHovered] = useState(false);

  // Transform mouse position to rotation angles
  const rotateXRaw = useTransform(mouseY, [-0.5, 0.5], [strength, -strength]);
  const rotateYRaw = useTransform(mouseX, [-0.5, 0.5], [-strength, strength]);

  // Apply spring physics for smooth movement
  const springConfig = { stiffness, damping };
  const rotateX = useSpring(rotateXRaw, springConfig);
  const rotateY = useSpring(rotateYRaw, springConfig);

  // Scale on hover
  const scaleValue = useMotionValue(1);
  const scale = useSpring(scaleValue, { stiffness: 400, damping: 25 });

  // Update scale based on hover state
  useEffect(() => {
    scaleValue.set(isHovered && !isDisabled ? 1.02 : 1);
  }, [isHovered, isDisabled, scaleValue]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current || isDisabled) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate position relative to center (-0.5 to 0.5)
      const x = (e.clientX - centerX) / rect.width;
      const y = (e.clientY - centerY) / rect.height;

      mouseX.set(x);
      mouseY.set(y);
    },
    [ref, mouseX, mouseY, isDisabled]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  }, [mouseX, mouseY]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  // Reset on disabled change
  useEffect(() => {
    if (isDisabled) {
      mouseX.set(0);
      mouseY.set(0);
      scaleValue.set(1);
    }
  }, [isDisabled, mouseX, mouseY, scaleValue]);

  return {
    containerRef: ref,
    motionStyle: {
      rotateX: isDisabled ? useMotionValue(0) : rotateX,
      rotateY: isDisabled ? useMotionValue(0) : rotateY,
      scale: isDisabled ? useMotionValue(1) : scale,
    },
    isDisabled,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      onMouseEnter: handleMouseEnter,
    },
  };
}

/**
 * Simplified hook that returns just the motion values for direct use
 */
export function use3DCardTilt(strength: number = 8) {
  const prefersReducedMotion = useReducedMotion();
  const isTouchDevice = useIsTouchDevice();
  const isDisabled = prefersReducedMotion || isTouchDevice;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [strength, -strength]),
    { stiffness: 300, damping: 30 }
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-strength, strength]),
    { stiffness: 300, damping: 30 }
  );

  const handleMouse = (e: React.MouseEvent<HTMLElement>) => {
    if (isDisabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const resetMouse = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return {
    rotateX: isDisabled ? 0 : rotateX,
    rotateY: isDisabled ? 0 : rotateY,
    onMouseMove: handleMouse,
    onMouseLeave: resetMouse,
    isDisabled,
  };
}

export default use3DMouseTracking;
