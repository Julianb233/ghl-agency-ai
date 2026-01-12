import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

export interface Column<T> {
  /** Unique key for the column */
  key: string;
  /** Header label */
  header: string;
  /** Render function for cell content */
  render: (item: T, index: number) => React.ReactNode;
  /** Show in mobile card view */
  showOnMobile?: boolean;
  /** Use as card title on mobile */
  isTitle?: boolean;
  /** Hide on desktop */
  hideOnDesktop?: boolean;
  /** Column width class */
  width?: string;
}

interface ResponsiveTableProps<T> {
  /** Data items to display */
  data: readonly T[] | T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Unique key extractor */
  getKey: (item: T, index: number) => string | number;
  /** Optional click handler for rows */
  onRowClick?: (item: T, index: number) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state content */
  emptyState?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  getKey,
  onRowClick,
  isLoading,
  emptyState,
  className,
}: ResponsiveTableProps<T>) {
  const mobileColumns = columns.filter(col => col.showOnMobile !== false);
  const titleColumn = columns.find(col => col.isTitle);
  const desktopColumns = columns.filter(col => !col.hideOnDesktop);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className={className}>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {(data as T[]).map((item, index) => (
          <div
            key={getKey(item, index)}
            className={cn(
              "bg-card border rounded-lg p-4 space-y-3",
              onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.99]"
            )}
            onClick={() => onRowClick?.(item, index)}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={(e) => {
              if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onRowClick(item, index);
              }
            }}
          >
            {/* Title row */}
            {titleColumn && (
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {titleColumn.render(item, index)}
                </span>
                {onRowClick && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
            )}
            
            {/* Data rows */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {mobileColumns
                .filter(col => !col.isTitle)
                .map(col => (
                  <div key={col.key}>
                    <dt className="text-muted-foreground text-xs">{col.header}</dt>
                    <dd className="text-foreground mt-0.5">{col.render(item, index)}</dd>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {desktopColumns.map(col => (
                <TableHead key={col.key} className={col.width}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data as T[]).map((item, index) => (
              <TableRow
                key={getKey(item, index)}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => onRowClick?.(item, index)}
              >
                {desktopColumns.map(col => (
                  <TableCell key={col.key} className={col.width}>
                    {col.render(item, index)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
