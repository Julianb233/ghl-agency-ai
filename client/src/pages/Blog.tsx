/**
 * Blog Listing Page
 * Displays blog posts from Notion CMS with filtering and pagination
 */

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  BlogCard,
  BlogHeader,
  BlogSidebar,
} from "@/components/blog";
import { SEOHead, BreadcrumbSchema } from "@/components/seo";

interface BlogProps {
  onBack?: () => void;
  onPostClick?: (slug: string) => void;
}

export function Blog({ onBack, onPostClick }: BlogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cursor, setCursor] = useState<string | undefined>();

  // Fetch blog posts
  const { data: postsData, isLoading: postsLoading } = trpc.blog.getPosts.useQuery({
    limit: 12,
    cursor,
    category: selectedCategory || undefined,
    tag: selectedTag || undefined,
    search: searchQuery || undefined,
  });

  // Fetch categories and tags
  const { data: categoriesData, isLoading: categoriesLoading } =
    trpc.blog.getCategories.useQuery();
  const { data: tagsData, isLoading: tagsLoading } = trpc.blog.getTags.useQuery();

  const posts = postsData?.posts || [];
  const hasMore = postsData?.hasMore || false;
  const nextCursor = postsData?.nextCursor;

  const categories = categoriesData?.categories || [];
  const tags = tagsData?.tags || [];

  // Handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCursor(undefined);
  }, []);

  const handleCategoryClick = useCallback((categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setCursor(undefined);
  }, []);

  const handleTagClick = useCallback((tagSlug: string) => {
    setSelectedTag(tagSlug);
    setCursor(undefined);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      setCursor(nextCursor);
    }
  }, [nextCursor]);

  const handlePostClick = useCallback(
    (slug: string) => {
      onPostClick?.(slug);
    },
    [onPostClick]
  );

  // Separate featured post (first post) from rest
  const [featuredPost, ...remainingPosts] = posts;

  // Breadcrumb data
  const breadcrumbs = useMemo(
    () => [
      { name: "Home", url: "https://bottleneckbots.com" },
      { name: "Blog", url: "https://bottleneckbots.com/blog" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Blog | Bottleneck Bot - GHL Automation Insights"
        description="Discover the latest insights, tutorials, and best practices for automating your GoHighLevel agency with AI. Learn from experts and grow your business."
        keywords={[
          "GoHighLevel blog",
          "GHL automation tips",
          "agency automation",
          "AI for agencies",
          "CRM automation",
          "lead follow-up automation",
        ]}
        canonicalUrl="https://bottleneckbots.com/blog"
        type="website"
      />
      <BreadcrumbSchema items={breadcrumbs} />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Bottleneck Bot</span>
          </div>
          <Button
            onClick={onBack}
            variant="outline"
            className="rounded-full px-6"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Header */}
      <BlogHeader
        title="Blog"
        subtitle="Insights, tutorials, and updates from the Bottleneck Bot team"
        onSearch={handleSearch}
        searchQuery={searchQuery}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Posts Grid */}
          <div className="lg:col-span-3">
            {postsLoading ? (
              // Loading skeleton
              <div className="space-y-8">
                <Skeleton className="h-96 w-full rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="aspect-video w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : posts.length === 0 ? (
              // No posts found
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <p className="text-lg text-muted-foreground mb-4">
                  No blog posts found.
                </p>
                {(selectedCategory || selectedTag || searchQuery) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory("");
                      setSelectedTag("");
                      setSearchQuery("");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                {/* Featured Post */}
                {featuredPost && !cursor && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                  >
                    <BlogCard
                      post={featuredPost}
                      variant="featured"
                      onClick={() => handlePostClick(featuredPost.slug)}
                    />
                  </motion.div>
                )}

                {/* Posts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(cursor ? posts : remainingPosts).map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <BlogCard
                        post={post}
                        onClick={() => handlePostClick(post.slug)}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {hasMore && (
                  <div className="flex justify-center mt-10">
                    <Button onClick={handleLoadMore} variant="outline" size="lg">
                      Load More Posts
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BlogSidebar
                categories={categories}
                tags={tags}
                recentPosts={posts.slice(0, 5)}
                selectedCategory={selectedCategory}
                selectedTag={selectedTag}
                onCategoryClick={handleCategoryClick}
                onTagClick={handleTagClick}
                onPostClick={handlePostClick}
                isLoading={categoriesLoading || tagsLoading}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer CTA */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Automate Your Agency?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of GHL agencies using Bottleneck Bot to save time,
            close more deals, and scale effortlessly.
          </p>
          <Button
            onClick={onBack}
            size="lg"
            variant="secondary"
            className="rounded-full px-8"
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>
    </div>
  );
}

export default Blog;
