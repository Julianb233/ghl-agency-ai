import { Tour } from '@/stores/tourStore';

export const creditsTour: Tour = {
  id: 'credits',
  name: 'Credits & Usage',
  description: 'Learn how to purchase credits and monitor your usage',
  icon: '💳',
  estimatedTime: '2 min',
  steps: [
    {
      target: '[data-tour="credits-header"]',
      title: 'Welcome to Credits',
      content: 'Credits power your lead enrichment and AI calling features. Here you can purchase credits, view your balance, and track usage history.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="credits-balance"]',
      title: 'Your Credit Balances',
      content: 'Monitor your credit balances in real-time. Enrichment credits are used for data enrichment, while Calling credits power your AI phone campaigns. Each credit type is tracked separately.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="credits-purchase"]',
      title: 'Purchase Credit Packages',
      content: 'Choose from flexible credit packages to fit your needs. Larger packages offer better value per credit. Credits never expire, so you can use them at your own pace.',
      placement: 'top'
    },
    {
      target: '[data-tour="credits-benefits"]',
      title: 'Credit Benefits',
      content: 'Your credits unlock premium features: access to high-quality data sources, real-time enrichment, AI-powered calling, and 24/7 support. All with no expiration date.',
      placement: 'top'
    },
    {
      target: '[data-tour="credits-history"]',
      title: 'Track Your Usage',
      content: 'View complete purchase and usage history. Monitor when credits were purchased, how they were used, and track your spending over time. Stay informed about your credit consumption.',
      placement: 'top'
    }
  ]
};
