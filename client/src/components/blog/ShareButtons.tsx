/**
 * ShareButtons - Social sharing buttons for blog posts
 */

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Twitter,
  Linkedin,
  Facebook,
  Link2,
  Mail,
  Check,
} from "lucide-react";
import { useState } from "react";

interface ShareButtonsProps {
  title: string;
  url: string;
  description?: string;
  variant?: "default" | "compact";
}

function ShareButtonsComponent({
  title,
  url,
  description,
  variant = "default",
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || "");

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
  };

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  }, [url]);

  const handleShare = useCallback(
    (platform: keyof typeof shareLinks) => {
      window.open(shareLinks[platform], "_blank", "noopener,noreferrer,width=600,height=400");
    },
    [shareLinks]
  );

  const buttonSize = variant === "compact" ? "icon" : "default";
  const iconSize = variant === "compact" ? "h-4 w-4" : "h-5 w-5";

  return (
    <TooltipProvider>
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="Share this article"
      >
        {variant === "default" && (
          <span className="text-sm text-muted-foreground mr-2">Share:</span>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={buttonSize}
              onClick={() => handleShare("twitter")}
              aria-label="Share on Twitter"
              className="hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] transition-colors"
            >
              <Twitter className={iconSize} />
              {variant === "default" && <span className="ml-2">Twitter</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on Twitter</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={buttonSize}
              onClick={() => handleShare("linkedin")}
              aria-label="Share on LinkedIn"
              className="hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-colors"
            >
              <Linkedin className={iconSize} />
              {variant === "default" && <span className="ml-2">LinkedIn</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on LinkedIn</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={buttonSize}
              onClick={() => handleShare("facebook")}
              aria-label="Share on Facebook"
              className="hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-colors"
            >
              <Facebook className={iconSize} />
              {variant === "default" && <span className="ml-2">Facebook</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on Facebook</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={buttonSize}
              onClick={() => handleShare("email")}
              aria-label="Share via email"
              className="hover:bg-muted transition-colors"
            >
              <Mail className={iconSize} />
              {variant === "default" && <span className="ml-2">Email</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share via email</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={buttonSize}
              onClick={handleCopyLink}
              aria-label={copied ? "Link copied!" : "Copy link"}
              className="transition-colors"
            >
              {copied ? (
                <Check className={`${iconSize} text-green-500`} />
              ) : (
                <Link2 className={iconSize} />
              )}
              {variant === "default" && (
                <span className="ml-2">{copied ? "Copied!" : "Copy link"}</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export const ShareButtons = memo(ShareButtonsComponent);
