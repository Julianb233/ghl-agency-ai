import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: string;
  badgeColor?: 'emerald' | 'blue' | 'purple' | 'orange';
}

export interface NavItem {
  section: string;
  items: NavItemConfig[];
}

interface SidebarProps {
  items: NavItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  collapsed,
  onToggleCollapse,
  currentPath,
  onNavigate,
}) => {
  const isActive = (path: string) => {
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const getBadgeStyles = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'blue':
        return 'bg-blue-500/20 text-blue-400';
      case 'purple':
        return 'bg-purple-500/20 text-purple-400';
      case 'orange':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-emerald-500/20 text-emerald-400';
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="h-full bg-slate-900/50 border-r border-slate-800/50 flex flex-col"
      aria-label="Main navigation"
    >
      {/* Navigation Items */}
      <nav role="navigation" aria-label="Primary" className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {items.map((section, sectionIndex) => (
          <div key={section.section} className={cn(sectionIndex > 0 && 'mt-6')}>
            {/* Section Label */}
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 mb-2"
              >
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  {section.section}
                </span>
              </motion.div>
            )}

            {/* Section Items */}
            <div className="space-y-1 px-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      'hover:bg-slate-800/50',
                      active && 'bg-slate-800/80 text-white',
                      !active && 'text-slate-400',
                      collapsed && 'justify-center'
                    )}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 flex-shrink-0 transition-colors',
                        active && 'text-emerald-400'
                      )}
                    />
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex-1 text-left text-sm font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                    {!collapsed && item.badge && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-xs font-semibold',
                          getBadgeStyles(item.badgeColor)
                        )}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-800/50">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
