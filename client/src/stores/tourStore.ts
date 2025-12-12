import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
  beforeNext?: () => boolean | Promise<boolean>;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  icon: string;
  estimatedTime: string;
  steps: TourStep[];
}

interface TourState {
  activeTour: string | null;
  currentStepIndex: number;
  completedTours: string[];
  dismissedTips: string[];
  autoStartTours: boolean;
  hasSeenWelcome: boolean;

  // Actions
  startTour: (tourId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  markTourComplete: (tourId: string) => void;
  resetProgress: () => void;
  setAutoStartTours: (enabled: boolean) => void;
  setHasSeenWelcome: (seen: boolean) => void;
  isTourCompleted: (tourId: string) => boolean;
  dismissTip: (tipId: string) => void;
  getUncompletedToursCount: () => number;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      activeTour: null,
      currentStepIndex: 0,
      completedTours: [],
      dismissedTips: [],
      autoStartTours: true,
      hasSeenWelcome: false,

      startTour: (tourId: string) => {
        set({
          activeTour: tourId,
          currentStepIndex: 0,
        });
      },

      nextStep: () => {
        const { currentStepIndex } = get();
        set({ currentStepIndex: currentStepIndex + 1 });
      },

      previousStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },

      skipTour: () => {
        set({
          activeTour: null,
          currentStepIndex: 0,
        });
      },

      completeTour: () => {
        const { activeTour, completedTours } = get();
        if (activeTour && !completedTours.includes(activeTour)) {
          set({
            completedTours: [...completedTours, activeTour],
            activeTour: null,
            currentStepIndex: 0,
          });
        } else {
          set({
            activeTour: null,
            currentStepIndex: 0,
          });
        }
      },

      markTourComplete: (tourId: string) => {
        const { completedTours } = get();
        if (!completedTours.includes(tourId)) {
          set({ completedTours: [...completedTours, tourId] });
        }
      },

      resetProgress: () => {
        set({
          completedTours: [],
          activeTour: null,
          currentStepIndex: 0,
          hasSeenWelcome: false,
        });
      },

      setAutoStartTours: (enabled: boolean) => {
        set({ autoStartTours: enabled });
      },

      setHasSeenWelcome: (seen: boolean) => {
        set({ hasSeenWelcome: seen });
      },

      isTourCompleted: (tourId: string) => {
        return get().completedTours.includes(tourId);
      },

      dismissTip: (tipId: string) => {
        const { dismissedTips } = get();
        if (!dismissedTips.includes(tipId)) {
          set({ dismissedTips: [...dismissedTips, tipId] });
        }
      },

      getUncompletedToursCount: () => {
        // Import tours dynamically to avoid circular dependency
        // In production, you might want to pass total tours count differently
        const totalToursCount = 6; // This matches the number of tours in tours/index.ts
        return totalToursCount - get().completedTours.length;
      },
    }),
    {
      name: 'tour-storage',
      partialize: (state) => ({
        completedTours: state.completedTours,
        dismissedTips: state.dismissedTips,
        autoStartTours: state.autoStartTours,
        hasSeenWelcome: state.hasSeenWelcome,
      }),
    }
  )
);
