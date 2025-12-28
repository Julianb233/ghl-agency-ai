import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { GradientText } from '../effects/GradientText';

interface PricingFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

interface PricingCardProps {
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  isAnnual: boolean;
  features: PricingFeature[];
  popular?: boolean;
  ctaText?: string;
  ctaLink?: string;
  gradient?: string;
  delay?: number;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  name,
  description,
  monthlyPrice,
  annualPrice,
  isAnnual,
  features,
  popular = false,
  ctaText = 'Get Started',
  ctaLink = '/signup',
  gradient = 'from-blue-500 to-purple-500',
  delay = 0,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const price = isAnnual ? annualPrice : monthlyPrice;
  const period = isAnnual ? '/year' : '/month';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (-mouseY / rect.height) * 8;
    const rotateY = (mouseX / rect.width) * 8;

    setRotation({ x: rotateX, y: rotateY });

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
      {/* Popular badge */}
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white text-sm font-semibold flex items-center gap-1.5 shadow-lg"
            animate={{
              boxShadow: [
                '0 0 20px rgba(251, 146, 60, 0.3)',
                '0 0 40px rgba(251, 146, 60, 0.5)',
                '0 0 20px rgba(251, 146, 60, 0.3)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Sparkles className="w-4 h-4" />
            Most Popular
          </motion.div>
        </div>
      )}

      <motion.div
        className={`relative overflow-hidden rounded-2xl border ${
          popular
            ? 'border-amber-500/50 bg-slate-900/90'
            : 'border-slate-700/50 bg-slate-900/80'
        } backdrop-blur-sm`}
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
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.1), transparent 50%)`,
            opacity: Math.abs(rotation.x) / 8 + Math.abs(rotation.y) / 8,
          }}
        />

        {/* Gradient border glow for popular */}
        {popular && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(236, 72, 153, 0.2) 50%, rgba(139, 92, 246, 0.2) 100%)',
              padding: '1px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />
        )}

        <div className="relative z-10 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
            <p className="text-slate-400 text-sm">{description}</p>
          </div>

          {/* Price */}
          <div className="text-center mb-8">
            {price !== null ? (
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-bold text-slate-400">$</span>
                <GradientText
                  gradient={gradient}
                  className="text-5xl font-bold"
                >
                  {price}
                </GradientText>
                <span className="text-slate-400">{period}</span>
              </div>
            ) : (
              <div className="text-4xl font-bold">
                <GradientText gradient={gradient}>Custom</GradientText>
              </div>
            )}
            {isAnnual && monthlyPrice && annualPrice && (
              <p className="text-sm text-emerald-400 mt-2">
                Save ${(monthlyPrice * 12 - annualPrice).toLocaleString()}/year
              </p>
            )}
          </div>

          {/* Features */}
          <ul className="space-y-4 mb-8">
            {features.map((feature, index) => (
              <motion.li
                key={index}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: delay + index * 0.05 }}
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                    feature.included
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                      : 'bg-slate-700'
                  }`}
                >
                  {feature.included && <Check className="w-3 h-3 text-white" />}
                </div>
                <span
                  className={`text-sm ${
                    feature.included
                      ? feature.highlight
                        ? 'text-white font-medium'
                        : 'text-slate-300'
                      : 'text-slate-500 line-through'
                  }`}
                >
                  {feature.text}
                </span>
              </motion.li>
            ))}
          </ul>

          {/* CTA */}
          <motion.a
            href={ctaLink}
            className={`block w-full py-3 px-6 rounded-xl text-center font-semibold transition-all ${
              popular
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white hover:shadow-lg hover:shadow-orange-500/25'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {ctaText}
          </motion.a>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PricingCard;
