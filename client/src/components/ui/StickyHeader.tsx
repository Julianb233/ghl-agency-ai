import React from 'react';
import { cn } from '@/lib/utils';

interface StickyHeaderProps {
  children: React.ReactNode;
  className?: string;
  showBorder?: boolean;
}

export function StickyHeader({ 
  children, 
  className,
  showBorder = true 
}: StickyHeaderProps) {
  return (
    <header 
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60",
        showBorder && "border-b",
        className
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {children}
      </div>
    </header>
  );
}
