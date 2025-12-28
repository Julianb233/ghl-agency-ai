import React from 'react';
import { motion } from 'framer-motion';
import { Link2, Settings, Zap, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react';
import { HowToSchema } from '../seo';

interface Step {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  details?: string[];
  color: string;
  bgColor: string;
}

const defaultSteps: Step[] = [
  {
    icon: Link2,
    title: 'Connect',
    subtitle: 'Link Your GHL Account',
    description: 'Securely connect your GoHighLevel account with a single click using OAuth 2.0. No API keys to manage, no complex configuration.',
    details: [
      'One-click OAuth connection',
      'Automatic sub-account discovery',
      'Bank-level encryption',
    ],
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
  },
  {
    icon: Settings,
    title: 'Configure',
    subtitle: 'Set Up AI Workflows',
    description: 'Choose from pre-built templates or create custom workflows with our visual builder. No coding required—just drag, drop, and configure.',
    details: [
      'Pre-built workflow templates',
      'Visual drag-and-drop builder',
      'Smart triggers and conditions',
    ],
    color: 'text-purple-600',
    bgColor: 'bg-purple-500',
  },
  {
    icon: Zap,
    title: 'Automate',
    subtitle: 'AI Handles Tasks 24/7',
    description: 'Your AI agents start working immediately—responding to leads, booking appointments, and managing campaigns around the clock.',
    details: [
      'Instant lead response',
      'Intelligent decision making',
      'Continuous operation',
    ],
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500',
  },
  {
    icon: TrendingUp,
    title: 'Scale',
    subtitle: 'Grow Without Hiring',
    description: 'Handle 10x the volume without adding headcount. Scale your agency profitably while maintaining quality and consistency.',
    details: [
      'Handle unlimited leads',
      'No additional staff needed',
      'Consistent quality at scale',
    ],
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
  },
];

interface HowItWorksProps {
  /** Custom steps (defaults to Bottleneck Bot steps) */
  steps?: Step[];
  /** Section heading */
  heading?: string;
  /** Subheading text */
  subheading?: string;
  /** Include HowTo schema for SEO */
  includeSchema?: boolean;
  /** Theme variant */
  variant?: 'light' | 'dark';
  /** Additional className */
  className?: string;
  /** CTA button text */
  ctaText?: string;
  /** CTA click handler */
  onCtaClick?: () => void;
}

/**
 * HowItWorks - Step-by-step process explanation with schema
 *
 * This component is optimized for both user understanding and AI SEO.
 * The HowTo schema helps search engines and LLMs understand the process.
 */
export function HowItWorks({
  steps = defaultSteps,
  heading = 'How It Works',
  subheading = 'Get started in minutes, not months',
  includeSchema = true,
  variant = 'light',
  className = '',
  ctaText = 'Get Started Free',
  onCtaClick,
}: HowItWorksProps) {
  const isDark = variant === 'dark';

  // Generate schema data from steps
  const schemaSteps = steps.map((step) => ({
    name: step.title,
    text: step.description,
  }));

  return (
    <section
      id="how-it-works"
      className={`py-16 sm:py-24 ${isDark ? 'bg-gray-900' : 'bg-white'} ${className}`}
      aria-labelledby="how-it-works-heading"
    >
      {/* Include HowTo Schema for SEO */}
      {includeSchema && (
        <HowToSchema
          name="How to Set Up Bottleneck Bot for Your GHL Agency"
          description="A step-by-step guide to automating your GoHighLevel agency with Bottleneck Bot AI agents"
          steps={schemaSteps}
          totalTime="PT30M"
        />
      )}

      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 ${
              isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            Quick Setup
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            id="how-it-works-heading"
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {heading}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            {subheading}
          </motion.p>
        </div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <StepCard
                key={index}
                step={step}
                stepNumber={index + 1}
                isDark={isDark}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        {onCtaClick && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center mt-12"
          >
            <button
              onClick={onCtaClick}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-emerald-500/25 transition-all hover:-translate-y-0.5"
            >
              {ctaText}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}

interface StepCardProps {
  step: Step;
  stepNumber: number;
  isDark: boolean;
  isLast: boolean;
}

function StepCard({ step, stepNumber, isDark, isLast }: StepCardProps) {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: stepNumber * 0.1 }}
      className="relative"
    >
      {/* Connector Line (hidden on mobile and last item) */}
      {!isLast && (
        <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 -translate-x-1/2">
          <div className={`w-full h-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <ArrowRight className={`absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isDark ? 'text-gray-600' : 'text-gray-400'
          }`} />
        </div>
      )}

      <div className={`text-center ${isDark ? '' : ''}`}>
        {/* Step Number + Icon */}
        <div className="relative inline-flex mb-6">
          <div className={`w-20 h-20 rounded-2xl ${step.bgColor} flex items-center justify-center shadow-lg`}>
            <Icon className="w-10 h-10 text-white" />
          </div>
          <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
            isDark ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-900 border border-gray-200'
          } shadow-sm`}>
            {stepNumber}
          </div>
        </div>

        {/* Content */}
        <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {step.title}
        </h3>
        <p className={`text-sm font-medium mb-3 ${step.color}`}>
          {step.subtitle}
        </p>
        <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {step.description}
        </p>

        {/* Details */}
        {step.details && (
          <ul className="space-y-2 text-left">
            {step.details.map((detail, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${step.color}`} />
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

export default HowItWorks;
