import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { blobFloat, blobFloatSlow } from '@/lib/animations';

interface BlobProps {
  /** Size of the blob (width/height) */
  size?: number | string;
  /** Background color/gradient */
  color?: string;
  /** Position from top */
  top?: string;
  /** Position from left */
  left?: string;
  /** Position from right */
  right?: string;
  /** Position from bottom */
  bottom?: string;
  /** Blur amount in pixels */
  blur?: number;
  /** Opacity (0-1) */
  opacity?: number;
  /** Animation speed - slow or normal */
  speed?: 'slow' | 'normal';
  /** Z-index */
  zIndex?: number;
  /** Additional className */
  className?: string;
}

/**
 * Animated blob background element
 * Creates organic, flowing shapes for hero backgrounds
 */
export function Blob({
  size = 400,
  color = 'linear-gradient(135deg, oklch(0.85 0.15 160 / 0.6), oklch(0.8 0.12 180 / 0.4))',
  top,
  left,
  right,
  bottom,
  blur = 60,
  opacity = 0.6,
  speed = 'normal',
  zIndex = 0,
  className = '',
}: BlobProps) {
  const prefersReducedMotion = useReducedMotion();

  const sizeValue = typeof size === 'number' ? `${size}px` : size;
  const variants = speed === 'slow' ? blobFloatSlow : blobFloat;

  return (
    <motion.div
      className={`absolute pointer-events-none ${speed === 'slow' ? 'blob-slow' : 'blob'} ${className}`}
      style={{
        width: sizeValue,
        height: sizeValue,
        top,
        left,
        right,
        bottom,
        background: color,
        filter: `blur(${blur}px)`,
        opacity,
        zIndex,
      }}
      initial="initial"
      animate={prefersReducedMotion ? 'initial' : 'animate'}
      variants={variants}
    />
  );
}

interface BlobBackgroundProps {
  /** Variant preset */
  variant?: 'hero' | 'subtle' | 'vibrant';
  /** Additional className for container */
  className?: string;
  /** Children to render on top */
  children?: React.ReactNode;
}

/**
 * Pre-configured blob background layouts
 */
export function BlobBackground({
  variant = 'hero',
  className = '',
  children,
}: BlobBackgroundProps) {
  const configs = {
    hero: [
      {
        size: 500,
        color: 'linear-gradient(135deg, oklch(0.85 0.12 160 / 0.5), oklch(0.8 0.1 180 / 0.3))',
        top: '-10%',
        left: '5%',
        blur: 80,
        opacity: 0.5,
        speed: 'normal' as const,
      },
      {
        size: 400,
        color: 'linear-gradient(135deg, oklch(0.82 0.1 180 / 0.4), oklch(0.78 0.08 200 / 0.3))',
        top: '20%',
        right: '-5%',
        blur: 70,
        opacity: 0.4,
        speed: 'slow' as const,
      },
      {
        size: 350,
        color: 'linear-gradient(135deg, oklch(0.88 0.08 150 / 0.4), oklch(0.84 0.06 170 / 0.3))',
        bottom: '10%',
        left: '15%',
        blur: 60,
        opacity: 0.35,
        speed: 'slow' as const,
      },
    ],
    subtle: [
      {
        size: 400,
        color: 'linear-gradient(135deg, oklch(0.9 0.06 160 / 0.3), oklch(0.88 0.05 180 / 0.2))',
        top: '0%',
        right: '10%',
        blur: 100,
        opacity: 0.3,
        speed: 'slow' as const,
      },
      {
        size: 300,
        color: 'linear-gradient(135deg, oklch(0.88 0.05 170 / 0.25), oklch(0.86 0.04 190 / 0.2))',
        bottom: '20%',
        left: '5%',
        blur: 90,
        opacity: 0.25,
        speed: 'slow' as const,
      },
    ],
    vibrant: [
      {
        size: 600,
        color: 'linear-gradient(135deg, oklch(0.75 0.18 160 / 0.5), oklch(0.7 0.15 180 / 0.4))',
        top: '-15%',
        left: '-5%',
        blur: 90,
        opacity: 0.5,
        speed: 'normal' as const,
      },
      {
        size: 500,
        color: 'linear-gradient(135deg, oklch(0.72 0.16 180 / 0.45), oklch(0.68 0.14 200 / 0.35))',
        top: '30%',
        right: '-10%',
        blur: 80,
        opacity: 0.45,
        speed: 'slow' as const,
      },
      {
        size: 400,
        color: 'linear-gradient(135deg, oklch(0.78 0.12 150 / 0.4), oklch(0.74 0.1 170 / 0.3))',
        bottom: '5%',
        left: '20%',
        blur: 70,
        opacity: 0.4,
        speed: 'normal' as const,
      },
    ],
  };

  const blobs = configs[variant];

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {blobs.map((blob, i) => (
        <Blob key={i} {...blob} />
      ))}
      {children}
    </div>
  );
}

export default BlobBackground;
