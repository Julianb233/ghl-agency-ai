import { Tour } from '@/types/tour';

export const welcomeTour: Tour = {
  id: 'welcome',
  name: 'Welcome Tour',
  description: 'Learn how to navigate the dashboard',
  category: 'getting-started',
  estimatedTime: '2 min',
  steps: [
    {
      id: 'welcome-intro',
      target: '[data-tour="dashboard-header"]',
      title: 'Welcome to Your Dashboard!',
      content: 'This is your command center for managing leads, campaigns, and automations. Let\'s take a quick tour!',
      placement: 'center'
    },
    {
      id: 'sidebar-nav',
      target: '[data-tour="sidebar-nav"]',
      title: 'Navigation Sidebar',
      content: 'Access all features from here: Lead Lists, AI Campaigns, Browser Sessions, and more.',
      placement: 'right'
    },
    {
      id: 'quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'Quick Actions',
      content: 'Jump straight into common tasks like creating campaigns or uploading leads.',
      placement: 'bottom'
    },
    {
      id: 'settings-nav',
      target: '[data-tour="nav-settings"]',
      title: 'Settings & Configuration',
      content: 'Configure API keys and integrations in Settings to unlock all features.',
      placement: 'right'
    }
  ]
};
