# Google Search Console Complete Guide

## Overview

Google Search Console (GSC) is a free tool from Google that helps you monitor, maintain, and troubleshoot your site's presence in Google Search results.

## Setup & Verification

### Verification Methods

**1. HTML File Upload**
- Download verification file
- Upload to root directory
- Click verify

**2. HTML Tag**
```html
<meta name="google-site-verification" content="VERIFICATION_CODE" />
```

**3. DNS Record**
- Add TXT record to domain DNS
- Record value provided by Google

**4. Google Analytics**
- Must have edit access to GA
- GA tracking code must be on site

**5. Google Tag Manager**
- Must have publish access to GTM
- GTM container must be on site

### Property Types

**Domain Property** (Recommended)
- Covers all subdomains
- Covers http and https
- Requires DNS verification
- Example: `example.com`

**URL-prefix Property**
- Specific protocol and subdomain
- Example: `https://www.example.com`

## Performance Report

### Key Metrics

**Clicks**: Number of clicks from Google Search

**Impressions**: Number of times your site appeared in search

**CTR (Click-Through Rate)**: Clicks / Impressions

**Average Position**: Average ranking position

### Dimensions

**Queries**: What users searched for
```
Filter ideas:
- Brand vs non-brand
- Question queries (how, what, why)
- High impression, low CTR (opportunity)
```

**Pages**: Which pages got traffic
```
Analysis tips:
- Top performing pages
- Pages losing traffic
- Pages with high impressions but low clicks
```

**Countries**: Geographic performance

**Devices**: Desktop, mobile, tablet

**Search Appearance**: Rich results, AMP, etc.

**Dates**: Time-based analysis

### Performance Analysis

**Finding Quick Wins**
```
Filter: Position 8-20, Impressions > 100
Action: Optimize these pages to reach page 1
```

**CTR Optimization**
```
Filter: Position 1-5, CTR < 5%
Action: Improve title tags and meta descriptions
```

**Content Gaps**
```
Filter: Queries with low position
Action: Create or improve content for these queries
```

## URL Inspection Tool

### Features
- Check if URL is indexed
- See how Google renders page
- Request indexing
- View crawl information

### Using URL Inspection
1. Enter URL in search bar
2. Review indexing status
3. Check "Coverage" for issues
4. Check "Enhancements" for structured data
5. Click "Test Live URL" for current state
6. Request indexing if needed

### Common Status Messages

| Status | Meaning | Action |
|--------|---------|--------|
| URL is on Google | Indexed and can appear | None needed |
| URL is not on Google | Not indexed | Check why, request indexing |
| URL is on Google but has issues | Indexed but has problems | Fix issues |
| Excluded | Intentionally not indexed | Review if correct |

## Coverage Report (Indexing)

### Status Categories

**Valid**: Pages successfully indexed

**Valid with warnings**: Indexed but have issues

**Error**: Pages that couldn't be indexed

**Excluded**: Pages Google chose not to index

### Common Issues

**Errors**
- Server error (5xx)
- Redirect error
- Submitted URL blocked by robots.txt
- Submitted URL marked 'noindex'
- Soft 404

**Excluded (Often OK)**
- Duplicate, canonical selected
- Not selected, canonical specified
- Blocked by robots.txt
- Crawled, not indexed
- Discovered, not indexed

### Fixing Indexing Issues

**Redirect Chains**
```
Problem: A → B → C → D
Solution: A → D (direct)
```

**Duplicate Content**
```
Solution: Add canonical tag
<link rel="canonical" href="https://example.com/preferred-page" />
```

**Blocked Resources**
```
Check robots.txt isn't blocking:
- CSS files
- JavaScript
- Images needed for rendering
```

## Sitemaps

### Submitting Sitemaps
1. Go to Sitemaps section
2. Enter sitemap URL
3. Click Submit

### Sitemap Best Practices
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

### Sitemap Tips
- Keep under 50,000 URLs per sitemap
- File size under 50MB
- Use sitemap index for large sites
- Update lastmod when content changes
- Only include indexable URLs

## Core Web Vitals

### Metrics

**LCP (Largest Contentful Paint)**
- Target: < 2.5 seconds
- Measures: Loading performance

**FID (First Input Delay)** / **INP (Interaction to Next Paint)**
- Target: < 100ms / < 200ms
- Measures: Interactivity

**CLS (Cumulative Layout Shift)**
- Target: < 0.1
- Measures: Visual stability

### Improving Core Web Vitals

**LCP Optimization**
- Optimize images (WebP, lazy loading)
- Preload critical resources
- Use CDN
- Minimize render-blocking resources

**FID/INP Optimization**
- Minimize JavaScript execution
- Break up long tasks
- Use web workers
- Optimize event handlers

**CLS Optimization**
- Set image dimensions
- Reserve space for ads
- Avoid inserting content above existing
- Use transform for animations

## Mobile Usability

### Common Issues

**Text too small to read**
- Use base font size 16px
- Ensure readable without zooming

**Clickable elements too close**
- Tap targets at least 48x48px
- 8px spacing between targets

**Content wider than screen**
- Use responsive design
- Avoid horizontal scrolling
- Set viewport meta tag

**Viewport not set**
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

## Enhancements Reports

### Structured Data Types Monitored

**Breadcrumbs**
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [{
    "@type": "ListItem",
    "position": 1,
    "name": "Home",
    "item": "https://example.com"
  }]
}
```

**FAQ Page**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Question text?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Answer text"
    }
  }]
}
```

**Local Business**
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Business Name",
  "address": {...},
  "telephone": "+1234567890"
}
```

**Product**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "offers": {
    "@type": "Offer",
    "price": "99.99",
    "priceCurrency": "USD"
  }
}
```

## Links Report

### External Links
- Top linking sites
- Top linked pages
- Top linking text

### Internal Links
- Top internally linked pages
- Helps identify orphan pages

### Link Analysis Tips
1. Identify high-authority linking domains
2. Find pages with few internal links
3. Check anchor text distribution
4. Monitor for toxic backlinks

## Manual Actions

### Types of Manual Actions
- Unnatural links to your site
- Unnatural links from your site
- Thin content with little value
- Cloaking/sneaky redirects
- Pure spam
- User-generated spam
- Spammy structured markup

### Resolving Manual Actions
1. Understand the violation
2. Fix all instances
3. Document changes
4. Submit reconsideration request
5. Wait for review (days to weeks)

## Security Issues

### Types of Security Issues
- Hacked content
- Malware
- Social engineering
- Unusual downloads

### Resolution Steps
1. Identify compromised pages
2. Quarantine infected content
3. Clean up malicious code
4. Update software/passwords
5. Request review

## Search Console API

### Authentication
```javascript
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: 'service-account.json',
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
});

const searchconsole = google.searchconsole({ version: 'v1', auth });
```

### Query Performance Data
```javascript
const response = await searchconsole.searchanalytics.query({
  siteUrl: 'https://example.com',
  requestBody: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    dimensions: ['query', 'page'],
    rowLimit: 1000
  }
});
```

### List Sitemaps
```javascript
const sitemaps = await searchconsole.sitemaps.list({
  siteUrl: 'https://example.com'
});
```

## Best Practices

### Regular Monitoring
- Check performance weekly
- Review coverage monthly
- Monitor Core Web Vitals
- Track manual actions

### SEO Workflow with GSC
1. **Discover**: Find ranking opportunities
2. **Analyze**: Identify issues and patterns
3. **Fix**: Resolve technical issues
4. **Monitor**: Track improvements
5. **Report**: Document progress

### Key Reports Checklist
- [ ] Performance trending up
- [ ] No critical indexing errors
- [ ] Core Web Vitals passing
- [ ] Mobile usability OK
- [ ] No manual actions
- [ ] No security issues
- [ ] Sitemap submitted and healthy
- [ ] Structured data valid
