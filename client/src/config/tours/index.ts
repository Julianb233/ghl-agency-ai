import { Tour } from '@/stores/tourStore';
import { workflowTour } from './workflowTour';
import { scheduledTasksTour } from './scheduledTasksTour';
import { browserSessionsTour } from './browserSessionsTour';
import { creditsTour } from './creditsTour';

import { quizzesTour } from './quizzesTour';
export const tours: Tour[] = [
  {
    id: 'welcome',
    name: 'Welcome Tour',
    description: 'Get started with the basics of the platform',
    icon: '👋',
    estimatedTime: '2 min',
    steps: [
      {
        target: 'body',
        title: 'Welcome to the Platform!',
        content: 'Let us show you around and help you get started with the key features.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="dashboard"]',
        title: 'Dashboard',
        content: 'This is your main dashboard where you can see an overview of your activity.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="navigation"]',
        title: 'Navigation',
        content: 'Use this sidebar to navigate between different sections of the application.',
        placement: 'right',
      },
      {
        target: '[data-tour="help-menu"]',
        title: 'Help Menu',
        content: 'Access help, tutorials, and keyboard shortcuts anytime by clicking this button.',
        placement: 'left',
      },
    ],
  },
  {
    id: 'ai-assistant',
    name: 'AI Assistant',
    description: 'Learn how to use the AI-powered features',
    icon: '🤖',
    estimatedTime: '3 min',
    steps: [
      {
        target: '[data-tour="ai-chat"]',
        title: 'AI Chat',
        content: 'Interact with our AI assistant to get help, generate content, and automate tasks.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="ai-prompts"]',
        title: 'Prompt Library',
        content: 'Browse and use pre-built prompts to get started quickly with common tasks.',
        placement: 'right',
      },
      {
        target: '[data-tour="ai-history"]',
        title: 'Conversation History',
        content: 'Access your previous conversations and continue where you left off.',
        placement: 'left',
      },
    ],
  },
  workflowTour,
  scheduledTasksTour,
  browserSessionsTour,
  quizzesTour,
  creditsTour,
  {
    id: 'settings',
    name: 'Settings & Customization',
    description: 'Customize your experience and manage preferences',
    icon: '⚙️',
    estimatedTime: '2 min',
    steps: [
      {
        target: '[data-tour="settings"]',
        title: 'Settings',
        content: 'Access all your account settings and preferences from here.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="theme"]',
        title: 'Theme Settings',
        content: 'Customize the appearance of the application with different themes.',
        placement: 'left',
      },
      {
        target: '[data-tour="integrations"]',
        title: 'Integrations',
        content: 'Connect with third-party services to extend functionality.',
        placement: 'bottom',
      },
    ],
  },
];

export const getTourById = (tourId: string): Tour | undefined => {
  return tours.find((tour) => tour.id === tourId);
};

export { browserSessionsTour, creditsTour, quizzesTour };
