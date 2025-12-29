import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  /** Page title - will be appended with site name */
  title: string;
  /** Meta description for search engines */
  description: string;
  /** Keywords for SEO (optional) */
  keywords?: string[];
  /** Open Graph image URL */
  ogImage?: string;
  /** Canonical URL for the page */
  canonicalUrl?: string;
  /** Set to true to prevent indexing */
  noIndex?: boolean;
  /** Page type for Open Graph */
  type?: 'website' | 'article' | 'product';
  /** Additional JSON-LD structured data */
  jsonLD?: Record<string, unknown>;
  /** Author name (for articles) */
  author?: string;
  /** Published date (for articles) */
  publishedTime?: string;
  /** Modified date (for articles) */
  modifiedTime?: string;
}

const SITE_NAME = 'Bottleneck Bot';
const DEFAULT_OG_IMAGE = '/og-image.png';
const SITE_URL = 'https://bottleneckbots.com';
const TWITTER_HANDLE = '@bottleneckbot';

/**
 * SEOHead - Dynamic meta tag management for each page
 * Handles title, description, Open Graph, Twitter Cards, and canonical URLs
 */
export function SEOHead({
  title,
  description,
  keywords = [],
  ogImage = DEFAULT_OG_IMAGE,
  canonicalUrl,
  noIndex = false,
  type = 'website',
  jsonLD,
  author,
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;
  const canonical = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');

  // Base structured data for the organization/website
  const baseJsonLD = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'AI-powered automation for GoHighLevel agencies',
    url: SITE_URL,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free trial available',
    },
    author: {
      '@type': 'Organization',
      name: 'AI Acrobatics',
      url: 'https://aiacrobatics.com',
    },
  };

  // Article-specific structured data
  const articleJsonLD = type === 'article' ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: fullOgImage,
    author: author ? {
      '@type': 'Person',
      name: author,
    } : undefined,
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
  } : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}

      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Article-specific Open Graph */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />

      {/* JSON-LD Structured Data - Base */}
      <script type="application/ld+json">
        {JSON.stringify(baseJsonLD)}
      </script>

      {/* JSON-LD Structured Data - Article */}
      {articleJsonLD && (
        <script type="application/ld+json">
          {JSON.stringify(articleJsonLD)}
        </script>
      )}

      {/* Custom JSON-LD */}
      {jsonLD && (
        <script type="application/ld+json">
          {JSON.stringify({ '@context': 'https://schema.org', ...jsonLD })}
        </script>
      )}
    </Helmet>
  );
}

export default SEOHead;
