/**
 * BlogHeader - Blog page header with search and filtering
 */

import { memo, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Rss } from "lucide-react";

interface BlogHeaderProps {
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

function BlogHeaderComponent({
  title = "Blog",
  subtitle = "Insights, tutorials, and updates from the Bottleneck Bot team",
  onSearch,
  searchQuery = "",
}: BlogHeaderProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearch = useCallback(() => {
    onSearch?.(localQuery);
  }, [localQuery, onSearch]);

  const handleClear = useCallback(() => {
    setLocalQuery("");
    onSearch?.("");
  }, [onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-background py-16 md:py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8">
            {subtitle}
          </p>

          {onSearch && (
            <div className="flex gap-2 max-w-md mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search articles..."
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 pr-10"
                  aria-label="Search blog posts"
                />
                {localQuery && (
                  <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button onClick={handleSearch} aria-label="Search">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          )}

          {/* RSS Feed link */}
          <div className="mt-6">
            <a
              href="/rss.xml"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              aria-label="Subscribe to RSS feed"
            >
              <Rss className="h-4 w-4" />
              Subscribe to RSS
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export const BlogHeader = memo(BlogHeaderComponent);
