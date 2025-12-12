import { Tour } from '@/types/tour';

export const campaignsTour: Tour = {
  id: 'campaigns',
  name: 'AI Campaigns Tour',
  description: 'Learn how to create and manage AI-powered calling campaigns',
  category: 'feature',
  estimatedTime: '3 min',
  steps: [
    {
      id: 'create-campaign-button',
      target: '[data-tour="create-campaign"]',
      title: 'Create Your First Campaign',
      content: 'Start a new AI calling campaign to automatically reach out to your leads with personalized conversations.',
      placement: 'bottom'
    },
    {
      id: 'campaign-stats',
      target: '[data-tour="campaign-stats"]',
      title: 'Campaign Performance Overview',
      content: 'Monitor key metrics: total calls made, success rate, average duration, and conversion statistics at a glance.',
      placement: 'bottom'
    },
    {
      id: 'campaign-list',
      target: '[data-tour="campaign-list"]',
      title: 'Your Campaigns',
      content: 'View all your campaigns with status indicators. Track which are active, paused, or completed.',
      placement: 'top'
    },
    {
      id: 'call-status-indicators',
      target: '[data-tour="call-status"]',
      title: 'Real-Time Call Status',
      content: 'See live updates on call outcomes: answered, voicemail, busy, or failed. Each status helps you understand campaign performance.',
      placement: 'left'
    },
    {
      id: 'campaign-workflow',
      target: '[data-tour="campaign-actions"]',
      title: 'Campaign Management',
      content: 'Edit campaign settings, pause/resume execution, or view detailed analytics and call recordings.',
      placement: 'left'
    },
    {
      id: 'workflow-summary',
      target: '[data-tour="campaigns-header"]',
      title: 'Campaign Workflow Complete',
      content: 'Your workflow: Create Campaign → Select Lead List → Configure AI Script → Launch → Monitor Results. Let your AI agents do the work!',
      placement: 'center'
    }
  ]
};
