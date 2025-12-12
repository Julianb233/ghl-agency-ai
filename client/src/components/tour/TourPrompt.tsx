import { useTourStore } from '@/stores/tourStore';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';

interface TourPromptProps {
  tourId: string;
  featureName: string;
}

export function TourPrompt({ tourId, featureName }: TourPromptProps) {
  const { completedTours, dismissedTips, startTour, dismissTip } = useTourStore();

  if (completedTours.includes(tourId) || dismissedTips.includes(`tour-prompt-${tourId}`)) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5" />
        <span>New to {featureName}? Take a quick tour to get started!</span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => startTour(tourId)}>
          Start Tour
        </Button>
        <Button size="sm" variant="ghost" onClick={() => dismissTip(`tour-prompt-${tourId}`)}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
