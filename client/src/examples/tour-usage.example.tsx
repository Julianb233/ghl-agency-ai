/**
 * Example usage of the Tour System - Phase 1 Core Infrastructure
 *
 * This file demonstrates how to integrate and use the tour system
 * in your application.
 */

import React from 'react';
import { TourProvider } from '@/contexts/TourContext';
import { useTour } from '@/hooks/useTour';
import { Tour } from '@/types/tour';

// Example tours definition
const tours: Tour[] = [
  {
    id: 'welcome-tour',
    name: 'Welcome Tour',
    description: 'Get started with the platform basics',
    category: 'getting-started',
    estimatedTime: '5 min',
    steps: [
      {
        id: 'step-1',
        target: '[data-tour="dashboard"]',
        title: 'Welcome to your Dashboard',
        content: 'This is your main dashboard where you can see all your workflows.',
        placement: 'center',
      },
      {
        id: 'step-2',
        target: '[data-tour="create-workflow"]',
        title: 'Create a Workflow',
        content: 'Click here to create your first workflow.',
        placement: 'bottom',
        spotlightPadding: 10,
      },
    ],
  },
  {
    id: 'advanced-features',
    name: 'Advanced Features',
    description: 'Learn about advanced automation features',
    category: 'advanced',
    estimatedTime: '10 min',
    prerequisites: ['welcome-tour'],
    steps: [
      {
        id: 'step-1',
        target: '[data-tour="advanced-settings"]',
        title: 'Advanced Settings',
        content: 'Configure advanced automation options here.',
        placement: 'right',
      },
    ],
  },
];

// Example component using the tour system
function ExampleComponent() {
  const {
    currentTour,
    currentStep,
    isLastStep,
    progress,
    startTourById,
    completeTourStep,
    skipTour,
    canStartTour,
    isTourCompleted,
    getCompletedToursCount,
  } = useTour();

  return (
    <div>
      <h1>Tour System Example</h1>

      {/* Tour Status */}
      <div>
        <p>Completed Tours: {getCompletedToursCount()}</p>
        {currentTour && (
          <div>
            <h2>Active Tour: {currentTour.name}</h2>
            <p>Progress: {Math.round(progress)}%</p>
            <p>Step: {currentStep?.title}</p>
            <button onClick={completeTourStep}>
              {isLastStep ? 'Complete Tour' : 'Next Step'}
            </button>
            <button onClick={skipTour}>Skip Tour</button>
          </div>
        )}
      </div>

      {/* Tour Triggers */}
      <div>
        <h3>Available Tours</h3>
        {tours.map((tour) => (
          <div key={tour.id}>
            <h4>{tour.name}</h4>
            <p>{tour.description}</p>
            <p>Time: {tour.estimatedTime}</p>
            {isTourCompleted(tour.id) ? (
              <span>Completed</span>
            ) : canStartTour(tour.id) ? (
              <button onClick={() => startTourById(tour.id)}>
                Start Tour
              </button>
            ) : (
              <span>Prerequisites not met</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// App setup with TourProvider
export function App() {
  return (
    <TourProvider tours={tours}>
      <ExampleComponent />
    </TourProvider>
  );
}

/**
 * Usage Instructions:
 *
 * 1. Wrap your app with TourProvider:
 *    <TourProvider tours={tours}>
 *      <YourApp />
 *    </TourProvider>
 *
 * 2. Use the useTour hook in any component:
 *    const { startTourById, currentStep, ... } = useTour();
 *
 * 3. Add data-tour attributes to elements you want to highlight:
 *    <button data-tour="create-workflow">Create Workflow</button>
 *
 * 4. The tour state is automatically persisted to localStorage
 *    under the key 'tour-storage'
 *
 * 5. Access the raw store if needed:
 *    import { useTourStore } from '@/stores/tourStore';
 */
