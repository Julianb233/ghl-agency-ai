import { ReactNode } from 'react';

export interface TourStep {
  id: string;
  target: string;              // CSS selector or data-tour attribute
  title: string;
  content: string | ReactNode;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  beforeShow?: () => Promise<void>;
  waitFor?: string;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
  category: 'getting-started' | 'feature' | 'advanced';
  estimatedTime: string;
  prerequisites?: string[];
}

export interface TourState {
  completedTours: string[];
  completedSteps: Record<string, string[]>;
  activeTour: string | null;
  currentStepIndex: number;
  isPaused: boolean;
  showTipsOnHover: boolean;
  autoStartTours: boolean;
  reducedMotion: boolean;
  dismissedTips: string[];
  dontShowAgain: string[];
}
