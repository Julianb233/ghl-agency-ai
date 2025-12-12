import React from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Users, Settings, FileText, Activity, ToggleLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    label: 'System Health',
    href: '/admin/system',
    icon: Activity,
  },
  {
    label: 'Audit Log',
    href: '/admin/audit',
    icon: FileText,
  },
  {
    label: 'Config',
    href: '/admin/config',
    icon: ToggleLeft,
  },
];

export const AdminNav: React.FC = () => {
  const [location] = useLocation();

  return (
    <nav className="space-y-2 p-4" role="navigation" aria-label="Admin navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href !== '/admin' && location.startsWith(item.href));

        return (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </a>
          </Link>
        );
      })}
    </nav>
  );
};
