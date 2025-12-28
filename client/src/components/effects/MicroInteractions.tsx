import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, Sparkles, Zap, Star } from 'lucide-react';

// ==================== Button Press Effect ====================
interface PressableButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'ghost';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const PressableButton: React.FC<PressableButtonProps> = ({
  children,
  variant = 'default',
  className,
  onClick,
  disabled,
  type = 'button',
  title,
}) => {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={cn(
        'transition-colors',
        variant === 'primary' && 'bg-emerald-500 text-white hover:bg-emerald-600',
        variant === 'ghost' && 'hover:bg-slate-800/50',
        variant === 'default' && 'bg-slate-800 text-white hover:bg-slate-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </motion.button>
  );
};

// ==================== Success Checkmark ====================
interface SuccessCheckmarkProps {
  show: boolean;
  size?: number;
  className?: string;
}

export const SuccessCheckmark: React.FC<SuccessCheckmarkProps> = ({
  show,
  size = 48,
  className
}) => {
  const pathVariants: Variants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { type: 'spring', duration: 0.5, bounce: 0 },
        opacity: { duration: 0.01 },
      },
    },
  };

  const circleVariants: Variants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
      },
    },
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          className={cn('relative', className)}
          style={{ width: size, height: size }}
        >
          {/* Circle background */}
          <motion.div
            variants={circleVariants}
            className="absolute inset-0 rounded-full bg-emerald-500/20"
          />

          {/* SVG Checkmark */}
          <svg
            viewBox="0 0 50 50"
            className="absolute inset-0 w-full h-full"
          >
            <motion.circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-emerald-500"
              variants={circleVariants}
            />
            <motion.path
              d="M14 25 L22 33 L36 19"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-500"
              variants={pathVariants}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ==================== Ripple Effect ====================
interface RippleProps {
  color?: string;
  duration?: number;
}

export const useRipple = ({ color = 'rgba(255,255,255,0.3)', duration = 600 }: RippleProps = {}) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const addRipple = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, duration);
  };

  const RippleContainer: React.FC = () => (
    <span className="absolute inset-0 overflow-hidden rounded-inherit pointer-events-none">
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: duration / 1000, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: 100,
            height: 100,
            marginLeft: -50,
            marginTop: -50,
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
      ))}
    </span>
  );

  return { addRipple, RippleContainer };
};

// ==================== Floating Animation ====================
interface FloatingElementProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  className?: string;
}

export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  delay = 0,
  duration = 3,
  yOffset = 10,
  className
}) => {
  return (
    <motion.div
      animate={{
        y: [0, -yOffset, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ==================== Pulse Glow Effect ====================
interface PulseGlowProps {
  children: React.ReactNode;
  color?: string;
  active?: boolean;
  className?: string;
}

export const PulseGlow: React.FC<PulseGlowProps> = ({
  children,
  color = 'emerald',
  active = true,
  className
}) => {
  return (
    <div className={cn('relative', className)}>
      {active && (
        <motion.div
          className={cn(
            'absolute inset-0 rounded-lg blur-md',
            color === 'emerald' && 'bg-emerald-500/30',
            color === 'blue' && 'bg-blue-500/30',
            color === 'purple' && 'bg-purple-500/30'
          )}
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
};

// ==================== Sparkle Effect ====================
interface SparkleProps {
  children: React.ReactNode;
  count?: number;
  active?: boolean;
  className?: string;
}

const generateSparkle = () => ({
  id: Math.random(),
  createdAt: Date.now(),
  color: ['#FFC700', '#FFD700', '#FFEA00'][Math.floor(Math.random() * 3)],
  size: Math.random() * 10 + 5,
  style: {
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
  },
});

export const SparkleEffect: React.FC<SparkleProps> = ({
  children,
  count = 3,
  active = true,
  className
}) => {
  const [sparkles, setSparkles] = useState(() =>
    active ? Array.from({ length: count }, generateSparkle) : []
  );

  useEffect(() => {
    if (!active) {
      setSparkles([]);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      setSparkles((prev) => {
        const next = prev.filter((sp) => now - sp.createdAt < 1000);
        if (next.length < count) {
          return [...next, generateSparkle()];
        }
        return next;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [active, count]);

  return (
    <span className={cn('relative inline-block', className)}>
      {sparkles.map((sparkle) => (
        <motion.span
          key={sparkle.id}
          initial={{ scale: 0, opacity: 1, rotate: 0 }}
          animate={{ scale: 1, opacity: 0, rotate: 180 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute pointer-events-none"
          style={sparkle.style}
        >
          <Star
            className="fill-current"
            style={{
              color: sparkle.color,
              width: sparkle.size,
              height: sparkle.size,
            }}
          />
        </motion.span>
      ))}
      <span className="relative z-10">{children}</span>
    </span>
  );
};

// ==================== Counting Animation ====================
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1,
  className
}) => {
  const spring = useSpring(0, { duration: duration * 1000 });
  const display = useTransform(spring, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return display.on('change', (latest) => {
      setDisplayValue(latest);
    });
  }, [display]);

  return <span className={className}>{displayValue}</span>;
};

// ==================== Slide In Animation ====================
interface SlideInProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  duration?: number;
  className?: string;
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.5,
  className
}) => {
  const variants: Variants = {
    hidden: {
      opacity: 0,
      x: direction === 'left' ? -30 : direction === 'right' ? 30 : 0,
      y: direction === 'up' ? 30 : direction === 'down' ? -30 : 0,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ==================== Stagger Container ====================
interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 0.1,
  className
}) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
};

// ==================== Page Transition ====================
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ==================== Magnetic Button ====================
interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className,
  strength = 0.3
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = (e.clientX - centerX) * strength;
    const y = (e.clientY - centerY) * strength;

    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={position}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      className={cn('inline-block', className)}
    >
      {children}
    </motion.div>
  );
};

export default {
  PressableButton,
  SuccessCheckmark,
  useRipple,
  FloatingElement,
  PulseGlow,
  SparkleEffect,
  AnimatedCounter,
  SlideIn,
  StaggerContainer,
  PageTransition,
  MagneticButton,
};
