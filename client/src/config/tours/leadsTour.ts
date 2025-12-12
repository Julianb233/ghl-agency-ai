import { Tour } from '@/types/tour';

export const leadsTour: Tour = {
  id: 'leads',
  name: 'Lead Management Tour',
  description: 'Master lead lists, CSV imports, and data enrichment',
  category: 'feature',
  estimatedTime: '3 min',
  steps: [
    {
      id: 'create-list-button',
      target: '[data-tour="create-lead-list"]',
      title: 'Create Your First Lead List',
      content: 'Start by creating a new lead list. This will help you organize and segment your leads effectively.',
      placement: 'bottom'
    },
    {
      id: 'leads-table',
      target: '[data-tour="leads-table"]',
      title: 'Your Leads Dashboard',
      content: 'View all your leads here with detailed information including name, phone, email, and enrichment status. You can sort, filter, and search through your leads.',
      placement: 'top'
    },
    {
      id: 'upload-csv',
      target: '[data-tour="upload-csv"]',
      title: 'Import Leads from CSV',
      content: 'Easily upload leads from CSV files. Our smart mapper will help you match columns to the right fields.',
      placement: 'left'
    },
    {
      id: 'lead-actions',
      target: '[data-tour="lead-actions"]',
      title: 'Lead Actions',
      content: 'Take actions on individual leads: view details, edit information, or remove from the list.',
      placement: 'left'
    },
    {
      id: 'enrichment-feature',
      target: '[data-tour="enrich-leads"]',
      title: 'Enrich Your Data',
      content: 'Use our AI-powered enrichment to automatically fill in missing information and enhance lead profiles with additional data points.',
      placement: 'bottom'
    },
    {
      id: 'workflow-summary',
      target: '[data-tour="leads-stats"]',
      title: 'Your Lead Management Workflow',
      content: 'Remember: Create List → Upload CSV → Map Columns → Enrich Data → Use in Campaigns. You\'re all set!',
      placement: 'center'
    }
  ]
};
