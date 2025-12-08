import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { Dashboard } from './components/Dashboard';
import { AlexRamozyPage } from './components/AlexRamozyPage';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingFlow } from './components/OnboardingFlow';
import { trpc } from "@/lib/trpc";

type ViewState = 'LANDING' | 'LOGIN' | 'ONBOARDING' | 'DASHBOARD' | 'ALEX_RAMOZY';
type UserTier = 'STARTER' | 'GROWTH' | 'WHITELABEL';

function App() {
  // Check for active session first
  const { data: user, isLoading: isAuthLoading, error: authError } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Set initial view to null, will be determined after auth check
  const [currentView, setCurrentView] = useState<ViewState | null>(null);
  const [userTier, setUserTier] = useState<UserTier>('WHITELABEL'); // Default to max tier for testing
  const [credits, setCredits] = useState(5000);

  useEffect(() => {
    // Only set view after auth check is complete
    if (!isAuthLoading) {
      if (user) {
        // User is logged in, go to dashboard
        setCurrentView('DASHBOARD');
      } else {
        // User is not logged in, show landing page
        setCurrentView('LANDING');
      }
    }
  }, [user, isAuthLoading]);

  const handleLogin = (tier: UserTier) => {
    setUserTier(tier);
    // Set credits based on tier
    if (tier === 'STARTER') setCredits(500);
    if (tier === 'GROWTH') setCredits(1500);
    if (tier === 'WHITELABEL') setCredits(5000);

    // Route to dashboard normally
    setCurrentView('DASHBOARD');
  };

  // Show loading spinner while auth is loading OR view hasn't been determined yet
  if (isAuthLoading || currentView === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          {currentView === 'ALEX_RAMOZY' && (
            <AlexRamozyPage onDemoClick={() => setCurrentView('LOGIN')} />
          )}
          {currentView === 'LANDING' && (
            <LandingPage onLogin={() => setCurrentView('LOGIN')} />
          )}

          {currentView === 'LOGIN' && (
            <LoginScreen
              onAuthenticated={handleLogin}
              onBack={() => setCurrentView('LANDING')}
            />
          )}

          {currentView === 'ONBOARDING' && (
            <OnboardingFlow onComplete={() => setCurrentView('DASHBOARD')} />
          )}

          {currentView === 'DASHBOARD' && (
            <Dashboard userTier={userTier} credits={credits} />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
