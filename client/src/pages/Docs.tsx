import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { Link } from 'wouter';
import { DocsSidebar, DocsSearch, DocsContent, defaultDocsCategories } from '../components/docs';
import { GradientText } from '../components/effects/GradientText';

export default function Docs() {
  const [activeSlug, setActiveSlug] = useState('introduction');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleNavigate = (slug: string) => {
    setActiveSlug(slug);
    setIsMobileSidebarOpen(false);
    // In production, this would also update the URL
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo / Back */}
            <div className="flex items-center gap-4">
              <Link href="/">
                <a className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </a>
              </Link>
              <div className="h-6 w-px bg-slate-700" />
              <h1 className="text-lg font-semibold">
                <GradientText gradient="from-blue-400 to-purple-500">
                  Documentation
                </GradientText>
              </h1>
            </div>

            {/* Search - Desktop */}
            <div className="hidden md:block flex-1 max-w-md">
              <DocsSearch onNavigate={handleNavigate} />
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white transition-colors"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            >
              {isMobileSidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Search - Mobile */}
          <div className="md:hidden mt-4">
            <DocsSearch onNavigate={handleNavigate} className="w-full" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6">
        <div className="flex gap-8 py-8">
          {/* Sidebar - Desktop */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <DocsSidebar
                categories={defaultDocsCategories}
                activeSlug={activeSlug}
                onNavigate={handleNavigate}
              />
            </div>
          </div>

          {/* Mobile Sidebar */}
          {isMobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="fixed inset-0 top-[73px] z-30 bg-slate-950 md:hidden overflow-y-auto"
            >
              <div className="p-6">
                <DocsSidebar
                  categories={defaultDocsCategories}
                  activeSlug={activeSlug}
                  onNavigate={handleNavigate}
                />
              </div>
            </motion.div>
          )}

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <DocsContent slug={activeSlug} />

            {/* Navigation footer */}
            <div className="mt-12 pt-8 border-t border-slate-700/50">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <NavigationCard
                  direction="prev"
                  slug="introduction"
                  title="Introduction"
                  onClick={() => handleNavigate('introduction')}
                />
                <NavigationCard
                  direction="next"
                  slug="quickstart"
                  title="Quick Start Guide"
                  onClick={() => handleNavigate('quickstart')}
                />
              </div>
            </div>
          </main>

          {/* Table of contents - Desktop */}
          <div className="hidden lg:block w-48 flex-shrink-0">
            <div className="sticky top-24">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                On this page
              </h4>
              <nav className="space-y-2">
                <a
                  href="#"
                  className="block text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Introduction
                </a>
                <a
                  href="#"
                  className="block text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Key Features
                </a>
                <a
                  href="#"
                  className="block text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Getting Started
                </a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Navigation card component
interface NavigationCardProps {
  direction: 'prev' | 'next';
  slug: string;
  title: string;
  onClick: () => void;
}

const NavigationCard: React.FC<NavigationCardProps> = ({
  direction,
  title,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex-1 p-4 rounded-xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-left ${
        direction === 'next' ? 'sm:text-right' : ''
      }`}
    >
      <span className="text-xs text-slate-500 uppercase tracking-wider">
        {direction === 'prev' ? '← Previous' : 'Next →'}
      </span>
      <p className="font-medium text-white mt-1">{title}</p>
    </button>
  );
};
