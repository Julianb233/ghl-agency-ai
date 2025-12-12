import { useCredits } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import { Coins, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CreditBalanceProps {
  creditType: string;
  onBuyCredits?: () => void;
  className?: string;
}

export function CreditBalance({ creditType, onBuyCredits, className }: CreditBalanceProps) {
  const { getBalance } = useCredits();
  const { data: balance, isLoading } = getBalance(creditType);

  if (isLoading) {
    return <Skeleton className="h-10 w-48" />;
  }

  const credits = balance?.balance || 0;

  const getColorClass = () => {
    if (credits >= 100) return 'text-green-600';
    if (credits >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgClass = () => {
    if (credits >= 100) return 'bg-green-50';
    if (credits >= 10) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", getBgClass())}>
        {credits < 10 ? (
          <AlertCircle className={cn("h-4 w-4", getColorClass())} />
        ) : (
          <Coins className={cn("h-4 w-4", getColorClass())} />
        )}
        <span className={cn("font-semibold text-sm", getColorClass())}>
          {credits.toLocaleString()} credits
        </span>
      </div>
      {onBuyCredits && (
        <Button onClick={onBuyCredits} variant="outline" size="sm">
          Buy Credits
        </Button>
      )}
    </div>
  );
}
