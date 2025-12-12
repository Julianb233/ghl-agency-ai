import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { TourProvider } from "./components/tour/TourProvider";
import { Dashboard } from './components/Dashboard';
import { AlexRamozyPage } from './components/AlexRamozyPage';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import { OnboardingFlow } from './components/OnboardingFlow';
import { trpc } from "@/lib/trpc";

type ViewState = 'LANDING' | 'LOGIN' | 'ONBOARDING' | 'DASHBOARD' | 'ALEX_RAMOZY';
type UserTier = 'STARTER' | 'GROWTH' | 'WHITELABEL';

function App() {
  // NOTE: Defaulting to LANDING as requested by user
  const [currentView, setCurrentView] = useState<ViewState>('LANDING');
  const [userTier, setUserTier] = useState<UserTier>('STARTER'); // Default tier for new users
  const [credits, setCredits] = useState(100); // Default credits for new users

  // Check for active session
  const { data: user, isLoading: isAuthLoading, error: authError, refetch: refetchUser } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (user) {
      // User is logged in - check if onboarding is completed
      if (user.onboardingCompleted === false) {
        setCurrentView('ONBOARDING');
      } else {
        setCurrentView('DASHBOARD');
      }
    }
  }, [user]);

  const handleLogin = (tier: UserTier, needsOnboarding?: boolean) => {
    setUserTier(tier);
    // Set credits based on tier
    if (tier === 'STARTER') setCredits(500);
    if (tier === 'GROWTH') setCredits(1500);
    if (tier === 'WHITELABEL') setCredits(5000);

// Route to onboarding if needed, otherwise go to dashboard
    if (needsOnboarding) {
      setCurrentView('ONBOARDING');
    } else {
      setCurrentView('DASHBOARD');
    }
  };

  if (isAuthLoading) {
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
          <TourProvider>
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
              <OnboardingFlow onComplete={async () => {
                // Refetch user data to get updated onboardingCompleted status
                await refetchUser();
                setCurrentView('DASHBOARD');
              }} />
            )}

            {currentView === 'DASHBOARD' && (
              <Dashboard userTier={userTier} credits={credits} />
            )}
          </TourProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
