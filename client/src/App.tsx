import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { TourProvider } from "./components/tour/TourProvider";
import { SkipNavLink } from "./components/SkipNavLink";
import { trpc } from "@/lib/trpc";

// Lazy load heavy components for better initial bundle size
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const AlexRamozyPage = lazy(() => import('./components/AlexRamozyPage').then(m => ({ default: m.AlexRamozyPage })));
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow').then(m => ({ default: m.OnboardingFlow })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(m => ({ default: m.TermsOfService })));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-accent/10">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-slate-600">Loading...</p>
    </div>
  </div>
);

type ViewState = 'LANDING' | 'LOGIN' | 'ONBOARDING' | 'DASHBOARD' | 'ALEX_RAMOZY' | 'PRIVACY' | 'TERMS';
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
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" switchable={true}>
        <TooltipProvider>
          <TourProvider
            onboardingCompleted={user?.onboardingCompleted === true}
            isDashboardActive={currentView === 'DASHBOARD'}
          >
            <SkipNavLink />
            <Toaster />
            <Suspense fallback={<LoadingSpinner />}>
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
                <main id="main-content">
                  <Dashboard userTier={userTier} credits={credits} />
                </main>
              )}

              {currentView === 'PRIVACY' && (
                <PrivacyPolicy onBack={() => setCurrentView('LANDING')} />
              )}

              {currentView === 'TERMS' && (
                <TermsOfService onBack={() => setCurrentView('LANDING')} />
              )}
            </Suspense>
          </TourProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
