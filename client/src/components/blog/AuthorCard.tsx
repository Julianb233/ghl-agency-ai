/**
 * AuthorCard - Author information display for blog posts
 */

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Twitter, Linkedin, Globe } from "lucide-react";
import type { BlogAuthor } from "@shared/types/blog";

interface AuthorCardProps {
  author: BlogAuthor;
  bio?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  variant?: "default" | "compact";
}

function AuthorCardComponent({
  author,
  bio,
  socialLinks,
  variant = "default",
}: AuthorCardProps) {
  const initials = author.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={author.avatar} alt={author.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{author.name}</p>
          {author.email && (
            <p className="text-xs text-muted-foreground">{author.email}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="mb-3">
              <h4 className="font-semibold text-lg">About the Author</h4>
              <p className="font-medium text-primary">{author.name}</p>
            </div>

            {bio && (
              <p className="text-sm text-muted-foreground mb-4">{bio}</p>
            )}

            {socialLinks && (
              <div className="flex gap-2">
                {socialLinks.twitter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-8 w-8"
                  >
                    <a
                      href={socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${author.name} on Twitter`}
                    >
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.linkedin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-8 w-8"
                  >
                    <a
                      href={socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${author.name} on LinkedIn`}
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {socialLinks.website && (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-8 w-8"
                  >
                    <a
                      href={socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${author.name}'s website`}
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const AuthorCard = memo(AuthorCardComponent);
