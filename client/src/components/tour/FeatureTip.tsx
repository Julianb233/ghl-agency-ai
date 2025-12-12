import { useState } from 'react';
import { Info } from 'lucide-react';
import { useTourStore } from '@/stores/tourStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface FeatureTipProps {
  tipId: string;
  title: string;
  content: string;
  dismissible?: boolean;
}

export function FeatureTip({
  tipId,
  title,
  content,
  dismissible = true,
}: FeatureTipProps) {
  const { dismissedTips, dismissTip } = useTourStore();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Don't render if tip is dismissed
  if (dismissedTips.includes(tipId)) {
    return null;
  }

  const handleDismiss = () => {
    if (dontShowAgain) {
      dismissTip(tipId);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="inline-flex items-center justify-center w-4 h-4 text-emerald-600 hover:text-emerald-700 transition-colors"
            aria-label={`Feature tip: ${title}`}
          >
            <Info className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-[280px] p-4 space-y-3"
          onPointerDownOutside={handleDismiss}
        >
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-sm text-muted-foreground">{content}</p>
          </div>
          {dismissible && (
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id={`dismiss-${tipId}`}
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              />
              <Label
                htmlFor={`dismiss-${tipId}`}
                className="text-xs cursor-pointer"
              >
                Don't show again
              </Label>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
