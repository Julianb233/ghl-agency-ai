/**
 * FeatureSpotlight Component Usage Examples
 *
 * This file demonstrates how to use the FeatureSpotlight component
 * for contextual feature discovery and onboarding.
 */

import React from 'react';
import { FeatureSpotlight, useFeatureSpotlight } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Search, Zap } from 'lucide-react';

// Example 1: Basic Usage
export function BasicSpotlightExample() {
  return (
    <div className="p-8">
      <FeatureSpotlight
        featureId="search-button"
        title="Quick Search"
        description="Press ⌘K anytime to open the command palette and quickly navigate anywhere"
        shortcut="⌘K"
        position="bottom"
      >
        <Button variant="outline" size="sm">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </FeatureSpotlight>
    </div>
  );
}

// Example 2: With Custom Position
export function PositionedSpotlightExample() {
  return (
    <div className="p-8 flex gap-4">
      {/* Top position */}
      <FeatureSpotlight
        featureId="action-1"
        title="Top Position"
        description="This spotlight appears above the element"
        position="top"
      >
        <Button>Top</Button>
      </FeatureSpotlight>

      {/* Right position */}
      <FeatureSpotlight
        featureId="action-2"
        title="Right Position"
        description="This spotlight appears to the right of the element"
        position="right"
      >
        <Button>Right</Button>
      </FeatureSpotlight>

      {/* Bottom position (default) */}
      <FeatureSpotlight
        featureId="action-3"
        title="Bottom Position"
        description="This spotlight appears below the element"
        position="bottom"
      >
        <Button>Bottom</Button>
      </FeatureSpotlight>

      {/* Left position */}
      <FeatureSpotlight
        featureId="action-4"
        title="Left Position"
        description="This spotlight appears to the left of the element"
        position="left"
      >
        <Button>Left</Button>
      </FeatureSpotlight>
    </div>
  );
}

// Example 3: With Dismiss Callback
export function CallbackSpotlightExample() {
  const handleDismiss = () => {
    console.log('User dismissed the spotlight');
    // Track analytics, show next spotlight, etc.
  };

  return (
    <div className="p-8">
      <FeatureSpotlight
        featureId="agent-launch"
        title="Launch AI Agent"
        description="Click here to start a new browser automation agent"
        shortcut="⌘N"
        position="bottom"
        onDismiss={handleDismiss}
      >
        <Button>
          <Zap className="w-4 h-4 mr-2" />
          Launch Agent
        </Button>
      </FeatureSpotlight>
    </div>
  );
}

// Example 4: Using the Hook
export function HookUsageExample() {
  const { hasSeenFeature, markAsSeen, resetAll } = useFeatureSpotlight();

  const handleMarkAsSeen = () => {
    markAsSeen('custom-feature-id');
    console.log('Feature marked as seen');
  };

  const handleResetAll = () => {
    resetAll();
    console.log('All feature spotlights reset');
  };

  return (
    <div className="p-8 space-y-4">
      <div className="flex gap-4">
        <Button onClick={handleMarkAsSeen}>
          Mark Feature as Seen
        </Button>
        <Button variant="outline" onClick={handleResetAll}>
          Reset All Spotlights
        </Button>
      </div>
      <div className="text-sm text-slate-400">
        Has seen custom feature: {hasSeenFeature('custom-feature-id') ? 'Yes' : 'No'}
      </div>
    </div>
  );
}

// Example 5: Multi-step Feature Tour
export function MultiStepTourExample() {
  const { hasSeenFeature, markAsSeen } = useFeatureSpotlight();
  const [currentStep, setCurrentStep] = React.useState(0);

  const steps = [
    {
      featureId: 'tour-step-1',
      title: 'Welcome!',
      description: 'Let me show you around the key features',
      targetId: 'dashboard-header',
    },
    {
      featureId: 'tour-step-2',
      title: 'Quick Actions',
      description: 'Access your most common tasks here',
      targetId: 'quick-actions',
    },
    {
      featureId: 'tour-step-3',
      title: 'Settings',
      description: 'Configure your preferences and integrations',
      targetId: 'settings-button',
    },
  ];

  const currentStepData = steps[currentStep];

  const handleDismiss = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(0);
    }
  };

  return (
    <div className="p-8">
      {currentStepData && (
        <FeatureSpotlight
          featureId={currentStepData.featureId}
          title={currentStepData.title}
          description={currentStepData.description}
          position="bottom"
          onDismiss={handleDismiss}
        >
          <div id={currentStepData.targetId} className="p-4 bg-slate-800 rounded">
            {currentStepData.title}
          </div>
        </FeatureSpotlight>
      )}
    </div>
  );
}

// Example 6: Real-world Dashboard Integration
export function DashboardIntegrationExample() {
  return (
    <div className="p-8 space-y-6">
      {/* Command palette spotlight */}
      <FeatureSpotlight
        featureId="command-palette-intro"
        title="Command Palette"
        description="Quickly navigate anywhere with keyboard shortcuts. Try it now!"
        shortcut="⌘K"
        position="bottom"
      >
        <Button variant="outline">
          <Search className="w-4 h-4 mr-2" />
          Search or jump to...
        </Button>
      </FeatureSpotlight>

      {/* Agent creation spotlight */}
      <FeatureSpotlight
        featureId="create-agent-intro"
        title="Create Your First Agent"
        description="Start automating tasks by creating an AI browser agent"
        shortcut="⌘N"
        position="right"
      >
        <Button>
          <Zap className="w-4 h-4 mr-2" />
          New Agent
        </Button>
      </FeatureSpotlight>
    </div>
  );
}
