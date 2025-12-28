/**
 * BlogCard - Blog post preview card with SEO-optimized structure
 */

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { BlogPostSummary } from "@shared/types/blog";

interface BlogCardProps {
  post: BlogPostSummary;
  onClick?: () => void;
  variant?: "default" | "featured" | "compact";
}

function BlogCardComponent({ post, onClick, variant = "default" }: BlogCardProps) {
  const formattedDate = new Date(post.publishDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (variant === "compact") {
    return (
      <article
        className="group cursor-pointer"
        onClick={onClick}
        role="article"
        aria-labelledby={`post-title-${post.id}`}
      >
        <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
          {post.featuredImage && (
            <div className="shrink-0 w-20 h-20 rounded-md overflow-hidden">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3
              id={`post-title-${post.id}`}
              className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors"
            >
              {post.title}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <time dateTime={post.publishDate}>{formattedDate}</time>
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (variant === "featured") {
    return (
      <article
        className="group cursor-pointer"
        onClick={onClick}
        role="article"
        aria-labelledby={`post-title-${post.id}`}
      >
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all">
          {post.featuredImage && (
            <div className="aspect-[2/1] overflow-hidden">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          )}
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {post.category && (
                <Badge
                  variant="default"
                  className="text-xs"
                  style={
                    post.category.color
                      ? { backgroundColor: `var(--notion-${post.category.color})` }
                      : undefined
                  }
                >
                  {post.category.name}
                </Badge>
              )}
              {post.tags.slice(0, 2).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>

            <h2
              id={`post-title-${post.id}`}
              className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2"
            >
              {post.title}
            </h2>

            <p className="text-muted-foreground mb-4 line-clamp-3">{post.excerpt}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {post.author && (
                  <>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.author.avatar} alt={post.author.name} />
                      <AvatarFallback>
                        {post.author.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{post.author.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <time dateTime={post.publishDate}>{formattedDate}</time>
                        <span aria-hidden="true">-</span>
                        <span>{post.readingTime} min read</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <span className="text-primary flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all">
                Read more
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </CardContent>
        </Card>
      </article>
    );
  }

  // Default variant
  return (
    <article
      className="group cursor-pointer"
      onClick={onClick}
      role="article"
      aria-labelledby={`post-title-${post.id}`}
    >
      <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
        {post.featuredImage && (
          <div className="aspect-video overflow-hidden">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-2 mb-3">
            {post.category && (
              <Badge variant="secondary" className="text-xs">
                {post.category.name}
              </Badge>
            )}
          </div>

          <h3
            id={`post-title-${post.id}`}
            className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2"
          >
            {post.title}
          </h3>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {post.excerpt}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={post.publishDate}>{formattedDate}</time>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{post.readingTime} min</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

export const BlogCard = memo(BlogCardComponent);
