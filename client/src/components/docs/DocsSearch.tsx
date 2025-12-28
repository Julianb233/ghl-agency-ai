import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, ArrowRight, Command } from 'lucide-react';

interface SearchResult {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
}

interface DocsSearchProps {
  onNavigate: (slug: string) => void;
  className?: string;
}

// Mock search results - in production, this would hit an API
const mockResults: SearchResult[] = [
  {
    slug: 'quickstart',
    title: 'Quick Start Guide',
    category: 'Getting Started',
    excerpt: 'Get up and running with your first automation in under 5 minutes...',
  },
  {
    slug: 'browser-agents',
    title: 'Browser Agents',
    category: 'Core Concepts',
    excerpt: 'Learn how browser agents automate web interactions...',
  },
  {
    slug: 'credential-vault',
    title: 'Credential Vault',
    category: 'Security',
    excerpt: 'Securely store and manage API keys and credentials...',
  },
  {
    slug: 'ghl-connect',
    title: 'Connecting GHL',
    category: 'GHL Integration',
    excerpt: 'Connect your GoHighLevel account to enable automations...',
  },
  {
    slug: 'api-overview',
    title: 'API Overview',
    category: 'API Reference',
    excerpt: 'Complete reference for the REST API...',
  },
];

export const DocsSearch: React.FC<DocsSearchProps> = ({
  onNavigate,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search
  useEffect(() => {
    if (query.length > 0) {
      // Filter mock results - in production, this would be an API call
      const filtered = mockResults.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.excerpt.toLowerCase().includes(query.toLowerCase()) ||
          r.category.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
      setSelectedIndex(0);
    } else {
      setResults([]);
    }
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }

      if (!isOpen) return;

      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }

      // Enter to select
      if (e.key === 'Enter' && results[selectedIndex]) {
        onNavigate(results[selectedIndex].slug);
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onNavigate]);

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:border-slate-600 transition-colors ${className}`}
      >
        <Search className="w-4 h-4" />
        <span className="text-sm">Search documentation...</span>
        <div className="flex items-center gap-1 ml-auto text-xs">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
            <Command className="w-3 h-3 inline" />
          </kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">K</kbd>
        </div>
      </button>

      {/* Search modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
            >
              <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700/50">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search documentation..."
                    className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none"
                  />
                  <kbd className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                {results.length > 0 && (
                  <div className="max-h-80 overflow-y-auto">
                    {results.map((result, index) => (
                      <button
                        key={result.slug}
                        onClick={() => {
                          onNavigate(result.slug);
                          setIsOpen(false);
                          setQuery('');
                        }}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                          index === selectedIndex
                            ? 'bg-blue-500/10'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <FileText className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {result.title}
                            </span>
                            <span className="text-xs text-slate-500">
                              {result.category}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 truncate">
                            {result.excerpt}
                          </p>
                        </div>
                        {index === selectedIndex && (
                          <ArrowRight className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {query.length > 0 && results.length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-400">
                    <p>No results found for "{query}"</p>
                  </div>
                )}

                {/* Quick links when empty */}
                {query.length === 0 && (
                  <div className="px-4 py-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                      Popular
                    </p>
                    <div className="space-y-1">
                      {mockResults.slice(0, 3).map((result) => (
                        <button
                          key={result.slug}
                          onClick={() => {
                            onNavigate(result.slug);
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          {result.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default DocsSearch;
