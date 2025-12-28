import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQSchema, BOTTLENECK_BOT_FAQS } from '../seo';
import type { FAQItem } from '../seo';

interface FAQSectionProps {
  /** FAQ items to display */
  faqs?: FAQItem[];
  /** Section heading */
  heading?: string;
  /** Subheading text */
  subheading?: string;
  /** Include JSON-LD schema (default: true) */
  includeSchema?: boolean;
  /** Theme variant */
  variant?: 'light' | 'dark';
  /** Maximum number of FAQs to show initially */
  initialVisible?: number;
  /** Additional className */
  className?: string;
}

/**
 * FAQSection - Visually renders FAQ items with accordion behavior
 * Automatically includes FAQPage schema for AI SEO optimization
 *
 * LLM crawlers (ChatGPT, Perplexity, Claude) heavily index FAQ content.
 * This component combines visual display with structured data.
 */
export function FAQSection({
  faqs = BOTTLENECK_BOT_FAQS,
  heading = 'Frequently Asked Questions',
  subheading = 'Everything you need to know about Bottleneck Bot',
  includeSchema = true,
  variant = 'light',
  initialVisible = 5,
  className = '',
}: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visibleFaqs = showAll ? faqs : faqs.slice(0, initialVisible);
  const hasMore = faqs.length > initialVisible;

  const isDark = variant === 'dark';

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      className={`py-16 sm:py-24 ${isDark ? 'bg-gray-900' : 'bg-gray-50'} ${className}`}
      aria-labelledby="faq-heading"
    >
      {/* Include schema for SEO */}
      {includeSchema && <FAQSchema faqs={faqs} />}

      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 ${
            isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <HelpCircle className="w-4 h-4" />
            Got Questions?
          </div>
          <h2
            id="faq-heading"
            className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {heading}
          </h2>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {subheading}
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {visibleFaqs.map((faq, index) => (
            <FAQAccordionItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => toggleFaq(index)}
              isDark={isDark}
              index={index}
            />
          ))}
        </div>

        {/* Show More Button */}
        {hasMore && !showAll && (
          <div className="text-center mt-8">
            <button
              onClick={() => setShowAll(true)}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Show {faqs.length - initialVisible} more questions
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

interface FAQAccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  isDark: boolean;
  index: number;
}

function FAQAccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
  isDark,
  index,
}: FAQAccordionItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-xl overflow-hidden ${
        isDark
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-white border border-gray-200 shadow-sm'
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset ${
          isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
        }`}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
      >
        <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={`flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-answer-${index}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-6 pb-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <p className="leading-relaxed">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Mini FAQ component for inline use
interface MiniFAQProps {
  faqs: FAQItem[];
  className?: string;
}

export function MiniFAQ({ faqs, className = '' }: MiniFAQProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {faqs.map((faq, index) => (
        <div key={index} className="border-l-4 border-emerald-500 pl-4 py-2">
          <h4 className="font-semibold text-gray-900 mb-1">{faq.question}</h4>
          <p className="text-gray-600 text-sm">{faq.answer}</p>
        </div>
      ))}
    </div>
  );
}

export default FAQSection;
