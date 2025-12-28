import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, HelpCircle, Target, Users, Lightbulb } from 'lucide-react';

type BlockType = 'what' | 'how' | 'who' | 'why' | 'problem';

interface ConversationalBlockProps {
  /** Type of block determines icon and styling */
  type: BlockType;
  /** Question or heading text */
  question: string;
  /** Answer or explanation text */
  answer: string | React.ReactNode;
  /** Additional details/list items */
  details?: string[];
  /** Theme variant */
  variant?: 'light' | 'dark';
  /** Additional className */
  className?: string;
}

const blockConfig: Record<BlockType, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  what: {
    icon: HelpCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  how: {
    icon: Lightbulb,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  who: {
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  why: {
    icon: Target,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  problem: {
    icon: MessageCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

/**
 * ConversationalBlock - Q&A format content blocks for AI SEO
 *
 * LLM crawlers prefer conversational, direct-answer content.
 * This component formats content in a question-answer style
 * that's optimal for AI citation and featured snippets.
 */
export function ConversationalBlock({
  type,
  question,
  answer,
  details = [],
  variant = 'light',
  className = '',
}: ConversationalBlockProps) {
  const config = blockConfig[type];
  const Icon = config.icon;
  const isDark = variant === 'dark';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      className={`rounded-2xl overflow-hidden ${
        isDark
          ? 'bg-gray-800 border border-gray-700'
          : `${config.bgColor} border ${config.borderColor}`
      } ${className}`}
    >
      {/* Question Header */}
      <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : config.borderColor}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-white shadow-sm'}`}>
            <Icon className={`w-5 h-5 ${isDark ? 'text-emerald-400' : config.color}`} />
          </div>
          <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {question}
          </h3>
        </div>
      </div>

      {/* Answer Body */}
      <div className={`px-6 py-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        {typeof answer === 'string' ? (
          <p className="text-base leading-relaxed">{answer}</p>
        ) : (
          answer
        )}

        {/* Additional Details List */}
        {details.length > 0 && (
          <ul className="mt-4 space-y-2">
            {details.map((detail, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isDark ? 'bg-emerald-400' : config.color.replace('text-', 'bg-')
                }`} />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.article>
  );
}

/**
 * Pre-built content blocks for Bottleneck Bot
 */
export const BOTTLENECK_CONTENT_BLOCKS = {
  whatIs: {
    type: 'what' as const,
    question: 'What is Bottleneck Bot?',
    answer: 'Bottleneck Bot is an AI-powered automation platform specifically designed for GoHighLevel (GHL) agencies. It uses intelligent AI agents to handle repetitive tasks like lead follow-up, appointment scheduling, and campaign management—running 24/7 so you can focus on growing your business.',
    details: [
      'Purpose-built for GoHighLevel agencies',
      'AI agents that learn your workflow patterns',
      'Automated lead nurturing and follow-up',
      '24/7 operation without human intervention',
    ],
  },
  howWorks: {
    type: 'how' as const,
    question: 'How does Bottleneck Bot work?',
    answer: 'Bottleneck Bot connects to your GoHighLevel account through secure API integration. Once connected, you configure AI workflows using our visual builder or pre-built templates. The AI then monitors your account, makes intelligent decisions, and takes action automatically—like a digital employee who never sleeps.',
    details: [
      'Secure OAuth 2.0 connection to GHL',
      'Visual workflow builder for easy setup',
      'Pre-built templates for common use cases',
      'AI-powered decision making, not rigid rules',
    ],
  },
  whoFor: {
    type: 'who' as const,
    question: 'Who is Bottleneck Bot for?',
    answer: 'Bottleneck Bot is designed for GoHighLevel agency owners, digital marketing agencies, and automation consultants who want to scale operations without proportionally increasing headcount. It\'s especially valuable for agencies managing multiple client sub-accounts.',
    details: [
      'GHL agency owners overwhelmed by manual tasks',
      'Marketing agencies managing 10+ client accounts',
      'Automation consultants building scalable solutions',
      'Entrepreneurs who value time over money',
    ],
  },
  problemsSolved: {
    type: 'problem' as const,
    question: 'What problems does Bottleneck Bot solve?',
    answer: 'Bottleneck Bot eliminates the repetitive, time-consuming tasks that prevent agencies from scaling. No more leads slipping through cracks, no more missed follow-ups, no more manual data entry. The AI handles the busywork while you focus on strategy and relationships.',
    details: [
      'Slow lead response times (hours → seconds)',
      'Inconsistent follow-up sequences',
      'Manual appointment booking and reminders',
      'Tedious reporting and analytics compilation',
      'Staff bottlenecks during high-volume periods',
    ],
  },
};

/**
 * Grid of conversational blocks
 */
interface ConversationalGridProps {
  blocks?: Array<{
    type: BlockType;
    question: string;
    answer: string;
    details?: string[];
  }>;
  variant?: 'light' | 'dark';
  columns?: 1 | 2;
  className?: string;
}

export function ConversationalGrid({
  blocks = Object.values(BOTTLENECK_CONTENT_BLOCKS),
  variant = 'light',
  columns = 2,
  className = '',
}: ConversationalGridProps) {
  return (
    <div className={`grid gap-6 ${columns === 2 ? 'md:grid-cols-2' : ''} ${className}`}>
      {blocks.map((block, index) => (
        <ConversationalBlock
          key={index}
          type={block.type}
          question={block.question}
          answer={block.answer}
          details={block.details}
          variant={variant}
        />
      ))}
    </div>
  );
}

export default ConversationalBlock;
