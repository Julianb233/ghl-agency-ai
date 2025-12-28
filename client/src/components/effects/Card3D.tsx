import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  glareColor?: string;
  borderGlow?: boolean;
  intensity?: number;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  containerClassName = '',
  glareColor = 'rgba(255, 255, 255, 0.1)',
  borderGlow = true,
  intensity = 15,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (-mouseY / rect.height) * intensity;
    const rotateY = (mouseX / rect.width) * intensity;

    setRotation({ x: rotateX, y: rotateY });

    // Calculate glare position
    const glareX = ((e.clientX - rect.left) / rect.width) * 100;
    const glareY = ((e.clientY - rect.top) / rect.height) * 100;
    setGlarePosition({ x: glareX, y: glareY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setGlarePosition({ x: 50, y: 50 });
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${containerClassName}`}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className={`relative overflow-hidden rounded-xl ${className}`}
        animate={{
          rotateX: rotation.x,
          rotateY: rotation.y,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Glare effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, ${glareColor}, transparent 50%)`,
            opacity: Math.abs(rotation.x) / intensity + Math.abs(rotation.y) / intensity,
            transition: 'opacity 0.2s ease',
          }}
        />

        {/* Border glow on hover */}
        {borderGlow && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `linear-gradient(135deg,
                rgba(59, 130, 246, ${Math.abs(rotation.y) / intensity * 0.3}) 0%,
                rgba(139, 92, 246, ${Math.abs(rotation.x) / intensity * 0.3}) 50%,
                rgba(236, 72, 153, ${(Math.abs(rotation.x) + Math.abs(rotation.y)) / (intensity * 2) * 0.3}) 100%
              )`,
              padding: '1px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </motion.div>
    </motion.div>
  );
};

// Glass morphism card variant
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: number;
  opacity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  blur = 10,
  opacity = 0.1,
}) => {
  return (
    <div
      className={`relative rounded-xl border border-white/10 ${className}`}
      style={{
        background: `rgba(255, 255, 255, ${opacity})`,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
      }}
    >
      {children}
    </div>
  );
};

// Gradient border card
interface GradientBorderCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  borderWidth?: number;
  animated?: boolean;
}

export const GradientBorderCard: React.FC<GradientBorderCardProps> = ({
  children,
  className = '',
  gradient = 'from-blue-500 via-purple-500 to-pink-500',
  borderWidth = 1,
  animated = false,
}) => {
  return (
    <div
      className={`relative rounded-xl p-[${borderWidth}px] bg-gradient-to-r ${gradient} ${
        animated ? 'animate-gradient-border' : ''
      }`}
      style={animated ? { backgroundSize: '200% 200%' } : {}}
    >
      <div className={`rounded-[11px] bg-slate-900 ${className}`}>{children}</div>
    </div>
  );
};

export default Card3D;
