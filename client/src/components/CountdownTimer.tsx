import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate?: Date;
  label?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  label = "Founder pricing ends in:"
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - Date.now();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-slate-800 text-white font-mono font-bold text-lg sm:text-2xl px-2 sm:px-3 py-1 sm:py-2 rounded-lg min-w-[40px] sm:min-w-[56px] text-center">
        {value.toString().padStart(2, '0')}
      </div>
      <span className="text-xs text-slate-600 mt-1 uppercase tracking-wide">{label}</span>
    </div>
  );

  return (
    <div className="inline-flex flex-col items-center">
      <div className="flex items-center gap-1.5 text-amber-800 mb-2 sm:mb-3">
        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <TimeBlock value={timeLeft.days} label="Days" />
        <span className="text-white text-xl sm:text-2xl font-bold">:</span>
        <TimeBlock value={timeLeft.hours} label="Hours" />
        <span className="text-white text-xl sm:text-2xl font-bold">:</span>
        <TimeBlock value={timeLeft.minutes} label="Mins" />
        <span className="text-white text-xl sm:text-2xl font-bold hidden sm:block">:</span>
        <div className="hidden sm:block">
          <TimeBlock value={timeLeft.seconds} label="Secs" />
        </div>
      </div>
    </div>
  );
};
