import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, FileText, Book, Code, Zap, Settings, Shield, Users } from 'lucide-react';

interface DocItem {
  slug: string;
  title: string;
  icon?: React.ElementType;
}

interface DocCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  items: DocItem[];
}

interface DocsSidebarProps {
  categories: DocCategory[];
  activeSlug?: string;
  onNavigate: (slug: string) => void;
  className?: string;
}

export const DocsSidebar: React.FC<DocsSidebarProps> = ({
  categories,
  activeSlug,
  onNavigate,
  className = '',
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    categories.map((c) => c.id) // Start all expanded
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <aside className={`docs-sidebar ${className}`}>
      <nav className="space-y-2">
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category.id);
          const CategoryIcon = category.icon;

          return (
            <div key={category.id}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-slate-800/50 transition-colors group"
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </motion.div>
                <CategoryIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                <span className="font-medium text-slate-300 group-hover:text-white transition-colors">
                  {category.title}
                </span>
              </button>

              {/* Category Items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 pl-4 border-l border-slate-700/50 space-y-1 py-1">
                      {category.items.map((item) => {
                        const isActive = activeSlug === item.slug;
                        const ItemIcon = item.icon || FileText;

                        return (
                          <button
                            key={item.slug}
                            onClick={() => onNavigate(item.slug)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                              isActive
                                ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 -ml-[1px]'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                            }`}
                          >
                            <ItemIcon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

// Default documentation categories
export const defaultDocsCategories: DocCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    items: [
      { slug: 'introduction', title: 'Introduction' },
      { slug: 'quickstart', title: 'Quick Start Guide' },
      { slug: 'installation', title: 'Installation' },
      { slug: 'first-automation', title: 'Your First Automation' },
    ],
  },
  {
    id: 'core-concepts',
    title: 'Core Concepts',
    icon: Zap,
    items: [
      { slug: 'workflows', title: 'Workflows' },
      { slug: 'browser-agents', title: 'Browser Agents' },
      { slug: 'triggers', title: 'Triggers & Actions' },
      { slug: 'ai-integration', title: 'AI Integration' },
    ],
  },
  {
    id: 'ghl-integration',
    title: 'GHL Integration',
    icon: Settings,
    items: [
      { slug: 'ghl-connect', title: 'Connecting GHL' },
      { slug: 'subaccounts', title: 'Sub-account Management' },
      { slug: 'webhooks', title: 'Webhooks' },
      { slug: 'automations', title: 'GHL Automations' },
    ],
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    icon: Code,
    items: [
      { slug: 'api-overview', title: 'API Overview' },
      { slug: 'authentication', title: 'Authentication' },
      { slug: 'endpoints', title: 'Endpoints' },
      { slug: 'rate-limits', title: 'Rate Limits' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    items: [
      { slug: 'credential-vault', title: 'Credential Vault' },
      { slug: 'encryption', title: 'Data Encryption' },
      { slug: 'compliance', title: 'Compliance' },
    ],
  },
  {
    id: 'team',
    title: 'Team & Collaboration',
    icon: Users,
    items: [
      { slug: 'team-management', title: 'Team Management' },
      { slug: 'roles-permissions', title: 'Roles & Permissions' },
      { slug: 'sharing', title: 'Sharing Workflows' },
    ],
  },
];

export default DocsSidebar;
