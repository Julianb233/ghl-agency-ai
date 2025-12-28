import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  Home,
  Bot,
  Network,
  Workflow,
  Settings,
  Key,
  Plug,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Command,
  Bell,
  User,
  Search,
  Activity,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandPalette } from './CommandPalette';
import { StatusBar } from './StatusBar';
import { Sidebar, type NavItem } from './Sidebar';

interface CommandCenterProps {
  children: React.ReactNode;
}

// Navigation structure
const navItems: NavItem[] = [
  {
    section: 'WORK',
    items: [
      { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
      { id: 'agents', label: 'Agents', icon: Bot, path: '/dashboard/agents', badge: 'Live' },
      { id: 'swarms', label: 'Swarms', icon: Network, path: '/dashboard/swarms' },
      { id: 'workflows', label: 'Workflows', icon: Workflow, path: '/dashboard/workflows' },
    ]
  },
  {
    section: 'CONFIGURE',
    items: [
      { id: 'integrations', label: 'Integrations', icon: Plug, path: '/dashboard/integrations' },
      { id: 'credentials', label: 'Credentials', icon: Key, path: '/dashboard/credentials' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/dashboard/settings' },
    ]
  },
  {
    section: 'HELP',
    items: [
      { id: 'docs', label: 'Documentation', icon: HelpCircle, path: '/docs' },
    ]
  }
];

export const CommandCenter: React.FC<CommandCenterProps> = ({ children }) => {
  const [location, setLocation] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Restore sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('commandcenter-sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save sidebar state
  useEffect(() => {
    localStorage.setItem('commandcenter-sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  }, [setLocation]);

  const getCurrentPageTitle = () => {
    for (const section of navItems) {
      for (const item of section.items) {
        if (location === item.path || location.startsWith(item.path + '/')) {
          return item.label;
        }
      }
    }
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md flex items-center px-4 gap-4 sticky top-0 z-50">
        {/* Logo / Menu Toggle */}
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            {!isMobile && !sidebarCollapsed && (
              <span className="font-semibold text-sm">GHL Agency AI</span>
            )}
          </div>
        </div>

        {/* Command Bar Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex-1 max-w-md mx-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors text-sm text-slate-400"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search or run command...</span>
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700/50 text-xs">
            <Command className="w-3 h-3" />
            <span>K</span>
          </kbd>
        </button>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Activity Indicator */}
          <button className="relative p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
            <Activity className="w-5 h-5 text-slate-400" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
            <Bell className="w-5 h-5 text-slate-400" />
          </button>

          {/* User Menu */}
          <button className="p-1 rounded-lg hover:bg-slate-800/50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sidebar
            items={navItems}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            currentPath={location}
            onNavigate={handleNavigate}
          />
        )}

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobile && mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed left-0 top-14 bottom-0 w-64 z-50"
              >
                <Sidebar
                  items={navItems}
                  collapsed={false}
                  onToggleCollapse={() => {}}
                  currentPath={location}
                  onNavigate={handleNavigate}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold">{getCurrentPageTitle()}</h1>
            </div>

            {/* Page Content */}
            {children}
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export default CommandCenter;
