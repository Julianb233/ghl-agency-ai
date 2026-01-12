/**
 * BlogPost Page
 * Displays a single blog post with full content from Notion
 */

import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  Clock,
  ChevronLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  NotionRenderer,
  ShareButtons,
  AuthorCard,
  RelatedPosts,
} from "@/components/blog";
import { SEOHead, BreadcrumbSchema, JsonLD } from "@/components/seo";

interface BlogPostProps {
  slug: string;
  onBack?: () => void;
  onPostClick?: (slug: string) => void;
}

export function BlogPost({ slug, onBack, onPostClick }: BlogPostProps) {
  // Fetch the post
  const { data: postData, isLoading, error } = trpc.blog.getPost.useQuery({
    slug,
  });

  // Fetch related posts (same category if available)
  const { data: relatedData, isLoading: relatedLoading } =
    trpc.blog.getPosts.useQuery(
      {
        limit: 4,
        category: postData?.post?.category?.slug,
      },
      {
        enabled: !!postData?.post?.category?.slug,
      }
    );

  const post = postData?.post;
  const relatedPosts = useMemo(
    () =>
      (relatedData?.posts || []).filter((p) => p.id !== post?.id).slice(0, 3),
    [relatedData?.posts, post?.id]
  );

  // Format date
  const formattedDate = useMemo(() => {
    if (!post?.publishDate) return "";
    return new Date(post.publishDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [post?.publishDate]);

  // Breadcrumbs
  const breadcrumbs = useMemo(
    () => [
      { name: "Home", url: "https://bottleneckbots.com" },
      { name: "Blog", url: "https://bottleneckbots.com/blog" },
      ...(post ? [{ name: post.title, url: `https://bottleneckbots.com/blog/${post.slug}` }] : []),
    ],
    [post]
  );

  // Article JSON-LD
  const articleSchema = useMemo(() => {
    if (!post) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.excerpt,
      image: post.featuredImage,
      datePublished: post.publishDate,
      dateModified: post.lastEditedTime,
      author: post.author
        ? {
            "@type": "Person",
            name: post.author.name,
          }
        : undefined,
      publisher: {
        "@type": "Organization",
        name: "Bottleneck Bot",
        logo: {
          "@type": "ImageObject",
          url: "https://bottleneckbots.com/logo.png",
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `https://bottleneckbots.com/blog/${post.slug}`,
      },
    };
  }, [post]);

  const handlePostClick = useCallback(
    (postSlug: string) => {
      onPostClick?.(postSlug);
    },
    [onPostClick]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <Skeleton className="h-8 w-20" />
          </div>
        </nav>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error or not found
  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Blog</span>
            </button>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={onBack}>Go to Blog</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${post.title} | Bottleneck Bot Blog`}
        description={post.excerpt}
        keywords={post.tags.map((tag) => tag.name)}
        ogImage={post.featuredImage}
        canonicalUrl={`https://bottleneckbots.com/blog/${post.slug}`}
        type="article"
        author={post.author?.name}
        publishedTime={post.publishDate}
        modifiedTime={post.lastEditedTime}
      />
      <BreadcrumbSchema items={breadcrumbs} />
      {articleSchema && <JsonLD data={articleSchema} />}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Blog</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold hidden sm:inline">Bottleneck Bot</span>
          </div>
          <ShareButtons
            title={post.title}
            url={`https://bottleneckbots.com/blog/${post.slug}`}
            description={post.excerpt}
            variant="compact"
          />
        </div>
      </nav>

      {/* Article Header */}
      <header className="relative">
        {post.featuredImage && (
          <div className="aspect-[3/1] w-full overflow-hidden">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto -mt-20 relative z-10 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Category and Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {post.category && (
                  <Badge variant="default">{post.category.name}</Badge>
                )}
                {post.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.name}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                {post.title}
              </h1>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={post.publishDate}>{formattedDate}</time>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{post.readingTime} min read</span>
                </div>
              </div>

              {/* Author */}
              {post.author && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={post.author.avatar} alt={post.author.name} />
                    <AvatarFallback>
                      {post.author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{post.author.name}</p>
                    <p className="text-sm text-muted-foreground">Author</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <article className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <NotionRenderer blocks={post.content} />
          </motion.div>

          <Separator className="my-12" />

          {/* Share Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
            <p className="text-muted-foreground">Found this helpful? Share it!</p>
            <ShareButtons
              title={post.title}
              url={`https://bottleneckbots.com/blog/${post.slug}`}
              description={post.excerpt}
            />
          </div>

          <Separator className="my-8" />

          {/* Author Card */}
          {post.author && (
            <div className="my-12">
              <AuthorCard
                author={post.author}
                bio="Expert in agency automation and GoHighLevel integrations. Helping agencies scale with AI-powered solutions."
              />
            </div>
          )}
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <RelatedPosts
              posts={relatedPosts}
              onPostClick={handlePostClick}
              isLoading={relatedLoading}
            />
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Automate Your Agency?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Put the insights from this article into action. Start automating your
            GHL agency today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={onBack}
              size="lg"
              variant="secondary"
              className="rounded-full px-8"
            >
              Start Your Free Trial
            </Button>
            <Button
              onClick={onBack}
              size="lg"
              variant="outline"
              className="rounded-full px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Read More Articles
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default BlogPost;
