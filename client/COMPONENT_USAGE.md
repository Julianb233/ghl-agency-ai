# Component Usage Guide

Quick reference for using all integrated components.

---

## 🎨 3D Components

### Card3D
3D interactive card with mouse tracking.

```tsx
import { Card3D } from '@/components/3d';

<Card3D className="p-6">
  <h3>Your Content</h3>
  <p>Interactive 3D card with tilt effect</p>
</Card3D>
```

**Props:**
- `children`: ReactNode - Card content
- `className?`: string - Additional CSS classes

---

## 🎬 Animation Components

### FloatingElement
Gentle floating animation.

```tsx
import { FloatingElement } from '@/components/animations';

<FloatingElement delay={0.5} duration={3}>
  <div>Floating content</div>
</FloatingElement>
```

**Props:**
- `children`: ReactNode
- `delay?`: number - Animation delay (default: 0)
- `duration?`: number - Float duration (default: 3s)

### ScrollReveal
Reveal content on scroll.

```tsx
import { ScrollReveal } from '@/components/animations';

<ScrollReveal direction="up" delay={0.2}>
  <div>Revealed content</div>
</ScrollReveal>
```

**Props:**
- `children`: ReactNode
- `direction?`: 'up' | 'down' | 'left' | 'right'
- `delay?`: number - Stagger delay
- `once?`: boolean - Animate only once

---

## 📝 Blog Components

### BlogCard
Display blog post in card format.

```tsx
import { BlogCard } from '@/components/blog';

<BlogCard
  post={postData}
  variant="featured" // or "default"
  onClick={(slug) => navigate(`/blog/${slug}`)}
/>
```

### BlogHeader
Blog page header with search.

```tsx
import { BlogHeader } from '@/components/blog';

<BlogHeader
  title="Blog"
  subtitle="Latest insights and updates"
  onSearch={(query) => setSearchQuery(query)}
  searchQuery={searchQuery}
/>
```

### BlogSidebar
Sidebar with categories, tags, recent posts.

```tsx
import { BlogSidebar } from '@/components/blog';

<BlogSidebar
  categories={categories}
  tags={tags}
  recentPosts={recentPosts}
  selectedCategory={selectedCategory}
  selectedTag={selectedTag}
  onCategoryClick={(slug) => filterByCategory(slug)}
  onTagClick={(slug) => filterByTag(slug)}
  onPostClick={(slug) => navigate(`/blog/${slug}`)}
/>
```

### NotionRenderer
Render Notion blocks.

```tsx
import { NotionRenderer } from '@/components/blog';

<NotionRenderer blocks={notionBlocks} />
```

### ShareButtons
Social media sharing buttons.

```tsx
import { ShareButtons } from '@/components/blog';

<ShareButtons
  title="Post Title"
  url="https://example.com/post"
  description="Post description"
  variant="default" // or "compact"
/>
```

### AuthorCard
Author information card.

```tsx
import { AuthorCard } from '@/components/blog';

<AuthorCard
  author={{
    name: "John Doe",
    avatar: "https://...",
    role: "Content Writer"
  }}
  bio="Author bio text"
/>
```

### RelatedPosts
Show related blog posts.

```tsx
import { RelatedPosts } from '@/components/blog';

<RelatedPosts
  posts={relatedPosts}
  onPostClick={(slug) => navigate(`/blog/${slug}`)}
  isLoading={loading}
/>
```

---

## 🎯 Marketing Components

### FAQSection
FAQ section with schema markup.

```tsx
import { FAQSection } from '@/components/marketing';

<FAQSection
  faqs={[
    { question: "What is this?", answer: "This is..." },
    { question: "How does it work?", answer: "It works by..." }
  ]}
  title="Frequently Asked Questions"
  className="py-16"
/>
```

### HowItWorks
Step-by-step guide section.

```tsx
import { HowItWorks } from '@/components/marketing';

<HowItWorks
  steps={[
    {
      title: "Step 1",
      description: "Do this",
      icon: <IconComponent />
    },
    // ...
  ]}
  title="How It Works"
/>
```

### ConversationalBlock
AI SEO conversational content.

```tsx
import { ConversationalBlock } from '@/components/marketing';

<ConversationalBlock
  question="What makes this different?"
  answer="Our unique approach..."
  variant="primary"
/>
```

**Variants:**
- `primary` - Emerald green accent
- `secondary` - Blue accent
- `accent` - Purple accent

---

## 🔍 SEO Components

### SEOHead
Dynamic meta tags for pages.

```tsx
import { SEOHead } from '@/components/seo';

<SEOHead
  title="Page Title | Site Name"
  description="Page description for search engines"
  keywords={['keyword1', 'keyword2']}
  canonicalUrl="https://example.com/page"
  type="website" // or "article"
  ogImage="https://example.com/image.jpg"
  author="Author Name" // for articles
  publishedTime="2024-01-01" // for articles
  modifiedTime="2024-01-02" // for articles
/>
```

### BreadcrumbSchema
Breadcrumb navigation schema.

```tsx
import { BreadcrumbSchema } from '@/components/seo';

<BreadcrumbSchema
  items={[
    { name: "Home", url: "https://example.com" },
    { name: "Blog", url: "https://example.com/blog" },
    { name: "Post Title", url: "https://example.com/blog/post" }
  ]}
/>
```

### FAQSchema
FAQ structured data.

```tsx
import { FAQSchema } from '@/components/seo';

<FAQSchema
  faqs={[
    { question: "Question?", answer: "Answer." }
  ]}
/>
```

### JsonLD
Custom JSON-LD structured data.

```tsx
import { JsonLD } from '@/components/seo';

<JsonLD
  schema={{
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Company Name",
    // ...
  }}
/>
```

**Pre-built schemas:**
```tsx
import {
  OrganizationSchema,
  WebPageSchema,
  ProductSchema,
  HowToSchema
} from '@/components/seo';

<OrganizationSchema
  name="Company"
  url="https://example.com"
  logo="https://example.com/logo.png"
/>
```

---

## 📱 Voice Transcript Components

### VoiceTranscript
Full transcript viewer.

```tsx
import { VoiceTranscript } from '@/components/leads';

<VoiceTranscript
  data={{
    id: "transcript-1",
    callId: "call-123",
    leadName: "John Doe",
    phoneNumber: "+1 555-0100",
    duration: 120,
    transcript: [
      {
        id: "seg-1",
        speaker: "agent",
        text: "Hello!",
        timestamp: 0,
        duration: 2,
        confidence: 0.95
      }
    ],
    metadata: {
      callDate: new Date(),
      outcome: "Meeting Booked",
      sentiment: "positive",
      keywords: ["demo", "interested"]
    }
  }}
  autoPlay={false}
/>
```

### CallHistoryWithTranscript
Call history table with transcript modals.

```tsx
import { CallHistoryWithTranscript } from '@/components/leads';

<CallHistoryWithTranscript
  calls={[
    {
      id: "1",
      leadName: "John Doe",
      phoneNumber: "+1 555-0100",
      status: "completed",
      duration: 120,
      outcome: "Demo Scheduled",
      timestamp: new Date(),
      transcriptSegments: [...],
      sentiment: "positive"
    }
  ]}
/>
```

### VoiceCallsCard
Dashboard card for voice calls.

```tsx
import { VoiceCallsCard } from '@/components/dashboard';

<VoiceCallsCard
  recentCalls={recentCalls}
  totalCalls={24}
  completedCalls={20}
  averageDuration={195}
/>
```

---

## 🎨 Usage Examples

### Landing Page Integration
```tsx
import { Card3D } from '@/components/3d';
import { FloatingElement, ScrollReveal } from '@/components/animations';
import { FAQSection, HowItWorks } from '@/components/marketing';
import { SEOHead, FAQSchema } from '@/components/seo';

function LandingPage() {
  return (
    <>
      <SEOHead
        title="Product | Company"
        description="..."
        keywords={[...]}
      />
      <FAQSchema faqs={faqs} />

      <ScrollReveal direction="up">
        <Card3D>
          <h2>Feature</h2>
        </Card3D>
      </ScrollReveal>

      <HowItWorks steps={steps} />
      <FAQSection faqs={faqs} />
    </>
  );
}
```

### Blog Page Integration
```tsx
import { BlogCard, BlogHeader, BlogSidebar } from '@/components/blog';
import { SEOHead, BreadcrumbSchema } from '@/components/seo';

function BlogPage() {
  return (
    <>
      <SEOHead
        title="Blog | Company"
        description="..."
      />
      <BreadcrumbSchema items={breadcrumbs} />

      <BlogHeader
        title="Blog"
        onSearch={handleSearch}
      />

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {posts.map(post => (
            <BlogCard
              key={post.id}
              post={post}
              onClick={(slug) => navigate(`/blog/${slug}`)}
            />
          ))}
        </div>

        <BlogSidebar
          categories={categories}
          tags={tags}
          recentPosts={recentPosts}
          onCategoryClick={filterByCategory}
          onTagClick={filterByTag}
        />
      </div>
    </>
  );
}
```

---

## 🚀 Quick Tips

1. **SEO components** should be placed at the top of your page component
2. **Animation components** work best with `prefersReducedMotion` hook
3. **Blog components** expect tRPC blog API to be configured
4. **3D components** require Three.js (already included)
5. **Voice components** integrate with existing lead management system

---

## 📦 Import Patterns

```tsx
// Single component
import { BlogCard } from '@/components/blog';

// Multiple components
import {
  BlogCard,
  BlogHeader,
  BlogSidebar
} from '@/components/blog';

// Types
import type {
  VoiceTranscriptData,
  TranscriptSegment
} from '@/components/leads';

// All exports
import * as Blog from '@/components/blog';
```

---

## 🔧 Customization

All components accept `className` prop for Tailwind CSS customization:

```tsx
<BlogCard
  post={post}
  className="shadow-lg hover:shadow-xl"
/>
```

Components use CSS variables for theming (defined in `globals.css`):
- `--primary`
- `--secondary`
- `--accent`
- `--background`
- `--foreground`

---

For more details, check the individual component files or the main documentation.
