/**
 * RelatedPosts - Display related blog posts
 */

import { memo } from "react";
import { BlogCard } from "./BlogCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { BlogPostSummary } from "@shared/types/blog";

interface RelatedPostsProps {
  posts: BlogPostSummary[];
  onPostClick?: (slug: string) => void;
  title?: string;
  isLoading?: boolean;
}

function RelatedPostsComponent({
  posts,
  onPostClick,
  title = "Related Articles",
  isLoading = false,
}: RelatedPostsProps) {
  if (isLoading) {
    return (
      <section aria-label={title}>
        <h2 className="text-2xl font-bold mb-6">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <section aria-label={title}>
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.slice(0, 3).map((post) => (
          <BlogCard
            key={post.id}
            post={post}
            onClick={() => onPostClick?.(post.slug)}
          />
        ))}
      </div>
    </section>
  );
}

export const RelatedPosts = memo(RelatedPostsComponent);
