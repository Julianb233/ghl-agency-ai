/**
 * Notion Blog Service
 * Fetches blog posts from Notion CMS with caching and transformation
 */

import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type {
  BlogPost,
  BlogPostSummary,
  BlogCategory,
  BlogTag,
  BlogAuthor,
  NotionBlock,
  NotionBlockContent,
  NotionRichText,
  NotionIcon,
  BlogListResponse,
  BlogFilters,
  NotionDatabaseConfig,
  DEFAULT_NOTION_PROPERTIES,
} from "../../shared/types/blog";

// Notion client singleton
let notionClient: Client | null = null;

function getNotionClient(): Client {
  if (!notionClient) {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error("NOTION_API_KEY environment variable is not set");
    }
    notionClient = new Client({ auth: apiKey });
  }
  return notionClient;
}

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export class NotionBlogService {
  private databaseId: string;
  private properties: NotionDatabaseConfig["properties"];

  constructor(
    databaseId?: string,
    properties?: Partial<NotionDatabaseConfig["properties"]>
  ) {
    this.databaseId = databaseId || process.env.NOTION_BLOG_DATABASE_ID || "";
    this.properties = {
      title: "Name",
      slug: "Slug",
      published: "Published",
      publishDate: "Publish Date",
      category: "Category",
      tags: "Tags",
      excerpt: "Excerpt",
      featuredImage: "Featured Image",
      author: "Author",
      ...properties,
    };
  }

  /**
   * Fetch paginated list of published blog posts
   */
  async getPosts(filters?: BlogFilters): Promise<BlogListResponse> {
    const cacheKey = `posts:${JSON.stringify(filters || {})}`;
    const cached = getCached<BlogListResponse>(cacheKey);
    if (cached) {
      console.log("[NotionBlogService] Returning cached posts");
      return cached;
    }

    console.log("[NotionBlogService] Fetching posts from Notion");
    const notion = getNotionClient();

    if (!this.databaseId) {
      throw new Error("Blog database ID is not configured");
    }

    // Build filter conditions
    const filterConditions: any[] = [
      {
        property: this.properties.published,
        checkbox: { equals: true },
      },
    ];

    if (filters?.category) {
      filterConditions.push({
        property: this.properties.category,
        select: { equals: filters.category },
      });
    }

    if (filters?.tag) {
      filterConditions.push({
        property: this.properties.tags,
        multi_select: { contains: filters.tag },
      });
    }

    try {
      const response = await (notion.databases as any).query({
        database_id: this.databaseId,
        filter:
          filterConditions.length > 1
            ? { and: filterConditions }
            : filterConditions[0],
        sorts: [
          {
            property: this.properties.publishDate,
            direction: "descending",
          },
        ],
        page_size: filters?.limit || 10,
        start_cursor: filters?.cursor,
      });

      const posts: BlogPostSummary[] = [];

      for (const page of response.results) {
        if (page.object === "page" && "properties" in page) {
          const summary = await this.transformToSummary(
            page as PageObjectResponse
          );
          if (summary) {
            // Apply search filter client-side if provided
            if (
              filters?.search &&
              !summary.title
                .toLowerCase()
                .includes(filters.search.toLowerCase()) &&
              !summary.excerpt
                .toLowerCase()
                .includes(filters.search.toLowerCase())
            ) {
              continue;
            }
            posts.push(summary);
          }
        }
      }

      const result: BlogListResponse = {
        posts,
        hasMore: response.has_more,
        nextCursor: response.next_cursor || undefined,
      };

      setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("[NotionBlogService] Failed to fetch posts:", error);
      throw new Error("Failed to fetch blog posts");
    }
  }

  /**
   * Fetch a single blog post by slug
   */
  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const cacheKey = `post:${slug}`;
    const cached = getCached<BlogPost>(cacheKey);
    if (cached) {
      console.log("[NotionBlogService] Returning cached post:", slug);
      return cached;
    }

    console.log("[NotionBlogService] Fetching post by slug:", slug);
    const notion = getNotionClient();

    if (!this.databaseId) {
      throw new Error("Blog database ID is not configured");
    }

    try {
      const response = await (notion.databases as any).query({
        database_id: this.databaseId,
        filter: {
          and: [
            {
              property: this.properties.slug,
              rich_text: { equals: slug },
            },
            {
              property: this.properties.published,
              checkbox: { equals: true },
            },
          ],
        },
        page_size: 1,
      });

      if (response.results.length === 0) {
        return null;
      }

      const page = response.results[0] as PageObjectResponse;
      const post = await this.transformToPost(page);

      if (post) {
        setCache(cacheKey, post);
      }

      return post;
    } catch (error) {
      console.error("[NotionBlogService] Failed to fetch post:", error);
      throw new Error("Failed to fetch blog post");
    }
  }

  /**
   * Fetch all categories
   */
  async getCategories(): Promise<BlogCategory[]> {
    const cacheKey = "categories";
    const cached = getCached<BlogCategory[]>(cacheKey);
    if (cached) return cached;

    console.log("[NotionBlogService] Fetching categories");
    const notion = getNotionClient();

    if (!this.databaseId) {
      throw new Error("Blog database ID is not configured");
    }

    try {
      const database = await notion.databases.retrieve({
        database_id: this.databaseId,
      });

      const categoryProp = (database as any).properties[this.properties.category];
      if (categoryProp?.type !== "select") {
        return [];
      }

      const categories: BlogCategory[] = (categoryProp.select?.options || []).map(
        (option: any) => ({
          id: option.id,
          name: option.name,
          slug: this.slugify(option.name),
          color: option.color,
        })
      );

      setCache(cacheKey, categories);
      return categories;
    } catch (error) {
      console.error("[NotionBlogService] Failed to fetch categories:", error);
      return [];
    }
  }

  /**
   * Fetch all tags
   */
  async getTags(): Promise<BlogTag[]> {
    const cacheKey = "tags";
    const cached = getCached<BlogTag[]>(cacheKey);
    if (cached) return cached;

    console.log("[NotionBlogService] Fetching tags");
    const notion = getNotionClient();

    if (!this.databaseId) {
      throw new Error("Blog database ID is not configured");
    }

    try {
      const database = await notion.databases.retrieve({
        database_id: this.databaseId,
      });

      const tagsProp = (database as any).properties[this.properties.tags];
      if (tagsProp?.type !== "multi_select") {
        return [];
      }

      const tags: BlogTag[] = (tagsProp.multi_select?.options || []).map(
        (option: any) => ({
          id: option.id,
          name: option.name,
          slug: this.slugify(option.name),
          color: option.color,
        })
      );

      setCache(cacheKey, tags);
      return tags;
    } catch (error) {
      console.error("[NotionBlogService] Failed to fetch tags:", error);
      return [];
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    cache.clear();
    console.log("[NotionBlogService] Cache cleared");
  }

  /**
   * Transform Notion page to BlogPostSummary
   */
  private async transformToSummary(
    page: PageObjectResponse
  ): Promise<BlogPostSummary | null> {
    try {
      const props = page.properties;

      // Extract title
      const titleProp = props[this.properties.title];
      const title = this.extractText(titleProp);
      if (!title) return null;

      // Extract slug
      const slugProp = props[this.properties.slug];
      const slug = this.extractText(slugProp) || this.slugify(title);

      // Extract excerpt
      const excerptProp = props[this.properties.excerpt];
      const excerpt = this.extractText(excerptProp) || "";

      // Extract publish date
      const dateProp = props[this.properties.publishDate];
      const publishDate =
        dateProp?.type === "date" && dateProp.date?.start
          ? dateProp.date.start
          : new Date().toISOString();

      // Extract category
      const categoryProp = props[this.properties.category];
      let category: BlogCategory | undefined;
      if (categoryProp?.type === "select" && categoryProp.select) {
        category = {
          id: categoryProp.select.id,
          name: categoryProp.select.name,
          slug: this.slugify(categoryProp.select.name),
          color: categoryProp.select.color,
        };
      }

      // Extract tags
      const tagsProp = props[this.properties.tags];
      const tags: BlogTag[] = [];
      if (tagsProp?.type === "multi_select") {
        for (const tag of tagsProp.multi_select) {
          tags.push({
            id: tag.id,
            name: tag.name,
            slug: this.slugify(tag.name),
            color: tag.color,
          });
        }
      }

      // Extract featured image
      const imageProp = props[this.properties.featuredImage];
      let featuredImage: string | undefined;
      if (imageProp?.type === "files" && imageProp.files.length > 0) {
        const file = imageProp.files[0];
        if (file.type === "file") {
          featuredImage = file.file.url;
        } else if (file.type === "external") {
          featuredImage = file.external.url;
        }
      }

      // Extract author
      const authorProp = props[this.properties.author];
      let author: BlogAuthor | undefined;
      if (authorProp?.type === "people" && authorProp.people.length > 0) {
        const person = authorProp.people[0];
        author = {
          id: person.id,
          name: (person as any).name || "Anonymous",
          avatar: (person as any).avatar_url || undefined,
        };
      }

      // Calculate reading time (estimate based on excerpt length, will be more accurate with full content)
      const readingTime = Math.max(1, Math.ceil(excerpt.split(" ").length / 200));

      return {
        id: page.id,
        title,
        slug,
        excerpt,
        featuredImage,
        publishDate,
        category,
        tags,
        author,
        readingTime,
      };
    } catch (error) {
      console.error("[NotionBlogService] Failed to transform summary:", error);
      return null;
    }
  }

  /**
   * Transform Notion page to full BlogPost with content
   */
  private async transformToPost(
    page: PageObjectResponse
  ): Promise<BlogPost | null> {
    const summary = await this.transformToSummary(page);
    if (!summary) return null;

    const notion = getNotionClient();

    try {
      // Fetch all blocks (content) for the page
      const blocks = await this.fetchAllBlocks(page.id);
      const content = await this.transformBlocks(blocks);

      // Calculate accurate reading time based on content
      const wordCount = this.countWords(content);
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      return {
        ...summary,
        readingTime,
        content,
        lastEditedTime: page.last_edited_time,
        isPublished: true,
      };
    } catch (error) {
      console.error("[NotionBlogService] Failed to transform post:", error);
      return null;
    }
  }

  /**
   * Fetch all blocks for a page (handles pagination)
   */
  private async fetchAllBlocks(pageId: string): Promise<BlockObjectResponse[]> {
    const notion = getNotionClient();
    const blocks: BlockObjectResponse[] = [];
    let cursor: string | undefined;

    do {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: cursor,
      });

      for (const block of response.results) {
        if ("type" in block) {
          blocks.push(block as BlockObjectResponse);
        }
      }

      cursor = response.has_more ? response.next_cursor || undefined : undefined;
    } while (cursor);

    return blocks;
  }

  /**
   * Transform Notion blocks to our NotionBlock format
   */
  private async transformBlocks(
    blocks: BlockObjectResponse[]
  ): Promise<NotionBlock[]> {
    const result: NotionBlock[] = [];

    for (const block of blocks) {
      const transformed = await this.transformBlock(block);
      if (transformed) {
        result.push(transformed);
      }
    }

    return result;
  }

  /**
   * Transform a single Notion block
   */
  private async transformBlock(
    block: BlockObjectResponse
  ): Promise<NotionBlock | null> {
    const content: NotionBlockContent = {};

    switch (block.type) {
      case "paragraph":
        content.richText = this.transformRichText(block.paragraph.rich_text);
        break;

      case "heading_1":
        content.richText = this.transformRichText(block.heading_1.rich_text);
        break;

      case "heading_2":
        content.richText = this.transformRichText(block.heading_2.rich_text);
        break;

      case "heading_3":
        content.richText = this.transformRichText(block.heading_3.rich_text);
        break;

      case "bulleted_list_item":
        content.richText = this.transformRichText(
          block.bulleted_list_item.rich_text
        );
        break;

      case "numbered_list_item":
        content.richText = this.transformRichText(
          block.numbered_list_item.rich_text
        );
        break;

      case "to_do":
        content.richText = this.transformRichText(block.to_do.rich_text);
        content.checked = block.to_do.checked;
        break;

      case "toggle":
        content.richText = this.transformRichText(block.toggle.rich_text);
        break;

      case "quote":
        content.richText = this.transformRichText(block.quote.rich_text);
        break;

      case "callout":
        content.richText = this.transformRichText(block.callout.rich_text);
        if (block.callout.icon) {
          content.icon = this.transformIcon(block.callout.icon);
        }
        break;

      case "code":
        content.richText = this.transformRichText(block.code.rich_text);
        content.language = block.code.language;
        content.caption = this.transformRichText(block.code.caption);
        break;

      case "image":
        if (block.image.type === "file") {
          content.url = block.image.file.url;
        } else if (block.image.type === "external") {
          content.url = block.image.external.url;
        }
        content.caption = this.transformRichText(block.image.caption);
        break;

      case "video":
        if (block.video.type === "file") {
          content.url = block.video.file.url;
        } else if (block.video.type === "external") {
          content.url = block.video.external.url;
        }
        content.caption = this.transformRichText(block.video.caption);
        break;

      case "embed":
        content.url = block.embed.url;
        content.caption = this.transformRichText(block.embed.caption);
        break;

      case "bookmark":
        content.url = block.bookmark.url;
        content.caption = this.transformRichText(block.bookmark.caption);
        break;

      case "equation":
        content.expression = block.equation.expression;
        break;

      case "divider":
        // No additional content needed
        break;

      case "table_of_contents":
        // No additional content needed
        break;

      default:
        // Skip unsupported block types
        return null;
    }

    // Fetch children if the block has them
    let children: NotionBlock[] | undefined;
    if (block.has_children) {
      const childBlocks = await this.fetchAllBlocks(block.id);
      children = await this.transformBlocks(childBlocks);
    }

    return {
      id: block.id,
      type: block.type,
      content,
      children: children?.length ? children : undefined,
    };
  }

  /**
   * Transform Notion rich text to our format
   */
  private transformRichText(
    richText: RichTextItemResponse[]
  ): NotionRichText[] {
    return richText.map((item) => ({
      type: item.type as "text" | "mention" | "equation",
      text:
        item.type === "text"
          ? {
              content: item.text.content,
              link: item.text.link,
            }
          : undefined,
      annotations: item.annotations
        ? {
            bold: item.annotations.bold,
            italic: item.annotations.italic,
            strikethrough: item.annotations.strikethrough,
            underline: item.annotations.underline,
            code: item.annotations.code,
            color: item.annotations.color,
          }
        : undefined,
      plainText: item.plain_text,
      href: item.href,
    }));
  }

  /**
   * Transform Notion icon
   */
  private transformIcon(icon: any): NotionIcon {
    if (icon.type === "emoji") {
      return { type: "emoji", emoji: icon.emoji };
    } else if (icon.type === "external") {
      return { type: "external", external: { url: icon.external.url } };
    } else if (icon.type === "file") {
      return { type: "file", file: { url: icon.file.url } };
    }
    return { type: "emoji", emoji: "📝" };
  }

  /**
   * Extract plain text from a Notion property
   */
  private extractText(prop: any): string {
    if (!prop) return "";

    switch (prop.type) {
      case "title":
        return prop.title.map((t: any) => t.plain_text).join("");
      case "rich_text":
        return prop.rich_text.map((t: any) => t.plain_text).join("");
      default:
        return "";
    }
  }

  /**
   * Generate a URL-friendly slug from text
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Count words in NotionBlock array for reading time calculation
   */
  private countWords(blocks: NotionBlock[]): number {
    let count = 0;

    for (const block of blocks) {
      if (block.content.richText) {
        for (const text of block.content.richText) {
          count += text.plainText.split(/\s+/).length;
        }
      }
      if (block.children) {
        count += this.countWords(block.children);
      }
    }

    return count;
  }
}

// Export singleton instance
export const notionBlogService = new NotionBlogService();
