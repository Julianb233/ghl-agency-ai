import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Clock,
  History,
  Bot,
  Sparkles,
  Search,
  Filter,
  ChevronRight,
  MoreVertical,
  Repeat,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Globe,
  Mail,
  FileText,
  Users,
  TrendingUp,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface AgentTask {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
  template?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'seo' | 'outreach' | 'research' | 'content';
  icon: React.ComponentType<{ className?: string }>;
  popular?: boolean;
}

type TabType = 'quick' | 'live' | 'history';

interface AgentHubProps {
  onLaunchTask?: (templateId: string) => void;
  onViewTask?: (taskId: string) => void;
  className?: string;
}

// Mock data - will be replaced with real API calls
const mockTemplates: TaskTemplate[] = [
  { id: 'seo-audit', name: 'SEO Audit', description: 'Analyze website for SEO issues', category: 'seo', icon: TrendingUp, popular: true },
  { id: 'competitor-analysis', name: 'Competitor Analysis', description: 'Research competitor websites', category: 'research', icon: Globe, popular: true },
  { id: 'email-outreach', name: 'Email Outreach', description: 'Send personalized emails', category: 'outreach', icon: Mail },
  { id: 'content-scrape', name: 'Content Scraper', description: 'Extract data from websites', category: 'research', icon: FileText },
  { id: 'lead-enrichment', name: 'Lead Enrichment', description: 'Enrich leads with data', category: 'research', icon: Users },
  { id: 'social-post', name: 'Social Post', description: 'Generate social content', category: 'content', icon: Sparkles },
];

const mockRecentTasks: AgentTask[] = [
  { id: '1', name: 'SEO Audit - acme.com', description: 'Completed 2h ago', status: 'completed', icon: TrendingUp, completedAt: new Date() },
  { id: '2', name: 'Lead Enrichment Batch', description: 'Processing 45 leads', status: 'running', progress: 67, icon: Users, startedAt: new Date() },
  { id: '3', name: 'Competitor Research', description: 'Failed - Rate limited', status: 'failed', icon: Globe },
];

const mockLiveTasks: AgentTask[] = [
  { id: 'live-1', name: 'Website Crawler', description: 'Scanning pages...', status: 'running', progress: 34, icon: Globe, startedAt: new Date() },
  { id: 'live-2', name: 'Email Campaign', description: 'Sending batch 3/10', status: 'running', progress: 30, icon: Mail, startedAt: new Date() },
  { id: 'live-3', name: 'Data Extraction', description: 'Waiting in queue', status: 'queued', icon: FileText },
];

export const AgentHub: React.FC<AgentHubProps> = ({
  onLaunchTask,
  onViewTask,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('quick');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    return mockTemplates.filter(template => {
      const matchesSearch = !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || template.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  const getStatusColor = (status: AgentTask['status']) => {
    switch (status) {
      case 'running': return 'text-emerald-400';
      case 'completed': return 'text-blue-400';
      case 'failed': return 'text-red-400';
      case 'queued': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: AgentTask['status']) => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'queued': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'seo': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'outreach': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'research': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'content': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const tabs = [
    { id: 'quick' as const, label: 'Quick Launch', icon: Zap },
    { id: 'live' as const, label: 'Live View', icon: Bot, badge: mockLiveTasks.filter(t => t.status === 'running').length },
    { id: 'history' as const, label: 'History', icon: History },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-700/50 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold"
                  aria-label={`${tab.badge} active`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'quick' && (
          <motion.div
            key="quick"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Recent Tasks */}
            {mockRecentTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Tasks
                </h3>
                <div className="grid gap-2">
                  {mockRecentTasks.map((task) => {
                    const TaskIcon = task.icon;
                    return (
                      <motion.button
                        key={task.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => onViewTask?.(task.id)}
                        className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                          <TaskIcon className="w-5 h-5 text-slate-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{task.name}</div>
                          <div className="text-sm text-slate-500">{task.description}</div>
                        </div>
                        <div className={cn('flex items-center gap-1.5', getStatusColor(task.status))}>
                          {getStatusIcon(task.status)}
                          <span className="text-xs font-medium capitalize">{task.status}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunchTask?.(task.template || task.id);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                          aria-label={`Run ${task.name} again`}
                        >
                          <Repeat className="w-4 h-4 text-slate-400" />
                        </button>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Templates Section */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Task Templates
                </h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                    <label htmlFor="template-search" className="sr-only">Search templates</label>
                    <input
                      id="template-search"
                      type="text"
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 w-48 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  {/* Category Filter */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {['seo', 'outreach', 'research', 'content'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium transition-colors border',
                          categoryFilter === cat
                            ? getCategoryColor(cat)
                            : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600/50'
                        )}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => {
                  const TemplateIcon = template.icon;
                  return (
                    <motion.button
                      key={template.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onLaunchTask?.(template.id)}
                      className="relative p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/50 transition-all text-left group"
                    >
                      {template.popular && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                          Popular
                        </span>
                      )}
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                        getCategoryColor(template.category)
                      )}>
                        <TemplateIcon className="w-5 h-5" />
                      </div>
                      <div className="font-medium text-white mb-1">{template.name}</div>
                      <div className="text-sm text-slate-500 mb-3">{template.description}</div>
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4" />
                        <span>Launch</span>
                      </div>
                    </motion.button>
                  );
                })}

                {/* Create Custom */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-4 rounded-xl border-2 border-dashed border-slate-700/50 hover:border-emerald-500/50 transition-all text-left group flex flex-col items-center justify-center min-h-[160px]"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center mb-3 group-hover:bg-emerald-500/20 transition-colors">
                    <Plus className="w-5 h-5 text-slate-400 group-hover:text-emerald-400" />
                  </div>
                  <div className="font-medium text-slate-400 group-hover:text-white transition-colors">
                    Custom Task
                  </div>
                  <div className="text-sm text-slate-600">Create from scratch</div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {mockLiveTasks.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-400 mb-2">No Active Agents</h3>
                <p className="text-sm text-slate-500 mb-4">Launch a task to see your agents in action</p>
                <button
                  onClick={() => setActiveTab('quick')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Quick Launch
                </button>
              </div>
            ) : (
              mockLiveTasks.map((task) => {
                const TaskIcon = task.icon;
                return (
                  <motion.div
                    key={task.id}
                    layout
                    className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                        <TaskIcon className="w-6 h-6 text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium text-white truncate">{task.name}</h4>
                          <span className={cn(
                            'flex items-center gap-1 text-xs font-medium',
                            getStatusColor(task.status)
                          )}>
                            {getStatusIcon(task.status)}
                            {task.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">{task.description}</p>

                        {task.progress !== undefined && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">Progress</span>
                              <span className="text-slate-400">{task.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${task.progress}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewTask?.(task.id)}
                          className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
                          aria-label={`View details for ${task.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
                          aria-label={`More options for ${task.name}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Search and Filter */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                <label htmlFor="history-search" className="sr-only">Search execution history</label>
                <input
                  id="history-search"
                  type="text"
                  placeholder="Search execution history..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-400 hover:text-white transition-colors"
                aria-label="Open filter options"
              >
                <Filter className="w-4 h-4" aria-hidden="true" />
                Filter
              </button>
            </div>

            {/* History List */}
            <div className="space-y-2">
              {[...mockRecentTasks, ...mockRecentTasks].map((task, index) => {
                const TaskIcon = task.icon;
                return (
                  <motion.div
                    key={`${task.id}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    onClick={() => onViewTask?.(task.id)}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      task.status === 'completed' ? 'bg-emerald-500/20' :
                      task.status === 'failed' ? 'bg-red-500/20' : 'bg-slate-700/50'
                    )}>
                      <TaskIcon className={cn(
                        'w-4 h-4',
                        task.status === 'completed' ? 'text-emerald-400' :
                        task.status === 'failed' ? 'text-red-400' : 'text-slate-400'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{task.name}</div>
                      <div className="text-xs text-slate-500">{task.description}</div>
                    </div>
                    <div className={cn(
                      'flex items-center gap-1 text-xs font-medium',
                      getStatusColor(task.status)
                    )}>
                      {getStatusIcon(task.status)}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentHub;
