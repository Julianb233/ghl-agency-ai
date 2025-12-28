/**
 * Blog Types - Shared types for Notion CMS blog integration
 */

export interface BlogAuthor {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

export interface BlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string;
  publishDate: string;
  category?: BlogCategory;
  tags: BlogTag[];
  author?: BlogAuthor;
  readingTime?: number;
}

export interface BlogPost extends BlogPostSummary {
  content: NotionBlock[];
  lastEditedTime: string;
  isPublished: boolean;
}

export interface NotionBlock {
  id: string;
  type: string;
  content: NotionBlockContent;
  children?: NotionBlock[];
}

export interface NotionBlockContent {
  richText?: NotionRichText[];
  url?: string;
  caption?: NotionRichText[];
  language?: string;
  checked?: boolean;
  expression?: string;
  icon?: NotionIcon;
  color?: string;
}

export interface NotionRichText {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plainText: string;
  href?: string | null;
}

export interface NotionIcon {
  type: 'emoji' | 'external' | 'file';
  emoji?: string;
  external?: { url: string };
  file?: { url: string };
}

export interface BlogListResponse {
  posts: BlogPostSummary[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface BlogFilters {
  category?: string;
  tag?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface NotionDatabaseConfig {
  databaseId: string;
  properties: {
    title: string;
    slug: string;
    published: string;
    publishDate: string;
    category: string;
    tags: string;
    excerpt: string;
    featuredImage: string;
    author: string;
  };
}

// Default property mappings for Notion database
export const DEFAULT_NOTION_PROPERTIES: NotionDatabaseConfig['properties'] = {
  title: 'Name',
  slug: 'Slug',
  published: 'Published',
  publishDate: 'Publish Date',
  category: 'Category',
  tags: 'Tags',
  excerpt: 'Excerpt',
  featuredImage: 'Featured Image',
  author: 'Author',
};
