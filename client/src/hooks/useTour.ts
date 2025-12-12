import { useTourContext } from '@/contexts/TourContext';
import { Tour } from '@/types/tour';

export function useTour() {
  const context = useTourContext();

  // Convenience methods for common operations
  const startTourById = (tourId: string) => {
    if (context.dontShowAgain.includes(tourId)) {
      return false;
    }
    context.startTour(tourId);
    return true;
  };

  const completeTourStep = () => {
    if (context.isLastStep) {
      context.completeTour();
    } else {
      context.nextStep();
    }
  };

  const canStartTour = (tourId: string): boolean => {
    const tour = context.getTourById(tourId);
    if (!tour) return false;
    if (context.dontShowAgain.includes(tourId)) return false;
    if (context.completedTours.includes(tourId)) return false;

    // Check prerequisites
    if (tour.prerequisites && tour.prerequisites.length > 0) {
      return tour.prerequisites.every((prereqId) =>
        context.completedTours.includes(prereqId)
      );
    }

    return true;
  };

  const isTourCompleted = (tourId: string): boolean => {
    return context.completedTours.includes(tourId);
  };

  const isTourActive = (tourId: string): boolean => {
    return context.activeTour === tourId;
  };

  const getAvailableTours = (tours: Tour[]): Tour[] => {
    return tours.filter((tour) => canStartTour(tour.id));
  };

  const getCompletedToursCount = (): number => {
    return context.completedTours.length;
  };

  return {
    // State
    ...context,

    // Convenience methods
    startTourById,
    completeTourStep,
    canStartTour,
    isTourCompleted,
    isTourActive,
    getAvailableTours,
    getCompletedToursCount,
  };
}
