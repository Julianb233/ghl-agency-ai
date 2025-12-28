import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { CountUp } from '../effects/CountUp';
import { GradientText } from '../effects/GradientText';

interface Metric {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}

interface UseCaseCardProps {
  icon: LucideIcon;
  title: string;
  industry: string;
  description: string;
  metrics: Metric[];
  gradient: string;
  challenge: string;
  solution: string;
  delay?: number;
}

export const UseCaseCard: React.FC<UseCaseCardProps> = ({
  icon: Icon,
  title,
  industry,
  description,
  metrics,
  gradient,
  challenge,
  solution,
  delay = 0,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (-mouseY / rect.height) * 5;
    const rotateY = (mouseX / rect.width) * 5;

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      className="relative"
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-sm"
        animate={{
          rotateX: rotation.x,
          rotateY: rotation.y,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
      >
        {/* Gradient header */}
        <div className={`h-2 bg-gradient-to-r ${gradient}`} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-20`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {industry}
              </span>
              <h3 className="text-xl font-bold text-white mt-1">{title}</h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-slate-400 text-sm mb-6">{description}</p>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {metrics.map((metric, index) => (
              <div key={metric.label} className="text-center">
                <div className="text-2xl font-bold">
                  <GradientText gradient={gradient}>
                    <CountUp
                      end={metric.value}
                      prefix={metric.prefix}
                      suffix={metric.suffix}
                      delay={delay + index * 0.1}
                    />
                  </GradientText>
                </div>
                <div className="text-xs text-slate-500 mt-1">{metric.label}</div>
              </div>
            ))}
          </div>

          {/* Expandable section */}
          <motion.div
            initial={false}
            animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-slate-700/50 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-amber-400 mb-2">Challenge</h4>
                <p className="text-sm text-slate-400">{challenge}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-emerald-400 mb-2">Solution</h4>
                <p className="text-sm text-slate-400">{solution}</p>
              </div>
            </div>
          </motion.div>

          {/* Toggle button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isExpanded ? 'Show Less' : 'Read More'}
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UseCaseCard;
