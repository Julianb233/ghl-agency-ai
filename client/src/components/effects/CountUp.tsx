import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  separator?: string;
  className?: string;
  once?: boolean;
}

export const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  duration = 2,
  delay = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  separator = ',',
  className = '',
  once = true,
}) => {
  const [count, setCount] = useState(start);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView) return;
    if (once && hasAnimated.current) return;

    hasAnimated.current = true;

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime - delay * 1000) / (duration * 1000), 1);

      if (progress < 0) {
        requestAnimationFrame(animate);
        return;
      }

      // Easing function (ease-out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = start + (end - start) * easedProgress;

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, start, end, duration, delay, once]);

  const formatNumber = (num: number): string => {
    const fixed = num.toFixed(decimals);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return parts.join('.');
  };

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {prefix}
      {formatNumber(count)}
      {suffix}
    </motion.span>
  );
};

// Preset configurations
interface StatConfig {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

interface AnimatedStatsProps {
  stats: StatConfig[];
  className?: string;
  cardClassName?: string;
}

export const AnimatedStats: React.FC<AnimatedStatsProps> = ({
  stats,
  className = '',
  cardClassName = '',
}) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 ${className}`}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className={`text-center p-6 rounded-xl bg-slate-800/50 border border-slate-700 ${cardClassName}`}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <div className="text-3xl md:text-4xl font-bold text-white mb-2">
            <CountUp
              end={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              decimals={stat.decimals || 0}
              delay={index * 0.1}
            />
          </div>
          <div className="text-sm text-slate-400">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
};

export default CountUp;
