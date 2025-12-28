import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useReducedMotion, useIsTouchDevice } from '@/hooks/useReducedMotion';

interface Card3DProps {
  /** Content of the card */
  children: React.ReactNode;
  /** Maximum rotation in degrees (default: 8) */
  rotationStrength?: number;
  /** Scale on hover (default: 1.02) */
  hoverScale?: number;
  /** Whether to show glow effect on hover */
  glowOnHover?: boolean;
  /** Glow color (default: emerald) */
  glowColor?: string;
  /** Additional className */
  className?: string;
  /** Border radius */
  borderRadius?: string;
  /** Background color/class */
  background?: string;
}

/**
 * 3D card component with mouse-tracking tilt effect
 * Automatically disabled for touch devices and reduced motion
 */
export function Card3D({
  children,
  rotationStrength = 8,
  hoverScale = 1.02,
  glowOnHover = false,
  glowColor = 'oklch(0.65 0.2 160 / 0.25)',
  className = '',
  borderRadius = '1rem',
  background = 'white',
}: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isTouchDevice = useIsTouchDevice();
  const isDisabled = prefersReducedMotion || isTouchDevice;

  // Mouse position values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Transform to rotation
  const rotateXRaw = useTransform(mouseY, [-0.5, 0.5], [rotationStrength, -rotationStrength]);
  const rotateYRaw = useTransform(mouseX, [-0.5, 0.5], [-rotationStrength, rotationStrength]);

  // Spring physics for smoothness
  const springConfig = { stiffness: 300, damping: 30 };
  const rotateX = useSpring(rotateXRaw, springConfig);
  const rotateY = useSpring(rotateYRaw, springConfig);

  // Scale animation
  const scaleValue = useMotionValue(1);
  const scale = useSpring(scaleValue, { stiffness: 400, damping: 25 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || isDisabled) return;

    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height;

    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => {
    if (!isDisabled) {
      scaleValue.set(hoverScale);
    }
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    scaleValue.set(1);
  };

  if (isDisabled) {
    return (
      <div
        className={`transition-transform duration-300 hover:scale-[1.02] ${className}`}
        style={{ borderRadius, background }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="perspective-1000" ref={ref}>
      <motion.div
        className={`transform-style-3d ${className}`}
        style={{
          rotateX,
          rotateY,
          scale,
          borderRadius,
          background,
          boxShadow: glowOnHover
            ? `0 20px 40px -15px rgba(0,0,0,0.15), 0 0 0 0 ${glowColor}`
            : '0 20px 40px -15px rgba(0,0,0,0.15)',
          transition: 'box-shadow 0.3s ease',
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        whileHover={
          glowOnHover
            ? { boxShadow: `0 25px 50px -15px rgba(0,0,0,0.2), 0 0 40px 0 ${glowColor}` }
            : undefined
        }
      >
        {children}
      </motion.div>
    </div>
  );
}

interface TiltCardProps {
  /** Content of the card */
  children: React.ReactNode;
  /** Maximum rotation in degrees */
  tilt?: number;
  /** Additional className */
  className?: string;
}

/**
 * Simplified tilt card using CSS classes
 */
export function TiltCard({ children, tilt = 6, className = '' }: TiltCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const isTouchDevice = useIsTouchDevice();

  if (prefersReducedMotion || isTouchDevice) {
    return <div className={`card-depth ${className}`}>{children}</div>;
  }

  return (
    <div className={`perspective-1000 ${className}`}>
      <div className="card-depth transform-style-3d">{children}</div>
    </div>
  );
}

interface Card3DGridProps {
  /** Cards to render in grid */
  children: React.ReactNode;
  /** Grid columns (responsive) */
  columns?: { sm?: number; md?: number; lg?: number };
  /** Gap between cards */
  gap?: number;
  /** Additional className */
  className?: string;
}

/**
 * Grid container for 3D cards
 */
export function Card3DGrid({
  children,
  columns = { sm: 1, md: 2, lg: 3 },
  gap = 6,
  className = '',
}: Card3DGridProps) {
  return (
    <div
      className={`grid gap-${gap} sm:grid-cols-${columns.sm} md:grid-cols-${columns.md} lg:grid-cols-${columns.lg} ${className}`}
    >
      {children}
    </div>
  );
}

export default Card3D;
