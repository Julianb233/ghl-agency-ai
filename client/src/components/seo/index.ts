// SEO Components - Dynamic meta tags and structured data
// For AI SEO optimization and search engine visibility

// Core SEO component for page-level meta tags
export { SEOHead } from './SEOHead';
export type { SEOProps } from './SEOHead';

// JSON-LD structured data components
export {
  JsonLD,
  OrganizationSchema,
  WebPageSchema,
  ProductSchema,
  HowToSchema,
} from './JsonLD';
export type {
  JsonLDProps,
  OrganizationSchemaProps,
  WebPageSchemaProps,
  ProductSchemaProps,
  HowToSchemaProps,
} from './JsonLD';

// Breadcrumb navigation schema
export {
  BreadcrumbSchema,
  BREADCRUMB_PATHS,
  createBlogPostBreadcrumbs,
} from './BreadcrumbSchema';
export type { BreadcrumbItem, BreadcrumbSchemaProps } from './BreadcrumbSchema';

// FAQ schema for AI SEO
export { FAQSchema, BOTTLENECK_BOT_FAQS } from './FAQSchema';
export type { FAQItem, FAQSchemaProps } from './FAQSchema';
