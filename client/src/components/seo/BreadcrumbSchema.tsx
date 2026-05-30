import { Helmet } from 'react-helmet-async';

export interface BreadcrumbItem {
  /** Display name of the breadcrumb */
  name: string;
  /** URL of the breadcrumb item */
  url: string;
}

export interface BreadcrumbSchemaProps {
  /** Array of breadcrumb items in order */
  items: readonly BreadcrumbItem[] | BreadcrumbItem[];
}

const SITE_URL = 'https://bottleneckbots.com';

/**
 * BreadcrumbSchema - JSON-LD BreadcrumbList for navigation hierarchy
 * Helps search engines and LLMs understand site structure
 */
export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}

// Pre-built breadcrumb paths for common pages
export const BREADCRUMB_PATHS = {
  home: [{ name: 'Home', url: '/' }],
  features: [
    { name: 'Home', url: '/' },
    { name: 'Features', url: '/features' },
  ],
  pricing: [
    { name: 'Home', url: '/' },
    { name: 'Pricing', url: '/pricing' },
  ],
  blog: [
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
  ],
  privacy: [
    { name: 'Home', url: '/' },
    { name: 'Privacy Policy', url: '/privacy' },
  ],
  terms: [
    { name: 'Home', url: '/' },
    { name: 'Terms of Service', url: '/terms' },
  ],
} as const;

/**
 * Helper to create blog post breadcrumbs
 */
export function createBlogPostBreadcrumbs(
  postTitle: string,
  postSlug: string,
  category?: { name: string; slug: string }
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
  ];

  if (category) {
    crumbs.push({ name: category.name, url: `/blog/category/${category.slug}` });
  }

  crumbs.push({ name: postTitle, url: `/blog/${postSlug}` });

  return crumbs;
}

export default BreadcrumbSchema;
