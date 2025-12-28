import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Play,
  Star,
  Clock,
  TrendingUp,
  Globe,
  Mail,
  FileText,
  Users,
  Sparkles,
  MessageSquare,
  Share2,
  Database,
  PenTool,
  Target,
  BarChart3,
  Megaphone,
  BookOpen,
  ExternalLink,
  Heart,
  Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  category: TemplateCategory;
  icon: React.ComponentType<{ className?: string }>;
  estimatedTime: string;
  popularity: number;
  featured?: boolean;
  isNew?: boolean;
  tags: string[];
}

type TemplateCategory = 'seo' | 'outreach' | 'research' | 'content' | 'social' | 'data';

interface TaskTemplatesProps {
  onSelectTemplate?: (template: TaskTemplate) => void;
  onLaunchTemplate?: (templateId: string) => void;
  className?: string;
}

const categoryConfig: Record<TemplateCategory, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  seo: { label: 'SEO', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: TrendingUp },
  outreach: { label: 'Outreach', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Mail },
  research: { label: 'Research', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Globe },
  content: { label: 'Content', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: PenTool },
  social: { label: 'Social', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30', icon: Share2 },
  data: { label: 'Data', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: Database },
};

const templates: TaskTemplate[] = [
  // SEO Templates
  {
    id: 'seo-audit',
    name: 'Full SEO Audit',
    description: 'Comprehensive website SEO analysis',
    longDescription: 'Analyze meta tags, headings, content quality, internal links, page speed, and mobile-friendliness.',
    category: 'seo',
    icon: TrendingUp,
    estimatedTime: '10-15 min',
    popularity: 95,
    featured: true,
    tags: ['technical-seo', 'analysis', 'reporting'],
  },
  {
    id: 'keyword-research',
    name: 'Keyword Research',
    description: 'Find valuable keywords in your niche',
    category: 'seo',
    icon: Target,
    estimatedTime: '5-8 min',
    popularity: 88,
    tags: ['keywords', 'research', 'strategy'],
  },
  {
    id: 'backlink-analysis',
    name: 'Backlink Analysis',
    description: 'Analyze competitor backlink profiles',
    category: 'seo',
    icon: ExternalLink,
    estimatedTime: '8-12 min',
    popularity: 76,
    tags: ['backlinks', 'competitors', 'link-building'],
  },

  // Outreach Templates
  {
    id: 'email-campaign',
    name: 'Email Outreach',
    description: 'Personalized email sequences',
    longDescription: 'Send personalized cold emails to prospects with automatic follow-ups and tracking.',
    category: 'outreach',
    icon: Mail,
    estimatedTime: '2-5 min',
    popularity: 92,
    featured: true,
    tags: ['email', 'cold-outreach', 'automation'],
  },
  {
    id: 'linkedin-connect',
    name: 'LinkedIn Connect',
    description: 'Automated connection requests',
    category: 'outreach',
    icon: Users,
    estimatedTime: '3-6 min',
    popularity: 84,
    isNew: true,
    tags: ['linkedin', 'networking', 'b2b'],
  },

  // Research Templates
  {
    id: 'competitor-analysis',
    name: 'Competitor Analysis',
    description: 'Deep dive into competitor strategies',
    longDescription: 'Analyze competitor websites, pricing, features, and marketing strategies.',
    category: 'research',
    icon: BarChart3,
    estimatedTime: '15-20 min',
    popularity: 90,
    featured: true,
    tags: ['competitors', 'market-research', 'strategy'],
  },
  {
    id: 'lead-enrichment',
    name: 'Lead Enrichment',
    description: 'Enrich leads with company data',
    category: 'research',
    icon: Users,
    estimatedTime: '1-2 min',
    popularity: 87,
    tags: ['leads', 'data', 'crm'],
  },
  {
    id: 'company-research',
    name: 'Company Research',
    description: 'Gather intelligence on any company',
    category: 'research',
    icon: Globe,
    estimatedTime: '5-10 min',
    popularity: 79,
    tags: ['company', 'intelligence', 'due-diligence'],
  },

  // Content Templates
  {
    id: 'blog-generator',
    name: 'Blog Post Generator',
    description: 'Create SEO-optimized blog posts',
    category: 'content',
    icon: BookOpen,
    estimatedTime: '5-8 min',
    popularity: 91,
    featured: true,
    tags: ['blog', 'writing', 'seo'],
  },
  {
    id: 'product-descriptions',
    name: 'Product Descriptions',
    description: 'Generate compelling product copy',
    category: 'content',
    icon: FileText,
    estimatedTime: '2-4 min',
    popularity: 82,
    tags: ['ecommerce', 'copywriting', 'products'],
  },

  // Social Templates
  {
    id: 'social-scheduler',
    name: 'Social Media Scheduler',
    description: 'Schedule posts across platforms',
    category: 'social',
    icon: Share2,
    estimatedTime: '3-5 min',
    popularity: 85,
    isNew: true,
    tags: ['social-media', 'scheduling', 'content'],
  },
  {
    id: 'engagement-bot',
    name: 'Engagement Bot',
    description: 'Automated engagement on posts',
    category: 'social',
    icon: MessageSquare,
    estimatedTime: '5-10 min',
    popularity: 73,
    tags: ['engagement', 'automation', 'growth'],
  },

  // Data Templates
  {
    id: 'web-scraper',
    name: 'Web Scraper',
    description: 'Extract data from any website',
    category: 'data',
    icon: Database,
    estimatedTime: '5-15 min',
    popularity: 89,
    featured: true,
    tags: ['scraping', 'data-extraction', 'automation'],
  },
  {
    id: 'form-filler',
    name: 'Form Automation',
    description: 'Auto-fill and submit forms',
    category: 'data',
    icon: FileText,
    estimatedTime: '2-5 min',
    popularity: 77,
    tags: ['forms', 'automation', 'data-entry'],
  },
];

export const TaskTemplates: React.FC<TaskTemplatesProps> = ({
  onSelectTemplate,
  onLaunchTemplate,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'name' | 'time'>('popularity');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  // Load favorites from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('task-template-favorites');
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save favorites
  const toggleFavorite = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(templateId)) {
      newFavorites.delete(templateId);
    } else {
      newFavorites.add(templateId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('task-template-favorites', JSON.stringify(Array.from(newFavorites)));
  };

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let result = templates.filter(template => {
      const matchesSearch = !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort
    switch (sortBy) {
      case 'popularity':
        result.sort((a, b) => b.popularity - a.popularity);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'time':
        result.sort((a, b) => {
          const aTime = parseInt(a.estimatedTime);
          const bTime = parseInt(b.estimatedTime);
          return aTime - bTime;
        });
        break;
    }

    return result;
  }, [searchQuery, selectedCategory, sortBy]);

  const featuredTemplates = templates.filter(t => t.featured);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Featured Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          Featured Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredTemplates.map((template) => {
            const Icon = template.icon;
            const isFavorite = favorites.has(template.id);

            return (
              <motion.div
                key={template.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setHoveredTemplate(template.id)}
                onHoverEnd={() => setHoveredTemplate(null)}
                onClick={() => onSelectTemplate?.(template)}
                className="relative p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 hover:border-emerald-500/50 cursor-pointer group overflow-hidden"
              >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>

                {/* Favorite button */}
                <button
                  onClick={(e) => toggleFavorite(template.id, e)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Heart className={cn(
                    'w-4 h-4 transition-colors',
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400 hover:text-red-400'
                  )} />
                </button>

                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                  categoryConfig[template.category].color
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-white mb-1">{template.name}</h4>
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                  {template.longDescription || template.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {template.estimatedTime}
                  </span>
                  <motion.button
                    initial={false}
                    animate={{ opacity: hoveredTemplate === template.id ? 1 : 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchTemplate?.(template.id);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Launch
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              selectedCategory === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            )}
          >
            All
          </button>
          {Object.entries(categoryConfig).map(([key, config]) => {
            const CatIcon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as TemplateCategory)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  selectedCategory === key
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                )}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
        >
          <option value="popularity">Most Popular</option>
          <option value="name">Name A-Z</option>
          <option value="time">Fastest First</option>
        </select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredTemplates.map((template, index) => {
            const Icon = template.icon;
            const isFavorite = favorites.has(template.id);
            const config = categoryConfig[template.category];

            return (
              <motion.div
                key={template.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectTemplate?.(template)}
                className="relative p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 cursor-pointer group"
              >
                {/* Badges */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {template.isNew && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                      New
                    </span>
                  )}
                  <button
                    onClick={(e) => toggleFavorite(template.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Bookmark className={cn(
                      'w-4 h-4 transition-colors',
                      isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-slate-500 hover:text-yellow-400'
                    )} />
                  </button>
                </div>

                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    config.color
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white mb-0.5 truncate pr-16">
                      {template.name}
                    </h4>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3" />
                        {template.estimatedTime}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded border', config.color)}>
                        {config.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover action */}
                <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchTemplate?.(template.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Quick Launch
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No templates found</h3>
          <p className="text-sm text-slate-500">
            Try adjusting your search or filter criteria
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default TaskTemplates;
