import { Tour } from '@/stores/tourStore';

export const scheduledTasksTour: Tour = {
  id: 'scheduled-tasks',
  name: 'Task Scheduling',
  description: 'Learn how to automate browser tasks on a schedule',
  icon: '⏰',
  estimatedTime: '2 min',
  steps: [
    {
      target: '[data-tour="tasks-header"]',
      title: 'Welcome to Scheduled Tasks',
      content: 'Automate your browser workflows to run on a schedule. Set up tasks to scrape data, monitor websites, or execute automations at specific times.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="tasks-create-button"]',
      title: 'Create Your First Task',
      content: 'Click here to create a new scheduled task. You can configure the automation type, schedule frequency, retry settings, and notifications.',
      placement: 'left',
    },
    {
      target: '[data-tour="tasks-list"]',
      title: 'Task Management',
      content: 'View all your scheduled tasks here. Monitor their status, success rates, last run results, and upcoming executions. Use bulk operations to manage multiple tasks at once.',
      placement: 'top',
    },
    {
      target: '[data-tour="tasks-schedule-config"]',
      title: 'Schedule Configuration',
      content: 'Set when your tasks run with flexible scheduling options: daily, weekly, monthly, or custom cron expressions. Configure timezone, timeout, and retry settings.',
      placement: 'top',
    },
    {
      target: '[data-tour="tasks-history"]',
      title: 'Execution History',
      content: 'Track every task execution with detailed history including duration, status, error logs, and step-by-step progress. Monitor performance and troubleshoot issues.',
      placement: 'top',
    },
  ],
};
