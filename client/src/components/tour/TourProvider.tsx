import React, { useEffect, useState } from 'react';
import { useTourStore } from '@/stores/tourStore';
import { getTourById } from '@/config/tours';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { HelpMenu } from './HelpMenu';
import { HelpCenter } from './HelpCenter';

interface TourProviderProps {
  children: React.ReactNode;
  /** Whether the user has completed onboarding - tour only starts after this */
  onboardingCompleted?: boolean;
  /** Whether the dashboard is currently active/visible */
  isDashboardActive?: boolean;
}

export function TourProvider({ children, onboardingCompleted = false, isDashboardActive = false }: TourProviderProps) {
  const {
    activeTour,
    currentStepIndex,
    autoStartTours,
    hasSeenWelcome,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    startTour,
    setHasSeenWelcome,
  } = useTourStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [helpCenterOpen, setHelpCenterOpen] = useState(false);

  const currentTour = activeTour ? getTourById(activeTour) : null;
  const currentStep = currentTour?.steps[currentStepIndex];

  // Only auto-start tour when:
  // 1. autoStartTours is enabled
  // 2. User hasn't seen the welcome tour yet
  // 3. User has completed onboarding (agency setup)
  // 4. User is currently on the dashboard
  useEffect(() => {
    if (autoStartTours && !hasSeenWelcome && onboardingCompleted && isDashboardActive) {
      const timer = setTimeout(() => {
        startTour('welcome');
        setHasSeenWelcome(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStartTours, hasSeenWelcome, onboardingCompleted, isDashboardActive, startTour, setHasSeenWelcome]);

  useEffect(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      const element = document.querySelector(currentStep.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateTargetRect();

    const resizeObserver = new ResizeObserver(updateTargetRect);
    const element = document.querySelector(currentStep.target);
    if (element) {
      resizeObserver.observe(element);
    }

    window.addEventListener('scroll', updateTargetRect, true);
    window.addEventListener('resize', updateTargetRect);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateTargetRect, true);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [currentStep]);

  useEffect(() => {
    if (!activeTour) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (helpCenterOpen) return;

      switch (e.key) {
        case 'Escape':
          skipTour();
          break;
        case 'ArrowRight':
          if (currentTour && currentStepIndex < currentTour.steps.length - 1) {
            nextStep();
          } else if (currentTour && currentStepIndex === currentTour.steps.length - 1) {
            completeTour();
          }
          break;
        case 'ArrowLeft':
          if (currentStepIndex > 0) {
            previousStep();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour, currentStepIndex, currentTour, helpCenterOpen, skipTour, nextStep, previousStep, completeTour]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !activeTour) {
        e.preventDefault();
        setHelpCenterOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour]);

  const handleNext = async () => {
    if (currentStep?.beforeNext) {
      const canProceed = await currentStep.beforeNext();
      if (!canProceed) return;
    }

    if (currentStep?.action) {
      currentStep.action();
    }

    if (currentTour && currentStepIndex < currentTour.steps.length - 1) {
      nextStep();
    } else {
      completeTour();
    }
  };

  return (
    <>
      {children}
      {activeTour && currentTour && currentStep && (
        <>
          <TourOverlay targetRect={targetRect} />
          <TourTooltip
            step={currentStep}
            currentStep={currentStepIndex}
            totalSteps={currentTour.steps.length}
            targetRect={targetRect}
            onNext={handleNext}
            onPrevious={previousStep}
            onSkip={skipTour}
            onComplete={completeTour}
          />
        </>
      )}
      {!activeTour && (
        <HelpMenu onOpenHelpCenter={() => setHelpCenterOpen(true)} />
      )}
      <HelpCenter open={helpCenterOpen} onOpenChange={setHelpCenterOpen} />
    </>
  );
}
