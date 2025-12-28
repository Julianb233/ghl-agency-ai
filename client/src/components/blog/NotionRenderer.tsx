/**
 * NotionRenderer - Renders Notion blocks as React components
 * Handles all common Notion block types with proper styling and accessibility
 */

import { memo, Fragment } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, AlertCircle, Info, Lightbulb, AlertTriangle } from "lucide-react";
import type { NotionBlock, NotionRichText } from "@shared/types/blog";

interface NotionRendererProps {
  blocks: NotionBlock[];
  className?: string;
}

interface RichTextProps {
  richText: NotionRichText[];
}

/**
 * Render rich text with formatting
 */
function RichText({ richText }: RichTextProps) {
  return (
    <>
      {richText.map((item, index) => {
        const { annotations, plainText, href } = item;

        let content: React.ReactNode = plainText;

        // Apply annotations
        if (annotations) {
          if (annotations.code) {
            content = (
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                {content}
              </code>
            );
          }
          if (annotations.bold) {
            content = <strong className="font-semibold">{content}</strong>;
          }
          if (annotations.italic) {
            content = <em>{content}</em>;
          }
          if (annotations.strikethrough) {
            content = <del>{content}</del>;
          }
          if (annotations.underline) {
            content = <u>{content}</u>;
          }
        }

        // Wrap in link if href exists
        if (href) {
          const isExternal = href.startsWith("http");
          content = (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
            >
              {content}
              {isExternal && <ExternalLink className="inline h-3 w-3 ml-1" />}
            </a>
          );
        }

        return <Fragment key={index}>{content}</Fragment>;
      })}
    </>
  );
}

/**
 * Render a single Notion block
 */
function NotionBlockRenderer({ block }: { block: NotionBlock }) {
  const { type, content, children } = block;

  // Helper to render children
  const renderChildren = () => {
    if (!children?.length) return null;
    return (
      <div className="ml-6 mt-2">
        {children.map((child) => (
          <NotionBlockRenderer key={child.id} block={child} />
        ))}
      </div>
    );
  };

  switch (type) {
    case "paragraph":
      return (
        <p className="mb-4 leading-7">
          {content.richText ? <RichText richText={content.richText} /> : null}
          {renderChildren()}
        </p>
      );

    case "heading_1":
      return (
        <h2 className="text-3xl font-bold mt-10 mb-4 scroll-mt-20">
          {content.richText ? <RichText richText={content.richText} /> : null}
        </h2>
      );

    case "heading_2":
      return (
        <h3 className="text-2xl font-semibold mt-8 mb-3 scroll-mt-20">
          {content.richText ? <RichText richText={content.richText} /> : null}
        </h3>
      );

    case "heading_3":
      return (
        <h4 className="text-xl font-medium mt-6 mb-2 scroll-mt-20">
          {content.richText ? <RichText richText={content.richText} /> : null}
        </h4>
      );

    case "bulleted_list_item":
      return (
        <li className="ml-6 mb-2 list-disc">
          {content.richText ? <RichText richText={content.richText} /> : null}
          {renderChildren()}
        </li>
      );

    case "numbered_list_item":
      return (
        <li className="ml-6 mb-2 list-decimal">
          {content.richText ? <RichText richText={content.richText} /> : null}
          {renderChildren()}
        </li>
      );

    case "to_do":
      return (
        <div className="flex items-start gap-3 mb-2">
          <Checkbox checked={content.checked} disabled className="mt-1" />
          <span className={content.checked ? "line-through text-muted-foreground" : ""}>
            {content.richText ? <RichText richText={content.richText} /> : null}
          </span>
          {renderChildren()}
        </div>
      );

    case "toggle":
      return (
        <details className="mb-4 group">
          <summary className="cursor-pointer font-medium hover:text-primary transition-colors">
            {content.richText ? <RichText richText={content.richText} /> : null}
          </summary>
          <div className="mt-2 pl-4 border-l-2 border-muted">
            {renderChildren()}
          </div>
        </details>
      );

    case "quote":
      return (
        <blockquote className="border-l-4 border-primary pl-4 py-2 my-6 italic text-muted-foreground">
          {content.richText ? <RichText richText={content.richText} /> : null}
          {renderChildren()}
        </blockquote>
      );

    case "callout": {
      // Determine callout style based on icon
      const emoji = content.icon?.emoji;
      let Icon = Info;
      let bgClass = "bg-muted";
      let borderClass = "border-muted-foreground/20";

      if (emoji === "\u26a0\ufe0f" || emoji === "\u2757") {
        Icon = AlertTriangle;
        bgClass = "bg-yellow-50 dark:bg-yellow-950/30";
        borderClass = "border-yellow-500/30";
      } else if (emoji === "\u274c" || emoji === "\ud83d\udea8") {
        Icon = AlertCircle;
        bgClass = "bg-red-50 dark:bg-red-950/30";
        borderClass = "border-red-500/30";
      } else if (emoji === "\ud83d\udca1") {
        Icon = Lightbulb;
        bgClass = "bg-blue-50 dark:bg-blue-950/30";
        borderClass = "border-blue-500/30";
      }

      return (
        <div
          className={cn(
            "flex gap-3 p-4 rounded-lg border my-6",
            bgClass,
            borderClass
          )}
          role="note"
        >
          <span className="shrink-0 text-xl" aria-hidden="true">
            {content.icon?.emoji || <Icon className="h-5 w-5 mt-0.5" />}
          </span>
          <div className="flex-1">
            {content.richText ? <RichText richText={content.richText} /> : null}
            {renderChildren()}
          </div>
        </div>
      );
    }

    case "code":
      return (
        <div className="my-6">
          <pre className="bg-zinc-950 text-zinc-50 rounded-lg p-4 overflow-x-auto">
            <code className={`language-${content.language || "plaintext"}`}>
              {content.richText?.map((rt) => rt.plainText).join("") || ""}
            </code>
          </pre>
          {content.caption && content.caption.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              <RichText richText={content.caption} />
            </p>
          )}
        </div>
      );

    case "image":
      return (
        <figure className="my-8">
          <img
            src={content.url}
            alt={content.caption?.map((c) => c.plainText).join("") || "Blog image"}
            className="rounded-lg w-full"
            loading="lazy"
          />
          {content.caption && content.caption.length > 0 && (
            <figcaption className="text-sm text-muted-foreground mt-3 text-center">
              <RichText richText={content.caption} />
            </figcaption>
          )}
        </figure>
      );

    case "video":
      return (
        <figure className="my-8">
          {content.url?.includes("youtube") || content.url?.includes("youtu.be") ? (
            <div className="aspect-video">
              <iframe
                src={content.url?.replace("watch?v=", "embed/")}
                title="Video"
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <video src={content.url} controls className="w-full rounded-lg">
              Your browser does not support the video tag.
            </video>
          )}
          {content.caption && content.caption.length > 0 && (
            <figcaption className="text-sm text-muted-foreground mt-3 text-center">
              <RichText richText={content.caption} />
            </figcaption>
          )}
        </figure>
      );

    case "embed":
      return (
        <div className="my-8">
          <iframe
            src={content.url}
            title="Embedded content"
            className="w-full aspect-video rounded-lg border"
            allowFullScreen
          />
          {content.caption && content.caption.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              <RichText richText={content.caption} />
            </p>
          )}
        </div>
      );

    case "bookmark":
      return (
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block my-6 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-primary">
            <ExternalLink className="h-4 w-4" />
            <span className="font-medium truncate">{content.url}</span>
          </div>
          {content.caption && content.caption.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              <RichText richText={content.caption} />
            </p>
          )}
        </a>
      );

    case "equation":
      return (
        <div className="my-6 p-4 bg-muted rounded-lg text-center font-mono">
          {content.expression}
        </div>
      );

    case "divider":
      return <hr className="my-8 border-t border-border" />;

    case "table_of_contents":
      return (
        <nav className="my-6 p-4 bg-muted/50 rounded-lg" aria-label="Table of contents">
          <h4 className="font-semibold mb-2">Table of Contents</h4>
          <p className="text-sm text-muted-foreground">
            (Table of contents will be auto-generated)
          </p>
        </nav>
      );

    default:
      // For unsupported block types, render nothing
      console.warn(`[NotionRenderer] Unsupported block type: ${type}`);
      return null;
  }
}

/**
 * Group consecutive list items
 */
function groupListItems(blocks: NotionBlock[]): Array<NotionBlock | NotionBlock[]> {
  const result: Array<NotionBlock | NotionBlock[]> = [];
  let currentList: NotionBlock[] = [];
  let currentListType: string | null = null;

  for (const block of blocks) {
    if (
      block.type === "bulleted_list_item" ||
      block.type === "numbered_list_item"
    ) {
      if (currentListType === block.type) {
        currentList.push(block);
      } else {
        if (currentList.length > 0) {
          result.push([...currentList]);
        }
        currentList = [block];
        currentListType = block.type;
      }
    } else {
      if (currentList.length > 0) {
        result.push([...currentList]);
        currentList = [];
        currentListType = null;
      }
      result.push(block);
    }
  }

  if (currentList.length > 0) {
    result.push(currentList);
  }

  return result;
}

function NotionRendererComponent({ blocks, className }: NotionRendererProps) {
  const groupedBlocks = groupListItems(blocks);

  return (
    <div
      className={cn(
        "prose prose-zinc dark:prose-invert max-w-none",
        "prose-headings:font-bold",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-code:bg-muted prose-code:px-1 prose-code:rounded",
        "prose-pre:bg-zinc-950",
        "prose-img:rounded-lg",
        className
      )}
    >
      {groupedBlocks.map((item, index) => {
        if (Array.isArray(item)) {
          // This is a list
          const ListTag = item[0].type === "numbered_list_item" ? "ol" : "ul";
          return (
            <ListTag key={index} className="my-4">
              {item.map((block) => (
                <NotionBlockRenderer key={block.id} block={block} />
              ))}
            </ListTag>
          );
        }
        return <NotionBlockRenderer key={item.id} block={item} />;
      })}
    </div>
  );
}

export const NotionRenderer = memo(NotionRendererComponent);
