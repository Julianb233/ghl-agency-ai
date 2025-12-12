import { Tour } from '@/stores/tourStore';

export const workflowTour: Tour = {
  id: 'workflows',
  name: 'Workflow Automation',
  description: 'Learn how to build powerful automation workflows with our visual builder',
  icon: '⚡',
  estimatedTime: '4 min',
  steps: [
    {
      target: '[data-tour="workflow-header"]',
      title: 'Welcome to Workflow Builder',
      content: 'Create powerful browser automation workflows using our visual drag-and-drop builder. Automate repetitive tasks like data extraction, form filling, and web scraping.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="workflow-canvas"]',
      title: 'Canvas Workspace',
      content: 'This is your workflow canvas where you build automation flows. Drag nodes from the palette and connect them to create complex automations. Use the minimap to navigate large workflows.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="workflow-node-palette"]',
      title: 'Node Palette',
      content: 'Browse and add workflow nodes here. Categories include Navigation (visit pages), Interaction (clicks, inputs), Data (extract, transform), and Control (conditions, loops). Drag nodes onto the canvas or click to add at the center.',
      placement: 'right'
    },
    {
      target: '[data-tour="workflow-config-panel"]',
      title: 'Node Configuration',
      content: 'Select any node on the canvas to configure its settings here. Each node type has specific options like URLs, selectors, wait conditions, and error handling. You can also duplicate or delete nodes from this panel.',
      placement: 'left'
    },
    {
      target: '[data-tour="workflow-save"]',
      title: 'Save Your Work',
      content: 'Save your workflow to preserve your automation. You can also export workflows as JSON files to share with your team or import existing workflows. Use Cmd/Ctrl+S for quick saving.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="workflow-test"]',
      title: 'Test and Execute',
      content: 'Test your workflow before deploying it. The Test Run feature lets you validate your automation logic and see results in real-time. Once tested, you can schedule workflows to run automatically.',
      placement: 'bottom'
    }
  ]
};
