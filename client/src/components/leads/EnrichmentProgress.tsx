import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnrichmentProgressProps {
  total: number;
  enriched: number;
  failed: number;
  className?: string;
  showDetails?: boolean;
}

export function EnrichmentProgress({
  total,
  enriched,
  failed,
  className,
  showDetails = true
}: EnrichmentProgressProps) {
  const pending = total - enriched - failed;
  const percentage = total > 0 ? ((enriched + failed) / total) * 100 : 0;
  const successRate = total > 0 ? (enriched / total) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Enrichment Progress</p>
          <p className="text-xs text-muted-foreground">
            {enriched + failed} of {total} processed ({percentage.toFixed(1)}%)
          </p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{pending} pending</span>
          </div>
        )}
      </div>

      <Progress value={percentage} className="h-2" />

      {showDetails && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-700">
                {enriched}
              </p>
              <p className="text-xs text-green-600">
                Enriched ({successRate.toFixed(1)}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <XCircle className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {failed}
              </p>
              <p className="text-xs text-red-600">
                Failed ({total > 0 ? ((failed / total) * 100).toFixed(1) : 0}%)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
