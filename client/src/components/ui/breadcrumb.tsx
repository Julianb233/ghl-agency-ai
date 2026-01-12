import { Fragment } from 'react';
import { Link } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[] | BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

export function Breadcrumbs({ 
  items, 
  className,
  showHome = true 
}: BreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = showHome 
    ? [{ label: 'Home', href: '/dashboard' }, ...items]
    : [...items];

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center gap-1 text-sm mb-4", className)}
    >
      <ol className="flex items-center gap-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isHome = index === 0 && showHome;
          
          return (
            <Fragment key={index}>
              {index > 0 && (
                <ChevronRight 
                  className="h-4 w-4 text-muted-foreground flex-shrink-0" 
                  aria-hidden="true" 
                />
              )}
              <li className="flex items-center">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isHome ? (
                      <span className="flex items-center gap-1">
                        <Home className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{item.label}</span>
                      </span>
                    ) : (
                      <span className="truncate max-w-[200px]">{item.label}</span>
                    )}
                  </Link>
                ) : item.onClick && !isLast ? (
                  <button
                    onClick={item.onClick}
                    className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span 
                    className={cn(
                      "truncate max-w-[200px]",
                      isLast ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm text-muted-foreground mb-4", className)}>
      <Home className="h-4 w-4 shrink-0" />
      {items.map((item, index) => (
        <Fragment key={index}>
          <ChevronRight className="h-4 w-4 shrink-0" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {item.label}
            </Link>
          ) : item.onClick ? (
            <button
              onClick={item.onClick}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[200px]">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
