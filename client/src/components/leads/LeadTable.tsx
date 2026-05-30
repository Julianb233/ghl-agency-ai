import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHeader,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Users } from 'lucide-react';
import { NoDataEmpty } from '@/components/ui/EmptyState';

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: 'pending' | 'enriched' | 'failed';
  enrichedData?: any;
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, lead: Lead) => React.ReactNode;
}

interface LeadTableProps {
  leads: Lead[];
  columns: Column[];
  onLeadClick?: (lead: Lead) => void;
  onLeadAction?: (action: string, lead: Lead) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function LeadTable({
  leads,
  columns,
  onLeadClick,
  onLeadAction,
  selectable = false,
  onSelectionChange
}: LeadTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? new Set(leads.map((l) => l.id)) : new Set<string>();
    setSelectedIds(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedLeads = [...leads].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = (a as any)[sortConfig.key];
    const bValue = (b as any)[sortConfig.key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (status: Lead['status']) => {
    switch (status) {
      case 'enriched':
        return <Badge className="bg-green-500">Enriched</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === leads.length && leads.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              column.sortable ? (
                <SortableTableHeader
                  key={column.key}
                  sorted={
                    sortConfig?.key === column.key
                      ? sortConfig.direction
                      : false
                  }
                  onSort={() => handleSort(column.key)}
                >
                  {column.label}
                </SortableTableHeader>
              ) : (
                <TableHead key={column.key}>
                  {column.label}
                </TableHead>
              )
            ))}
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLeads.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 2 : 1)}
                className="p-0"
              >
                <NoDataEmpty resourceName="Leads" />
              </TableCell>
            </TableRow>
          ) : (
            sortedLeads.map((lead) => (
              <TableRow
                key={lead.id}
                className={onLeadClick ? 'cursor-pointer hover:bg-accent' : ''}
                onClick={() => onLeadClick?.(lead)}
              >
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(lead.id, checked as boolean)
                      }
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render
                      ? column.render((lead as any)[column.key], lead)
                      : column.key === 'status'
                      ? getStatusBadge(lead.status)
                      : (lead as any)[column.key] || '-'}
                  </TableCell>
                ))}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {onLeadAction && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onLeadAction('view', lead)}
                        >
                          View Details
                        </DropdownMenuItem>
                        {lead.status !== 'enriched' && (
                          <DropdownMenuItem
                            onClick={() => onLeadAction('enrich', lead)}
                          >
                            Enrich
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onLeadAction('delete', lead)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
