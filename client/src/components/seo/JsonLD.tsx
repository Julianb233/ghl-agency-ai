import { Helmet } from 'react-helmet-async';

export interface JsonLDProps {
  /** The structured data object (without @context) */
  data: Record<string, unknown>;
  /** Optional: Override the default @context */
  context?: string;
}

/**
 * JsonLD - Inject custom JSON-LD structured data
 * Use for custom schemas beyond SEOHead's built-in support
 */
export function JsonLD({ data, context = 'https://schema.org' }: JsonLDProps) {
  const structuredData = {
    '@context': context,
    ...data,
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}

// Pre-built schema types for common use cases

export interface OrganizationSchemaProps {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[]; // Social media URLs
  contactPoint?: {
    telephone?: string;
    contactType?: string;
    email?: string;
  };
}

/**
 * OrganizationSchema - Structured data for organization/company
 */
export function OrganizationSchema({
  name,
  url,
  logo,
  description,
  sameAs = [],
  contactPoint,
}: OrganizationSchemaProps) {
  const data: Record<string, unknown> = {
    '@type': 'Organization',
    name,
    url,
  };

  if (logo) data.logo = logo;
  if (description) data.description = description;
  if (sameAs.length > 0) data.sameAs = sameAs;
  if (contactPoint) {
    data.contactPoint = {
      '@type': 'ContactPoint',
      ...contactPoint,
    };
  }

  return <JsonLD data={data} />;
}

export interface WebPageSchemaProps {
  name: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}

/**
 * WebPageSchema - Structured data for a web page
 */
export function WebPageSchema({
  name,
  description,
  url,
  datePublished,
  dateModified,
}: WebPageSchemaProps) {
  const data: Record<string, unknown> = {
    '@type': 'WebPage',
    name,
    description,
    url,
  };

  if (datePublished) data.datePublished = datePublished;
  if (dateModified) data.dateModified = dateModified;

  return <JsonLD data={data} />;
}

export interface ProductSchemaProps {
  name: string;
  description: string;
  image?: string;
  offers?: {
    price: string | number;
    priceCurrency?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

/**
 * ProductSchema - Structured data for product/service
 */
export function ProductSchema({
  name,
  description,
  image,
  offers,
  aggregateRating,
}: ProductSchemaProps) {
  const data: Record<string, unknown> = {
    '@type': 'Product',
    name,
    description,
  };

  if (image) data.image = image;

  if (offers) {
    data.offers = {
      '@type': 'Offer',
      price: offers.price,
      priceCurrency: offers.priceCurrency || 'USD',
      availability: `https://schema.org/${offers.availability || 'InStock'}`,
    };
  }

  if (aggregateRating) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount,
    };
  }

  return <JsonLD data={data} />;
}

export interface HowToSchemaProps {
  name: string;
  description: string;
  steps: Array<{
    name: string;
    text: string;
    image?: string;
  }>;
  totalTime?: string; // ISO 8601 duration (e.g., "PT30M" for 30 minutes)
}

/**
 * HowToSchema - Structured data for step-by-step guides
 * Great for LLM crawlers looking for process explanations
 */
export function HowToSchema({
  name,
  description,
  steps,
  totalTime,
}: HowToSchemaProps) {
  const data: Record<string, unknown> = {
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
    })),
  };

  if (totalTime) data.totalTime = totalTime;

  return <JsonLD data={data} />;
}

export default JsonLD;
