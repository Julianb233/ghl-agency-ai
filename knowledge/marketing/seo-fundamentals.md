# SEO Fundamentals Guide

## Overview

Search Engine Optimization (SEO) is the practice of optimizing websites to rank higher in search engine results, driving organic traffic.

## SEO Pillars

### 1. Technical SEO
Foundation that allows search engines to crawl and index your site.

### 2. On-Page SEO
Optimizing individual pages for target keywords.

### 3. Off-Page SEO
Building authority through external signals (backlinks).

### 4. Content
Creating valuable content that matches search intent.

## Technical SEO

### Site Architecture

**URL Structure**
```
Good: example.com/category/product-name
Bad: example.com/p?id=12345&cat=67

Best practices:
- Use hyphens, not underscores
- Keep URLs short and descriptive
- Include target keyword
- Use lowercase letters
- Avoid parameters when possible
```

**Site Hierarchy**
```
Homepage
├── Category 1
│   ├── Subcategory 1.1
│   │   └── Product/Page
│   └── Subcategory 1.2
├── Category 2
└── Category 3

Goal: Max 3 clicks to any page
```

### Crawling & Indexing

**Robots.txt**
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/
Sitemap: https://example.com/sitemap.xml
```

**XML Sitemap**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

**Canonical Tags**
```html
<link rel="canonical" href="https://example.com/preferred-url" />
```

### Page Speed

**Core Web Vitals**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

**Speed Optimization**
```
Images:
- Compress images (WebP format)
- Lazy load below-fold images
- Specify dimensions

Code:
- Minify CSS/JS
- Remove unused code
- Defer non-critical JS

Server:
- Enable compression (gzip/brotli)
- Use CDN
- Enable caching
- Optimize server response
```

### Mobile Optimization

**Mobile-First Requirements**
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

**Checklist**
- Responsive design
- Touch-friendly buttons (48px min)
- Readable text (16px base font)
- No horizontal scrolling
- Fast mobile load times

### Structured Data

**Common Schema Types**
```json
// Organization
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Company Name",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "sameAs": [
    "https://facebook.com/company",
    "https://twitter.com/company"
  ]
}

// Local Business
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Business Name",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "City",
    "addressRegion": "State",
    "postalCode": "12345"
  },
  "telephone": "+1234567890",
  "openingHours": "Mo-Fr 09:00-17:00"
}

// Article
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "datePublished": "2024-01-15",
  "image": "https://example.com/image.jpg"
}

// Product
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "image": "https://example.com/product.jpg",
  "offers": {
    "@type": "Offer",
    "price": "99.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}

// FAQ
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Question here?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Answer here."
    }
  }]
}
```

## On-Page SEO

### Keyword Research

**Search Intent Types**
| Intent | Example | Content Type |
|--------|---------|--------------|
| Informational | "how to bake bread" | Blog, guide |
| Navigational | "facebook login" | Homepage |
| Commercial | "best running shoes" | Comparison, review |
| Transactional | "buy nike air max" | Product page |

**Keyword Selection Criteria**
- Search volume
- Keyword difficulty
- Business relevance
- Current rankings
- SERP features

### Title Tags

**Best Practices**
```
Format: Primary Keyword - Secondary Keyword | Brand
Length: 50-60 characters
Include: Target keyword near beginning

Examples:
✓ SEO Services for Small Business | Agency Name
✓ How to Start a Blog in 2024 (Complete Guide)
✗ Home | Welcome to Our Website
✗ keyword keyword keyword keyword
```

### Meta Descriptions

**Best Practices**
```
Length: 150-160 characters
Include: Target keyword, call-to-action
Purpose: Improve CTR from SERP

Example:
"Learn proven SEO strategies to increase organic traffic.
Our step-by-step guide covers keywords, content, and links.
Start ranking higher today!"
```

### Header Tags

**Structure**
```html
<h1>Main Page Title (one per page)</h1>

<h2>Major Section 1</h2>
  <h3>Subsection 1.1</h3>
  <h3>Subsection 1.2</h3>

<h2>Major Section 2</h2>
  <h3>Subsection 2.1</h3>
    <h4>Detail 2.1.1</h4>
```

**Guidelines**
- One H1 per page
- Include keywords naturally
- Maintain logical hierarchy
- Don't skip levels

### Content Optimization

**On-Page Checklist**
```
□ Target keyword in title tag
□ Target keyword in H1
□ Target keyword in first 100 words
□ Target keyword in URL
□ Related keywords throughout
□ Internal links to relevant pages
□ External links to authoritative sources
□ Image alt text with keywords
□ Sufficient content length
□ Unique, valuable content
```

**Content Length Guidelines**
| Content Type | Target Length |
|--------------|---------------|
| Blog post | 1,500-2,500 words |
| Pillar page | 3,000-5,000 words |
| Product page | 300-500 words |
| Service page | 500-1,000 words |
| Landing page | 500-1,500 words |

### Image Optimization

**File Naming**
```
Good: blue-running-shoes-nike.jpg
Bad: IMG_12345.jpg
```

**Alt Text**
```html
<img src="image.jpg" alt="Blue Nike running shoes on white background">
```

**Technical**
- Compress images
- Use WebP format
- Specify dimensions
- Lazy load below fold
- Use CDN

### Internal Linking

**Strategy**
```
Link from:
- High authority pages
- Topically relevant pages
- Newer content to older

Link to:
- Important pages (services, products)
- Related content
- Cornerstone content

Anchor text:
- Descriptive, keyword-rich
- Natural variation
- Avoid "click here"
```

## Off-Page SEO

### Backlink Building

**Quality Indicators**
- High domain authority
- Topical relevance
- Editorial placement
- Dofollow attribute
- Natural anchor text

**Link Building Tactics**
```
1. Content-based:
   - Create linkable assets
   - Original research/data
   - Infographics
   - Tools/calculators

2. Outreach-based:
   - Guest posting
   - Resource page links
   - Broken link building
   - HARO/journalist requests

3. Relationship-based:
   - Industry partnerships
   - Supplier/vendor links
   - Association memberships
   - Local business networks

4. Digital PR:
   - Press releases
   - Expert commentary
   - Data journalism
   - News hijacking
```

### Link Profile Health

**Natural Profile Characteristics**
- Diverse referring domains
- Mixed anchor text
- Gradual link growth
- Mix of dofollow/nofollow
- Industry-relevant links

**Anchor Text Distribution**
```
Branded: 40-50%
Naked URL: 20-30%
Generic: 10-15%
Keyword-rich: 5-10%
Long-tail: 5-10%
```

## Local SEO

### Google Business Profile

**Optimization Checklist**
```
□ Accurate NAP (Name, Address, Phone)
□ Correct business category
□ Complete business description
□ Business hours
□ Photos (interior, exterior, products)
□ Service area (if applicable)
□ Products/services listed
□ Q&A populated
□ Regular posts
□ Review responses
```

### Local Citations

**Key Directories**
- Google Business Profile
- Yelp
- Facebook
- Bing Places
- Apple Maps
- Industry-specific directories

**NAP Consistency**
```
Exactly match across all citations:
Name: "ABC Company LLC"
Address: "123 Main Street, Suite 100"
Phone: "(555) 123-4567"
```

### Local Content

**Optimization Tips**
- City/region in title tags
- Local schema markup
- Location pages for multiple areas
- Local keywords in content
- Embed Google Map

## Content Strategy

### Content Types for SEO

**Informational Content**
- How-to guides
- Ultimate guides
- Tutorials
- Explainer posts
- Industry news

**Commercial Content**
- Product comparisons
- Best of lists
- Reviews
- Buyer's guides

**Transactional Content**
- Product pages
- Service pages
- Landing pages
- Pricing pages

### Content Planning

**Topic Cluster Model**
```
Pillar Page: "Complete Guide to SEO"
├── Cluster: "Technical SEO Guide"
├── Cluster: "Keyword Research Tutorial"
├── Cluster: "Link Building Strategies"
├── Cluster: "On-Page SEO Checklist"
└── Cluster: "Local SEO Guide"

All clusters link to pillar and each other
```

### Content Refresh

**When to Update**
- Rankings dropping
- Information outdated
- Better competitors
- Traffic declining
- Annual/periodic

**How to Refresh**
1. Update statistics/dates
2. Add new sections
3. Improve readability
4. Add multimedia
5. Update internal links
6. Reoptimize for keywords

## SEO Metrics & KPIs

### Key Metrics

**Visibility**
- Organic traffic
- Keyword rankings
- Impressions
- Click-through rate

**Engagement**
- Bounce rate
- Time on page
- Pages per session
- Scroll depth

**Conversions**
- Goal completions
- Conversion rate
- Revenue from organic

**Technical**
- Core Web Vitals
- Index coverage
- Crawl errors
- Page load time

### Reporting Framework

**Monthly Report Elements**
```
Executive Summary:
- Key wins/losses
- Traffic change
- Ranking changes
- Conversions

Traffic Analysis:
- Organic sessions trend
- Landing page performance
- Device breakdown
- Geographic data

Keyword Performance:
- Rankings distribution
- New keywords
- Lost keywords
- Featured snippets

Technical Health:
- Core Web Vitals
- Index status
- Crawl errors
- Site speed

Recommendations:
- Priority actions
- Content opportunities
- Technical fixes
```

## Common SEO Mistakes

### Technical
- Blocking important pages in robots.txt
- Missing or incorrect canonical tags
- Slow page speed
- Not mobile-friendly
- Duplicate content issues

### On-Page
- Keyword stuffing
- Missing title tags/meta descriptions
- Thin content
- Poor internal linking
- Over-optimization

### Off-Page
- Buying links
- Low-quality link building
- Ignoring anchor text diversity
- Not monitoring link profile

### Strategy
- Not matching search intent
- Targeting wrong keywords
- Ignoring user experience
- Not tracking results
- Expecting quick results

## SEO Timeline Expectations

```
Month 1-3: Foundation
- Technical audit and fixes
- Keyword research
- Content strategy
- On-page optimization

Month 3-6: Building
- Content creation
- Link building starts
- Rankings begin moving
- Traffic starts growing

Month 6-12: Growth
- Consistent content
- Link acquisition
- Significant ranking improvements
- Notable traffic increases

Year 1+: Scale
- Compound growth
- Authority building
- Market leadership
- Sustainable results
```
