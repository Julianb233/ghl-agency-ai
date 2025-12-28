import { Helmet } from 'react-helmet-async';

export interface FAQItem {
  /** The question */
  question: string;
  /** The answer (can include HTML) */
  answer: string;
}

export interface FAQSchemaProps {
  /** Array of FAQ items */
  faqs: FAQItem[];
}

/**
 * FAQSchema - JSON-LD FAQPage structured data
 *
 * CRITICAL FOR AI SEO: LLM crawlers (ChatGPT, Perplexity, Claude) heavily
 * index FAQ-format content. This schema signals authoritative Q&A content.
 *
 * Benefits:
 * - Featured snippets in Google search
 * - Direct answers in AI chatbot responses
 * - Rich results in search listings
 */
export function FAQSchema({ faqs }: FAQSchemaProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}

// Pre-built FAQs for Bottleneck Bot
export const BOTTLENECK_BOT_FAQS: FAQItem[] = [
  {
    question: 'What is Bottleneck Bot?',
    answer: 'Bottleneck Bot is an AI-powered automation platform specifically designed for GoHighLevel (GHL) agencies. It helps agency owners automate repetitive tasks like lead follow-up, appointment scheduling, and campaign management using intelligent AI agents.',
  },
  {
    question: 'How does Bottleneck Bot work?',
    answer: 'Bottleneck Bot integrates directly with your GoHighLevel account through secure API connections. Once connected, you configure AI workflows that handle tasks automatically 24/7. The AI analyzes incoming data, makes intelligent decisions, and takes action on your behalf—like sending personalized follow-up messages or scheduling appointments.',
  },
  {
    question: 'Who is Bottleneck Bot for?',
    answer: 'Bottleneck Bot is designed for GoHighLevel agency owners, digital marketing agencies, and automation consultants who want to scale their operations without hiring more staff. It\'s particularly valuable for agencies managing multiple client accounts who need consistent, reliable automation.',
  },
  {
    question: 'What tasks can Bottleneck Bot automate?',
    answer: 'Bottleneck Bot can automate lead response and qualification, appointment booking and reminders, missed call text-backs, review requests and management, pipeline stage automation, custom workflow triggers, and reporting and analytics. It essentially handles the repetitive tasks that typically require manual intervention.',
  },
  {
    question: 'Is Bottleneck Bot secure?',
    answer: 'Yes, security is a top priority. Bottleneck Bot uses bank-level encryption for all data, secure OAuth 2.0 authentication with GoHighLevel, and never stores sensitive credentials. All data is processed in compliance with GDPR and CCPA regulations.',
  },
  {
    question: 'How much time can Bottleneck Bot save?',
    answer: 'Most agencies report saving 15-20 hours per week on manual tasks. Lead response time drops from hours to seconds, and consistent follow-up sequences run automatically. This allows agency owners to focus on growth and client relationships instead of repetitive tasks.',
  },
  {
    question: 'Does Bottleneck Bot require technical knowledge?',
    answer: 'No technical knowledge is required. Bottleneck Bot features an intuitive visual workflow builder, pre-built templates for common use cases, and step-by-step setup guides. Most users are fully operational within 30 minutes of signing up.',
  },
  {
    question: 'Can I try Bottleneck Bot for free?',
    answer: 'Yes! Bottleneck Bot offers a free trial that includes full access to all features. No credit card is required to start. This allows you to experience the automation capabilities before committing to a paid plan.',
  },
  {
    question: 'What makes Bottleneck Bot different from other automation tools?',
    answer: 'Bottleneck Bot is purpose-built for GoHighLevel, not a generic automation tool. It understands GHL\'s specific workflows, pipeline stages, and contact management. Plus, it uses AI to make intelligent decisions rather than just following rigid rules—adapting to context like a human assistant would.',
  },
  {
    question: 'How do I get started with Bottleneck Bot?',
    answer: 'Getting started is simple: 1) Sign up for a free account, 2) Connect your GoHighLevel account via secure OAuth, 3) Choose a pre-built workflow template or create your own, 4) Activate and watch the automation work. Most users complete setup in under 30 minutes.',
  },
];

export default FAQSchema;
