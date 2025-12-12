import { useQuizTimer } from '@/hooks/useQuizTimer';
import { Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type QuizTimerProps = {
  timeLimit: number | null; // in minutes
  onExpire: () => void;
};

export function QuizTimer({ timeLimit, onExpire }: QuizTimerProps) {
  const { formattedTime, isWarning } = useQuizTimer(timeLimit, onExpire);

  if (!timeLimit || !formattedTime) {
    return null;
  }

  return (
    <div className={`sticky top-16 z-30 ${isWarning ? 'animate-pulse' : ''}`}>
      <Alert className={isWarning ? 'border-red-500 bg-red-50' : ''}>
        <div className="flex items-center gap-2">
          {isWarning ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <AlertDescription className={`font-mono text-lg font-semibold ${isWarning ? 'text-red-600' : ''}`}>
            Time Remaining: {formattedTime}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}
