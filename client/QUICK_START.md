# 🚀 Quick Start - New Components

Fast track to using the new components.

---

## 🎯 Most Common Use Cases

### 1. Add SEO to a New Page

```tsx
import { SEOHead, BreadcrumbSchema } from '@/components/seo';

function MyPage() {
  return (
    <>
      <SEOHead
        title="Page Title | Bottleneck Bot"
        description="Page description for search engines"
        keywords={['keyword1', 'keyword2']}
        canonicalUrl="https://bottleneckbot.com/my-page"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://bottleneckbot.com" },
          { name: "My Page", url: "https://bottleneckbot.com/my-page" }
        ]}
      />

      {/* Your page content */}
    </>
  );
}
```

### 2. Add Animations to Content

```tsx
import { ScrollReveal } from '@/components/animations';

function Feature() {
  return (
    <ScrollReveal direction="up">
      <div className="p-6 bg-white rounded-lg shadow">
        <h3>Feature Title</h3>
        <p>This will animate when scrolled into view</p>
      </div>
    </ScrollReveal>
  );
}
```

### 3. Create a FAQ Section

```tsx
import { FAQSection } from '@/components/marketing';

function MyPage() {
  const faqs = [
    {
      question: "How does this work?",
      answer: "It works by..."
    },
    {
      question: "What are the benefits?",
      answer: "The benefits include..."
    }
  ];

  return (
    <FAQSection
      faqs={faqs}
      title="Frequently Asked Questions"
    />
  );
}
```

### 4. Add a 3D Interactive Card

```tsx
import { Card3D } from '@/components/3d';

function PricingCard() {
  return (
    <Card3D className="p-8 bg-white rounded-xl">
      <h3 className="text-2xl font-bold">Pro Plan</h3>
      <p className="text-4xl font-bold mt-4">$99/mo</p>
      <ul className="mt-6 space-y-2">
        <li>✓ Feature 1</li>
        <li>✓ Feature 2</li>
      </ul>
    </Card3D>
  );
}
```

### 5. Display Blog Posts

```tsx
import { BlogCard } from '@/components/blog';
import { trpc } from '@/lib/trpc';

function BlogList() {
  const { data } = trpc.blog.getPosts.useQuery({ limit: 10 });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {data?.posts.map(post => (
        <BlogCard
          key={post.id}
          post={post}
          onClick={(slug) => navigate(`/blog/${slug}`)}
        />
      ))}
    </div>
  );
}
```

---

## 🎨 Copy-Paste Templates

### Landing Page Section

```tsx
import { ScrollReveal, Card3D } from '@/components';
import { FAQSection, HowItWorks } from '@/components/marketing';

function FeaturesSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h2 className="text-4xl font-bold text-center mb-12">
            Our Features
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8">
          <ScrollReveal direction="up" delay={0}>
            <Card3D className="p-6">
              <h3 className="text-xl font-bold mb-4">Feature 1</h3>
              <p>Description here</p>
            </Card3D>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.1}>
            <Card3D className="p-6">
              <h3 className="text-xl font-bold mb-4">Feature 2</h3>
              <p>Description here</p>
            </Card3D>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <Card3D className="p-6">
              <h3 className="text-xl font-bold mb-4">Feature 3</h3>
              <p>Description here</p>
            </Card3D>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
```

### Blog Post Page Template

```tsx
import { NotionRenderer, ShareButtons, AuthorCard } from '@/components/blog';
import { SEOHead, BreadcrumbSchema, JsonLD } from '@/components/seo';
import { trpc } from '@/lib/trpc';

function BlogPost({ slug }: { slug: string }) {
  const { data } = trpc.blog.getPost.useQuery({ slug });
  const post = data?.post;

  if (!post) return <div>Loading...</div>;

  return (
    <>
      <SEOHead
        title={`${post.title} | Blog`}
        description={post.excerpt}
        type="article"
        publishedTime={post.publishDate}
        author={post.author?.name}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
          { name: post.title, url: `/blog/${slug}` }
        ]}
      />
      <JsonLD
        schema={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          author: { "@type": "Person", name: post.author?.name }
        }}
      />

      <article className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-6">{post.title}</h1>

        <NotionRenderer blocks={post.content} />

        <div className="mt-12">
          <ShareButtons
            title={post.title}
            url={`https://example.com/blog/${slug}`}
            description={post.excerpt}
          />
        </div>

        {post.author && (
          <AuthorCard
            author={post.author}
            bio="Expert in..."
          />
        )}
      </article>
    </>
  );
}
```

---

## ⚡ Import Shortcuts

```tsx
// SEO (most common)
import { SEOHead, BreadcrumbSchema } from '@/components/seo';

// Animations
import { ScrollReveal, FloatingElement } from '@/components/animations';

// Marketing
import { FAQSection, HowItWorks } from '@/components/marketing';

// Blog
import { BlogCard, BlogHeader, NotionRenderer } from '@/components/blog';

// 3D
import { Card3D } from '@/components/3d';

// Voice
import { VoiceTranscript, VoiceCallsCard } from '@/components/leads';
```

---

## 🎯 Navigation Patterns

### Add Blog Link to Header

In your navigation component:
```tsx
<nav>
  <a href="/blog">Blog</a>
  {/* other links */}
</nav>
```

In App.tsx (already done):
```tsx
const [currentView, setCurrentView] = useState<ViewState>('LANDING');

// Blog button in header
onClick={() => setCurrentView('BLOG')}
```

### Add Voice Demo Link

In dashboard or features:
```tsx
<Button onClick={() => setCurrentView('VOICE_DEMO')}>
  View Voice Transcripts Demo
</Button>
```

---

## 🔍 Common Patterns

### With Reduced Motion

```tsx
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ScrollReveal } from '@/components/animations';

function Component() {
  const prefersReducedMotion = useReducedMotion();

  return prefersReducedMotion ? (
    <div>{/* Static content */}</div>
  ) : (
    <ScrollReveal>
      <div>{/* Animated content */}</div>
    </ScrollReveal>
  );
}
```

### With Loading States

```tsx
import { BlogCard } from '@/components/blog';
import { Skeleton } from '@/components/ui/skeleton';

function BlogList() {
  const { data, isLoading } = trpc.blog.getPosts.useQuery();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="grid gap-6">
      {data?.posts.map(post => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

---

## 🎨 Styling Tips

All components use Tailwind CSS and accept `className`:

```tsx
// Custom styling
<BlogCard
  post={post}
  className="hover:shadow-2xl transition-shadow"
/>

// Override defaults
<FAQSection
  faqs={faqs}
  className="bg-gray-50 rounded-3xl p-12"
/>

// Responsive design
<Card3D className="p-4 md:p-8 lg:p-12">
  Content
</Card3D>
```

---

## 🚀 Ready to Use

All components are:
- ✅ Production-ready
- ✅ TypeScript typed
- ✅ Fully documented
- ✅ SEO optimized
- ✅ Accessible

Just import and use! No additional setup needed.

---

## 📚 More Details

- Full usage guide: `COMPONENT_USAGE.md`
- Integration status: `INTEGRATION_COMPLETE.md`
- Summary: `INTEGRATION_SUMMARY.md`

---

*Happy coding!* 🎉
