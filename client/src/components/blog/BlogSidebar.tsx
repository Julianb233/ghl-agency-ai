/**
 * BlogSidebar - Categories, tags, and recent posts sidebar
 */

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Tag, TrendingUp } from "lucide-react";
import type { BlogCategory, BlogTag, BlogPostSummary } from "@shared/types/blog";

interface BlogSidebarProps {
  categories?: BlogCategory[];
  tags?: BlogTag[];
  recentPosts?: BlogPostSummary[];
  selectedCategory?: string;
  selectedTag?: string;
  onCategoryClick?: (categorySlug: string) => void;
  onTagClick?: (tagSlug: string) => void;
  onPostClick?: (postSlug: string) => void;
  isLoading?: boolean;
}

function BlogSidebarComponent({
  categories = [],
  tags = [],
  recentPosts = [],
  selectedCategory,
  selectedTag,
  onCategoryClick,
  onTagClick,
  onPostClick,
  isLoading = false,
}: BlogSidebarProps) {
  if (isLoading) {
    return (
      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-16" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </aside>
    );
  }

  return (
    <aside className="space-y-6" role="complementary" aria-label="Blog sidebar">
      {/* Categories */}
      {categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="h-5 w-5" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <nav aria-label="Blog categories">
              <ul className="space-y-1">
                {categories.map((category) => (
                  <li key={category.id}>
                    <button
                      onClick={() => onCategoryClick?.(category.slug)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === category.slug
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      aria-current={selectedCategory === category.slug ? "page" : undefined}
                    >
                      {category.name}
                    </button>
                  </li>
                ))}
                {selectedCategory && (
                  <li>
                    <button
                      onClick={() => onCategoryClick?.("")}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Clear filter
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <nav aria-label="Blog tags">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTag === tag.slug ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => onTagClick?.(tag.slug)}
                    role="button"
                    aria-pressed={selectedTag === tag.slug}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
              {selectedTag && (
                <button
                  onClick={() => onTagClick?.("")}
                  className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear tag filter
                </button>
              )}
            </nav>
          </CardContent>
        </Card>
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Recent Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <nav aria-label="Recent blog posts">
              <ul className="space-y-4">
                {recentPosts.slice(0, 5).map((post, index) => (
                  <li key={post.id}>
                    {index > 0 && <Separator className="mb-4" />}
                    <button
                      onClick={() => onPostClick?.(post.slug)}
                      className="w-full text-left group"
                    >
                      <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h4>
                      <time
                        dateTime={post.publishDate}
                        className="text-xs text-muted-foreground mt-1 block"
                      >
                        {new Date(post.publishDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </CardContent>
        </Card>
      )}

      {/* Newsletter CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Stay Updated</h3>
          <p className="text-sm opacity-90 mb-4">
            Get the latest automation tips and GHL insights delivered to your inbox.
          </p>
          <a
            href="#newsletter"
            className="inline-block w-full text-center py-2 px-4 rounded-md bg-background text-foreground font-medium text-sm hover:bg-background/90 transition-colors"
          >
            Subscribe
          </a>
        </CardContent>
      </Card>
    </aside>
  );
}

export const BlogSidebar = memo(BlogSidebarComponent);
