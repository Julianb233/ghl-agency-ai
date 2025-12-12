import { Tour } from '@/stores/tourStore';

export const browserSessionsTour: Tour = {
  id: 'browser-sessions',
  name: 'Browser Automation',
  description: 'Master browser automation with live sessions, recordings, and AI control',
  icon: '🌐',
  estimatedTime: '3 min',
  steps: [
    {
      target: '[data-tour="browser-header"]',
      title: 'Welcome to Browser Automation',
      content: 'Control browsers with AI, monitor live sessions, and replay recordings. This powerful feature lets you automate web tasks at scale.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="browser-create-session"]',
      title: 'Create New Sessions',
      content: 'Start a new browser automation session by navigating to the AI Browser Panel. You can execute actions, observe pages, or extract data from websites.',
      placement: 'left',
    },
    {
      target: '[data-tour="browser-stats"]',
      title: 'Session Statistics',
      content: 'Monitor your automation health at a glance. Track total sessions, running sessions, completed tasks, and failed attempts.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="browser-filters"]',
      title: 'Filter and Search',
      content: 'Find sessions quickly by searching for session IDs or URLs. Filter by status (running, completed, failed) and date range to manage your automations effectively.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="browser-sessions-list"]',
      title: 'Active Sessions',
      content: 'View all your browser automation sessions here. Each card shows the session status, URL, duration, and provides quick actions for monitoring and management.',
      placement: 'top',
    },
    {
      target: '[data-tour="browser-live-view"]',
      title: 'Watch Live Sessions',
      content: 'For running sessions, click the Live button to watch the browser in real-time. See exactly what the AI is doing as it navigates and interacts with websites.',
      placement: 'top',
    },
    {
      target: '[data-tour="browser-replay"]',
      title: 'Session Recordings',
      content: 'Completed sessions automatically save recordings. Click the Recording button to replay the entire session and review what happened.',
      placement: 'top',
    },
  ],
};
