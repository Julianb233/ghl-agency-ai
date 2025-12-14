/**
 * Interactive Task Creator Component
 *
 * Enhanced task creation with:
 * - Natural language input with smart suggestions
 * - Visual task preview before execution
 * - Template quick-select with parameter filling
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  Loader2,
  Sparkles,
  X,
  Search,
  Clock,
  Zap,
  FileText,
  Users,
  Mail,
  Calendar,
  BarChart3,
  Settings,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Target,
  Wand2,
  Layers,
  ChevronRight,
  MessageSquare,
  Bot,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { TASK_TEMPLATES, type TaskTemplate } from './TaskTemplates';

// Smart suggestion categories based on input keywords
const SUGGESTION_KEYWORDS: Record<string, { keywords: string[]; templateIds: string[] }> = {
  leads: {
    keywords: ['lead', 'leads', 'contact', 'contacts', 'prospect', 'prospects', 'import', 'add'],
    templateIds: ['add-leads-campaign', 'enrich-leads', 'segment-leads', 'bulk-tag-contacts'],
  },
  email: {
    keywords: ['email', 'emails', 'sequence', 'nurture', 'broadcast', 'newsletter'],
    templateIds: ['create-email-sequence', 'schedule-broadcast', 'drip-campaign'],
  },
  sms: {
    keywords: ['sms', 'text', 'message', 'messaging'],
    templateIds: ['launch-sms-campaign', 'action-sequences'],
  },
  workflow: {
    keywords: ['workflow', 'automation', 'automate', 'trigger', 'automatic'],
    templateIds: ['create-lead-workflow', 'appointment-reminder', 'no-show-followup', 'trigger-based-workflow'],
  },
  campaign: {
    keywords: ['campaign', 'campaigns', 'marketing', 'outreach'],
    templateIds: ['create-email-sequence', 'launch-sms-campaign', 'drip-campaign'],
  },
  analytics: {
    keywords: ['report', 'reports', 'analytics', 'performance', 'metrics', 'stats'],
    templateIds: ['pipeline-report', 'campaign-performance', 'revenue-report', 'conversion-report', 'activity-summary'],
  },
  pipeline: {
    keywords: ['pipeline', 'deals', 'sales', 'stage', 'stages'],
    templateIds: ['create-sales-pipeline', 'move-deals-stages', 'update-pipeline-values'],
  },
  funnel: {
    keywords: ['funnel', 'landing', 'page', 'webinar', 'lead magnet'],
    templateIds: ['create-landing-page-funnel', 'build-webinar-funnel', 'lead-magnet-funnel'],
  },
  form: {
    keywords: ['form', 'forms', 'survey', 'application', 'contact form'],
    templateIds: ['create-survey-form', 'build-contact-form', 'application-form'],
  },
  calendar: {
    keywords: ['calendar', 'appointment', 'appointments', 'booking', 'schedule'],
    templateIds: ['appointment-reminder', 'no-show-followup', 'configure-calendar'],
  },
};

// Parameter extraction patterns
const PARAMETER_PATTERNS = [
  { pattern: /\[([A-Z_]+)\]/g, type: 'placeholder' },
];

interface ExtractedParameter {
  name: string;
  displayName: string;
  value: string;
  required: boolean;
}

interface TaskPreview {
  originalPrompt: string;
  filledPrompt: string;
  parameters: ExtractedParameter[];
  template: TaskTemplate | null;
  isValid: boolean;
  validationMessage?: string;
  estimatedSteps: string[];
}

interface InteractiveTaskCreatorProps {
  onSubmit: (task: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function InteractiveTaskCreator({
  onSubmit,
  isLoading = false,
  disabled = false,
}: InteractiveTaskCreatorProps) {
  const [task, setTask] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get smart suggestions based on input
  const suggestions = useMemo(() => {
    if (!task.trim() && !searchQuery.trim()) {
      // Show popular templates when no input
      return TASK_TEMPLATES.slice(0, 6);
    }

    const query = (task + ' ' + searchQuery).toLowerCase();
    const words = query.split(/\s+/).filter(Boolean);

    // Find matching templates based on keywords
    const matchedTemplateIds = new Set<string>();

    words.forEach(word => {
      Object.values(SUGGESTION_KEYWORDS).forEach(category => {
        if (category.keywords.some(kw => kw.includes(word) || word.includes(kw))) {
          category.templateIds.forEach(id => matchedTemplateIds.add(id));
        }
      });
    });

    // Also match by template name and description
    const directMatches = TASK_TEMPLATES.filter(t =>
      words.some(word =>
        t.name.toLowerCase().includes(word) ||
        t.description.toLowerCase().includes(word) ||
        t.category.includes(word)
      )
    );

    directMatches.forEach(t => matchedTemplateIds.add(t.id));

    // Get matched templates
    const matched = TASK_TEMPLATES.filter(t => matchedTemplateIds.has(t.id));

    return matched.length > 0 ? matched.slice(0, 8) : TASK_TEMPLATES.slice(0, 6);
  }, [task, searchQuery]);

  // Extract parameters from template
  const extractParameters = useCallback((prompt: string): ExtractedParameter[] => {
    const params: ExtractedParameter[] = [];
    const seen = new Set<string>();

    PARAMETER_PATTERNS.forEach(({ pattern }) => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(prompt)) !== null) {
        const name = match[1];
        if (!seen.has(name)) {
          seen.add(name);
          params.push({
            name,
            displayName: name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
            value: parameters[name] || '',
            required: true,
          });
        }
      }
    });

    return params;
  }, [parameters]);

  // Generate task preview
  const preview = useMemo((): TaskPreview | null => {
    if (!task.trim() && !selectedTemplate) return null;

    const promptToUse = selectedTemplate?.prompt || task;
    const extractedParams = extractParameters(promptToUse);

    // Fill in parameters
    let filledPrompt = promptToUse;
    extractedParams.forEach(param => {
      const value = parameters[param.name];
      if (value) {
        filledPrompt = filledPrompt.replace(`[${param.name}]`, value);
      }
    });

    // Check validity
    const unfilledParams = extractedParams.filter(p => !parameters[p.name]);
    const isValid = unfilledParams.length === 0;

    // Estimate steps
    const estimatedSteps = estimateSteps(filledPrompt, selectedTemplate);

    return {
      originalPrompt: promptToUse,
      filledPrompt,
      parameters: extractedParams,
      template: selectedTemplate,
      isValid,
      validationMessage: isValid ? undefined : `Please fill in: ${unfilledParams.map(p => p.displayName).join(', ')}`,
      estimatedSteps,
    };
  }, [task, selectedTemplate, parameters, extractParameters]);

  // Estimate execution steps based on task
  const estimateSteps = (prompt: string, template: TaskTemplate | null): string[] => {
    const steps: string[] = [];
    const promptLower = prompt.toLowerCase();

    // Common step patterns
    if (promptLower.includes('go to') || promptLower.includes('gohighlevel') || promptLower.includes('ghl')) {
      steps.push('Navigate to GoHighLevel dashboard');
    }
    if (promptLower.includes('login') || promptLower.includes('sign in')) {
      steps.push('Authenticate with platform');
    }
    if (promptLower.includes('create') || promptLower.includes('build') || promptLower.includes('set up')) {
      steps.push('Create new resource');
    }
    if (promptLower.includes('configure') || promptLower.includes('settings')) {
      steps.push('Configure settings');
    }
    if (promptLower.includes('email') || promptLower.includes('sms') || promptLower.includes('message')) {
      steps.push('Compose and set up messaging');
    }
    if (promptLower.includes('workflow') || promptLower.includes('automation')) {
      steps.push('Build automation workflow');
    }
    if (promptLower.includes('report') || promptLower.includes('analytics')) {
      steps.push('Generate and compile report');
    }
    if (promptLower.includes('save') || promptLower.includes('complete')) {
      steps.push('Save and verify changes');
    }

    // Add steps based on template
    if (template) {
      if (template.difficulty === 'advanced') {
        steps.push('Validate configuration');
        steps.push('Test automation triggers');
      }
      steps.push('Confirm task completion');
    }

    return steps.length > 0 ? steps : ['Analyze task requirements', 'Execute task steps', 'Verify completion'];
  };

  // Handle template selection
  const handleSelectTemplate = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setTask(template.prompt);
    setShowSuggestions(false);
    setParameters({});
    inputRef.current?.focus();
  };

  // Handle parameter change
  const handleParameterChange = (name: string, value: string) => {
    setParameters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview?.isValid || isLoading || disabled) return;

    onSubmit(preview.filledPrompt);
    setTask('');
    setSelectedTemplate(null);
    setParameters({});
  };

  // Clear template
  const handleClearTemplate = () => {
    setSelectedTemplate(null);
    setTask('');
    setParameters({});
  };

  // Category icons
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ElementType> = {
      leads: Users,
      campaigns: Mail,
      workflows: Zap,
      analytics: BarChart3,
      settings: Settings,
      funnels: Layers,
      pipelines: Target,
      contacts: Users,
      automations: Zap,
      forms: FileText,
      reporting: BarChart3,
    };
    return icons[category] || FileText;
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Main Input Card */}
      <Card className="border-2 border-emerald-200 dark:border-emerald-800 shadow-lg overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-600 text-white">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Create Task</CardTitle>
                <CardDescription>Describe what you want the AI agent to do</CardDescription>
              </div>
            </div>
            {selectedTemplate && (
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 gap-1 cursor-pointer hover:bg-emerald-200"
                onClick={handleClearTemplate}
              >
                <Sparkles className="w-3 h-3" />
                {selectedTemplate.name}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Input */}
            <div className="relative">
              <textarea
                ref={inputRef}
                value={task}
                onChange={(e) => {
                  setTask(e.target.value);
                  if (!selectedTemplate) {
                    setShowSuggestions(e.target.value.length > 0);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Describe your task in natural language, e.g., 'Create an email sequence for new leads'"
                disabled={isLoading || disabled}
                className={cn(
                  'w-full px-4 py-3 rounded-lg border-2 resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
                  'disabled:bg-gray-100 disabled:cursor-not-allowed',
                  'text-sm placeholder:text-gray-400',
                  'transition-all duration-200',
                  selectedTemplate && 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/30',
                  !selectedTemplate && 'border-gray-200 dark:border-gray-700'
                )}
                rows={4}
              />

              {/* AI Assistant Indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-3 top-3"
              >
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 text-purple-600 dark:text-purple-400">
                  <Bot className="w-3 h-3" />
                  <span className="text-[10px] font-medium">AI-Powered</span>
                </div>
              </motion.div>
            </div>

            {/* Parameter Inputs */}
            <AnimatePresence>
              {preview && preview.parameters.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Settings className="w-4 h-4" />
                    Fill in the details:
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {preview.parameters.map((param) => (
                      <div key={param.name} className="space-y-1">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {param.displayName}
                          {param.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <Input
                          value={parameters[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          placeholder={`Enter ${param.displayName.toLowerCase()}`}
                          className="h-9 text-sm"
                          disabled={isLoading || disabled}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Templates
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="gap-1.5"
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  Preview
                </Button>
              </div>

              <Button
                type="submit"
                disabled={!preview?.isValid || isLoading || disabled}
                className={cn(
                  'bg-emerald-600 hover:bg-emerald-700 text-white gap-2',
                  'disabled:bg-gray-300 disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Execute Task
                  </>
                )}
              </Button>
            </div>

            {/* Validation Message */}
            <AnimatePresence>
              {preview && !preview.isValid && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"
                >
                  <AlertCircle className="w-4 h-4" />
                  {preview.validationMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </CardContent>
      </Card>

      {/* Smart Suggestions Panel */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <CardTitle className="text-sm">Smart Suggestions</CardTitle>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search templates..."
                      className="h-8 w-48 pl-8 text-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <ScrollArea className="h-[280px]">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestions.map((template) => {
                      const Icon = getCategoryIcon(template.category);
                      return (
                        <motion.div
                          key={template.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card
                            className={cn(
                              'cursor-pointer transition-all duration-200',
                              'hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-700',
                              selectedTemplate?.id === template.id && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                            )}
                            onClick={() => handleSelectTemplate(template)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">
                                    {template.name}
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                    {template.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {template.category}
                                    </Badge>
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {template.estimatedTime}
                                    </span>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Preview Panel */}
      <AnimatePresence>
        {showPreview && preview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Card className="border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <CardTitle className="text-sm">Task Preview</CardTitle>
                  {preview.isValid ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Ready
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-[10px]">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Incomplete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filled Prompt Preview */}
                <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {preview.filledPrompt}
                  </p>
                </div>

                <Separator />

                {/* Estimated Steps */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Estimated Execution Steps
                  </h4>
                  <div className="space-y-1.5">
                    {preview.estimatedSteps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            {index + 1}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{step}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Template Info */}
                {preview.template && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Template: {preview.template.name}</span>
                      <span>Est. Time: {preview.template.estimatedTime}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default InteractiveTaskCreator;
