import React, { createContext, useContext, useMemo } from 'react';
import { useTourStore } from '@/stores/tourStore';
import { Tour, TourStep } from '@/types/tour';

interface TourContextType {
  // State
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

  // Actions
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  dismissTip: (tipId: string) => void;
  toggleDontShowAgain: (tourId: string) => void;
  resetAllTours: () => void;
  setPreference: <K extends keyof any>(key: K, value: any) => void;

  // Computed values
  currentTour: Tour | null;
  currentStep: TourStep | null;
  isLastStep: boolean;
  progress: number;

  // Helpers
  getTourById: (tourId: string) => Tour | undefined;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface TourProviderProps {
  children: React.ReactNode;
  tours: Tour[];
}

export function TourProvider({ children, tours }: TourProviderProps) {
  const {
    completedTours,
    completedSteps,
    activeTour,
    currentStepIndex,
    isPaused,
    showTipsOnHover,
    autoStartTours,
    reducedMotion,
    dismissedTips,
    dontShowAgain,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    pauseTour,
    resumeTour,
    dismissTip,
    toggleDontShowAgain,
    resetAllTours,
    setPreference,
  } = useTourStore();

  const getTourById = (tourId: string): Tour | undefined => {
    return tours.find((tour) => tour.id === tourId);
  };

  const currentTour = useMemo(() => {
    if (!activeTour) return null;
    return getTourById(activeTour) || null;
  }, [activeTour, tours]);

  const currentStep = useMemo(() => {
    if (!currentTour) return null;
    return currentTour.steps[currentStepIndex] || null;
  }, [currentTour, currentStepIndex]);

  const isLastStep = useMemo(() => {
    if (!currentTour) return false;
    return currentStepIndex === currentTour.steps.length - 1;
  }, [currentTour, currentStepIndex]);

  const progress = useMemo(() => {
    if (!currentTour) return 0;
    return ((currentStepIndex + 1) / currentTour.steps.length) * 100;
  }, [currentTour, currentStepIndex]);

  const value: TourContextType = {
    completedTours,
    completedSteps,
    activeTour,
    currentStepIndex,
    isPaused,
    showTipsOnHover,
    autoStartTours,
    reducedMotion,
    dismissedTips,
    dontShowAgain,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    pauseTour,
    resumeTour,
    dismissTip,
    toggleDontShowAgain,
    resetAllTours,
    setPreference,
    currentTour,
    currentStep,
    isLastStep,
    progress,
    getTourById,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTourContext must be used within TourProvider');
  }
  return context;
}
