import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Mail,
  Megaphone,
  FileText,
  Calendar,
  Settings,
  Zap,
  Target,
  MessageSquare,
  BarChart3,
  Workflow,
  TrendingUp,
  Filter,
  Share2,
  GitMerge,
  Download,
  PlayCircle,
  Repeat,
  List,
  ClipboardList,
  FileBarChart,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'leads' | 'campaigns' | 'workflows' | 'analytics' | 'settings' | 'funnels' | 'pipelines' | 'contacts' | 'automations' | 'forms' | 'reporting';
  prompt: string;
  icon: React.ElementType;
  difficulty: 'easy' | 'medium' | 'advanced';
  estimatedTime: string;
}

const TASK_TEMPLATES: TaskTemplate[] = [
  // Lead Management
  {
    id: 'add-leads-campaign',
    name: 'Add Leads to Campaign',
    description: 'Import and add leads to an existing GHL campaign',
    category: 'leads',
    prompt: 'Go to GoHighLevel and add the following leads to the campaign named "[CAMPAIGN_NAME]": [LEAD_LIST]',
    icon: Users,
    difficulty: 'easy',
    estimatedTime: '2-5 min',
  },
  {
    id: 'enrich-leads',
    name: 'Enrich Lead Data',
    description: 'Find and add missing contact information for leads',
    category: 'leads',
    prompt: 'Enrich the lead data for contacts in my GHL account that are missing email addresses or phone numbers. Use available data sources to find their contact information.',
    icon: Target,
    difficulty: 'medium',
    estimatedTime: '5-10 min',
  },
  {
    id: 'segment-leads',
    name: 'Segment Leads by Criteria',
    description: 'Automatically tag and organize leads based on criteria',
    category: 'leads',
    prompt: 'In GoHighLevel, segment all leads from the past 30 days by industry. Create tags for each industry and apply them to the relevant contacts.',
    icon: Users,
    difficulty: 'medium',
    estimatedTime: '3-7 min',
  },

  // Campaign Management
  {
    id: 'create-email-sequence',
    name: 'Create Email Sequence',
    description: 'Build a multi-step email nurture sequence',
    category: 'campaigns',
    prompt: 'Create a 5-email nurture sequence in GoHighLevel for new leads. The sequence should welcome them, provide value, and end with a call-to-action for a discovery call.',
    icon: Mail,
    difficulty: 'advanced',
    estimatedTime: '10-15 min',
  },
  {
    id: 'launch-sms-campaign',
    name: 'Launch SMS Campaign',
    description: 'Set up and launch an SMS marketing campaign',
    category: 'campaigns',
    prompt: 'Create an SMS campaign in GoHighLevel to re-engage leads who haven\'t responded in 14+ days. Write compelling, short messages with a clear CTA.',
    icon: MessageSquare,
    difficulty: 'medium',
    estimatedTime: '5-8 min',
  },
  {
    id: 'schedule-broadcast',
    name: 'Schedule Email Broadcast',
    description: 'Create and schedule a one-time email blast',
    category: 'campaigns',
    prompt: 'Schedule an email broadcast in GoHighLevel for [DATE/TIME] to all active contacts. The email should announce [ANNOUNCEMENT_TOPIC].',
    icon: Megaphone,
    difficulty: 'easy',
    estimatedTime: '3-5 min',
  },

  // Workflow Automation
  {
    id: 'create-lead-workflow',
    name: 'Create Lead Capture Workflow',
    description: 'Build automation for new lead follow-up',
    category: 'workflows',
    prompt: 'Create a workflow in GoHighLevel that triggers when a new lead is added. It should: 1) Send welcome email, 2) Wait 1 day, 3) Send SMS, 4) Create task for sales rep.',
    icon: Zap,
    difficulty: 'advanced',
    estimatedTime: '10-20 min',
  },
  {
    id: 'appointment-reminder',
    name: 'Appointment Reminder Flow',
    description: 'Set up automated appointment reminders',
    category: 'workflows',
    prompt: 'Create an appointment reminder workflow in GoHighLevel that sends: 1) Email 24 hours before, 2) SMS 2 hours before, 3) SMS 15 minutes before the appointment.',
    icon: Calendar,
    difficulty: 'medium',
    estimatedTime: '5-10 min',
  },
  {
    id: 'no-show-followup',
    name: 'No-Show Follow-up',
    description: 'Automate follow-up for missed appointments',
    category: 'workflows',
    prompt: 'Create a no-show workflow in GoHighLevel that triggers when someone misses an appointment. Send a re-booking email with a direct calendar link.',
    icon: Calendar,
    difficulty: 'medium',
    estimatedTime: '5-8 min',
  },

  // Analytics & Reporting
  {
    id: 'pipeline-report',
    name: 'Generate Pipeline Report',
    description: 'Create a summary of pipeline performance',
    category: 'analytics',
    prompt: 'Go to GoHighLevel and generate a report of the current sales pipeline. Include: total deals, deals by stage, conversion rates, and average deal value.',
    icon: BarChart3,
    difficulty: 'easy',
    estimatedTime: '2-4 min',
  },
  {
    id: 'campaign-performance',
    name: 'Campaign Performance Analysis',
    description: 'Analyze email/SMS campaign metrics',
    category: 'analytics',
    prompt: 'Analyze the performance of all active campaigns in GoHighLevel from the past 30 days. Report on open rates, click rates, and conversion rates.',
    icon: BarChart3,
    difficulty: 'medium',
    estimatedTime: '3-6 min',
  },

  // Settings & Configuration
  {
    id: 'update-business-info',
    name: 'Update Business Info',
    description: 'Update account business information',
    category: 'settings',
    prompt: 'Update the business information in GoHighLevel settings with the following details: [BUSINESS_NAME], [ADDRESS], [PHONE], [EMAIL].',
    icon: Settings,
    difficulty: 'easy',
    estimatedTime: '2-3 min',
  },
  {
    id: 'configure-calendar',
    name: 'Configure Calendar Settings',
    description: 'Set up calendar availability and booking rules',
    category: 'settings',
    prompt: 'Configure the calendar settings in GoHighLevel: Set availability for Monday-Friday 9am-5pm, 30-minute appointments, with a 15-minute buffer between meetings.',
    icon: Calendar,
    difficulty: 'easy',
    estimatedTime: '3-5 min',
  },

  // Funnels
  {
    id: 'create-landing-page-funnel',
    name: 'Create Landing Page Funnel',
    description: 'Build a high-converting landing page funnel',
    category: 'funnels',
    prompt: 'Create a landing page funnel in GoHighLevel for [PRODUCT/SERVICE]. Include: 1) Landing page with opt-in form, 2) Thank you page, 3) Email confirmation workflow, 4) Lead nurture sequence.',
    icon: Layers,
    difficulty: 'advanced',
    estimatedTime: '15-25 min',
  },
  {
    id: 'build-webinar-funnel',
    name: 'Build Webinar Registration Funnel',
    description: 'Set up complete webinar registration and follow-up funnel',
    category: 'funnels',
    prompt: 'Build a webinar registration funnel in GoHighLevel with: 1) Registration page, 2) Confirmation page with calendar add, 3) Reminder sequence (email + SMS), 4) Post-webinar follow-up, 5) Replay delivery workflow.',
    icon: PlayCircle,
    difficulty: 'advanced',
    estimatedTime: '20-30 min',
  },
  {
    id: 'lead-magnet-funnel',
    name: 'Set Up Lead Magnet Funnel',
    description: 'Create a lead magnet delivery and nurture funnel',
    category: 'funnels',
    prompt: 'Set up a lead magnet funnel in GoHighLevel: 1) Opt-in page for [LEAD_MAGNET_TITLE], 2) Immediate download/delivery page, 3) Welcome email with resource link, 4) 7-day nurture sequence introducing your services.',
    icon: Target,
    difficulty: 'medium',
    estimatedTime: '10-15 min',
  },

  // Pipelines
  {
    id: 'create-sales-pipeline',
    name: 'Create Sales Pipeline',
    description: 'Set up a new sales pipeline with stages',
    category: 'pipelines',
    prompt: 'Create a new sales pipeline in GoHighLevel named "[PIPELINE_NAME]" with the following stages: 1) New Lead, 2) Contacted, 3) Qualified, 4) Proposal Sent, 5) Negotiation, 6) Closed Won/Lost. Set appropriate automation triggers for each stage.',
    icon: TrendingUp,
    difficulty: 'medium',
    estimatedTime: '5-10 min',
  },
  {
    id: 'move-deals-stages',
    name: 'Move Deals Between Stages',
    description: 'Bulk update deal stages based on criteria',
    category: 'pipelines',
    prompt: 'In GoHighLevel, move all deals in the "[CURRENT_STAGE]" stage that haven\'t had activity in 7+ days to "[NEW_STAGE]" stage. Update the deal notes with the reason for the move.',
    icon: Share2,
    difficulty: 'medium',
    estimatedTime: '3-5 min',
  },
  {
    id: 'update-pipeline-values',
    name: 'Update Pipeline Values',
    description: 'Bulk update deal values and properties',
    category: 'pipelines',
    prompt: 'Update the deal values in the "[PIPELINE_NAME]" pipeline: 1) Recalculate values based on [CRITERIA], 2) Update custom fields for [FIELD_NAME], 3) Generate a summary report of changes made.',
    icon: DollarSign,
    difficulty: 'medium',
    estimatedTime: '4-8 min',
  },

  // Contacts
  {
    id: 'bulk-tag-contacts',
    name: 'Bulk Tag Contacts',
    description: 'Apply tags to multiple contacts based on criteria',
    category: 'contacts',
    prompt: 'In GoHighLevel, find all contacts that match [CRITERIA] and apply the tag "[TAG_NAME]". Provide a summary of how many contacts were tagged and any that couldn\'t be processed.',
    icon: Users,
    difficulty: 'easy',
    estimatedTime: '2-4 min',
  },
  {
    id: 'merge-duplicate-contacts',
    name: 'Merge Duplicate Contacts',
    description: 'Identify and merge duplicate contact records',
    category: 'contacts',
    prompt: 'Scan GoHighLevel contacts for duplicates based on email address and phone number. Create a report of potential duplicates and merge them, keeping the most complete record as the primary contact.',
    icon: GitMerge,
    difficulty: 'advanced',
    estimatedTime: '10-15 min',
  },
  {
    id: 'export-contact-list',
    name: 'Export Contact List',
    description: 'Export filtered contacts to CSV',
    category: 'contacts',
    prompt: 'Export all contacts from GoHighLevel that have the tag "[TAG_NAME]" or are in the "[CAMPAIGN_NAME]" campaign. Include fields: name, email, phone, tags, and last activity date. Download as CSV.',
    icon: Download,
    difficulty: 'easy',
    estimatedTime: '2-3 min',
  },

  // Automations
  {
    id: 'trigger-based-workflow',
    name: 'Create Trigger-Based Workflow',
    description: 'Build automation triggered by specific events',
    category: 'automations',
    prompt: 'Create a trigger-based workflow in GoHighLevel that activates when [TRIGGER_EVENT] occurs. The workflow should: 1) [ACTION_1], 2) Wait [TIME_DELAY], 3) [ACTION_2], 4) Create task for team member if no response.',
    icon: Zap,
    difficulty: 'advanced',
    estimatedTime: '10-15 min',
  },
  {
    id: 'drip-campaign',
    name: 'Set Up Drip Campaign',
    description: 'Create automated drip email campaign',
    category: 'automations',
    prompt: 'Set up a drip campaign in GoHighLevel for [TARGET_AUDIENCE]. Create a series of 10 emails sent every 3 days that educate prospects about [TOPIC] and gradually introduce your solution. Include A/B testing for subject lines.',
    icon: Repeat,
    difficulty: 'advanced',
    estimatedTime: '15-25 min',
  },
  {
    id: 'action-sequences',
    name: 'Configure Action Sequences',
    description: 'Set up multi-channel action sequences',
    category: 'automations',
    prompt: 'Configure an action sequence in GoHighLevel that combines email, SMS, and tasks: 1) Day 1: Send intro email, 2) Day 2: SMS if email not opened, 3) Day 4: Follow-up email, 4) Day 7: Create manual call task for team.',
    icon: List,
    difficulty: 'medium',
    estimatedTime: '8-12 min',
  },

  // Forms
  {
    id: 'create-survey-form',
    name: 'Create Survey Form',
    description: 'Build a survey form to collect feedback',
    category: 'forms',
    prompt: 'Create a survey form in GoHighLevel to collect customer feedback about [TOPIC]. Include: 1) Rating questions (1-10 scale), 2) Multiple choice questions, 3) Open-ended feedback field, 4) Conditional logic for follow-up questions, 5) Thank you page with next steps.',
    icon: ClipboardList,
    difficulty: 'medium',
    estimatedTime: '8-12 min',
  },
  {
    id: 'build-contact-form',
    name: 'Build Contact Form',
    description: 'Create a contact form with auto-response',
    category: 'forms',
    prompt: 'Build a contact form in GoHighLevel for [PURPOSE] that captures: name, email, phone, company, message. Add form validation, spam protection, and connect to an auto-response workflow that sends confirmation email and creates a follow-up task.',
    icon: FileText,
    difficulty: 'easy',
    estimatedTime: '5-8 min',
  },
  {
    id: 'application-form',
    name: 'Set Up Application Form',
    description: 'Create multi-step application form with qualification',
    category: 'forms',
    prompt: 'Set up a multi-step application form in GoHighLevel for [PROGRAM/SERVICE]. Include: 1) Basic info page, 2) Qualification questions, 3) Budget/timeline questions, 4) File upload for documents, 5) Conditional approval/rejection workflow based on answers.',
    icon: Workflow,
    difficulty: 'advanced',
    estimatedTime: '15-20 min',
  },

  // Reporting
  {
    id: 'revenue-report',
    name: 'Generate Revenue Report',
    description: 'Create detailed revenue analytics report',
    category: 'reporting',
    prompt: 'Generate a comprehensive revenue report in GoHighLevel for the past [TIME_PERIOD]. Include: 1) Total revenue by pipeline, 2) Revenue by product/service, 3) Month-over-month growth, 4) Average deal size, 5) Revenue forecast for next quarter.',
    icon: DollarSign,
    difficulty: 'medium',
    estimatedTime: '5-8 min',
  },
  {
    id: 'conversion-report',
    name: 'Create Conversion Report',
    description: 'Analyze conversion rates across funnels',
    category: 'reporting',
    prompt: 'Create a conversion report in GoHighLevel analyzing: 1) Funnel conversion rates (visitor > lead > customer), 2) Email open and click rates, 3) SMS response rates, 4) Appointment show rates, 5) Pipeline stage conversion rates. Identify bottlenecks and opportunities.',
    icon: TrendingUp,
    difficulty: 'medium',
    estimatedTime: '6-10 min',
  },
  {
    id: 'activity-summary',
    name: 'Build Activity Summary',
    description: 'Generate team activity and performance summary',
    category: 'reporting',
    prompt: 'Build an activity summary report in GoHighLevel for the past [TIME_PERIOD] showing: 1) Total calls, emails, SMS sent by team member, 2) Appointments booked vs completed, 3) Tasks completed vs overdue, 4) Response time metrics, 5) Top performers by activity.',
    icon: Activity,
    difficulty: 'easy',
    estimatedTime: '4-6 min',
  },
];

const CATEGORY_LABELS = {
  leads: { label: 'Leads', color: 'bg-blue-100 text-blue-800' },
  campaigns: { label: 'Campaigns', color: 'bg-purple-100 text-purple-800' },
  workflows: { label: 'Workflows', color: 'bg-amber-100 text-amber-800' },
  analytics: { label: 'Analytics', color: 'bg-green-100 text-green-800' },
  settings: { label: 'Settings', color: 'bg-slate-100 text-slate-800' },
  funnels: { label: 'Funnels', color: 'bg-indigo-100 text-indigo-800' },
  pipelines: { label: 'Pipelines', color: 'bg-teal-100 text-teal-800' },
  contacts: { label: 'Contacts', color: 'bg-cyan-100 text-cyan-800' },
  automations: { label: 'Automations', color: 'bg-orange-100 text-orange-800' },
  forms: { label: 'Forms', color: 'bg-pink-100 text-pink-800' },
  reporting: { label: 'Reporting', color: 'bg-emerald-100 text-emerald-800' },
};

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

interface TaskTemplatesProps {
  onSelectTemplate: (template: TaskTemplate) => void;
  selectedCategory?: string;
  className?: string;
}

export function TaskTemplates({
  onSelectTemplate,
  selectedCategory,
  className,
}: TaskTemplatesProps) {
  const [activeCategory, setActiveCategory] = React.useState<string>(selectedCategory || 'all');

  const filteredTemplates = activeCategory === 'all'
    ? TASK_TEMPLATES
    : TASK_TEMPLATES.filter((t) => t.category === activeCategory);

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)] as const;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Category Tabs */}
      <div className="flex gap-1 p-2 bg-gray-50 border-b overflow-x-auto">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'text-xs whitespace-nowrap',
              activeCategory === cat && 'bg-emerald-600 hover:bg-emerald-700'
            )}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS].label}
          </Button>
        ))}
      </div>

      {/* Templates List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredTemplates.map((template) => {
            const Icon = template.icon;
            const categoryInfo = CATEGORY_LABELS[template.category];

            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all"
                onClick={() => onSelectTemplate(template)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {template.name}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={cn('text-xs', categoryInfo.color)}>
                          {categoryInfo.label}
                        </Badge>
                        <Badge variant="secondary" className={cn('text-xs', DIFFICULTY_COLORS[template.difficulty])}>
                          {template.difficulty}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          ~{template.estimatedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export { TASK_TEMPLATES };
