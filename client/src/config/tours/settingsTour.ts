import { Tour } from '@/types/tour';

export const settingsTour: Tour = {
  id: 'settings',
  name: 'Settings & Configuration Tour',
  description: 'Configure API keys, integrations, and platform settings',
  category: 'getting-started',
  estimatedTime: '2 min',
  steps: [
    {
      id: 'settings-tabs',
      target: '[data-tour="settings-tabs"]',
      title: 'Settings Navigation',
      content: 'Your settings are organized into sections: API Keys, OAuth Connections, Webhooks, and General preferences.',
      placement: 'top'
    },
    {
      id: 'api-keys-section',
      target: '[data-tour="api-keys"]',
      title: 'API Keys Configuration',
      content: 'This is crucial! Add your OpenAI, GoHighLevel, and other API keys here to unlock full platform functionality.',
      placement: 'bottom',
      spotlightPadding: 20
    },
    {
      id: 'oauth-connections',
      target: '[data-tour="oauth-connections"]',
      title: 'OAuth Integrations',
      content: 'Connect third-party services like Google, Facebook, or LinkedIn for enhanced lead data and automation capabilities.',
      placement: 'bottom'
    },
    {
      id: 'webhook-configuration',
      target: '[data-tour="webhooks"]',
      title: 'Webhook Setup',
      content: 'Configure webhooks to receive real-time notifications about campaign events, lead updates, and system activities.',
      placement: 'bottom'
    },
    {
      id: 'importance-reminder',
      target: '[data-tour="save-settings"]',
      title: 'Save Your Configuration',
      content: 'Remember to save your settings! API keys are required for AI campaigns, lead enrichment, and GHL integration to work properly.',
      placement: 'center'
    }
  ]
};
